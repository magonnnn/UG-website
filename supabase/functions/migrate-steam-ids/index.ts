
import { createClient } from "npm:@supabase/supabase-js@2";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getProfile(link: string) {
  try {
    const url = new URL(
      link.startsWith("http") ? link : `https://${link}`,
    );

    if (
      !["steamcommunity.com", "www.steamcommunity.com"].includes(
        url.hostname.toLowerCase(),
      )
    ) {
      return null;
    }

    const match = url.pathname.match(/^\/(id|profiles)\/([^/]+)\/?$/);
    if (!match) return null;

    if (match[1] === "profiles") {
      return /^\d{17}$/.test(match[2])
        ? { steamid64: match[2] }
        : null;
    }

    let vanity: string;

    try {
      vanity = decodeURIComponent(match[2]);
    } catch {
      return null;
    }

    if (!vanity || vanity.length > 100 || /[\s/\\]/.test(vanity)) {
      return null;
    }

    return { vanity };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("MIGRATION_SECRET");
  const suppliedSecret = req.headers.get("x-migration-secret");

  if (
    !expectedSecret ||
    !suppliedSecret ||
    suppliedSecret !== expectedSecret
  ) {
    return response({ error: "Unauthorized" }, 401);
  }

  const apiKey = Deno.env.get("STEAM_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !supabaseUrl || !serviceKey) {
    return response({ error: "Missing server configuration" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const limit = Math.min(
      Math.max(Number.parseInt(String(body.limit ?? "100"), 10) || 100, 1),
      100,
    );

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: players, error: selectError } = await supabase
      .from("players")
      .select("id, steam_profile, steamid64")
      .or("steamid64.is.null,steamid64.eq.")
      .not("steam_profile", "is", null)
      .order("id", { ascending: true })
      .limit(limit);

    if (selectError) {
      console.error("Select failed:", selectError.message);
      return response({ error: "Failed to load players" }, 500);
    }

    const results: Array<Record<string, unknown>> = [];
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const player of players ?? []) {
      const link = player.steam_profile;

      if (typeof link !== "string" || !link.trim()) {
        skipped++;
        results.push({ id: player.id, status: "skipped", reason: "empty_link" });
        continue;
      }

      const profile = getProfile(link);

      if (!profile) {
        failed++;
        results.push({ id: player.id, status: "failed", reason: "invalid_link" });
        continue;
      }

      let steamid64 = profile.steamid64;

      if (profile.vanity) {
        try {
          const apiUrl = new URL(
            "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/",
          );
          apiUrl.searchParams.set("key", apiKey);
          apiUrl.searchParams.set("vanityurl", profile.vanity);

          const apiResponse = await fetch(apiUrl, {
            signal: AbortSignal.timeout(10000),
          });

          if (!apiResponse.ok) {
            failed++;
            results.push({
              id: player.id,
              status: "failed",
              reason: "steam_api_unavailable",
            });
            continue;
          }

          const data = await apiResponse.json();
          const resolved = data?.response?.steamid;

          if (
            data?.response?.success !== 1 ||
            typeof resolved !== "string" ||
            !/^\d{17}$/.test(resolved)
          ) {
            failed++;
            results.push({
              id: player.id,
              status: "failed",
              reason: "profile_not_found",
            });
            continue;
          }

          steamid64 = resolved;
        } catch (error) {
          failed++;
          console.error("Steam lookup failed for player:", player.id, String(error));
          results.push({
            id: player.id,
            status: "failed",
            reason: "steam_lookup_error",
          });
          continue;
        }
      }

      if (!steamid64 || !/^\d{17}$/.test(steamid64)) {
        failed++;
        results.push({ id: player.id, status: "failed", reason: "invalid_steamid64" });
        continue;
      }

      if (!dryRun) {
        const { data, error } = await supabase
          .from("players")
          .update({ steamid64 })
          .eq("id", player.id)
          .or("steamid64.is.null,steamid64.eq.")
          .select("id");

        if (error) {
          console.error("Update failed for player:", player.id, error.message);
          failed++;
          results.push({ id: player.id, status: "failed", reason: "database_update_failed" });
          continue;
        }

        if (!data?.length) {
          skipped++;
          results.push({ id: player.id, status: "skipped", reason: "already_updated_or_changed" });
          continue;
        }
      }

      updated++;
      results.push({
        id: player.id,
        status: dryRun ? "would_update" : "updated",
        steamid64,
      });
    }

    return response({
      dryRun,
      processed: results.length,
      updated: dryRun ? 0 : updated,
      wouldUpdate: dryRun ? updated : 0,
      failed,
      skipped,
      results,
      note: results.length === limit
        ? "There may be more rows. Run again to process the next batch."
        : "No further eligible rows were returned in this batch.",
    });
  } catch (error) {
    console.error("Migration failed:", String(error));
    return response({ error: "Internal server error" }, 500);
  }
});
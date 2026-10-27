
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
      !["steamcommunity.com", "www.steamcommunity.com"]
        .includes(url.hostname.toLowerCase())
    ) {
      return null;
    }

    const match = url.pathname.match(
      /^\/(id|profiles)\/([^/]+)\/?$/,
    );

    if (!match) return null;

    if (match[1] === "profiles") {
      return /^\d{17}$/.test(match[2])
        ? { steamid64: match[2] }
        : null;
    }

    let name: string;

    try {
      name = decodeURIComponent(match[2]);
    } catch {
      return null;
    }

    if (!name || name.length > 100 || /[\s/\\]/.test(name)) {
      return null;
    }

    return { vanity: name };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  // Weryfikacja sekretu webhooka.
  const expectedSecret = Deno.env.get("STEAM_WEBHOOK_SECRET");
  const suppliedSecret = req.headers.get("x-webhook-secret");

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
    const payload = await req.json();
    const player = payload.record;

    if (
      payload.schema !== "public" ||
      payload.table !== "players" ||
      !player ||
      player.id == null
    ) {
      return response({ error: "Invalid webhook payload" }, 400);
    }

    const link = player.steam_profile;

    if (typeof link !== "string" || !link.trim()) {
      return response({ status: "skipped", reason: "empty_link" });
    }

    // Nie nadpisuj już istniejącego identyfikatora,
    // chyba że zmienił się link Steam.
    if (
      typeof player.steamid64 === "string" &&
      /^\d{17}$/.test(player.steamid64) &&
      payload.old_record?.steam_profile === link
    ) {
      return response({ status: "skipped", reason: "already_resolved" });
    }

    const profile = getProfile(link);

    if (!profile) {
      return response({ status: "failed", reason: "invalid_link" }, 422);
    }

    let steamid64 = profile.steamid64;

    if (profile.vanity) {
      const apiUrl = new URL(
        "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/",
      );

      apiUrl.searchParams.set("key", apiKey);
      apiUrl.searchParams.set("vanityurl", profile.vanity);

      const apiResponse = await fetch(apiUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!apiResponse.ok) {
        return response({ error: "Steam API unavailable" }, 502);
      }

      const data = await apiResponse.json();
      const resolved = data?.response?.steamid;

      if (
        data?.response?.success !== 1 ||
        typeof resolved !== "string" ||
        !/^\d{17}$/.test(resolved)
      ) {
        return response({ status: "failed", reason: "profile_not_found" }, 422);
      }

      steamid64 = resolved;
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Aktualizuj wyłącznie ten rekord i tylko wtedy,
    // gdy steam_profile nadal odpowiada otrzymanemu webhookowi.
    const { data, error } = await supabase
      .from("players")
      .update({ steamid64 })
      .eq("id", player.id)
      .eq("steam_profile", link)
      .select("id");

    if (error) {
      console.error("Database update failed:", error.message);
      return response({ error: "Database update failed" }, 500);
    }

    if (!data?.length) {
      return response({
        status: "skipped",
        reason: "record_changed_or_missing",
      });
    }

    return response({ status: "success", steamid64 });
  } catch (error) {
    console.error("Steam resolver failed:", String(error));
    return response({ error: "Internal server error" }, 500);
  }
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";
import type { Database } from "./database.types.ts";
import {
  getFaceitTeamIds,
  getMatchEventType,
  getMatchId,
  getWebhookEventId,
  isCancelledMatchEvent,
} from "./helpers.ts";

const WEBHOOK_SECRET_HEADER = "x-faceit-webhook-secret";
const MAX_REQUEST_SIZE = 256 * 1024;
const FACEIT_DATA_API_URL = "https://open.faceit.com/data/v4";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, { status });
}

async function readJsonBody(
  request: Request,
): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    throw new Error("Request body is too large");
  }

  if (!request.body) throw new Error("Request body is required");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalSize += value.byteLength;
    if (totalSize > MAX_REQUEST_SIZE) {
      await reader.cancel();
      throw new Error("Request body is too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

async function fetchMatchDetails(
  matchId: string,
  apiKey: string,
): Promise<unknown | null> {
  const response = await fetch(
    `${FACEIT_DATA_API_URL}/matches/${encodeURIComponent(matchId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `FACEIT match lookup failed with status ${response.status}`,
    );
  }

  return response.json();
}

async function loadLocalTeams(
  supabase: SupabaseClient<Database>,
  faceitTeamIds: string[],
  localTeamIds: Array<string | number>,
) {
  if (faceitTeamIds.length === 0 && localTeamIds.length === 0) return [];

  const { data, error } = await supabase
    .from("teams")
    .select("id, faceit_id")
    .not("faceit_id", "is", null);
  if (error) throw error;

  const faceitIds = new Set(faceitTeamIds.map((id) => id.toLowerCase()));
  const teamIds = new Set(localTeamIds.map(String));
  const teams = new Map<string, { id: number | string; faceit_id: string }>();

  for (const team of data ?? []) {
    if (
      typeof team.faceit_id === "string" &&
      (
        faceitIds.has(team.faceit_id.toLowerCase()) ||
        teamIds.has(String(team.id))
      )
    ) {
      teams.set(String(team.id), {
        id: team.id,
        faceit_id: team.faceit_id,
      });
    }
  }

  return [...teams.values()];
}

async function claimWebhookEvent(
  supabase: SupabaseClient<Database>,
  eventKey: string,
  eventType: string,
  matchId: string,
): Promise<"claimed" | "processed" | "busy"> {
  const now = Date.now();
  const { error: cleanupError } = await supabase
    .from("faceit_webhook_events")
    .delete()
    .lt("created_at", new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());
  if (cleanupError) throw cleanupError;

  const { error: insertError } = await supabase
    .from("faceit_webhook_events")
    .insert({
      event_key: eventKey,
      event_type: eventType,
      match_id: matchId,
    });

  if (!insertError) return "claimed";
  if (insertError.code !== "23505") throw insertError;

  const { data: existingEvent, error: existingEventError } = await supabase
    .from("faceit_webhook_events")
    .select("processed_at, processing_started_at")
    .eq("event_key", eventKey)
    .maybeSingle();
  if (existingEventError) throw existingEventError;
  if (!existingEvent) throw new Error("Unable to load duplicate webhook event");
  if (existingEvent.processed_at) return "processed";

  const processingStartedAt = new Date(
    existingEvent.processing_started_at,
  ).getTime();
  const staleBefore = now - 5 * 60 * 1000;
  if (
    !Number.isFinite(processingStartedAt) || processingStartedAt > staleBefore
  ) {
    return "busy";
  }

  const { data: reclaimedEvents, error: reclaimError } = await supabase
    .from("faceit_webhook_events")
    .update({ processing_started_at: new Date(now).toISOString() })
    .eq("event_key", eventKey)
    .is("processed_at", null)
    .lt(
      "processing_started_at",
      new Date(staleBefore).toISOString(),
    )
    .select("event_key");
  if (reclaimError) throw reclaimError;

  return (reclaimedEvents?.length ?? 0) > 0 ? "claimed" : "busy";
}

serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("FACEIT_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error("FACEIT_WEBHOOK_SECRET is not configured");
    return jsonResponse({ error: "Webhook is not configured" }, 500);
  }

  const providedSecret = request.headers.get(WEBHOOK_SECRET_HEADER);
  if (!providedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    const status = message === "Request body is too large" ? 413 : 400;
    return jsonResponse({ error: message }, status);
  }

  const eventType = getMatchEventType(body);
  if (!eventType) {
    return jsonResponse({ status: "ignored", reason: "unsupported-event" });
  }

  const matchId = getMatchId(body);
  if (!matchId) {
    console.warn(`FACEIT ${eventType} webhook did not include a match ID`);
    return jsonResponse({ status: "ignored", reason: "missing-match-id" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase service credentials are not configured");
    return jsonResponse({ error: "Webhook is not configured" }, 500);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const providerEventId = getWebhookEventId(body);
  const eventKey = providerEventId
    ? `faceit:${eventType}:${matchId}:${providerEventId}`
    : `faceit:${eventType}:${matchId}`;
  let hasEventClaim = false;

  try {
    const eventClaim = await claimWebhookEvent(
      supabase,
      eventKey,
      eventType,
      matchId,
    );
    if (eventClaim === "processed") {
      return jsonResponse({ status: "duplicate", matchId });
    }
    if (eventClaim === "busy") {
      return jsonResponse(
        { error: "Webhook event is already processing" },
        503,
      );
    }
    hasEventClaim = true;

    const { data: existingMatch, error: existingMatchError } = await supabase
      .from("matches")
      .select("team_1_id, team_2_id")
      .eq("faceit_match_id", matchId)
      .maybeSingle();
    if (existingMatchError) throw existingMatchError;

    const localTeamIds = [
      existingMatch?.team_1_id,
      existingMatch?.team_2_id,
    ].filter(
      (teamId): teamId is string | number =>
        teamId !== null && teamId !== undefined,
    );
    let faceitTeamIds = getFaceitTeamIds(body);
    let localTeams = await loadLocalTeams(
      supabase,
      faceitTeamIds,
      localTeamIds,
    );

    if (localTeams.length === 0) {
      const apiKey = Deno.env.get("FACEIT_API_KEY");
      if (!apiKey) {
        throw new Error(
          "FACEIT_API_KEY is required to resolve the webhook match teams",
        );
      }

      const matchDetails = await fetchMatchDetails(matchId, apiKey);
      if (matchDetails) {
        faceitTeamIds = [
          ...new Set([...faceitTeamIds, ...getFaceitTeamIds(matchDetails)]),
        ];
        localTeams = await loadLocalTeams(
          supabase,
          faceitTeamIds,
          localTeamIds,
        );
      }
    }

    if (!isCancelledMatchEvent(eventType)) {
      const { error: clearCancellationError } = await supabase
        .from("matches")
        .update({ cancelled: false })
        .eq("faceit_match_id", matchId);
      if (clearCancellationError) throw clearCancellationError;
    }

    const syncResults = await Promise.all(
      localTeams.map(async (team) => {
        const { data, error } = await supabase.functions.invoke(
          "faceit-team-league",
          {
            body: {
              action: "sync-fixtures",
              faceitId: team.faceit_id,
              teamId: String(team.id),
              forceRefresh: true,
            },
          },
        );

        if (error) throw error;
        if (data?.error) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `FACEIT sync failed for team ${team.id}`,
          );
        }

        return data;
      }),
    );

    if (isCancelledMatchEvent(eventType)) {
      const { error: cancellationError } = await supabase
        .from("matches")
        .update({ cancelled: true })
        .eq("faceit_match_id", matchId);
      if (cancellationError) throw cancellationError;
    }

    if (localTeams.length === 0) {
      console.info(
        `Ignored FACEIT ${eventType} event for an untracked match ${matchId}`,
      );
    }

    const { error: processedEventError } = await supabase
      .from("faceit_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_key", eventKey);
    if (processedEventError) throw processedEventError;
    hasEventClaim = false;

    return localTeams.length === 0
      ? jsonResponse({
        status: "ignored",
        reason: "untracked-match",
        matchId,
      })
      : jsonResponse({
        status: "synced",
        eventType,
        matchId,
        teamsSynced: syncResults.length,
      });
  } catch (error) {
    if (hasEventClaim) {
      const { error: releaseError } = await supabase
        .from("faceit_webhook_events")
        .update({ processing_started_at: new Date(0).toISOString() })
        .eq("event_key", eventKey)
        .is("processed_at", null);
      if (releaseError) {
        console.error(
          "Unable to release failed FACEIT webhook claim:",
          releaseError,
        );
      }
    }
    console.error(
      `FACEIT webhook processing failed for ${eventType} ${matchId}:`,
      error,
    );
    return jsonResponse({ error: "Unable to process FACEIT webhook" }, 502);
  }
});

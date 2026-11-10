import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACEIT_BASE_URL = "https://www.faceit.com/api";
const FIXTURE_SYNC_INTERVAL_MS = 60 * 60 * 1000;
const FIXTURE_PAGE_SIZE = 40;
const MAX_FIXTURE_PAGES = 5;
const FACEIT_MAX_RETRIES = 3;
const UNKNOWN_NAME_RETRY_INTERVAL_MS = 60 * 60 * 1000;
const RESULTS_SYNC_INTERVAL_MS = 60 * 1000;
const RESULTS_SYNC_VERSION = 3;

class FaceitRequestError extends Error {
  status: number;

  constructor(status: number) {
    super(`FACEIT request failed with status ${status}`);
    this.name = "FaceitRequestError";
    this.status = status;
  }
}

type FaceitFaction = {
  premade_team_id?: string;
  faction_id?: string;
  id?: string;
  name?: string;
  nickname?: string;
  team_name?: string;
  team?: { name?: string; nickname?: string };
  score?: string | number;
};

type FaceitScheduledMatch = {
  id?: string;
  match_id?: string;
  status?: string;
  scheduled_time?: string | number;
  started_at?: string | number;
  startedAt?: string | number;
  finished_at?: string | number;
  finishedAt?: string | number;
  factions?: FaceitFaction[];
  teams?: Record<string, {
    faction_id?: string;
    name?: string;
  }>;
  results?: {
    score?: Record<string, string | number>;
    factions?: Record<string, { score?: string | number }>;
  } | Array<{
    factions?: Record<string, { score?: string | number }>;
  }>;
  detailedResults?: Array<{
    factions?: Record<string, { score?: string | number }>;
  }>;
  detailed_results?: Array<{
    factions?: Record<string, { score?: string | number }>;
  }>;
};

type MatchScorePair = [number | null, number | null];

function getCurrentChampionshipId(profile: unknown): string | null {
  if (typeof profile !== "object" || profile === null) return null;

  const record = profile as Record<string, unknown>;
  const payload = typeof record.payload === "object" && record.payload !== null
    ? record.payload as Record<string, unknown>
    : null;
  const championshipId = record.championship_id ?? payload?.championship_id;

  return typeof championshipId === "string" && championshipId.length > 0
    ? championshipId
    : typeof championshipId === "number"
      ? String(championshipId)
      : null;
}

function getMatches(data: unknown): FaceitScheduledMatch[] {
  if (Array.isArray(data)) {
    return data.filter(
      (match): match is FaceitScheduledMatch =>
        typeof match === "object" && match !== null,
    );
  }
  if (typeof data !== "object" || data === null) return [];

  const record = data as Record<string, unknown>;
  const payload = record.payload;
  const matches = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null &&
      Array.isArray((payload as Record<string, unknown>).items)
      ? (payload as Record<string, unknown>).items
      : Array.isArray(record.items)
        ? record.items
        : [];

  return matches.filter(
    (match): match is FaceitScheduledMatch =>
      typeof match === "object" && match !== null,
  );
}

function getFactionScore(
  match: FaceitScheduledMatch,
  faction: FaceitFaction,
): number | null {
  const results = Array.isArray(match.results)
    ? match.results[0]
    : match.results;
  const detailedResults = match.detailedResults?.[0];
  const factionIndex = match.factions?.indexOf(faction) ?? -1;
  const score = faction.score ??
    (faction.faction_id ? results?.score?.[faction.faction_id] : null) ??
    (faction.id ? results?.score?.[faction.id] : null) ??
    (faction.premade_team_id
      ? results?.score?.[faction.premade_team_id]
      : null) ??
    (faction.faction_id ? results?.factions?.[faction.faction_id]?.score : null) ??
    (faction.id ? results?.factions?.[faction.id]?.score : null) ??
    (faction.premade_team_id
      ? results?.factions?.[faction.premade_team_id]?.score
      : null) ??
    (faction.faction_id
      ? detailedResults?.factions?.[faction.faction_id]?.score
      : null) ??
    (faction.id ? detailedResults?.factions?.[faction.id]?.score : null) ??
    (faction.premade_team_id
      ? detailedResults?.factions?.[faction.premade_team_id]?.score
      : null) ??
    (factionIndex >= 0
      ? results?.score?.[`faction${factionIndex + 1}`] ??
      results?.factions?.[`faction${factionIndex + 1}`]?.score ??
      detailedResults?.factions?.[`faction${factionIndex + 1}`]?.score
      : null);
  const parsedScore = typeof score === "number"
    ? score
    : typeof score === "string" && score.trim() !== ""
      ? Number(score)
      : NaN;

  return Number.isFinite(parsedScore) && parsedScore >= 0
    ? parsedScore
    : null;
}

function parseScore(value: unknown): number | null {
  const score = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : NaN;

  return Number.isFinite(score) && score >= 0 ? score : null;
}

function getMatchDetailScores(
  detail: unknown,
  ownFactionIndex: number,
): MatchScorePair {
  if (typeof detail !== "object" || detail === null) return [null, null];

  const record = detail as Record<string, unknown>;
  const payload = typeof record.payload === "object" && record.payload !== null
    ? record.payload as Record<string, unknown>
    : record;
  const results = Array.isArray(payload.results)
    ? payload.results[0]
    : payload.results;
  const detailedResults = Array.isArray(payload.detailedResults)
    ? payload.detailedResults[0]
    : null;
  const resultRecord = typeof results === "object" && results !== null
    ? results as Record<string, unknown>
    : null;
  const detailedRecord =
    typeof detailedResults === "object" && detailedResults !== null
      ? detailedResults as Record<string, unknown>
      : null;
  const resultFactions =
    typeof resultRecord?.factions === "object" && resultRecord.factions !== null
      ? resultRecord.factions as Record<string, unknown>
      : {};
  const detailedFactions =
    typeof detailedRecord?.factions === "object" &&
      detailedRecord.factions !== null
      ? detailedRecord.factions as Record<string, unknown>
      : {};

  const readFactionScore = (key: string) => {
    const resultFaction = resultFactions[key];
    const detailedFaction = detailedFactions[key];
    const faction = typeof detailedFaction === "object" &&
      detailedFaction !== null
      ? detailedFaction as Record<string, unknown>
      : typeof resultFaction === "object" && resultFaction !== null
        ? resultFaction as Record<string, unknown>
        : null;

    return parseScore(faction?.score);
  };

  const faction1 = readFactionScore("faction1");
  const faction2 = readFactionScore("faction2");
  return ownFactionIndex === 0
    ? [faction1, faction2]
    : [faction2, faction1];
}

async function fetchMatchDetailScores(
  matchId: string,
  ownFactionIndex: number,
): Promise<MatchScorePair> {
  const detail = await fetchFaceitJson(
    `${FACEIT_BASE_URL}/match/v2/match/${encodeURIComponent(matchId)}`,
  );
  return getMatchDetailScores(detail, ownFactionIndex);
}

function parseScheduledTime(value: string | number | undefined): string | null {
  if (value == null) return null;

  const date = new Date(
    typeof value === "number" && value < 1_000_000_000_000
      ? value * 1000
      : value,
  );

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchFaceitJson(url: string) {
  for (let attempt = 0; attempt <= FACEIT_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.faceit.com/",
      },
    });

    if (response.ok) return response.json();

    if (
      response.status !== 429 &&
      response.status < 500
    ) {
      throw new FaceitRequestError(response.status);
    }

    if (attempt === FACEIT_MAX_RETRIES) {
      throw new FaceitRequestError(response.status);
    }

    const retryAfter = Number(response.headers.get("Retry-After"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 10_000)
      : Math.min(1000 * 2 ** attempt, 8000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("FACEIT request retry loop exited unexpectedly");
}

async function fetchFaceitDataApiJson(url: string, apiKey: string) {
  for (let attempt = 0; attempt <= FACEIT_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) return response.json();

    if (response.status !== 429 && response.status < 500) {
      throw new FaceitRequestError(response.status);
    }

    if (attempt === FACEIT_MAX_RETRIES) {
      throw new FaceitRequestError(response.status);
    }

    const retryAfter = Number(response.headers.get("Retry-After"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 10_000)
      : Math.min(1000 * 2 ** attempt, 8000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("FACEIT Data API request retry loop exited unexpectedly");
}

function getDataApiMatchScore(
  match: FaceitScheduledMatch,
  factionKey: string,
  factionId: string | undefined,
): number | null {
  const results = Array.isArray(match.results) ? undefined : match.results;
  const score = results?.score?.[factionKey] ??
    (factionId ? results?.score?.[factionId] : undefined) ??
    match.detailed_results?.[0]?.factions?.[factionKey]?.score ??
    (factionId
      ? match.detailed_results?.[0]?.factions?.[factionId]?.score
      : undefined);

  return parseScore(score);
}

function normalizeTeamName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function getTeamName(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  const payload = typeof record.payload === "object" && record.payload !== null
    ? record.payload as Record<string, unknown>
    : null;
  const team = typeof record.team === "object" && record.team !== null
    ? record.team as Record<string, unknown>
    : null;
  const payloadTeam =
    payload && typeof payload.team === "object" && payload.team !== null
      ? payload.team as Record<string, unknown>
      : null;
  const candidates = [
    record.name,
    record.nickname,
    record.team_name,
    team?.name,
    team?.nickname,
    payload?.name,
    payload?.nickname,
    payload?.team_name,
    payloadTeam?.name,
    payloadTeam?.nickname,
  ];

  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  )?.trim() ?? null;
}

async function fetchFaceitTeamName(faceitTeamId: string): Promise<string | null> {
  for (const path of [
    `/teams/v1/teams/${encodeURIComponent(faceitTeamId)}`,
    `/teams/v1/teams/${encodeURIComponent(faceitTeamId)}/profile`,
  ]) {
    try {
      const data = await fetchFaceitJson(`${FACEIT_BASE_URL}${path}`);
      const name = getTeamName(data);
      if (name) return name;
    } catch (error) {
      if (error instanceof FaceitRequestError && error.status === 404) continue;
      console.error(`Unable to resolve FACEIT team name ${faceitTeamId}:`, error);
      return null;
    }
  }

  return null;
}

async function syncUpcomingFixtures(
  teamId: string,
  faceitId: string,
  profile: unknown,
  apiKey: string,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service credentials are not configured");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select(
      "id, name, faceit_id, esea_fixtures_synced_at, esea_results_synced_at, esea_results_sync_version",
    )
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team || team.faceit_id !== faceitId) {
    throw new Error("Team does not match the supplied FACEIT team ID");
  }

  const lastSyncedAt = team.esea_fixtures_synced_at
    ? new Date(team.esea_fixtures_synced_at).getTime()
    : 0;
  const { data: unknownFixtures, error: unknownFixturesError } = await supabase
    .from("matches")
    .select("id")
    .eq("team_1_id", team.id)
    .eq("finished", false)
    .eq("team_2_name", "Nieznana drużyna")
    .not("faceit_match_id", "is", null)
    .limit(1);
  if (unknownFixturesError) throw unknownFixturesError;

  const hasUnknownFixtures = (unknownFixtures?.length ?? 0) > 0;
  const fixtureSyncInterval = hasUnknownFixtures
    ? UNKNOWN_NAME_RETRY_INTERVAL_MS
    : FIXTURE_SYNC_INTERVAL_MS;
  const fixtureSyncIsFresh =
    Number.isFinite(lastSyncedAt) &&
    Date.now() - lastSyncedAt < fixtureSyncInterval;
  const lastResultsSyncedAt = team.esea_results_synced_at
    ? new Date(team.esea_results_synced_at).getTime()
    : 0;
  const resultsSyncIsFresh =
    team.esea_results_sync_version >= RESULTS_SYNC_VERSION &&
    Number.isFinite(lastResultsSyncedAt) &&
    Date.now() - lastResultsSyncedAt < RESULTS_SYNC_INTERVAL_MS;
  const shouldSyncFixtures = !fixtureSyncIsFresh;
  const shouldSyncResults = !resultsSyncIsFresh;

  if (!shouldSyncFixtures && !shouldSyncResults) {
    return { status: "fresh", saved: 0 };
  }

  const currentChampionshipId = getCurrentChampionshipId(profile);
  if (!currentChampionshipId) {
    console.warn(`No current championship ID found for FACEIT team ${faceitId}`);
    return { status: "no-current-season", saved: 0 };
  }

  const teamsResult = await supabase
    .from("teams")
    .select("id, name, faceit_id")
    .not("faceit_id", "is", null);
  if (teamsResult.error) throw teamsResult.error;

  const allTeams = teamsResult.data ?? [];
  const knownTeams = new Map(
    allTeams
      .filter((entry) => entry.faceit_id)
      .map((entry) => [entry.faceit_id, entry] as const),
  );
  const knownTeamsByName = new Map(
    allTeams.map((entry) => [normalizeTeamName(entry.name), entry] as const),
  );
  const fixtures = new Map<string, {
    faceit_match_id: string;
    team_1_id: string | number;
    team_2_id: string | number | null;
    team_2_name: string;
    time: string;
    team_1_score: number | null;
    team_2_score: number | null;
    finished: boolean;
    league: null;
  }>();
  const opponentNameCache = new Map<string, Promise<string | null>>();
  const matchScoreCache = new Map<string, Promise<MatchScorePair>>();
  const now = Date.now();
  for (const championshipId of [currentChampionshipId]) {
    const queries = [
      ...(shouldSyncFixtures
        ? [{ status: "MATCH_STATUS_SCHEDULED", isFinished: false }]
        : []),
      ...(shouldSyncResults
        ? [{ status: "MATCH_STATUS_FINISHED", isFinished: true }]
        : []),
    ];

    for (const { status, isFinished } of queries) {
      for (let page = 0; page < MAX_FIXTURE_PAGES; page += 1) {
        const params = new URLSearchParams({
          championship_ids: championshipId,
          entityId: faceitId,
          entityType: "PREMADE_TEAM",
          status,
          offset: String(page * FIXTURE_PAGE_SIZE),
          limit: String(FIXTURE_PAGE_SIZE),
        });
        const data = await fetchFaceitJson(
          `https://api.faceit.com/team-leagues/v2/matches?${params}`,
        );
        const matches = getMatches(data);

        for (const match of matches) {
          const factions = match.factions;
          const matchId = match.id;
          const ownFaction = factions?.find(
            (faction) => faction.premade_team_id === faceitId,
          );
          const opponent = factions?.find(
            (faction) => faction.premade_team_id &&
              faction.premade_team_id !== faceitId,
          );
          const matchTime = parseScheduledTime(
            match.finished_at ?? match.finishedAt ?? match.started_at ??
            match.startedAt ?? match.scheduled_time,
          );
          let ownScore = ownFaction
            ? getFactionScore(match, ownFaction)
            : null;
          let opponentScore = opponent
            ? getFactionScore(match, opponent)
            : null;

          if (
            !matchId ||
            !ownFaction ||
            !opponent?.premade_team_id ||
            !matchTime ||
            (!isFinished && new Date(matchTime).getTime() <= now)
          ) {
            continue;
          }

          if (isFinished && (ownScore === null || opponentScore === null)) {
            let scoreRequest = matchScoreCache.get(matchId);
            if (!scoreRequest) {
              scoreRequest = fetchMatchDetailScores(
                matchId,
                factions?.indexOf(ownFaction) ?? 0,
              );
              matchScoreCache.set(matchId, scoreRequest);
            }

            try {
              const [detailOwnScore, detailOpponentScore] = await scoreRequest;
              ownScore ??= detailOwnScore;
              opponentScore ??= detailOpponentScore;
            } catch (error) {
              console.error(`Unable to fetch score for FACEIT match ${matchId}:`, error);
            }
          }

          const knownOpponent = knownTeams.get(opponent.premade_team_id);
          const factionName = opponent.name?.trim() ||
            opponent.nickname?.trim() ||
            opponent.team_name?.trim() ||
            opponent.team?.name?.trim() ||
            opponent.team?.nickname?.trim();
          let opponentName = factionName || knownOpponent?.name || null;

          if (!opponentName) {
            let nameRequest = opponentNameCache.get(opponent.premade_team_id);
            if (!nameRequest) {
              nameRequest = fetchFaceitTeamName(opponent.premade_team_id);
              opponentNameCache.set(opponent.premade_team_id, nameRequest);
            }
            opponentName = await nameRequest;
          }

          const existingFixture = fixtures.get(matchId);
          const team1Score = ownScore ?? existingFixture?.team_1_score ?? null;
          const team2Score = opponentScore ?? existingFixture?.team_2_score ?? null;
          fixtures.set(matchId, {
            faceit_match_id: matchId,
            team_1_id: team.id,
            team_2_id: knownOpponent?.id ?? null,
            team_2_name: opponentName ?? "Nieznana drużyna",
            time: matchTime,
            team_1_score: team1Score,
            team_2_score: team2Score,
            finished: (isFinished || existingFixture?.finished === true) &&
              team1Score !== null && team2Score !== null,
            league: null,
          });
        }

        if (matches.length < FIXTURE_PAGE_SIZE) break;
      }
    }

    if (shouldSyncResults) {
      for (let page = 0; page < MAX_FIXTURE_PAGES; page += 1) {
        const params = new URLSearchParams({
          type: "ongoing",
          offset: String(page * 100),
          limit: "100",
        });
        const data = await fetchFaceitDataApiJson(
          `https://open.faceit.com/data/v4/championships/${encodeURIComponent(championshipId)}/matches?${params}`,
          apiKey,
        );
        const ongoingMatches = getMatches(data);

        for (const match of ongoingMatches) {
          const matchTeams = Object.entries(match.teams ?? {});
          const ownFaction = matchTeams.find(([, faction]) =>
            faction.faction_id === faceitId ||
            (faction.name && normalizeTeamName(faction.name) ===
              normalizeTeamName(team.name))
          );
          const opponent = matchTeams.find(([key]) => key !== ownFaction?.[0]);
          const matchTime = parseScheduledTime(
            match.started_at ?? match.scheduled_at,
          );

          if (!match.match_id || !ownFaction || !opponent || !matchTime) {
            continue;
          }

          const [ownFactionKey, ownFactionData] = ownFaction;
          const [opponentFactionKey, opponentFactionData] = opponent;
          const ownScore = getDataApiMatchScore(
            match,
            ownFactionKey,
            ownFactionData.faction_id,
          );
          const opponentScore = getDataApiMatchScore(
            match,
            opponentFactionKey,
            opponentFactionData.faction_id,
          );
          const opponentTeam = opponentFactionData.faction_id
            ? knownTeams.get(opponentFactionData.faction_id)
            : opponentFactionData.name
              ? knownTeamsByName.get(normalizeTeamName(opponentFactionData.name))
              : null;
          const existingFixture = fixtures.get(match.match_id);

          fixtures.set(match.match_id, {
            faceit_match_id: match.match_id,
            team_1_id: team.id,
            team_2_id: opponentTeam?.id ?? null,
            team_2_name: opponentFactionData.name?.trim() ||
              opponentTeam?.name ||
              existingFixture?.team_2_name ||
              "Nieznana drużyna",
            time: matchTime,
            team_1_score: ownScore ?? existingFixture?.team_1_score ?? null,
            team_2_score: opponentScore ?? existingFixture?.team_2_score ?? null,
            finished: existingFixture?.finished ?? false,
            league: null,
          });
        }

        if (ongoingMatches.length < 100) break;
      }
    }
  }

  const fixtureRows = [...fixtures.values()];
  const finishedRows = fixtureRows.filter((match) => match.finished).length;
  if (fixtureRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("matches")
      .upsert(fixtureRows, { onConflict: "faceit_match_id" });
    if (upsertError) throw upsertError;
  }

  const syncTimestamps: {
    esea_fixtures_synced_at?: string;
    esea_results_synced_at?: string;
    esea_results_sync_version?: number;
  } = {};
  const syncedAt = new Date().toISOString();
  if (shouldSyncFixtures) syncTimestamps.esea_fixtures_synced_at = syncedAt;
  if (shouldSyncResults) {
    syncTimestamps.esea_results_synced_at = syncedAt;
    syncTimestamps.esea_results_sync_version = RESULTS_SYNC_VERSION;
  }

  const { error: timestampError } = await supabase
    .from("teams")
    .update(syncTimestamps)
    .eq("id", team.id);
  if (timestampError) throw timestampError;

  return {
    status: "updated",
    saved: fixtureRows.length,
    finished: finishedRows,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const body: unknown = await req.json();
    const apiKey = Deno.env.get("FACEIT_API_KEY");
    if (!apiKey) {
      throw new Error("FACEIT_API_KEY secret is not configured");
    }

    const faceitId =
      typeof body === "object" && body !== null && "faceitId" in body
        ? body.faceitId
        : null;
    const teamId =
      typeof body === "object" && body !== null && "teamId" in body
        ? body.teamId
        : null;
    const action =
      typeof body === "object" && body !== null && "action" in body
        ? body.action
        : "profile";

    if (
      typeof faceitId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(faceitId)
    ) {
      return Response.json(
        { error: "A valid FACEIT team ID is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (action !== "profile" && action !== "sync-fixtures") {
      return Response.json(
        { error: "Unsupported request action" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (
      action === "sync-fixtures" &&
      (typeof teamId !== "string" || teamId.length === 0 || teamId.length > 100)
    ) {
      return Response.json(
        { error: "A valid team ID is required to sync fixtures" },
        { status: 400, headers: corsHeaders },
      );
    }

    let profile: unknown = null;
    try {
      profile = await fetchFaceitJson(
        `${FACEIT_BASE_URL}/team-leagues/v1/teams/${encodeURIComponent(faceitId)}/profile/leagues/current`,
      );
    } catch (error) {
      if (error instanceof FaceitRequestError && error.status === 404) {
        console.info(`No current FACEIT league profile for team ${faceitId}`);
        if (action === "profile") {
          return Response.json(
            {
              fixture_sync: {
                status: "unavailable",
                error: "FACEIT nie udostępnia profilu ligi dla tej drużyny.",
              },
            },
            { headers: corsHeaders },
          );
        }
      }

      if (!(error instanceof FaceitRequestError && error.status === 404)) {
        throw error;
      }
    }

    if (action === "sync-fixtures") {
      const fixtureSync = await syncUpcomingFixtures(
        teamId,
        faceitId,
        profile,
        apiKey,
      );
      return Response.json(
        { fixture_sync: fixtureSync },
        { headers: corsHeaders },
      );
    }

    return Response.json(
      typeof profile === "object" && profile !== null
        ? { ...profile, fixture_sync: { status: "not-requested" } }
        : { profile, fixture_sync: { status: "not-requested" } },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Edge Function error:", error);

    return Response.json(
      { error: "Unable to retrieve FACEIT league data or sync fixtures" },
      { status: 500, headers: corsHeaders },
    );
  }
});

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
const LIVE_MATCH_SYNC_INTERVAL_MS = 15 * 1000;
const RESULTS_SYNC_VERSION = 5;

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
  scheduled_at?: string | number;
  factions?: FaceitFaction[];
  teams?: Record<string, {
    faction_id?: string;
    name?: string;
  }>;
  results?: {
    score?: Record<string, string | number>;
    factions?: Record<string, { score?: string | number }>;
  } | Array<{
    score?: Record<string, string | number>;
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
type FaceitTeamProfile = {
  name: string | null;
  logoUrl: string | null;
};

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
  const detailedResults = (match.detailedResults ?? match.detailed_results)?.[0];
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
  const detailedResultPayload = payload.detailedResults ??
    payload.detailed_results;
  const detailedResults = Array.isArray(detailedResultPayload)
    ? detailedResultPayload[0]
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

  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : NaN;
  const date = new Date(Number.isFinite(numericValue)
    ? numericValue < 1_000_000_000_000
      ? numericValue * 1000
      : numericValue
    : value);

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
  const results = Array.isArray(match.results)
    ? match.results[0]
    : match.results;
  const detailedResults = (match.detailed_results ??
    match.detailedResults)?.[0];
  const score = results?.score?.[factionKey] ??
    (factionId ? results?.score?.[factionId] : undefined) ??
    results?.factions?.[factionKey]?.score ??
    (factionId ? results?.factions?.[factionId]?.score : undefined) ??
    detailedResults?.factions?.[factionKey]?.score ??
    (factionId
      ? detailedResults?.factions?.[factionId]?.score
      : undefined);

  return parseScore(score);
}

function normalizeTeamName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function getFixtureTeamOrder(
  ownTeamId: string | number,
  ownTeamName: string,
  ownScore: number | null,
  opponentTeam: { id: string | number; name: string } | undefined,
  opponentName: string,
  opponentScore: number | null,
) {
  const ownTeamIsFirst = !opponentTeam ||
    String(ownTeamId) < String(opponentTeam.id);

  return ownTeamIsFirst
    ? {
      team_1_id: ownTeamId,
      team_2_id: opponentTeam?.id ?? null,
      team_2_name: opponentName,
      team_1_score: ownScore,
      team_2_score: opponentScore,
    }
    : {
      team_1_id: opponentTeam.id,
      team_2_id: ownTeamId,
      team_2_name: ownTeamName,
      team_1_score: opponentScore,
      team_2_score: ownScore,
    };
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

function getTeamLogoUrl(value: unknown): string | null {
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
  const sources = [record, payload, team, payloadTeam].filter(
    (source): source is Record<string, unknown> => source !== null,
  );
  const candidates = sources.flatMap((source) => [
    source.avatar,
    source.avatar_url,
    source.logo,
    source.logo_url,
    source.picture,
    source.image,
  ]);
  const url = candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" &&
      candidate.trim().startsWith("https://"),
  );

  return url?.trim() ?? null;
}

async function fetchFaceitTeamProfile(
  faceitTeamId: string,
): Promise<FaceitTeamProfile | null> {
  let profile: FaceitTeamProfile = { name: null, logoUrl: null };

  for (const path of [
    `/teams/v1/teams/${encodeURIComponent(faceitTeamId)}`,
    `/teams/v1/teams/${encodeURIComponent(faceitTeamId)}/profile`,
  ]) {
    try {
      const data = await fetchFaceitJson(`${FACEIT_BASE_URL}${path}`);
      profile = {
        name: getTeamName(data) ?? profile.name,
        logoUrl: getTeamLogoUrl(data) ?? profile.logoUrl,
      };
      if (profile.name && profile.logoUrl) return profile;
    } catch (error) {
      if (error instanceof FaceitRequestError && error.status === 404) continue;
      console.error(`Unable to resolve FACEIT team profile ${faceitTeamId}:`, error);
      break;
    }
  }

  return profile.name || profile.logoUrl ? profile : null;
}

async function syncUpcomingFixtures(
  teamId: string,
  faceitId: string,
  apiKey: string,
  forceRefresh: boolean,
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
      "id, name, faceit_id, esea_fixtures_synced_at, esea_results_synced_at, esea_live_synced_at, esea_results_sync_version",
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
  const lastLiveSyncedAt = team.esea_live_synced_at
    ? new Date(team.esea_live_synced_at).getTime()
    : 0;
  const liveSyncIsFresh =
    Number.isFinite(lastLiveSyncedAt) &&
    Date.now() - lastLiveSyncedAt < LIVE_MATCH_SYNC_INTERVAL_MS;
  const shouldSyncFixtures = forceRefresh || !fixtureSyncIsFresh;
  const shouldSyncResults = forceRefresh || !resultsSyncIsFresh;
  const shouldSyncLiveMatches = forceRefresh || !liveSyncIsFresh;
  let shouldFetchLiveMatches = shouldSyncLiveMatches;

  if (shouldFetchLiveMatches && !forceRefresh) {
    const now = Date.now();
    const { data: liveCandidates, error: liveCandidatesError } = await supabase
      .from("matches")
      .select("id")
      .eq("team_1_id", team.id)
      .not("faceit_match_id", "is", null)
      .gte("time", new Date(now - 6 * 60 * 60 * 1000).toISOString())
      .lte("time", new Date(now + 15 * 60 * 1000).toISOString())
      .limit(1);
    if (liveCandidatesError) throw liveCandidatesError;
    shouldFetchLiveMatches = (liveCandidates?.length ?? 0) > 0;
  }

  if (!shouldSyncFixtures && !shouldSyncResults && !shouldSyncLiveMatches) {
    return { status: "fresh", saved: 0 };
  }

  if (!shouldSyncFixtures && !shouldSyncResults && !shouldFetchLiveMatches) {
    const { error: liveTimestampError } = await supabase
      .from("teams")
      .update({ esea_live_synced_at: new Date().toISOString() })
      .eq("id", team.id);
    if (liveTimestampError) throw liveTimestampError;
    return { status: "no-live-fixtures", saved: 0 };
  }

  let profile: unknown;
  try {
    profile = await fetchFaceitJson(
      `${FACEIT_BASE_URL}/team-leagues/v1/teams/${encodeURIComponent(faceitId)}/profile/leagues/current`,
    );
  } catch (error) {
    if (error instanceof FaceitRequestError && error.status === 404) {
      console.warn(`No current championship found for FACEIT team ${faceitId}`);
      return { status: "no-current-season", saved: 0 };
    }
    throw error;
  }

  const currentChampionshipId = getCurrentChampionshipId(profile);
  if (!currentChampionshipId) {
    console.warn(`No current championship ID found for FACEIT team ${faceitId}`);
    return { status: "no-current-season", saved: 0 };
  }

  const teamsResult = await supabase
    .from("teams")
    .select("id, name, faceit_id, logo")
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
  const knownTeamsById = new Map(
    allTeams.map((entry) => [String(entry.id), entry] as const),
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
    opponent_faceit_team_id: string | null;
    opponent_logo_url: string | null;
    league: null;
  }>();
  const opponentProfileCache = new Map<
    string,
    Promise<FaceitTeamProfile | null>
  >();
  const getOpponentProfile = (opponentFaceitId: string) => {
    let profile = opponentProfileCache.get(opponentFaceitId);
    if (!profile) {
      profile = fetchFaceitTeamProfile(opponentFaceitId);
      opponentProfileCache.set(opponentFaceitId, profile);
    }
    return profile;
  };
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

          const factionName = opponent.name?.trim() ||
            opponent.nickname?.trim() ||
            opponent.team_name?.trim() ||
            opponent.team?.name?.trim() ||
            opponent.team?.nickname?.trim();
          const knownOpponent = knownTeams.get(opponent.premade_team_id) ??
            (factionName
              ? knownTeamsByName.get(normalizeTeamName(factionName))
              : undefined);
          let opponentName = factionName || knownOpponent?.name || null;

          if (!opponentName) {
            const opponentProfile = await getOpponentProfile(
              opponent.premade_team_id,
            );
            opponentName = opponentProfile?.name ?? null;
          }

          const existingFixture = fixtures.get(matchId);
          const orderedTeams = getFixtureTeamOrder(
            team.id,
            team.name,
            ownScore,
            knownOpponent,
            opponentName ?? "Nieznana drużyna",
            opponentScore,
          );
          const team1Score = orderedTeams.team_1_score ??
            existingFixture?.team_1_score ?? null;
          const team2Score = orderedTeams.team_2_score ??
            existingFixture?.team_2_score ?? null;
          fixtures.set(matchId, {
            faceit_match_id: matchId,
            ...orderedTeams,
            team_2_name: orderedTeams.team_2_name === "Nieznana drużyna"
              ? existingFixture?.team_2_name ?? orderedTeams.team_2_name
              : orderedTeams.team_2_name,
            time: matchTime,
            team_1_score: team1Score,
            team_2_score: team2Score,
            finished: isFinished || existingFixture?.finished === true,
            opponent_faceit_team_id: opponent.premade_team_id,
            opponent_logo_url: getTeamLogoUrl(opponent) ??
              getTeamLogoUrl(opponent.team) ??
              existingFixture?.opponent_logo_url ??
              null,
            league: null,
          });
        }

        if (matches.length < FIXTURE_PAGE_SIZE) break;
      }
    }

    if (shouldFetchLiveMatches) {
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
          const opponentTeam = (opponentFactionData.faction_id
            ? knownTeams.get(opponentFactionData.faction_id)
            : undefined) ??
            (opponentFactionData.name
              ? knownTeamsByName.get(
                normalizeTeamName(opponentFactionData.name),
              )
              : undefined);
          const opponentProfile = !opponentTeam &&
              opponentFactionData.faction_id &&
              !opponentFactionData.name?.trim()
            ? await getOpponentProfile(opponentFactionData.faction_id)
            : null;
          const existingFixture = fixtures.get(match.match_id);
          const orderedTeams = getFixtureTeamOrder(
            team.id,
            team.name,
            ownScore,
            opponentTeam ?? undefined,
            opponentFactionData.name?.trim() ||
              opponentTeam?.name ||
              "Nieznana drużyna",
            opponentScore,
          );

          fixtures.set(match.match_id, {
            faceit_match_id: match.match_id,
            ...orderedTeams,
            team_2_name: orderedTeams.team_2_name === "Nieznana drużyna"
              ? existingFixture?.team_2_name ?? orderedTeams.team_2_name
              : orderedTeams.team_2_name,
            time: matchTime,
            team_1_score: orderedTeams.team_1_score ??
              existingFixture?.team_1_score ?? null,
            team_2_score: orderedTeams.team_2_score ??
              existingFixture?.team_2_score ?? null,
            finished: false,
            opponent_faceit_team_id: opponentFactionData.faction_id ?? null,
            opponent_logo_url: getTeamLogoUrl(opponentFactionData) ??
              opponentProfile?.logoUrl ??
              existingFixture?.opponent_logo_url ??
              null,
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
    const existingMatchesResult = await supabase
      .from("matches")
      .select(
        "faceit_match_id, team_1_id, team_2_id, team_2_name, team_2_logo_url, team_1_score, team_2_score, finished",
      )
      .in("faceit_match_id", fixtureRows.map((match) => match.faceit_match_id));
    if (existingMatchesResult.error) throw existingMatchesResult.error;

    const existingMatches = new Map(
      (existingMatchesResult.data ?? []).map((match) => [
        match.faceit_match_id,
        match,
      ]),
    );
    const rowsToSave = await Promise.all(fixtureRows.map(async (match) => {
      const existing = existingMatches.get(match.faceit_match_id);
      const existingIsReversed = existing &&
        String(existing.team_1_id) !== String(match.team_1_id) &&
        String(existing.team_2_id) === String(match.team_1_id);
      const existingTeam1Score = existingIsReversed
        ? existing.team_2_score
        : existing?.team_1_score;
      const existingTeam2Score = existingIsReversed
        ? existing.team_1_score
        : existing?.team_2_score;
      const team2Id = match.team_2_id ?? existing?.team_2_id ?? null;
      const team2Name = match.team_2_name === "Nieznana drużyna"
        ? existing?.team_2_name ?? match.team_2_name
        : match.team_2_name;
      const team2IsOpponent = String(team2Id ?? "") !== String(team.id);
      const localTeam2 = team2Id == null
        ? undefined
        : knownTeamsById.get(String(team2Id));
      let team2LogoUrl = team2IsOpponent &&
          String(existing?.team_2_id ?? "") === String(team2Id ?? "")
        ? existing?.team_2_logo_url ?? null
        : null;
      const matchTime = new Date(match.time).getTime();
      const isLogoLookupInWindow =
        matchTime >= Date.now() - 24 * 60 * 60 * 1000 &&
        matchTime <= Date.now() + 7 * 24 * 60 * 60 * 1000;

      if (team2IsOpponent && !team2LogoUrl && !localTeam2?.logo) {
        let fetchedLogoUrl = match.opponent_logo_url;
        const opponentFaceitId = match.opponent_faceit_team_id ??
          localTeam2?.faceit_id;
        if (!fetchedLogoUrl && opponentFaceitId && isLogoLookupInWindow) {
          const opponentProfile = await getOpponentProfile(opponentFaceitId);
          fetchedLogoUrl = opponentProfile?.logoUrl ?? null;
        }
        team2LogoUrl = fetchedLogoUrl;
      }

      return {
        faceit_match_id: match.faceit_match_id,
        team_1_id: match.team_1_id,
        team_2_id: team2Id,
        team_2_name: team2Name,
        team_2_logo_url: team2LogoUrl,
        time: match.time,
        team_1_score: match.team_1_score ?? existingTeam1Score ?? null,
        team_2_score: match.team_2_score ?? existingTeam2Score ?? null,
        finished: match.finished,
        league: match.league,
      };
    }));
    const { error: upsertError } = await supabase
      .from("matches")
      .upsert(rowsToSave, { onConflict: "faceit_match_id" });
    if (upsertError) throw upsertError;
  }

  const syncTimestamps: {
    esea_fixtures_synced_at?: string;
    esea_results_synced_at?: string;
    esea_live_synced_at?: string;
    esea_results_sync_version?: number;
  } = {};
  const syncedAt = new Date().toISOString();
  if (shouldSyncFixtures) syncTimestamps.esea_fixtures_synced_at = syncedAt;
  if (shouldSyncResults) {
    syncTimestamps.esea_results_synced_at = syncedAt;
    syncTimestamps.esea_results_sync_version = RESULTS_SYNC_VERSION;
  }
  if (shouldSyncLiveMatches) syncTimestamps.esea_live_synced_at = syncedAt;

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
    const forceRefresh =
      typeof body === "object" && body !== null &&
        "forceRefresh" in body && body.forceRefresh === true;
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

    if (action === "sync-fixtures") {
      const fixtureSync = await syncUpcomingFixtures(
        teamId,
        faceitId,
        apiKey,
        forceRefresh,
      );
      return Response.json(
        { fixture_sync: fixtureSync },
        { headers: corsHeaders },
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

      throw error;
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

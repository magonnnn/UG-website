import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { calculateHltvStyleEstimate } from "../_shared/hltvStyleEstimate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";
const GAME = "cs2";
const MATCH_LIMIT = 30;
const STATS_CONCURRENCY = 5;
const SITE_MATCH_ID_LIMIT = 100;

type FaceitProfile = {
  player_id: string;
  [key: string]: unknown;
};

type MatchHistory = {
  items?: Array<{ match_id?: string; started_at?: number | string }>;
};

type PlayerMatchStats = {
  player_id?: string;
  player_stats?: Record<string, string>;
};

type MatchStatsResponse = {
  rounds?: Array<{
    round_stats?: Record<string, string>;
    teams?: Array<{
      team_id?: string;
      team_stats?: Record<string, string>;
      players?: PlayerMatchStats[];
    }>;
  }>;
};

function numericStat(stats: Record<string, string>, name: string): number {
  const value = Number(stats[name]);
  return Number.isFinite(value) ? value : 0;
}

async function faceitRequest<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${FACEIT_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`FACEIT API request failed with status ${response.status}`);
  }

  return response.json();
}

function getRoundCount(round: NonNullable<MatchStatsResponse["rounds"]>[number]): number {
  const reportedRounds = Number(round.round_stats?.Rounds);
  if (Number.isFinite(reportedRounds) && reportedRounds > 0) return reportedRounds;

  return (round.teams ?? []).reduce(
    (total, team) => total + (Number(team.team_stats?.["Final Score"]) || 0),
    0,
  );
}

function isFaceitMatchId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
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
    const steamid64 =
      typeof body === "object" && body !== null && "steamid64" in body
        ? body.steamid64
        : null;
    const requestedSiteMatchIds =
      typeof body === "object" && body !== null && "siteMatchIds" in body
        ? body.siteMatchIds
        : undefined;

    if (typeof steamid64 !== "string" || !/^\d{17}$/.test(steamid64)) {
      return Response.json(
        { error: "A valid SteamID64 is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    let siteMatchIds: string[] | null = null;
    if (requestedSiteMatchIds !== undefined) {
      if (
        !Array.isArray(requestedSiteMatchIds) ||
        !requestedSiteMatchIds.every(isFaceitMatchId)
      ) {
        return Response.json(
          { error: "Site match IDs must be a list of valid FACEIT match IDs" },
          { status: 400, headers: corsHeaders },
        );
      }
      siteMatchIds = [...new Set(requestedSiteMatchIds)];
      if (siteMatchIds.length > SITE_MATCH_ID_LIMIT) {
        return Response.json(
          { error: `No more than ${SITE_MATCH_ID_LIMIT} site match IDs can be requested at once` },
          { status: 400, headers: corsHeaders },
        );
      }
    }

    const apiKey = Deno.env.get("FACEIT_API_KEY");
    if (!apiKey) {
      throw new Error("FACEIT_API_KEY secret is not configured");
    }

    const profile = await faceitRequest<FaceitProfile>(
      `/players?game_player_id=${encodeURIComponent(steamid64)}&game=${GAME}`,
      apiKey,
    );
    if (typeof profile.player_id !== "string" || !profile.player_id) {
      throw new Error("FACEIT player profile did not include a player ID");
    }

    const matches = siteMatchIds === null
      ? (await faceitRequest<MatchHistory>(
        `/players/${encodeURIComponent(profile.player_id)}/history?game=${GAME}&offset=0&limit=${MATCH_LIMIT}`,
        apiKey,
      )).items ?? []
      : siteMatchIds.map((match_id) => ({ match_id }));
    const totals = {
      kills: 0,
      deaths: 0,
      assists: 0,
      headshots: 0,
      wins: 0,
      rounds: 0,
      damage: 0,
      damageRounds: 0,
    };
    const matchHistory: Array<{
      matchId: string;
      startedAt: number | string | null;
      teamId: string | null;
      teamIndex: number;
      kills: number;
      deaths: number;
      assists: number;
      headshots: number;
      won: boolean;
      rounds: number;
      maps: number;
      adr: number | null;
      ratingEstimate: number | null;
    }> = [];
    let completedMatches = 0;
    let failedMatches = 0;

    for (let index = 0; index < matches.length; index += STATS_CONCURRENCY) {
      const batch = matches.slice(index, index + STATS_CONCURRENCY);
      const batchStats = await Promise.all(
        batch.map(async ({ match_id, started_at }) => {
          if (!match_id) {
            failedMatches += 1;
            return null;
          }

          try {
            const response = await faceitRequest<MatchStatsResponse>(
              `/matches/${encodeURIComponent(match_id)}/stats`,
              apiKey,
            );
            const playerRounds = (response.rounds ?? []).flatMap((round) =>
              (round.teams ?? []).flatMap((team, teamIndex) => {
                const player = (team.players ?? []).find(
                  (entry) => entry.player_id === profile.player_id,
                );
                return player?.player_stats
                  ? [{
                    player,
                    teamId: team.team_id ?? null,
                    teamIndex,
                    rounds: getRoundCount(round),
                  }]
                  : [];
              })
            );

            if (playerRounds.length === 0) {
              failedMatches += 1;
              return null;
            }

            return {
              matchId: match_id,
              startedAt: started_at ?? null,
              playerRounds,
            };
          } catch (error) {
            failedMatches += 1;
            console.error(
              `Unable to retrieve stats for FACEIT match ${match_id}:`,
              error,
            );
            return null;
          }
        }),
      );

      for (const match of batchStats) {
        if (!match) continue;

        const stats = { kills: 0, deaths: 0, assists: 0, headshots: 0 };
        let rounds = 0;
        let damage = 0;
        let damageRounds = 0;
        const firstPlayerRound = match.playerRounds[0];
        const won = numericStat(firstPlayerRound.player.player_stats ?? {}, "Result") === 1;

        for (const playerRound of match.playerRounds) {
          const playerStats = playerRound.player.player_stats ?? {};
          stats.kills += numericStat(playerStats, "Kills");
          stats.deaths += numericStat(playerStats, "Deaths");
          stats.assists += numericStat(playerStats, "Assists");
          stats.headshots += numericStat(playerStats, "Headshots");
          rounds += playerRound.rounds;

          const adr = Number(playerStats.ADR);
          if (Number.isFinite(adr) && playerRound.rounds > 0) {
            damage += adr * playerRound.rounds;
            damageRounds += playerRound.rounds;
          }
        }

        const adr = damageRounds > 0 ? damage / damageRounds : null;
        const ratingEstimate = calculateHltvStyleEstimate({
          ...stats,
          rounds,
          adr,
        });

        totals.kills += stats.kills;
        totals.deaths += stats.deaths;
        totals.assists += stats.assists;
        totals.headshots += stats.headshots;
        totals.wins += won ? 1 : 0;
        totals.rounds += rounds;
        totals.damage += damage;
        totals.damageRounds += damageRounds;
        completedMatches += 1;
        matchHistory.push({
          matchId: match.matchId,
          startedAt: match.startedAt,
          teamId: firstPlayerRound.teamId,
          teamIndex: firstPlayerRound.teamIndex,
          ...stats,
          won,
          rounds,
          maps: match.playerRounds.length,
          adr,
          ratingEstimate,
        });
      }
    }

    if (siteMatchIds !== null) {
      return Response.json(
        { profile, matchStats: matchHistory, failedMatches },
        { headers: corsHeaders },
      );
    }

    const ratio = (value: number, denominator: number) =>
      denominator > 0 ? value / denominator : 0;

    return Response.json(
      {
        profile,
        recentStats: {
          matches: completedMatches,
          failedMatches,
          averageKills: ratio(totals.kills, completedMatches),
          averageDeaths: ratio(totals.deaths, completedMatches),
          averageAssists: ratio(totals.assists, completedMatches),
          killDeathRatio: ratio(totals.kills, totals.deaths),
          headshotPercentage: ratio(totals.headshots * 100, totals.kills),
          winPercentage: ratio(totals.wins * 100, completedMatches),
          rounds: totals.rounds,
          killsPerRound: ratio(totals.kills, totals.rounds),
          deathsPerRound: ratio(totals.deaths, totals.rounds),
          adr: totals.damageRounds > 0
            ? totals.damage / totals.damageRounds
            : null,
          ratingEstimate: calculateHltvStyleEstimate({
            kills: totals.kills,
            deaths: totals.deaths,
            assists: totals.assists,
            rounds: totals.rounds,
            adr: totals.damageRounds > 0
              ? totals.damage / totals.damageRounds
              : null,
          }),
          matchHistory,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("FACEIT player stats function error:", error);
    return Response.json(
      { error: "Unable to retrieve FACEIT player stats" },
      { status: 500, headers: corsHeaders },
    );
  }
});

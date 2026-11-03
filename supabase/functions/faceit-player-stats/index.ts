import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

type FaceitProfile = {
  player_id: string;
  [key: string]: unknown;
};

type MatchHistory = {
  items?: Array<{ match_id?: string }>;
};

type PlayerMatchStats = {
  player_id?: string;
  player_stats?: Record<string, string>;
};

type MatchStatsResponse = {
  rounds?: Array<{
    teams?: Array<{
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

    if (typeof steamid64 !== "string" || !/^\d{17}$/.test(steamid64)) {
      return Response.json(
        { error: "A valid SteamID64 is required" },
        { status: 400, headers: corsHeaders },
      );
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

    const history = await faceitRequest<MatchHistory>(
      `/players/${encodeURIComponent(profile.player_id)}/history?game=${GAME}&offset=0&limit=${MATCH_LIMIT}`,
      apiKey,
    );
    const matches = history.items ?? [];
    const totals = { kills: 0, deaths: 0, assists: 0, headshots: 0, wins: 0 };
    let completedMatches = 0;
    let failedMatches = 0;

    for (let index = 0; index < matches.length; index += STATS_CONCURRENCY) {
      const batch = matches.slice(index, index + STATS_CONCURRENCY);
      const batchStats = await Promise.all(
        batch.map(async ({ match_id }) => {
          if (!match_id) {
            failedMatches += 1;
            return null;
          }

          try {
            const response = await faceitRequest<MatchStatsResponse>(
              `/matches/${encodeURIComponent(match_id)}/stats`,
              apiKey,
            );
            const player = response.rounds
              ?.flatMap((round) => round.teams ?? [])
              .flatMap((team) => team.players ?? [])
              .find((entry) => entry.player_id === profile.player_id);

            if (!player?.player_stats) {
              failedMatches += 1;
              return null;
            }

            return player.player_stats;
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

      for (const stats of batchStats) {
        if (!stats) continue;

        totals.kills += numericStat(stats, "Kills");
        totals.deaths += numericStat(stats, "Deaths");
        totals.assists += numericStat(stats, "Assists");
        totals.headshots += numericStat(stats, "Headshots");
        totals.wins += numericStat(stats, "Result") === 1 ? 1 : 0;
        completedMatches += 1;
      }
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

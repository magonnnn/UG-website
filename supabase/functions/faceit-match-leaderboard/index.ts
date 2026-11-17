import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { calculateHltvStyleEstimate } from "../_shared/hltvStyleEstimate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

type FaceitPlayer = {
  player_id?: string;
  player_name?: string;
  nickname?: string;
  player_stats?: Record<string, string>;
};

type FaceitProfile = {
  nickname?: string;
  games?: Record<string, { game_player_id?: string | number }>;
};

type FaceitMatchStats = {
  rounds?: Array<{
    round_stats?: Record<string, string>;
    teams?: Array<{
      team_id?: string;
      team_stats?: Record<string, string>;
      players?: FaceitPlayer[];
    }>;
  }>;
};

type StatKey = "kills" | "deaths" | "assists" | "headshots";

type PlayerAggregate = {
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamIndex: number;
  rounds: number;
  damage: number;
  damageRounds: number;
  stats: Record<StatKey, number>;
  availableStats: Set<StatKey>;
};

const statFields: Array<{ key: StatKey; faceitKey: string }> = [
  { key: "kills", faceitKey: "Kills" },
  { key: "deaths", faceitKey: "Deaths" },
  { key: "assists", faceitKey: "Assists" },
  { key: "headshots", faceitKey: "Headshots" },
];
const ratingRequiredStats: StatKey[] = ["kills", "deaths", "assists"];

function parseStat(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    const matchId =
      typeof body === "object" && body !== null && "matchId" in body
        ? body.matchId
        : null;

    if (
      typeof matchId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(matchId)
    ) {
      return Response.json(
        { error: "A valid FACEIT match ID is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const apiKey = Deno.env.get("FACEIT_API_KEY");
    if (!apiKey) {
      throw new Error("FACEIT_API_KEY secret is not configured");
    }

    const response = await fetch(
      `${FACEIT_API_BASE}/matches/${encodeURIComponent(matchId)}/stats`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`FACEIT match stats request failed with status ${response.status}`);
    }

    const matchStats = await response.json() as FaceitMatchStats;
    const players = new Map<string, PlayerAggregate>();
    const teamIndexesById = new Map<string, number>();

    for (const round of matchStats.rounds ?? []) {
      const roundCount = parseStat(round.round_stats?.Rounds) ??
        (round.teams ?? []).reduce(
          (total, team) => total + (parseStat(team.team_stats?.["Final Score"]) ?? 0),
          0,
        );
      const roundTeams = round.teams ?? [];
      const teamIds = roundTeams.map((team) => team.team_id).filter(Boolean);
      const hasUniqueTeamIds = new Set(teamIds).size === teamIds.length;

      for (const [roundTeamIndex, team] of roundTeams.entries()) {
        let teamIndex = roundTeamIndex;
        if (hasUniqueTeamIds && team.team_id) {
        if (!teamIndexesById.has(team.team_id)) {
          teamIndexesById.set(team.team_id, roundTeamIndex);
        }
        teamIndex = teamIndexesById.get(team.team_id) ?? roundTeamIndex;
        }

        for (const player of team.players ?? []) {
          if (typeof player.player_id !== "string" || !player.player_id) continue;

          let aggregate = players.get(player.player_id);
          if (!aggregate) {
            aggregate = {
              playerId: player.player_id,
              playerName: player.nickname || player.player_name || "Nieznany gracz",
              teamId: team.team_id ?? null,
              teamIndex,
              rounds: 0,
              damage: 0,
              damageRounds: 0,
              stats: { kills: 0, deaths: 0, assists: 0, headshots: 0 },
              availableStats: new Set(),
            };
            players.set(player.player_id, aggregate);
          }

          const displayName = player.nickname || player.player_name;
          if (displayName) aggregate.playerName = displayName;
          if (team.team_id) aggregate.teamId = team.team_id;
          aggregate.teamIndex = teamIndex;
          if (roundCount > 0) aggregate.rounds += roundCount;

          for (const { key, faceitKey } of statFields) {
            const value = parseStat(player.player_stats?.[faceitKey]);
            if (value === null) continue;
            aggregate.stats[key] += value;
            aggregate.availableStats.add(key);
          }

          const adr = parseStat(player.player_stats?.ADR);
          if (adr != null && roundCount > 0) {
            aggregate.damage += adr * roundCount;
            aggregate.damageRounds += roundCount;
          }
        }
      }
    }

    const playerAggregates = Array.from(players.values());
    const leaderboard = [];
    let profileLookupFailures = 0;

    for (let index = 0; index < playerAggregates.length; index += 5) {
      const batch = playerAggregates.slice(index, index + 5);
      const profiles = await Promise.all(
        batch.map(async (player) => {
          try {
            const profileResponse = await fetch(
              `${FACEIT_API_BASE}/players/${encodeURIComponent(player.playerId)}`,
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Accept: "application/json",
                },
              },
            );

            if (!profileResponse.ok) {
              throw new Error(`FACEIT player profile request failed with status ${profileResponse.status}`);
            }

            return await profileResponse.json() as FaceitProfile;
          } catch (error) {
            profileLookupFailures += 1;
            console.error(
              `Unable to retrieve FACEIT profile ${player.playerId}:`,
              error,
            );
            return null;
          }
        }),
      );

      batch.forEach((player, batchIndex) => {
        const profile = profiles[batchIndex];
        const gamePlayerId = profile?.games?.cs2?.game_player_id ??
          profile?.games?.csgo?.game_player_id;
        const steamId64 = gamePlayerId == null ? null : String(gamePlayerId);

        leaderboard.push({
          playerId: player.playerId,
          playerName: profile?.nickname || player.playerName,
          steamId64: steamId64 && /^\d{17}$/.test(steamId64) ? steamId64 : null,
          teamId: player.teamId,
          teamIndex: player.teamIndex,
          rounds: player.rounds,
          adr: player.damageRounds > 0
            ? player.damage / player.damageRounds
            : null,
          kills: player.availableStats.has("kills") ? player.stats.kills : null,
          deaths: player.availableStats.has("deaths") ? player.stats.deaths : null,
          assists: player.availableStats.has("assists") ? player.stats.assists : null,
          headshots: player.availableStats.has("headshots")
            ? player.stats.headshots
            : null,
          ratingEstimate: ratingRequiredStats.every((key) =>
            player.availableStats.has(key)
          )
            ? calculateHltvStyleEstimate({
              kills: player.stats.kills,
              deaths: player.stats.deaths,
              assists: player.stats.assists,
              rounds: player.rounds,
              adr: player.damageRounds > 0
                ? player.damage / player.damageRounds
                : null,
            })
            : null,
        });
      });
    }

    leaderboard.sort((first, second) =>
      (second.kills ?? -1) - (first.kills ?? -1) ||
      first.playerName.localeCompare(second.playerName)
    );

    return Response.json(
      { players: leaderboard, profileLookupFailures },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("FACEIT match leaderboard function error:", error);
    return Response.json(
      { error: "Unable to retrieve FACEIT match stats" },
      { status: 500, headers: corsHeaders },
    );
  }
});

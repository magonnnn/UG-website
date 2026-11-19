import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import clockIcon from "../assets/clock.svg";

const Match = () => {
    const location = useLocation();
    const matchId = location.state?.id;
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [leaderboard, setLeaderboard] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [leaderboardError, setLeaderboardError] = useState("");
    const [leaderboardLinkError, setLeaderboardLinkError] = useState("");

    useEffect(() => {
        let active = true;
        let matchRefreshInterval;

        const fetchMatch = async () => {
            const { data, error: queryError } = await supabase
                .from("matches")
                .select(`
                    id,
                    time,
                    team_2_name,
                    team_2_logo_url,
                    faceit_match_id,
                    team_1_score,
                    team_2_score,
                    finished,
                    cancelled,
                    team_1:teams!matches_team_1_id_fkey (
                        id,
                        name,
                        logo,
                        faceit_id,
                        player1,
                        player2,
                        player3,
                        player4,
                        player5
                    ),
                    team_2:teams!matches_team_2_id_fkey (
                        id,
                        name,
                        logo,
                        faceit_id,
                        player1,
                        player2,
                        player3,
                        player4,
                        player5
                    ),
                    league:tournaments!matches_league_fkey (
                        name
                    )
                `)
                .eq("id", matchId)
                .maybeSingle();

            if (queryError) {
                console.error("Error loading match:", queryError.message);
                return { data: null, error: "Nie udało się załadować meczu." };
            } else if (!data) {
                return { data: null, error: "Nie znaleziono tego meczu." };
            }

            return { data, error: "" };
        };

        const loadMatch = async () => {
            if (!matchId) {
                setError("Nie wybrano meczu.");
                setLoading(false);
                return null;
            }

            setLoading(true);
            setError("");
            const result = await fetchMatch();

            if (!active) return null;

            if (!result.data) {
                setError(result.error);
                setLoading(false);
                return null;
            }

            setMatch(result.data);
            setLoading(false);
            return result.data;
        };

        const refreshMatch = async () => {
            const result = await fetchMatch();
            if (!active || !result.data) return;

            setMatch(result.data);
            if (
                result.data.cancelled ||
                (
                    result.data.finished &&
                    result.data.team_1_score != null &&
                    result.data.team_2_score != null
                )
            ) {
                if (matchRefreshInterval) {
                    window.clearInterval(matchRefreshInterval);
                    matchRefreshInterval = null;
                }
            }
        };

        const initializeMatch = async () => {
            const initialMatch = await loadMatch();
            if (
                !active ||
                !initialMatch?.faceit_match_id ||
                initialMatch.cancelled ||
                (
                    initialMatch.finished &&
                    initialMatch.team_1_score != null &&
                    initialMatch.team_2_score != null
                )
            ) {
                return;
            }

            matchRefreshInterval = window.setInterval(() => {
                void refreshMatch();
            }, 15 * 1000);
        };

        void initializeMatch();

        return () => {
            active = false;
            if (matchRefreshInterval) window.clearInterval(matchRefreshInterval);
        };
    }, [matchId]);

    const matchFaceitId = match?.faceit_match_id;
    const matchFinished = match?.finished;
    const matchCancelled = match?.cancelled;
    const team1FaceitId = match?.team_1?.faceit_id;
    const team2FaceitId = match?.team_2?.faceit_id;
    const getRosterKey = (team) =>
        [team?.player1, team?.player2, team?.player3, team?.player4, team?.player5]
            .filter((playerId) => playerId != null)
            .map(String)
            .join(",");
    const team1RosterKey = getRosterKey(match?.team_1);
    const team2RosterKey = getRosterKey(match?.team_2);

    useEffect(() => {
        let active = true;

        const loadLeaderboard = async () => {
            if (!matchFinished || matchCancelled || !matchFaceitId) {
                setLeaderboard([]);
                setLeaderboardError("");
                setLeaderboardLinkError("");
                setLeaderboardLoading(false);
                return;
            }

            setLeaderboard([]);
            setLeaderboardError("");
            setLeaderboardLinkError("");
            setLeaderboardLoading(true);

            try {
                const { data, error: functionError } = await supabase.functions.invoke(
                    "faceit-match-leaderboard",
                    { body: { matchId: matchFaceitId } },
                );

                if (functionError) throw functionError;
                if (!Array.isArray(data?.players)) {
                    throw new Error("FACEIT leaderboard response is invalid.");
                }

                let linkWarning = data.profileLookupFailures > 0
                    ? "Nie udało się pobrać części profili FACEIT."
                    : "";
                const rosterIdsByTeam = [team1RosterKey, team2RosterKey]
                    .map((rosterKey) => rosterKey.split(",").filter(Boolean));
                const rosterPlayerIds = [...new Set(rosterIdsByTeam.flat())];
                let rosterPlayersById = new Map();

                if (rosterPlayerIds.length > 0) {
                    const { data: rosterPlayers, error: rosterError } = await supabase
                        .from("players")
                        .select("id, steamid64")
                        .in("id", rosterPlayerIds);

                    if (rosterError) {
                        console.error("Error loading match team players:", rosterError.message);
                        linkWarning = [
                            linkWarning,
                            "Nie udało się połączyć graczy z profilami drużyn.",
                        ].filter(Boolean).join(" ");
                    } else {
                        rosterPlayersById = new Map(
                            (rosterPlayers ?? []).map((player) => [String(player.id), player]),
                        );
                    }
                }

                const teamFaceitIds = [team1FaceitId, team2FaceitId];
                const hasDistinctTeamFaceitIds =
                    teamFaceitIds[0] != null &&
                    teamFaceitIds[1] != null &&
                    String(teamFaceitIds[0]) !== String(teamFaceitIds[1]);
                const rosterTeamBySteamId = new Map();
                const ambiguousRosterSteamIds = new Set();

                rosterIdsByTeam.forEach((rosterIds, teamIndex) => {
                    rosterIds.forEach((rosterId) => {
                        const steamId64 = rosterPlayersById.get(rosterId)?.steamid64;
                        if (!steamId64) return;

                        const steamId = String(steamId64);
                        const existingTeamIndex = rosterTeamBySteamId.get(steamId);
                        if (existingTeamIndex != null && existingTeamIndex !== teamIndex) {
                            rosterTeamBySteamId.delete(steamId);
                            ambiguousRosterSteamIds.add(steamId);
                        } else if (!ambiguousRosterSteamIds.has(steamId)) {
                            rosterTeamBySteamId.set(steamId, teamIndex);
                        }
                    });
                });

                const teamIndexByStatsIndex = new Map();
                const ambiguousStatsIndexes = new Set();
                const teamIndexByMatchTeamId = new Map();
                const ambiguousMatchTeamIds = new Set();
                const matchTeamIds = new Set(
                    data.players
                        .map((player) => player.teamId)
                        .filter((teamId) => teamId != null)
                        .map(String),
                );

                data.players.forEach((player) => {
                    const steamId = player.steamId64 == null
                        ? null
                        : String(player.steamId64);
                    const rosterTeamIndex = steamId == null
                        ? undefined
                        : rosterTeamBySteamId.get(steamId);
                    if (rosterTeamIndex == null) return;

                    if (player.teamId != null) {
                        const matchTeamId = String(player.teamId);
                        const existingTeamIndex = teamIndexByMatchTeamId.get(matchTeamId);
                        if (existingTeamIndex != null && existingTeamIndex !== rosterTeamIndex) {
                            teamIndexByMatchTeamId.delete(matchTeamId);
                            ambiguousMatchTeamIds.add(matchTeamId);
                        } else if (!ambiguousMatchTeamIds.has(matchTeamId)) {
                            teamIndexByMatchTeamId.set(matchTeamId, rosterTeamIndex);
                        }
                    }

                    const statsIndex = player.teamIndex;
                    if (Number.isInteger(statsIndex) && statsIndex >= 0 && statsIndex <= 1) {
                        const existingTeamIndex = teamIndexByStatsIndex.get(statsIndex);
                        if (existingTeamIndex != null && existingTeamIndex !== rosterTeamIndex) {
                            teamIndexByStatsIndex.delete(statsIndex);
                            ambiguousStatsIndexes.add(statsIndex);
                        } else if (!ambiguousStatsIndexes.has(statsIndex)) {
                            teamIndexByStatsIndex.set(statsIndex, rosterTeamIndex);
                        }
                    }
                });

                if (teamIndexByMatchTeamId.size === 1 && matchTeamIds.size === 2) {
                    const [[matchTeamId, rosterTeamIndex]] = teamIndexByMatchTeamId;
                    const otherMatchTeamId = [...matchTeamIds]
                        .find((teamId) => teamId !== matchTeamId);
                    if (otherMatchTeamId && !ambiguousMatchTeamIds.has(otherMatchTeamId)) {
                        teamIndexByMatchTeamId.set(otherMatchTeamId, 1 - rosterTeamIndex);
                    }
                }

                if (teamIndexByStatsIndex.size === 1) {
                    const [[statsIndex, rosterTeamIndex]] = teamIndexByStatsIndex;
                    const otherStatsIndex = statsIndex === 0 ? 1 : 0;
                    if (!ambiguousStatsIndexes.has(otherStatsIndex)) {
                        teamIndexByStatsIndex.set(otherStatsIndex, 1 - rosterTeamIndex);
                    }
                }

                const playersWithProfiles = data.players.map((player) => {
                    const faceitTeamIndex = hasDistinctTeamFaceitIds
                        ? teamFaceitIds.findIndex(
                            (faceitId) => String(faceitId) === String(player.teamId),
                        )
                        : -1;
                    const steamId = player.steamId64 == null
                        ? null
                        : String(player.steamId64);
                    const rosterTeamIndex = steamId == null
                        ? undefined
                        : rosterTeamBySteamId.get(steamId);
                    const matchTeamIndex = player.teamId == null
                        ? undefined
                        : teamIndexByMatchTeamId.get(String(player.teamId));
                    const statsTeamIndex = teamIndexByStatsIndex.get(player.teamIndex);
                    const teamIndex = rosterTeamIndex ?? matchTeamIndex ?? statsTeamIndex ??
                        (faceitTeamIndex >= 0 ? faceitTeamIndex : player.teamIndex);
                    const sitePlayer = (rosterIdsByTeam[teamIndex] ?? [])
                        .map((rosterId) => rosterPlayersById.get(rosterId))
                        .find((rosterPlayer) =>
                            !ambiguousRosterSteamIds.has(steamId) &&
                            rosterPlayer?.steamid64 &&
                            String(rosterPlayer.steamid64) === steamId
                        );

                    return {
                        ...player,
                        teamIndex,
                        profileId: sitePlayer?.id ?? null,
                    };
                });

                if (active) {
                    setLeaderboard(playersWithProfiles);
                    setLeaderboardLinkError(linkWarning);
                }
            } catch (loadError) {
                if (!active) return;
                console.error("Error loading FACEIT match leaderboard:", loadError);
                setLeaderboardError("Nie udało się załadować statystyk meczu.");
            } finally {
                if (active) setLeaderboardLoading(false);
            }
        };

        void loadLeaderboard();
        return () => {
            active = false;
        };
    }, [
        matchCancelled,
        matchFaceitId,
        matchFinished,
        team1FaceitId,
        team1RosterKey,
        team2FaceitId,
        team2RosterKey,
    ]);

    const getLogoUrl = (logo) => {
        if (!logo) return null;

        return supabase.storage.from("logos").getPublicUrl(logo).data.publicUrl;
    };

    const matchTime = match?.time
        ? new Date(match.time).toLocaleString("pl-PL", {
            dateStyle: "full",
            timeStyle: "short",
        })
        : "Termin do ustalenia";

    if (loading) {
        return <p className="my-8 text-center text-sm text-gray-400">Ładowanie meczu...</p>;
    }

    if (error) {
        return (
            <section className="my-6 border border-white/10 p-6 text-center">
                <p className="text-gray-300">{error}</p>
                <Link to="/" className="mt-4 inline-block text-sm font-semibold text-red-400 hover:text-red-300">
                    Wróć na stronę główną
                </Link>
            </section>
        );
    }

    const teams = [
        { ...match.team_1, label: match.team_1?.name ?? "Drużyna 1" },
        {
            ...match.team_2,
            label: match.team_2?.name ?? match.team_2_name ?? "Drużyna 2",
        },
    ];
    const hasLiveScore = !match.finished && !match.cancelled &&
        (match.team_1_score != null || match.team_2_score != null);
    const leaderboardByTeam = teams.map((team, teamIndex) => ({
        team,
        players: leaderboard.filter((player) => player.teamIndex === teamIndex),
    }));

    return (
        <article className="my-6 min-w-0 bg-bg border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
                        {match.league?.name ?? (match.faceit_match_id ? "ESEA" : "Mecz")}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
                        <img src={clockIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-60" />
                        {matchTime}
                    </p>
                </div>
                <span className="rounded-full bg-[#17191e] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300">
                    {match.cancelled ? "Anulowany" : match.finished ? "Zakończony" : hasLiveScore ? "Na żywo" : "Zaplanowany"}
                </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-10 sm:gap-8 sm:px-10 sm:py-14">
                {teams.map((team, index) => {
                    const logoUrl = getLogoUrl(team.logo) ??
                        (index === 1 ? match.team_2_logo_url : null);
                    const teamContent = (
                        <>
                            {logoUrl ? (
                                <img src={logoUrl} alt="" className="h-16 w-16 object-contain sm:h-24 sm:w-24" />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-xl font-bold text-gray-500 sm:h-24 sm:w-24 sm:text-3xl">
                                    {team.label.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <h1 className="max-w-full break-words text-lg font-bold text-white sm:text-2xl">
                                {team.label}
                            </h1>
                        </>
                    );

                    return (
                        team.id ? (
                            <Link
                                className={`flex min-w-0 flex-col items-center gap-4 text-center ${index === 0 ? "order-1" : "order-3"}`}
                                key={`${team.label}-${index}`}
                                to="/team"
                                state={{ id: team.id }}
                            >
                                {teamContent}
                            </Link>
                        ) : (
                            <div
                                className={`flex min-w-0 flex-col items-center gap-4 text-center ${index === 0 ? "order-1" : "order-3"}`}
                                key={`${team.label}-${index}`}
                            >
                                {teamContent}
                            </div>
                        )
                    );
                })}
                <div className="order-2 text-center">
                    <span className={`text-2xl font-black tabular-nums sm:text-4xl ${match.finished ? "text-white" : hasLiveScore ? "text-gray-400" : "tracking-widest text-gray-500"}`}>
                        {match.cancelled
                            ? "—"
                            : match.finished || hasLiveScore
                                ? `${match.team_1_score ?? "-"} : ${match.team_2_score ?? "-"}`
                                : "VS"}
                    </span>
                </div>
            </div>

            {match.finished && !match.cancelled ? (
                <section className="border-t border-white/10 px-4 py-5 sm:px-6">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                        Statystyki graczy
                    </h2>
                    {!match.faceit_match_id ? (
                        <p className="mt-3 text-sm text-gray-500">
                            Tabela statystyk jest dostępna dla zakończonych meczów FACEIT.
                        </p>
                    ) : leaderboardLoading ? (
                        <p className="mt-3 text-sm text-gray-400">
                            Ładowanie statystyk meczu...
                        </p>
                    ) : leaderboardError ? (
                        <p role="status" className="mt-3 text-sm text-red-300">
                            {leaderboardError}
                        </p>
                    ) : leaderboard.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-500">
                            Statystyki graczy nie są dostępne dla tego meczu.
                        </p>
                    ) : (
                        <div className="mt-4 grid min-w-0 gap-5">
                            <p className="text-xs text-gray-500">
                                Rating to szacunek w stylu HLTV, a nie oficjalny Rating 2.0.
                            </p>
                            {leaderboardLinkError && (
                                <p role="status" className="text-sm text-amber-300">
                                    {leaderboardLinkError}
                                </p>
                            )}
                            {leaderboardByTeam.map(({ team, players }, teamIndex) => (
                                <section
                                    key={team.id ?? team.label}
                                    aria-labelledby={`match-leaderboard-team-${teamIndex}`}
                                    className="min-w-0"
                                >
                                    <h3
                                        id={`match-leaderboard-team-${teamIndex}`}
                                        className="mb-2 text-sm font-semibold text-white"
                                    >
                                        {team.label}
                                    </h3>
                                    {players.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            Brak statystyk dla tej drużyny.
                                        </p>
                                    ) : (
                                        <div className="w-full min-w-0 overflow-x-auto">
                                            <table className="w-full min-w-[640px] text-left text-sm">
                                                <thead className="text-xs uppercase tracking-wide text-gray-500">
                                                    <tr className="border-b border-white/10">
                                                        <th scope="col" className="px-3 py-2 font-semibold">#</th>
                                                        <th scope="col" className="px-3 py-2 font-semibold">Gracz</th>
                                                        <th scope="col" className="px-3 py-2 text-right font-semibold">Zabójstwa</th>
                                                        <th scope="col" className="px-3 py-2 text-right font-semibold">Śmierci</th>
                                                        <th scope="col" className="px-3 py-2 text-right font-semibold">Asysty</th>
                                                        <th scope="col" className="px-3 py-2 text-right font-semibold">ADR</th>
                                                        <th scope="col" className="px-3 py-2 text-right font-semibold">HS%</th>
                                                        <th scope="col" className="px-3 py-2 text-right font-semibold">K/D</th>
                                                        <th scope="col" className="px-3 py-2 text-right font-semibold" title="Nieoficjalny szacunek w stylu HLTV">
                                                            Rating
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {players.map((player, index) => {
                                                        const headshotPercentage = player.kills > 0 &&
                                                            player.headshots != null
                                                            ? `${((player.headshots / player.kills) * 100).toFixed(0)}%`
                                                            : "—";
                                                        const killDeathRatio = player.kills != null &&
                                                            player.deaths != null
                                                            ? (player.deaths === 0
                                                                ? player.kills
                                                                : player.kills / player.deaths).toFixed(2)
                                                            : "—";

                                                        return (
                                                            <tr
                                                                key={player.playerId}
                                                                className="border-b border-white/[0.06] text-gray-300 last:border-0"
                                                            >
                                                                <td className="px-3 py-2.5 tabular-nums text-gray-500">
                                                                    {index + 1}
                                                                </td>
                                                                <th scope="row" className="px-3 py-2.5 font-medium">
                                                                    {player.profileId ? (
                                                                        <Link
                                                                            to="/player"
                                                                            state={{ id: player.profileId }}
                                                                            className="text-white transition-colors hover:text-red-300"
                                                                        >
                                                                            {player.playerName}
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="text-white">{player.playerName}</span>
                                                                    )}
                                                                </th>
                                                                <td className="px-3 py-2.5 text-right tabular-nums">{player.kills ?? "—"}</td>
                                                                <td className="px-3 py-2.5 text-right tabular-nums">{player.deaths ?? "—"}</td>
                                                                <td className="px-3 py-2.5 text-right tabular-nums">{player.assists ?? "—"}</td>
                                                                <td className="px-3 py-2.5 text-right tabular-nums">
                                                                    {player.adr != null ? player.adr.toFixed(1) : "—"}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right tabular-nums">{headshotPercentage}</td>
                                                                <td className="px-3 py-2.5 text-right tabular-nums">{killDeathRatio}</td>
                                                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-white">
                                                                    {player.ratingEstimate != null
                                                                        ? player.ratingEstimate.toFixed(2)
                                                                        : "—"}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            ))}
                        </div>
                    )}
                </section>
            ) : null}
        </article >
    );
};

export default Match;

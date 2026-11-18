import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import eseaIcon from "../assets/esea.png";
import redirectIcon from "../assets/redirect.svg";
import CoachBadge from "../components/CoachBadge";

const teamMatchSelect = `
    id,
    time,
    team_1_id,
    team_2_id,
    team_1_score,
    team_2_score,
    finished,
    cancelled,
    team_2_name,
    faceit_match_id,
    league:tournaments!matches_league_fkey(name),
    team_1:teams!matches_team_1_id_fkey(name, logo),
    team_2:teams!matches_team_2_id_fkey(name, logo)
`;

const formatTournamentDate = (date) => {
    const parsedDate = date ? new Date(date) : null;
    return parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleDateString("pl-PL")
        : "Data nieznana";
};

const loadTeamMatches = async (teamId) => {
    const [firstTeamMatches, secondTeamMatches] = await Promise.all([
        supabase
            .from("matches")
            .select(teamMatchSelect)
            .eq("team_1_id", teamId),
        supabase
            .from("matches")
            .select(teamMatchSelect)
            .eq("team_2_id", teamId),
    ]);

    const error = firstTeamMatches.error ?? secondTeamMatches.error;
    if (error) return { error };

    const uniqueMatches = new Map(
        [...(firstTeamMatches.data ?? []), ...(secondTeamMatches.data ?? [])]
            .map((match) => [match.id, match])
    );

    return {
        data: [...uniqueMatches.values()].sort(
            (first, second) => new Date(second.time ?? 0) - new Date(first.time ?? 0)
        ),
    };
};

const Team = () => {
    const location = useLocation();
    const teamId = location.state?.id;

    const [teams, setTeams] = useState([]);
    const [faceitTeam, setFaceitTeam] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState([]);
    const [matchesError, setMatchesError] = useState("");
    const [tournamentAchievements, setTournamentAchievements] = useState([]);
    const [tournamentAchievementsError, setTournamentAchievementsError] = useState("");

    useEffect(() => {
        let active = true;

        async function fetchTeams() {
            if (teamId == null) {
                setError("Nie wybrano drużyny.");
                setLoading(false);
                return;
            }

            setLoading(true);
            const [teamResult, matchesResult, achievementsResult] = await Promise.all([
                supabase.from("teams").select(`
                    id, 
                    name,
                    roster,
                    logo,
                    points,
                    player1,
                    player2,
                    player3,
                    player4,
                    player5,
                    faceit_id,
                    coach:players!teams_coach_id_fkey(
                        id,
                        name
                    )
                `).eq("id", teamId),
                loadTeamMatches(teamId),
                supabase
                    .from("tournament_achievements")
                    .select(`
                        id,
                        team_id,
                        team_name,
                        placement,
                        roster,
                        tournament:tournaments!inner(id, name, logo, starts)
                    `)
                    .eq("team_id", Number(teamId))
                    .order("created_at", { ascending: false }),
            ]);

            if (!active) return;

            if (teamResult.error) {
                console.error("Error loading team:", teamResult.error.message);
                setError(teamResult.error.message);
            } else {
                setTeams(teamResult.data ?? []);
                setError("");
            }

            if (matchesResult.error) {
                console.error("Error loading team matches:", matchesResult.error.message);
                setMatchesError("Nie udało się załadować meczów drużyny.");
            } else {
                setMatches(matchesResult.data ?? []);
                setMatchesError("");
            }

            if (achievementsResult.error) {
                console.error("Error loading team tournament achievements:", achievementsResult.error.message);
                setTournamentAchievementsError("Nie udało się załadować osiągnięć turniejowych.");
                setTournamentAchievements([]);
            } else {
                setTournamentAchievements(achievementsResult.data ?? []);
                setTournamentAchievementsError("");
            }

            setLoading(false);
        }

        fetchTeams();

        return () => {
            active = false;
        };
    }, [teamId]);


    const faceitId = teams?.[0]?.faceit_id;

    useEffect(() => {
        if (!faceitId) {
            return;
        }

        let active = true;
        async function getTeamInfo() {
            try {
                const { data, error } = await supabase.functions.invoke(
                    "faceit-team-league",
                    {
                        body: { action: "profile", faceitId },
                    }
                );

                if (error) {
                    console.error("Edge Function error:", error);

                    if (error.context) {
                        try {
                            const details = await error.context.json();
                            console.error("Edge Function response:", details);
                        } catch {
                            console.error("Could not read Edge Function response body.");
                        }
                    }

                    throw error;
                }

                if (data?.error) {
                    throw new Error(data.error);
                }

                if (active) {
                    setFaceitTeam({ faceitId, data });
                }
            } catch (error) {
                if (active) {
                    console.error("FACEIT request failed:", error);
                }
            }
        }

        getTeamInfo();

        return () => {
            active = false;
        };
    }, [faceitId, teamId]);

    useEffect(() => {
        if (teamId == null) return;

        let active = true;

        const refreshTeamMatches = async () => {
            const matchesResult = await loadTeamMatches(teamId);
            if (!active) return;

            if (matchesResult.error) {
                console.error("Error refreshing team matches:", matchesResult.error.message);
                setMatchesError("Nie udało się załadować meczów drużyny.");
            } else {
                setMatches(matchesResult.data ?? []);
                setMatchesError("");
            }
        };

        const refreshInterval = window.setInterval(() => {
            void refreshTeamMatches();
        }, 15 * 1000);

        return () => {
            active = false;
            window.clearInterval(refreshInterval);
        };
    }, [teamId]);

    const currentFaceitTeam = faceitTeam && faceitTeam.faceitId === faceitId
        ? faceitTeam.data
        : {};
    const wins = Number(currentFaceitTeam?.payload?.season_standing?.wins);
    const losses = Number(currentFaceitTeam?.payload?.season_standing?.losses);

    const totalMatches = wins + losses;

    const winrate =
        Number.isFinite(wins) &&
            Number.isFinite(losses) &&
            wins >= 0 &&
            losses >= 0 &&
            totalMatches > 0
            ? ((wins / totalMatches) * 100).toFixed(1)
            : null;


    const team = teams[0];
    const teamAchievements = tournamentAchievements.filter(
        (achievement) => String(achievement.team_id) === String(team?.id)
    );
    const profileUrl = supabase.storage.from("icons").getPublicUrl("profile-default.svg").data.publicUrl;
    const logoUrl = team?.logo
        ? supabase.storage.from("logos").getPublicUrl(team.logo).data.publicUrl
        : null;
    const roster = team?.roster ?? [];
    const coachInRoster = team?.coach && Array.from({ length: 5 }, (_, index) =>
        team[`player${index + 1}`]
    ).some((playerId) => String(playerId) === String(team.coach.id));

    if (loading) {
        return <p className="py-8 text-center text-sm text-gray-400">Ładowanie profilu drużyny...</p>;
    }

    if (error || !team) {
        return (
            <p role="status" className="my-6 border border-white/10 p-4 text-sm text-red-300">
                {error || "Nie znaleziono drużyny."}
            </p>
        );
    }

    return (
        <section className="min-w-0">

            <div className="grid min-w-0 gap-4 lg:grid-cols-2 bg-bg border border-white/10">
                <section className="min-w-0">
                    <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Profil
                    </h2>
                    <div className="flex flex-col items-center px-4 py-7">
                        {logoUrl ? (
                            <img src={logoUrl} alt={`${team.name} logo`} className="h-24 w-24 object-contain" />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-bg-light text-3xl font-bold text-gray-500">
                                {team.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                        )}
                        <h2 className="mt-4 break-words text-center text-xl font-bold text-white">{team.name}</h2>
                        <p className="mt-2 text-sm text-gray-400">
                            <span className="font-semibold tabular-nums text-white">{team.points ?? 0}</span> pkt
                        </p>
                    </div>
                </section>

                <section className="min-w-0">
                    <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Skład drużyny
                    </h2>
                    {team.coach || roster.length ? (
                        <div className="space-y-1">
                            {roster.map((player, index) => {
                                const playerId = team[`player${index + 1}`];

                                return (
                                    <Link
                                        to="/player"
                                        state={{ id: playerId }}
                                        key={`${playerId ?? player}-${index}`}
                                        className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                                    >
                                        <img src={profileUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-bg-light p-1.5 opacity-80" />
                                        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                                            <span className="truncate text-sm font-medium text-white">{player}</span>
                                            {String(playerId) === String(team.coach?.id) && <CoachBadge />}
                                        </span>
                                        <span className="text-xs text-gray-600">{String(index + 1).padStart(2, "0")}</span>
                                    </Link>
                                );
                            })}
                            {team.coach && !coachInRoster && (
                                <Link
                                    to="/player"
                                    state={{ id: team.coach.id }}
                                    className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                                >
                                    <img src={profileUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-bg-light p-1.5 opacity-80" />
                                    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                                        <span className="truncate text-sm font-medium text-white">{team.coach.name}</span>
                                        <CoachBadge />
                                    </span>
                                    <span className="text-xs text-gray-600">C</span>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <p className="px-4 py-5 text-sm text-gray-500">Brak graczy w składzie.</p>
                    )}
                </section>

                <section className="min-w-0 lg:col-span-2">
                    <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Osiągnięcia
                    </h2>
                    {tournamentAchievementsError ? (
                        <p role="status" className="px-4 py-5 text-sm text-red-300">
                            {tournamentAchievementsError}
                        </p>
                    ) : teamAchievements.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-gray-500">
                            Brak zapisanych osiągnięć.
                        </p>
                    ) : (
                        <ul className="grid gap-3 p-3 sm:grid-cols-2">
                            {teamAchievements.map((achievement) => {
                                const tournament = achievement.tournament;
                                const logoUrl = tournament?.logo
                                    ? supabase.storage.from("tournaments").getPublicUrl(tournament.logo).data.publicUrl
                                    : null;
                                const rosterSnapshot = Array.isArray(achievement.roster)
                                    ? achievement.roster
                                    : [];

                                return (
                                    <li
                                        key={achievement.id}
                                        className="min-w-0 border border-white/10 bg-black/10 p-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 object-contain" />
                                            ) : (
                                                <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-bg-light text-lg font-bold text-gray-500">
                                                    {tournament?.name?.charAt(0)?.toUpperCase() ?? "?"}
                                                </span>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <h3 className="break-words text-sm font-semibold text-white">
                                                    {tournament?.name ?? "Usunięty turniej"}
                                                </h3>
                                            </div>
                                            {achievement.placement && (
                                                <span className="shrink-0 px-2 py-1 text-lg font-bold">
                                                    {achievement.placement}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 pt-3">
                                            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                roster
                                            </h4>
                                            {rosterSnapshot.length > 0 ? (
                                                <ul className="flex flex-wrap gap-1.5">
                                                    {rosterSnapshot.map((player, index) => {
                                                        const name = player?.name ?? "Nieznany gracz";
                                                        return (
                                                            <li key={`${player?.id ?? name}-${index}`}>
                                                                {player?.id != null ? (
                                                                    <Link
                                                                        to="/player"
                                                                        state={{ id: player.id }}
                                                                        className="inline-flex max-w-full bg-white/5 px-2 py-1 text-xs text-gray-300 transition-colors hover:text-white"
                                                                    >
                                                                        {name}
                                                                    </Link>
                                                                ) : (
                                                                    <span className="inline-flex max-w-full rounded bg-white/5 px-2 py-1 text-xs text-gray-400">
                                                                        {name}
                                                                    </span>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-gray-500">
                                                    Brak zapisanego składu dla tego osiągnięcia.
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section className="min-w-0 overflow-hidden lg:col-span-2">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
                        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                            <span className="flex h-7 w-7 items-center justify-center p-1">
                                <img src={eseaIcon} alt="" aria-hidden="true" className="h-full w-full object-contain" />
                            </span>
                            ESEA
                        </h2>
                        {faceitId && (
                            <a
                                href={`https://faceit.com/pl/teams/${faceitId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-primary hover:text-white"
                            >
                                Profil
                                <img src={redirectIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-70" />
                            </a>
                        )}
                    </div>
                    {currentFaceitTeam?.payload?.season_standing ? (
                        <>
                            <div className="grid grid-cols-3 gap-2 p-3 sm:gap-4 sm:p-5">
                                <div className="flex min-w-0 flex-col items-center justify-center px-2 py-4 sm:py-5">
                                    <span className="text-3xl font-bold tabular-nums text-success sm:text-4xl">
                                        {currentFaceitTeam.payload.season_standing.wins ?? "-"}
                                    </span>
                                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
                                        Wygrane
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-col items-center justify-center px-2 py-4 text-center sm:py-5">
                                    <span className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
                                        {currentFaceitTeam.payload.season_standing.placement?.left
                                            ? `#${currentFaceitTeam.payload.season_standing.placement.left}`
                                            : "-"}
                                    </span>
                                    <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">
                                        {[
                                            currentFaceitTeam.payload.season_standing.division_name,
                                            currentFaceitTeam.payload.season_standing.conference_name,
                                        ].filter(Boolean).join(" ") || "Pozycja"}
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-col items-center justify-center px-2 py-4 sm:py-5">
                                    <span className="text-3xl font-bold tabular-nums text-danger sm:text-4xl">
                                        {currentFaceitTeam.payload.season_standing.losses ?? "-"}
                                    </span>
                                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
                                        Przegrane
                                    </span>
                                </div>
                            </div>
                            <div className="px-4 pb-3">
                                <div className="mb-2 flex items-center justify-center gap-3 text-md">
                                    <span className="font-medium text-gray-500">Winrate</span>
                                    <span className="font-semibold tabular-nums text-gray-300">
                                        {winrate != null ? `${winrate}%` : "Brak danych"}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="px-4 py-6 text-center text-sm font-medium text-gray-500">
                            Brak danych ESEA dla tej drużyny.
                        </p>
                    )}
                </section>
                <section className="min-w-0 lg:col-span-2">
                    <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Mecze
                    </h2>
                    {matchesError ? (
                        <p role="status" className="px-4 py-5 text-sm text-red-300">{matchesError}</p>
                    ) : matches.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-gray-500">Brak dostępnych meczów drużyny.</p>
                    ) : (
                        <div className="space-y-1">
                            {matches.map((match) => {
                                const hasLiveScore = !match.finished && !match.cancelled &&
                                    (match.team_1_score != null || match.team_2_score != null);
                                const isTeam1 = String(match.team_1_id) === String(teamId);
                                const ownScore = isTeam1 ? match.team_1_score : match.team_2_score;
                                const opponentScore = isTeam1 ? match.team_2_score : match.team_1_score;
                                const hasFinalScore = match.finished && !match.cancelled &&
                                    ownScore != null && opponentScore != null;
                                const result = hasFinalScore
                                    ? ownScore > opponentScore
                                        ? "W"
                                        : ownScore < opponentScore
                                            ? "L"
                                            : "D"
                                    : null;
                                const firstTeam = isTeam1 ? match.team_1 : match.team_2;
                                const secondTeam = isTeam1 ? match.team_2 : match.team_1;
                                const firstTeamScore = isTeam1 ? match.team_1_score : match.team_2_score;
                                const secondTeamScore = isTeam1 ? match.team_2_score : match.team_1_score;
                                const firstTeamName = firstTeam?.name ??
                                    (isTeam1 ? "Drużyna 1" : match.team_2_name ?? "Drużyna 2");
                                const secondTeamName = secondTeam?.name ??
                                    (isTeam1 ? match.team_2_name ?? "Drużyna 2" : "Drużyna 1");

                                return (
                                    <Link
                                        to="/match"
                                        state={{ id: match.id }}
                                        key={match.id}
                                        className="flex min-w-0 flex-col gap-2 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        {result ? (
                                            <div className={`flex h-9 min-w-9 items-center justify-center px-2 text-xs font-bold tabular-nums ${result === "W"
                                                ? "bg-emerald-500/15 text-emerald-300"
                                                : result === "L"
                                                    ? "bg-red-500/10 text-red-300"
                                                    : "bg-gray-500/15 text-gray-300"
                                                }`}>
                                                {result}
                                            </div>
                                        ) : !match.finished && !match.cancelled ? (
                                            <div className="flex h-9 min-w-9 items-center justify-center bg-gray-500/15 px-2 text-xs font-bold tabular-nums text-gray-300">
                                                ?
                                            </div>
                                        ) : null}
                                        <div className="min-w-0">
                                            <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                                                <span className="min-w-0 truncate">{firstTeamName}</span>
                                                <span className={`shrink-0 text-xs font-bold tabular-nums text-gray-400`}>
                                                    {match.cancelled
                                                        ? "-"
                                                        : match.finished || hasLiveScore
                                                            ? `${firstTeamScore ?? "-"} : ${secondTeamScore ?? "-"}`
                                                            : "VS"}
                                                </span>
                                                <span className="min-w-0 truncate">{secondTeamName}</span>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {hasLiveScore && (
                                                <span className="text-xs font-bold uppercase tracking-wide text-red-500">
                                                    LIVE
                                                </span>
                                            )}
                                            {match.cancelled && (
                                                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                                    Anulowany
                                                </span>
                                            )}
                                            <p className="truncate text-xs font-medium text-gray-500">
                                                {match.league?.name ?? (match.faceit_match_id ? "ESEA" : "Mecz")}
                                            </p>
                                            <time className="text-xs text-gray-500">
                                                {match.time
                                                    ? new Date(match.time).toLocaleString("pl-PL", {
                                                        dateStyle: "medium",
                                                        timeStyle: "short",
                                                    })
                                                    : "Termin do ustalenia"}
                                            </time>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
};

export default Team;

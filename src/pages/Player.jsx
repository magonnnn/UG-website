import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import redirectIcon from "../assets/redirect.svg";
import faceitLogo from "../assets/faceit-logo.webp"
import CoachBadge from "../components/CoachBadge";

const StatRing = ({ label, value, detail, color }) => {
    const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex items-center gap-3">
            <svg
                viewBox="0 0 84 84"
                className="h-[84px] w-[84px] shrink-0"
                role="img"
                aria-label={`${label}: ${safeValue.toFixed(1)}%`}
            >
                <circle cx="42" cy="42" r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="7" />
                <circle
                    cx="42"
                    cy="42"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference * safeValue / 100} ${circumference}`}
                    transform="rotate(-90 42 42)"
                />
                <text x="42" y="46" textAnchor="middle" className="fill-white text-[13px] font-semibold">
                    {safeValue.toFixed(0)}%
                </text>
            </svg>
            <div className="min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{detail}</p>
            </div>
        </div>
    );
};

const Player = () => {
    const location = useLocation();
    const id = location.state?.id;
    const [player, setPlayer] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [transfer, setTransfer] = useState({});
    const [teams, setTeams] = useState([]);
    const [faceitPlayer, setFaceitPlayer] = useState({});
    const [recentStats, setRecentStats] = useState(null);
    const [recentStatsLoading, setRecentStatsLoading] = useState(false);
    const [recentStatsError, setRecentStatsError] = useState("");
    const [websiteMatches, setWebsiteMatches] = useState([]);
    const [websiteMatchesLoading, setWebsiteMatchesLoading] = useState(false);
    const [websiteMatchesError, setWebsiteMatchesError] = useState("");

    useEffect(() => {
        let active = true;

        async function fetchUser() {
            if (id == null) {
                setError("Nie podano ID gracza.");
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from("players")
                .select(`
                    id,
                    name,
                    team_history,
                    created_at,
                    steam_profile,
                    steamid64,
                    coach_teams:teams!teams_coach_id_fkey(
                        id,
                        name,
                        logo
                    ),
                    current_team:teams!players_current_team_fkey (
                        id,
                        name,
                        logo
                    )
                `)
                .eq("id", id)
                .single();

            if (!active) return;

            if (error) {
                setError(error.message);
            } else {
                setPlayer(data ?? {});
                setError("");
            }

            setLoading(false);
        }

        fetchUser();
        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        let active = true;
        const steamid64 = player.steamid64;

        async function fetchFaceitPlayer() {
            setFaceitPlayer({});
            setRecentStats(null);
            setRecentStatsError("");
            setWebsiteMatches([]);
            setWebsiteMatchesError("");
            setWebsiteMatchesLoading(false);
            setRecentStatsLoading(Boolean(steamid64));
            if (!steamid64) return;

            try {
                const { data, error } = await supabase.functions.invoke("faceit-player-stats", {
                    body: { steamid64 },
                });

                if (error) {
                    throw error;
                }

                if (active) {
                    setFaceitPlayer({ steamid64, profile: data.profile });
                    setRecentStats(data.recentStats);
                    setRecentStatsError("");
                }
            } catch (error) {
                if (active) {
                    console.error("FACEIT player stats error:", error);
                    setRecentStatsError("Nie udało się pobrać statystyk FACEIT.");
                }
            } finally {
                if (active) {
                    setRecentStatsLoading(false);
                }
            }
        }
        fetchFaceitPlayer();

        return () => {
            active = false;
        };
    }, [player.steamid64]);

    useEffect(() => {
        let active = true;
        const teamIds = [...new Set([
            ...(Array.isArray(player.team_history) ? player.team_history : []),
            player.current_team?.id,
        ].filter((teamId) => teamId != null).map(Number))].filter(Number.isInteger);

        const loadWebsiteMatches = async () => {
            if (
                id == null ||
                player.id == null ||
                String(player.id) !== String(id) ||
                !player.steamid64 ||
                teamIds.length === 0
            ) {
                setWebsiteMatches([]);
                setWebsiteMatchesError("");
                setWebsiteMatchesLoading(false);
                return;
            }

            setWebsiteMatchesLoading(true);
            setWebsiteMatchesError("");

            try {
                const matchSelect = `
                    id,
                    time,
                    faceit_match_id,
                    team_1_score,
                    team_2_score,
                    league:tournaments!matches_league_fkey(name),
                    team_1:teams!matches_team_1_id_fkey(id, name, faceit_id),
                    team_2:teams!matches_team_2_id_fkey(id, name, faceit_id)
                `;
                const loadTeamMatches = async (teamColumn) => {
                    const matches = [];
                    const pageSize = 1000;

                    for (let offset = 0; ; offset += pageSize) {
                        const { data, error } = await supabase
                            .from("matches")
                            .select(matchSelect)
                            .in(teamColumn, teamIds)
                            .eq("finished", true)
                            .eq("cancelled", false)
                            .not("faceit_match_id", "is", null)
                            .order("time", { ascending: false })
                            .order("id", { ascending: false })
                            .range(offset, offset + pageSize - 1);

                        if (error) throw error;
                        const page = data ?? [];
                        matches.push(...page);
                        if (page.length < pageSize) return matches;
                    }
                };
                const [team1Matches, team2Matches] = await Promise.all([
                    loadTeamMatches("team_1_id"),
                    loadTeamMatches("team_2_id"),
                ]);

                const siteMatchesById = new Map(
                    [...team1Matches, ...team2Matches]
                        .map((match) => [match.id, match]),
                );
                const siteMatches = [...siteMatchesById.values()].sort(
                    (first, second) =>
                        new Date(second.time ?? 0) - new Date(first.time ?? 0),
                );
                const siteMatchIds = [...new Set(
                    siteMatches.map((match) => match.faceit_match_id).filter(Boolean),
                )];

                if (siteMatchIds.length === 0) {
                    if (active) setWebsiteMatches([]);
                    return;
                }

                const statsByMatchId = new Map();
                const statsBatchSize = 100;
                for (let index = 0; index < siteMatchIds.length; index += statsBatchSize) {
                    const { data: statsData, error: statsError } = await supabase.functions.invoke(
                        "faceit-player-stats",
                        {
                            body: {
                                steamid64: player.steamid64,
                                siteMatchIds: siteMatchIds.slice(index, index + statsBatchSize),
                            },
                        },
                    );

                    if (statsError) throw statsError;
                    if (!Array.isArray(statsData?.matchStats)) {
                        throw new Error("FACEIT website match stats response is invalid.");
                    }

                    statsData.matchStats.forEach((stats) => {
                        statsByMatchId.set(stats.matchId, stats);
                    });
                }

                const matchesWithStats = siteMatches
                    .map((match) => ({
                        ...match,
                        stats: statsByMatchId.get(match.faceit_match_id),
                    }))
                    .filter((match) => match.stats);

                if (active) setWebsiteMatches(matchesWithStats);
            } catch (loadError) {
                if (!active) return;
                console.error("Error loading player's website matches:", loadError);
                setWebsiteMatchesError("Nie udało się załadować meczów rozegranych na stronie.");
            } finally {
                if (active) setWebsiteMatchesLoading(false);
            }
        };

        void loadWebsiteMatches();

        return () => {
            active = false;
        };
    }, [id, player.current_team?.id, player.id, player.steamid64, player.team_history]);

    useEffect(() => {
        async function fetchTransfer() {
            if (id == null) {
                setTransfer({});
                return;
            }

            const { data, error } = await supabase
                .from("transfers")
                .select("created_at")
                .eq("player_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                setError(error.message);
            } else {
                setTransfer(data ?? {});
            }
        }

        fetchTransfer();
    }, [id]);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase.from("teams").select("*");

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
                setError("");
            }
        }

        fetchTeams();
    }, []);

    const teamHistory = (player.team_history ?? [])
        .map((teamId) => teams.find((team) => team.id === Number(teamId)))
        .filter(Boolean);

    const profileTeams = [
        player.current_team,
        ...(player.coach_teams ?? []),
    ].filter((team, index, allTeams) =>
        team && allTeams.findIndex(
            (item) => item && String(item.id) === String(team.id)
        ) === index
    );
    const profileTeam = profileTeams[0];
    const profileUrl = supabase.storage.from("icons").getPublicUrl("profile-default.svg").data.publicUrl;
    const teamLogo = profileTeam?.logo
        ? supabase.storage.from("logos").getPublicUrl(profileTeam.logo).data.publicUrl
        : null;
    const joinedAt = transfer.created_at ?? player.created_at;
    const faceitUrl = faceitPlayer.profile?.faceit_url?.replace("{lang}", "pl");
    const recentMatchHistory = (recentStats?.matchHistory ?? []).slice().reverse();
    const recentWins = recentMatchHistory.filter((match) => match.won).length;
    const recentLosses = recentMatchHistory.length - recentWins;
    const websiteMatchHistory = websiteMatches.map((match) => {
        const stats = match.stats;
        const faceitTeamIndex = [
            match.team_1?.faceit_id,
            match.team_2?.faceit_id,
        ].findIndex((faceitId) =>
            faceitId != null && String(faceitId) === String(stats?.teamId)
        );
        const playerTeamIndex = faceitTeamIndex >= 0
            ? faceitTeamIndex
            : stats?.teamIndex;
        const ownScore = playerTeamIndex === 0
            ? match.team_1_score
            : playerTeamIndex === 1
                ? match.team_2_score
                : null;
        const opponentScore = playerTeamIndex === 0
            ? match.team_2_score
            : playerTeamIndex === 1
                ? match.team_1_score
                : null;

        return {
            ...match,
            stats,
            opponent: playerTeamIndex === 0
                ? match.team_2?.name
                : playerTeamIndex === 1
                    ? match.team_1?.name
                    : null,
            score: ownScore != null && opponentScore != null
                ? `${ownScore} : ${opponentScore}`
                : "—",
        };
    }).filter((match) => match.stats);
    const websiteTotals = websiteMatchHistory.reduce((totals, match) => ({
        kills: totals.kills + (match.stats.kills ?? 0),
        deaths: totals.deaths + (match.stats.deaths ?? 0),
        assists: totals.assists + (match.stats.assists ?? 0),
        headshots: totals.headshots + (match.stats.headshots ?? 0),
        rounds: totals.rounds + (match.stats.rounds ?? 0),
        adrDamage: totals.adrDamage + (match.stats.adr ?? 0) * (match.stats.rounds ?? 0),
        adrRounds: totals.adrRounds + (match.stats.adr != null ? match.stats.rounds ?? 0 : 0),
        wins: totals.wins + (match.stats.won ? 1 : 0),
        ratingTotal: totals.ratingTotal +
            (match.stats.ratingEstimate ?? 0) * (match.stats.rounds ?? 0),
        ratingRounds: totals.ratingRounds +
            (match.stats.ratingEstimate != null ? match.stats.rounds ?? 0 : 0),
    }), {
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        rounds: 0,
        adrDamage: 0,
        adrRounds: 0,
        wins: 0,
        ratingTotal: 0,
        ratingRounds: 0,
    });
    const chartMax = Math.max(
        1,
        ...recentMatchHistory.flatMap((match) => [match.kills, match.deaths])
    );
    const chartPoints = recentMatchHistory.map((match, index) => {
        const x = recentMatchHistory.length > 1
            ? 40 + (index * 520) / (recentMatchHistory.length - 1)
            : 300;

        return {
            ...match,
            x,
            killsY: 166 - (match.kills / chartMax) * 132,
            deathsY: 166 - (match.deaths / chartMax) * 132,
        };
    });
    const averageKillsY = 166 - ((recentStats?.averageKills ?? 0) / chartMax) * 132;

    if (loading) {
        return <p className="py-8 text-center text-sm text-gray-400">Ładowanie profilu gracza...</p>;
    }

    if (error || !player.name) {
        return (
            <p role="status" className="my-6 border border-white/10 p-4 text-sm text-red-300">
                {error || "Nie znaleziono gracza."}
            </p>
        );
    }

    return (
        <section className="min-w-0">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]  bg-bg border border-white/10">
                <section className="min-w-0">
                    <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Profil
                    </h2>
                    <div className="flex flex-col items-center px-4 py-6">
                        {profileTeam ? (
                            <Link to="/team" state={{ id: profileTeam.id }} aria-label={`Profil drużyny ${profileTeam.name}`}>
                                {teamLogo ? (
                                    <img src={teamLogo} alt="" className="h-24 w-24 object-contain" />
                                ) : (
                                    <img src={profileUrl} alt="" className="h-24 w-24 rounded-full bg-bg-light p-5 opacity-70" />
                                )}
                            </Link>
                        ) : (
                            <img src={profileUrl} alt="" className="h-24 w-24 rounded-full bg-bg-light p-5 opacity-70" />
                        )}
                        <h2 className="mt-4 flex max-w-full flex-col items-center gap-1 break-words text-center text-xl font-bold text-white">
                            {player.name}
                            {player.coach_teams?.length > 0 && <CoachBadge />}
                        </h2>
                    </div>
                    <dl className="space-y-2 px-4 pb-4">
                        <div className="flex items-center justify-between gap-4 py-3">
                            <dt className="text-sm text-gray-500">{profileTeams.length > 1 ? "Drużyny" : "Drużyna"}</dt>
                            <dd className="flex min-w-0 flex-col items-end text-right text-sm font-medium text-white">
                                {profileTeams.length ? profileTeams.map((team) => (
                                    <Link
                                        key={team.id}
                                        to="/team"
                                        state={{ id: team.id }}
                                        className="hover:text-red-300"
                                    >
                                        {team.name}
                                    </Link>
                                )) : "Brak"}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-3">
                            <dt className="text-sm text-gray-500">W drużynie od</dt>
                            <dd className="text-right text-sm text-white">
                                {joinedAt ? new Date(joinedAt).toLocaleDateString("pl-PL") : "—"}
                            </dd>
                        </div>
                        {player.steam_profile && (
                            <div className="flex items-center justify-between gap-4 py-3">
                                <dt className="text-sm text-gray-500">
                                    Steam{faceitPlayer.steamid64 === player.steamid64 && faceitPlayer.profile?.games?.cs2?.faceit_elo
                                        ? ``
                                        : ""}
                                </dt>
                                <dd>
                                    <a
                                        href={player.steam_profile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-semibold text-red-300 hover:text-white"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Profil
                                            <img src={redirectIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-70" />
                                        </span>
                                    </a>
                                </dd>
                            </div>
                        )}
                        {faceitPlayer.profile && (
                            <div className="flex items-center justify-between gap-4 py-3">
                                <dt className="text-sm text-gray-500">
                                    ELO
                                </dt>
                                <dd className="flex flex-row items-center justify-center">

                                    {faceitUrl && (
                                        <a href={faceitUrl} target="_blank" rel="noopener noreferrer">
                                            <img src={faceitLogo} alt="faceit logo" className="w-4 h-4 me-2 hover:opacity-70 transform-colors" />
                                        </a>
                                    )}
                                    {faceitPlayer.profile?.games?.cs2?.faceit_elo && (
                                        `${faceitPlayer.profile?.games?.cs2?.faceit_elo}`
                                    )}
                                </dd>
                            </div>
                        )}
                    </dl>
                    <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Historia drużyn
                    </h2>
                    {teamHistory.length > 0 ? (
                        <div className="space-y-1">
                            {teamHistory.map((team, index) => {
                                const logoUrl = team.logo
                                    ? supabase.storage.from("logos").getPublicUrl(team.logo).data.publicUrl
                                    : null;

                                return (
                                    <Link
                                        to="/team"
                                        state={{ id: team.id }}
                                        key={`${team.id}-${index}`}
                                        className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                                    >
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 object-contain" />
                                        ) : (
                                            <span className="h-8 w-8 shrink-0 rounded-full bg-bg-light" />
                                        )}
                                        <span className="min-w-0 truncate text-sm font-medium text-white">{team.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="px-4 py-5 text-sm text-gray-500">Brak historii drużyn.</p>
                    )}
                </section>


                <div className="grid min-w-0 content-start gap-4">
                    <section className="min-w-0">
                        <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                            Statystyki FACEIT
                        </h2>
                        {recentStatsLoading ? (
                            <p className="px-4 py-5 text-sm text-gray-500">Pobieranie statystyk...</p>
                        ) : recentStatsError ? (
                            <p role="status" className="px-4 py-5 text-sm text-red-300">{recentStatsError}</p>
                        ) : recentStats?.matches > 0 ? (
                            <>
                                <dl className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                                    {[
                                        ["Zabójstwa / mecz", recentStats.averageKills.toFixed(1)],
                                        ["Śmierci / mecz", recentStats.averageDeaths.toFixed(1)],
                                        ["Asysty / mecz", recentStats.averageAssists.toFixed(1)],
                                        ["K/D", recentStats.killDeathRatio.toFixed(2)],
                                        ["HS", `${recentStats.headshotPercentage.toFixed(1)}%`],
                                        ["Wygrane", `${recentStats.winPercentage.toFixed(1)}%`],
                                        [
                                            "Rating (szacunek)",
                                            recentStats.ratingEstimate != null
                                                ? recentStats.ratingEstimate.toFixed(2)
                                                : "—",
                                        ],
                                    ].map(([label, value]) => (
                                        <div key={label} className="bg-white/[0.03] px-3 py-3">
                                            <dt className="text-xs text-gray-500">{label}</dt>
                                            <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                                {recentMatchHistory.length > 0 && (
                                    <div className="space-y-4 px-4 pb-4">
                                        <section className="border border-white/10 bg-black/10 p-4">
                                            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white">Forma z ostatnich meczów</h3>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {recentMatchHistory.length} ostatnich spotkań FACEIT
                                                    </p>
                                                </div>
                                                <p className="text-xs tabular-nums text-gray-400">
                                                    {recentWins}W <span className="text-gray-600">/</span> {recentLosses}L
                                                </p>
                                            </div>

                                            <div className="overflow-hidden">
                                                <svg
                                                    viewBox="0 0 600 220"
                                                    className="h-auto w-full"
                                                    role="img"
                                                    aria-label="Wykres zabójstw i śmierci na mecz"
                                                >
                                                    {[0, 1, 2, 3].map((step) => {
                                                        const y = 166 - (step * 132) / 3;
                                                        const value = Math.round((step * chartMax) / 3);

                                                        return (
                                                            <g key={step}>
                                                                <line x1="40" y1={y} x2="560" y2={y} stroke="rgb(255 255 255 / 0.08)" />
                                                                <text x="30" y={y + 3} textAnchor="end" className="fill-gray-600 text-[10px]">
                                                                    {value}
                                                                </text>
                                                            </g>
                                                        );
                                                    })}
                                                    <line
                                                        x1="40"
                                                        y1={averageKillsY}
                                                        x2="560"
                                                        y2={averageKillsY}
                                                        stroke="#ef4444"
                                                        strokeDasharray="4 5"
                                                        opacity="0.55"
                                                    />
                                                    <polyline
                                                        points={chartPoints.map(({ x, killsY }) => `${x},${killsY}`).join(" ")}
                                                        fill="none"
                                                        stroke="#ef4444"
                                                        strokeWidth="2.5"
                                                        strokeLinejoin="round"
                                                        strokeLinecap="round"
                                                    />
                                                    <polyline
                                                        points={chartPoints.map(({ x, deathsY }) => `${x},${deathsY}`).join(" ")}
                                                        fill="none"
                                                        stroke="#9ca3af"
                                                        strokeWidth="2"
                                                        strokeLinejoin="round"
                                                        strokeLinecap="round"
                                                    />
                                                    {chartPoints.map((point, index) => (
                                                        <g key={point.matchId}>
                                                            <circle cx={point.x} cy={point.killsY} r="3" fill="#ef4444">
                                                                <title>{`Mecz ${index + 1}: ${point.kills} zabójstw`}</title>
                                                            </circle>
                                                            <circle cx={point.x} cy={point.deathsY} r="2.5" fill="#9ca3af">
                                                                <title>{`Mecz ${index + 1}: ${point.deaths} śmierci`}</title>
                                                            </circle>
                                                        </g>
                                                    ))}
                                                    <text x="40" y="199" className="fill-gray-600 text-[10px]">Starsze</text>
                                                    <text x="560" y="199" textAnchor="end" className="fill-gray-600 text-[10px]">Nowsze</text>
                                                </svg>
                                                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-gray-400">
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="h-0.5 w-3 bg-red-500" /> Zabójstwa
                                                    </span>
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="h-0.5 w-3 bg-gray-400" /> Śmierci
                                                    </span>
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="w-3 border-t border-dashed border-red-400" /> Śr. zabójstw
                                                    </span>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="grid gap-4 border border-white/10 bg-black/10 p-4 sm:grid-cols-2">
                                            <StatRing
                                                label="Wygrane"
                                                value={recentStats.winPercentage}
                                                detail={`${recentWins} wygranych z ${recentStats.matches} meczów`}
                                                color="#ef4444"
                                            />
                                            <StatRing
                                                label="Celność strzałów w głowę"
                                                value={recentStats.headshotPercentage}
                                                detail="Udział headshotów we wszystkich zabójstwach"
                                                color="#d1d5db"
                                            />
                                        </section>

                                        <section className="border border-white/10 bg-black/10 p-4">
                                            <h3 className="text-sm font-semibold text-white">Ostatnie wyniki</h3>
                                            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Wynik każdego z ostatnich meczów">
                                                {recentMatchHistory.slice(-10).reverse().map((match, index) => (
                                                    <span
                                                        key={match.matchId}
                                                        title={`${match.won ? "Wygrana" : "Przegrana"} · ${match.kills}/${match.deaths}/${match.assists} K/D/A`}
                                                        aria-label={`Mecz ${index + 1}: ${match.won ? "wygrana" : "przegrana"}, ${match.kills} zabójstw, ${match.deaths} śmierci, ${match.assists} asyst`}
                                                        className={`flex h-9 min-w-9 items-center justify-center px-2 text-xs font-bold tabular-nums ${match.won
                                                            ? "bg-emerald-500/15 text-emerald-300"
                                                            : "bg-red-500/10 text-red-300"
                                                            }`}
                                                    >
                                                        {match.won ? "W" : "L"}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="mt-3 text-xs text-gray-500">
                                                Ostatnie 10: K / Ś / A - najedź na wynik, aby zobaczyć szczegóły.
                                            </p>
                                        </section>
                                        <section className="min-w-0 border border-white/10 bg-bg">
                                            <h2 className="border-b border-white/10 px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                                Mecze i statystyki na stronie
                                            </h2>
                                            {websiteMatchesLoading ? (
                                                <p className="px-4 py-5 text-sm text-gray-500">
                                                    Szukanie meczów na stronie...
                                                </p>
                                            ) : websiteMatchesError ? (
                                                <p role="status" className="px-4 py-5 text-sm text-red-300">
                                                    {websiteMatchesError}
                                                </p>
                                            ) : websiteMatchHistory.length === 0 ? (
                                                <p className="px-4 py-5 text-sm text-gray-500">
                                                    Brak zakończonych meczów tego gracza zarejestrowanych na stronie.
                                                </p>
                                            ) : (
                                                <>
                                                    <dl className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                                                        {[
                                                            ["Mecze", websiteMatchHistory.length],
                                                            [
                                                                "Winrate",
                                                                `${((websiteTotals.wins / websiteMatchHistory.length) * 100).toFixed(1)}%`,
                                                            ],
                                                            [
                                                                "Zabójstwa / mecz",
                                                                (websiteTotals.kills / websiteMatchHistory.length).toFixed(1),
                                                            ],
                                                            [
                                                                "K/D",
                                                                websiteTotals.deaths > 0
                                                                    ? (websiteTotals.kills / websiteTotals.deaths).toFixed(2)
                                                                    : websiteTotals.kills.toFixed(2),
                                                            ],
                                                            [
                                                                "KPR",
                                                                websiteTotals.rounds > 0
                                                                    ? (websiteTotals.kills / websiteTotals.rounds).toFixed(2)
                                                                    : "—",
                                                            ],
                                                            [
                                                                "DPR",
                                                                websiteTotals.rounds > 0
                                                                    ? (websiteTotals.deaths / websiteTotals.rounds).toFixed(2)
                                                                    : "—",
                                                            ],
                                                            [
                                                                "ADR",
                                                                websiteTotals.adrRounds > 0
                                                                    ? (websiteTotals.adrDamage / websiteTotals.adrRounds).toFixed(1)
                                                                    : "—",
                                                            ],
                                                            [
                                                                "HS%",
                                                                websiteTotals.kills > 0
                                                                    ? `${((websiteTotals.headshots / websiteTotals.kills) * 100).toFixed(1)}%`
                                                                    : "—",
                                                            ],
                                                            [
                                                                "Rating (szacunek)",
                                                                websiteTotals.ratingRounds > 0
                                                                    ? (websiteTotals.ratingTotal / websiteTotals.ratingRounds).toFixed(2)
                                                                    : "—",
                                                            ],
                                                        ].map(([label, value]) => (
                                                            <div key={label} className="bg-white/[0.03] px-3 py-3">
                                                                <dt
                                                                    className="text-xs text-gray-500"
                                                                    title={label === "Rating (szacunek)"
                                                                        ? "Nieoficjalny szacunek w stylu HLTV, nie Rating 2.0."
                                                                        : undefined}
                                                                >
                                                                    {label}
                                                                </dt>
                                                                <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
                                                            </div>
                                                        ))}
                                                    </dl>
                                                    <p className="px-4 pb-3 text-xs text-gray-500">
                                                        Statystyki obejmują zakończone mecze FACEIT zapisane na stronie, również starsze niż ostatnie 30 spotkań.
                                                        Rating jest szacunkiem w stylu HLTV, nie oficjalnym Ratingiem 2.0.
                                                    </p>
                                                    <ul className="divide-y divide-white/[0.06] border-t border-white/10">
                                                        {websiteMatchHistory.map((match) => (
                                                            <li key={match.id}>
                                                                <Link
                                                                    to="/match"
                                                                    state={{ id: match.id }}
                                                                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                                                                >
                                                                    <span className="min-w-0">
                                                                        <span className="block truncate text-sm font-medium text-white">
                                                                            {match.opponent
                                                                                ? `vs ${match.opponent}`
                                                                                : match.league?.name ?? "Mecz"}
                                                                        </span>
                                                                        <span className="mt-1 block text-xs text-gray-500">
                                                                            {match.time
                                                                                ? new Date(match.time).toLocaleDateString("pl-PL")
                                                                                : "Data nieznana"}
                                                                            {match.league?.name ? ` · ${match.league.name}` : ""}
                                                                            {` · ${match.stats.kills}/${match.stats.deaths}/${match.stats.assists} K/D/A`}
                                                                            {match.stats.ratingEstimate != null
                                                                                ? ` · ${match.stats.ratingEstimate.toFixed(2)} est.`
                                                                                : ""}
                                                                        </span>
                                                                    </span>
                                                                    <span className="flex shrink-0 items-center gap-2">
                                                                        <span className="text-sm font-semibold tabular-nums text-gray-300">
                                                                            {match.score}
                                                                        </span>
                                                                        <span className={`flex h-7 w-7 items-center justify-center text-xs font-bold ${match.stats.won
                                                                            ? "bg-emerald-500/15 text-emerald-300"
                                                                            : "bg-red-500/10 text-red-300"
                                                                            }`}>
                                                                            {match.stats.won ? "W" : "L"}
                                                                        </span>
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </section>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="px-4 py-5 text-sm text-gray-500">
                                {recentStats?.failedMatches > 0
                                    ? "Nie udało się pobrać statystyk z ostatnich meczów."
                                    : "Brak dostępnych statystyk z ostatnich meczów."}
                            </p>
                        )}
                    </section>
                </div>
            </div >
        </section >
    );
};

export default Player;

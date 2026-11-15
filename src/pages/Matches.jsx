import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import Pagination from "../components/Pagination";
import matchIcon from "../assets/match.svg";
const Matches = () => {
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const PAGE_SIZE = 25;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        let active = true;
        const fetchMatches = () => supabase
            .from("matches")
            .select(`
                id,
                league:tournaments!matches_league_fkey(name),
                team_1:teams!matches_team_1_id_fkey(id, name, logo),
                team_2:teams!matches_team_2_id_fkey(id, name, logo),
                team_2_name,
                team_2_logo_url,
                faceit_match_id,
                time,
                team_1_score,
                team_2_score,
                finished,
                cancelled
            `)
            .order("time", { ascending: false });

        const loadMatches = async () => {
            setLoading(true);
            const [matchesResult, teamsResult] = await Promise.all([
                fetchMatches(),
                supabase
                    .from("teams")
                    .select("id, name")
                    .order("name", { ascending: true }),
            ]);

            if (!active) return;

            if (matchesResult.error || teamsResult.error) {
                const loadError = matchesResult.error ?? teamsResult.error;
                console.error("Error loading matches page:", loadError.message);
                setError(loadError.message);
                setLoading(false);
                return;
            }

            setMatches(matchesResult.data ?? []);
            setTeams(teamsResult.data ?? []);
            setError(null);
            setLoading(false);
        }

        const refreshMatches = async () => {
            const { data, error: refreshError } = await fetchMatches();

            if (!active) return;

            if (refreshError) {
                console.error("Error refreshing matches:", refreshError.message);
                return;
            }

            setMatches(data ?? []);
        };

        void loadMatches();
        const refreshInterval = window.setInterval(() => {
            void refreshMatches();
        }, 15 * 1000);

        return () => {
            active = false;
            window.clearInterval(refreshInterval);
        };
    }, []);

    const getLogoUrl = (logo) =>
        logo ? supabase.storage.from("logos").getPublicUrl(logo).data.publicUrl : null;

    const getMatchDay = (date) => {
        if (!date) return { key: "unknown", label: "Data nieznana" };
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return { key: "unknown", label: "Data nieznana" };
        }

        return {
            key: `${parsedDate.getFullYear()}-${parsedDate.getMonth()}-${parsedDate.getDate()}`,
            label: parsedDate.toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
        };
    };

    const formatTime = (date) => {
        if (!date) return "--:--";

        const parsedDate = new Date(date);
        return Number.isNaN(parsedDate.getTime())
            ? "--:--"
            : parsedDate.toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
            });
    };

    const filteredMatches = selectedTeamId
        ? matches.filter((match) =>
            String(match.team_1?.id ?? "") === selectedTeamId ||
            String(match.team_2?.id ?? "") === selectedTeamId
        )
        : matches;
    const activeMatches = filteredMatches.filter((match) => !match.cancelled);
    const upcomingMatches = activeMatches
        .filter((match) => !match.finished)
        .sort((first, second) => new Date(first.time ?? 0) - new Date(second.time ?? 0));
    const finishedMatches = activeMatches
        .filter((match) => match.finished)
        .sort((first, second) => new Date(second.time ?? 0) - new Date(first.time ?? 0));
    const cancelledMatches = filteredMatches
        .filter((match) => match.cancelled)
        .sort((first, second) => new Date(second.time ?? 0) - new Date(first.time ?? 0));
    const orderedMatches = [...upcomingMatches, ...finishedMatches, ...cancelledMatches];
    const pageCount = Math.ceil(orderedMatches.length / PAGE_SIZE);
    const pageMatches = orderedMatches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const pageUpcomingMatches = pageMatches.filter((match) => !match.finished && !match.cancelled);
    const pageFinishedMatches = pageMatches.filter((match) => match.finished && !match.cancelled);
    const pageCancelledMatches = pageMatches.filter((match) => match.cancelled);
    const liveMatches = pageUpcomingMatches.filter((match) =>
        match.team_1_score != null || match.team_2_score != null
    );
    const scheduledMatches = pageUpcomingMatches.filter((match) =>
        match.team_1_score == null && match.team_2_score == null
    );

    const renderGroupedMatches = (matchList) => {
        const groups = [];

        matchList.forEach((match) => {
            const day = getMatchDay(match.time);
            let group = groups[groups.length - 1];

            if (!group || group.key !== day.key) {
                group = { ...day, matches: [] };
                groups.push(group);
            }

            group.matches.push(match);
        });

        return groups.map((group) => (
            <section key={group.key}>
                <h3 className=" py-3 text-sm font-bold capitalize text-white">
                    {group.label}
                </h3>
                <ul>
                    {group.matches.map(renderMatch)}
                </ul>
            </section>
        ));
    };

    const renderMatch = (match, index) => {
        const team1Logo = getLogoUrl(match.team_1?.logo);
        const team2Logo = getLogoUrl(match.team_2?.logo) ?? match.team_2_logo_url;
        const hasLiveScore = !match.finished && !match.cancelled &&
            (match.team_1_score != null || match.team_2_score != null);

        return (
            <li key={match.id ?? `${match.team_1_id}-${match.team_2_id}-${index}`}>
                <Link
                    to="/match"
                    state={{ id: match.id }}
                    className="flex min-w-0 items-center gap-2 px-4 py-4 transition-colors border border-white/10 hover:border-white/20 hover:bg-white/[0.03] sm:gap-4 sm:px-6"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-black/30">
                        {team1Logo ? (
                            <img src={team1Logo} alt="" className="h-7 w-7 object-contain" />
                        ) : (
                            <span className="text-xs text-gray-500">—</span>
                        )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-white">
                        {match.team_1?.name ?? "Bez drużyny"}
                    </span>
                    <div className="flex flex-col items-center gap-1">
                        <p className={`text-xs ${match.cancelled ? "text-gray-500" : "text-red-500"}`}>
                            {match.cancelled ? "ANULOWANY" : hasLiveScore ? "LIVE" : ""}
                        </p>
                        <span className={`shrink-0 text-sm font-bold tabular-nums ${match.finished ? "text-white" : "text-gray-500"}`}>
                            {match.cancelled
                                ? "—"
                                : match.finished || hasLiveScore
                                ? `${match.team_1_score ?? "-"} : ${match.team_2_score ?? "-"}`
                                : "vs"}
                        </span>
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                        {match.team_2?.name ?? match.team_2_name ?? "Bez drużyny"}
                    </span>
                    {team2Logo ? (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                            <img src={team2Logo} alt="" className="h-7 w-7 object-contain" />
                        </span>
                    ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-black/30 text-xs text-gray-500">—</span>
                    )}
                    <time dateTime={match.time} className="hidden w-16 shrink-0 text-right text-xs text-gray-500 sm:block">
                        {formatTime(match.time)}
                    </time>
                </Link>
                <time dateTime={match.time} className="block px-4 pb-3 text-right text-xs text-gray-500 sm:hidden">
                    {formatTime(match.time)}
                </time>
            </li>
        );
    };

    return (
        <section className="min-w-0">
            <header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div className="flex items-center gap-3">
                    <img src={matchIcon} alt="" aria-hidden="true" className="h-5 w-5 invert opacity-70" />
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">
                        Mecze
                    </h1>
                </div>
                <div className="flex w-full flex-col gap-1 sm:max-w-xs">
                    <label htmlFor="matches-team-filter" className="text-xs font-medium text-gray-400">
                        Drużyna
                    </label>
                    <select
                        id="matches-team-filter"
                        value={selectedTeamId}
                        onChange={(event) => {
                            setSelectedTeamId(event.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full min-w-0 border p-2.5 text-sm"
                    >
                        <option value="">Wszystkie drużyny</option>
                        {teams.map((team) => (
                            <option key={team.id} value={String(team.id)}>{team.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            {loading ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Ładowanie meczy...</p>
            ) : error ? (
                <p role="status" className="px-4 py-8 text-center text-sm text-red-300">{error}</p>
            ) : filteredMatches.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                    {selectedTeamId ? "Brak meczów dla wybranej drużyny." : "Brak meczy."}
                </p>
            ) : (
                <div className="space-y-8">
                    {liveMatches.length > 0 && (
                        <section>
                            <h2 className=" bg-bg w-fit rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                MECZE LIVE
                            </h2>
                            {renderGroupedMatches(liveMatches, true)}
                        </section>
                    )}
                    {scheduledMatches.length > 0 && (
                        <section>
                            <h2 className="bg-bg w-fit rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                Nadchodzące mecze
                            </h2>
                            {renderGroupedMatches(scheduledMatches)}
                        </section>
                    )}
                    {pageFinishedMatches.length > 0 && (
                        <section>
                            <h2 className="bg-bg w-fit rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                Zakończone mecze
                            </h2>
                            {renderGroupedMatches(pageFinishedMatches)}
                        </section>
                    )}
                    {pageCancelledMatches.length > 0 && (
                        <section>
                            <h2 className="bg-bg w-fit rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                Anulowane mecze
                            </h2>
                            {renderGroupedMatches(pageCancelledMatches)}
                        </section>
                    )}
                </div>
            )}
            {!loading && !error && filteredMatches.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    pageCount={pageCount}
                    itemCount={pageMatches.length}
                    onPageChange={setCurrentPage}
                />
            )}
        </section>
    )
}

export default Matches
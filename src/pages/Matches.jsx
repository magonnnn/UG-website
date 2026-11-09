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
        const loadMatches = async () => {
            setLoading(true);
            const [matchesResult, teamsResult] = await Promise.all([
                supabase
                    .from("matches")
                    .select(`
                        id,
                        league:tournaments!matches_league_fkey(name),
                        team_1:teams!matches_team_1_id_fkey(id, name, logo),
                        team_2:teams!matches_team_2_id_fkey(id, name, logo),
                        team_2_name,
                        faceit_match_id,
                        time,
                        team_1_score,
                        team_2_score,
                        finished
                    `)
                    .order("time", { ascending: false }),
                supabase
                    .from("teams")
                    .select("id, name")
                    .order("name", { ascending: true }),
            ]);

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

        loadMatches();
    }, []);

    const getLogoUrl = (logo) =>
        logo ? supabase.storage.from("logos").getPublicUrl(logo).data.publicUrl : null;

    const formatDate = (date) => {
        if (!date) return "Data nieznana";

        const parsedDate = new Date(date);
        return Number.isNaN(parsedDate.getTime())
            ? "Data nieznana"
            : parsedDate.toLocaleString("pl-PL", {
                dateStyle: "medium",
                timeStyle: "short",
            });
    };

    const filteredMatches = selectedTeamId
        ? matches.filter((match) =>
            String(match.team_1?.id ?? "") === selectedTeamId ||
            String(match.team_2?.id ?? "") === selectedTeamId
        )
        : matches;
    const upcomingMatches = filteredMatches
        .filter((match) => !match.finished)
        .sort((first, second) => new Date(first.time ?? 0) - new Date(second.time ?? 0));
    const finishedMatches = filteredMatches
        .filter((match) => match.finished)
        .sort((first, second) => new Date(second.time ?? 0) - new Date(first.time ?? 0));
    const orderedMatches = [...upcomingMatches, ...finishedMatches];
    const pageCount = Math.ceil(orderedMatches.length / PAGE_SIZE);
    const pageMatches = orderedMatches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const pageUpcomingMatches = pageMatches.filter((match) => !match.finished);
    const pageFinishedMatches = pageMatches.filter((match) => match.finished);

    const renderMatch = (match, index) => {
        const team1Logo = getLogoUrl(match.team_1?.logo);
        const team2Logo = getLogoUrl(match.team_2?.logo);

        return (
            <li key={match.id ?? `${match.team_1_id}-${match.team_2_id}-${index}`}>
                <Link
                    to="/match"
                    state={{ id: match.id }}
                    className="flex min-w-0 items-center gap-2 px-4 py-4 transition-colors border border-white/10 transition-colors hover:border-white/20 my-4 hover:bg-white/[0.03] sm:gap-4 sm:px-6"
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
                    <span className={`shrink-0 text-sm font-bold tabular-nums ${match.finished ? "text-white" : "text-gray-500"}`}>
                        {match.finished
                            ? `${match.team_1_score ?? "—"} : ${match.team_2_score ?? "—"}`
                            : "vs"}
                    </span>
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
                    <time className="hidden w-28 shrink-0 text-right text-xs text-gray-500 sm:block">
                        {formatDate(match.time)}
                    </time>
                </Link>
                <time className="block px-4 pb-3 text-right text-xs text-gray-500 sm:hidden">
                    {formatDate(match.time)}
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
                    {pageUpcomingMatches.length > 0 && (
                        <section>
                            <h2 className="border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                Nadchodzące mecze
                            </h2>
                            <ul>{pageUpcomingMatches.map(renderMatch)}</ul>
                        </section>
                    )}
                    {pageFinishedMatches.length > 0 && (
                        <section>
                            <h2 className="border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                                Zakończone mecze
                            </h2>
                            <ul>{pageFinishedMatches.map(renderMatch)}</ul>
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
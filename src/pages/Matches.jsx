import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import Pagination from "../components/Pagination";
import matchIcon from "../assets/match.svg";
const Matches = () => {
    const [matches, setMatches] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const PAGE_SIZE = 25;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const loadMatches = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("matches")
                .select(`
                    id,
                    league:tournaments!matches_league_fkey(
                        name
                    ),
                    team_1:teams!matches_team_1_id_fkey(
                        name,
                        logo
                    ),
                    team_2:teams!matches_team_2_id_fkey(
                        name,
                        logo
                    ),
                    time
                `)
                .order("time", { ascending: true });

            if (error) {
                setError(error.message);
                return;
            } else {
                setMatches(data ?? []);
            }
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

    const pageCount = Math.ceil(matches.length / PAGE_SIZE);
    const pageMatches = matches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <section className="min-w-0">
            <header className="mb-5 flex items-center gap-3">
                <img src={matchIcon} alt="" aria-hidden="true" className="h-5 w-5 invert opacity-70" />
                <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">
                        Mecze
                    </h1>
                </div>
            </header>

            {loading ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Ładowanie meczy...</p>
            ) : error ? (
                <p role="status" className="px-4 py-8 text-center text-sm text-red-300">{error}</p>
            ) : matches.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Brak meczy.</p>
            ) : (
                <ul className="divide-y divide-white/5">
                    {matches.map((match, index) => {
                        const team1Logo = getLogoUrl(match.team_1?.logo);
                        const team2Logo = getLogoUrl(match.team_2?.logo);

                        return (
                            <li key={match.id ?? `${match.team_1_id}-${match.team_2_id}-${index}`}>
                                <Link
                                    to="/match"
                                    state={{ id: match.id }}
                                    className="flex min-w-0 items-center gap-2 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-6"
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
                                    <span className="shrink-0 text-xs text-gray-500">vs</span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                                        {match.team_2?.name ?? "Bez drużyny"}
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
                    })}
                </ul>
            )}
            {!loading && !error && matches.length > 0 && (
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
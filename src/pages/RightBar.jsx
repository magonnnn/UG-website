import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"
import { Link } from "react-router-dom";
import rankingIcon from "../assets/ranking.svg";
import matchIcon from "../assets/match.svg";

const RightBar = () => {
    const [teams, setTeams] = useState([]);
    const [matches, setMatches] = useState([]);
    const [matchesLoading, setMatchesLoading] = useState(true);
    const [matchesError, setMatchesError] = useState("");

    useEffect(() => {
        const loadTopTeams = async () => {
            const { data, error } = await supabase
                .from("teams")
                .select(`
                    *
                `)
                .order("points", { ascending: false })
                .limit(5);

            if (error) {
                console.error("Error loading transfers:", error.message);
                return;
            }

            setTeams(data ?? []);
        };

        loadTopTeams();
    }, []);

    useEffect(() => {
        const loadUpcomingMatches = async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data, error } = await supabase
                .from("matches")
                .select(`
                    id,
                    time,
                    team_2_name,
                    faceit_match_id,
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
                    )
                    `)
                .gte("time", today.toISOString())
                .lt("time", tomorrow.toISOString())
                .or("finished.is.null,finished.eq.false")
                .order("time", { ascending: true });

            if (error) {
                console.error("Error loading matches:", error.message);
                setMatchesError("Nie udało się załadować meczów.");
                setMatchesLoading(false);
                return;
            }

            setMatches(data ?? []);
            setMatchesLoading(false);
        }

        loadUpcomingMatches();
    }, []);

    const getLogoUrl = (logo) => {
        if (!logo) return null;

        return supabase.storage
            .from("logos")
            .getPublicUrl(logo)
            .data.publicUrl;
    };



    return (
        <aside className="min-w-0 space-y-4 p-3 sm:p-4">
            <section className="overflow-hidden border border-border bg-bg">
                <h2 className="flex items-center gap-2 border-b border-border px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <img src={rankingIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-60" />
                    <Link to="/ranking" className="text-gray-400 transition-colors hover:text-white">
                        Ranking Podziemia
                    </Link>
                </h2>
                <div>
                    {teams.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-gray-400">Brak drużyn w rankingu.</p>
                    ) : (
                        teams.map((team, index) => (
                            <Link
                                to="/team"
                                state={{ id: team.id }}
                                key={team.id}
                                className="flex min-w-0 items-center gap-3 px-3 py-3 hover:bg-white/[0.03]"
                            >
                                <span className="w-4 shrink-0 text-xs font-bold text-gray-500">{index + 1}</span>
                                {team.logo ? (
                                    <img src={getLogoUrl(team.logo)} alt="" className="h-7 w-7 shrink-0 object-contain" />
                                ) : (
                                    <span className="h-7 w-7 shrink-0 rounded-full bg-white/5" />
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{team.name}</span>
                                <span className="shrink-0 text-xs text-gray-500">{team.points ?? 0} pkt</span>
                            </Link>
                        ))
                    )}
                </div>
            </section>

            <section className="overflow-hidden border border-border bg-bg">
                <h2 className="flex items-center gap-2 border-b border-border px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <img src={matchIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-60" />
                    <Link to="/matches" className="text-gray-400 transition-colors hover:text-white">
                        Najbliższe mecze
                    </Link>
                </h2>
                {matchesLoading ? (
                    <p className="px-4 py-4 text-sm text-gray-400">Ładowanie meczów...</p>
                ) : matchesError ? (
                    <p className="px-4 py-4 text-sm text-red-300">{matchesError}</p>
                ) : matches.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-gray-400">Brak dzisiejszych meczów.</p>
                ) : (
                    <div>
                        {matches.map((match) => (
                            <Link
                                to="/match"
                                state={{ id: match.id }}
                                key={match.id}
                                className="block px-3 py-3 hover:bg-white/[0.03]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-xs font-semibold text-gray-300">
                                        {match.league?.name ?? (match.faceit_match_id ? "ESEA" : "Mecz")}
                                    </span>
                                    <time className="shrink-0 text-[11px] text-gray-500">
                                        {match.time
                                            ? new Date(match.time).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
                                            : "—"}
                                    </time>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2 text-sm text-white">
                                    <span className="min-w-0 truncate">{match.team_1?.name ?? "Drużyna 1"}</span>
                                    <img src={matchIcon} alt="" aria-hidden="true" className="h-3 w-3 invert opacity-60" />
                                    <span className="min-w-0 truncate text-right">{match.team_2?.name ?? match.team_2_name ?? "Drużyna 2"}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </aside>
    )
}

export default RightBar;
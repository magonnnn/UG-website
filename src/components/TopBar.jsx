import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import clockIcon from "../assets/clock.svg";
import matchIcon from "../assets/match.svg";

const TopBar = () => {
    const [error, setError] = useState("");
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        let hasLoaded = false;

        const fetchMatches = async () => {
            if (!hasLoaded) setLoading(true);
            setError("");

            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data, error } = await supabase
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
                        league: tournaments!matches_league_fkey(name),
                        team_1: teams!matches_team_1_id_fkey(id, name, logo, faceit_id),
                        team_2: teams!matches_team_2_id_fkey(id, name, logo)
                    `)
                    .gte("time", today.toISOString())
                    .eq("cancelled", false)
                    .or("finished.is.null,finished.eq.false")
                    .order("time", { ascending: true })
                    .limit(20);

                if (!active) return;

                if (error) {
                    console.error("Error loading top bar matches:", error.message);
                    setError("Nie udało się załadować meczów.");
                    return;
                }

                const sortedMatches = (data ?? []).sort((first, second) => {
                    const firstIsLive =
                        first.team_1_score != null || first.team_2_score != null;
                    const secondIsLive =
                        second.team_1_score != null || second.team_2_score != null;

                    if (firstIsLive !== secondIsLive) return firstIsLive ? -1 : 1;
                    return new Date(first.time) - new Date(second.time);
                });

                setMatches(sortedMatches.slice(0, 4));
            } catch (fetchError) {
                if (!active) return;
                console.error("Error loading top bar matches:", fetchError);
                setError("Nie udało się załadować meczów.");
            } finally {
                if (active) {
                    hasLoaded = true;
                    setLoading(false);
                }
            }
        };

        void fetchMatches();
        const refreshInterval = window.setInterval(() => {
            void fetchMatches();
        }, 15 * 1000);

        return () => {
            active = false;
            window.clearInterval(refreshInterval);
        };
    }, []);

    const getLogoUrl = (logo) => {
        if (!logo) return null;

        return supabase.storage
            .from("logos")
            .getPublicUrl(logo)
            .data.publicUrl;
    };

    return (
        <section className="mb-4 w-full overflow-hidden border border-white/10 bg-bg">
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <h2 className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300 sm:text-sm">
                    <img
                        src={matchIcon}
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 invert opacity-60"
                    />
                    Mecze na żywo i nadchodzące
                </h2>
                <Link
                    to="/matches"
                    className="shrink-0 text-xs text-gray-500 transition-colors hover:text-white"
                >
                    Wszystkie mecze
                </Link>
            </header>
            <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 xl:grid-cols-4">
                {loading ? (
                    <p className="px-2 py-3 text-sm text-gray-400">Ładowanie meczów...</p>
                ) : error ? (
                    <p className="px-2 py-3 text-sm text-red-300">{error}</p>
                ) : matches.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-gray-400">Brak nadchodzących meczów.</p>
                ) : (
                    matches.map((match) => {
                        const isLive =
                            match.team_1_score != null || match.team_2_score != null;
                        const team1Name = match.team_1?.name ?? "Drużyna 1";
                        const team2Name =
                            match.team_2?.name ?? match.team_2_name ?? "Drużyna 2";
                        const leagueName =
                            match.league?.name ?? (match.faceit_match_id ? "ESEA" : "Mecz");

                        return (
                            <Link
                                key={match.id}
                                className={`group min-w-0 ${isLive ? "border border-red-800 bg-red-500/10" : "border border-white/[0.07] bg-white/[0.025]"} px-3 py-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]`}
                                state={{ id: match.id }}
                                to="/match"
                                aria-label={`${team1Name} versus ${team2Name}, ${match.time ? new Date(match.time).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "godzina nieznana"}, ${leagueName}`}
                            >

                                <div className="flex flex-col min-w-0 gap-3">
                                    <div className="flex min-w-0 flex-1 flex-row gap-1 text-sm text-white justify-between">
                                        {!isLive && (
                                            <div className="flex flex-row gap-2 items-center">
                                                <img
                                                    src={clockIcon}
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="h-3 w-3 invert opacity-50"
                                                />

                                                <time className="justify-self-end text-xs font-medium tabular-nums text-gray-300">
                                                    {match.time
                                                        ? new Date(match.time).toLocaleTimeString("pl-PL", {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : "-"}
                                                </time>
                                            </div>
                                        )}
                                        <span
                                            className={`h-3 w-3 shrink-0 flex flex-row items-center gap-2 ${isLive ? "opacity-100" : "opacity-0"}`}
                                            aria-hidden="true"

                                        >
                                            <p className="bg-red-700 aspect-square rounded-full h-3 animate-pulse [animation-duration:_1.5s]"></p>
                                            LIVE
                                        </span>
                                        <span
                                            className="max-w-24 justify-self-end truncate text-right text-xs text-gray-500"
                                            title={leagueName}
                                        >
                                            {leagueName}
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-white">
                                        {[match.team_1, match.team_2].map((team, index) => {
                                            const name = index === 0 ? team1Name : team2Name;
                                            const score = index === 0
                                                ? match.team_1_score
                                                : match.team_2_score;
                                            const logoUrl = getLogoUrl(team?.logo) ??
                                                (index === 1 ? match.team_2_logo_url : null);

                                            return (
                                                <div
                                                    key={team?.id ?? name}
                                                    className="flex justify-center min-w-0 items-center gap-2"
                                                >
                                                    {logoUrl ? (
                                                        <img
                                                            src={logoUrl}
                                                            alt=""
                                                            aria-hidden="true"
                                                            className="h-5 w-5 shrink-0 object-contain"
                                                        />
                                                    ) : (
                                                        <span
                                                            className="h-5 w-5 shrink-0 rounded-full bg-white/[0.06]"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <span className="min-w-0 flex-1 truncate font-medium">
                                                        {name}
                                                    </span>
                                                    {isLive && (
                                                        <span className="shrink-0 font-semibold tabular-nums text-gray-300">
                                                            {score ?? 0}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </section >
    );
};

export default TopBar;
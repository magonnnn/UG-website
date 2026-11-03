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

    useEffect(() => {
        let active = true;

        const loadMatch = async () => {
            if (!matchId) {
                setError("Nie wybrano meczu.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            const { data, error: queryError } = await supabase
                .from("matches")
                .select(`
                    id,
                    time,
                    team_1:teams!matches_team_1_id_fkey (
                        id,
                        name,
                        logo
                    ),
                    team_2:teams!matches_team_2_id_fkey (
                        id,
                        name,
                        logo
                    ),
                    league:tournaments!matches_league_fkey (
                        name
                    )
                `)
                .eq("id", matchId)
                .maybeSingle();

            if (!active) return;

            if (queryError) {
                console.error("Error loading match:", queryError.message);
                setError("Nie udało się załadować meczu.");
            } else if (!data) {
                setError("Nie znaleziono tego meczu.");
            } else {
                setMatch(data);
            }

            setLoading(false);
        };

        loadMatch();

        return () => {
            active = false;
        };
    }, [matchId]);

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
        { ...match.team_2, label: match.team_2?.name ?? "Drużyna 2" },
    ];

    return (
        <article className="my-6 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
                        {match.league?.name ?? "Mecz"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
                        <img src={clockIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-60" />
                        {matchTime}
                    </p>
                </div>
                <span className="rounded-full bg-[#17191e] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300">
                    Zaplanowany
                </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-10 sm:gap-8 sm:px-10 sm:py-14">
                {teams.map((team, index) => {
                    const logoUrl = getLogoUrl(team.logo);

                    return (
                        <Link
                            className={`flex min-w-0 flex-col items-center gap-4 text-center ${index === 0 ? "order-1" : "order-3"}`}
                            key={`${team.label}-${index}`}
                            to="/team"
                            state={{ id: team.id }}
                        >
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
                        </Link>
                    );
                })}
                <div className="order-2 text-center">
                    <span className="text-2xl font-black tracking-widest text-gray-500 sm:text-4xl">VS</span>
                </div>
            </div>

            <div className="px-4 py-3 text-center text-xs text-gray-500 sm:px-6">
                Szczegóły spotkania
            </div>
        </article >
    );
};

export default Match;

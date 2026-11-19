import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import matchIcon from "../assets/match.svg";

const formatDate = (date) => {
    if (!date) return "Termin nieznany";

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
        ? "Termin nieznany"
        : parsedDate.toLocaleString("pl-PL", {
            dateStyle: "medium",
            timeStyle: "short",
        });
};

const getTournamentUrl = (link) => {
    if (!link) return null;

    try {
        const url = new URL(link);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
};

const Tournaments = () => {
    const [tournaments, setTournaments] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [error, setError] = useState("");
    const [achievementsError, setAchievementsError] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeBtn, setActiveBtn] = useState(1);

    useEffect(() => {
        let active = true;

        const fetchTournaments = async () => {
            const { data, error: queryError } = await supabase
                .from("tournaments")
                .select("*")
                .order("starts", { ascending: true });

            if (!active) return;

            if (queryError) {
                console.error("Error loading tournaments:", queryError.message);
                setError("Nie udało się załadować turniejów.");
            } else {
                setTournaments(data ?? []);
            }

            setLoading(false);
        };

        void fetchTournaments();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        const fetchAchievements = async () => {
            const { data, error: queryError } = await supabase
                .from("tournament_achievements")
                .select("id, tournament_id, team_name, placement, roster")
                .order("placement", { ascending: true });

            if (!active) return;

            if (queryError) {
                console.error("Error loading tournament achievements:", queryError.message);
                setAchievementsError("Nie udało się załadować osiągnięć turniejowych.");
            } else {
                setAchievements(data ?? []);
            }
        };

        void fetchAchievements();

        return () => {
            active = false;
        };
    }, []);

    const getLogoUrl = (logo) => logo
        ? supabase.storage.from("tournaments").getPublicUrl(logo).data.publicUrl
        : null;

    const renderAchievements = (tournamentId) => {
        const tournamentAchievements = achievements.filter(
            (achievement) => String(achievement.tournament_id) === String(tournamentId)
        );

        if (tournamentAchievements.length === 0) return null;

        return (
            <section className="border-t border-white/10 px-4 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    ZWYCIĘZCY
                </h3>
                <ul className="mt-2 space-y-2">
                    {tournamentAchievements.map((achievement) => {
                        const roster = Array.isArray(achievement.roster)
                            ? achievement.roster
                            : [];

                        return (
                            <li key={achievement.id} className="bg-bg-light rounded-md p-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-white">
                                        {achievement.team_name}
                                    </span>
                                    {achievement.placement && (
                                        <span className="text-sm font-black text-white">
                                            {achievement.placement}
                                        </span>
                                    )}
                                </div>
                                {roster.length > 0 && (
                                    <p className="mt-1 text-xs text-gray-400">
                                        Skład: {roster.map((player) => player?.name ?? "Nieznany gracz").join(", ")}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    };

    return (
        <section className="min-w-0">
            <section>
                {loading ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">Ładowanie turniejów...</p>
                ) : error ? (
                    <p role="status" className="px-4 py-8 text-center text-sm text-red-300">{error}</p>
                ) : tournaments.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">Brak turniejów.</p>
                ) : (
                    <>
                        <div className="relative isolate mb-4 inline-flex w-fit rounded-xl border border-white/10 bg-bg-light p-1 shadow-inner shadow-black/20">
                            <span
                                aria-hidden="true"
                                className={`absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-lg bg-gradient-to-br from-primary to-[#8f1b25] shadow-[0_2px_12px_rgb(180_35_45/35%)] ring-1 ring-white/10 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${activeBtn === 2 ? "translate-x-full" : ""}`}
                            />
                            <button
                                type="button"
                                aria-pressed={activeBtn === 1}
                                className={`relative z-10 min-w-32 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeBtn === 1 ? "text-white" : "text-gray-400 hover:text-white"}`}
                                onClick={() => setActiveBtn(1)}
                            >
                                Nadchodzące
                            </button>
                            <button
                                type="button"
                                aria-pressed={activeBtn === 2}
                                className={`relative z-10 min-w-32 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${activeBtn === 2 ? "text-white" : "text-gray-400 hover:text-white"}`}
                                onClick={() => setActiveBtn(2)}
                            >
                                Zakończone
                            </button>
                        </div>
                        {achievementsError && (
                            <p role="status" className="mb-4 text-sm text-red-300">
                                {achievementsError}
                            </p>
                        )}
                        <ul className="grid gap-4 sm:grid-cols-2">
                            {activeBtn === 1 ? (
                                tournaments
                                    .filter((tournament) => tournament.finished === false)
                                    .map((tournament) => {
                                        const logoUrl = getLogoUrl(tournament.logo);
                                        const tournamentUrl = getTournamentUrl(tournament.link);
                                        return (
                                            <li key={tournament.id} className="relative">
                                                <a
                                                    href={tournamentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`Otwórz stronę turnieju ${tournament.name}`}
                                                    className=""
                                                >
                                                    <article className="h-full overflow-hidden border bg-bg border-white/10 transition-colors hover:border-white/20 hover:cursor-pointer">
                                                        <div className="flex items-center gap-4 border-b border-white/10 p-4">
                                                            <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-black/30">
                                                                {logoUrl ? (
                                                                    <img
                                                                        src={logoUrl}
                                                                        alt={`${tournament.name} — logo`}
                                                                        className="h-full w-full object-contain"
                                                                    />
                                                                ) : (
                                                                    <img src={matchIcon} alt="" aria-hidden="true" className="h-7 w-7 invert opacity-40" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h2 className="break-words text-lg font-bold text-white">
                                                                    {tournament.name}
                                                                </h2>
                                                                <time className="mt-1 block text-xs text-gray-400">
                                                                    {formatDate(tournament.starts)}
                                                                </time>
                                                            </div>
                                                        </div>
                                                        {tournament.description && (
                                                            <p className="whitespace-pre-wrap px-4 py-3 text-sm text-gray-300">
                                                                {tournament.description}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 pb-4 text-xs text-gray-400">
                                                            <span>
                                                                Ilość miejsc:
                                                                {tournament.amount_of_teams != null
                                                                    ? ` ${tournament.amount_of_teams}`
                                                                    : ""}
                                                            </span>
                                                        </div>
                                                        {renderAchievements(tournament.id)}
                                                    </article>
                                                </a>
                                            </li>
                                        )
                                    })
                            ) : (
                                tournaments
                                    .filter((tournament) => tournament.finished === true)
                                    .map((tournament) => {
                                        const logoUrl = getLogoUrl(tournament.logo);
                                        const tournamentUrl = getTournamentUrl(tournament.link);
                                        return (
                                            <li key={tournament.id} className="relative">
                                                <article className="h-full overflow-hidden border bg-bg border-white/10 transition-colors hover:border-white/20 hover:cursor-pointer">
                                                    <div className="flex items-center gap-4 border-b border-white/10 p-4">
                                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-black/30">
                                                            {logoUrl ? (
                                                                <img
                                                                    src={logoUrl}
                                                                    alt={`${tournament.name} — logo`}
                                                                    className="h-full w-full object-contain"
                                                                />
                                                            ) : (
                                                                <img src={matchIcon} alt="" aria-hidden="true" className="h-7 w-7 invert opacity-40" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h2 className="break-words text-lg font-bold text-white">
                                                                {tournament.name}
                                                            </h2>
                                                            <time className="mt-1 block text-xs text-gray-400">
                                                                {formatDate(tournament.starts)}
                                                            </time>
                                                        </div>
                                                    </div>
                                                    {tournament.description && (
                                                        <p className="whitespace-pre-wrap px-4 py-3 text-sm text-gray-300">
                                                            {tournament.description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 pb-4 text-xs text-gray-400">
                                                        <span>
                                                            Ilość miejsc:
                                                            {tournament.amount_of_teams != null
                                                                ? ` ${tournament.amount_of_teams}`
                                                                : ""}
                                                        </span>
                                                    </div>
                                                    {renderAchievements(tournament.id)}
                                                </article>
                                            </li>
                                        )
                                    })
                            )
                            }
                        </ul>
                    </>
                )}
            </section>
        </section>
    );
};

export default Tournaments;

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
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

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

    const getLogoUrl = (logo) => logo
        ? supabase.storage.from("tournaments").getPublicUrl(logo).data.publicUrl
        : null;

    return (
        <section className="min-w-0">
            <header className="mb-5 flex items-center gap-3">
                <img src={matchIcon} alt="" aria-hidden="true" className="h-5 w-5 invert opacity-70" />
                <h1 className="text-2xl font-bold text-white sm:text-3xl">Turnieje</h1>
            </header>

            {loading ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Ładowanie turniejów...</p>
            ) : error ? (
                <p role="status" className="px-4 py-8 text-center text-sm text-red-300">{error}</p>
            ) : tournaments.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Brak turniejów.</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                    {tournaments.map((tournament) => {
                        const logoUrl = getLogoUrl(tournament.logo);
                        const tournamentUrl = getTournamentUrl(tournament.link);

                        return (
                            <li key={tournament.id} className="relative">
                                <article className="h-full overflow-hidden border border-white/10 transition-colors hover:border-white/20 hover:bg-white/[0.03] hover:cursor-pointer">
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
                                            Drużyny: {tournament.registered_teams ?? 0}
                                            {tournament.amount_of_teams != null
                                                ? ` / ${tournament.amount_of_teams}`
                                                : ""}
                                        </span>
                                    </div>
                                </article>
                                {tournamentUrl && (
                                    <a
                                        href={tournamentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Otwórz stronę turnieju ${tournament.name}`}
                                        className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

export default Tournaments;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import squadIcon from "../assets/squad.svg";
import clockIcon from "../assets/clock.svg";
import dblArrow from "../assets/double-right-arrow.svg";
import partner from "../assets/partner.svg";
import PartnerCard from "../components/PartnerCard";
import partners from "../data/partners";
import CoachBadge from "../components/CoachBadge";

const reducedPartners = [...partners]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

const getLogoUrl = (logo) => {
    if (!logo) return null;

    return supabase.storage.from("logos").getPublicUrl(logo).data.publicUrl;
};

const getTournamentDate = (tournament) => {
    const dateField = ["starts", "start_date", "starts_at", "start_time", "date", "time", "begin_at"]
        .find((field) => tournament[field]);

    if (!dateField) return null;

    const date = new Date(tournament[dateField]);
    return Number.isNaN(date.getTime()) ? null : date;
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

const LeftBar = () => {
    const [transfers, setTransfers] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [transfersError, setTransfersError] = useState("");
    const [tournamentsError, setTournamentsError] = useState("");

    useEffect(() => {
        let active = true;

        const loadSidebarData = async () => {
            setLoading(true);

            const [transfersResult, tournamentsResult] = await Promise.all([
                supabase
                    .from("transfers")
                    .select(`
                        player_id,
                        is_coach,
                        from_team:teams!transfers_from_id_fkey (
                            name,
                            logo
                        ),
                        to_team:teams!transfers_to_id_fkey (
                            name,
                            logo
                        ),
                        players!transfers_player_id_fkey (
                            name,
                            coach_teams:teams!teams_coach_id_fkey(id)
                        )
                    `)
                    .order("created_at", { ascending: false })
                    .limit(5),
                supabase.from("tournaments").select("*"),
            ]);

            if (!active) return;

            if (transfersResult.error) {
                console.error("Error loading transfers:", transfersResult.error.message);
                setTransfersError("Nie udało się załadować transferów.");
            } else {
                setTransfersError("");
            }
            if (tournamentsResult.error) {
                console.error("Error loading tournaments:", tournamentsResult.error.message);
                setTournamentsError("Nie udało się załadować turniejów.");
            } else {
                setTournamentsError("");
            }

            setTransfers(transfersResult.data ?? []);
            setTournaments(tournamentsResult.data ?? []);
            setLoading(false);
        };

        loadSidebarData();
        window.addEventListener("transfers-updated", loadSidebarData);

        return () => {
            active = false;
            window.removeEventListener("transfers-updated", loadSidebarData);
        };
    }, []);

    const upcomingTournaments = useMemo(() => {
        const now = new Date();

        return tournaments
            .map((tournament) => ({ tournament, date: getTournamentDate(tournament) }))
            .filter(({ tournament, date }) => {
                if (!date) return true;

                const endDate = tournament.end_date ? new Date(tournament.end_date) : date;
                return endDate >= now;
            })
            .sort((first, second) => {
                if (!first.date) return 1;
                if (!second.date) return -1;
                return first.date - second.date;
            })
            .slice(0, 5);
    }, [tournaments]);

    const formatTournamentDate = (date) => {
        if (!date) return "Termin do ustalenia";

        return new Intl.DateTimeFormat("pl-PL", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(date);
    };

    return (
        <aside className="min-w-0 space-y-4 p-3 sm:p-4">
            <section className="overflow-hidden border border-white/10 bg-bg">
                <Link
                    to="/transfers"
                    className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors hover:text-white"
                >
                    <img src={squadIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-60" />
                    TRANSFERY
                </Link>
                {loading ? (
                    <p className="px-4 py-5 text-sm text-gray-400">Ładowanie transferów...</p>
                ) : transfersError ? (
                    <p role="status" className="px-4 py-5 text-sm text-red-300">{transfersError}</p>
                ) : transfers.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-400">Brak ostatnich transferów.</p>
                ) : (
                    <div className="grid gap-2 p-2">
                        {transfers.map((transfer, index) => (
                            <Link
                                to="/player"
                                state={{ id: transfer.player_id }}
                                key={`${transfer.player_id}-${index}`}
                                className="flex min-w-0 items-center gap-3 border border-white/[0.07] bg-white/[0.025] px-3 py-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-white/[0.04]">
                                    {getLogoUrl(transfer.from_team?.logo) ? (
                                        <img src={getLogoUrl(transfer.from_team.logo)} alt="" className="h-6 w-6 object-contain" />
                                    ) : (
                                        <span className="text-xs text-gray-500">—</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="flex min-w-0 items-center gap-2 text-xs font-semibold text-white">
                                        <span className="min-w-0 truncate">
                                            {transfer.players?.name ?? "Nieznany gracz"}
                                        </span>
                                        {(transfer.is_coach || transfer.players?.coach_teams?.length > 0) && <CoachBadge />}
                                    </p>
                                    <p className="truncate text-[11px] text-gray-500">
                                        {transfer.from_team?.name ?? "Bez drużyny"} <img src={dblArrow} alt="" aria-hidden="true" className="h-2 w-2 invert opacity-60" /> {transfer.to_team?.name ?? "Bez drużyny"}
                                    </p>
                                </div>
                                {getLogoUrl(transfer.to_team?.logo) ? (
                                    <img src={getLogoUrl(transfer.to_team.logo)} alt="" className="h-7 w-7 shrink-0 object-contain" />
                                ) : (
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-white/[0.04] text-xs text-gray-500">—</span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="overflow-hidden border border-white/10 bg-bg">
                <Link className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors" to="/tournaments">
                    <img src={clockIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-60" />
                    Nadchodzące turnieje
                </Link>
                {loading ? (
                    <p className="px-4 py-5 text-sm text-gray-400">Ładowanie turniejów...</p>
                ) : tournamentsError ? (
                    <p role="status" className="px-4 py-5 text-sm text-red-300">{tournamentsError}</p>
                ) : upcomingTournaments.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-400">Brak nadchodzących turniejów.</p>
                ) : (
                    <div className="grid gap-2 p-2">
                        {upcomingTournaments.map(({ tournament, date }) => {
                            const url = getTournamentUrl(tournament.link);
                            const content = (
                                <>
                                    <p className="truncate text-sm font-semibold text-white">
                                        {tournament.name ?? tournament.title ?? "Turniej"}
                                    </p>
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                        <img src={clockIcon} alt="" aria-hidden="true" className="h-3 w-3 invert opacity-50" />
                                        {formatTournamentDate(date)}
                                    </p>
                                </>
                            );

                            return (
                                <a key={tournament.id} href={tournament.link} className="transition-all hover:bg-white/[0.05] hover:cursor-pointer">
                                    {url ? (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block border border-white/[0.07] bg-white/[0.025] px-3 py-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
                                        >
                                            {content}
                                        </a>
                                    ) : (
                                        <div className="border border-white/[0.07] bg-white/[0.025] px-3 py-3">{content}</div>
                                    )}
                                </a>
                            );
                        })}
                    </div>
                )}
            </section>
            <section className="overflow-hidden border border-white/10 bg-bg">
                <h2 className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-300">
                    <img src={partner} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-60" />
                    <Link to="/partners" className="text-gray-400 transition-colors hover:text-white">
                        Partnerzy
                    </Link>
                </h2>
                <div className="grid gap-2 p-2">
                    {reducedPartners.map((partnerInfo) => (
                        <PartnerCard key={partnerInfo.name} partner={partnerInfo} compact />
                    ))}
                </div>
            </section>
        </aside>
    );
};

export default LeftBar;

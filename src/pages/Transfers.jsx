import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import dblArrow from "../assets/double-right-arrow.svg";
import squadIcon from "../assets/squad.svg";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 25;

const Transfers = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        let active = true;

        const loadTransfers = async () => {
            setLoading(true);
            setError("");

            const { data, error: queryError } = await supabase
                .from("transfers")
                .select(`
                    id,
                    player_id,
                    created_at,
                    from_team:teams!transfers_from_id_fkey (
                        name,
                        logo
                    ),
                    to_team:teams!transfers_to_id_fkey (
                        name,
                        logo
                    ),
                    players!transfers_player_id_fkey (
                        name
                    )
                `)
                .order("created_at", { ascending: false });

            if (!active) return;

            if (queryError) {
                console.error("Error loading transfers:", queryError.message);
                setError("Nie udało się załadować transferów.");
            } else {
                setTransfers(data ?? []);
            }

            setLoading(false);
        };

        loadTransfers();
        window.addEventListener("transfers-updated", loadTransfers);

        return () => {
            active = false;
            window.removeEventListener("transfers-updated", loadTransfers);
        };
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
    const pageCount = Math.ceil(transfers.length / PAGE_SIZE);
    const pageTransfers = transfers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <section className="my-6 overflow-hidden bg-bg">
            <header className="flex items-center gap-3 bg-[#202329] px-4 py-4 sm:px-6">
                <img src={squadIcon} alt="" aria-hidden="true" className="h-5 w-5 invert opacity-70" />
                <div>
                    <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                        Historia transferów
                    </h1>
                </div>
            </header>

            {loading ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Ładowanie transferów...</p>
            ) : error ? (
                <p role="status" className="px-4 py-8 text-center text-sm text-red-300">{error}</p>
            ) : transfers.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Brak zapisanych transferów.</p>
            ) : (
                <ul className="divide-y divide-white/5">
                    {pageTransfers.map((transfer, index) => {
                        const fromLogo = getLogoUrl(transfer.from_team?.logo);
                        const toLogo = getLogoUrl(transfer.to_team?.logo);

                        return (
                            <li key={transfer.id ?? `${transfer.player_id}-${transfer.created_at}-${index}`}>
                                <Link
                                    to="/player"
                                    state={{ id: transfer.player_id }}
                                    className="flex min-w-0 items-center gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:gap-5 sm:px-6"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-black/30">
                                        {fromLogo ? (
                                            <img src={fromLogo} alt="" className="h-7 w-7 object-contain" />
                                        ) : (
                                            <span className="text-xs text-gray-500">—</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-white">
                                            {transfer.players?.name ?? "Nieznany gracz"}
                                        </p>
                                        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-gray-400">
                                            <span>{transfer.from_team?.name ?? "Bez drużyny"}</span>
                                            <img src={dblArrow} alt="" aria-hidden="true" className="h-2 w-2 shrink-0 invert opacity-60" />
                                            <span>{transfer.to_team?.name ?? "Bez drużyny"}</span>
                                        </p>
                                    </div>
                                    {toLogo ? (
                                        <img src={toLogo} alt="" className="h-9 w-9 shrink-0 object-contain" />
                                    ) : (
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-black/30 text-xs text-gray-500">—</span>
                                    )}
                                    <time className="hidden shrink-0 text-right text-xs text-gray-500 sm:block">
                                        {formatDate(transfer.created_at)}
                                    </time>
                                </Link>
                                <time className="block px-4 pb-3 text-xs text-gray-500 sm:hidden">
                                    {formatDate(transfer.created_at)}
                                </time>
                            </li>
                        );
                    })}
                </ul>
            )}
            {!loading && !error && transfers.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    pageCount={pageCount}
                    itemCount={pageTransfers.length}
                    onPageChange={setCurrentPage}
                />
            )}
        </section>
    );
};

export default Transfers;

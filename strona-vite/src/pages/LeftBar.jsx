
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const LeftBar = () => {
    const [transfers, setTransfers] = useState([]);

    const arrowRightUrl = supabase.storage
        .from("icons")
        .getPublicUrl("arrow-right.svg").data.publicUrl;

    useEffect(() => {
        const loadRecentTransfers = async () => {
            const { data, error } = await supabase
                .from("transfers")
                .select(`
          player_id,
          from_id,
          to_id,
          created_at,
          players!transfers_player_id_fkey (
            name
          ),
          from_team:teams!transfers_from_id_fkey (
            name,
            logo
          ),
          to_team:teams!transfers_to_id_fkey (
            name,
            logo
          )
        `)
                .order("created_at", { ascending: false })
                .limit(5);

            if (error) {
                console.error("Error loading transfers:", error.message);
                return;
            }

            setTransfers(data ?? []);
        };

        loadRecentTransfers();
    }, []);

    const getLogoUrl = (logo) => {
        if (!logo) return null;

        return supabase.storage
            .from("logos")
            .getPublicUrl(logo)
            .data.publicUrl;
    };

    return (
        <aside className="w-fit p-4">
            <h2 className="text-xl font-bold text-white mb-4">
                Recent Transfers
            </h2>

            <div className="space-y-3">
                {transfers.length === 0 ? (
                    <p className="text-sm text-gray-400">
                        No recent transfers.
                    </p>
                ) : (
                    transfers.map((transfer, index) => (
                        <div
                            key={`${transfer.player_id}-${transfer.created_at}-${index}`}
                            className="rounded-lg bg-bg-light p-4 text-white shadow-md"
                        >
                            <p className="font-bold text-center">
                                {transfer.players?.name ?? "Unknown player"}
                            </p>
                            <div className="flex flex-row justify-center">
                                <div className="flex items-center gap-2 text-sm">
                                    {transfer.from_team?.logo && (
                                        <img
                                            src={getLogoUrl(transfer.from_team.logo)}
                                            alt={transfer.from_team.name ?? "Previous team"}
                                            className="w-6 h-6 object-contain"
                                        />
                                    )}

                                    <img
                                        src={arrowRightUrl}
                                        alt="to"
                                        className="invert w-5 h-5"
                                    />

                                    {transfer.to_team?.logo && (
                                        <img
                                            src={getLogoUrl(transfer.to_team.logo)}
                                            alt={transfer.to_team.name ?? "New team"}
                                            className="w-6 h-6 object-contain"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
};

export default LeftBar;
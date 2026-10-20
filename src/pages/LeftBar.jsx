
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom"

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

    const noTeamUrl = supabase.storage.from("icons").getPublicUrl("none.svg").data.publicUrl;

    return (
        <aside className="w-full min-w-0 p-3 sm:p-4">
            {/* <div className="space-y-3">
                {transfers.length === 0 ? (
                    <p className="text-sm text-gray-400">
                        No recent transfers.
                    </p>
                ) : (
                    transfers.map((transfer, index) => (

                        <div
                            key={`${transfer.player_id}-${transfer.created_at}-${index}`}
                            className="rounded-md border-2 border-red-700 p-4 text-white shadow-md flex flex-row justify-between"
                        >
                            {transfer.from_team?.logo && (
                                <img
                                    src={getLogoUrl(transfer.from_team.logo)}
                                    alt={transfer.from_team.name ?? "Previous team"}
                                    className="w-15 h-15 object-contain"
                                />
                            )}
                            {!transfer.from_team?.logo && (
                                <img
                                    src={noTeamUrl}
                                    alt="Previous team"
                                    className="w-15 h-15 object-contain invert"
                                />
                            )}
                            <div className="flex flex-col items-center">
                                <p className="font-bold text-center">
                                    {transfer.players?.name ?? "Unknown player"}
                                </p>
                                <img
                                    src={arrowRightUrl}
                                    alt="to"
                                    className="invert w-8 h-8"
                                />
                            </div>
                            {transfer.to_team?.logo && (
                                <img
                                    src={getLogoUrl(transfer.to_team.logo)}
                                    alt={transfer.to_team.name ?? "New team"}
                                    className="w-15 h-15 object-contain"
                                />
                            )}
                            {!transfer.to_team?.logo && (
                                <img
                                    src={noTeamUrl}
                                    alt="New team"
                                    className="w-15 h-15 object-contain invert"
                                />
                            )}

                        </div>

                    ))
                )}
            </div> */}
            <h1 className="mt-2 mb-4 text-lg font-bold text-white sm:mt-4 sm:text-xl">Ostatnie transfery:</h1>
            <div>
                {transfers.length === 0 ? (
                    <p className="text-white">No transfers found</p>
                ) : (


                    transfers.map((transfer, index) => (
                        <Link to="/player" state={{ id: transfer.player_id }} key={index}>
                            <div className="flex w-full min-w-0 flex-row items-center justify-between gap-2 border-b-2 border-red-700 bg-bg p-3 hover:bg-bg-light sm:gap-4 sm:p-4" key={index}>
                                {transfer.from_team?.logo && (
                                    <img
                                        src={getLogoUrl(transfer.from_team.logo)}
                                        alt={transfer.from_team.name ?? "Previous team"}
                                        className="h-6 w-6 shrink-0 object-contain"
                                    />
                                )}
                                {!transfer.from_team?.logo && (
                                    <img
                                        src={noTeamUrl}
                                        alt="Previous team"
                                        className="h-6 w-6 shrink-0 object-contain invert"
                                    />
                                )}
                                <div className="flex min-w-0 flex-col items-center">
                                    <p className="max-w-full truncate text-center font-bold text-white">
                                        {transfer.players?.name ?? "Unknown player"}
                                    </p>
                                    {/* <img
                                    src={arrowRightUrl}
                                    alt="to"
                                    className="invert w-6 h-6"
                                /> */}
                                </div>
                                {transfer.to_team?.logo && (
                                    <img
                                        src={getLogoUrl(transfer.to_team.logo)}
                                        alt={transfer.to_team.name ?? "New team"}
                                        className="h-6 w-6 shrink-0 object-contain"
                                    />
                                )}
                                {!transfer.to_team?.logo && (
                                    <img
                                        src={noTeamUrl}
                                        alt="New team"
                                        className="h-6 w-6 shrink-0 object-contain invert"
                                    />
                                )}
                            </div>
                        </Link>
                    ))
                )
                }
            </div>
        </aside>
    );
};

export default LeftBar;
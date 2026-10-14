import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useState, useEffect } from "react";

const Player = () => {
    const location = useLocation();
    const id = location.state?.id;
    const [player, setPlayer] = useState({});
    const [error, setError] = useState("");
    const [transfer, setTransfer] = useState({});
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        async function fetchUser() {
            const { data, error } = await supabase
                .from("players")
                .select(`
                    id,
                    name,
                    team_history,
                    created_at,
                    steam_profile,
                    current_team:teams!players_current_team_fkey (
                        name,
                        logo
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                setError(error.message)
            } else {
                setPlayer(data ?? {})
                setError("")
            }
        }

        fetchUser();
    }, [id])

    useEffect(() => {
        async function fetchTransfer() {
            const { data, error } = await supabase
                .from("transfers")
                .select("created_at")
                .eq("player_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) {
                setError(error.message)
            } else {
                setTransfer(data ?? {})
                setError("")
            }
        }
        fetchTransfer()
    }, [])

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase
                .from("teams")
                .select("*")


            if (error) {
                setError(error.message)
            } else {
                setTeams(data ?? [])
                setError("")
            }
        }

        fetchTeams();
    }, [])


    const teamHistory = (player.team_history ?? [])
        .map((teamId) =>
            teams.find((team) => team.id === Number(teamId))
        )
        .filter(Boolean);

    if (error) {
        console.log(error)
    }
    const profileUrl = supabase.storage.from("icons").getPublicUrl("profile-default.svg").data.publicUrl;
    const teamLogo = player.current_team?.logo
        ? supabase.storage
            .from("logos")
            .getPublicUrl(player.current_team.logo).data.publicUrl
        : null;

    return (
        <div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] w-full gap-4 mt-4 mb-4">
                <div className="border-2 border-red-700 rounded-md">
                    <h1 className="text-2xl text-center font-bold text-white p-4 bg-red-700">
                        Profil
                    </h1>
                    <div className="flex flex-col items-center">
                        {teamLogo && (
                            <img
                                src={teamLogo}
                                alt={`Logo drużyny ${player.current_team?.name ?? ""}`}
                                className="w-30 h-30 rounded-full mb-6 mt-6"
                            />
                        )}
                        {!teamLogo && (
                            <img
                                src={profileUrl}
                                alt={`Logo drużyny ${player.current_team?.name ?? ""}`}
                                className="w-30 h-30 rounded-full mb-6 mt-6 invert"
                            />
                        )}
                        <hr className="text-red-700 w-full"></hr>
                        <h1 className="text-4xl font-bold mb-4 text-white self-start ms-4 mt-4">{player.name}</h1>
                        <hr className="text-red-700 w-full"></hr>
                        <table className="border-separate border-spacing-4 w-full">
                            <tr>
                                <td className="text-text text-xl">Drużyna</td>
                                <td>
                                    {!player.current_team && (
                                        <h2 className="text-white text-xl">Brak</h2>
                                    )}
                                    {player.current_team && (
                                        <h2 className="text-white text-xl text-end">{player.current_team.name}</h2>
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <td className="text-text text-xl">Od</td>
                                <td className="text-end">
                                    {transfer.created_at && (
                                        <h2 className="text-white text-xl">{new Date(transfer.created_at).toLocaleDateString("pl-PL")}</h2>
                                    )
                                    }
                                    {!transfer.created_at && (
                                        <h2 className="text-white text-xl">{new Date(player.created_at).toLocaleDateString("pl-PL")}</h2>
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <td className="text-text text-xl">Steam</td>
                                <td className="text-end">
                                    {player.steam_profile && (
                                        <a href={player.steam_profile}><h2 className="text-white text-xl">Link</h2></a>
                                    )
                                    }
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div className="border-2 border-red-700 rounded-md">
                    <h1 className="text-2xl font-bold text-white p-4 bg-red-700 text-center">
                        Statystyki
                    </h1>
                </div>
                <div className="border-2 border-red-700 rounded-md">
                    <h1 className="text-2xl font-bold text-white p-4 bg-red-700 text-center">
                        Historia
                    </h1>

                    <div className="p-4 space-y-4">
                        {teamHistory.length > 0 ? (
                            teamHistory.map((team, index) => {
                                const logoUrl = team.logo
                                    ? supabase.storage
                                        .from("logos")
                                        .getPublicUrl(team.logo).data.publicUrl
                                    : null;

                                return (
                                    <div
                                        key={`${team.id}-${index}`}
                                        className="flex items-center gap-3 text-white"
                                    >
                                        {logoUrl && (
                                            <img
                                                src={logoUrl}
                                                alt={`Logo ${team.name}`}
                                                className="w-12 h-12 object-contain"
                                            />
                                        )}

                                        <span className="text-lg font-semibold">
                                            {team.name}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-white text-center p-4">
                                Brak historii drużyn.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Player;
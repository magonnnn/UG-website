import { Link, useLocation } from "react-router-dom";
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
            if (id == null) {
                setError("Nie podano ID gracza.");
                return;
            }

            const { data, error } = await supabase
                .from("players")
                .select(`
                id,
                name,
                team_history,
                created_at,
                steam_profile,
                current_team:teams!players_current_team_fkey (
                    id,
                    name,
                    logo
                )
            `)
                .eq("id", id)
                .single();

            if (error) {
                setError(error.message);
            } else {
                setPlayer(data ?? {});
                setError("");
            }
        }

        fetchUser();
    }, [id]);

    useEffect(() => {
        async function fetchTransfer() {
            if (id == null) {
                setTransfer({});
                return;
            }

            const { data, error } = await supabase
                .from("transfers")
                .select("created_at")
                .eq("player_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                setError(error.message);
            } else {
                setTransfer(data ?? {});
            }
        }

        fetchTransfer();
    }, [id]);

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
            <div className="mt-4 mb-4 grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)]">
                <div className="border-2 border-red-700 rounded-md">
                    <h1 className="text-2xl text-center font-bold text-white p-4 bg-red-700">
                        Profil
                    </h1>
                    <div className="flex flex-col items-center">
                        {player.current_team ? (
                            <Link to="/team" state={{ id: player.current_team.id }}>
                                {teamLogo ? (
                                    <img
                                        src={teamLogo}
                                        alt={`Logo drużyny ${player.current_team.name}`}
                                        className="w-30 h-30 rounded-full mb-6 mt-6"
                                    />
                                ) : (
                                    <img
                                        src={profileUrl}
                                        alt={`Logo drużyny ${player.current_team.name}`}
                                        className="w-30 h-30 rounded-full mb-6 mt-6 invert"
                                    />
                                )}
                            </Link>
                        ) : (
                            <img
                                src={profileUrl}
                                alt="Brak drużyny"
                                className="w-30 h-30 rounded-full mb-6 mt-6 invert"
                            />
                        )}
                        <hr className="text-red-700 w-full"></hr>
                        <h1 className="mt-4 mb-4 self-start break-words px-4 text-3xl font-bold text-white sm:text-4xl">{player.name}</h1>
                        <hr className="text-red-700 w-full"></hr>
                        <table className="border-separate border-spacing-4 w-full">
                            <tr>
                                <td className="text-text text-xl">Drużyna</td>
                                <td>
                                    {!player.current_team && (
                                        <h2 className="text-white text-xl">Brak</h2>
                                    )}
                                    {player.current_team && (
                                        <Link to="/team" state={{ id: player.current_team.id }}>
                                            <h2 className="text-white text-xl text-end">{player.current_team.name}</h2>
                                        </Link>
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
                                    <Link
                                        to="/team"
                                        state={{ id: team.id }}
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
                                    </Link>
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
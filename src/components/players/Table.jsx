
import Row from "./Row.jsx";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const Table = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase
                .from("teams")
                .select(`
                        id,
                        name,
                        logo,
                        roster
                    `);

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
            }

            setLoading(false);
        }

        fetchTeams();
    }, []);

    useEffect(() => {
        async function fetchPlayers() {
            const { data, error } = await supabase
                .from("players")
                .select(`
id,
    name,
    current_team: teams!players_current_team_fkey(
        name
    )
        `);

            if (error) {
                setError(error.message);
            } else {
                setPlayers(data ?? []);
            }

            setLoading(false);
        }

        fetchPlayers();
    }, []);

    return (
        <div>
            <form className="mt-4 flex w-full flex-col gap-2 px-1 sm:px-0">
                <label
                    htmlFor="search"
                    className="text-white"
                >
                    Wyszukaj gracza
                </label>

                <input
                    type="text"
                    id="search"
                    placeholder="Wyszukaj gracza..."
                    className="w-full min-w-0 rounded-md border border-gray-300 p-2 text-white"
                />

                <label
                    htmlFor="team-select"
                    className="mt-2 text-white sm:mt-0"
                >
                    Wybierz drużynę
                </label>

                <select
                    className="w-full min-w-0 rounded-md border border-gray-300 p-2 text-white"
                    id="team-select"
                >
                    <option value="">Wszystkie drużyny</option>

                    {users.map((user) => (
                        <option key={user.id} value={user.team_id}>
                            {user.teams?.name}
                        </option>
                    ))}
                </select>
            </form>

            <table className="mt-2 w-full table-auto border-separate border-spacing-y-3 sm:border-spacing-y-4">
                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan="2">Loading users...</td>
                        </tr>
                    )}

                    {error && (
                        <tr>
                            <td colSpan="2">
                                Error loading users: {error}
                            </td>
                        </tr>
                    )}

                    {!loading && !error && players.length === 0 && (
                        <tr>
                            <td colSpan="2">No players found</td>
                        </tr>
                    )}

                    {!loading &&
                        !error &&
                        players.map((player) => (
                            <Row
                                key={player.id}
                                name={player.name}
                                team={player.current_team?.name}
                                id={player.id}
                            />
                        ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
import Row from "./Row.jsx"
import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabaseClient";
const Table = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([])
    const [players, setPlayers] = useState([])

    useEffect(() => {
        async function fetchUsers() {
            const { data, error } = await supabase
                .from("users")
                .select(`
                id,
                name,
                avatar_url,
                team_id,
                teams (
                    name,
                    logo,
                    roster
                )
            `)

            if (error) {
                setError(error.message);
            } else {
                setUsers(data ?? []);
            }

            setLoading(false);
        }

        fetchUsers();
    }, []);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase
                .from("teams")
                .select(`
                id,
                name,
                logo,
                roster
            `)

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
            }

            setLoading(false);
        }

        fetchTeams();
    }, []);

<<<<<<< HEAD

=======
>>>>>>> db943ae343079f50ee5d298376690d6e2632a857
    useEffect(() => {
        async function fetchPlayers() {
            const { data, error } = await supabase
                .from("players")
                .select(`
<<<<<<< HEAD
        id,
        name,
        current_team:teams!players_current_team_fkey (
          name
        )
      `);
=======
                id,
                name,
                current_team
            `)
>>>>>>> db943ae343079f50ee5d298376690d6e2632a857

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
            <form className="w-full px-4 mt-4">
                <label htmlFor="search" className="text-white me-4">Wyszukaj gracza</label>
                <input type="text" id="search" placeholder="Wyszukaj gracza..." className="rounded-md border border-gray-300 p-2 text-white" />
                <label htmlFor="team-select" className="text-white ms-4 me-4">Wybierz drużynę</label>
                <select className="rounded-md border border-gray-300 text-white p-2" id="team-select">
                    <option value="">Wszystkie drużyny</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.team_id}>{user.teams?.name}</option>
                    ))}
                </select>
            </form>
            <table className="table-auto w-full border-separate border-spacing-y-4 px-4">
                <tbody>
                    {loading && (<tr>
                        <td colSpan="2">Loading users...</td>
                    </tr>
                    )}
                    {error && (<tr>
                        <td colSpan="2">Error loading users: {error}</td>
                    </tr>
                    )}
                    {!loading && !error && users.length === 0 && (<tr>
                        <td colSpan="2">No users found</td>
                    </tr>
                    )}
                    {!loading && !error && players.map((player) => (

                        <Row
                            key={player.id}
                            name={player.name}
<<<<<<< HEAD
                            team={player.current_team?.name}
=======
                            team={player.current_team}
>>>>>>> db943ae343079f50ee5d298376690d6e2632a857
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default Table;
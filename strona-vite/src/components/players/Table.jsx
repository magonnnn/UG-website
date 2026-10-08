import Row from "./Row.jsx"
import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabaseClient";
const Table = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

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
                    ranking
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
                    {!loading && !error && users.map((user) => (

                        <Row
                            key={user.id}
                            name={user.name}
                            team={user.teams?.name}
                            avatar={user.avatar_url}
                            ranking={user.teams?.ranking}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default Table;
import Row from "./Row.jsx"
import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabaseClient";
const Table = () => {

    const [teams, setTeams] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase.from("teams").select("*").order("ranking", { ascending: true });

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
            }

            setLoading(false);
        }

        fetchTeams();
    }, []);

    return (
        <table className="table-auto w-full border-separate border-spacing-y-4 px-4 border-spacing-x-3">
            <thead>
                <tr>
                    <th className="text-white text-start bg-bg rounded-lg p-6">Team Name</th>
                    <th className="text-white text-start bg-bg rounded-lg p-6">Roster</th>
                    <th className="text-white bg-bg rounded-lg p-6">Ranking</th>
                </tr>
            </thead>
            <tbody>
                {loading && (<tr>
                    <td colSpan="2">Loading teams...</td>
                </tr>
                )}
                {error && (<tr>
                    <td colSpan="2">Error loading teams: {error}</td>
                </tr>
                )}
                {!loading && !error && teams.length === 0 && (<tr>
                    <td colSpan="2">No teams found</td>
                </tr>
                )}
                {!loading && !error && teams.map((team) => (

                    <Row key={team.id} team={team.name} ranking={team.ranking} roster={team.roster} />
                ))}
            </tbody>
        </table>
    )
}

export default Table;
import Row from "./Row.jsx"
import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabaseClient";
const Table = () => {

    const [teams, setTeams] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [filterInput, setFilterInput] = useState("")

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase.from("teams").select("*").order("points", { ascending: false });

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
            }

            setLoading(false);
        }

        fetchTeams();
    }, []);

    const updateDisplay = (value) => {
        setFilterInput(value)
    }

    return (
        <div>
            <form className="w-full px-4 mt-4">
                <label htmlFor="search" className="text-white me-4">Wyszukaj drużynę</label>
                <input type="text" id="search" onChange={(event) => updateDisplay(event.target.value)} placeholder="Wyszukaj drużynę..." className="rounded-md border border-gray-300 p-2 text-white" />
            </form>
            <table className="table-auto w-full border-separate border-spacing-y-4 px-4">
                <tbody>
                    {loading && (<tr>
                        <td colSpan="2">Loading teams...</td>
                    </tr>
                    )}
                    {error && (<tr>
                        <td colSpan="2">Error loading teams: {error}</td>
                    </tr>
                    )}

                    {!loading && !error && teams.length === 0 && (
                        <tr>
                            <td colSpan="2">No teams found</td>
                        </tr>
                    )}

                    {!loading && !error && teams
                        .filter((team) =>
                            team.name.toLowerCase().includes((filterInput ?? "").toLowerCase())
                        )
                        .map((team, i) => (
                            <Row
                                key={team.id}
                                id={team.id}
                                ite={i}
                                team={team.name}
                                points={team.points}
                                roster={team.roster}
                                logo={
                                    team.logo
                                        ? supabase.storage
                                            .from("logos")
                                            .getPublicUrl(team.logo).data.publicUrl
                                        : null
                                }
                            />
                        ))}
                </tbody>
            </table>
        </div>
    )
}

export default Table;
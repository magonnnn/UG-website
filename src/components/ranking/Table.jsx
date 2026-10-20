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
            <form className="mt-4 flex w-full flex-col gap-2 px-1 sm:flex-row sm:items-center sm:px-0">
                <label htmlFor="search" className="text-white">Wyszukaj drużynę</label>
                <input type="text" id="search" onChange={(event) => updateDisplay(event.target.value)} placeholder="Wyszukaj drużynę..." className="w-full min-w-0 rounded-md border border-gray-300 p-2 text-white sm:max-w-sm" />
            </form>
            <table className="mt-2 w-full table-auto border-separate border-spacing-y-3 sm:border-spacing-y-4">
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
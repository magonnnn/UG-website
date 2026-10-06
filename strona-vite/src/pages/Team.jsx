import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
const Team = () => {
    const location = useLocation();
    const team = location.state?.team;


    const [teams, setTeams] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase.from("teams").select("*").eq("name", team);

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
            }

            setLoading(false);
        }

        fetchTeams();
    }, [team]);

    const roster = teams[0]?.roster ?? [];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">{team}</h1>
            <div className="flex flex-row flex-wrap gap-4">
                {roster.map((player, i) => { return <div key={i}>{player}</div> })}
            </div>
        </div>
    )
}

export default Team;
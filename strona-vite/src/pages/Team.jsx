import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
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

    const profileUrl = supabase.storage.from("icons").getPublicUrl("profile-default.svg").data.publicUrl;
    const logoUrl = teams[0]?.logo
        ? supabase.storage
            .from("logos")
            .getPublicUrl(teams[0].logo).data.publicUrl
        : null;

    const roster = teams[0]?.roster ?? [];

    return (
        <div>
            <div className="flex flex-row align-center">
                <img src={logoUrl} alt={`${team} logo`} className="w-16 h-16 mb-2 invert" />
                <h1 className="text-3xl font-bold mb-4 text-white">{team}</h1>
            </div>
            <div className="grid grid-cols-5 gap-4">
                {roster.map((player, i) => {
                    return <div key={i} className="bg-bg-light text-white rounded-md shadow-md text-center font-bold hover:bg-rose-800 transition-colors rounded-md shadow-md flex flex-col items-center justify-center hover:scale-95 transition-transform hover:cursor-pointer">
                        <Link to="/player" state={{ player }} className="w-full flex flex-col items-center justify-center">
                            <img src={profileUrl} alt={`${player} avatar`} className="w-30 h-30 rounded-full mb-2 invert mb-6 mt-6" />
                            <p className="font-bold bg-white text-black w-full p-4">{player}</p>
                        </Link>
                    </div>
                })}
            </div>
        </div>
    )
}

export default Team;
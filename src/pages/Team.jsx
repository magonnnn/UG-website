import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
const Team = () => {
    const location = useLocation();
    const teamId = location.state?.id;

    const [teams, setTeams] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase.from("teams").select("*").eq("id", teamId);

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
            }

            setLoading(false);
        }

        fetchTeams();
    }, [teamId]);

    const profileUrl = supabase.storage.from("icons").getPublicUrl("profile-default.svg").data.publicUrl;
    const logoUrl = teams[0]?.logo
        ? supabase.storage
            .from("logos")
            .getPublicUrl(teams[0].logo).data.publicUrl
        : null;

    const roster = teams[0]?.roster ?? [];


    return (
        <div className="mt-4 mb-4 grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)]">
            <div className="border-2 border-red-700 rounded-md">
                <h1 className="text-2xl font-bold text-white p-4 bg-red-700 text-center">
                    Profil
                </h1>
                <div className="flex flex-col items-center">
                    <img src={logoUrl} alt={`${teamId} logo`} className="w-30 h-30 rounded-full mb-6 mt-6" />
                    <hr className="text-red-700 w-full"></hr>
                    <h1 className="text-3xl font-bold mb-4 text-white mt-4">{teams[0]?.name}</h1>
                </div>
                <hr className="text-red-700 w-full"></hr>
            </div>
            <div className="border-2 border-red-700 rounded-md">
                <h1 className="text-2xl font-bold text-white p-4 bg-red-700 text-center">
                    Mecze
                </h1>
            </div>
            <div className="border-2 border-red-700 rounded-md">
                <h1 className="text-2xl font-bold text-white p-4 bg-red-700 text-center">
                    Skład
                </h1>
                <div className="grid grid-rows-5">
                    {roster.map((player, i) => {
                        const playerId = teams[0]?.[`player${i + 1}`];

                        return <div key={i} className="bg-bg-light text-white text-center font-bold hover:bg-rose-800 transition-colors flex flex-col items-center justify-center hover:cursor-pointer">
                            <Link to="/player" state={{ id: playerId }} className="w-full flex flex-col items-center justify-center">
                                <img src={profileUrl} alt={`${player} avatar`} className="w-30 h-30 rounded-full mb-2 invert mb-6 mt-6" />
                                <p className="font-bold bg-white text-black w-full p-4">{player}</p>
                            </Link>
                        </div>
                    })}
                </div>
            </div>
        </div>
    )
}

export default Team;
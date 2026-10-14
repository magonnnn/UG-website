import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"
import { Link } from "react-router-dom";

const RightBar = () => {
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        const loadTopTeams = async () => {
            const { data, error } = await supabase
                .from("teams")
                .select(`
                    *
                `)
                .order("points", { ascending: false })
                .limit(5);

            if (error) {
                console.error("Error loading transfers:", error.message);
                return;
            }

            setTeams(data ?? []);
        };

        loadTopTeams();
    }, []);

    const getLogoUrl = (logo) => {
        if (!logo) return null;

        return supabase.storage
            .from("logos")
            .getPublicUrl(logo)
            .data.publicUrl;
    };

    return (
        <aside className="w-full p-4">
            <div className="">
                {teams.length === 0 ? (
                    <p className="text-white">No teams found</p>
                ) : (
                    teams.map((team, index) => (
                        <Link to="/team" state={team.id}>
                            <div className="w-full flex flex-row bg-bg border-b-2 border-red-700 hover:bg-bg-light" key={index}>
                                {team?.logo && (
                                    <div className="flex flex-row w-full p-4 space-x-4">
                                        <p className="text-white">{index}.</p>
                                        <img
                                            src={getLogoUrl(team.logo)}
                                            alt={team.name ?? "Previous team"}
                                            className="w-6 h-6 object-contain"
                                        />
                                        <p className="text-white">{team.name}</p>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))
                )
                }
            </div>
        </aside>
    )
}

export default RightBar;
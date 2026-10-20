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
        <aside className="w-full min-w-0 p-3 sm:p-4">
            <h1 className="mt-2 mb-4 text-lg font-bold text-white sm:mt-4 sm:text-xl">Ranking Podziemia:</h1>
            <div>
                {teams.length === 0 ? (
                    <p className="text-white">No teams found</p>
                ) : (
                    teams.map((team, index) => (
                        <Link to="/team" state={{ id: team.id }} key={team.id}>
                            <div className="flex w-full min-w-0 flex-row border-b-2 border-red-700 bg-bg hover:bg-bg-light">
                                {team?.logo && (
                                    <div className="flex w-full min-w-0 flex-row items-center gap-3 p-3 sm:p-4">
                                        <p className="shrink-0 text-white">{index + 1}.</p>
                                        <img
                                            src={getLogoUrl(team.logo)}
                                            alt={team.name ?? "Previous team"}
                                            className="h-6 w-6 shrink-0 object-contain"
                                        />
                                        <p className="min-w-0 truncate text-white">{team.name}</p>
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
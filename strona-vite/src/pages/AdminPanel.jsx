import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AdminPanel = () => {
    const [sendStatus, setSendStatus] = useState(false)
    const [teams, setTeams] = useState([]);
    const [roster, setRoster] = useState([]);
    const [rosterInputs, setRosterInputs] = useState({
        player1: "",
        player2: "",
        player3: "",
        player4: "",
        player5: ""
    })
    const [selectedTeam, setSelectedTeam] = useState("")

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase
                .from("teams")
                .select("*")
                .order("ranking", { ascending: true });

            if (error) {
                console.error("Error loading teams:", error.message);
            } else {
                setTeams(data ?? []);
            }
        }

        fetchTeams();
    }, []);

    const changePlayers = (event) => {
        setSendStatus(false)
        const selectedTeam2 = teams.find(
            (team) => team.name === event.target.value
        );

        setSelectedTeam(selectedTeam2?.name ?? "");

        const newRoster = selectedTeam2?.roster ?? [];

        setRoster(newRoster);

        setRosterInputs({
            player1: newRoster[0] ?? "",
            player2: newRoster[1] ?? "",
            player3: newRoster[2] ?? "",
            player4: newRoster[3] ?? "",
            player5: newRoster[4] ?? ""
        });
    };

    const handlePlayerInputChange = (event, i) => {
        setRosterInputs({
            ...rosterInputs,
            [`player${i + 1}`]: event.target.value
        });
    };

    const updateDatabase = async (event) => {
        event.preventDefault();

        const sendRoster = Object.values(rosterInputs)


        const { error } = await supabase
            .from("teams")
            .update({ roster: sendRoster })
            .eq('name', selectedTeam)
        setSendStatus(true)
    }

    const removeTeam = async (event) => {
        const { error } = await supabase
            .from("teams")
            .delete("*")
            .eq("name", selectedTeam)
        setSendStatus(true)
    }

    return (
        <div className="mx-4">
            <h1 className="text-2xl font-bold text-white mt-4">
                Edycja drużyny
            </h1>
            <hr className="text-white mt-4 mb-4" />
            <form onSubmit={updateDatabase}>
                <div className="mb-2 mt-2">
                    <label
                        htmlFor="team-select"
                        className="text-white"
                    >
                        Wybierz drużynę:
                    </label>

                    <select
                        id="team-select"
                        className="bg-primary rounded-md ms-4 text-white"
                        onChange={changePlayers}
                    >
                        <option>Wybierz drużynę</option>
                        {teams.map((team) => (
                            <option
                                key={team.id}
                                value={team.name}
                                className="text-white"
                            >
                                {team.name}
                            </option>
                        ))}
                    </select>

                </div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                    {!sendStatus ? (roster.map((player, i) => (
                        <input
                            type="text"
                            className="text-white border-2 border-white rounded-md text-center p-2 bg-bg-light focus:animate-pulse"
                            key={i}
                            value={rosterInputs[`player${i + 1}`]}
                            onChange={(event) => handlePlayerInputChange(event, i)}
                        />
                    ))) : null}
                </div>
                <button type="submit" className="hover:scale-95 transition-transform hover:cursor-pointer bg-primary p-2 rounded-md text-bold text-white">Zapisz</button>
                <button type="button" onClick={removeTeam} className="hover:scale-95 transition-transform hover:cursor-pointer bg-primary p-2 rounded-md text-bold text-white ms-4">Usuń drużynę</button>
                <hr className="text-white mt-4 mb-4" />
            </form>
            <h1 className="text-2xl font-bold text-white">
                Dodanie drużyny
            </h1>
        </div>
    );
};

export default AdminPanel;
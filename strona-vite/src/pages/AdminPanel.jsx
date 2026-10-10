import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const emptyRoster = {
    player1: "",
    player2: "",
    player3: "",
    player4: "",
    player5: "",
};

const emptyNewPlayers = {
    ...emptyRoster,
};

const AdminPanel = () => {
    const [teams, setTeams] = useState([]);
    const [rosterInputs, setRosterInputs] = useState(emptyRoster);
    const [newPlayers, setNewPlayers] = useState(emptyNewPlayers);

    const [newTeamName, setNewTeamName] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [updatedName, setUpdatedName] = useState("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    const loadTeams = useCallback(async () => {
        const { data, error } = await supabase
            .from("teams")
            .select("*")
            .order("ranking", { ascending: true });

        if (error) {
            console.error("Error loading teams:", error.message);
            setMessage(`Błąd ładowania drużyn: ${error.message}`);
            setMessageType("error");
            return false;
        }

        setTeams(data ?? []);
        return true;
    }, []);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const showMessage = (text, type) => {
        setMessage(text);
        setMessageType(type);
    };

    const resetEditor = () => {
        setSelectedTeam("");
        setUpdatedName("");
        setRosterInputs({ ...emptyRoster });
    };

    const changePlayers = (event) => {
        const teamName = event.target.value;
        const team = teams.find((item) => item.name === teamName);

        setSelectedTeam(team?.name ?? "");
        setUpdatedName(team?.name ?? "");

        const roster = team?.roster ?? [];

        setRosterInputs({
            player1: roster[0] ?? "",
            player2: roster[1] ?? "",
            player3: roster[2] ?? "",
            player4: roster[3] ?? "",
            player5: roster[4] ?? "",
        });

        setMessage("");
    };

    const handlePlayerInputChange = (event, index) => {
        const key = `player${index + 1}`;

        setRosterInputs((prev) => ({
            ...prev,
            [key]: event.target.value,
        }));
    };

    const handleNewPlayerChange = (event, index) => {
        const key = `player${index + 1}`;

        setNewPlayers((prev) => ({
            ...prev,
            [key]: event.target.value,
        }));
    };

    const updateDatabase = async (event) => {
        event.preventDefault();

        if (!selectedTeam) {
            showMessage("Najpierw wybierz drużynę.", "error");
            return;
        }

        const name = updatedName.trim();

        if (!name) {
            showMessage("Nazwa drużyny nie może być pusta.", "error");
            return;
        }

        if (
            teams.some(
                (team) =>
                    team.name.toLowerCase() === name.toLowerCase() &&
                    team.name !== selectedTeam
            )
        ) {
            showMessage("Drużyna o tej nazwie już istnieje.", "error");
            return;
        }

        setLoading(true);
        setMessage("");

        const roster = Object.values(rosterInputs).map((player) =>
            player.trim()
        );

        const { error } = await supabase
            .from("teams")
            .update({
                name,
                roster,
            })
            .eq("name", selectedTeam);

        if (error) {
            console.error("Error updating team:", error.message);
            showMessage(`Błąd zapisu: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        const refreshed = await loadTeams();

        if (refreshed) {
            setSelectedTeam(name);
            setUpdatedName(name);
            showMessage("Drużyna została zaktualizowana.", "success");
        }

        setLoading(false);
    };

    const removeTeam = async () => {
        if (!selectedTeam) {
            showMessage("Najpierw wybierz drużynę.", "error");
            return;
        }

        const confirmed = window.confirm(
            `Czy na pewno chcesz usunąć drużynę "${selectedTeam}"?`
        );

        if (!confirmed) return;

        setLoading(true);
        setMessage("");

        const { error } = await supabase
            .from("teams")
            .delete()
            .eq("name", selectedTeam);

        if (error) {
            console.error("Error deleting team:", error.message);
            showMessage(`Błąd usuwania: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        const refreshed = await loadTeams();

        if (refreshed) {
            resetEditor();
            showMessage("Drużyna została usunięta.", "success");
        }

        setLoading(false);
    };

    const addTeam = async (event) => {
        event.preventDefault();

        const name = newTeamName.trim();

        if (!name) {
            showMessage("Podaj nazwę nowej drużyny.", "error");
            return;
        }

        if (
            teams.some(
                (team) => team.name.toLowerCase() === name.toLowerCase()
            )
        ) {
            showMessage("Drużyna o tej nazwie już istnieje.", "error");
            return;
        }

        const roster = Object.values(newPlayers)
            .map((player) => player.trim())
            .filter(Boolean);

        setLoading(true);
        setMessage("");

        const { error } = await supabase
            .from("teams")
            .insert([
                {
                    name,
                    points: 0,
                    roster,
                },
            ]);

        if (error) {
            console.error("Error inserting team:", error.message);
            showMessage(`Błąd dodawania: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        const refreshed = await loadTeams();

        if (refreshed) {
            setNewTeamName("");
            setNewPlayers({ ...emptyNewPlayers });
            showMessage("Nowa drużyna została dodana.", "success");
        }

        setLoading(false);
    };

    const inputClass =
        "w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 bg-bg-light focus:animate-pulse";

    return (
        <div className="mx-4">
            <h1 className="text-2xl font-bold text-white mt-4">
                Edycja drużyny
            </h1>

            <hr className="text-white mt-4 mb-4" />

            {message && (
                <p
                    role="status"
                    aria-live="polite"
                    className={`mb-4 ${messageType === "error"
                        ? "text-red-400"
                        : "text-green-400"
                        }`}
                >
                    {message}
                </p>
            )}

            <form onSubmit={updateDatabase}>
                <div className="mb-4 mt-2">
                    <label
                        htmlFor="team-select"
                        className="text-white"
                    >
                        Wybierz drużynę:
                    </label>

                    <select
                        id="team-select"
                        value={selectedTeam}
                        onChange={changePlayers}
                        className="bg-primary rounded-md ms-4 text-white p-2"
                    >
                        <option value="">Wybierz drużynę</option>

                        {teams.map((team) => (
                            <option
                                key={team.id}
                                value={team.name}
                            >
                                {team.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedTeam && (
                    <>
                        <label
                            htmlFor="updated-name"
                            className="block text-white mb-2"
                        >
                            Nazwa drużyny
                        </label>

                        <input
                            id="updated-name"
                            type="text"
                            value={updatedName}
                            onChange={(event) =>
                                setUpdatedName(event.target.value)
                            }
                            className={`${inputClass} mb-4`}
                            required
                        />

                        <h2 className="text-white font-semibold mb-2">
                            Skład drużyny
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
                            {Object.values(rosterInputs).map(
                                (player, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        aria-label={`Gracz ${index + 1}`}
                                        placeholder={`Gracz ${index + 1}`}
                                        value={player}
                                        onChange={(event) =>
                                            handlePlayerInputChange(
                                                event,
                                                index
                                            )
                                        }
                                        className={inputClass}
                                    />
                                )
                            )}
                        </div>
                    </>
                )}

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={loading || !selectedTeam}
                        className="hover:scale-95 transition-transform bg-primary p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Przetwarzanie..." : "Zapisz"}
                    </button>

                    <button
                        type="button"
                        onClick={removeTeam}
                        disabled={loading || !selectedTeam}
                        className="hover:scale-95 transition-transform bg-primary p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Usuń drużynę
                    </button>
                </div>
            </form>

            <hr className="text-white mt-4 mb-4" />

            <h1 className="text-2xl font-bold text-white mb-4">
                Dodanie drużyny
            </h1>

            <form
                className="flex flex-col gap-3"
                onSubmit={addTeam}
            >
                <input
                    type="text"
                    name="teamName"
                    placeholder="Nazwa drużyny..."
                    value={newTeamName}
                    onChange={(event) =>
                        setNewTeamName(event.target.value)
                    }
                    className={inputClass}
                    required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {Object.values(newPlayers).map((player, index) => (
                        <input
                            key={index}
                            type="text"
                            placeholder={`Gracz ${index + 1}...`}
                            aria-label={`Nowy gracz ${index + 1}`}
                            value={player}
                            onChange={(event) =>
                                handleNewPlayerChange(event, index)
                            }
                            className={inputClass}
                        />
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-fit hover:scale-95 transition-transform bg-primary p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Przetwarzanie..." : "Dodaj drużynę"}
                </button>
            </form>
        </div>
    );
};

export default AdminPanel;
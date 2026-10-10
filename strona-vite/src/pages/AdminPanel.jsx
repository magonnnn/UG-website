import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const useSessionState = (key, initialValue) => {
    const [value, setValue] = useState(() => {
        try {
            const saved = sessionStorage.getItem(key);
            return saved !== null ? JSON.parse(saved) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error("Nie udało się zapisać formularza:", error);
        }
    }, [key, value]);

    return [value, setValue];
};

const emptyRoster = {
    player1: "",
    player2: "",
    player3: "",
    player4: "",
    player5: "",
};

const emptyNewPlayers = { ...emptyRoster };


const cleanRoster = (roster) =>
    Object.values(roster)
        .map((player) => player.trim())
        .filter(Boolean);

const AdminPanel = () => {
    const [teams, setTeams] = useState([]);
    const [logoFile, setLogoFile] = useState(null);
    const [pointsChange, setPointsChange] = useState(0)

    const [rosterInputs, setRosterInputs] = useSessionState(
        "admin-roster-inputs",
        emptyRoster
    );
    const [newPlayers, setNewPlayers] = useSessionState(
        "admin-new-players",
        emptyNewPlayers
    );
    const [newTeamName, setNewTeamName] = useSessionState(
        "admin-new-team-name",
        ""
    );
    // Przechowujemy id drużyny (jako string, bo tak działa <select>)
    const [selectedTeamId, setSelectedTeamId] = useSessionState(
        "admin-selected-team-id",
        ""
    );
    const [updatedName, setUpdatedName] = useSessionState(
        "admin-updated-name",
        ""
    );

    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ text: "", type: "" });

    const showMessage = (text, type) => setFeedback({ text, type });
    const clearMessage = () => setFeedback({ text: "", type: "" });

    const selectedTeam = teams.find(
        (team) => String(team.id) === selectedTeamId
    );

    const loadTeams = useCallback(async () => {
        const { data, error } = await supabase
            .from("teams")
            .select("*")
            .order("points", { ascending: false });

        if (error) {
            console.error("Error loading teams:", error.message);
            setFeedback({
                text: `Błąd ładowania drużyn: ${error.message}`,
                type: "error",
            });
            return false;
        }

        setTeams(data ?? []);
        return true;
    }, []);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const resetEditor = () => {
        setSelectedTeamId("");
        setUpdatedName("");
        setRosterInputs({ ...emptyRoster });
    };

    const changeTeam = (event) => {
        const id = event.target.value;
        const team = teams.find((item) => String(item.id) === id);

        setSelectedTeamId(team ? String(team.id) : "");
        setUpdatedName(team?.name ?? "");

        const roster = team?.roster ?? [];

        setRosterInputs({
            player1: roster[0] ?? "",
            player2: roster[1] ?? "",
            player3: roster[2] ?? "",
            player4: roster[3] ?? "",
            player5: roster[4] ?? "",
        });

        clearMessage();
    };

    const handlePlayerInputChange = (event, index) => {
        const key = `player${index + 1}`;
        setRosterInputs((prev) => ({ ...prev, [key]: event.target.value }));
    };

    const handleNewPlayerChange = (event, index) => {
        const key = `player${index + 1}`;
        setNewPlayers((prev) => ({ ...prev, [key]: event.target.value }));
    };

    const updateDatabase = async (event) => {
        event.preventDefault();

        if (!selectedTeamId) {
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
                    String(team.id) !== selectedTeamId
            )
        ) {
            showMessage("Drużyna o tej nazwie już istnieje.", "error");
            return;
        }

        const checkName = (name) => {
            return name === selectedTeam
        }

        const teamPoints = teams.findIndex(checkName)

        setLoading(true);
        clearMessage();

        let nextLogoPath = selectedTeam?.logo ?? null;

        if (logoFile) {
            const extension = logoFile.name.split(".").pop()?.toLowerCase();

            if (!["png", "jpg", "jpeg", "webp"].includes(extension)) {
                showMessage("Wybierz plik PNG, JPG lub WebP.", "error");
                setLoading(false);
                return;
            }

            const newLogoPath = `${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from("logos")
                .upload(newLogoPath, logoFile, {
                    contentType: logoFile.type,
                    upsert: false,
                });

            if (uploadError) {
                showMessage(`Błąd przesyłania logo: ${uploadError.message}`, "error");
                setLoading(false);
                return;
            }

            nextLogoPath = newLogoPath;

            if (selectedTeam?.logo) {
                const { error: deleteError } = await supabase.storage
                    .from("logos")
                    .remove([selectedTeam.logo]);

                if (deleteError) {
                    console.error("Error removing old logo:", deleteError.message);
                }
            }
        }

        const { error } = await supabase
            .from("teams")
            .update({
                name,
                roster: cleanRoster(rosterInputs),
                points: teams[teamPoints].points + (pointsChange),
                logo: nextLogoPath,
            })
            .eq("id", selectedTeamId);

        if (error) {
            console.error("Error updating team:", error.message);
            showMessage(`Błąd zapisu: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        const refreshed = await loadTeams();

        if (refreshed) {
            setUpdatedName(name);
            setLogoFile(null);
            showMessage("Drużyna została zaktualizowana.", "success");
        }

        setLoading(false);
    };

    const removeTeam = async () => {
        if (!selectedTeamId) {
            showMessage("Najpierw wybierz drużynę.", "error");
            return;
        }

        const confirmed = window.confirm(
            `Czy na pewno chcesz usunąć drużynę "${selectedTeam?.name ?? updatedName
            }"?`
        );

        if (!confirmed) return;

        setLoading(true);
        clearMessage();

        const { error } = await supabase
            .from("teams")
            .delete()
            .eq("id", selectedTeamId);

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

        setLoading(true);
        clearMessage();

        let logoPath = null;

        if (logoFile) {
            const extension = logoFile.name.split(".").pop()?.toLowerCase();

            if (!["png", "jpg", "jpeg", "webp"].includes(extension)) {
                showMessage("Wybierz plik PNG, JPG lub WebP.", "error");
                setLoading(false);
                return;
            }

            logoPath = `${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from("logos")
                .upload(logoPath, logoFile, {
                    contentType: logoFile.type,
                    upsert: false,
                });

            if (uploadError) {
                showMessage(`Błąd przesyłania logo: ${uploadError.message}`, "error");
                setLoading(false);
                return;
            }
        }

        const { error } = await supabase.from("teams").insert([
            {
                name,
                points: 0,
                roster: cleanRoster(newPlayers),
                logo: logoPath,
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
            setLogoFile(null);
            showMessage("Nowa drużyna została dodana.", "success");
        }

        setLoading(false);
    };

    return (
        <div className="mx-4 flex flex-col">
            {feedback.text && (
                <p
                    role="status"
                    aria-live="polite"
                    className={`mb-4 ${feedback.type === "error"
                        ? "text-red-400"
                        : "text-green-400"
                        }`}
                >
                    {feedback.text}
                </p>
            )}

            <form onSubmit={updateDatabase} className="border-2 border-red-700 rounded-md mb-4 mt-4">
                <h1 className="text-2xl font-bold text-white p-4 bg-red-700">
                    Edycja drużyny
                </h1>
                <div className="p-4">
                    <div className="mb-4 mt-2">
                        <label htmlFor="team-select" className="text-white">
                            Wybierz drużynę:
                        </label>

                        <select
                            id="team-select"
                            value={selectedTeamId}
                            onChange={changeTeam}
                            className="bg-red-700 rounded-md ms-4 text-white p-2"
                        >
                            <option value="">Wybierz drużynę</option>

                            {teams.map((team) => (
                                <option key={team.id} value={String(team.id)}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedTeamId && (
                        <>
                            <label
                                htmlFor="updated-name"
                                className="text-white"
                            >
                                Nazwa drużyny
                            </label>
                            <div className="grid grid-cols-2 gap-2">

                                <input
                                    id="updated-name"
                                    type="text"
                                    value={updatedName}
                                    onChange={(event) =>
                                        setUpdatedName(event.target.value)
                                    }
                                    className="mb-4 mt-2 w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                                    required
                                />
                                <div>
                                    <label htmlFor="teamLogoInput" className="sr-only">Wybierz logo</label>
                                    <label className="flex items-center justify-center px-4 py-3 bg-red-700 text-white text-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity mt-2">
                                        Wybierz logo
                                        <input
                                            type="file"
                                            name="teamLogoInput"
                                            id="teamLogoUpdate"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            <h2 className="text-white mb-2">
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
                                            className="w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                                        />
                                    )
                                )}
                            </div>
                        </>
                    )}
                    <h2 className="text-white mb-2">
                        Zmień punkty (odejmij / dodaj)
                    </h2>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <input type="number" onBlur={(event) => { setPointsChange(prev => prev - Number(event.target.value)) }} name="reducePoints" className="mb-4 w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse" />
                        <input type="number" onBlur={(event) => { setPointsChange(prev => prev + Number(event.target.value)) }} name="increasePoints" className="mb-4 w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={loading || !selectedTeamId}
                            className="hover:cursor-pointer hover:scale-95 transition-transform bg-success p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Przetwarzanie..." : "Zapisz"}
                        </button>

                        <button
                            type="button"
                            onClick={removeTeam}
                            disabled={loading || !selectedTeamId}
                            className="hover:scale-95 hover:cursor-pointer transition-transform bg-danger p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Usuń drużynę
                        </button>
                    </div>
                </div>
            </form>

            <form className="flex flex-col gap-3 border-2 border-red-700 rounded-md mb-4 mt-4" onSubmit={addTeam}>
                <h1 className="text-2xl font-bold text-white mb-4 p-4 bg-red-700">
                    Dodanie drużyny
                </h1>
                <div className="p-4">
                    <label
                        htmlFor="teamName"
                        className="block text-white mb-2"
                    >
                        Nazwa drużyny
                    </label>
                    <input
                        type="text"
                        name="teamName"
                        placeholder="Nazwa drużyny..."
                        value={newTeamName}
                        onChange={(event) => setNewTeamName(event.target.value)}
                        className="w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                        required
                    />
                    <h2 className="text-white mb-2 mt-2">
                        Skład drużyny
                    </h2>

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
                                className="w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                            />
                        ))}
                    </div>
                    <div>
                        <label htmlFor="teamLogoInput" className="sr-only">Wybierz logo</label>
                        <label className="flex items-center justify-center px-4 py-3 bg-red-700 text-white text-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity mt-4">
                            Wybierz logo
                            <input
                                type="file"
                                name="teamLogoInput"
                                id="teamLogoInput"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="hover:cursor-pointer mt-4 w-fit hover:scale-95 transition-transform bg-success p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Przetwarzanie..." : "Dodaj drużynę"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminPanel;
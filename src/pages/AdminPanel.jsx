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


const rosterValues = (roster) =>
    Object.values(roster).map((player) => player.trim());

const teamPlayerIds = (team) =>
    Array.from({ length: 5 }, (_, index) => team?.[`player${index + 1}`] ?? null);

const AdminPanel = () => {
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([])
    const [logoFile, setLogoFile] = useState(null);
    const [pointsChange, setPointsChange] = useState(0);
    const [newPlayer, setNewPlayer] = useState("");
    const [newSteam, setNewSteam] = useState("");
    const [newPlayerTeam, setNewPlayerTeam] = useState("");
    const [selectedPlayerId, setSelectedPlayerId] = useState("");
    const [updatedPlayerName, setUpdatedPlayerName] = useState("");
    const [updatedPlayerSteam, setUpdatedPlayerSteam] = useState("");
    const [updatedPlayerTeam, setUpdatedPlayerTeam] = useState("");
    const [editRoster, setEditRoster] = useState([])


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

    const loadPlayers = useCallback(async () => {
        const { data, error } = await supabase
            .from("players")
            .select(`
                id,
                name,
                team_history,
                current_team,
                steam_profile
                `)

        if (error) {
            console.error("Error loading players:", error.message);
            setFeedback({
                text: `Błąd ładowania graczy: ${error.message}`,
                type: "error",
            });
            return false;
        }

        setPlayers(data ?? []);
        return true;
    }, []);

    useEffect(() => {
        loadPlayers();
    }, [loadPlayers]);

    const resetEditor = () => {
        setSelectedTeamId("");
        setUpdatedName("");
        setEditRoster([]);
        setRosterInputs({ ...emptyRoster });
    };

    const changeTeam = (event) => {
        const id = event.target.value;
        const team = teams.find((item) => String(item.id) === id);
        const nextRoster = Array.from({ length: 5 }, (_, index) =>
            team?.[`player${index + 1}`] ?? null
        );

        setSelectedTeamId(team ? String(team.id) : "");
        setUpdatedName(team?.name ?? "");
        setEditRoster(nextRoster.map((playerId) => (playerId == null ? "" : String(playerId))));

        const linkedRoster = teamPlayerIds(team)
            .map((playerId) => players.find((player) => String(player.id) === String(playerId))?.name ?? "");

        setRosterInputs({
            player1: linkedRoster[0] ?? "",
            player2: linkedRoster[1] ?? "",
            player3: linkedRoster[2] ?? "",
            player4: linkedRoster[3] ?? "",
            player5: linkedRoster[4] ?? "",
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

    const updateTeamPlayerReferences = async (team, player, assigned) => {
        const ids = teamPlayerIds(team);

        if (assigned) {
            if (!ids.some((id) => String(id) === String(player.id))) {
                const emptySlot = ids.findIndex((id) => id == null);

                if (emptySlot === -1) {
                    showMessage(`Drużyna "${team.name}" ma już pięciu graczy.`, "error");
                    return false;
                }

                ids[emptySlot] = player.id;
            }
        } else {
            ids.forEach((id, index) => {
                if (String(id) === String(player.id)) {
                    ids[index] = null;
                }
            });
        }

        const roster = ids
            .map((id) => {
                if (String(id) === String(player.id)) return player.name;
                return players.find((item) => String(item.id) === String(id))?.name ?? "";
            })
            .filter(Boolean);

        const { error } = await supabase
            .from("teams")
            .update({
                roster,
                ...Object.fromEntries(
                    ids.map((id, index) => [`player${index + 1}`, id])
                ),
            })
            .eq("id", team.id);

        if (error) {
            console.error("Error updating team player references:", error.message);
            showMessage(`Błąd aktualizacji składu drużyny: ${error.message}`, "error");
            return false;
        }

        return true;
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

        const rosterIds = Array.from({ length: 5 }, (_, index) => {
            const value = editRoster[index];
            return value == null || value === "" ? null : String(value);
        });
        const rosterPlayers = rosterIds.map((playerId) =>
            playerId
                ? players.find((player) => String(player.id) === String(playerId))
                : null
        );

        if (rosterPlayers.some((player, index) => rosterIds[index] && !player)) {
            showMessage("Każdy gracz w składzie musi istnieć w bazie.", "error");
            return;
        }

        if (
            rosterPlayers.filter(Boolean).some(
                (player, index, roster) =>
                    roster.findIndex((item) => item.id === player.id) !== index
            )
        ) {
            showMessage("Ten sam gracz nie może występować w składzie dwa razy.", "error");
            return;
        }

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
                roster: rosterPlayers.map((player) => player?.name ?? "").filter(Boolean),
                ...Object.fromEntries(
                    rosterIds.map((playerId, index) => [`player${index + 1}`, playerId])
                ),
                points: (selectedTeam?.points ?? 0) + pointsChange,
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

    const addPlayer = async (event) => {
        event.preventDefault();

        const name = newPlayer.trim();
        const steam = newSteam.trim();
        const team = teams.find(
            (item) => String(item.id) === newPlayerTeam
        );

        if (!name || !steam) {
            showMessage("Wypełnij wszystkie pola.", "error");
            return;
        }

        if (
            players.some(
                (player) => player.name.toLowerCase() === name.toLowerCase()
            )
        ) {
            showMessage("Taki gracz już istnieje.", "error");
            return;
        }

        if (
            team &&
            !teamPlayerIds(team).some((id) => id == null)
        ) {
            showMessage(`Drużyna "${team.name}" ma już pięciu graczy.`, "error");
            return;
        }

        setLoading(true);
        clearMessage();

        const { data, error } = await supabase.from("players").insert([
            {
                name,
                steam_profile: steam,
                current_team: team?.id ?? null,
                team_history: [],
            },
        ]).select("*").single();

        if (error) {
            console.error("Error inserting player:", error.message);
            showMessage(`Błąd dodawania gracza: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        if (team && !(await updateTeamPlayerReferences(team, data, true))) {
            await Promise.all([loadTeams(), loadPlayers()]);
            setLoading(false);
            return;
        }

        const player = players.find((item) => String(item.steam_profile) === steam)


        if (team) {
            const { error: transferError } = await supabase
                .from("transfers")
                .insert({
                    player_id: data.id,
                    from_id: null,
                    to_id: team.id,
                });

            if (transferError) {
                console.error("Error recording transfer:", transferError.message);
                showMessage(
                    `Błąd zapisu transferu: ${transferError.message}`,
                    "error"
                );

                await Promise.all([loadTeams(), loadPlayers()]);
                setLoading(false);
                return;
            }
        }

        const [teamsRefreshed, playersRefreshed] = await Promise.all([
            loadTeams(),
            loadPlayers(),
        ]);

        if (teamsRefreshed && playersRefreshed) {
            setNewPlayer("");
            setNewSteam("");
            setNewPlayerTeam("");
            showMessage("Gracz został dodany.", "success");
        }

        setLoading(false);
    };

    const selectPlayer = (event) => {
        const id = event.target.value;
        const player = players.find((item) => String(item.id) === id);

        setSelectedPlayerId(player ? String(player.id) : "");
        setUpdatedPlayerName(player?.name ?? "");
        setUpdatedPlayerSteam(player?.steam_profile ?? "");
        setUpdatedPlayerTeam(
            player?.current_team == null ? "" : String(player.current_team)
        );
        clearMessage();
    };

    const updatePlayer = async (event) => {
        event.preventDefault();

        const player = players.find(
            (item) => String(item.id) === selectedPlayerId
        );

        const name = updatedPlayerName.trim();
        const steam = updatedPlayerSteam.trim();
        const team = teams.find(
            (item) => String(item.id) === updatedPlayerTeam
        );

        if (!player) {
            showMessage("Najpierw wybierz gracza.", "error");
            return;
        }

        if (!name || !steam) {
            showMessage("Wypełnij wszystkie pola.", "error");
            return;
        }

        if (
            players.some(
                (item) =>
                    String(item.id) !== selectedPlayerId &&
                    item.name.toLowerCase() === name.toLowerCase()
            )
        ) {
            showMessage("Taki gracz już istnieje.", "error");
            return;
        }

        const previousTeam = player.current_team;
        const nextTeamId = team?.id ?? null;
        const teamChanged = String(previousTeam ?? "") !== String(nextTeamId ?? "");
        const teamsWithPlayer = teams.filter((item) =>
            teamPlayerIds(item).some((id) => String(id) === String(player.id)) ||
            (item.roster ?? []).some(
                (name) => name.toLowerCase() === player.name.toLowerCase()
            )
        );
        const targetTeam = teamChanged ? team : null;

        if (
            targetTeam &&
            !teamPlayerIds(targetTeam).some((id) => String(id) === String(player.id)) &&
            !teamPlayerIds(targetTeam).some((id) => id == null)
        ) {
            showMessage(`Drużyna "${targetTeam.name}" ma już pięciu graczy.`, "error");
            return;
        }

        const updates = {
            name,
            steam_profile: steam,
            current_team: nextTeamId,
        };

        if (teamChanged && previousTeam != null) {
            updates.team_history = [
                ...(Array.isArray(player.team_history) ? player.team_history : []),
                previousTeam,
            ];
        }

        setLoading(true);
        clearMessage();

        const { error } = await supabase
            .from("players")
            .update(updates)
            .eq("id", player.id);

        if (error) {
            console.error("Error updating player:", error.message);
            showMessage(`Błąd zapisu gracza: ${error.message}`, "error");
            setLoading(false);
            return;
        }


        if (teamChanged) {
            const { error: transferError } = await supabase
                .from("transfers")
                .insert({
                    player_id: player.id,
                    from_id: previousTeam,
                    to_id: nextTeamId,
                });

            if (transferError) {
                console.error("Error recording transfer:", transferError.message);
                showMessage(
                    `Błąd zapisu transferu: ${transferError.message}`,
                    "error"
                );
                await Promise.all([loadTeams(), loadPlayers()]);
                setLoading(false);
                return;
            }
        }

        if (teamChanged) {
            if (
                targetTeam &&
                !(await updateTeamPlayerReferences(targetTeam, { ...player, name }, true))
            ) {
                await Promise.all([loadTeams(), loadPlayers()]);
                setLoading(false);
                return;
            }

            for (const previousTeam of teamsWithPlayer) {
                if (
                    targetTeam &&
                    String(previousTeam.id) === String(targetTeam.id)
                ) {
                    continue;
                }

                if (!(await updateTeamPlayerReferences(previousTeam, player, false))) {
                    await Promise.all([loadTeams(), loadPlayers()]);
                    setLoading(false);
                    return;
                }
            }
        } else if (name !== player.name) {
            for (const currentTeam of teamsWithPlayer) {
                if (
                    !(await updateTeamPlayerReferences(
                        currentTeam,
                        { ...player, name },
                        true,
                        player.name
                    ))
                ) {
                    await Promise.all([loadTeams(), loadPlayers()]);
                    setLoading(false);
                    return;
                }
            }
        }

        const [teamsRefreshed, playersRefreshed] = await Promise.all([
            loadTeams(),
            loadPlayers(),
        ]);

        if (teamsRefreshed && playersRefreshed) {
            showMessage("Gracz został zaktualizowany.", "success");
        }

        setLoading(false);
    };

    const removePlayer = async () => {
        const player = players.find(
            (item) => String(item.id) === selectedPlayerId
        );

        if (!player) {
            showMessage("Najpierw wybierz gracza.", "error");
            return;
        }

        if (!window.confirm(`Czy na pewno chcesz usunąć gracza "${player.name}"?`)) {
            return;
        }

        setLoading(true);
        clearMessage();

        const teamsWithPlayer = teams.filter((team) =>
            teamPlayerIds(team).some((id) => String(id) === String(player.id)) ||
            (team.roster ?? []).some(
                (name) => name.toLowerCase() === player.name.toLowerCase()
            )
        );

        for (const team of teamsWithPlayer) {
            if (!(await updateTeamPlayerReferences(team, player, false))) {
                await loadTeams();
                setLoading(false);
                return;
            }
        }

        const { error } = await supabase
            .from("players")
            .delete()
            .eq("id", player.id);

        if (error) {
            console.error("Error deleting player:", error.message);
            showMessage(`Błąd usuwania gracza: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        setSelectedPlayerId("");
        setUpdatedPlayerName("");
        setUpdatedPlayerSteam("");
        setUpdatedPlayerTeam("");

        const [teamsRefreshed, playersRefreshed] = await Promise.all([
            loadTeams(),
            loadPlayers(),
        ]);

        if (teamsRefreshed && playersRefreshed) {
            showMessage("Gracz został usunięty.", "success");
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

        const values = rosterValues(newPlayers);
        const rosterPlayers = values.map((playerName) =>
            playerName
                ? players.find(
                    (player) => player.name.toLowerCase() === playerName.toLowerCase()
                )
                : null
        );

        if (rosterPlayers.some((player, index) => values[index] && !player)) {
            showMessage("Każdy gracz w składzie musi istnieć w bazie.", "error");
            return;
        }

        if (
            rosterPlayers.filter(Boolean).some(
                (player, index, roster) =>
                    roster.findIndex((item) => item.id === player.id) !== index
            )
        ) {
            showMessage("Ten sam gracz nie może występować w składzie dwa razy.", "error");
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
                roster: values.filter(Boolean),
                logo: logoPath,
                ...Object.fromEntries(
                    rosterPlayers.map((player, index) => [`player${index + 1}`, player?.id ?? null])
                ),
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

    const updateRoster = (index, playerId) => {
        setEditRoster((prev) => {
            const nextRoster = [...prev];
            nextRoster[index] = playerId ?? "";
            return nextRoster;
        });
    };

    return (
        <div>
            {
                feedback.text && (
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
                )
            }
            <div className="mx-3 grid grid-cols-1 gap-4 sm:mx-4 lg:grid-cols-2">

                < form onSubmit={updateDatabase} className="border-2 border-red-700 rounded-md mt-4" >
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
                                className="mt-2 w-full rounded-md bg-red-700 p-2 text-white sm:ms-4 sm:mt-0 sm:w-auto"
                            >
                                <option value="">Wybierz drużynę</option>

                                {teams.map((team) => (
                                    <option key={team.id} value={String(team.id)}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </div >

                        {selectedTeamId && (
                            <>
                                <label
                                    htmlFor="updated-name"
                                    className="text-white"
                                >
                                    Nazwa drużyny
                                </label>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

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
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <select
                                            key={index}
                                            value={editRoster[index] ?? ""}
                                            onChange={(event) => updateRoster(index, event.target.value)}
                                            className="bg-red-700 rounded-md text-white p-2"
                                        >
                                            <option value="">Wybierz gracza</option>
                                            {players.map((player) => (
                                                <option key={player.id} value={String(player.id)}>
                                                    {player.name}
                                                </option>
                                            ))}
                                        </select>
                                    ))}
                                </div>
                            </>
                        )}

                        <h2 className="text-white mb-2">
                            Zmień punkty (odejmij / dodaj)
                        </h2>
                        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                    </div >
                </form >
                <form className="flex flex-col gap-3 border-2 border-red-700 rounded-md mt-4" onSubmit={addTeam}>
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
                <form onSubmit={addPlayer} className="border-2 border-red-700 rounded-md mb-4">
                    <h1 className="text-2xl font-bold text-white mb-4 p-4 bg-red-700">
                        Dodanie gracza
                    </h1>
                    <div className="p-4">
                        <label htmlFor="new-player-name" className="block text-white mb-2">Nazwa gracza</label>
                        <input
                            id="new-player-name"
                            type="text"
                            name="playerNickname"
                            placeholder="Nazwa gracza..."
                            value={newPlayer}
                            onChange={(event) => setNewPlayer(event.target.value)}
                            className="w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                            required
                        />
                        <label htmlFor="new-player-steam" className="block text-white mb-2 mt-4">Link do steama</label>
                        <input
                            id="new-player-steam"
                            type="text"
                            name="steamLink"
                            placeholder="Link do steama..."
                            value={newSteam}
                            onChange={(event) => setNewSteam(event.target.value)}
                            className="w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                            required
                        />
                        <label htmlFor="new-player-team" className="block text-white mb-2 mt-4">Drużyna</label>
                        <select
                            id="new-player-team"
                            value={newPlayerTeam}
                            onChange={(event) => setNewPlayerTeam(event.target.value)}
                            className="bg-red-700 rounded-md text-white p-2"
                        >
                            <option value="">Bez drużyny</option>
                            {teams.map((team) => (
                                <option key={team.id} value={String(team.id)}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={loading}
                            className="hover:cursor-pointer mt-4 w-fit hover:scale-95 transition-transform bg-success p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Przetwarzanie..." : "Dodaj gracza"}
                        </button>
                    </div>
                </form>
                <form onSubmit={updatePlayer} className="border-2 border-red-700 rounded-md mb-4">
                    <h1 className="text-2xl font-bold text-white mb-4 p-4 bg-red-700">
                        Edytuj gracza
                    </h1>
                    <div className="p-4">
                        <label htmlFor="edit-player-select" className="block text-white mb-2">Wybierz gracza</label>
                        <select
                            id="edit-player-select"
                            value={selectedPlayerId}
                            onChange={selectPlayer}
                            className="bg-red-700 rounded-md text-white p-2"
                        >
                            <option value="">Wybierz gracza</option>
                            {players.map((player) => (
                                <option key={player.id} value={String(player.id)}>
                                    {player.name}
                                </option>
                            ))}
                        </select>

                        {selectedPlayerId && (
                            <>
                                <label htmlFor="edit-player-name" className="block text-white mb-2 mt-4">Nazwa gracza</label>
                                <input
                                    id="edit-player-name"
                                    type="text"
                                    value={updatedPlayerName}
                                    onChange={(event) => setUpdatedPlayerName(event.target.value)}
                                    className="w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                                    required
                                />
                                <label htmlFor="edit-player-steam" className="block text-white mb-2 mt-4">Link do steama</label>
                                <input
                                    id="edit-player-steam"
                                    type="text"
                                    value={updatedPlayerSteam}
                                    onChange={(event) => setUpdatedPlayerSteam(event.target.value)}
                                    className="w-full min-w-0 text-white border-2 border-white rounded-md text-center p-2 focus:animate-pulse"
                                    required
                                />
                                <label htmlFor="edit-player-team" className="block text-white mb-2 mt-4">Drużyna</label>
                                <select
                                    id="edit-player-team"
                                    value={updatedPlayerTeam}
                                    onChange={(event) => setUpdatedPlayerTeam(event.target.value)}
                                    className="bg-red-700 rounded-md text-white p-2"
                                >
                                    <option value="">Bez drużyny</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={String(team.id)}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !selectedPlayerId}
                            className="hover:cursor-pointer mt-4 w-fit hover:scale-95 transition-transform bg-success p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Przetwarzanie..." : "Zapisz zmiany"}
                        </button>
                        <button
                            type="button"
                            onClick={removePlayer}
                            disabled={loading || !selectedPlayerId}
                            className="hover:cursor-pointer mt-4 ml-3 w-fit hover:scale-95 transition-transform bg-danger p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Usuń gracza
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default AdminPanel;
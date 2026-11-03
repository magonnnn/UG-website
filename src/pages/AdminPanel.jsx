import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DOMPurify from "dompurify";
import settingsIcon from "../assets/settings.svg";
import addIcon from "../assets/add.svg";
import acceptIcon from "../assets/accept.svg";
import removeIcon from "../assets/remove.svg";
import squadIcon from "../assets/squad.svg";
import fileIcon from "../assets/file.svg";
import clockIcon from "../assets/clock.svg";
import warningIcon from "../assets/warning.svg";
import inputIcon from "../assets/input.svg";

const ArticleEditor = lazy(() => import("../components/ArticleEditor"));

const useSessionState = (key, initialValue) => {
    const [value, setValue] = useState(() => {
        try {
            const saved = sessionStorage.getItem(key);
            return saved !== null ? JSON.parse(saved) : initialValue;
        } catch {
            console.error(`Nie udało się odczytać wersji roboczej formularza "${key}".`);
            return initialValue;
        }
    });

    const setPersistedValue = useCallback((nextValue) => {
        setValue((currentValue) => {
            const resolvedValue =
                typeof nextValue === "function" ? nextValue(currentValue) : nextValue;

            try {
                sessionStorage.setItem(key, JSON.stringify(resolvedValue));
            } catch (error) {
                console.error("Nie udało się zapisać formularza:", error);
            }

            return resolvedValue;
        });
    }, [key]);

    return [value, setPersistedValue];
};

const openAdminDraftDatabase = () =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open("admin-form-drafts", 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore("files");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const useSessionFileState = (key) => {
    const [file, setFile] = useState(null);
    const revision = useRef(0);

    useEffect(() => {
        let active = true;
        const currentRevision = revision.current;

        const restoreFile = async () => {
            try {
                const database = await openAdminDraftDatabase();
                const transaction = database.transaction("files", "readonly");
                const request = transaction.objectStore("files").get(key);
                request.onsuccess = () => {
                    if (active && revision.current === currentRevision) {
                        setFile(request.result ?? null);
                    }
                    database.close();
                };
                request.onerror = () => {
                    console.error("Nie udało się odczytać pliku formularza:", request.error);
                    database.close();
                };
            } catch (error) {
                console.error("Nie udało się otworzyć pamięci plików formularza:", error);
            }
        };

        void restoreFile();

        return () => {
            active = false;
        };
    }, [key]);

    const setPersistedFile = useCallback((nextFile) => {
        revision.current += 1;
        setFile(nextFile);

        const persistFile = async () => {
            try {
                const database = await openAdminDraftDatabase();
                const transaction = database.transaction("files", "readwrite");
                const store = transaction.objectStore("files");

                if (nextFile) {
                    store.put(nextFile, key);
                } else {
                    store.delete(key);
                }

                transaction.oncomplete = () => database.close();
                transaction.onerror = () => {
                    console.error("Nie udało się zapisać pliku formularza:", transaction.error);
                    database.close();
                };
                transaction.onabort = () => database.close();
            } catch (error) {
                console.error("Nie udało się otworzyć pamięci plików formularza:", error);
            }
        };

        void persistFile();
    }, [key]);

    return [file, setPersistedFile];
};

const emptyRoster = {
    player1: "",
    player2: "",
    player3: "",
    player4: "",
    player5: "",
};

const teamPlayerIds = (team) =>
    Array.from({ length: 5 }, (_, index) => team?.[`player${index + 1}`] ?? null);

const AdminPanel = () => {
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([])
    const [tournaments, setTournaments] = useState([]);
    const [matches, setMatches] = useState([]);
    const [selectedMatchId, setSelectedMatchId] = useSessionState("admin-selected-match-id", "");
    const [matchForm, setMatchForm] = useSessionState("admin-match-form", {
        team_1_id: "",
        team_2_id: "",
        league: "",
        time: "",
    });
    const [logoFile, setLogoFile] = useSessionFileState("admin-team-logo");
    const [reducePoints, setReducePoints] = useSessionState("admin-reduce-points", "");
    const [increasePoints, setIncreasePoints] = useSessionState("admin-increase-points", "");
    const [newPlayer, setNewPlayer] = useSessionState("admin-new-player-name", "");
    const [newSteam, setNewSteam] = useSessionState("admin-new-player-steam", "");
    const [newPlayerTeam, setNewPlayerTeam] = useSessionState("admin-new-player-team", "");
    const [articleTitle, setArticleTitle] = useSessionState("admin-article-title", "");
    const [articleAuthor, setArticleAuthor] = useSessionState("admin-article-author", "");
    const [articleContent, setArticleContent] = useSessionState("admin-article-content", "");
    const [articleCoverFile, setArticleCoverFile] = useSessionFileState("admin-article-cover");
    const [articleImageUploading, setArticleImageUploading] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useSessionState("admin-selected-player-id", "");
    const [updatedPlayerName, setUpdatedPlayerName] = useSessionState("admin-updated-player-name", "");
    const [updatedPlayerSteam, setUpdatedPlayerSteam] = useSessionState("admin-updated-player-steam", "");
    const [updatedPlayerTeam, setUpdatedPlayerTeam] = useSessionState("admin-updated-player-team", "");
    const [editRoster, setEditRoster] = useSessionState("admin-edit-roster", []);


    const [, setRosterInputs] = useSessionState(
        "admin-roster-inputs",
        emptyRoster
    );
    const [newTeamName, setNewTeamName] = useSessionState(
        "admin-new-team-name",
        ""
    );

    const [newFaceitID, setNewFaceitID] = useSessionState(
        "admin-new-faceit-id",
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

    const [updatedFaceitId, setUpdatedFaceitId] = useSessionState(
        "admin-updated-faceit-id",
        ""
    )

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
        void Promise.resolve().then(loadTeams);
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
            .order('name', { ascending: true })

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
        void Promise.resolve().then(loadPlayers);
    }, [loadPlayers]);

    const loadMatchesAndTournaments = useCallback(async () => {
        const [matchesResult, tournamentsResult] = await Promise.all([
            supabase
                .from("matches")
                .select(`
                    id,
                    time,
                    team_1_id,
                    team_2_id,
                    league,
                    team_1:teams!matches_team_1_id_fkey(name),
                    team_2:teams!matches_team_2_id_fkey(name),
                    tournament:tournaments!matches_league_fkey(name)
                `)
                .order("time", { ascending: false }),
            supabase.from("tournaments").select("id, name").order("name"),
        ]);

        if (matchesResult.error) {
            console.error("Error loading matches:", matchesResult.error.message);
            showMessage(`Błąd ładowania meczów: ${matchesResult.error.message}`, "error");
        } else {
            setMatches(matchesResult.data ?? []);
        }

        if (tournamentsResult.error) {
            console.error("Error loading tournaments:", tournamentsResult.error.message);
            showMessage(`Błąd ładowania turniejów: ${tournamentsResult.error.message}`, "error");
        } else {
            setTournaments(tournamentsResult.data ?? []);
        }

        return !matchesResult.error && !tournamentsResult.error;
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadMatchesAndTournaments);
    }, [loadMatchesAndTournaments]);

    const resetEditor = () => {
        setSelectedTeamId("");
        setUpdatedName("");
        setUpdatedFaceitId("");
        setEditRoster([]);
        setRosterInputs({ ...emptyRoster });
        setReducePoints("");
        setIncreasePoints("");
    };

    const changeTeam = (event) => {
        const id = event.target.value;
        const team = teams.find((item) => String(item.id) === id);
        const nextRoster = Array.from({ length: 5 }, (_, index) =>
            team?.[`player${index + 1}`] ?? null
        );

        setSelectedTeamId(team ? String(team.id) : "");
        setUpdatedName(team?.name ?? "");
        setUpdatedFaceitId(team?.faceit_id ?? "");
        setEditRoster(nextRoster.map((playerId) => (playerId == null ? "" : String(playerId))));
        setReducePoints("");
        setIncreasePoints("");

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
        const form = event.currentTarget;

        if (!selectedTeamId) {
            showMessage("Najpierw wybierz drużynę.", "error");
            return;
        }

        const name = updatedName.trim();
        const faceit_id = updatedFaceitId.trim();
        const pointsToReduce = Number(reducePoints || 0);
        const pointsToIncrease = Number(increasePoints || 0);

        if (!name) {
            showMessage("Nazwa drużyny nie może być pusta.", "error");
            return;
        }

        if (
            !Number.isFinite(pointsToReduce) ||
            !Number.isFinite(pointsToIncrease) ||
            pointsToReduce < 0 ||
            pointsToIncrease < 0
        ) {
            showMessage("Liczba punktów musi być nieujemną liczbą.", "error");
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
                faceit_id,
                roster: rosterPlayers.map((player) => player?.name ?? "").filter(Boolean),
                ...Object.fromEntries(
                    rosterIds.map((playerId, index) => [`player${index + 1}`, playerId])
                ),
                points: (selectedTeam?.points ?? 0) - pointsToReduce + pointsToIncrease,
                logo: nextLogoPath,
            })
            .eq("id", selectedTeamId);

        if (error) {
            console.error("Error updating team:", error.message);
            showMessage(`Błąd zapisu: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        const previousRosterIds = new Set(
            teamPlayerIds(selectedTeam).filter((playerId) => playerId != null).map(String)
        );
        const nextRosterIds = new Set(
            rosterPlayers.filter(Boolean).map((player) => String(player.id))
        );
        const changedPlayers = players.filter((player) => {
            const playerId = String(player.id);
            return previousRosterIds.has(playerId) !== nextRosterIds.has(playerId);
        });
        let transfersChanged = false;

        for (const player of changedPlayers) {
            const previousTeam = player.current_team;
            const nextTeam = nextRosterIds.has(String(player.id))
                ? selectedTeam.id
                : String(previousTeam ?? "") === selectedTeamId
                    ? null
                    : previousTeam;
            const teamChanged = String(previousTeam ?? "") !== String(nextTeam ?? "");

            if (!teamChanged) continue;

            const playerUpdates = { current_team: nextTeam };
            if (previousTeam != null) {
                playerUpdates.team_history = [
                    ...(Array.isArray(player.team_history) ? player.team_history : []),
                    previousTeam,
                ];
            }

            const { error: playerError } = await supabase
                .from("players")
                .update(playerUpdates)
                .eq("id", player.id);

            if (playerError) {
                console.error("Error updating player team:", playerError.message);
                showMessage(`Błąd aktualizacji drużyny gracza: ${playerError.message}`, "error");
                await Promise.all([loadTeams(), loadPlayers()]);
                setLoading(false);
                return;
            }

            const { error: transferError } = await supabase
                .from("transfers")
                .insert({
                    player_id: player.id,
                    from_id: previousTeam,
                    to_id: nextTeam,
                });

            if (transferError) {
                console.error("Error recording transfer:", transferError.message);
                showMessage(`Błąd zapisu transferu: ${transferError.message}`, "error");
                await Promise.all([loadTeams(), loadPlayers()]);
                setLoading(false);
                return;
            }

            transfersChanged = true;
        }

        if (transfersChanged) {
            window.dispatchEvent(new Event("transfers-updated"));
        }

        for (const player of rosterPlayers.filter(Boolean)) {
            for (const otherTeam of teams) {
                if (
                    String(otherTeam.id) !== selectedTeamId &&
                    teamPlayerIds(otherTeam).some(
                        (playerId) => String(playerId) === String(player.id)
                    ) &&
                    !(await updateTeamPlayerReferences(otherTeam, player, false))
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
            setUpdatedName(name);
            setUpdatedFaceitId(faceit_id);
            setLogoFile(null);
            form.querySelectorAll('input[type="file"]').forEach((input) => {
                input.value = "";
            });
            setReducePoints("");
            setIncreasePoints("");
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
        const form = event.currentTarget;

        const name = newTeamName.trim();
        const faceitId = newFaceitID.trim();

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
                faceit_id: faceitId,
                points: 0,
                roster: [],
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
            setNewFaceitID("");
            setLogoFile(null);
            form.reset();
            showMessage("Nowa drużyna została dodana.", "success");
        }

        setLoading(false);
    };

    const addArticle = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;

        const title = articleTitle.trim();
        const author = articleAuthor.trim();
        const content = DOMPurify.sanitize(articleContent.trim(), {
            USE_PROFILES: { html: true },
        });
        const contentText = document.createElement("div");
        contentText.innerHTML = content;

        if (!title || !author || !contentText.textContent.trim() || !articleCoverFile) {
            showMessage("Uzupełnij tytuł, autora, treść i wybierz zdjęcie okładkowe.", "error");
            return;
        }

        const allowedTypes = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };
        const extension = allowedTypes[articleCoverFile.type];

        if (!extension) {
            showMessage("Wybierz plik PNG, JPG lub WebP.", "error");
            return;
        }

        if (articleCoverFile.size > 10 * 1024 * 1024) {
            showMessage("Okładka może mieć maksymalnie 10 MB.", "error");
            return;
        }

        setLoading(true);
        clearMessage();

        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
            console.error("Error checking article upload session:", authError?.message ?? "No authenticated user");
            showMessage("Sesja wygasła. Zaloguj się ponownie przed dodaniem artykułu.", "error");
            setLoading(false);
            return;
        }

        const { data: isArticleAdmin, error: roleCheckError } = await supabase.rpc("is_article_admin");

        if (roleCheckError || isArticleAdmin !== true) {
            console.error(
                "Article upload admin policy check failed:",
                roleCheckError?.message ?? `User ${authData.user.id} is not an article admin`
            );
            showMessage(
                roleCheckError
                    ? `Nie można sprawdzić uprawnień do artykułów (${roleCheckError.message}). Zastosuj migrację 20261022200800_fix_article_storage_rls.sql w projekcie Supabase używanym przez stronę.`
                    : "Baza danych nie rozpoznaje Twojego konta jako administratora artykułów.",
                "error"
            );
            setLoading(false);
            return;
        }

        const coverImagePath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
            .from("articles")
            .upload(coverImagePath, articleCoverFile, {
                contentType: articleCoverFile.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Error uploading article cover:", {
                message: uploadError.message,
                name: uploadError.name,
                statusCode: uploadError.statusCode,
            });
            showMessage(
                `Błąd przesyłania okładki: ${uploadError.message}. Uprawnienia administratora są potwierdzone, więc sprawdź polityki RLS bucketu "articles" oraz czy migracja została zastosowana w projekcie Supabase używanym przez stronę.`,
                "error"
            );
            setLoading(false);
            return;
        }

        const { error } = await supabase.from("articles").insert({
            title,
            author,
            content,
            cover_image: coverImagePath,
        });

        if (error) {
            console.error("Error inserting article:", error.message);
            const { error: cleanupError } = await supabase.storage
                .from("articles")
                .remove([coverImagePath]);

            if (cleanupError) {
                console.error("Error removing unused article cover:", cleanupError.message);
            }

            showMessage(`Błąd dodawania artykułu: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        setArticleTitle("");
        setArticleAuthor("");
        setArticleContent("");
        setArticleCoverFile(null);
        form.reset();
        showMessage("Artykuł został dodany.", "success");
        setLoading(false);
    };

    const uploadArticleImage = async (file) => {
        const allowedTypes = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };
        const extension = allowedTypes[file.type];

        if (!extension) {
            throw new Error("Wybierz obraz PNG, JPG lub WebP.");
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error("Obraz może mieć maksymalnie 10 MB.");
        }

        const imagePath = `${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
            .from("articles")
            .upload(imagePath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            throw new Error(`Nie udało się przesłać obrazu: ${error.message}`);
        }

        return supabase.storage.from("articles").getPublicUrl(imagePath).data.publicUrl;
    };

    const updateRoster = (index, playerId) => {
        setEditRoster((prev) => {
            const nextRoster = [...prev];
            nextRoster[index] = playerId ?? "";
            return nextRoster;
        });
    };

    const resetMatchForm = () => {
        setSelectedMatchId("");
        setMatchForm({
            team_1_id: "",
            team_2_id: "",
            league: "",
            time: "",
        });
    };

    const selectMatchToEdit = (event) => {
        const matchId = event.target.value;
        const match = matches.find((item) => String(item.id) === matchId);

        setSelectedMatchId(matchId);

        if (!match) {
            resetMatchForm();
            return;
        }

        const matchDate = match.time ? new Date(match.time) : null;
        const localTime = matchDate && !Number.isNaN(matchDate.getTime())
            ? new Date(matchDate.getTime() - matchDate.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)
            : "";

        setMatchForm({
            team_1_id: String(match.team_1_id ?? ""),
            team_2_id: String(match.team_2_id ?? ""),
            league: String(match.league ?? ""),
            time: localTime,
        });
    };

    const saveMatch = async (event) => {
        event.preventDefault();

        if (!matchForm.team_1_id || !matchForm.team_2_id || !matchForm.league || !matchForm.time) {
            showMessage("Wybierz obie drużyny, turniej i termin meczu.", "error");
            return;
        }

        if (matchForm.team_1_id === matchForm.team_2_id) {
            showMessage("Drużyny w meczu muszą być różne.", "error");
            return;
        }

        const matchTime = new Date(matchForm.time);
        if (Number.isNaN(matchTime.getTime())) {
            showMessage("Podany termin meczu jest nieprawidłowy.", "error");
            return;
        }

        const matchData = {
            team_1_id: matchForm.team_1_id,
            team_2_id: matchForm.team_2_id,
            league: matchForm.league,
            time: matchTime.toISOString(),
        };

        setLoading(true);
        clearMessage();

        const result = selectedMatchId
            ? await supabase.from("matches").update(matchData).eq("id", selectedMatchId)
            : await supabase.from("matches").insert(matchData);

        if (result.error) {
            console.error("Error saving match:", result.error.message);
            showMessage(`Błąd zapisu meczu: ${result.error.message}`, "error");
            setLoading(false);
            return;
        }

        const refreshed = await loadMatchesAndTournaments();
        if (refreshed) {
            resetMatchForm();
            showMessage(
                selectedMatchId ? "Mecz został zaktualizowany." : "Mecz został dodany.",
                "success"
            );
        }

        setLoading(false);
    };

    return (
        <section className="min-w-0">
            <header className="mb-5 border-b border-white/10 pb-4">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
                    <img src={settingsIcon} alt="" aria-hidden="true" className="h-6 w-6 invert opacity-70" />
                    Panel administratora
                </h1>
            </header>
            {
                feedback.text && (
                    <p
                        role="status"
                        aria-live="polite"
                        className={`mb-4 flex items-center gap-2 ${feedback.type === "error"
                            ? "text-red-400"
                            : "text-green-400"
                            }`}
                    >
                        <img
                            src={feedback.type === "error" ? warningIcon : acceptIcon}
                            alt=""
                            aria-hidden="true"
                            className="h-4 w-4 invert"
                        />
                        {feedback.text}
                    </p>
                )
            }
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">

                <form onSubmit={updateDatabase} className="min-w-0 border border-white/10">
                    <h2 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        Edycja drużyny
                    </h2>
                    <div className="p-4">
                        <div className="mb-4 mt-2">
                            <label htmlFor="team-select" className="text-white">
                                Wybierz drużynę:
                            </label>

                            <select
                                id="team-select"
                                value={selectedTeamId}
                                onChange={changeTeam}
                                className="mt-2 w-full border p-2 text-sm text-white sm:ms-4 sm:mt-0 sm:w-auto"
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
                                <div className="grid grid-cols-1 gap-2">

                                    <input
                                        id="updated-name"
                                        type="text"
                                        value={updatedName}
                                        onChange={(event) =>
                                            setUpdatedName(event.target.value)
                                        }
                                        className="mb-4 mt-2 w-full min-w-0 border p-2.5 text-white"
                                        required
                                    />
                                    <label
                                        htmlFor="updated-faceit-id"
                                        className="text-white"
                                    >
                                        ID drużyny FACEIT
                                    </label>
                                    <input
                                        id="updated-faceit-id"
                                        type="text"
                                        value={updatedFaceitId}
                                        onChange={(event) =>
                                            setUpdatedFaceitId(event.target.value)
                                        }
                                        className="mb-4 mt-2 w-full min-w-0 border p-2.5 text-white"
                                        required
                                    />
                                    <div>
                                        <label htmlFor="teamLogoInput" className="sr-only">Wybierz logo</label>
                                        <label className="mt-2 flex cursor-pointer items-center justify-center rounded border border-white/10 bg-bg-light px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-highlight">
                                            <img src={fileIcon} alt="" aria-hidden="true" className="mr-2 h-4 w-4 invert opacity-70" />
                                            {logoFile?.name ?? "Wybierz logo"}
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

                                <h2 className="mb-2 flex items-center gap-2 text-white">
                                    <img src={squadIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                                    Skład drużyny
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <select
                                            key={index}
                                            value={editRoster[index] ?? ""}
                                            onChange={(event) => updateRoster(index, event.target.value)}
                                            className="min-w-0 border p-2 text-sm"
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
                            <input
                                type="number"
                                min="0"
                                name="reducePoints"
                                placeholder="Odejmij punkty"
                                value={reducePoints}
                                onChange={(event) => setReducePoints(event.target.value)}
                                className="mb-4 w-full min-w-0 border p-2.5 text-center"
                            />
                            <input
                                type="number"
                                min="0"
                                name="increasePoints"
                                placeholder="Dodaj punkty"
                                value={increasePoints}
                                onChange={(event) => setIncreasePoints(event.target.value)}
                                className="mb-4 w-full min-w-0 border p-2.5 text-center"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={loading || !selectedTeamId}
                                className="cursor-pointer rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <img src={acceptIcon} alt="" aria-hidden="true" className="h-4 w-4 invert" />
                                    {loading ? "Przetwarzanie..." : "Zapisz"}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={removeTeam}
                                disabled={loading || !selectedTeamId}
                                className="cursor-pointer rounded border border-red-800/60 bg-transparent px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <img src={removeIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-80" />
                                    Usuń drużynę
                                </span>
                            </button>
                        </div>
                    </div>
                </form>
                <form className="flex min-w-0 flex-col gap-3 border border-white/10" onSubmit={addTeam}>
                    <h2 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        Dodanie drużyny
                    </h2>
                    <div className="p-4">
                        <label htmlFor="article-title" className="mb-2 flex gap-2 items-center block text-white">
                            <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                            Nazwa
                        </label>
                        <input
                            type="text"
                            name="teamName"
                            placeholder="Nazwa drużyny..."
                            value={newTeamName}
                            onChange={(event) => setNewTeamName(event.target.value)}
                            className="w-full min-w-0 border p-2.5 text-white"
                            required
                        />
                        <label htmlFor="teamFaceitId" className="block text-white my-4">
                            ID drużyny FACEIT
                        </label>
                        <input
                            id="teamFaceitId"
                            type="text"
                            name="teamFaceitId"
                            placeholder="ID drużyny FACEIT"
                            value={newFaceitID}
                            onChange={(event) => setNewFaceitID(event.target.value)}
                            className="w-full min-w-0 border p-2.5 text-white"
                            required
                        />
                        <div>
                            <label htmlFor="teamLogoInput" className="sr-only">Wybierz logo</label>
                            <label className="mt-4 flex cursor-pointer items-center justify-center rounded border border-white/10 bg-bg-light px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-highlight">
                                <img src={fileIcon} alt="" aria-hidden="true" className="mr-2 h-4 w-4 invert opacity-70" />
                                {logoFile?.name ?? "Wybierz logo"}
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
                            className="mt-4 w-fit cursor-pointer rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="inline-flex items-center gap-2">
                                <img src={addIcon} alt="" aria-hidden="true" className="h-4 w-4 invert" />
                                {loading ? "Przetwarzanie..." : "Dodaj drużynę"}
                            </span>
                        </button>
                    </div>
                </form>
                <form onSubmit={addArticle} className="min-w-0 border border-white/10 xl:col-span-2">
                    <h2 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        Dodanie artykułu
                    </h2>
                    <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                        <div className="grid content-start gap-4">
                            <div>
                                <label htmlFor="article-title" className="mb-2 flex items-center gap-2 text-white">
                                    <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                                    Tytuł
                                </label>
                                <input
                                    id="article-title"
                                    type="text"
                                    value={articleTitle}
                                    onChange={(event) => setArticleTitle(event.target.value)}
                                    className="w-full min-w-0 border p-2.5"
                                    placeholder="Wpisz tytuł artykułu"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="article-author" className="mb-2 flex items-center gap-2 text-white">
                                    <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                                    Autor
                                </label>
                                <input
                                    id="article-author"
                                    type="text"
                                    value={articleAuthor}
                                    onChange={(event) => setArticleAuthor(event.target.value)}
                                    className="w-full min-w-0 border p-2.5"
                                    placeholder="Imię lub pseudonim autora"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="article-cover" className="mb-2 flex items-center gap-2 text-white">
                                    <img src={fileIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                                    Okładka artykułu
                                </label>
                                <input
                                    type="file"
                                    id="article-cover"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(event) =>
                                        setArticleCoverFile(event.target.files?.[0] ?? null)
                                    }
                                    className="w-full min-w-0 border p-2.5 text-sm file:mr-3 file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    PNG, JPG lub WebP · maksymalnie 10 MB
                                </p>
                                {articleCoverFile && (
                                    <p className="mt-2 truncate text-xs text-gray-400">
                                        Wybrano: {articleCoverFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="article-content" className="mb-2 flex items-center gap-2 text-white">
                                <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                                Treść artykułu
                            </label>
                            <Suspense fallback={<p className="border border-white/10 p-4 text-sm text-gray-400">Ładowanie edytora...</p>}>
                                <ArticleEditor
                                    value={articleContent}
                                    onChange={setArticleContent}
                                    onUploadImage={uploadArticleImage}
                                    onUploadingChange={setArticleImageUploading}
                                    onError={(error) => {
                                        console.error("Error uploading article image:", error);
                                        showMessage(error.message || "Nie udało się dodać obrazu.", "error");
                                    }}
                                />
                            </Suspense>
                        </div>
                        <div className="xl:col-span-2">
                            <button
                                type="submit"
                                disabled={loading || articleImageUploading}
                                className="w-fit cursor-pointer rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <img src={addIcon} alt="" aria-hidden="true" className="h-4 w-4 invert" />
                                    {loading ? "Przetwarzanie..." : "Opublikuj artykuł"}
                                </span>
                            </button>
                        </div>
                    </div>
                </form>
                <form onSubmit={addPlayer} className="mb-4 min-w-0 border border-white/10">
                    <h2 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        Dodanie gracza
                    </h2>
                    <div className="p-4">
                        <label htmlFor="article-title" className="mb-2 flex gap-2 items-center block text-white">
                            <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                            Nazwa
                        </label>
                        <input
                            id="new-player-name"
                            type="text"
                            name="playerNickname"
                            placeholder="Nazwa gracza..."
                            value={newPlayer}
                            onChange={(event) => setNewPlayer(event.target.value)}
                            className="w-full min-w-0 border p-2.5 text-white"
                            required
                        />
                        <label htmlFor="article-title" className="mb-2 mt-4 flex gap-2 items-center block text-white">
                            <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                            Link do steama
                        </label>
                        <input
                            id="new-player-steam"
                            type="text"
                            name="steamLink"
                            placeholder="Link do steama..."
                            value={newSteam}
                            onChange={(event) => setNewSteam(event.target.value)}
                            className="w-full min-w-0 border p-2.5 text-white"
                            required
                        />
                        <label htmlFor="new-player-team" className="block text-white mb-2 mt-4">Drużyna</label>
                        <select
                            id="new-player-team"
                            value={newPlayerTeam}
                            onChange={(event) => setNewPlayerTeam(event.target.value)}
                            className="border p-2 text-sm"
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
                            className="mt-4 w-fit cursor-pointer rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="inline-flex items-center gap-2">
                                <img src={addIcon} alt="" aria-hidden="true" className="h-4 w-4 invert" />
                                {loading ? "Przetwarzanie..." : "Dodaj gracza"}
                            </span>
                        </button>
                    </div>
                </form>
                <form onSubmit={updatePlayer} className="mb-4 min-w-0 border border-white/10">
                    <h2 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        Edytuj gracza
                    </h2>
                    <div className="p-4">
                        <label htmlFor="edit-player-select" className="block text-white mb-2">Wybierz gracza</label>
                        <select
                            id="edit-player-select"
                            value={selectedPlayerId}
                            onChange={selectPlayer}
                            className="border p-2 text-sm"
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
                                    className="w-full min-w-0 border p-2.5 text-white"
                                    required
                                />
                                <label htmlFor="edit-player-steam" className="mb-2 mt-4 flex items-center gap-2 text-white">
                                    <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                                    Link do steama
                                </label>
                                <input
                                    id="edit-player-steam"
                                    type="text"
                                    value={updatedPlayerSteam}
                                    onChange={(event) => setUpdatedPlayerSteam(event.target.value)}
                                    className="w-full min-w-0 border p-2.5 text-white"
                                    required
                                />
                                <label htmlFor="edit-player-team" className="block text-white mb-2 mt-4">Drużyna</label>
                                <select
                                    id="edit-player-team"
                                    value={updatedPlayerTeam}
                                    onChange={(event) => setUpdatedPlayerTeam(event.target.value)}
                                    className="border p-2 text-sm"
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
                            className="mt-4 w-fit cursor-pointer rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="inline-flex items-center gap-2">
                                <img src={acceptIcon} alt="" aria-hidden="true" className="h-4 w-4 invert" />
                                {loading ? "Przetwarzanie..." : "Zapisz zmiany"}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={removePlayer}
                            disabled={loading || !selectedPlayerId}
                            className="ml-3 mt-4 w-fit cursor-pointer rounded border border-red-800/60 bg-transparent px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="inline-flex items-center gap-2">
                                <img src={removeIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-80" />
                                Usuń gracza
                            </span>
                        </button>
                    </div>
                </form>
                <section className="min-w-0 border border-white/10 xl:col-span-2">
                    <h2 className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        <img src={clockIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                        Mecze
                    </h2>
                    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        <div className="min-w-0">
                            <label htmlFor="match-to-edit" className="mb-2 block text-sm text-gray-300">
                                Wybierz mecz do edycji
                            </label>
                            <select
                                id="match-to-edit"
                                value={selectedMatchId}
                                onChange={selectMatchToEdit}
                                className="w-full border p-2.5 text-sm"
                            >
                                <option value="">Dodaj nowy mecz</option>
                                {matches.map((match) => (
                                    <option key={match.id} value={String(match.id)}>
                                        {match.team_1?.name ?? "Drużyna 1"} vs {match.team_2?.name ?? "Drużyna 2"}
                                        {" · "}
                                        {match.time
                                            ? new Date(match.time).toLocaleString("pl-PL", {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                            })
                                            : "Bez terminu"}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500">
                                Wybierz istniejący mecz, aby zmienić drużyny, turniej lub termin.
                            </p>
                        </div>

                        <form onSubmit={saveMatch} className="grid min-w-0 gap-3 sm:grid-cols-2">
                            <div className="min-w-0">
                                <label htmlFor="match-team-1" className="mb-1 block text-xs text-gray-400">
                                    Drużyna 1
                                </label>
                                <select
                                    id="match-team-1"
                                    value={matchForm.team_1_id}
                                    onChange={(event) => setMatchForm((current) => ({
                                        ...current,
                                        team_1_id: event.target.value,
                                    }))}
                                    className="w-full border p-2.5 text-sm"
                                    required
                                >
                                    <option value="">Wybierz drużynę</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={String(team.id)}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="match-team-2" className="mb-1 block text-xs text-gray-400">
                                    Drużyna 2
                                </label>
                                <select
                                    id="match-team-2"
                                    value={matchForm.team_2_id}
                                    onChange={(event) => setMatchForm((current) => ({
                                        ...current,
                                        team_2_id: event.target.value,
                                    }))}
                                    className="w-full border p-2.5 text-sm"
                                    required
                                >
                                    <option value="">Wybierz drużynę</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={String(team.id)}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="match-tournament" className="mb-1 block text-xs text-gray-400">
                                    Turniej
                                </label>
                                <select
                                    id="match-tournament"
                                    value={matchForm.league}
                                    onChange={(event) => setMatchForm((current) => ({
                                        ...current,
                                        league: event.target.value,
                                    }))}
                                    className="w-full border p-2.5 text-sm"
                                    required
                                >
                                    <option value="">Wybierz turniej</option>
                                    {tournaments.map((tournament) => (
                                        <option key={tournament.id} value={String(tournament.id)}>
                                            {tournament.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="match-time" className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
                                    <img src={clockIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-60" />
                                    Data i godzina
                                </label>
                                <input
                                    id="match-time"
                                    type="datetime-local"
                                    value={matchForm.time}
                                    onChange={(event) => setMatchForm((current) => ({
                                        ...current,
                                        time: event.target.value,
                                    }))}
                                    className="w-full border p-2.5 text-sm"
                                    required
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 sm:col-span-2">
                                <button
                                    type="submit"
                                    disabled={loading || teams.length < 2 || tournaments.length === 0}
                                    className="rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <img
                                            src={selectedMatchId ? acceptIcon : addIcon}
                                            alt=""
                                            aria-hidden="true"
                                            className="h-4 w-4 invert"
                                        />
                                        {loading ? "Zapisywanie..." : selectedMatchId ? "Zapisz zmiany" : "Dodaj mecz"}
                                    </span>
                                </button>
                                {selectedMatchId && (
                                    <button
                                        type="button"
                                        onClick={resetMatchForm}
                                        disabled={loading}
                                        className="rounded border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50"
                                    >
                                        Anuluj edycję
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </section>
    );
};

export default AdminPanel;
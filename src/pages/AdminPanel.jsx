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

const parseTournamentAchievements = (achievements) =>
    (achievements ?? []).map((achievement) => ({
        id: crypto.randomUUID(),
        achievementId: achievement.id,
        kind: achievement.team_source === "custom" ? "custom" : "team",
        teamId: achievement.team_source === "linked"
            ? achievement.team_id == null
                ? "__deleted__"
                : String(achievement.team_id)
            : "",
        teamName: achievement.team_source === "custom" ? achievement.team_name : "",
        teamNameSnapshot: achievement.team_name ?? "",
        placement: achievement.placement ?? "",
        rosterSnapshot: Array.isArray(achievement.roster) ? achievement.roster : [],
        rosterPlayerIds: (achievement.roster ?? [])
            .flatMap((player) => Number.isSafeInteger(player?.id) ? [String(player.id)] : []),
    }));

const AdminPanel = () => {
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([])
    const [tournaments, setTournaments] = useState([]);
    const [tournamentAchievements, setTournamentAchievements] = useState([]);
    const [matches, setMatches] = useState([]);
    const [pendingAnnouncements, setPendingAnnouncements] = useState([]);
    const [approvingAnnouncementId, setApprovingAnnouncementId] = useState(null);
    const [selectedMatchId, setSelectedMatchId] = useSessionState("admin-selected-match-id", "");
    const [matchForm, setMatchForm] = useSessionState("admin-match-form", {
        team_1_id: "",
        team_2_id: "",
        league: "",
        time: "",
        team_1_score: "",
        team_2_score: "",
        finished: false,
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
    const [newTournament, setNewTournament] = useSessionState("admin-new-tournament-name", "");
    const [amountOfTeams, setAmountOfTeams] = useSessionState("admin-new-tournament-amount", "");
    const [registeredTeams, setRegisteredTeams] = useSessionState("admin-new-tournament-reg", "");
    const [newTournamentDesc, setNewTournamentDesc] = useSessionState("admin-new-tournament-desc", "");
    const [newTournamentDate, setNewTournamentDate] = useSessionState("admin-new-tournament-date", "");
    const [newTournamentLink, setNewTournamentLink] = useSessionState("admin-new-tournament-link", "");
    const [selectedTournamentId, setSelectedTournamentId] = useSessionState("admin-selected-tournament-id", "");
    const [tournamentLogoFile, setTournamentLogoFile] = useSessionFileState("admin-tournament-logo");
    const [tournamentFinished, setTournamentFinished] = useSessionState("admin-tournament-finished", "");
    const [tournamentWinners, setTournamentWinners] = useSessionState("admin-tournament-winners", []);


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
    const [updatedCoachId, setUpdatedCoachId] = useSessionState(
        "admin-updated-coach-id",
        ""
    );

    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ text: "", type: "" });

    const showMessage = (text, type) => setFeedback({ text, type });
    const clearMessage = () => setFeedback({ text: "", type: "" });

    const selectedTeam = teams.find(
        (team) => String(team.id) === selectedTeamId
    );

    const loadPendingAnnouncements = useCallback(async () => {
        const { data, error } = await supabase
            .from("announcements")
            .select("id, title, content, created_at, added_by_username")
            .eq("is_approved", false)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error loading pending announcements:", error.message);
            setFeedback({
                text: `Błąd ładowania oczekujących ogłoszeń: ${error.message}`,
                type: "error",
            });
            return false;
        }

        setPendingAnnouncements(data ?? []);
        return true;
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadPendingAnnouncements);
    }, [loadPendingAnnouncements]);

    const approveAnnouncement = async (announcement) => {
        setApprovingAnnouncementId(announcement.id);
        clearMessage();

        const { data, error } = await supabase
            .from("announcements")
            .update({ is_approved: true })
            .eq("id", announcement.id)
            .eq("is_approved", false)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Error approving announcement:", error.message);
            showMessage(`Błąd akceptowania ogłoszenia: ${error.message}`, "error");
            setApprovingAnnouncementId(null);
            return;
        }

        if (!data) {
            await loadPendingAnnouncements();
            showMessage("To ogłoszenie nie jest już oczekujące na akceptację.", "error");
            setApprovingAnnouncementId(null);
            return;
        }

        setPendingAnnouncements((current) =>
            current.filter((item) => item.id !== announcement.id)
        );
        showMessage("Ogłoszenie zostało opublikowane.", "success");
        setApprovingAnnouncementId(null);
    };

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
                steam_profile,
                coach_teams:teams!teams_coach_id_fkey(id)
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
        const [matchesResult, tournamentsResult, achievementsResult] = await Promise.all([
            supabase
                .from("matches")
                .select(`
                    id,
                    time,
                    team_1_id,
                    team_2_id,
                    league,
                    team_1_score,
                    team_2_score,
                    finished,
                    team_2_name,
                    team_1:teams!matches_team_1_id_fkey(name),
                    team_2:teams!matches_team_2_id_fkey(name),
                    tournament:tournaments!matches_league_fkey(name)
                `)
                .is("faceit_match_id", null)
                .order("time", { ascending: false }),
            supabase.from("tournaments").select("*").order("name"),
            supabase
                .from("tournament_achievements")
                .select("id, tournament_id, team_id, team_source, team_name, placement, roster")
                .order("id", { ascending: true }),
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

        if (achievementsResult.error) {
            console.error("Error loading tournament achievements:", achievementsResult.error.message);
            showMessage(`Błąd ładowania osiągnięć turniejowych: ${achievementsResult.error.message}`, "error");
        } else {
            setTournamentAchievements(achievementsResult.data ?? []);
        }

        return !matchesResult.error && !tournamentsResult.error && !achievementsResult.error;
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadMatchesAndTournaments);
    }, [loadMatchesAndTournaments]);

    const resetEditor = () => {
        setSelectedTeamId("");
        setUpdatedName("");
        setUpdatedFaceitId("");
        setUpdatedCoachId("");
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
        setUpdatedCoachId(team?.coach_id == null ? "" : String(team.coach_id));
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
        const coach = players.find(
            (player) => String(player.id) === updatedCoachId
        );
        const pointsToReduce = Number(reducePoints || 0);
        const pointsToIncrease = Number(increasePoints || 0);

        if (!name) {
            showMessage("Nazwa drużyny nie może być pusta.", "error");
            return;
        }

        if (updatedCoachId && !coach) {
            showMessage("Wybrany coach nie istnieje w bazie graczy.", "error");
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
                coach_id: coach?.id ?? null,
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

        const previousCoachId = selectedTeam?.coach_id ?? null;
        const nextCoachId = coach?.id ?? null;
        const coachChanged = String(previousCoachId ?? "") !== String(nextCoachId ?? "");
        let transfersChanged = false;

        if (coachChanged) {
            const coachTransfers = [
                ...(previousCoachId == null ? [] : [{
                    player_id: previousCoachId,
                    from_id: selectedTeam.id,
                    to_id: null,
                    is_coach: true,
                }]),
                ...(nextCoachId == null ? [] : [{
                    player_id: nextCoachId,
                    from_id: null,
                    to_id: selectedTeam.id,
                    is_coach: true,
                }]),
            ];

            if (coachTransfers.length > 0) {
                const { error: coachTransferError } = await supabase
                    .from("transfers")
                    .insert(coachTransfers);

                if (coachTransferError) {
                    console.error("Error recording coach transfer:", coachTransferError.message);
                    showMessage(`Błąd zapisu transferu coacha: ${coachTransferError.message}`, "error");
                    await Promise.all([loadTeams(), loadPlayers()]);
                    setLoading(false);
                    return;
                }

                transfersChanged = true;
            }
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
            setUpdatedCoachId(coach ? String(coach.id) : "");
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

    const resetTournamentForm = () => {
        setSelectedTournamentId("");
        setNewTournament("");
        setAmountOfTeams("");
        setRegisteredTeams("");
        setNewTournamentDesc("");
        setNewTournamentDate("");
        setNewTournamentLink("");
        setTournamentFinished(false)
        setTournamentWinners([]);
        setTournamentLogoFile(null);
    };

    const selectTournamentToEdit = (event) => {
        const tournamentId = event.target.value;
        const tournament = tournaments.find((item) => String(item.id) === tournamentId);
        setSelectedTournamentId(tournamentId);

        if (!tournament) {
            resetTournamentForm();
            return;
        }

        const startDate = tournament.starts ? new Date(tournament.starts) : null;
        const localStart = startDate && !Number.isNaN(startDate.getTime())
            ? new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)
            : "";

        setNewTournament(tournament.name ?? "");
        setAmountOfTeams(String(tournament.amount_of_teams ?? ""));
        setRegisteredTeams(String(tournament.registered_teams ?? ""));
        setNewTournamentDesc(tournament.description ?? "");
        setNewTournamentDate(localStart);
        setNewTournamentLink(tournament.link ?? "");
        setTournamentFinished(tournament.finished ?? "")
        setTournamentWinners(parseTournamentAchievements(
            tournamentAchievements.filter(
                (achievement) => String(achievement.tournament_id) === tournamentId
            )
        ));
        setTournamentLogoFile(null);
    };

    const addTournamentWinner = () => {
        setTournamentWinners((current) => [
            ...current,
            {
                id: crypto.randomUUID(),
                achievementId: crypto.randomUUID(),
                kind: "team",
                teamId: "",
                teamName: "",
                placement: "",
                rosterSnapshot: null,
                rosterPlayerIds: [],
            },
        ]);
    };

    const updateTournamentWinner = (winnerId, updates) => {
        setTournamentWinners((current) =>
            current.map((winner) =>
                winner.id === winnerId ? { ...winner, ...updates } : winner
            )
        );
    };

    const removeTournamentWinner = (winnerId) => {
        setTournamentWinners((current) =>
            current.filter((winner) => winner.id !== winnerId)
        );
    };

    const saveTournament = async (event) => {
        event.preventDefault();

        const name = newTournament.trim();
        const amount = Number(amountOfTeams);
        const registered = Number(registeredTeams);
        const description = newTournamentDesc.trim();
        const link = newTournamentLink.trim();
        const starts = new Date(newTournamentDate);

        if (
            !name ||
            !description ||
            amountOfTeams === "" ||
            registeredTeams === "" ||
            !newTournamentDate
        ) {
            showMessage("Wypełnij wszystkie pola.", "error");
            return;
        }

        if (
            !Number.isInteger(amount) ||
            amount < 0 ||
            !Number.isInteger(registered) ||
            registered < 0
        ) {
            showMessage("Liczba drużyn musi być nieujemną liczbą całkowitą.", "error");
            return;
        }

        if (Number.isNaN(starts.getTime())) {
            showMessage("Podana data rozpoczęcia jest nieprawidłowa.", "error");
            return;
        }

        if (link) {
            try {
                const parsedLink = new URL(link);
                if (!["http:", "https:"].includes(parsedLink.protocol)) {
                    throw new Error("Unsupported protocol");
                }
            } catch {
                showMessage("Podaj prawidłowy adres URL rozpoczynający się od http:// lub https://.", "error");
                return;
            }
        }

        const winnerRows = Array.isArray(tournamentWinners) ? tournamentWinners : [];
        const preparedWinners = [];

        for (const winner of winnerRows) {
            const placement = String(winner.placement ?? "").trim() || null;

            if (winner.kind === "team") {
                if (winner.teamId === "__deleted__" && winner.teamNameSnapshot) {
                    preparedWinners.push({
                        achievementId: winner.achievementId ?? winner.id,
                        winnerId: winner.id,
                        teamId: null,
                        teamSource: "linked",
                        teamName: winner.teamNameSnapshot,
                        placement,
                        roster: Array.isArray(winner.rosterSnapshot)
                            ? winner.rosterSnapshot
                            : [],
                    });
                    continue;
                }

                if (!winner.teamId) {
                    if (placement) {
                        showMessage("Wybierz drużynę dla każdego podanego miejsca.", "error");
                        return;
                    }
                    continue;
                }

                const team = teams.find((item) => String(item.id) === winner.teamId);
                const teamId = Number(team?.id ?? winner.teamId);
                if (!Number.isSafeInteger(teamId)) {
                    showMessage("Wybrana drużyna ma nieprawidłowy identyfikator.", "error");
                    return;
                }

                preparedWinners.push({
                    achievementId: winner.achievementId ?? winner.id,
                    winnerId: winner.id,
                    teamId,
                    teamSource: "linked",
                    teamName: team?.name ?? winner.teamNameSnapshot ?? `Drużyna #${teamId}`,
                    placement,
                    roster: Array.isArray(winner.rosterSnapshot)
                        ? winner.rosterSnapshot
                        : team
                            ? null
                            : [],
                });
            } else if (winner.kind === "custom") {
                const teamName = String(winner.teamName ?? "").trim();
                if (!teamName) {
                    if (placement) {
                        showMessage("Podaj nazwę drużyny dla każdego podanego miejsca.", "error");
                        return;
                    }
                    continue;
                }

                const rosterPlayerIds = Array.isArray(winner.rosterPlayerIds)
                    ? winner.rosterPlayerIds.map(Number)
                    : [];
                if (rosterPlayerIds.some((playerId) => !Number.isSafeInteger(playerId))) {
                    showMessage("Wybierz prawidłowych graczy do składu osiągnięcia.", "error");
                    return;
                }

                preparedWinners.push({
                    achievementId: winner.achievementId ?? winner.id,
                    winnerId: winner.id,
                    teamId: null,
                    teamSource: "custom",
                    teamName,
                    placement,
                    roster: Array.isArray(winner.rosterSnapshot)
                        ? winner.rosterSnapshot
                        : null,
                    rosterPlayerIds,
                });
            }
        }

        let logoPath = tournaments.find(
            (tournament) => String(tournament.id) === selectedTournamentId
        )?.logo ?? null;

        if (tournamentLogoFile) {
            const extensions = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
            };
            const extension = extensions[tournamentLogoFile.type];

            if (!extension) {
                showMessage("Wybierz logo PNG, JPG lub WebP.", "error");
                return;
            }

            if (tournamentLogoFile.size > 10 * 1024 * 1024) {
                showMessage("Logo może mieć maksymalnie 10 MB.", "error");
                return;
            }

            logoPath = `${crypto.randomUUID()}.${extension}`;
        }

        setLoading(true);
        clearMessage();

        const teamsToSnapshot = [...new Set(
            preparedWinners
                .filter((winner) =>
                    winner.teamSource === "linked" &&
                    winner.teamId != null &&
                    winner.roster === null
                )
                .map((winner) => winner.teamId)
        )];
        const rosterByTeamId = new Map();
        const rosterByWinnerId = new Map();

        if (teamsToSnapshot.length > 0) {
            const { data: snapshotTeams, error: snapshotTeamsError } = await supabase
                .from("teams")
                .select("id, name, player1, player2, player3, player4, player5")
                .in("id", teamsToSnapshot);

            if (snapshotTeamsError) {
                console.error("Error loading tournament winner rosters:", snapshotTeamsError.message);
                showMessage(`Błąd pobierania składów drużyn: ${snapshotTeamsError.message}`, "error");
                setLoading(false);
                return;
            }

            const snapshotTeamsById = new Map(
                (snapshotTeams ?? []).map((team) => [String(team.id), team])
            );
            if (teamsToSnapshot.some((teamId) => !snapshotTeamsById.has(String(teamId)))) {
                showMessage("Jedna z wybranych drużyn już nie istnieje. Odśwież formularz i spróbuj ponownie.", "error");
                setLoading(false);
                return;
            }

            const snapshotPlayerIds = [...new Set(
                (snapshotTeams ?? []).flatMap((team) => teamPlayerIds(team))
                    .filter((playerId) => playerId != null && String(playerId).trim() !== "")
                    .map(Number)
            )];
            if (snapshotPlayerIds.some((playerId) => !Number.isSafeInteger(playerId))) {
                showMessage("Nie można zapisać składu: identyfikator gracza jest nieprawidłowy.", "error");
                setLoading(false);
                return;
            }

            let snapshotPlayers = [];
            if (snapshotPlayerIds.length > 0) {
                const { data, error: snapshotPlayersError } = await supabase
                    .from("players")
                    .select("id, name")
                    .in("id", snapshotPlayerIds);

                if (snapshotPlayersError) {
                    console.error("Error loading tournament winner roster players:", snapshotPlayersError.message);
                    showMessage(`Błąd pobierania graczy ze składu: ${snapshotPlayersError.message}`, "error");
                    setLoading(false);
                    return;
                }
                snapshotPlayers = data ?? [];
            }

            const snapshotPlayersById = new Map(
                snapshotPlayers.map((player) => [String(player.id), player])
            );

            (snapshotTeams ?? []).forEach((team) => {
                const roster = teamPlayerIds(team).flatMap((rawPlayerId) => {
                    const playerId = rawPlayerId == null || String(rawPlayerId).trim() === ""
                        ? null
                        : rawPlayerId;
                    if (playerId == null) return [];

                    const player = snapshotPlayersById.get(String(playerId));
                    return [{
                        id: Number(playerId),
                        name: player?.name ?? null,
                    }];
                });
                rosterByTeamId.set(String(team.id), {
                    name: team.name,
                    roster,
                });
            });
        }

        const customWinnersToSnapshot = preparedWinners.filter(
            (winner) => winner.teamSource === "custom" && winner.roster === null
        );
        const customRosterPlayerIds = [...new Set(
            customWinnersToSnapshot.flatMap((winner) => winner.rosterPlayerIds)
        )];
        if (customRosterPlayerIds.length > 0) {
            const { data: customRosterPlayers, error: customRosterPlayersError } = await supabase
                .from("players")
                .select("id, name")
                .in("id", customRosterPlayerIds);

            if (customRosterPlayersError) {
                console.error("Error loading custom tournament roster players:", customRosterPlayersError.message);
                showMessage(`Błąd pobierania graczy do składu: ${customRosterPlayersError.message}`, "error");
                setLoading(false);
                return;
            }

            const customRosterPlayersById = new Map(
                (customRosterPlayers ?? []).map((player) => [String(player.id), player])
            );
            if (customRosterPlayerIds.some((playerId) => !customRosterPlayersById.has(String(playerId)))) {
                showMessage("Jeden z wybranych graczy nie istnieje już. Odśwież formularz i spróbuj ponownie.", "error");
                setLoading(false);
                return;
            }

            customWinnersToSnapshot.forEach((winner) => {
                const roster = winner.rosterPlayerIds.map((playerId) => {
                    const player = customRosterPlayersById.get(String(playerId));
                    return { id: Number(player.id), name: player.name };
                });
                rosterByWinnerId.set(winner.winnerId, roster);
            });
        } else {
            customWinnersToSnapshot.forEach((winner) => {
                rosterByWinnerId.set(winner.winnerId, []);
            });
        }

        const achievementData = preparedWinners.map((winner) => {
            const teamSnapshot = winner.teamId == null
                ? null
                : rosterByTeamId.get(String(winner.teamId));
            return {
                id: winner.achievementId,
                team_id: winner.teamId,
                team_source: winner.teamSource,
                team_name: teamSnapshot?.name ?? winner.teamName,
                placement: winner.placement,
                roster: winner.roster ??
                    (winner.teamSource === "linked"
                        ? teamSnapshot?.roster
                        : rosterByWinnerId.get(winner.winnerId)) ??
                    [],
            };
        });

        if (tournamentLogoFile) {
            const { error: uploadError } = await supabase.storage
                .from("tournaments")
                .upload(logoPath, tournamentLogoFile, {
                    contentType: tournamentLogoFile.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error("Error uploading tournament logo:", uploadError.message);
                showMessage(`Błąd przesyłania logo turnieju: ${uploadError.message}`, "error");
                setLoading(false);
                return;
            }
        }

        const tournamentData = {
            name,
            amount_of_teams: amount,
            registered_teams: registered,
            starts: starts.toISOString(),
            description,
            link: link || null,
            logo: logoPath,
            finished: tournamentFinished,
        };

        const result = selectedTournamentId
            ? await supabase
                .from("tournaments")
                .update(tournamentData)
                .eq("id", selectedTournamentId)
                .select("id")
                .single()
            : await supabase.from("tournaments").insert(tournamentData).select("id").single();

        if (result.error) {
            console.error("Error saving tournament:", result.error.message);
            if (tournamentLogoFile && logoPath) {
                const { error: cleanupError } = await supabase.storage
                    .from("tournaments")
                    .remove([logoPath]);

                if (cleanupError) {
                    console.error("Error removing unused tournament logo:", cleanupError.message);
                }
            }
            showMessage(`Błąd zapisywania turnieju: ${result.error.message}`, "error");
            setLoading(false);
            return;
        }

        const savedTournamentId = result.data.id;
        setTournaments((current) => [
            ...current.filter((tournament) => String(tournament.id) !== String(savedTournamentId)),
            { ...tournamentData, id: savedTournamentId },
        ]);
        setTournamentLogoFile(null);

        if (!selectedTournamentId) {
            setSelectedTournamentId(String(savedTournamentId));
        }

        const achievementRows = achievementData.map((achievement) => ({
            ...achievement,
            tournament_id: savedTournamentId,
        }));
        let saveAchievementsError = null;
        if (achievementRows.length > 0) {
            const { error } = await supabase
                .from("tournament_achievements")
                .upsert(achievementRows, { onConflict: "id" });
            saveAchievementsError = error;
        }

        if (saveAchievementsError) {
            console.error("Error saving tournament achievements:", saveAchievementsError.message);
            showMessage(
                `Turniej został zapisany, ale nie udało się zapisać osiągnięć: ${saveAchievementsError.message}`,
                "error"
            );
            setLoading(false);
            return;
        }

        const retainedAchievementIds = new Set(
            achievementRows.map((achievement) => String(achievement.id))
        );
        const removedAchievementIds = tournamentAchievements
            .filter((achievement) =>
                String(achievement.tournament_id) === String(savedTournamentId) &&
                !retainedAchievementIds.has(String(achievement.id))
            )
            .map((achievement) => achievement.id);

        if (removedAchievementIds.length > 0) {
            const { error: removeAchievementsError } = await supabase
                .from("tournament_achievements")
                .delete()
                .in("id", removedAchievementIds);

            if (removeAchievementsError) {
                console.error("Error removing tournament achievements:", removeAchievementsError.message);
                showMessage(
                    `Turniej został zapisany, ale nie udało się usunąć części osiągnięć: ${removeAchievementsError.message}`,
                    "error"
                );
                setLoading(false);
                return;
            }
        }

        const refreshed = await loadMatchesAndTournaments();
        if (refreshed) {
            resetTournamentForm();
            showMessage(
                selectedTournamentId ? "Turniej został zaktualizowany." : "Turniej został dodany.",
                "success"
            );
        }

        setLoading(false);
    };

    const removeTournament = async () => {
        const tournament = tournaments.find(
            (item) => String(item.id) === selectedTournamentId
        );

        if (!tournament) {
            showMessage("Najpierw wybierz turniej.", "error");
            return;
        }

        if (!window.confirm(`Czy na pewno chcesz usunąć turniej "${tournament.name}"?`)) {
            return;
        }

        setLoading(true);
        clearMessage();

        const { error } = await supabase
            .from("tournaments")
            .delete()
            .eq("id", selectedTournamentId);

        if (error) {
            console.error("Error deleting tournament:", error.message);
            showMessage(`Błąd usuwania turnieju: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        const refreshed = await loadMatchesAndTournaments();
        if (refreshed) {
            resetTournamentForm();
            showMessage("Turniej został usunięty.", "success");
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
        if (String(player.id) === updatedCoachId) {
            setUpdatedCoachId("");
        }

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
            team_1_score: "",
            team_2_score: "",
            finished: false,
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
            team_1_score: match.team_1_score == null ? "" : String(match.team_1_score),
            team_2_score: match.team_2_score == null ? "" : String(match.team_2_score),
            finished: Boolean(match.finished),
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

        const score1Value = matchForm.team_1_score ?? "";
        const score2Value = matchForm.team_2_score ?? "";
        const score1 = score1Value === "" ? null : Number(score1Value);
        const score2 = score2Value === "" ? null : Number(score2Value);

        if (
            (score1 !== null && (!Number.isInteger(score1) || score1 < 0)) ||
            (score2 !== null && (!Number.isInteger(score2) || score2 < 0))
        ) {
            showMessage("Wynik musi składać się z nieujemnych liczb całkowitych.", "error");
            return;
        }

        if (matchForm.finished && (score1 === null || score2 === null)) {
            showMessage("Podaj wynik obu drużyn, aby oznaczyć mecz jako zakończony.", "error");
            return;
        }

        const matchData = {
            team_1_id: matchForm.team_1_id,
            team_2_id: matchForm.team_2_id,
            league: matchForm.league,
            time: matchTime.toISOString(),
            team_1_score: score1,
            team_2_score: score2,
            finished: Boolean(matchForm.finished),
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

    const removeMatch = async () => {
        const match = matches.find(
            (item) => String(item.id) === selectedMatchId
        );

        if (!match) {
            showMessage("Najpierw wybierz mecz.", "error");
            return;
        }

        const matchName = `${match.team_1?.name ?? "Drużyna 1"} vs ${match.team_2?.name ?? "Drużyna 2"}`;
        if (!window.confirm(`Czy na pewno chcesz usunąć mecz "${matchName}"?`)) {
            return;
        }

        setLoading(true);
        clearMessage();

        const { error } = await supabase
            .from("matches")
            .delete()
            .eq("id", selectedMatchId);

        if (error) {
            console.error("Error deleting match:", error.message);
            showMessage(`Błąd usuwania meczu: ${error.message}`, "error");
            setLoading(false);
            return;
        }

        const refreshed = await loadMatchesAndTournaments();
        if (refreshed) {
            resetMatchForm();
            showMessage("Mecz został usunięty.", "success");
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
                <section className="min-w-0 border border-white/10 xl:col-span-2">
                    <h2 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        Ogłoszenia do akceptacji ({pendingAnnouncements.length})
                    </h2>
                    {pendingAnnouncements.length === 0 ? (
                        <p className="p-4 text-sm text-gray-400">
                            Brak ogłoszeń oczekujących na akceptację.
                        </p>
                    ) : (
                        <ul className="divide-y divide-white/10">
                            {pendingAnnouncements.map((announcement) => (
                                <li key={announcement.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                                    <article className="min-w-0">
                                        <h3 className="break-words font-bold text-white">
                                            {announcement.title}
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-400">
                                            Dodane przez: {announcement.added_by_username || "Nieznany użytkownik"}
                                            {announcement.created_at
                                                ? ` · ${new Date(announcement.created_at).toLocaleString("pl-PL")}`
                                                : ""}
                                        </p>
                                        <p className="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-gray-300">
                                            {announcement.content}
                                        </p>
                                    </article>
                                    <button
                                        type="button"
                                        onClick={() => approveAnnouncement(announcement)}
                                        disabled={approvingAnnouncementId !== null}
                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <img src={acceptIcon} alt="" aria-hidden="true" className="h-4 w-4 invert" />
                                        {approvingAnnouncementId === announcement.id ? "Publikowanie..." : "Zatwierdź i opublikuj"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

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
                                    <label htmlFor="updated-coach" className="text-white">
                                        Coach
                                    </label>
                                    <select
                                        id="updated-coach"
                                        value={updatedCoachId}
                                        onChange={(event) => setUpdatedCoachId(event.target.value)}
                                        className="mb-4 mt-2 w-full min-w-0 border p-2.5 text-white"
                                    >
                                        <option value="">Brak coacha</option>
                                        {players.map((player) => (
                                            <option key={player.id} value={String(player.id)}>
                                                {player.name}{player.coach_teams?.length ? " — Coach" : ""}
                                            </option>
                                        ))}
                                    </select>
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
                                        {match.team_1?.name ?? "Drużyna 1"} vs {match.team_2?.name ?? match.team_2_name ?? "Drużyna 2"}
                                        {match.finished && ` · ${match.team_1_score ?? "—"}:${match.team_2_score ?? "—"}`}
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
                                Wybierz istniejący mecz, aby zmienić drużyny, turniej, termin lub wynik.
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
                            <div className="min-w-0">
                                <label htmlFor="match-team-1-score" className="mb-1 block text-xs text-gray-400">
                                    Wynik drużyny 1
                                </label>
                                <input
                                    id="match-team-1-score"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={matchForm.team_1_score ?? ""}
                                    onChange={(event) => setMatchForm((current) => ({
                                        ...current,
                                        team_1_score: event.target.value,
                                    }))}
                                    className="w-full border p-2.5 text-sm"
                                />
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="match-team-2-score" className="mb-1 block text-xs text-gray-400">
                                    Wynik drużyny 2
                                </label>
                                <input
                                    id="match-team-2-score"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={matchForm.team_2_score ?? ""}
                                    onChange={(event) => setMatchForm((current) => ({
                                        ...current,
                                        team_2_score: event.target.value,
                                    }))}
                                    className="w-full border p-2.5 text-sm"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-300 sm:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={Boolean(matchForm.finished)}
                                    onChange={(event) => setMatchForm((current) => ({
                                        ...current,
                                        finished: event.target.checked,
                                    }))}
                                    className="h-4 w-4 accent-green-600"
                                />
                                Mecz zakończony
                            </label>
                            <div className="flex flex-wrap gap-2 sm:col-span-2">
                                <button
                                    type="submit"
                                    disabled={loading || teams.length < 2 || tournaments.length === 0}
                                    className="rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer"
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
                                    <>
                                        <button
                                            type="button"
                                            onClick={resetMatchForm}
                                            disabled={loading}
                                            className="rounded border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50 hover:cursor-pointer"
                                        >
                                            Anuluj edycję
                                        </button>
                                        <button
                                            type="button"
                                            onClick={removeMatch}
                                            disabled={loading}
                                            className="rounded border border-red-800/60 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50 hover:cursor-pointer"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <img src={removeIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-80" />
                                                Usuń mecz
                                            </span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>

                    </div>
                </section>
                <form onSubmit={saveTournament} className="mb-4 min-w-0 border border-white/10">
                    <h2 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
                        Turnieje
                    </h2>
                    <div className="p-4">
                        <label htmlFor="tournament-to-edit" className="mb-2 block text-sm text-gray-300">
                            Wybierz turniej do edycji lub dodaj nowy
                        </label>
                        <select
                            id="tournament-to-edit"
                            value={selectedTournamentId}
                            onChange={selectTournamentToEdit}
                            className="mb-4 w-full border p-2.5 text-sm"
                        >
                            <option value="">Nowy turniej</option>
                            {tournaments.map((tournament) => (
                                <option key={tournament.id} value={String(tournament.id)}>
                                    {tournament.name}
                                </option>
                            ))}
                        </select>
                        <label htmlFor="new-tournament-name" className="mb-2 flex gap-2 items-center block text-white">
                            <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                            Nazwa
                        </label>
                        <input
                            id="new-tournament-name"
                            type="text"
                            name="tournamentName"
                            placeholder="Nazwa turnieju..."
                            value={newTournament}
                            onChange={(event) => setNewTournament(event.target.value)}
                            className="w-full min-w-0 border p-2.5 text-white"
                            required
                        />
                        <label htmlFor="new-tournament-desc" className="mb-2 mt-4 flex gap-2 items-center block text-white">
                            <img src={inputIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-70" />
                            Opis
                        </label>
                        <textarea
                            name="tournamentDesc"
                            id="new-tournament-desc"
                            placeholder="Opis turnieju..."
                            value={newTournamentDesc}
                            onChange={(event) => setNewTournamentDesc(event.target.value)}
                            className="w-full min-w-0 border p-2.5 text-white"
                            required
                        ></textarea>
                        <label htmlFor="tournament-link" className="mb-2 mt-4 block text-sm text-gray-300">
                            Link do turnieju
                        </label>
                        <input
                            id="tournament-link"
                            type="url"
                            value={newTournamentLink}
                            onChange={(event) => setNewTournamentLink(event.target.value)}
                            placeholder="https://..."
                            className="w-full border p-2.5 text-sm"
                        />
                        <h2 className="text-white mb-2">
                            Ilość drużyn
                        </h2>
                        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <input
                                type="number"
                                required
                                min="0"
                                name="regTeams"
                                placeholder="Zapisanych"
                                value={registeredTeams}
                                onChange={(event) => setRegisteredTeams(event.target.value)}
                                className="mb-4 w-full min-w-0 border p-2.5 text-center"
                            />
                            <input
                                type="number"
                                required
                                min="0"
                                name="increasePoints"
                                placeholder="Maksymalnie"
                                value={amountOfTeams}
                                onChange={(event) => setAmountOfTeams(event.target.value)}
                                className="mb-4 w-full min-w-0 border p-2.5 text-center"
                            />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="new-tournament-date" className="mb-2 flex gap-2 items-center block text-white">
                                <img src={clockIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-60" />
                                Rozpoczęcie
                            </label>
                            <input
                                id="new-tournament-date"
                                type="datetime-local"
                                value={newTournamentDate}
                                onChange={(event) => setNewTournamentDate(event.target.value)}
                                className="w-full border p-2.5 text-sm"
                                required
                            />
                        </div>

                        <section className="mt-4 border border-white/10">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Osiągnięcia turniejowe</h2>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Miejsce jest opcjonalne. Skład drużyny zapisuje się jako historyczny snapshot.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addTournamentWinner}
                                    disabled={loading}
                                    className="rounded border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-50"
                                >
                                    Dodaj osiągnięcie
                                </button>
                            </div>
                            <div className="space-y-3 p-3">
                                {tournamentWinners.map((winner, index) => (
                                    <div
                                        key={winner.id}
                                        className="grid min-w-0 gap-2 border border-white/10 bg-black/10 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                                    >
                                        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                                            <select
                                                aria-label={`Typ drużyny osiągnięcia ${index + 1}`}
                                                value={winner.kind}
                                                disabled={loading}
                                                onChange={(event) => updateTournamentWinner(winner.id, {
                                                    kind: event.target.value,
                                                    teamId: "",
                                                    teamName: "",
                                                    teamNameSnapshot: "",
                                                    rosterSnapshot: null,
                                                    rosterPlayerIds: [],
                                                })}
                                                className="w-full min-w-0 border p-2.5 text-sm"
                                            >
                                                <option value="team">Drużyna z serwisu</option>
                                                <option value="custom">Nazwa własna</option>
                                            </select>
                                            {winner.kind === "team" ? (
                                                <select
                                                    aria-label={`Drużyna osiągnięcia ${index + 1}`}
                                                    value={winner.teamId}
                                                    disabled={loading}
                                                    onChange={(event) => updateTournamentWinner(winner.id, {
                                                        teamId: event.target.value,
                                                        rosterSnapshot: null,
                                                    })}
                                                    className="w-full min-w-0 border p-2.5 text-sm"
                                                >
                                                    <option value="">Wybierz drużynę</option>
                                                    {winner.teamId && !teams.some(
                                                        (team) => String(team.id) === winner.teamId
                                                    ) && (
                                                            <option value={winner.teamId}>
                                                                {winner.teamNameSnapshot || `Drużyna #${winner.teamId}`} (niedostępna)
                                                            </option>
                                                        )}
                                                    {teams.map((team) => (
                                                        <option key={team.id} value={String(team.id)}>
                                                            {team.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    aria-label={`Nazwa drużyny osiągnięcia ${index + 1}`}
                                                    value={winner.teamName}
                                                    disabled={loading}
                                                    onChange={(event) => updateTournamentWinner(winner.id, {
                                                        teamName: event.target.value,
                                                    })}
                                                    placeholder="Nazwa drużyny..."
                                                    className="w-full min-w-0 border p-2.5 text-sm"
                                                />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            aria-label={`Miejsce lub wynik osiągnięcia ${index + 1} (opcjonalnie)`}
                                            value={winner.placement}
                                            disabled={loading}
                                            onChange={(event) => updateTournamentWinner(winner.id, {
                                                placement: event.target.value,
                                            })}
                                            placeholder="Miejsce lub wynik (opcjonalnie)"
                                            className="w-full min-w-0 border p-2.5 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeTournamentWinner(winner.id)}
                                            disabled={loading}
                                            aria-label={`Usuń osiągnięcie ${index + 1}`}
                                            className="rounded border border-red-800/60 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50"
                                        >
                                            Usuń
                                        </button>
                                        {winner.kind === "custom" && (
                                            <fieldset className="min-w-0 sm:col-span-3">
                                                <legend className="mb-2 text-xs font-medium text-gray-400">
                                                    Skład historyczny (opcjonalnie)
                                                </legend>
                                                {players.length > 0 ? (
                                                    <div className="grid max-h-40 gap-1 overflow-y-auto border border-white/10 bg-bg p-2 sm:grid-cols-2">
                                                        {players.map((player) => {
                                                            const playerId = String(player.id);
                                                            const selected = winner.rosterPlayerIds?.includes(playerId) ?? false;
                                                            return (
                                                                <label
                                                                    key={player.id}
                                                                    className="flex min-w-0 items-center gap-2 px-2 py-1 text-xs text-gray-300 hover:bg-white/5"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selected}
                                                                        disabled={loading}
                                                                        onChange={(event) => {
                                                                            const currentIds = winner.rosterPlayerIds ?? [];
                                                                            const nextIds = event.target.checked
                                                                                ? [...currentIds, playerId]
                                                                                : currentIds.filter((id) => id !== playerId);
                                                                            updateTournamentWinner(winner.id, {
                                                                                rosterPlayerIds: nextIds,
                                                                                rosterSnapshot: null,
                                                                            });
                                                                        }}
                                                                        className="h-4 w-4 shrink-0 accent-primary"
                                                                    />
                                                                    <span className="truncate">{player.name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-500">Brak graczy do dodania do składu.</p>
                                                )}
                                            </fieldset>
                                        )}
                                    </div>
                                ))}
                                {tournamentWinners.length === 0 && (
                                    <p className="text-sm text-gray-500">Brak dodanych osiągnięć.</p>
                                )}
                            </div>
                        </section>

                        <label htmlFor="tournament-logo" className="mb-2 mt-4 block text-sm text-gray-300">
                            Logo turnieju (PNG, JPG lub WebP, maks. 10 MB)
                        </label>
                        <input
                            id="tournament-logo"
                            key={selectedTournamentId || "new-tournament"}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => setTournamentLogoFile(event.target.files?.[0] ?? null)}
                            className="w-full border p-2.5 text-sm text-gray-300 file:mr-3 file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
                        />
                        {selectedTournamentId && tournaments.find(
                            (tournament) => String(tournament.id) === selectedTournamentId
                        )?.logo && !tournamentLogoFile && (
                                <p className="mt-2 text-xs text-gray-500">
                                    Obecne logo pozostanie bez zmian, jeśli nie wybierzesz nowego pliku.
                                </p>
                            )}

                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                checked={tournamentFinished}
                                name="tournament-finished"
                                id="tournament-finished"
                                onInput={tournamentFinished === false ? () => setTournamentFinished(true) : () => setTournamentFinished(false)}
                                className="h-4 w-4 accent-green-600"
                            />
                            <label htmlFor="tournament-finished" className="flex gap-2 items-center block text-sm text-gray-300">Turniej zakończony</label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-fit cursor-pointer rounded bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer"
                        >
                            <span className="inline-flex items-center gap-2">
                                <img src={selectedTournamentId ? acceptIcon : addIcon} alt="" aria-hidden="true" className="h-4 w-4 invert" />
                                {loading ? "Zapisywanie..." : selectedTournamentId ? "Zapisz zmiany" : "Dodaj turniej"}
                            </span>
                        </button>
                        {selectedTournamentId && (
                            <>
                                <button
                                    type="button"
                                    onClick={resetTournamentForm}
                                    disabled={loading}
                                    className="ml-3 mt-4 w-fit rounded border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50 hover:cursor-pointer"
                                >
                                    Anuluj edycję
                                </button>
                                <button
                                    type="button"
                                    onClick={removeTournament}
                                    disabled={loading}
                                    className="ml-3 mt-4 w-fit rounded border border-red-800/60 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50 hover:cursor-pointer"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <img src={removeIcon} alt="" aria-hidden="true" className="h-4 w-4 invert opacity-80" />
                                        Usuń turniej
                                    </span>
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </section>
    );
};

export default AdminPanel;
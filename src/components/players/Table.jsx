
import Row from "./Row.jsx";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import filterIcon from "../../assets/filter.svg";
import Pagination from "../Pagination";

const PAGE_SIZE = 25;

const Table = () => {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        let active = true;

        async function fetchDirectory() {
            const [teamsResult, playersResult] = await Promise.all([
                supabase
                    .from("teams")
                    .select(`
                        id,
                        name,
                        logo,
                        roster
                    `),
                supabase
                    .from("players")
                    .select(`
                    id,
                    name,
                    coach_teams:teams!teams_coach_id_fkey(id),
                    current_team:teams!players_current_team_fkey(
                        id,
                        name
                    )
                    `),
            ]);

            if (!active) return;

            if (teamsResult.error) {
                console.error("Error loading teams for player filters:", teamsResult.error.message);
            }
            if (playersResult.error) {
                console.error("Error loading players:", playersResult.error.message);
            }

            if (teamsResult.error || playersResult.error) {
                setError(
                    [teamsResult.error?.message, playersResult.error?.message]
                        .filter(Boolean)
                        .join("; ")
                );
            } else {
                setTeams(teamsResult.data ?? []);
                setPlayers(playersResult.data ?? []);
                setError("");
            }
            setLoading(false);
        }

        fetchDirectory();

        return () => {
            active = false;
        };
    }, []);

    const filteredPlayers = players.filter((player) => {
        const matchesName = player.name?.toLocaleLowerCase("pl-PL")
            .includes(searchQuery.trim().toLocaleLowerCase("pl-PL"));
        const matchesTeam = !selectedTeam || String(player.current_team?.id ?? "") === selectedTeam;

        return matchesName && matchesTeam;
    });
    const pageCount = Math.ceil(filteredPlayers.length / PAGE_SIZE);
    const pagePlayers = filteredPlayers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <section className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div className="grid w-full gap-3 sm:max-w-md sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1">
                        <label htmlFor="search" className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <img src={filterIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-60" />
                            Wyszukaj gracza
                        </label>
                        <input
                            type="text"
                            id="search"
                            value={searchQuery}
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Nazwa gracza"
                            className="w-full min-w-0 border p-2.5 text-sm"
                        />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                        <label htmlFor="team-select" className="text-xs font-medium text-gray-400">Drużyna</label>
                        <select
                            className="w-full min-w-0 border p-2.5 text-sm"
                            id="team-select"
                            value={selectedTeam}
                            onChange={(event) => {
                                setSelectedTeam(event.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="">Wszystkie drużyny</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left bg-bg border border-white/10">
                    <thead>
                        <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            <th className="px-3 py-3 font-semibold">Gracz</th>
                            <th className="px-3 py-3 text-right font-semibold">Drużyna</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan="2" className="px-3 py-8 text-center text-sm text-gray-400">Ładowanie graczy...</td>
                            </tr>
                        )}

                        {error && (
                            <tr>
                                <td colSpan="2" className="px-3 py-8 text-center text-sm text-red-300">
                                    Błąd ładowania graczy: {error}
                                </td>
                            </tr>
                        )}

                        {!loading && !error && filteredPlayers.length === 0 && (
                            <tr>
                                <td colSpan="2" className="px-3 py-8 text-center text-sm text-gray-400">
                                    {players.length === 0 ? "Nie znaleziono graczy." : "Brak graczy pasujących do wyszukiwania."}
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            !error &&
                            pagePlayers.map((player) => {
                                const isCoach = Boolean(player.coach_teams?.length);

                                return (
                                    <Row
                                        key={player.id}
                                        name={player.name}
                                        team={player.current_team?.name ?? (isCoach ? "Coach" : null)}
                                        isCoach={isCoach}
                                        id={player.id}
                                    />
                                );
                            })}
                    </tbody>
                </table>
            </div>
            {!loading && !error && (
                <Pagination
                    currentPage={currentPage}
                    pageCount={pageCount}
                    itemCount={pagePlayers.length}
                    onPageChange={setCurrentPage}
                />
            )}
        </section>
    );
};

export default Table;
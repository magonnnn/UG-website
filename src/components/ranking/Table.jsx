import Row from "./Row.jsx"
import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabaseClient";
import filterIcon from "../../assets/filter.svg";
import Pagination from "../Pagination";

const PAGE_SIZE = 25;

const Table = () => {

    const [teams, setTeams] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [filterInput, setFilterInput] = useState("")
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase.from("teams").select("*").order("points", { ascending: false });

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
            }

            setLoading(false);
        }

        fetchTeams();
    }, []);

    const updateDisplay = (value) => {
        setFilterInput(value);
        setCurrentPage(1);
    }
    const filteredTeams = teams.filter((team) =>
        team.name?.toLowerCase().includes((filterInput ?? "").toLowerCase())
    );
    const pageCount = Math.ceil(filteredTeams.length / PAGE_SIZE);
    const pageTeams = filteredTeams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <section className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">Ranking drużyn</h1>
                </div>
                <form className="flex w-full flex-col gap-1 sm:max-w-xs">
                    <label htmlFor="search" className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <img src={filterIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-60" />
                        Wyszukaj drużynę
                    </label>
                    <input
                        type="text"
                        id="search"
                        onChange={(event) => updateDisplay(event.target.value)}
                        placeholder="Nazwa drużyny"
                        className="w-full min-w-0 border p-2.5 text-sm sm:max-w-xs"
                    />
                </form>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left sm:min-w-[480px]">
                    <thead>
                        <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            <th className="w-12 px-3 py-3 font-semibold">#</th>
                            <th className="w-14 px-2 py-3 font-semibold" aria-label="Logo" />
                            <th className="px-3 py-3 font-semibold">Drużyna</th>
                            <th className="w-24 px-3 py-3 text-right font-semibold">Punkty</th>
                            <th className="hidden px-3 py-3 font-semibold sm:table-cell">Skład</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (<tr>
                            <td colSpan="5" className="px-3 py-8 text-center text-sm text-gray-400">Ładowanie drużyn...</td>
                        </tr>
                        )}
                        {error && (<tr>
                            <td colSpan="5" className="px-3 py-8 text-center text-sm text-red-300">Błąd ładowania drużyn: {error}</td>
                        </tr>
                        )}

                        {!loading && !error && teams.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-3 py-8 text-center text-sm text-gray-400">Nie znaleziono drużyn.</td>
                            </tr>
                        )}

                        {!loading && !error && pageTeams
                            .map((team, i) => (
                                <Row
                                    key={team.id}
                                    id={team.id}
                                    ite={(currentPage - 1) * PAGE_SIZE + i}
                                    team={team.name}
                                    points={team.points}
                                    roster={team.roster}
                                    logo={
                                        team.logo
                                            ? supabase.storage
                                                .from("logos")
                                                .getPublicUrl(team.logo).data.publicUrl
                                            : null
                                    }
                                />
                            ))}
                    </tbody>
                </table>
            </div>
            {!loading && !error && (
                <Pagination
                    currentPage={currentPage}
                    pageCount={pageCount}
                    itemCount={pageTeams.length}
                    onPageChange={setCurrentPage}
                />
            )}
        </section>
    )
}

export default Table;
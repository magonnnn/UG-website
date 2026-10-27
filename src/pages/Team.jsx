import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import eseaIcon from "../assets/esea.png";

const Team = () => {
    const location = useLocation();
    const teamId = location.state?.id;

    const [teams, setTeams] = useState([]);
    const [faceitTeam, setFaceitTeam] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState([]);
    const [matchesError, setMatchesError] = useState("");

    useEffect(() => {
        let active = true;

        async function fetchTeams() {
            if (teamId == null) {
                setError("Nie wybrano drużyny.");
                setLoading(false);
                return;
            }

            setLoading(true);
            const [teamResult, firstTeamMatches, secondTeamMatches] = await Promise.all([
                supabase.from("teams").select(`
                    id, 
                    name,
                    roster,
                    logo,
                    points,
                    player1,
                    player2,
                    player3,
                    player4,
                    player5,
                    faceit_id
                `).eq("id", teamId),
                supabase
                    .from("matches")
                    .select(`
                        id,
                        time,
                        league:tournaments!matches_league_fkey(name),
                        team_1:teams!matches_team_1_id_fkey(name, logo),
                        team_2:teams!matches_team_2_id_fkey(name, logo)
                    `)
                    .eq("team_1_id", teamId),
                supabase
                    .from("matches")
                    .select(`
                        id,
                        time,
                        league:tournaments!matches_league_fkey(name),
                        team_1:teams!matches_team_1_id_fkey(name, logo),
                        team_2:teams!matches_team_2_id_fkey(name, logo)
                    `)
                    .eq("team_2_id", teamId),
            ]);

            if (!active) return;

            if (teamResult.error) {
                console.error("Error loading team:", teamResult.error.message);
                setError(teamResult.error.message);
            } else {
                setTeams(teamResult.data ?? []);
                setError("");
            }

            if (firstTeamMatches.error || secondTeamMatches.error) {
                const matchQueryError = firstTeamMatches.error ?? secondTeamMatches.error;
                console.error("Error loading team matches:", matchQueryError.message);
                setMatchesError("Nie udało się załadować meczów drużyny.");
            } else {
                const uniqueMatches = new Map(
                    [...(firstTeamMatches.data ?? []), ...(secondTeamMatches.data ?? [])]
                        .map((match) => [match.id, match])
                );
                setMatches(
                    [...uniqueMatches.values()].sort(
                        (first, second) => new Date(second.time ?? 0) - new Date(first.time ?? 0)
                    )
                );
                setMatchesError("");
            }

            setLoading(false);
        }

        fetchTeams();

        return () => {
            active = false;
        };
    }, [teamId]);


    const faceitId = teams?.[0]?.faceit_id;

    useEffect(() => {
        if (!faceitId) {
            setFaceitTeam({});
            return;
        }

        let active = true;

        async function getTeamInfo() {
            const url = `https://www.faceit.com/api/team-leagues/v1/teams/${encodeURIComponent(faceitId)}/profile/leagues/current`;
            try {
                const { data, error } = await supabase.functions.invoke(
                    "faceit-team-league",
                    {
                        body: { faceitId },
                    }
                );

                console.log("FACEIT team:", data);
                console.log("FACEIT team keys:", Object.keys(data ?? {}));

                if (error) {
                    console.error("Edge Function error:", error);

                    // Supabase may include the function's response body here.
                    if (error.context) {
                        try {
                            const details = await error.context.json();
                            console.error("Edge Function response:", details);
                        } catch {
                            console.error("Could not read Edge Function response body.");
                        }
                    }

                    throw error;
                }

                if (data?.error) {
                    throw new Error(data.error);
                }

                if (active) {
                    setFaceitTeam(data);
                    console.log("FACEIT league data:", data);
                }
            } catch (error) {
                if (active) {
                    console.error("FACEIT request failed:", error);
                    console.error("Request URL:", url);
                }
            }
        }

        getTeamInfo();

        return () => {
            active = false;
        };
    }, [faceitId]);


    const team = teams[0];
    const profileUrl = supabase.storage.from("icons").getPublicUrl("profile-default.svg").data.publicUrl;
    const logoUrl = team?.logo
        ? supabase.storage.from("logos").getPublicUrl(team.logo).data.publicUrl
        : null;
    const roster = team?.roster ?? [];

    if (loading) {
        return <p className="py-8 text-center text-sm text-gray-400">Ładowanie profilu drużyny...</p>;
    }

    if (error || !team) {
        return (
            <p role="status" className="my-6 border border-white/10 bg-bg p-4 text-sm text-red-300">
                {error || "Nie znaleziono drużyny."}
            </p>
        );
    }

    return (
        <section className="min-w-0">
            <header className="mb-6">
                <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">{team.name}</h1>
            </header>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <section className="min-w-0 bg-bg">
                    <h2 className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Profil
                    </h2>
                    <div className="flex flex-col items-center px-4 py-7">
                        {logoUrl ? (
                            <img src={logoUrl} alt={`${team.name} logo`} className="h-24 w-24 object-contain" />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-bg-light text-3xl font-bold text-gray-500">
                                {team.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                        )}
                        <h2 className="mt-4 break-words text-center text-xl font-bold text-white">{team.name}</h2>
                        <p className="mt-2 text-sm text-gray-400">
                            <span className="font-semibold tabular-nums text-white">{team.points ?? 0}</span> pkt
                        </p>
                        <p className="mt-4">
                            {faceitTeam?.payload?.season_standing?.division_name ? (
                                <div className="flex flex-row justify-center items-center">
                                    <img src={eseaIcon} alt="esea icon" className="w-5 h-5 me-1 hover:opacity-70 transform-colors" />
                                    <p>ESEA: {faceitTeam?.payload?.season_standing?.division_name}</p>
                                </div>
                            ) : (
                                <div className="flex flex-row justify-center items-center">
                                    <img src={eseaIcon} alt="esea icon" className="w-5 h-5 me-1 hover:opacity-70 transform-colors" />
                                    <p>ESEA: Brak</p>
                                </div>
                            )}
                        </p>
                    </div>
                </section>

                <section className="min-w-0 bg-bg">
                    <h2 className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Skład drużyny
                    </h2>
                    {roster.length ? (
                        <div className="space-y-1">
                            {roster.map((player, index) => {
                                const playerId = team[`player${index + 1}`];

                                return (
                                    <Link
                                        to="/player"
                                        state={{ id: playerId }}
                                        key={`${playerId ?? player}-${index}`}
                                        className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                                    >
                                        <img src={profileUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-bg-light p-1.5 opacity-80" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{player}</span>
                                        <span className="text-xs text-gray-600">{String(index + 1).padStart(2, "0")}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="px-4 py-5 text-sm text-gray-500">Brak graczy w składzie.</p>
                    )}
                </section>

                <section className="min-w-0 bg-bg lg:col-span-2">
                    <h2 className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Mecze
                    </h2>
                    {matchesError ? (
                        <p role="status" className="px-4 py-5 text-sm text-red-300">{matchesError}</p>
                    ) : matches.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-gray-500">Brak dostępnych meczów drużyny.</p>
                    ) : (
                        <div className="space-y-1">
                            {matches.map((match) => (
                                <Link
                                    to="/match"
                                    state={{ id: match.id }}
                                    key={match.id}
                                    className="flex min-w-0 flex-col gap-2 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium text-gray-500">
                                            {match.league?.name ?? "Mecz"}
                                        </p>
                                        <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                                            <span className="min-w-0 truncate">{match.team_1?.name ?? "Drużyna 1"}</span>
                                            <span className="shrink-0 text-[10px] font-bold text-red-400">VS</span>
                                            <span className="min-w-0 truncate">{match.team_2?.name ?? "Drużyna 2"}</span>
                                        </div>
                                    </div>
                                    <time className="shrink-0 text-xs text-gray-500">
                                        {match.time
                                            ? new Date(match.time).toLocaleString("pl-PL", {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                            })
                                            : "Termin do ustalenia"}
                                    </time>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
};

export default Team;

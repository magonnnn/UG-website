import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import redirectIcon from "../assets/redirect.svg";
import faceitLogo from "../assets/faceit-logo.webp"

const Player = () => {
    const location = useLocation();
    const id = location.state?.id;
    const [player, setPlayer] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [transfer, setTransfer] = useState({});
    const [teams, setTeams] = useState([]);
    const [faceitPlayer, setFaceitPlayer] = useState({});

    useEffect(() => {
        let active = true;

        async function fetchUser() {
            if (id == null) {
                setError("Nie podano ID gracza.");
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from("players")
                .select(`
                    id,
                    name,
                    team_history,
                    created_at,
                    steam_profile,
                    steamid64,
                    current_team:teams!players_current_team_fkey (
                        id,
                        name,
                        logo
                    )
                `)
                .eq("id", id)
                .single();

            if (!active) return;

            if (error) {
                setError(error.message);
            } else {
                setPlayer(data ?? {});
                setError("");
            }

            setLoading(false);
        }

        fetchUser();
        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        let active = true;
        const API_KEY = "34bdb1e3-f715-48b3-a7e2-12f432e11b59";
        const BASE = "https://open.faceit.com/data/v4";
        const GAME = "cs2";
        const steamid64 = player.steamid64;

        if (!steamid64) return;

        async function api(path, params = {}) {
            const url = new URL(BASE + path);

            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`FACEIT API error: ${response.status}`);
            }

            return response.json();
        }

        async function fetchFaceitPlayer() {
            try {
                const faceitPlr = await api("/players", {
                    game_player_id: steamid64,
                    game: GAME,
                });

                if (active) {
                    setFaceitPlayer({ steamid64, profile: faceitPlr });
                }
            } catch (error) {
                if (active) {
                    console.error("FACEIT API error:", error.message);
                }
            }
        }
        fetchFaceitPlayer();

        return () => {
            active = false;
        };
    }, [player.steamid64]);

    useEffect(() => {
        async function fetchTransfer() {
            if (id == null) {
                setTransfer({});
                return;
            }

            const { data, error } = await supabase
                .from("transfers")
                .select("created_at")
                .eq("player_id", id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                setError(error.message);
            } else {
                setTransfer(data ?? {});
            }
        }

        fetchTransfer();
    }, [id]);

    useEffect(() => {
        async function fetchTeams() {
            const { data, error } = await supabase.from("teams").select("*");

            if (error) {
                setError(error.message);
            } else {
                setTeams(data ?? []);
                setError("");
            }
        }

        fetchTeams();
    }, []);

    const teamHistory = (player.team_history ?? [])
        .map((teamId) => teams.find((team) => team.id === Number(teamId)))
        .filter(Boolean);

    const profileUrl = supabase.storage.from("icons").getPublicUrl("profile-default.svg").data.publicUrl;
    const teamLogo = player.current_team?.logo
        ? supabase.storage.from("logos").getPublicUrl(player.current_team.logo).data.publicUrl
        : null;
    const joinedAt = transfer.created_at ?? player.created_at;

    if (loading) {
        return <p className="py-8 text-center text-sm text-gray-400">Ładowanie profilu gracza...</p>;
    }

    if (error || !player.name) {
        return (
            <p role="status" className="my-6 border border-white/10 bg-bg p-4 text-sm text-red-300">
                {error || "Nie znaleziono gracza."}
            </p>
        );
    }

    return (
        <section className="min-w-0">
            <header className="mb-6">
                <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">{player.name}</h1>
            </header>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <section className="min-w-0 bg-bg">
                    <h2 className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Profil
                    </h2>
                    <div className="flex flex-col items-center px-4 py-6">
                        {player.current_team ? (
                            <Link to="/team" state={{ id: player.current_team.id }} aria-label={`Profil drużyny ${player.current_team.name}`}>
                                {teamLogo ? (
                                    <img src={teamLogo} alt="" className="h-24 w-24 object-contain" />
                                ) : (
                                    <img src={profileUrl} alt="" className="h-24 w-24 rounded-full bg-bg-light p-5 opacity-70" />
                                )}
                            </Link>
                        ) : (
                            <img src={profileUrl} alt="" className="h-24 w-24 rounded-full bg-bg-light p-5 opacity-70" />
                        )}
                        <h2 className="mt-4 break-words text-center text-xl font-bold text-white">{player.name}</h2>
                    </div>
                    <dl className="space-y-2 px-4 pb-4">
                        <div className="flex items-center justify-between gap-4 py-3">
                            <dt className="text-sm text-gray-500">Drużyna</dt>
                            <dd className="min-w-0 text-right text-sm font-medium text-white">
                                {player.current_team ? (
                                    <Link to="/team" state={{ id: player.current_team.id }} className="hover:text-red-300">
                                        {player.current_team.name}
                                    </Link>
                                ) : "Brak"}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-3">
                            <dt className="text-sm text-gray-500">W drużynie od</dt>
                            <dd className="text-right text-sm text-white">
                                {joinedAt ? new Date(joinedAt).toLocaleDateString("pl-PL") : "—"}
                            </dd>
                        </div>
                        {player.steam_profile && (
                            <div className="flex items-center justify-between gap-4 py-3">
                                <dt className="text-sm text-gray-500">
                                    Steam{faceitPlayer.steamid64 === player.steamid64 && faceitPlayer.profile?.games?.cs2?.faceit_elo
                                        ? ``
                                        : ""}
                                </dt>
                                <dd>
                                    <a
                                        href={player.steam_profile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-semibold text-red-300 hover:text-white"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            Profil
                                            <img src={redirectIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 invert opacity-70" />
                                        </span>
                                    </a>
                                </dd>
                            </div>
                        )}
                        {faceitPlayer && (
                            <div className="flex items-center justify-between gap-4 py-3">
                                <dt className="text-sm text-gray-500">
                                    ELO
                                </dt>
                                <dd className="flex flex-row items-center justify-center">
                                    <img src={faceitLogo} alt="faceit logo" className="w-4 h-4 me-2" />
                                    {faceitPlayer.profile?.games?.cs2?.faceit_elo && (
                                        `${faceitPlayer.profile?.games?.cs2?.faceit_elo}`
                                    )}
                                </dd>
                            </div>
                        )}
                    </dl>
                </section>

                <div className="grid min-w-0 content-start gap-4">
                    <section className="min-w-0 bg-bg">
                        <h2 className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                            Statystyki
                        </h2>
                        <p className="px-4 py-5 text-sm text-gray-500">Brak dostępnych statystyk gracza.</p>
                    </section>

                    <section className="min-w-0 bg-bg">
                        <h2 className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                            Historia drużyn
                        </h2>
                        {teamHistory.length > 0 ? (
                            <div className="space-y-1">
                                {teamHistory.map((team, index) => {
                                    const logoUrl = team.logo
                                        ? supabase.storage.from("logos").getPublicUrl(team.logo).data.publicUrl
                                        : null;

                                    return (
                                        <Link
                                            to="/team"
                                            state={{ id: team.id }}
                                            key={`${team.id}-${index}`}
                                            className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                                        >
                                            {logoUrl ? (
                                                <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 object-contain" />
                                            ) : (
                                                <span className="h-8 w-8 shrink-0 rounded-full bg-bg-light" />
                                            )}
                                            <span className="min-w-0 truncate text-sm font-medium text-white">{team.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="px-4 py-5 text-sm text-gray-500">Brak historii drużyn.</p>
                        )}
                    </section>
                </div>
            </div>
        </section>
    );
};

export default Player;

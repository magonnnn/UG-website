import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import logo from "../assets/logo.png";

const getUserName = (user) => {
    return (
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.username ||
        user?.email ||
        "Zalogowany użytkownik"
    );
};

const getUserAvatar = (user) => (
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null
);

const saveUserProfile = async (user) => {
    if (!user) return;

    const profile = {
        id: user.id,
        name: getUserName(user),
        email: user.email ?? null,
        avatar_url: getUserAvatar(user),
        last_login_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("users")
        .upsert(profile, {
            onConflict: "id",
        });

    if (error) {
        console.error("Error saving user profile:", error.message);
    }
};

const getUserProfile = async (user) => {
    if (!user) return null;

    const { data, error } = await supabase
        .from("users")
        .select("id, name, email, avatar_url, role")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error getting user profile:", error.message);
        return null;
    }

    return data;
};

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession();

            if (error) {
                console.error("Error getting session:", error.message);
            }

            if (!mounted) return;

            const currentUser = session?.user ?? null;

            setUser(currentUser);
            setAuthReady(true);

            if (currentUser) {
                await saveUserProfile(currentUser);

                const currentProfile = await getUserProfile(currentUser);

                if (mounted) {
                    setProfile(currentProfile);
                }
            }
        };

        initializeAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;

            const currentUser = session?.user ?? null;

            setUser(currentUser);

            if (!currentUser) {
                setProfile(null);
            }

            setAuthReady(true);

            if (event === "SIGNED_IN" && currentUser) {
                setTimeout(async () => {
                    if (!mounted) return;

                    await saveUserProfile(currentUser);

                    const currentProfile =
                        await getUserProfile(currentUser);

                    if (mounted) {
                        setProfile(currentProfile);
                    }
                }, 0);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);


    const login = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "discord",
            options: {
                redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
            },
        });

        if (error) {
            console.error("Error logging in:", error.message);
        }
    };


    const logout = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error logging out:", error.message);
        }
    };

    return (
        <nav className="w-full py-3 text-white sm:py-4">
            <div className="mx-auto max-w-[1600px] px-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-between sm:gap-5">
                    <div className="flex min-w-0 items-center">
                        <Link to="/" className="flex shrink-0 items-center gap-2">
                            <img src={logo} alt="" className="h-9 w-9 invert object-contain sm:h-10 sm:w-10" />
                            <span className="text-sm font-black tracking-wide sm:text-base">
                                PODZIEMIE
                            </span>
                        </Link>
                    </div>
                    <div className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto sm:gap-2">
                        <Link
                            to="/"
                            className="shrink-0 rounded px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            Start
                        </Link>

                        <Link
                            to="/ranking"
                            className="shrink-0 rounded px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            Ranking
                        </Link>

                        <Link
                            to="/players"
                            className="shrink-0 rounded px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            Gracze
                        </Link>

                        <Link
                            to="/contact"
                            className="shrink-0 rounded px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            Kontakt
                        </Link>
                    </div>

                    {/* {user && (
                        <div className="flex items-center gap-2 min-w-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={`${displayName} avatar`}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={(event) => {
                                        event.currentTarget.style.display =
                                            "none";
                                    }}
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-bg-light flex items-center justify-center text-xs">
                                    {displayName
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                            )}

                            <span className="max-w-32 truncate">
                                {displayName}
                            </span>
                        </div>
                    )} */}
                    <div className="ml-auto flex flex-wrap items-center justify-center gap-2 sm:justify-end sm:gap-4">
                        {profile?.role === "admin" && (
                            <div>
                                <div className="rounded-full bg-green-600"></div>
                                <Link
                                    to="/admin-panel"
                                    className="inline-block shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-white/10 sm:px-4"
                                >
                                    Panel Admina
                                </Link>
                            </div>
                        )}

                        <button
                            type="button"
                            className="shrink-0 rounded-md bg-red-700 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                            onClick={user ? logout : login}
                            disabled={!authReady}
                        >
                            {!authReady
                                ? "Sprawdzanie..."
                                : user
                                    ? "Wyloguj się"
                                    : "Zaloguj się"}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
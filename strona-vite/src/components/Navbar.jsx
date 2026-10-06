import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";
import logo from "../assets/logo.jpg";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setAuthReady(true);
        });

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!isMounted) return;
            if (error) console.error("Error getting session:", error.message);
            setUser(session?.user ?? null);
            setAuthReady(true);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
        });
        if (error) console.error('Error logging in:', error.message);
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error.message);
    }

    const displayName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email
        || "Zalogowany użytkownik";

    return (
        <nav className="bg-gray-800 text-white py-4">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center">
                    <img src={logo} alt="Logo" className="h-8 w-8 mr-2" />
                    <div className="text-xl font-bold">PODZIEMIE CS2</div>
                    <div className="space-x-4">
                        <a href="/" className="hover:text-gray-300">Home</a>
                        <a href="/about" className="hover:text-gray-300">Ranking</a>
                        <a href="/contact" className="hover:text-gray-300">Kontakt</a>
                    </div>
                    {user && (
                        <div className="text-right flex items-center flex-row">
                            <div className="text-xs text-gray-300 mr-2">
                                <img src={user.user_metadata?.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full ml-2" />
                            </div>
                            <div>{displayName}</div>
                        </div>
                    )}
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                        onClick={user ? logout : login}
                        disabled={!authReady}
                    >
                        {authReady ? (user ? "Wyloguj się" : "Zaloguj się") : "Sprawdzanie..."}
                    </button>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const AdminRoute = ({ children }) => {
    const [access, setAccess] = useState("loading");

    useEffect(() => {
        let mounted = true;
        let requestId = 0;
        let authEventCount = 0;

        const checkAdmin = async (session) => {
            const currentRequest = ++requestId;
            setAccess("loading");

            if (!session?.user) {
                if (mounted && currentRequest === requestId) {
                    setAccess("denied");
                }
                return;
            }

            const { data, error } = await supabase
                .from("users")
                .select("role")
                .eq("id", session.user.id)
                .maybeSingle();

            if (!mounted || currentRequest !== requestId) return;

            if (error) {
                console.error("Error checking admin role:", error.message);
            }

            setAccess(!error && data?.role === "admin" ? "allowed" : "denied");
        };

        supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error("Error getting session:", error.message);
                if (mounted) setAccess("denied");
                return;
            }

            if (authEventCount === 0) {
                checkAdmin(data.session);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            authEventCount += 1;
            setAccess("loading");
            setTimeout(() => {
                if (mounted) checkAdmin(session);
            }, 0);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    if (access === "loading") {
        return <p className="text-white">...</p>;
    }

    if (access !== "allowed") {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;

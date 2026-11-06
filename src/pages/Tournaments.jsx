import { useEffect, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
const Tournaments = () => {
    const [error, setError] = useState()
    const [tournaments, setTournaments] = useState([])
    const [loading, setLoading] = useState()

    useEffect(() => {
        const fetchTournaments = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("tournaments")
                .select("*")


            if (error) {
                setError(error.message)
                return;
            } else {
                setTournaments(data ?? [])
            }
            setLoading(false)
        }

        fetchTournaments();
    }, [])

    console.log(tournaments)
}

export default Tournaments;
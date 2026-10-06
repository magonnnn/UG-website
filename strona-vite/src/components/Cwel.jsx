import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";

function Cwel() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase.from("users").select("*");

      if (error) {
        setError(error.message);
      } else {
        setUsers(data ?? []);
      }

      setLoading(false);
    }

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>My Website</h1>
      {loading && <p>Loading users...</p>}
      {error && <p>Error loading users: {error}</p>}
      {!loading && !error && users.length === 0 && <p>No users found</p>}
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default Cwel;
import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  async function getMessage() {
    const response = await fetch("/api/hello.php");
    const data = await response.json();

    setMessage(data.message);
  }

  return (
    <div>
      <h1>My Website</h1>

      <button onClick={getMessage}>
        Talk to PHP
      </button>

      <p>{message}</p>
    </div>
  );
}

export default App;
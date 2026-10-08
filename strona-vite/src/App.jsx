import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Ranking from "./pages/Ranking";
import Contact from "./pages/Contact";
import Team from "./pages/Team";
import TeamPanel from "./pages/TeamPanel";
import Player from "./pages/Player"
import Players from "./pages/Players"

const App = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col w-full">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/team" element={<Team />} />
            <Route path="/team-panel" element={<TeamPanel />} />
            <Route path="/player" element={<Player />} />
            <Route path="/players" element={<Players />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App;
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Ranking from "./pages/Ranking";
import Contact from "./pages/Contact";
import Team from "./pages/Team";

const App = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col w-full">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<Ranking />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/team" element={<Team />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App;
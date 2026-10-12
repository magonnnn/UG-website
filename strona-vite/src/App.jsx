import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminRoute from "./components/AdminRoute";
import Home from "./pages/Home";
import Ranking from "./pages/Ranking";
import Contact from "./pages/Contact";
import Team from "./pages/Team";
import AdminPanel from "./pages/AdminPanel";
import Player from "./pages/Player"
import Players from "./pages/Players"
import LeftBar from "./pages/LeftBar"
import RightBar from "./pages/RightBar"

const App = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col w-full">
        <Header />

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,4fr)_minmax(0,1fr)] w-full">
          <LeftBar className="min-w-0" />

          <main className="min-w-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/team" element={<Team />} />
              <Route
                path="/admin-panel"
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                }
              />
              <Route path="/player" element={<Player />} />
              <Route path="/players" element={<Players />} />
            </Routes>
          </main>

          <RightBar className="min-w-0" />
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App;
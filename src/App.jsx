import { HashRouter, Routes, Route } from "react-router-dom";
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
    <HashRouter>
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <Header />

        <div className="grid w-full min-w-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,4fr)_minmax(0,1fr)]">
          <div className="order-2 min-w-0 lg:order-1">
            <LeftBar />
          </div>

          <main className="order-1 min-w-0 px-3 sm:px-4 lg:order-2 lg:px-0">
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

          <div className="order-3 min-w-0">
            <RightBar />
          </div>
        </div>
        <Footer />
      </div>
    </HashRouter>
  )
}

export default App;
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
import Match from './pages/Match'

const App = () => {
  return (
    <HashRouter>
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-bg-dark text-text">
        <Header />

        <div className="mx-auto grid w-full max-w-[1600px] min-w-0 flex-1 grid-cols-1 content-start lg:grid-cols-[minmax(210px,250px)_minmax(0,1fr)_minmax(220px,280px)]">
          <div className="order-2 min-w-0 lg:order-1">
            <LeftBar />
          </div>

          <main className="order-1 min-w-0 px-3 py-4 sm:px-5 sm:py-6 lg:order-2 lg:px-6 xl:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/team" element={<Team />} />
              <Route path="/match" element={<Match />} />
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
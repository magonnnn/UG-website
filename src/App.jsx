import { useEffect } from "react";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminRoute from "./components/AdminRoute";
import Home from "./pages/Home";
import Ranking from "./pages/Ranking";
import Contact from "./pages/Contact";
import Team from "./pages/Team";
import AdminPanel from "./pages/AdminPanel";
import Player from "./pages/Player";
import Players from "./pages/Players";
import LeftBar from "./pages/LeftBar";
import RightBar from "./pages/RightBar";
import Match from './pages/Match';
import Article from "./pages/Article";
import Partners from "./pages/Partners";
import Transfers from "./pages/Transfers";
import Matches from "./pages/Matches";
import PrivacyPolicy from "./pages/DataInfo";
import Tournaments from "./pages/Tournaments";
import Announcements from "./pages/Announcements";
import TopBar from "./components/TopBar";

const ScrollToTop = () => {
  const { key } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  return null;
};

const App = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="flex min-h-screen w-full flex-col overflow-x-clip text-text">
        <Header />

        <div className="mx-auto grid w-full max-w-[1600px] min-w-0 flex-1 grid-cols-1 content-start lg:grid-cols-[minmax(210px,250px)_minmax(0,1fr)_minmax(220px,280px)]">
          <div className="order-2 min-w-0 lg:order-1">
            <div>
              <LeftBar />
            </div>
          </div>

          <main className="order-1 min-w-0 px-4 py-4 lg:order-2 lg:px-0">
            <TopBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/article/:id" element={<Article />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/team" element={<Team />} />
              <Route path="/match" element={<Match />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/admin-panel"
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                }
              />
              <Route path="/player" element={<Player />} />
              <Route path="/players" element={<Players />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/announcements" element={<Announcements />} />
            </Routes>
          </main>

          <div className="order-3 min-w-0">
            <div>
              <RightBar />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </HashRouter>
  )
}

export default App;
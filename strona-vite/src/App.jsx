import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Header from "./components/Header";
import Footer from "./components/Footer";

const App = () => {
  return (
    <div>
      <Header />
      <p>App component</p>
      <Footer />
    </div>
  )
}

export default App;
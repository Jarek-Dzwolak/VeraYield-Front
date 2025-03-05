import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Trading from "./pages/Trading";
import Portfolio from "./pages/Portfolio";
import Settings from "./pages/Settings";
import "../src/assets/styles/global.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

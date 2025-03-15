import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import "./MainLayout.css";

const MainLayout = ({ onLogout }) => {
  return (
    <div className="app">
      <Navbar onLogout={onLogout} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;

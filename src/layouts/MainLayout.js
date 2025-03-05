import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import "./MainLayout.css";

const MainLayout = () => {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;

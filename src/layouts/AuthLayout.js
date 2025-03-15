import React from "react";
import { Outlet } from "react-router-dom";
import "./AuthLayout.css";
import logoImage from "../assets/img/Logo.jpeg"; // Upewnij się, że ścieżka jest poprawna

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-content">
        <div className="main-logo-container">
          <div className="main-logo-wrapper">
            <img src={logoImage} alt="VeraYield" className="main-logo" />
          </div>
          <div className="brand-container">
            <h1 className="brand-name">Human Intelligence</h1>
            <span className="brand-tagline">Powered by AI</span>
          </div>
        </div>

        <div className="auth-card">
          <Outlet />
        </div>
      </div>

      <div className="auth-footer">
        <p>
          &copy; {new Date().getFullYear()} VeraYield. Wszelkie prawa
          zastrzeżone.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;

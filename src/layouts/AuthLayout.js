import React from "react";
import { Outlet, Link } from "react-router-dom";
import "./AuthLayout.css";

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-header">
        <Link to="/" className="logo-link">
          <div className="auth-logo">
            <span className="logo-text">VeraYield</span>
            <span className="logo-subtitle">Trading Bot</span>
          </div>
        </Link>
      </div>
      <div className="auth-container">
        <Outlet />
      </div>
      <div className="auth-footer">
        <p>
          &copy; {new Date().getFullYear()} VeraYield Trading Bot. Wszelkie
          prawa zastrzeżone.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;

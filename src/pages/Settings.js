import React from "react";
import logo from "../assets/img/Logo.jpeg";
import CreateInstanceForm from "../components/settings/CreateInstanceForm";
import "./Settings.css";

const Settings = () => {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <img src={logo} alt="VeraYield" className="logo" />
        <h1>Ustawienia</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Utwórz Instancję Bota</h2>
        </div>
        <CreateInstanceForm />
      </div>
    </div>
  );
};

export default Settings;

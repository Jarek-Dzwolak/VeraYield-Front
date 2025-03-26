import React, { useState } from "react";
import logo from "../assets/img/Logo.jpeg";
import CreateInstanceForm from "../components/settings/CreateInstanceForm";
import InstanceManager from "../components/settings/InstanceManager";
import "./Settings.css";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <img src={logo} alt="VeraYield" className="logo" />
        <h1>Ustawienia</h1>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === "create" ? "active" : ""}`}
          onClick={() => setActiveTab("create")}
        >
          Utwórz Instancję
        </button>
        <button
          className={`settings-tab ${activeTab === "manage" ? "active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          Zarządzaj Instancjami
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>
            {activeTab === "create"
              ? "Utwórz Instancję Bota"
              : "Zarządzaj Instancjami Bota"}
          </h2>
        </div>
        {activeTab === "create" ? <CreateInstanceForm /> : <InstanceManager />}
      </div>
    </div>
  );
};

export default Settings;

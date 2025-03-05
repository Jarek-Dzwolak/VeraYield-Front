// src/pages/Dashboard.js
import React from "react";
import BotPerformance from "../components/dashboard/BotPerformance";
import ActiveTradingPairs from "../components/dashboard/ActiveTradingPairs";
import AccountBalance from "../components/dashboard/AccountBalance";
import BotTransactions from "../components/dashboard/BotTransactions";
import ActionPanel from "../components/dashboard/ActionPanel";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>VeraYield Trading Bot</h1>
        <div className="bot-status online">
          <span className="status-indicator"></span>
          Active
        </div>
      </div>

      <div className="dashboard-grid">
        <BotPerformance />
        <AccountBalance />
        <ActiveTradingPairs />
        <BotTransactions />
      </div>

      <ActionPanel />
    </div>
  );
};

export default Dashboard;

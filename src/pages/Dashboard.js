import React from "react";
import MarketOverview from "../components/dashboard/MarketOverview";
import TradingChart from "../components/dashboard/TradingChart";
import PortfolioSummary from "../components/dashboard/PortfolioSummary";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <MarketOverview />
      <div className="dashboard-grid">
        <TradingChart />
        <PortfolioSummary />
        <RecentTransactions />
      </div>
    </div>
  );
};

export default Dashboard;

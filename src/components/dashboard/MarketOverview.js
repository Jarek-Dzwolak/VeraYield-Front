import React from "react";
import "./MarketOverview.css";

const MarketOverview = () => {
  return (
    <section className="market-overview">
      <h2>Market Overview</h2>
      <div className="market-summary">
        <div className="summary-card">
          <h3>Total Balance</h3>
          <p className="amount">$56,671.60</p>
          <p className="change positive">+2.3% today</p>
        </div>

        <div className="summary-card">
          <h3>24h Volume</h3>
          <p className="amount">$12,450.30</p>
          <p className="change positive">+5.7%</p>
        </div>

        <div className="summary-card">
          <h3>Active Trades</h3>
          <p className="amount">8</p>
          <p className="info">3 profitable</p>
        </div>
      </div>
    </section>
  );
};

export default MarketOverview;

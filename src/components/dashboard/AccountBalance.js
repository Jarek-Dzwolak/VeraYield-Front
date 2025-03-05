import React from "react";
import "./AccountBalance.css";

const AccountBalance = () => {
  return (
    <div className="account-balance card">
      <h2>Assets Allocation</h2>

      <div className="total-balance">
        <span className="balance-label">Total Balance</span>
        <span className="balance-value">$45,623.87</span>
        <span className="balance-change positive">+$876.23 (24h)</span>
      </div>

      <div className="allocation-chart-container">
        <div className="allocation-chart-placeholder">
          {/* Tu byłby wykres alokacji aktywów */}
          <div className="chart-circle"></div>
        </div>

        <div className="allocation-legend">
          <div className="legend-item">
            <span className="legend-color btc"></span>
            <span className="legend-name">BTC</span>
            <span className="legend-value">45%</span>
          </div>
          <div className="legend-item">
            <span className="legend-color eth"></span>
            <span className="legend-name">ETH</span>
            <span className="legend-value">25%</span>
          </div>
          <div className="legend-item">
            <span className="legend-color usdt"></span>
            <span className="legend-name">USDT</span>
            <span className="legend-value">20%</span>
          </div>
          <div className="legend-item">
            <span className="legend-color other"></span>
            <span className="legend-name">Others</span>
            <span className="legend-value">10%</span>
          </div>
        </div>
      </div>

      <div className="allocation-info">
        <div className="allocation-stat">
          <span className="stat-label">Engaged in Trading</span>
          <span className="stat-value">$32,451.25</span>
          <span className="stat-percentage">71.1%</span>
        </div>
        <div className="allocation-stat">
          <span className="stat-label">Available</span>
          <span className="stat-value">$13,172.62</span>
          <span className="stat-percentage">28.9%</span>
        </div>
      </div>
    </div>
  );
};

export default AccountBalance;

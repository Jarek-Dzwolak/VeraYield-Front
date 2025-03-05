import React from "react";
import "./BotPerformance.css";

const BotPerformance = () => {
  return (
    <div className="bot-performance card">
      <div className="card-header">
        <h2>Bot Performance</h2>
        <select className="time-selector">
          <option>24 Hours</option>
          <option>7 Days</option>
          <option>30 Days</option>
          <option>All Time</option>
        </select>
      </div>

      <div className="performance-grid">
        <div className="performance-stat">
          <span className="stat-label">Total Profit</span>
          <span className="stat-value profit">+$1,276.48</span>
          <span className="stat-percentage positive">+2.8%</span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">Trades Executed</span>
          <span className="stat-value">43</span>
          <span className="stat-info">32 profitable</span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">Win Rate</span>
          <span className="stat-value">74.4%</span>
          <span className="stat-info">Target: 65%</span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">Avg. Hold Time</span>
          <span className="stat-value">4.2h</span>
          <span className="stat-info">Max: 12.5h</span>
        </div>
      </div>

      <div className="profit-chart">
        <div className="chart-header">
          <span className="chart-title">Cumulative Profit</span>
          <span className="chart-value positive">+$1,276.48</span>
        </div>
        <div className="profit-chart-placeholder">
          {/* Tu będzie wykres */}
          <div className="chart-line"></div>
        </div>
      </div>
    </div>
  );
};

export default BotPerformance;

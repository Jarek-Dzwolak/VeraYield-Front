import React, { useState } from "react";
import "./ActiveTradingPairs.css";

const ActiveTradingPairs = () => {
  const [activeTab, setActiveTab] = useState("active");

  const activePairs = [
    {
      pair: "BTC/USDT",
      strategy: "Momentum",
      status: "active",
      profit: "+2.4%",
      timeElapsed: "3h 24m",
    },
    {
      pair: "ETH/USDT",
      strategy: "Range Bound",
      status: "active",
      profit: "-0.8%",
      timeElapsed: "1h 47m",
    },
    {
      pair: "SOL/USDT",
      strategy: "Breakout",
      status: "pending",
      profit: "0.0%",
      timeElapsed: "8m",
    },
    {
      pair: "ADA/USDT",
      strategy: "Momentum",
      status: "active",
      profit: "+1.2%",
      timeElapsed: "5h 12m",
    },
  ];

  const monitoredPairs = [
    { pair: "DOT/USDT", strategy: "Breakout", signalStrength: "medium" },
    { pair: "XRP/USDT", strategy: "Momentum", signalStrength: "strong" },
    { pair: "LINK/USDT", strategy: "Range Bound", signalStrength: "weak" },
  ];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="active-pairs card">
      <div className="card-header">
        <h2>Trading Pairs</h2>
        <div className="card-tabs">
          <button
            className={`tab ${activeTab === "active" ? "active" : ""}`}
            onClick={() => handleTabChange("active")}
          >
            Active (4)
          </button>
          <button
            className={`tab ${activeTab === "monitored" ? "active" : ""}`}
            onClick={() => handleTabChange("monitored")}
          >
            Monitored (3)
          </button>
        </div>
      </div>

      {activeTab === "active" && (
        <div className="active-pairs-table">
          <div className="table-container">
            <div className="table-fixed-width">
              <div className="table-header">
                <span>Pair</span>
                <span>Strategy</span>
                <span>Status</span>
                <span>Profit</span>
                <span>Time</span>
              </div>

              <div className="pairs-list">
                {activePairs.map((pair, index) => (
                  <div
                    key={index}
                    className="pair-row"
                    data-profit={pair.profit}
                    data-time={pair.timeElapsed}
                  >
                    <span className="pair-name">{pair.pair}</span>
                    <span className="pair-strategy">{pair.strategy}</span>
                    <span className={`pair-status ${pair.status}`}>
                      {pair.status}
                    </span>
                    <span
                      className={`pair-profit ${
                        parseFloat(pair.profit) >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {pair.profit}
                    </span>
                    <span className="pair-time">{pair.timeElapsed}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "monitored" && (
        <div className="monitored-pairs-table">
          <div className="table-container">
            <div className="table-fixed-width">
              <div className="table-header">
                <span>Pair</span>
                <span>Strategy</span>
                <span>Signal</span>
              </div>

              <div className="pairs-list">
                {monitoredPairs.map((pair, index) => (
                  <div key={index} className="pair-row">
                    <span className="pair-name">{pair.pair}</span>
                    <span className="pair-strategy">{pair.strategy}</span>
                    <span className={`signal-strength ${pair.signalStrength}`}>
                      {pair.signalStrength}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveTradingPairs;

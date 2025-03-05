import React, { useState } from "react";
import "./ResultsViewer.css";

const ResultsViewer = ({ results, isLoading }) => {
  const [activeTab, setActiveTab] = useState("summary");

  if (isLoading) {
    return (
      <div className="results-viewer card">
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Running backtest...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-viewer card">
        <div className="no-results">
          <h2>Backtest Results</h2>
          <p>Run a backtest to see results here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-viewer card">
      <h2>Backtest Results</h2>

      <div className="results-tabs">
        <button
          className={`tab ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          Summary
        </button>
        <button
          className={`tab ${activeTab === "trades" ? "active" : ""}`}
          onClick={() => setActiveTab("trades")}
        >
          Trades
        </button>
        <button
          className={`tab ${activeTab === "chart" ? "active" : ""}`}
          onClick={() => setActiveTab("chart")}
        >
          Equity Curve
        </button>
      </div>

      {activeTab === "summary" && (
        <div className="results-summary">
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Net Profit/Loss</span>
              <span
                className={`metric-value ${
                  results.profitLoss >= 0 ? "positive" : "negative"
                }`}
              >
                ${results.profitLoss.toFixed(2)}
              </span>
              <span className="metric-percentage">
                {((results.profitLoss / 10000) * 100).toFixed(2)}%
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Win Rate</span>
              <span className="metric-value">{results.winRate}%</span>
              <span className="metric-detail">
                {results.tradesCount} trades
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Avg. Profit</span>
              <span className="metric-value">${results.averageProfit}</span>
              <span className="metric-detail">per trade</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Max Drawdown</span>
              <span className="metric-value negative">
                ${results.maxDrawdown}
              </span>
              <span className="metric-percentage negative">
                {((results.maxDrawdown / 10000) * 100).toFixed(2)}%
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Sharpe Ratio</span>
              <span className="metric-value">{results.sharpeRatio}</span>
              <span className="metric-detail">annualized</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">ROI</span>
              <span
                className={`metric-value ${
                  results.profitLoss >= 0 ? "positive" : "negative"
                }`}
              >
                {((results.profitLoss / 10000) * 100).toFixed(2)}%
              </span>
              <span className="metric-detail">on initial capital</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "trades" && (
        <div className="results-trades">
          <div className="table-container">
            <div className="table-fixed-width">
              <div className="table-header">
                <span>#</span>
                <span>Type</span>
                <span>Pair</span>
                <span>Amount</span>
                <span>Entry Price</span>
                <span>Exit Price</span>
                <span>Profit/Loss</span>
                <span>Balance</span>
              </div>

              <div className="trades-list">
                {results.trades.map((trade) => (
                  <div key={trade.id} className="trade-row">
                    <span>{trade.id}</span>
                    <span className={trade.type}>
                      {trade.type.toUpperCase()}
                    </span>
                    <span>{trade.pair}</span>
                    <span>{trade.amount}</span>
                    <span>${trade.entryPrice}</span>
                    <span>${trade.exitPrice}</span>
                    <span
                      className={
                        parseFloat(trade.profit) >= 0 ? "positive" : "negative"
                      }
                    >
                      ${trade.profit}
                    </span>
                    <span>${trade.balance}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "chart" && (
        <div className="results-chart">
          <div className="chart-placeholder">
            <p>Equity curve chart will be displayed here</p>
            {/* Tu będzie faktyczny wykres, np. z recharts */}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsViewer;

import React from "react";
import "./StrategyTester.css";

const StrategyTester = ({
  selectedStrategy,
  dataSource,
  onRunTest,
  isRunning,
}) => {
  return (
    <div className="strategy-tester card">
      <h2>Run Backtest</h2>

      <div className="test-status">
        <div className="status-item">
          <span className="status-label">Strategy:</span>
          <span className="status-value">
            {selectedStrategy ? selectedStrategy.name : "Not selected"}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Data:</span>
          <span className="status-value">
            {dataSource
              ? `${dataSource.pair} (${dataSource.timeframe})`
              : "Not imported"}
          </span>
        </div>

        {dataSource && (
          <div className="status-item">
            <span className="status-label">Period:</span>
            <span className="status-value">
              {dataSource.startDate.substring(0, 10)} to{" "}
              {dataSource.endDate.substring(0, 10)}
            </span>
          </div>
        )}

        {dataSource && (
          <div className="status-item">
            <span className="status-label">Candles:</span>
            <span className="status-value">
              {dataSource.candles.length} candles
            </span>
          </div>
        )}
      </div>

      <div className="test-options">
        <div className="option-group">
          <label>Initial Capital (USDT)</label>
          <input type="number" defaultValue="10000" />
        </div>

        <div className="option-group">
          <label>Position Size (%)</label>
          <input type="number" defaultValue="20" min="1" max="100" />
        </div>

        <div className="option-group">
          <label>Stop Loss (%)</label>
          <input type="number" defaultValue="2" min="0" max="100" />
        </div>

        <div className="option-group">
          <label>Take Profit (%)</label>
          <input type="number" defaultValue="5" min="0" max="100" />
        </div>
      </div>

      <button
        className="run-test-button"
        onClick={onRunTest}
        disabled={!selectedStrategy || !dataSource || isRunning}
      >
        {isRunning ? "Running Test..." : "Run Backtest"}
      </button>
    </div>
  );
};

export default StrategyTester;

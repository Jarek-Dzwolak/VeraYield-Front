import React, { useState } from "react";
import "./StrategyTester.css";

const StrategyTester = ({
  selectedStrategy,
  dataSource,
  onRunTest,
  isRunning,
}) => {
  const [initialCapital, setInitialCapital] = useState(10000);

  const handleRunTest = () => {
    onRunTest({
      initialCapital,
      positionSize: 100, // Dla Hursta używamy pełnych wartości z parametrów strategii
      stopLoss: 0, // Dla Hursta ignorujemy stop-loss
      takeProfit: 0, // Dla Hursta ignorujemy take-profit
    });
  };

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
          <input
            type="number"
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
          />
        </div>

        <div className="hurst-strategy-note">
          <p>The Hurst Channel Strategy uses the following position sizing:</p>
          <ul>
            <li>
              First entry: {selectedStrategy?.parameters.firstEntry || 10}% of
              capital
            </li>
            <li>
              Second entry: {selectedStrategy?.parameters.secondEntry || 25}% of
              capital
            </li>
            <li>
              Third entry: {selectedStrategy?.parameters.thirdEntry || 50}% of
              capital
            </li>
            <li>Exit: When price returns from upper extreme to channel</li>
          </ul>
        </div>
      </div>

      <button
        className="run-test-button"
        onClick={handleRunTest}
        disabled={!selectedStrategy || !dataSource || isRunning}
      >
        {isRunning ? "Running Test..." : "Run Backtest"}
      </button>
    </div>
  );
};

export default StrategyTester;

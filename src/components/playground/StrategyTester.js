import React, { useState } from "react";
import "./StrategyTester.css";

const StrategyTester = ({
  selectedStrategy,
  dataSource,
  onRunTest,
  isRunning,
}) => {
  const [initialCapital, setInitialCapital] = useState(10000);
  const [positionSize, setPositionSize] = useState(20);
  const [stopLoss, setStopLoss] = useState(2);
  const [takeProfit, setTakeProfit] = useState(5);

  // Sprawdzamy, czy wybrana strategia to Hurst
  const isHurstStrategy = selectedStrategy?.id === "hurst";

  const handleRunTest = () => {
    onRunTest({
      initialCapital,
      positionSize: isHurstStrategy ? 100 : positionSize, // Dla Hursta używamy pełnych wartości z parametrów strategii
      stopLoss: isHurstStrategy ? 0 : stopLoss, // Dla Hursta ignorujemy stop-loss
      takeProfit: isHurstStrategy ? 0 : takeProfit, // Dla Hursta ignorujemy take-profit
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

        {!isHurstStrategy && (
          <>
            <div className="option-group">
              <label>Position Size (%)</label>
              <input
                type="number"
                value={positionSize}
                onChange={(e) => setPositionSize(Number(e.target.value))}
                min="1"
                max="100"
              />
            </div>

            <div className="option-group">
              <label>Stop Loss (%)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                min="0"
                max="100"
              />
            </div>

            <div className="option-group">
              <label>Take Profit (%)</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value))}
                min="0"
                max="100"
              />
            </div>
          </>
        )}

        {isHurstStrategy && (
          <div className="hurst-strategy-note">
            <p>
              The Hurst Channel Strategy uses its own position sizing and risk
              management approach:
            </p>
            <ul>
              <li>
                First entry: {selectedStrategy.parameters.firstEntry}% of
                capital
              </li>
              <li>
                Second entry: {selectedStrategy.parameters.secondEntry}% of
                capital
              </li>
              <li>
                Third entry: {selectedStrategy.parameters.thirdEntry}% of
                capital
              </li>
              <li>Exit: When price returns from upper extreme to channel</li>
            </ul>
          </div>
        )}
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

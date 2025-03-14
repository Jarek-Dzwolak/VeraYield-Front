import React, { useState } from "react";
import "./StrategyTester.css";

const StrategyTester = ({
  selectedStrategy,
  dataSource,
  onRunTest,
  isRunning,
}) => {
  const [initialCapital, setInitialCapital] = useState(10000);
  const [useTrendFilter, setUseTrendFilter] = useState(true);
  const [trendTimeframe, setTrendTimeframe] = useState("1h");
  const [trailingStopPercent, setTrailingStopPercent] = useState(0.03); // 3% trailing stop

  const handleRunTest = () => {
    onRunTest({
      initialCapital,
      positionSize: 100, // Dla Hursta używamy pełnych wartości z parametrów strategii
      stopLoss: 0, // Dla Hursta ignorujemy stop-loss
      takeProfit: 0, // Dla Hursta ignorujemy take-profit
      useTrendFilter, // Dodajemy parametr filtra trendu
      trendTimeframe, // Dodajemy timeframe dla filtra trendu
      trailingStopPercent, // Dodajemy parametr trailing stopu
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

        <div className="option-group">
          <label>Trailing Stop (%)</label>
          <input
            type="number"
            value={trailingStopPercent}
            min="0.005"
            max="0.1"
            step="0.005"
            onChange={(e) => setTrailingStopPercent(Number(e.target.value))}
          />
          <div className="info-message">
            Trailing stop activates after price reaches upper extreme and then
            drops by this percentage.
          </div>
        </div>

        {/* Opcje dla filtra trendu */}
        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useTrendFilter}
              onChange={(e) => setUseTrendFilter(e.target.checked)}
            />
            Use Trend Filter (Only enter in uptrend or neutral)
          </label>

          {useTrendFilter && (
            <div className="trend-timeframe-selector">
              <label>Trend Timeframe:</label>
              <select
                value={trendTimeframe}
                onChange={(e) => setTrendTimeframe(e.target.value)}
              >
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
              </select>
              <div className="info-message">
                Using a higher timeframe provides a better indication of the
                overall market trend.
              </div>
            </div>
          )}
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
            <li>
              Exit: When price returns from upper extreme to channel or via{" "}
              {trailingStopPercent * 100}% trailing stop
            </li>
          </ul>
          {useTrendFilter && (
            <p className="trend-filter-note">
              <strong>Trend Filter enabled:</strong> Long positions will only be
              opened when the {trendTimeframe} trend is bullish or neutral.
            </p>
          )}
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

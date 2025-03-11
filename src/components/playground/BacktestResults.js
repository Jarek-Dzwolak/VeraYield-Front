import React from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceDot,
} from "recharts";
import "./BacktestResults.css";

const BacktestResults = ({ results, strategyType }) => {
  if (!results) {
    return (
      <div className="backtest-results card empty">
        <h2>Backtest Results</h2>
        <p>No results yet. Run a backtest to see results here.</p>
      </div>
    );
  }

  // Przygotowanie danych do wykresu
  const equityData = results.equity.map((point) => ({
    time: new Date(point.time).toLocaleDateString(),
    value: point.value,
  }));

  // Przygotuj dane dotyczące wejść i wyjść do wykresu
  const tradesData = [];
  results.trades.forEach((trade, index) => {
    // Dodaj wszystkie punkty wejścia
    trade.entries.forEach((entry) => {
      tradesData.push({
        time: new Date(entry.time).toLocaleDateString(),
        value: results.equity.find((e) => e.time === entry.time)?.value || null,
        type: "entry",
        tradeIndex: index,
        price: entry.price,
        size: entry.size,
      });
    });

    // Dodaj punkt wyjścia
    tradesData.push({
      time: new Date(trade.exit.time).toLocaleDateString(),
      value:
        results.equity.find((e) => e.time === trade.exit.time)?.value || null,
      type: "exit",
      tradeIndex: index,
      price: trade.exit.price,
      profit: trade.profit,
      profitPercent: trade.profitPercent,
    });
  });

  // Sprawdzamy, czy to strategia Hursta
  const isHurstStrategy = strategyType === "hurst";

  // Sprawdzamy, czy trejdy mają informacje o uśrednianiu pozycji
  const hasPositionAveraging = results.trades.some(
    (trade) =>
      trade.entries.length > 1 &&
      trade.entries.some((entry) => entry.size !== undefined)
  );

  // Oblicz średnią liczbę wejść na trade
  const avgEntriesPerTrade =
    results.trades.reduce((sum, trade) => sum + trade.entries.length, 0) /
    results.trades.length;

  // Oblicz statystyki dla poszczególnych typów wejść
  const entryStats = {
    single: results.trades.filter((trade) => trade.entries.length === 1).length,
    double: results.trades.filter((trade) => trade.entries.length === 2).length,
    triple: results.trades.filter((trade) => trade.entries.length === 3).length,
  };

  // Oblicz statystyki wyjść, jeśli są dostępne
  const exitTypeStats = {};
  results.trades.forEach((trade) => {
    if (trade.exit.reason) {
      exitTypeStats[trade.exit.reason] =
        (exitTypeStats[trade.exit.reason] || 0) + 1;
    }
  });

  return (
    <div className="backtest-results card">
      <h2>Backtest Results</h2>

      {isHurstStrategy && (
        <div className="strategy-note">
          <p>
            <strong>Note:</strong> The Hurst Channel Strategy uses its own risk
            management system. It enters positions when price touches the lower
            band and exits only when price returns from the upper extreme back
            to the channel. Position averaging is used to improve entry price.
          </p>
        </div>
      )}

      <div className="stats-summary">
        <div className="stat-card">
          <h3>Performance</h3>
          <div className="stat-item">
            <span>Net Profit:</span>
            <span
              className={
                results.netProfit >= 0 ? "positive-value" : "negative-value"
              }
            >
              ${results.netProfit.toFixed(2)} (
              {results.netProfitPercent.toFixed(2)}%)
            </span>
          </div>
          <div className="stat-item">
            <span>Initial Capital:</span>
            <span>${(results.balance - results.netProfit).toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span>Final Balance:</span>
            <span>${results.balance.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span>Max Drawdown:</span>
            <span className="negative-value">
              {results.maxDrawdown.toFixed(2)}%
            </span>
          </div>
          <div className="stat-item">
            <span>Profit Factor:</span>
            <span>
              {isFinite(results.profitFactor)
                ? results.profitFactor.toFixed(2)
                : "∞"}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <h3>Trades</h3>
          <div className="stat-item">
            <span>Total Trades:</span>
            <span>{results.totalTrades}</span>
          </div>
          <div className="stat-item">
            <span>Win Rate:</span>
            <span>{results.winRate.toFixed(2)}%</span>
          </div>
          <div className="stat-item">
            <span>Winning Trades:</span>
            <span>{results.trades.filter((t) => t.profit > 0).length}</span>
          </div>
          <div className="stat-item">
            <span>Losing Trades:</span>
            <span>{results.trades.filter((t) => t.profit <= 0).length}</span>
          </div>
          {hasPositionAveraging && (
            <div className="stat-item">
              <span>Avg. Entry Points per Trade:</span>
              <span>{avgEntriesPerTrade.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {hasPositionAveraging && (
        <div className="stats-summary">
          <div className="stat-card">
            <h3>Entry Distribution</h3>
            <div className="stat-item">
              <span>Single Entry Trades:</span>
              <span>{entryStats.single}</span>
            </div>
            <div className="stat-item">
              <span>Double Entry Trades:</span>
              <span>{entryStats.double}</span>
            </div>
            <div className="stat-item">
              <span>Triple Entry Trades:</span>
              <span>{entryStats.triple}</span>
            </div>
          </div>

          {Object.keys(exitTypeStats).length > 0 && (
            <div className="stat-card">
              <h3>Exit Types</h3>
              {Object.entries(exitTypeStats).map(([reason, count]) => (
                <div className="stat-item" key={reason}>
                  <span>{reason.replace("_", " ")}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="chart-section">
        <h3>Equity Curve</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip
                formatter={(value) => ["$" + value.toFixed(2), "Balance"]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4CAF50"
                fill="#4CAF50"
                fillOpacity={0.2}
                name="Account Balance"
              />

              {/* Dodaj referencyjne punkty dla wejść i wyjść */}
              {tradesData.map((point, idx) =>
                point.type === "entry" ? (
                  <ReferenceDot
                    key={`entry-${idx}`}
                    x={point.time}
                    y={point.value}
                    r={4}
                    fill="#00ff00"
                    stroke="none"
                  />
                ) : (
                  <ReferenceDot
                    key={`exit-${idx}`}
                    x={point.time}
                    y={point.value}
                    r={4}
                    fill={point.profit >= 0 ? "#00ff00" : "#ff0000"}
                    stroke="none"
                  />
                )
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="trades-section">
        <h3>Trade History</h3>
        <div className="table-container">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Entry Date</th>
                <th>Entry Price{hasPositionAveraging ? "(s)" : ""}</th>
                <th>Exit Date</th>
                <th>Exit Price</th>
                <th>Profit/Loss</th>
                {hasPositionAveraging && <th>Entries</th>}
                {Object.keys(exitTypeStats).length > 0 && <th>Exit Reason</th>}
              </tr>
            </thead>
            <tbody>
              {results.trades.map((trade, idx) => (
                <tr
                  key={idx}
                  className={trade.profit >= 0 ? "profit-row" : "loss-row"}
                >
                  <td>{new Date(trade.entries[0].time).toLocaleString()}</td>
                  <td>
                    <div className="entry-prices">
                      {trade.entries.map((entry, entryIdx) => (
                        <div key={entryIdx}>
                          ${entry.price.toFixed(2)}
                          {hasPositionAveraging && entry.size && (
                            <span className="entry-size"> ({entry.size}%)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>{new Date(trade.exit.time).toLocaleString()}</td>
                  <td>${trade.exit.price.toFixed(2)}</td>
                  <td
                    className={
                      trade.profit >= 0 ? "positive-value" : "negative-value"
                    }
                  >
                    ${trade.profit.toFixed(2)} ({trade.profitPercent.toFixed(2)}
                    %)
                  </td>
                  {hasPositionAveraging && <td>{trade.entries.length}</td>}
                  {Object.keys(exitTypeStats).length > 0 && (
                    <td>{trade.exit.reason || "normal"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BacktestResults;

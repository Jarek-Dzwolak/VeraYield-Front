import React, { useEffect, useState } from "react";
import axios from "axios";

const BacktestResults = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetching data from backend
    axios
      .get("http://localhost:5000/api/v1/backtest")
      .then((response) => {
        setData(response.data.results);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Backtest Results</h2>

      {/* Metrics Table */}
      <table
        border="1"
        cellPadding="5"
        style={{
          width: "100%",
          marginBottom: "20px",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Profit/Loss</td>
            <td>{data?.profitLoss}</td>
          </tr>
          <tr>
            <td>Win Rate</td>
            <td>{data?.winRate}%</td>
          </tr>
          <tr>
            <td>Trades Count</td>
            <td>{data?.tradesCount}</td>
          </tr>
          <tr>
            <td>Average Profit</td>
            <td>{data?.averageProfit}</td>
          </tr>
          <tr>
            <td>Max Drawdown</td>
            <td>{data?.maxDrawdown}</td>
          </tr>
          <tr>
            <td>Sharpe Ratio</td>
            <td>{data?.sharpeRatio}</td>
          </tr>
        </tbody>
      </table>

      <h3>Trades</h3>

      {/* Trades Table */}
      <table
        border="1"
        cellPadding="5"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Pair</th>
            <th>Amount</th>
            <th>Entry Price</th>
            <th>Exit Price</th>
            <th>Profit</th>
            <th>Balance</th>
            <th>Timestamp</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {data?.trades?.map((trade) => (
            <tr key={trade.id}>
              <td>{trade.id}</td>
              <td>{trade.type}</td>
              <td>{trade.pair}</td>
              <td>{trade.amount}</td>
              <td>{trade.entryPrice}</td>
              <td>{trade.exitPrice || "-"}</td>
              <td>{trade.profit}</td>
              <td>{trade.balance}</td>
              <td>{new Date(trade.timestamp).toLocaleString()}</td>
              <td>{trade.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BacktestResults;

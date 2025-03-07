import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./CandleDataViewer.css";

const CandleDataViewer = ({ data, isLoading }) => {
  const [activeTab, setActiveTab] = useState("price");
  const [timeRange, setTimeRange] = useState("all");

  console.log("Dane przed mapowaniem:", data);
  console.log("Candles:", data?.candles);

  if (isLoading) {
    return (
      <div className="candle-viewer card loading">
        <div className="loader"></div>
        <h3>Loading data...</h3>
        <p>Fetching market data from database</p>
      </div>
    );
  }

  // Zapewnienie, że `candles` jest tablicą
  const candles = Array.isArray(data?.candles) ? data.candles : [];

  if (candles.length === 0) {
    return (
      <div className="candle-viewer card empty">
        <div className="placeholder-content">
          <h3>No Data Available</h3>
          <p>
            Import data using the panel on the left to visualize price history
          </p>
        </div>
      </div>
    );
  }

  // Konwersja danych na odpowiedni format
  const chartData = candles.map((candle) => ({
    date: new Date(candle.timestamp || candle.time).toLocaleDateString(),
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
    volume: parseFloat(candle.volume),
  }));

  return (
    <div className="candle-viewer card">
      <h2>
        Market Data: {data.pair} ({data.timeframe})
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, "Price"]} />
          <Legend />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#FFC107"
            name="Close Price"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CandleDataViewer;

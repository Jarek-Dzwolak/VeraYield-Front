import React from "react";
import "./TradingChart.css";

const TradingChart = () => {
  // Dane demonstracyjne do wykresu
  const chartData = [
    { time: "1h", value: 48256.32 },
    { time: "2h", value: 48356.17 },
    { time: "3h", value: 48512.91 },
    { time: "4h", value: 48490.23 },
    { time: "5h", value: 48610.45 },
    { time: "6h", value: 48720.78 },
    { time: "7h", value: 48650.34 },
    { time: "8h", value: 48720.12 },
  ];

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>BTC/USDT</h2>
        <div className="price-info">
          <span className="current-price">$48,720.12</span>
          <span className="price-change positive">+1.8%</span>
        </div>
      </div>
      <div className="placeholder-chart">
        {chartData.map((point, index) => (
          <div
            key={index}
            className="chart-bar"
            style={{
              height: `${(point.value - 48000) / 10}px`,
            }}
          ></div>
        ))}
      </div>
      <div className="time-selector">
        <button className="active">1h</button>
        <button>4h</button>
        <button>1d</button>
        <button>1w</button>
        <button>1m</button>
      </div>
    </div>
  );
};

export default TradingChart;

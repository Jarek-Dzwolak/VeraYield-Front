import React from "react";
import "./TradingHistory.css";

const TradingHistory = () => {
  // Przykładowe dane historii transakcji
  const historyData = [
    {
      id: 1,
      type: "buy",
      pair: "BTC/USDT",
      price: "48,710.56",
      amount: "0.085",
      total: "4,140.40",
      time: "14:32:15",
    },
    {
      id: 2,
      type: "sell",
      pair: "BTC/USDT",
      price: "48,750.30",
      amount: "0.042",
      total: "2,047.51",
      time: "14:28:45",
    },
    {
      id: 3,
      type: "buy",
      pair: "BTC/USDT",
      price: "48,705.28",
      amount: "0.125",
      total: "6,088.16",
      time: "14:25:10",
    },
    {
      id: 4,
      type: "sell",
      pair: "BTC/USDT",
      price: "48,780.15",
      amount: "0.076",
      total: "3,707.29",
      time: "14:20:30",
    },
    {
      id: 5,
      type: "buy",
      pair: "BTC/USDT",
      price: "48,690.80",
      amount: "0.030",
      total: "1,460.72",
      time: "14:18:05",
    },
  ];

  return (
    <div className="trading-history card">
      <h3>Trading History</h3>
      <div className="history-header">
        <span>Type</span>
        <span>Price</span>
        <span>Amount</span>
        <span>Total</span>
        <span>Time</span>
      </div>
      <div className="history-items">
        {historyData.map((item) => (
          <div key={item.id} className="history-row">
            <span className={item.type}>{item.type.toUpperCase()}</span>
            <span>{item.price}</span>
            <span>{item.amount}</span>
            <span>{item.total}</span>
            <span>{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TradingHistory;

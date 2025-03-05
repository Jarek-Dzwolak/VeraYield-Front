import React from "react";
import "./RecentTransactions.css";

const RecentTransactions = () => {
  // Przykładowe dane
  const transactions = [
    {
      id: 1,
      type: "buy",
      title: "Bought BTC",
      info: "0.05 BTC at $48,235.76",
      time: "1 hour ago",
    },
    {
      id: 2,
      type: "sell",
      title: "Sold ETH",
      info: "2.5 ETH at $2,415.32",
      time: "3 hours ago",
    },
    {
      id: 3,
      type: "buy",
      title: "Bought SOL",
      info: "10 SOL at $124.56",
      time: "Yesterday",
    },
  ];

  return (
    <div className="recent-transactions card">
      <h2>Recent Trades</h2>
      <div className="transactions-list">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="transaction-item">
            <div className={`transaction-icon ${transaction.type}`}></div>
            <div className="transaction-details">
              <div className="transaction-title">{transaction.title}</div>
              <div className="transaction-info">{transaction.info}</div>
            </div>
            <div className="transaction-time">{transaction.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;

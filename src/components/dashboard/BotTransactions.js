import React from "react";
import "./BotTransactions.css";

const BotTransactions = () => {
  const transactions = [
    {
      id: 1,
      type: "buy",
      pair: "BTC/USDT",
      amount: "0.015 BTC",
      price: "$48,632.25",
      time: "18:45:22",
      strategy: "Momentum",
      status: "executed",
    },
    {
      id: 2,
      type: "sell",
      pair: "ETH/USDT",
      amount: "1.25 ETH",
      price: "$2,432.78",
      time: "17:32:15",
      strategy: "Range Bound",
      status: "executed",
    },
    {
      id: 3,
      type: "buy",
      pair: "SOL/USDT",
      amount: "12.5 SOL",
      price: "$126.45",
      time: "17:22:08",
      strategy: "Breakout",
      status: "pending",
    },
    {
      id: 4,
      type: "sell",
      pair: "ADA/USDT",
      amount: "350 ADA",
      price: "$0.52",
      time: "15:48:30",
      strategy: "Momentum",
      status: "executed",
    },
    {
      id: 5,
      type: "buy",
      pair: "BTC/USDT",
      amount: "0.022 BTC",
      price: "$48,125.12",
      time: "14:05:11",
      strategy: "Momentum",
      status: "executed",
    },
  ];

  return (
    <div className="bot-transactions card">
      <div className="card-header">
        <h2>Recent Bot Transactions</h2>
        <button className="view-all-btn">View All</button>
      </div>

      <div className="transactions-table">
        <div className="table-container">
          <div className="table-fixed-width">
            <div className="table-header">
              <span>Type</span>
              <span>Pair</span>
              <span>Amount</span>
              <span>Price</span>
              <span>Time</span>
              <span>Strategy</span>
              <span>Status</span>
            </div>

            <div className="transactions-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="transaction-row">
                  <span className={`tx-type ${tx.type}`}>{tx.type}</span>
                  <span className="tx-pair">{tx.pair}</span>
                  <span className="tx-amount">{tx.amount}</span>
                  <span className="tx-price">{tx.price}</span>
                  <span className="tx-time">{tx.time}</span>
                  <span className="tx-strategy">{tx.strategy}</span>
                  <span className={`tx-status ${tx.status}`}>{tx.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotTransactions;

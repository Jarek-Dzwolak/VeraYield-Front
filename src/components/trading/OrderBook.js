import React from "react";
import "./OrderBook.css";

const OrderBook = () => {
  // Przykładowe dane dla książki zleceń
  const sellOrders = [
    { price: "48,750.20", amount: "0.125", total: "6,093.78" },
    { price: "48,745.50", amount: "0.082", total: "3,997.13" },
    { price: "48,732.10", amount: "0.215", total: "10,477.40" },
    { price: "48,730.30", amount: "0.063", total: "3,070.01" },
    { price: "48,728.40", amount: "0.095", total: "4,629.20" },
  ];

  const buyOrders = [
    { price: "48,715.30", amount: "0.142", total: "6,917.57" },
    { price: "48,705.60", amount: "0.318", total: "15,488.38" },
    { price: "48,700.90", amount: "0.075", total: "3,652.57" },
    { price: "48,695.20", amount: "0.224", total: "10,907.72" },
    { price: "48,690.50", amount: "0.158", total: "7,693.10" },
  ];

  return (
    <div className="order-book card">
      <h3>Order Book</h3>
      <div className="order-book-header">
        <span>Price (USDT)</span>
        <span>Amount (BTC)</span>
        <span>Total</span>
      </div>
      <div className="sell-orders">
        {sellOrders.map((order, index) => (
          <div key={index} className="order-row">
            <span className="negative">{order.price}</span>
            <span>{order.amount}</span>
            <span>{order.total}</span>
          </div>
        ))}
      </div>
      <div className="current-price">
        <span>48,720.12</span>
      </div>
      <div className="buy-orders">
        {buyOrders.map((order, index) => (
          <div key={index} className="order-row">
            <span className="positive">{order.price}</span>
            <span>{order.amount}</span>
            <span>{order.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;

import React from "react";
import TradingView from "../components/trading/TradingView";
import OrderForm from "../components/trading/OrderForm";
import OrderBook from "../components/trading/OrderBook";
import TradingHistory from "../components/trading/TradingHistory";
import "./Trading.css";

const Trading = () => {
  return (
    <div className="trading-container">
      <TradingView />
      <div className="trading-grid">
        <OrderForm />
        <OrderBook />
        <TradingHistory />
      </div>
    </div>
  );
};

export default Trading;

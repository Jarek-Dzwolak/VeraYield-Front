// src/components/trading/TradingView.js
import React, { useState } from "react";
import "./TradingView.css";

const TradingView = () => {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1D");

  // Przykładowe dane par do handlu
  const tradingPairs = [
    { symbol: "BTC/USDT", price: "48,720.12", change: "+1.8%" },
    { symbol: "ETH/USDT", price: "2,415.32", change: "-0.8%" },
    { symbol: "SOL/USDT", price: "124.56", change: "+5.7%" },
    { symbol: "ADA/USDT", price: "0.48", change: "+2.3%" },
  ];

  return (
    <div className="trading-view">
      <div className="trading-header">
        <div className="trading-pairs">
          {tradingPairs.map((pair) => (
            <div
              key={pair.symbol}
              className={`trading-pair ${
                selectedPair === pair.symbol ? "active" : ""
              }`}
              onClick={() => setSelectedPair(pair.symbol)}
            >
              <div className="pair-symbol">{pair.symbol}</div>
              <div className="pair-price">{pair.price}</div>
              <div
                className={`pair-change ${
                  pair.change.startsWith("+") ? "positive" : "negative"
                }`}
              >
                {pair.change}
              </div>
            </div>
          ))}
        </div>

        <div className="trading-timeframes">
          {["5m", "15m", "1H", "4H", "1D", "1W"].map((time) => (
            <button
              key={time}
              className={`timeframe-btn ${timeframe === time ? "active" : ""}`}
              onClick={() => setTimeframe(time)}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        <div className="placeholder-chart">
          <div className="chart-message">
            Advanced trading chart will be implemented with a charting library
          </div>
        </div>
      </div>

      <div className="trading-indicators">
        <div className="indicator">
          <span className="indicator-name">RSI</span>
          <span className="indicator-value">58.4</span>
        </div>
        <div className="indicator">
          <span className="indicator-name">MACD</span>
          <span className="indicator-value">Bullish</span>
        </div>
        <div className="indicator">
          <span className="indicator-name">MA(50)</span>
          <span className="indicator-value">48,213.5</span>
        </div>
        <div className="indicator">
          <span className="indicator-name">MA(200)</span>
          <span className="indicator-value">45,790.2</span>
        </div>
      </div>
    </div>
  );
};

export default TradingView;

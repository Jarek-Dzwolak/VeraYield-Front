import React from "react";
import "./PortfolioSummary.css";

const PortfolioSummary = () => {
  return (
    <div className="portfolio-card">
      <h2>Your Portfolio</h2>
      <div className="portfolio-item">
        <div className="coin-info">
          <span className="coin-icon btc"></span>
          <span className="coin-name">Bitcoin</span>
          <span className="coin-symbol">BTC</span>
        </div>
        <div className="coin-data">
          <span className="coin-amount">0.75 BTC</span>
          <span className="coin-value">$36,540.25</span>
          <span className="coin-change positive">+2.4%</span>
        </div>
      </div>
      <div className="portfolio-item">
        <div className="coin-info">
          <span className="coin-icon eth"></span>
          <span className="coin-name">Ethereum</span>
          <span className="coin-symbol">ETH</span>
        </div>
        <div className="coin-data">
          <span className="coin-amount">5.2 ETH</span>
          <span className="coin-value">$12,480.60</span>
          <span className="coin-change negative">-0.8%</span>
        </div>
      </div>
      <div className="portfolio-item">
        <div className="coin-info">
          <span className="coin-icon sol"></span>
          <span className="coin-name">Solana</span>
          <span className="coin-symbol">SOL</span>
        </div>
        <div className="coin-data">
          <span className="coin-amount">45 SOL</span>
          <span className="coin-value">$5,670.30</span>
          <span className="coin-change positive">+5.7%</span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;

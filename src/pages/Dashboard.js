// src/pages/Dashboard.js - z poprawionym panelem akcji
import React, { useState, useEffect } from "react";
import InstanceOverview from "../components/dashboard/InstanceOverview";
import BotTransactions from "../components/dashboard/BotTransactions";
import ActionPanel from "../components/dashboard/ActionPanel";
import TechnicalAnalysisChart from "../components/dashboard/TechnicalAnalysisChart";

import "./Dashboard.css";

// Stałe wartości konfiguracyjne
const DEFAULT_PAIR = "BTCUSDT";

const Dashboard = () => {
  // Stan aplikacji
  const [isConnected, setIsConnected] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [chartActive, setChartActive] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Sprawdzanie rozmiaru ekranu
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Efekt do pobierania aktualnej ceny
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`/api/v1/market/ticker/${DEFAULT_PAIR}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data && data.price) {
          setCurrentPrice(parseFloat(data.price));
          setIsConnected(true);
          setLastUpdateTime(new Date());
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    };

    // Wywołaj od razu i potem co 5 sekund
    fetchCurrentPrice();
    const intervalId = setInterval(fetchCurrentPrice, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Obsługa wyboru instancji
  const handleInstanceSelect = (instance) => {
    setSelectedInstance(instance);
  };

  // Przełączanie widoczności wykresu
  const toggleChart = () => {
    setChartActive(!chartActive);
  };

  return (
    <div className="dashboard-container">
      {/* Nagłówek */}
      <div className="dashboard-header">
        <h1>VeraYield</h1>
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span className="status-text">Active:</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Karta z ceną */}
        <div className="dashboard-card price-card">
          <div className="card-header">
            <div className="card-header-with-line">
              {isMobile && <div className="vertical-line"></div>}
              <h2>BTC/USDT Price</h2>
            </div>
          </div>
          <div className="card-content">
            <div className="price-content">
              <div className="price-value-large">
                ${currentPrice ? currentPrice.toFixed(2) : "--"}
              </div>
              <div className="last-updated">
                Last updated: {lastUpdateTime.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Karta z instancjami */}
        <div className="dashboard-card instance-overview-card">
          <div className="card-header">
            <div className="card-header-with-line">
              {isMobile && <div className="vertical-line"></div>}
              <h2>Aktywne Instancje</h2>
            </div>
          </div>
          <div className="card-content">
            <InstanceOverview onSelectInstance={handleInstanceSelect} />
          </div>
        </div>

        {/* Karta z transakcjami */}
        <div className="dashboard-card transactions-card">
          <div className="card-header">
            <div className="card-header-with-line">
              {isMobile && <div className="vertical-line"></div>}
              <h2>Transakcje</h2>
            </div>
          </div>
          <div className="card-content">
            <BotTransactions />
          </div>
        </div>

        {/* Karta z analizą techniczną */}
        <div className="dashboard-card technical-analysis-card">
          <div className="card-header">
            <div className="card-header-with-line">
              {isMobile && <div className="vertical-line"></div>}
              <h2>
                Technical Analysis: {selectedInstance?.symbol || "BTCUSDT"}
              </h2>
            </div>
            {selectedInstance && (
              <button className="chart-toggle-btn" onClick={toggleChart}>
                {chartActive ? "Ukryj" : "Pokaż"}
              </button>
            )}
          </div>
          <div className="card-content">
            <TechnicalAnalysisChart
              instance={selectedInstance}
              isActive={chartActive && selectedInstance !== null}
              onToggle={toggleChart}
            />
          </div>
        </div>
      </div>

      {/* Panel akcji - przekazany jako samodzielny komponent */}
      <ActionPanel />
    </div>
  );
};

export default Dashboard;

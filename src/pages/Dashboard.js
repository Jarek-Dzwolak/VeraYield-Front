// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import InstanceOverview from "../components/dashboard/InstanceOverview";
import BotTransactions from "../components/dashboard/BotTransactions";
import ActionPanel from "../components/dashboard/ActionPanel";
import TechnicalAnalysisChart from "../components/dashboard/TechnicalAnalysisChart";

import "./Dashboard.css";

// Configuration constants
const DEFAULT_PAIR = "BTCUSDT";
const PRICE_REFRESH_INTERVAL = 600000; // 10 minutes in milliseconds

const Dashboard = () => {
  // Application state
  const [isConnected, setIsConnected] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [chartActive, setChartActive] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(false);

  // Optimized price fetching function with useCallback to prevent
  // creating a new function on each render
  const fetchCurrentPrice = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No authentication token found");
        return;
      }

      console.log("Fetching current price...");
      const response = await fetch(`/api/v1/market/ticker/${DEFAULT_PAIR}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(`HTTP error ${response.status} when fetching price`);
        setIsConnected(false);
        return;
      }

      const data = await response.json();
      if (data && data.price) {
        setCurrentPrice(parseFloat(data.price));
        setIsConnected(true);
        setLastUpdateTime(new Date());
        console.log("Price updated:", data.price);
      }
    } catch (error) {
      console.error("Error fetching price:", error);
      setIsConnected(false);
    }
  }, []);

  // Screen size checking
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect for fetching current price - only on first render
  // and then every 10 minutes
  useEffect(() => {
    // Call immediately on first render
    fetchCurrentPrice();

    // Set interval for 10 minutes
    const intervalId = setInterval(fetchCurrentPrice, PRICE_REFRESH_INTERVAL);

    // Cleanup function
    return () => clearInterval(intervalId);
  }, [fetchCurrentPrice]);

  // Instance selection handler - memoized to avoid re-renders
  const handleInstanceSelect = useCallback(
    (instance) => {
      setIsLoading(true);

      // If selected the same instance, do nothing
      if (
        selectedInstance &&
        instance &&
        selectedInstance._id === instance._id
      ) {
        setIsLoading(false);
        return;
      }

      // Reset chart when changing instance
      setChartActive(false);
      setSelectedInstance(instance);

      // Simulate loading delay
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    },
    [selectedInstance]
  );

  // Chart visibility toggle - memoized
  const toggleChart = useCallback(() => {
    if (!selectedInstance) return; // Don't allow chart activation without selected instance

    if (!chartActive && selectedInstance) {
      console.log("Activating chart for instance:", selectedInstance.name);
    }

    setChartActive((prevActive) => !prevActive);
  }, [selectedInstance, chartActive]);

  // Memoized header to avoid re-rendering
  const dashboardHeader = useMemo(
    () => (
      <div className="dashboard-header">
        <h1>VeraYield</h1>
        <div className="status-indicator">
          <span
            className={`status-dot ${
              isConnected ? "connected" : "disconnected"
            }`}
          ></span>
          <span className="status-text">
            Status: {isConnected ? "Active" : "Disconnected"}
          </span>
        </div>
      </div>
    ),
    [isConnected]
  );

  // Memoized price card
  const priceCard = useMemo(
    () => (
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
              <span className="refresh-interval-note">
                {" (Updates every 10 minutes)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    [currentPrice, lastUpdateTime, isMobile]
  );

  return (
    <div className="dashboard-container">
      {/* Header - memoized */}
      {dashboardHeader}

      <div className="dashboard-grid">
        {/* Price card - memoized */}
        {priceCard}

        {/* Instances card */}
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

        {/* Transactions card */}
        <div className="dashboard-card transactions-card">
          <div className="card-header">
            <div className="card-header-with-line">
              {isMobile && <div className="vertical-line"></div>}
              <h2>Transakcje</h2>
            </div>
          </div>
          <div className="card-content">
            <BotTransactions selectedInstance={selectedInstance} />
          </div>
        </div>

        {/* Technical analysis card */}
        <div className="dashboard-card technical-analysis-card">
          <div className="card-header">
            <div className="card-header-with-line">
              {isMobile && <div className="vertical-line"></div>}
              <h2>
                Technical Analysis:{" "}
                {selectedInstance?.name ||
                  selectedInstance?.symbol ||
                  "Wybierz instancję"}
              </h2>
            </div>
            {selectedInstance && (
              <button
                className={`chart-toggle-btn ${chartActive ? "active" : ""}`}
                onClick={toggleChart}
                disabled={isLoading}
              >
                {isLoading
                  ? "Ładowanie..."
                  : chartActive
                  ? "Ukryj wykres"
                  : "Pokaż wykres"}
              </button>
            )}
          </div>
          <div className="card-content">
            {selectedInstance ? (
              <TechnicalAnalysisChart
                key={`chart-${
                  selectedInstance?._id || "no-instance"
                }-${Date.now()}`} // Add timestamp to ensure React recreates the component
                instance={selectedInstance}
                isActive={chartActive && selectedInstance !== null}
                onToggle={toggleChart}
              />
            ) : (
              <div className="no-instance-selected">
                <p>Wybierz instancję, aby zobaczyć analizę techniczną</p>
                <p className="no-instance-hint">
                  Kliknij na instancję w panelu "Aktywne Instancje" powyżej
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action panel */}
      <ActionPanel />
    </div>
  );
};

export default Dashboard;

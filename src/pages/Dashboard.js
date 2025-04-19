// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import InstanceOverview from "../components/dashboard/InstanceOverview";
import BotTransactions from "../components/dashboard/BotTransactions";
import ActionPanel from "../components/dashboard/ActionPanel";
import TechnicalAnalysisChart from "../components/dashboard/TechnicalAnalysisChart";
import InstanceConfigDisplay from "../components/dashboard/InstanceConfigDisplay";

import "./Dashboard.css";

const Dashboard = () => {
  // Application state
  const [isConnected, setIsConnected] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [chartActive, setChartActive] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(false);

  // Screen size checking
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  return (
    <div className="dashboard-container">
      {dashboardHeader}

      <div className="dashboard-grid">
        {/* Konfiguracja instancji */}
        <div className="dashboard-card config-card">
          <InstanceConfigDisplay instance={selectedInstance} />
        </div>

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
                }-${Date.now()}`}
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

// src/pages/Dashboard.js
import React, { useState, useEffect } from "react";
import BotPerformance from "../components/dashboard/BotPerformance";
import ActiveTradingPairs from "../components/dashboard/ActiveTradingPairs";
import AccountBalance from "../components/dashboard/AccountBalance";
import BotTransactions from "../components/dashboard/BotTransactions";
import ActionPanel from "../components/dashboard/ActionPanel";
import "./Dashboard.css";

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [chartData, setChartData] = useState({
    candles: [],
    hurstUpper: [],
    hurstMiddle: [],
    hurstLower: [],
    trendLine: [],
    signals: [], // sygnały wejścia/wyjścia
    trades: [], // zrealizowane transakcje
  });
  const [tradingPairs, setTradingPairs] = useState([]);
  const [accountInfo, setAccountInfo] = useState({
    balance: 0,
    allocation: {},
    engaged: 0,
    available: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [selectedPair, setSelectedPair] = useState("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState("15m");

  // Konfiguracja WebSocket
  useEffect(() => {
    let socket = null;

    const connectWebSocket = () => {
      // Połączenie z twoim backendem WebSocket
      socket = new WebSocket("ws://localhost:8080/trading");

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);

        // Wysłanie początkowej konfiguracji
        socket.send(
          JSON.stringify({
            type: "configure",
            pair: selectedPair,
            timeframe: selectedTimeframe,
          })
        );
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Obsługa różnych typów wiadomości
        switch (data.type) {
          case "market_data":
            setChartData((prevData) => ({
              ...prevData,
              candles: [...prevData.candles, data.candle].slice(-300), // Zachowaj ostatnie 300 świec
            }));
            break;

          case "hurst_data":
            setChartData((prevData) => ({
              ...prevData,
              hurstUpper: data.hurstUpper,
              hurstMiddle: data.hurstMiddle,
              hurstLower: data.hurstLower,
              trendLine: data.trendLine,
            }));
            break;

          case "signal":
            setChartData((prevData) => ({
              ...prevData,
              signals: [...prevData.signals, data.signal].slice(-20), // Ostatnie 20 sygnałów
            }));
            break;

          case "trade":
            setChartData((prevData) => ({
              ...prevData,
              trades: [...prevData.trades, data.trade].slice(-50), // Ostatnie 50 transakcji
            }));

            // Aktualizuj również listę transakcji
            setTransactions((prev) => [data.trade, ...prev].slice(0, 10));
            break;

          case "account_update":
            setAccountInfo(data.account);
            break;

          case "trading_pairs":
            setTradingPairs(data.pairs);
            break;

          default:
            console.log("Unknown message type:", data.type);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);

        // Próba ponownego połączenia po 5 sekundach
        setTimeout(connectWebSocket, 5000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        socket.close();
      };
    };

    connectWebSocket();

    // Sprzątanie przy odmontowaniu komponentu
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [selectedPair, selectedTimeframe]);

  // Obsługa zmiany pary handlowej
  const handlePairChange = (pair) => {
    setSelectedPair(pair);

    // Wyślij informację o zmianie pary do WebSocketa
    if (isConnected) {
      const socket = new WebSocket("ws://localhost:8080/trading");
      socket.send(
        JSON.stringify({
          type: "change_pair",
          pair: pair,
          timeframe: selectedTimeframe,
        })
      );
    }
  };

  // Obsługa zmiany timeframe'u
  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);

    // Wyślij informację o zmianie timeframe'u do WebSocketa
    if (isConnected) {
      const socket = new WebSocket("ws://localhost:8080/trading");
      socket.send(
        JSON.stringify({
          type: "change_timeframe",
          pair: selectedPair,
          timeframe: timeframe,
        })
      );
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>VeraYield Trading Bot</h1>
        <div className={`bot-status ${isConnected ? "online" : "offline"}`}>
          <span className="status-indicator"></span>
          {isConnected ? "Active" : "Offline"}
        </div>
      </div>

      <div className="dashboard-grid">
        <BotPerformance
          chartData={chartData}
          isConnected={isConnected}
          selectedPair={selectedPair}
          selectedTimeframe={selectedTimeframe}
          onPairChange={handlePairChange}
          onTimeframeChange={handleTimeframeChange}
        />

        <AccountBalance accountInfo={accountInfo} />

        <ActiveTradingPairs
          pairs={tradingPairs}
          onSelectPair={handlePairChange}
        />

        <BotTransactions transactions={transactions} />
      </div>

      <ActionPanel
        isConnected={isConnected}
        onToggleConnection={() => {
          // Implementacja logiki włączania/wyłączania bota
          console.log("Toggle bot connection");
        }}
        onStrategySettingsChange={(settings) => {
          // Wysyłanie nowych ustawień strategii do WebSocket
          if (isConnected) {
            const socket = new WebSocket("ws://localhost:8080/trading");
            socket.send(
              JSON.stringify({
                type: "strategy_settings",
                settings: settings,
              })
            );
          }
        }}
      />
    </div>
  );
};

export default Dashboard;

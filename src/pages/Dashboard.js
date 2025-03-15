// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback } from "react";
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
  const [socketInstance, setSocketInstance] = useState(null);
  const [clientId, setClientId] = useState(null);

  // Konfiguracja WebSocket
  const connectWebSocket = useCallback(
    (baseUrl) => {
      // Zamknij istniejące połączenie jeśli istnieje
      if (socketInstance) {
        socketInstance.close();
      }

      // Połączenie z backendem WebSocket - bez tokenu autoryzacyjnego
      const socket = new WebSocket(`${baseUrl}/trading`);
      setSocketInstance(socket);

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);

        // Wysłanie żądania subskrypcji danych
        socket.send(
          JSON.stringify({
            type: "subscribe",
            symbol: selectedPair,
            interval: selectedTimeframe,
          })
        );
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        // Obsługa różnych typów wiadomości
        switch (data.type) {
          case "connection":
            setClientId(data.clientId);
            console.log("WebSocket client ID:", data.clientId);
            break;

          case "marketData":
            if (data.data && data.data.type === "historical") {
              // Obsługa historycznych danych
              setChartData((prevData) => ({
                ...prevData,
                candles: data.data.data,
              }));
            } else if (data.data && data.data.type === "kline") {
              // Obsługa pojedynczej świecy
              const candle = data.data.data;

              setChartData((prevData) => {
                // Znajdź indeks istniejącej świecy, jeśli istnieje
                const existingIndex = prevData.candles.findIndex(
                  (c) => c.openTime === candle.openTime
                );

                // Tworzenie nowej tablicy świec
                let newCandles;
                if (existingIndex !== -1) {
                  // Aktualizuj istniejącą świecę
                  newCandles = [...prevData.candles];
                  newCandles[existingIndex] = candle;
                } else {
                  // Dodaj nową świecę i ogranicz rozmiar
                  newCandles = [...prevData.candles, candle].slice(-300);
                }

                return {
                  ...prevData,
                  candles: newCandles,
                };
              });
            }
            break;

          case "subscribed":
            console.log(`Subscribed to ${data.symbol}/${data.interval}`);
            // Możemy tu wykonać dodatkowe akcje po udanej subskrypcji
            break;

          case "error":
            console.error("WebSocket error:", data.message);
            break;

          // Poniższe typy wiadomości będą obsługiwane, gdy backend będzie wysyłać odpowiednie dane
          case "hurst_data":
            setChartData((prevData) => ({
              ...prevData,
              hurstUpper: data.hurstUpper || prevData.hurstUpper,
              hurstMiddle: data.hurstMiddle || prevData.hurstMiddle,
              hurstLower: data.hurstLower || prevData.hurstLower,
              trendLine: data.trendLine || prevData.trendLine,
            }));
            break;

          case "signal":
            const newSignal = {
              time: data.time,
              type: data.signalType,
              price: data.price,
              message: data.message,
            };

            setChartData((prevData) => ({
              ...prevData,
              signals: [...prevData.signals, newSignal].slice(-20), // Ostatnie 20 sygnałów
            }));
            break;

          case "trade":
            const newTrade = {
              entryTime: data.entryTime,
              exitTime: data.exitTime,
              entryPrice: data.entryPrice,
              exitPrice: data.exitPrice,
              profit: data.profit,
              symbol: data.symbol,
            };

            setChartData((prevData) => ({
              ...prevData,
              trades: [...prevData.trades, newTrade].slice(-50), // Ostatnie 50 transakcji
            }));

            // Aktualizuj również listę transakcji
            setTransactions((prev) => [newTrade, ...prev].slice(0, 10));
            break;

          case "account_update":
            setAccountInfo(data.account);
            break;

          case "trading_pairs":
            setTradingPairs(data.pairs);
            break;

          case "pong":
            // Możemy zaimplementować licznik opóźnienia jeśli jest potrzebny
            break;

          default:
            console.log("Nieznany typ wiadomości:", data.type);
        }
      };

      socket.onclose = (event) => {
        console.log("WebSocket disconnected:", event.reason);
        setIsConnected(false);

        // Próba ponownego połączenia po 5 sekundach
        setTimeout(() => connectWebSocket(baseUrl), 5000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    },
    [socketInstance, selectedPair, selectedTimeframe]
  );

  // Pobieranie informacji o WebSocket przy pierwszym renderowaniu
  useEffect(() => {
    fetch("/api/v1/market/ws-info")
      .then((response) => response.json())
      .then((data) => {
        console.log("WebSocket info received:", data);
        connectWebSocket(data.webSocketUrl);
      })
      .catch((error) => {
        console.error("Error fetching WebSocket info:", error);
        // Używamy domyślnego adresu jeśli nie możemy pobrać konfiguracji
        connectWebSocket("ws://localhost:3000");
      });
  }, [connectWebSocket]);

  // Efekt do zarządzania zmianami pary/timeframe
  useEffect(() => {
    if (
      socketInstance &&
      socketInstance.readyState === WebSocket.OPEN &&
      clientId
    ) {
      // Anuluj poprzednią subskrypcję
      socketInstance.send(
        JSON.stringify({
          type: "unsubscribe",
          symbol: selectedPair,
          interval: selectedTimeframe,
        })
      );

      // Wyślij nową subskrypcję
      socketInstance.send(
        JSON.stringify({
          type: "subscribe",
          symbol: selectedPair,
          interval: selectedTimeframe,
        })
      );
    }
  }, [selectedPair, selectedTimeframe, clientId, socketInstance]);

  // Obsługa zmiany pary handlowej
  const handlePairChange = (pair) => {
    setSelectedPair(pair);
  };

  // Obsługa zmiany timeframe'u
  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  // Wysyłanie ping co 30 sekund aby utrzymać połączenie
  useEffect(() => {
    let pingInterval;

    if (isConnected && socketInstance) {
      pingInterval = setInterval(() => {
        if (socketInstance.readyState === WebSocket.OPEN) {
          socketInstance.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [isConnected, socketInstance]);

  // Sprzątanie przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (socketInstance) {
        socketInstance.close();
      }
    };
  }, [socketInstance]);

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
          if (isConnected && socketInstance) {
            socketInstance.close();
          } else {
            // Pobierz info o WebSocketach i połącz ponownie
            fetch("/api/v1/market/ws-info")
              .then((response) => response.json())
              .then((data) => {
                connectWebSocket(data.webSocketUrl);
              })
              .catch((error) => {
                connectWebSocket("ws://localhost:3000");
              });
          }
        }}
        onStrategySettingsChange={(settings) => {
          // Wysyłanie nowych ustawień strategii do WebSocket
          if (
            isConnected &&
            socketInstance &&
            socketInstance.readyState === WebSocket.OPEN
          ) {
            socketInstance.send(
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

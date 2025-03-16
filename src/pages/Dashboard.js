// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import BotPerformance from "../components/dashboard/BotPerformance";
import ActiveTradingPairs from "../components/dashboard/ActiveTradingPairs";
import AccountBalance from "../components/dashboard/AccountBalance";
import BotTransactions from "../components/dashboard/BotTransactions";
import ActionPanel from "../components/dashboard/ActionPanel";
import "./Dashboard.css";

// Stałe wartości konfiguracyjne
const DEFAULT_PAIR = "BTCUSDT";
const DEFAULT_TIMEFRAME = "15m";
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 5000;

const Dashboard = () => {
  // Stan aplikacji
  const [isConnected, setIsConnected] = useState(false);
  const [chartData, setChartData] = useState({
    candles: [],
    price: null,
    lastUpdate: null,
  });
  const [accountInfo, setAccountInfo] = useState({
    balance: 0,
    allocation: {},
    engaged: 0,
    available: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Referencje dla WebSocket
  const socketRef = useRef(null);
  const clientIdRef = useRef(null);

  // Funkcja do nawiązywania połączenia WebSocket
  const connectWebSocket = useCallback(
    (baseUrl) => {
      // Zamknij istniejące połączenie, jeśli istnieje
      if (socketRef.current) {
        try {
          console.log("Zamykanie istniejącego połączenia WebSocket");
          socketRef.current.onclose = null; // Usuń handler zamknięcia, aby uniknąć ponownych prób
          if (socketRef.current.readyState !== WebSocket.CLOSED) {
            socketRef.current.close();
          }
        } catch (err) {
          console.error("Błąd podczas zamykania poprzedniego połączenia:", err);
        }
        socketRef.current = null;
      }

      // Sprawdź, czy przekroczono limit prób
      if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log(
          `Osiągnięto maksymalną liczbę prób ponownego połączenia (${MAX_RECONNECT_ATTEMPTS})`
        );
        return;
      }

      // Pobierz token autoryzacyjny
      const token =
        localStorage.getItem("token") || localStorage.getItem("authToken");
      if (!token) {
        console.error("Brak tokenu autoryzacyjnego");
        return;
      }

      try {
        // Tworzenie URL z zakodowanym tokenem
        const wsUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;
        console.log(
          `Próba połączenia WebSocket (${
            connectionAttempts + 1
          }/${MAX_RECONNECT_ATTEMPTS}): ${wsUrl}`
        );

        // Utwórz nowe połączenie
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        // Konfiguracja handlerów zdarzeń
        socket.onopen = () => {
          console.log("WebSocket połączony pomyślnie");
          setIsConnected(true);
          setConnectionAttempts(0); // Resetuj licznik prób po udanym połączeniu

          // Subskrybuj tylko parę BTC/USDT i timeframe 15m
          socket.send(
            JSON.stringify({
              type: "subscribe",
              symbol: DEFAULT_PAIR,
              interval: DEFAULT_TIMEFRAME,
            })
          );
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Obsługa różnych typów wiadomości
            switch (data.type) {
              case "connection":
                clientIdRef.current = data.clientId;
                console.log("WebSocket client ID:", data.clientId);
                break;

              case "marketData":
                // Aktualizuj dane cenowe
                if (data.data && data.data.type === "kline") {
                  const candle = data.data.data;

                  // Aktualizuj tablicę świec
                  setChartData((prevData) => {
                    // Znajdź indeks istniejącej świecy
                    const existingIndex = prevData.candles.findIndex(
                      (c) => c.openTime === candle.openTime
                    );

                    // Utwórz nową tablicę świec
                    let newCandles;
                    if (existingIndex !== -1) {
                      // Aktualizuj istniejącą świecę
                      newCandles = [...prevData.candles];
                      newCandles[existingIndex] = candle;
                    } else {
                      // Dodaj nową świecę i ogranicz rozmiar
                      newCandles = [...prevData.candles, candle].slice(-30); // Ogranicz do 30 świec
                    }

                    // Aktualizuj stan
                    return {
                      ...prevData,
                      candles: newCandles,
                      price: parseFloat(candle.close),
                      lastUpdate: new Date(),
                    };
                  });
                }
                break;

              case "historical":
                // Obsługa danych historycznych
                console.log(
                  "Otrzymano dane historyczne, liczba świec:",
                  data.data?.length || 0
                );
                setChartData((prevData) => ({
                  ...prevData,
                  candles: data.data || [],
                  price:
                    data.data?.length > 0
                      ? parseFloat(data.data[data.data.length - 1].close)
                      : null,
                  lastUpdate: new Date(),
                }));
                break;

              case "error":
                console.error("WebSocket error:", data.message);
                break;

              default:
                if (data.type !== "pong") {
                  // Ignoruj wiadomości pong
                  console.log("Otrzymano wiadomość typu:", data.type);
                }
            }
          } catch (err) {
            console.error(
              "Błąd podczas przetwarzania wiadomości WebSocket:",
              err
            );
          }
        };

        socket.onclose = (event) => {
          console.log(
            "WebSocket rozłączony:",
            event.reason,
            "Kod:",
            event.code
          );
          setIsConnected(false);

          // Ponów próbę połączenia, chyba że był to błąd autoryzacji
          if (event.code !== 1008) {
            // Zwiększ opóźnienie z każdą próbą (backoff exponential)
            const delay = Math.min(
              30000,
              RECONNECT_BASE_DELAY * Math.pow(1.5, connectionAttempts)
            );
            console.log(
              `Ponowna próba połączenia za ${Math.round(
                delay / 1000
              )} sekund...`
            );

            setTimeout(() => {
              setConnectionAttempts((prev) => prev + 1);
              connectWebSocket(baseUrl);
            }, delay);
          } else {
            console.error(
              "Błąd autoryzacji WebSocket - ponowne połączenie wstrzymane"
            );
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (err) {
        console.error("Błąd podczas tworzenia połączenia WebSocket:", err);
      }
    },
    [connectionAttempts]
  );

  // Inicjalizacja połączenia WebSocket
  useEffect(() => {
    // Pobierz token przed wywołaniem API
    const token =
      localStorage.getItem("token") || localStorage.getItem("authToken");

    if (!token) {
      console.error("Brak tokenu autoryzacyjnego");
      return;
    }

    // Sprawdź, czy mamy zapisany URL w sesji
    const savedWsUrl = sessionStorage.getItem("wsUrl");
    const lastWsRequestTime = sessionStorage.getItem("lastWsRequestTime");
    const currentTime = Date.now();

    // Jeśli mamy zapisany URL i minęło mniej niż 5 minut, użyj zapisanego URL
    if (
      savedWsUrl &&
      lastWsRequestTime &&
      currentTime - parseInt(lastWsRequestTime) < 5 * 60 * 1000
    ) {
      console.log("Używanie zapisanego URL WebSocket:", savedWsUrl);
      connectWebSocket(savedWsUrl);
      return;
    }

    // W przeciwnym razie pobierz nowe informacje o WebSocket
    fetch("/api/v1/market/ws-info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Błąd HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Otrzymano info o WebSocket:", data);
        // Zapisz URL w sesji
        sessionStorage.setItem("wsUrl", data.webSocketUrl);
        sessionStorage.setItem("lastWsRequestTime", currentTime.toString());
        // Połącz z WebSocket
        connectWebSocket(data.webSocketUrl);
      })
      .catch((error) => {
        console.error("Błąd podczas pobierania informacji o WebSocket:", error);
        // Użyj domyślnego adresu
        connectWebSocket("ws://localhost:3000");
      });
  }, [connectWebSocket]);

  // Wysyłanie pinga co 30 sekund, aby utrzymać połączenie
  useEffect(() => {
    let pingInterval;

    if (isConnected && socketRef.current) {
      pingInterval = setInterval(() => {
        if (
          socketRef.current &&
          socketRef.current.readyState === WebSocket.OPEN
        ) {
          socketRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [isConnected]);

  // Obsługa zamknięcia przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log(
          "Zamykanie połączenia WebSocket przy odmontowaniu komponentu"
        );
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>VeraYield Trading Bot</h1>
        <div className={`bot-status ${isConnected ? "online" : "offline"}`}>
          <span className="status-indicator"></span>
          {isConnected ? "Active" : "Offline"}
          {chartData.price && (
            <span className="current-price">${chartData.price.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <BotPerformance
          chartData={chartData}
          isConnected={isConnected}
          selectedPair={DEFAULT_PAIR}
          selectedTimeframe={DEFAULT_TIMEFRAME}
          onPairChange={() => {}} // Stałe parametry - funkcje nie są potrzebne
          onTimeframeChange={() => {}}
        />

        {/* <AccountBalance accountInfo={accountInfo} /> */}

        <ActiveTradingPairs
          pairs={[{ symbol: DEFAULT_PAIR, status: "active" }]}
          onSelectPair={() => {}}
        />

        <BotTransactions transactions={transactions} />
      </div>

      <ActionPanel
        isConnected={isConnected}
        onToggleConnection={() => {
          if (isConnected && socketRef.current) {
            socketRef.current.close();
          } else {
            const token =
              localStorage.getItem("token") ||
              localStorage.getItem("authToken");
            if (!token) {
              console.error("Brak tokenu autoryzacyjnego");
              return;
            }

            const savedWsUrl = sessionStorage.getItem("wsUrl");
            if (savedWsUrl) {
              connectWebSocket(savedWsUrl);
            } else {
              // Pobierz info o WebSocketach
              fetch("/api/v1/market/ws-info", {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
                .then((response) => response.json())
                .then((data) => {
                  sessionStorage.setItem("wsUrl", data.webSocketUrl);
                  sessionStorage.setItem(
                    "lastWsRequestTime",
                    Date.now().toString()
                  );
                  connectWebSocket(data.webSocketUrl);
                })
                .catch((error) => {
                  console.error("Błąd:", error);
                  connectWebSocket("ws://localhost:3000");
                });
            }
          }
        }}
        onStrategySettingsChange={() => {}} // Nie używamy zmiany strategii w uproszczonej wersji
      />
    </div>
  );
};

export default Dashboard;

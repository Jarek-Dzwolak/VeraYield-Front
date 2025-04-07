import React, { useState, useEffect } from "react";
import "./BotTransactions.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api/v1";

const BotTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [activeInstances, setActiveInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pobierz aktywne instancje
  useEffect(() => {
    const fetchActiveInstances = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Brak autoryzacji");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/instances/active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać aktywnych instancji");
        }

        const data = await response.json();
        if (data.instances && data.instances.length > 0) {
          setActiveInstances(data.instances);

          // Ustaw pierwszą instancję jako domyślną
          if (!selectedInstance) {
            setSelectedInstance(data.instances[0]);

            // Od razu pobierz transakcje dla tej instancji
            fetchTransactionsForInstance(data.instances[0]);
          }
        } else {
          setActiveInstances([]);
          setIsLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchActiveInstances();
  }, [selectedInstance]);

  // Funkcja do pobierania transakcji dla konkretnej instancji
  const fetchTransactionsForInstance = async (instance) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Brak autoryzacji");
        setIsLoading(false);
        return;
      }

      // Pobierz ID instancji
      const instanceId = instance.instanceId || instance._id;

      // Pobierz dane o pozycjach z API
      const response = await fetch(
        `${API_BASE_URL}/signals/positions/history?instanceId=${instanceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Nie udało się pobrać danych transakcji");
      }

      const data = await response.json();

      // Sprawdź, czy dane są w odpowiednim formacie
      if (!data || !Array.isArray(data.history)) {
        // Dostosowanie do nowego API, które zwraca obiekt z historią
        if (data && Array.isArray(data)) {
          setTransactions(data);
        } else {
          setTransactions([]);
        }
      } else {
        // Stary format zwracany przez API
        setTransactions(data.history);
      }

      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Obsługa wyboru instancji
  const handleInstanceSelect = (instance) => {
    setSelectedInstance(instance);
    fetchTransactionsForInstance(instance);
  };

  // Formatowanie daty i czasu
  const formatDateTime = (timestamp) => {
    if (!timestamp) return { date: "-", time: "-" };

    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("pl-PL"),
      time: date.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };

  // Formatowanie liczby z dwoma miejscami po przecinku
  const formatNumber = (number) => {
    if (number === undefined || number === null) return "-";
    return parseFloat(number).toFixed(2);
  };

  // Obliczanie całkowitej kwoty wejścia z wielu transakcji
  const calculateTotalEntryAmount = (tx) => {
    // Jeśli mamy już gotową wartość, używamy jej
    if (tx.capitalAmount !== undefined && tx.capitalAmount !== null) {
      return tx.capitalAmount;
    }

    // Jeśli nie, próbujemy obliczyć z entries
    if (tx.entries && tx.entries.length > 0) {
      return tx.entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    }

    return null;
  };

  // Obliczanie procentowego zysku
  const calculateProfitPercent = (tx) => {
    // Jeśli profitPercent jest już dostępny w danych
    if (tx.profitPercent !== undefined && tx.profitPercent !== null) {
      return tx.profitPercent;
    }

    // Oblicz całkowitą kwotę wejścia
    const totalEntryAmount = calculateTotalEntryAmount(tx);

    // Jeśli mamy dostępny zysk i kwotę kapitału, obliczamy procent
    if (tx.profit && totalEntryAmount && totalEntryAmount !== 0) {
      return (tx.profit / totalEntryAmount) * 100;
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="bot-transactions card">
        <div className="card-header">
          <h2>Transakcje</h2>
        </div>
        <div className="loading-indicator">Ładowanie transakcji...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bot-transactions card">
        <div className="card-header">
          <h2>Transakcje</h2>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="bot-transactions card">
      <div className="card-header">
        <h2>Transakcje</h2>

        {/* Dodany selektor instancji */}
        {activeInstances.length > 0 && (
          <div className="instance-selector">
            <select
              value={
                selectedInstance
                  ? selectedInstance.instanceId || selectedInstance._id
                  : ""
              }
              onChange={(e) => {
                const selectedId = e.target.value;
                const instance = activeInstances.find(
                  (inst) => (inst.instanceId || inst._id) === selectedId
                );
                if (instance) {
                  handleInstanceSelect(instance);
                }
              }}
            >
              {activeInstances.map((instance) => (
                <option
                  key={instance.instanceId || instance._id}
                  value={instance.instanceId || instance._id}
                >
                  {instance.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="transactions-table">
        <div className="table-container">
          <div className="table-fixed-width">
            <div className="table-header">
              <span>Typ</span>
              <span>Symbol</span>
              <span>Wielkość</span>
              <span>Cena wejścia</span>
              <span>Cena wyjścia</span>
              <span>Czas otwarcia</span>
              <span>Czas zamknięcia</span>
              <span>Zysk</span>
              <span>% Zysku</span>
              <span>Status</span>
            </div>

            <div className="transactions-list">
              {transactions.length === 0 ? (
                <div className="no-transactions">
                  Brak transakcji dla wybranej instancji
                </div>
              ) : (
                transactions.map((tx) => {
                  const entryTime = formatDateTime(tx.entryTime);
                  const exitTime = tx.exitTime
                    ? formatDateTime(tx.exitTime)
                    : null;
                  const profitPercent = calculateProfitPercent(tx);
                  const totalEntryAmount = calculateTotalEntryAmount(tx);

                  return (
                    <div
                      key={
                        tx._id ||
                        tx.id ||
                        tx.positionId ||
                        `tx-${Math.random()}`
                      }
                      className="transaction-row"
                    >
                      <span
                        className={`tx-type ${
                          tx.status === "closed" ? "sell" : "buy"
                        }`}
                      >
                        {tx.status === "closed" ? "ZAMKNIĘTA" : "OTWARTA"}
                      </span>
                      <span className="tx-pair">
                        {tx.symbol ||
                          (selectedInstance
                            ? selectedInstance.symbol
                            : "BTC/USDT")}
                      </span>
                      <span className="tx-amount">
                        {formatNumber(totalEntryAmount)} USDT
                      </span>
                      <span className="tx-price">
                        ${formatNumber(tx.entryPrice)}
                      </span>
                      <span className="tx-price">
                        {tx.exitPrice ? `$${formatNumber(tx.exitPrice)}` : "-"}
                      </span>
                      <span className="tx-time">
                        <div>{entryTime.date}</div>
                        <div>{entryTime.time}</div>
                      </span>
                      <span className="tx-time">
                        {exitTime ? (
                          <>
                            <div>{exitTime.date}</div>
                            <div>{exitTime.time}</div>
                          </>
                        ) : (
                          "-"
                        )}
                      </span>
                      <span
                        className={`tx-profit ${
                          tx.profit > 0 ? "profit" : tx.profit < 0 ? "loss" : ""
                        }`}
                      >
                        {tx.profit
                          ? `${tx.profit > 0 ? "+" : ""}${formatNumber(
                              tx.profit
                            )} USDT`
                          : "-"}
                      </span>
                      <span
                        className={`tx-profit-percent ${
                          profitPercent > 0
                            ? "profit"
                            : profitPercent < 0
                            ? "loss"
                            : ""
                        }`}
                      >
                        {profitPercent !== null
                          ? `${profitPercent > 0 ? "+" : ""}${formatNumber(
                              profitPercent
                            )}%`
                          : "-"}
                      </span>
                      <span className={`tx-status ${tx.status}`}>
                        {tx.status === "active"
                          ? "AKTYWNA"
                          : tx.status === "closed"
                          ? "ZAMKNIĘTA"
                          : tx.status === "pending"
                          ? "OCZEKUJĄCA"
                          : tx.status
                          ? tx.status.toUpperCase()
                          : "OCZEKUJĄCA"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotTransactions;

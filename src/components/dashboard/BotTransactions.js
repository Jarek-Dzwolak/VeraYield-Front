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

      // Sprawdzamy różne możliwe formaty odpowiedzi
      let transactionsData = [];
      if (Array.isArray(data)) {
        transactionsData = data;
      } else if (data && data.history && Array.isArray(data.history)) {
        transactionsData = data.history;
      }

      // Filtrujemy tylko zamknięte transakcje
      const closedTransactions = transactionsData.filter(
        (tx) => tx.status === "closed" || tx.exitTime
      );

      // Przetwarzamy dane transakcji
      const processedTransactions = closedTransactions.map((tx) => {
        // Przygotuj dane wejść - sortuj po czasie, by mieć pewność kolejności
        const entries =
          tx.entries && tx.entries.length > 0
            ? [...tx.entries].sort((a, b) => (a.time || 0) - (b.time || 0))
            : [];

        // Dane dla poszczególnych wejść (do 3)
        const entry1 = entries.length > 0 ? entries[0] : null;
        const entry2 = entries.length > 1 ? entries[1] : null;
        const entry3 = entries.length > 2 ? entries[2] : null;

        // Obliczenia dla całej pozycji
        let totalAmount = 0;
        let totalBtc = 0;

        entries.forEach((entry) => {
          const amount = entry.amount || 0;
          const price = entry.price || 0;
          totalAmount += amount;
          if (price > 0) {
            totalBtc += amount / price;
          }
        });

        // Średnia ważona cena wejścia
        const averageEntryPrice =
          totalBtc > 0 ? totalAmount / totalBtc : tx.entryPrice || 0;

        // Obliczenie zysku procentowego
        let profitPercent = tx.profitPercent;
        if (!profitPercent && tx.profit && totalAmount) {
          profitPercent = (tx.profit / totalAmount) * 100;
        }

        return {
          ...tx,
          symbol: tx.symbol || (instance ? instance.symbol : "BTCUSDT"),
          entry1: entry1,
          entry2: entry2,
          entry3: entry3,
          totalAmount: totalAmount,
          averageEntryPrice: averageEntryPrice,
          profitPercent: profitPercent,
          totalEntries: entries.length,
        };
      });

      setTransactions(processedTransactions);
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
    if (!timestamp) return "-";

    const date = new Date(timestamp);
    return `${date.toLocaleDateString("pl-PL")} ${date.toLocaleTimeString(
      "pl-PL",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  };

  // Formatowanie liczby z dwoma miejscami po przecinku
  const formatNumber = (number) => {
    if (number === undefined || number === null) return "-";
    return parseFloat(number).toFixed(2);
  };

  // Formatowanie ceny i kwoty
  const formatEntryData = (entry) => {
    if (!entry) return "-";
    return `$${formatNumber(entry.price)} / ${formatNumber(entry.amount)} USDT`;
  };

  if (isLoading) {
    return (
      <div className="bot-transactions card">
        <div className="card-header">
          <h2>Historia Transakcji</h2>
        </div>
        <div className="loading-indicator">Ładowanie transakcji...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bot-transactions card">
        <div className="card-header">
          <h2>Historia Transakcji</h2>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="bot-transactions card">
      <div className="card-header">
        <h2>Historia Transakcji</h2>

        {/* Selektor instancji */}
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
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Pierwsze wejście</th>
                <th>Drugie wejście</th>
                <th>Trzecie wejście</th>
                <th>Średnia cena</th>
                <th>Zysk %</th>
                <th>Czas otwarcia</th>
                <th>Czas zamknięcia</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-transactions">
                    Brak transakcji dla wybranej instancji
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={
                      tx._id || tx.id || tx.positionId || `tx-${Math.random()}`
                    }
                  >
                    <td>{tx.symbol}</td>
                    <td>{formatEntryData(tx.entry1)}</td>
                    <td>{formatEntryData(tx.entry2)}</td>
                    <td>{formatEntryData(tx.entry3)}</td>
                    <td>${formatNumber(tx.averageEntryPrice)}</td>
                    <td
                      className={
                        tx.profitPercent > 0
                          ? "profit"
                          : tx.profitPercent < 0
                          ? "loss"
                          : ""
                      }
                    >
                      {tx.profitPercent !== null &&
                      tx.profitPercent !== undefined
                        ? `${tx.profitPercent > 0 ? "+" : ""}${formatNumber(
                            tx.profitPercent
                          )}%`
                        : "-"}
                    </td>
                    <td>{formatDateTime(tx.entryTime)}</td>
                    <td>{formatDateTime(tx.exitTime)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BotTransactions;

import React, { useState, useEffect } from "react";
import "./BotTransactions.css";

const BotTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Brak autoryzacji");
          setIsLoading(false);
          return;
        }

        // Pobierz dane o pozycjach z API
        const response = await fetch("/api/v1/signals/positions/history", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać danych transakcji");
        }

        const data = await response.json();

        // Sprawdź, czy dane są w odpowiednim formacie
        if (!data || !Array.isArray(data)) {
          console.error("Nieprawidłowy format danych:", data);
          setTransactions([]);
        } else {
          setTransactions(data);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Błąd:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

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

  if (isLoading) {
    return (
      <div className="bot-transactions card">
        <div className="card-header">
          <h2>Recent Bot Transactions</h2>
        </div>
        <div className="loading-indicator">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bot-transactions card">
        <div className="card-header">
          <h2>Recent Bot Transactions</h2>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="bot-transactions card">
      <div className="card-header">
        <h2>Recent Bot Transactions</h2>
        <button className="view-all-btn">View All</button>
      </div>

      <div className="transactions-table">
        <div className="table-container">
          <div className="table-fixed-width">
            <div className="table-header">
              <span>Type</span>
              <span>Asset</span>
              <span>Position Size</span>
              <span>Entry Price</span>
              <span>Exit Price</span>
              <span>Open Time</span>
              <span>Close Time</span>
              <span>Profit</span>
              <span>Status</span>
            </div>

            <div className="transactions-list">
              {transactions.length === 0 ? (
                <div className="no-transactions">No transactions found</div>
              ) : (
                transactions.map((tx) => {
                  const entryTime = formatDateTime(tx.entryTime);
                  const exitTime = tx.exitTime
                    ? formatDateTime(tx.exitTime)
                    : null;

                  return (
                    <div
                      key={tx._id || tx.id || `tx-${Math.random()}`}
                      className="transaction-row"
                    >
                      <span
                        className={`tx-type ${
                          tx.status === "closed" ? "sell" : "buy"
                        }`}
                      >
                        {tx.status === "closed" ? "CLOSE" : "OPEN"}
                      </span>
                      <span className="tx-pair">BTC/USDT</span>
                      <span className="tx-amount">
                        {formatNumber(tx.capitalAmount)} USDT
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
                      <span className={`tx-status ${tx.status}`}>
                        {tx.status ? tx.status.toUpperCase() : "PENDING"}
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

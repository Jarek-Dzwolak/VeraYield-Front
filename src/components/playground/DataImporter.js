import React, { useState, useEffect } from "react";
import "./DataImporter.css";

const DataImporter = ({ onDataImport }) => {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [symbol, vsCurrency] = selectedPair.split("/");
  const [timeframe, setTimeframe] = useState("1d");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-06-30");
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [availablePairs, setAvailablePairs] = useState([
    "BTC/USDT",
    "ETH/USDT",
    "SOL/USDT",
    "ADA/USDT",
  ]);

  // Pobierz dostępne pary z backendu
  useEffect(() => {
    const fetchAvailablePairs = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/v1/data/available"
        );
        if (response.ok) {
          const data = await response.json();
          if (data.symbols && data.symbols.length > 0) {
            // Przekształć symbole z formatu "BTCUSDT" na "BTC/USDT"
            const formattedPairs = data.symbols.map((symbol) => {
              // Zakładamy, że waluta bazowa to ostatnie 4-5 znaków (USDT, BUSD itp.)
              if (symbol.endsWith("USDT")) {
                const base = symbol.slice(0, -4);
                return `${base}/USDT`;
              }
              return symbol;
            });

            if (formattedPairs.length > 0) {
              setAvailablePairs(formattedPairs);
            }
          }
        }
      } catch (error) {
        console.error("Błąd podczas pobierania dostępnych par:", error);
      }
    };

    fetchAvailablePairs();
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    setStatus("Rozpoczęto pobieranie danych...");

    try {
      // Konwersja dat do formatu ISO
      const startDateISO = new Date(startDate).toISOString();
      const endDateISO = new Date(endDate).toISOString();

      // Pierwszy krok: Zapisanie danych w bazie
      const saveResponse = await fetch(
        "http://localhost:5000/api/v1/data/fetch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: symbol,
            vsCurrency: vsCurrency,
            interval: timeframe,
            startDate: startDateISO,
            endDate: endDateISO,
          }),
        }
      );

      if (!saveResponse.ok) {
        throw new Error(
          `Błąd podczas zapisywania danych: ${saveResponse.status}`
        );
      }

      const saveData = await saveResponse.json();
      console.log("Odpowiedź z zapisywania danych:", saveData);

      // Drugi krok: Pobranie zapisanych danych
      const getCandlesUrl = `http://localhost:5000/api/v1/data/${symbol}/${vsCurrency}/${timeframe}?startDate=${encodeURIComponent(
        startDateISO
      )}&endDate=${encodeURIComponent(endDateISO)}`;
      console.log("Pobieranie danych z:", getCandlesUrl);

      const getCandlesResponse = await fetch(getCandlesUrl);

      if (!getCandlesResponse.ok) {
        throw new Error(
          `Błąd podczas pobierania danych: ${getCandlesResponse.status}`
        );
      }

      const candlesData = await getCandlesResponse.json();
      console.log("Pobrane dane świeczek:", candlesData);

      setStatus(
        "Dane zostały pomyślnie pobrane z Binance i zapisane w bazie danych!"
      );

      // Wywołaj funkcję callback z pobranymi danymi
      onDataImport({
        pair: selectedPair,
        timeframe: timeframe,
        startDate: startDate,
        endDate: endDate,
        candles: candlesData.data || [], // Dane świeczek znajdują się w polu 'data'
      });
    } catch (error) {
      console.error("Błąd podczas importowania danych:", error);
      setStatus(`Błąd: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="data-importer card">
      <h2>Import Data from Binance</h2>

      <div className="import-options">
        <div className="option-group">
          <label>Trading Pair</label>
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
          >
            {availablePairs.map((pair) => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
        </div>

        <div className="option-group">
          <label>Timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">1 Day</option>
          </select>
        </div>

        <div className="option-group date-range">
          <div className="date-input">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="date-input">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        className="import-button"
        onClick={handleImport}
        disabled={isImporting}
      >
        {isImporting ? "Importing..." : "Import Data from Binance"}
      </button>

      {status && <div className="status-message">{status}</div>}
    </div>
  );
};

export default DataImporter;

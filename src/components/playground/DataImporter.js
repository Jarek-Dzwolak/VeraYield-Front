import React, { useState, useEffect } from "react";
import "./DataImporter.css";

const DataImporter = ({ onDataImport }) => {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [symbol, vsCurrency] = selectedPair.split("/");
  const [timeframe, setTimeframe] = useState("15m");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-06-30");
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [importPreciseData, setImportPreciseData] = useState(true); // Domyślnie włączone
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
      // Sprawdzenie poprawności dat
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Nieprawidłowy format daty");
      }

      if (endDateTime <= startDateTime) {
        throw new Error("Data końcowa musi być późniejsza niż data początkowa");
      }

      // Konwersja dat do formatu ISO
      const startDateISO = startDateTime.toISOString();
      const endDateISO = endDateTime.toISOString();

      // Pierwszy krok: Zapisanie danych w bazie
      setStatus(
        `Pobieranie danych ${timeframe} dla ${symbol}/${vsCurrency} od ${startDate} do ${endDate}...`
      );
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
        const errorData = await saveResponse.json();
        throw new Error(
          `Błąd podczas zapisywania danych: ${
            errorData.message || saveResponse.status
          }`
        );
      }

      const saveData = await saveResponse.json();
      console.log("Odpowiedź z zapisywania danych:", saveData);

      // Drugi krok: Pobranie zapisanych danych
      const getCandlesUrl = `http://localhost:5000/api/v1/data/${symbol}/${vsCurrency}/${timeframe}?startDate=${encodeURIComponent(
        startDateISO
      )}&endDate=${encodeURIComponent(endDateISO)}`;

      setStatus("Przetwarzanie danych...");
      console.log("Pobieranie danych z:", getCandlesUrl);

      const getCandlesResponse = await fetch(getCandlesUrl);

      if (!getCandlesResponse.ok) {
        const errorData = await getCandlesResponse.json();
        throw new Error(
          `Błąd podczas pobierania danych: ${
            errorData.message || getCandlesResponse.status
          }`
        );
      }

      const candlesData = await getCandlesResponse.json();
      console.log("Pobrane dane świeczek:", candlesData);

      if (!candlesData.data || candlesData.data.length === 0) {
        throw new Error("Nie znaleziono danych w wybranym zakresie dat");
      }

      // Automatycznie pobierz dane 1-minutowe dla lepszej dokładności
      let candles1mData = null;
      if (importPreciseData) {
        setStatus("Pobieranie danych minutowych (może to potrwać dłużej)...");

        // Zapisanie danych 1-minutowych w bazie
        const save1mResponse = await fetch(
          "http://localhost:5000/api/v1/data/fetch",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              symbol: symbol,
              vsCurrency: vsCurrency,
              interval: "1m",
              startDate: startDateISO,
              endDate: endDateISO,
            }),
          }
        );

        if (!save1mResponse.ok) {
          throw new Error(
            `Błąd podczas zapisywania danych 1m: ${save1mResponse.status}`
          );
        }

        // Pobranie zapisanych danych 1-minutowych
        const get1mCandlesUrl = `http://localhost:5000/api/v1/data/${symbol}/${vsCurrency}/1m?startDate=${encodeURIComponent(
          startDateISO
        )}&endDate=${encodeURIComponent(endDateISO)}`;

        setStatus("Przetwarzanie danych minutowych...");
        const get1mCandlesResponse = await fetch(get1mCandlesUrl);

        if (!get1mCandlesResponse.ok) {
          throw new Error(
            `Błąd podczas pobierania danych 1m: ${get1mCandlesResponse.status}`
          );
        }

        candles1mData = await get1mCandlesResponse.json();
        console.log("Pobrane dane świeczek 1m:", candles1mData);
      }

      // Sprawdzanie poprawności zakresu danych
      if (candlesData.data && candlesData.data.length > 0) {
        const firstCandleDate = new Date(candlesData.data[0].time);
        const lastCandleDate = new Date(
          candlesData.data[candlesData.data.length - 1].time
        );

        console.log(
          `Rzeczywisty zakres pobranych danych: ${firstCandleDate.toISOString()} - ${lastCandleDate.toISOString()}`
        );

        setStatus(
          `Dane zostały pomyślnie pobrane! Łącznie: ${
            candlesData.data.length
          } świec ${timeframe}.${
            importPreciseData && candles1mData && candles1mData.data
              ? ` Pobrano również ${candles1mData.data.length} świec 1-minutowych.`
              : ""
          }`
        );
      }

      // Wywołaj funkcję callback z pobranymi danymi
      onDataImport({
        pair: selectedPair,
        timeframe: timeframe,
        startDate: startDate,
        endDate: endDate,
        candles: candlesData.data || [],
        candles1m:
          importPreciseData && candles1mData ? candles1mData.data || [] : null,
        hasPreciseData:
          importPreciseData &&
          candles1mData &&
          candles1mData.data &&
          candles1mData.data.length > 0,
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
      <h2>Import Data</h2>

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

        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importPreciseData}
              onChange={(e) => setImportPreciseData(e.target.checked)}
            />
            Import 1-Minute Data (Recommended for Precision)
          </label>
          <div className="info-message">
            The Hurst strategy works best with 1-minute data for precise
            entry/exit signals detection.
          </div>
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
        {isImporting ? "Importing..." : "Import Data"}
      </button>

      {status && <div className="status-message">{status}</div>}
    </div>
  );
};

export default DataImporter;

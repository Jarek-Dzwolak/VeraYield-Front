import React, { useState } from "react";
import "./DataImporter.css";

const DataImporter = ({ onDataImport }) => {
  const [selectedSource, setSelectedSource] = useState("sample");
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1d");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-06-30");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = () => {
    setIsImporting(true);

    // Symulacja importu danych
    setTimeout(() => {
      const importedData = {
        source: selectedSource,
        pair: selectedPair,
        timeframe: timeframe,
        startDate: startDate,
        endDate: endDate,
        candles: generateSampleCandles(),
      };

      onDataImport(importedData);
      setIsImporting(false);
    }, 1500);
  };

  const generateSampleCandles = () => {
    const candles = [];
    let currentPrice = 40000 + Math.random() * 5000;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const interval =
      timeframe === "1d"
        ? 86400000
        : timeframe === "4h"
        ? 14400000
        : timeframe === "1h"
        ? 3600000
        : 900000;

    for (let time = start.getTime(); time <= end.getTime(); time += interval) {
      const volatility = currentPrice * 0.02;
      const open = currentPrice;
      const high = open + volatility * Math.random();
      const low = open - volatility * Math.random();
      const close = (open + high + low + high + low) / 5; // Biased toward high-low average
      const volume = 10 + Math.random() * 90;

      candles.push({
        timestamp: new Date(time).toISOString(),
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
    }

    return candles;
  };

  return (
    <div className="data-importer card">
      <h2>Import Data</h2>

      <div className="import-options">
        <div className="option-group">
          <label>Data Source</label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            <option value="sample">Sample Data</option>
            <option value="binance">Binance</option>
            <option value="coinbase">Coinbase</option>
            <option value="custom">Custom CSV</option>
          </select>
        </div>

        <div className="option-group">
          <label>Trading Pair</label>
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
          >
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="SOL/USDT">SOL/USDT</option>
            <option value="ADA/USDT">ADA/USDT</option>
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

        {selectedSource === "custom" && (
          <div className="option-group">
            <label>Upload CSV</label>
            <input type="file" accept=".csv" />
          </div>
        )}
      </div>

      <button
        className="import-button"
        onClick={handleImport}
        disabled={isImporting}
      >
        {isImporting ? "Importing..." : "Import Data"}
      </button>
    </div>
  );
};

export default DataImporter;

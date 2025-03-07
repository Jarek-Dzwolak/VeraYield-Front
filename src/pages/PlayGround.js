import React, { useState } from "react";
import StrategyTester from "../components/playground/StrategyTester";
import DataImporter from "../components/playground/DataImporter";
import CandleDataViewer from "../components/playground/CandleDataViewer";
import StrategySelector from "../components/playground/StrategySelector";
import "./PlayGround.css";

const PlayGround = () => {
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const handleStrategySelect = (strategy) => {
    setSelectedStrategy(strategy);
  };

  const handleDataImport = (data) => {
    setIsDataLoading(true);
    // Małe opóźnienie by pokazać stan ładowania
    setTimeout(() => {
      setDataSource(data);
      setIsDataLoading(false);
    }, 500);
  };

  const handleRunTest = () => {
    if (!selectedStrategy || !dataSource) return;

    setIsRunning(true);

    // Symulacja obliczeń - tu byłoby faktyczne testowanie strategii
    setTimeout(() => {
      // Przykładowe wyniki
      const results = {
        profitLoss: 1876.42,
        winRate: 68.5,
        tradesCount: 42,
        averageProfit: 44.68,
        maxDrawdown: 432.18,
        sharpeRatio: 1.32,
        trades: generateSampleTrades(),
      };

      setTestResults(results);
      setIsRunning(false);
    }, 2000);
  };

  const generateSampleTrades = () => {
    const trades = [];
    let balance = 10000;
    const startDate = new Date(2023, 0, 1);

    for (let i = 0; i < 42; i++) {
      const isWin = Math.random() > 0.3;
      const amount = Math.random() * 0.2 + 0.1; // 0.1 to 0.3 BTC
      const entryPrice = 40000 + Math.random() * 10000;
      const exitPrice = isWin
        ? entryPrice * (1 + Math.random() * 0.05)
        : entryPrice * (1 - Math.random() * 0.03);
      const profit = amount * (exitPrice - entryPrice);
      balance += profit;

      const entryDate = new Date(startDate);
      entryDate.setHours(startDate.getHours() + i * 8);

      const exitDate = new Date(entryDate);
      exitDate.setHours(
        entryDate.getHours() + Math.floor(Math.random() * 12) + 1
      );

      trades.push({
        id: i + 1,
        type: Math.random() > 0.5 ? "buy" : "sell",
        pair: "BTC/USDT",
        amount: amount.toFixed(4),
        entryPrice: entryPrice.toFixed(2),
        exitPrice: exitPrice.toFixed(2),
        profit: profit.toFixed(2),
        entryDate: entryDate.toISOString(),
        exitDate: exitDate.toISOString(),
        balance: balance.toFixed(2),
      });
    }

    return trades;
  };

  // Decyduj, który widok pokazać w panelu wyników
  const renderResultsPanel = () => {
    if (dataSource && !testResults) {
      // Jeśli mamy dane z importu, ale jeszcze nie uruchomiono testu, pokaż CandleDataViewer
      return <CandleDataViewer data={dataSource} isLoading={isDataLoading} />;
    } else if (testResults) {
      // Jeśli mamy wyniki testu, pokaż standardowy ResultsViewer
      // Tutaj można później zaimplementować komponent ResultsViewer
      return <div className="card">Wyniki testu strategii</div>;
    } else {
      // Domyślnie pokaż pusty CandleDataViewer
      return <CandleDataViewer data={null} isLoading={isDataLoading} />;
    }
  };

  return (
    <div className="playground-container">
      <div className="playground-header">
        <h1>Strategy PlayGround</h1>
        <p>
          Test your trading strategies on historical data and analyze
          performance
        </p>
      </div>

      <div className="playground-grid">
        <div className="setup-panel">
          <StrategySelector
            onStrategySelect={handleStrategySelect}
            selectedStrategy={selectedStrategy}
          />
          <DataImporter onDataImport={handleDataImport} />
          <StrategyTester
            selectedStrategy={selectedStrategy}
            dataSource={dataSource}
            onRunTest={handleRunTest}
            isRunning={isRunning}
          />
        </div>

        <div className="results-panel">{renderResultsPanel()}</div>
      </div>
    </div>
  );
};

export default PlayGround;

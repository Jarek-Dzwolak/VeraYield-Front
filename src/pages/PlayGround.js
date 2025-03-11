import React, { useState } from "react";
import axios from "axios";
import StrategyTester from "../components/playground/StrategyTester";
import DataImporter from "../components/playground/DataImporter";
import CandleDataViewer from "../components/playground/CandleDataViewer";
import StrategySelector from "../components/playground/StrategySelector";
import BacktestResults from "../components/playground/BacktestResults";
import "./PlayGround.css";

const PlayGround = () => {
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hurstData, setHurstData] = useState(null);

  const handleStrategySelect = (strategy) => {
    setSelectedStrategy(strategy);
  };

  const handleDataImport = (data) => {
    setIsDataLoading(true);
    setBacktestResults(null); // Reset wyników gdy importujemy nowe dane
    setHurstData(null);

    // Małe opóźnienie by pokazać stan ładowania
    setTimeout(() => {
      setDataSource(data);
      setIsDataLoading(false);
    }, 500);
  };

  const handleRunTest = async (testOptions) => {
    if (!selectedStrategy || !dataSource) return;

    setIsRunning(true);
    setBacktestResults(null);

    try {
      // Zmieniony endpoint na /api/v1/strategy/backtest
      const response = await axios.post(
        "http://localhost:5000/api/v1/backtest",
        {
          strategy: "hurst", // Zawsze używamy strategii Hurst
          symbol: dataSource.pair.replace(/[^A-Z]/g, "").replace("USDT", ""),
          vsCurrency: "USDT",
          interval: dataSource.timeframe,
          startDate: dataSource.startDate,
          endDate: dataSource.endDate,
          parameters: {
            ...selectedStrategy.parameters,
            initialCapital: testOptions.initialCapital,
            usePreciseData: dataSource.hasPreciseData, // Używaj danych minutowych jeśli są dostępne
          },
        }
      );

      if (response.data.status === "success") {
        setBacktestResults(response.data.results);

        // Jeśli mamy dane wskaźnika Hursta, ustawiamy je
        if (
          response.data.results.indicators &&
          response.data.results.indicators.hurst
        ) {
          setHurstData(response.data.results.indicators.hurst);
        }
      }
    } catch (error) {
      console.error("Błąd podczas wykonywania backtestingu:", error);
      alert(
        "Nie udało się wykonać backtestingu. Sprawdź konsolę po więcej informacji."
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Decyduj, który widok pokazać w panelu wyników
  const renderResultsPanel = () => {
    if (dataSource && !backtestResults) {
      // Jeśli mamy dane z importu, ale jeszcze nie uruchomiono testu, pokaż CandleDataViewer
      return (
        <CandleDataViewer
          data={dataSource}
          isLoading={isDataLoading}
          hurstData={hurstData}
        />
      );
    } else if (backtestResults) {
      // Jeśli mamy wyniki testu, pokazujemy oba komponenty - dane i wyniki
      return (
        <div className="results-container">
          <CandleDataViewer
            data={dataSource}
            isLoading={isDataLoading}
            hurstData={hurstData}
          />
          <BacktestResults
            results={backtestResults}
            strategyType="hurst" // Zawsze przekazujemy "hurst"
          />
        </div>
      );
    } else {
      // Domyślnie pokaż pusty CandleDataViewer
      return <CandleDataViewer data={null} isLoading={isDataLoading} />;
    }
  };

  return (
    <div className="playground-container">
      <div className="playground-header">
        <h1>Hurst Strategy Tester</h1>
        <p>
          Test the Hurst Channel strategy on historical data and analyze
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

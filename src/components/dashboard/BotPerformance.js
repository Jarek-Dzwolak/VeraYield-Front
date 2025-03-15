// src/components/dashboard/BotPerformance.js
import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import "./BotPerformance.css";

const BotPerformance = ({
  chartData,
  isConnected,
  selectedPair,
  selectedTimeframe,
  onPairChange,
  onTimeframeChange,
}) => {
  const chartContainerRef = useRef(null);
  const [timeframe, setTimeframe] = useState(selectedTimeframe);

  // Referencje do wykresu i serii danych
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const hurstUpperRef = useRef(null);
  const hurstMiddleRef = useRef(null);
  const hurstLowerRef = useRef(null);
  const trendLineRef = useRef(null);
  const markersRef = useRef([]);

  // Statystyki
  const [stats, setStats] = useState({
    totalProfit: "+$1,276.48",
    profitPercentage: "+2.8%",
    tradesExecuted: 43,
    profitableTrades: 32,
    winRate: "74.4%",
    targetWinRate: "65%",
    avgHoldTime: "4.2h",
    maxHoldTime: "12.5h",
  });

  // Inicjalizacja wykresu
  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      // Tworzenie wykresu
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: "solid", color: "rgba(10, 14, 23, 0.4)" },
          textColor: "#d1d4dc",
        },
        grid: {
          vertLines: { color: "rgba(42, 46, 57, 0.3)" },
          horzLines: { color: "rgba(42, 46, 57, 0.3)" },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: "rgba(42, 46, 57, 0.5)",
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: "rgba(255, 215, 0, 0.5)",
            width: 1,
            style: 0,
            labelBackgroundColor: "rgba(255, 215, 0, 0.8)",
          },
          horzLine: {
            color: "rgba(255, 215, 0, 0.5)",
            width: 1,
            style: 0,
            labelBackgroundColor: "rgba(255, 215, 0, 0.8)",
          },
        },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: true,
        },
      });

      // Seria świec
      candleSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: "#4CAF50",
        downColor: "#FF5252",
        borderUpColor: "#4CAF50",
        borderDownColor: "#FF5252",
        wickUpColor: "#4CAF50",
        wickDownColor: "#FF5252",
      });

      // Linie kanału Hursta
      hurstUpperRef.current = chartRef.current.addLineSeries({
        color: "#FFD700",
        lineWidth: 2,
        lineStyle: 0,
        title: "Hurst Upper",
      });

      hurstMiddleRef.current = chartRef.current.addLineSeries({
        color: "#FFFFFF",
        lineWidth: 1,
        lineStyle: 1,
        title: "Hurst Middle",
      });

      hurstLowerRef.current = chartRef.current.addLineSeries({
        color: "#FFD700",
        lineWidth: 2,
        lineStyle: 0,
        title: "Hurst Lower",
      });

      // Linia trendu (EMA)
      trendLineRef.current = chartRef.current.addLineSeries({
        color: "#BA68C8",
        lineWidth: 2,
        lineStyle: 0,
        title: "Trend EMA",
      });

      // Obsługa zmiany rozmiaru okna
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    }
  }, []);

  // Aktualizacja danych świecowych
  useEffect(() => {
    if (
      chartData.candles &&
      chartData.candles.length > 0 &&
      candleSeriesRef.current
    ) {
      // Mapowanie danych do formatu wymaganego przez light-weight-charts
      const formattedCandles = chartData.candles.map((candle) => ({
        time: candle.openTime / 1000, // Konwersja z millisekund na sekundy
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));

      candleSeriesRef.current.setData(formattedCandles);
      chartRef.current.timeScale().fitContent();
    }
  }, [chartData.candles]);

  // Aktualizacja linii kanału Hursta
  useEffect(() => {
    if (
      chartData.hurstUpper &&
      chartData.hurstUpper.length > 0 &&
      hurstUpperRef.current
    ) {
      // Formatowanie linii Hursta
      const formattedHurstUpper = chartData.hurstUpper.map((point) => ({
        time: point.time / 1000,
        value: point.value,
      }));
      hurstUpperRef.current.setData(formattedHurstUpper);
    }

    if (
      chartData.hurstMiddle &&
      chartData.hurstMiddle.length > 0 &&
      hurstMiddleRef.current
    ) {
      const formattedHurstMiddle = chartData.hurstMiddle.map((point) => ({
        time: point.time / 1000,
        value: point.value,
      }));
      hurstMiddleRef.current.setData(formattedHurstMiddle);
    }

    if (
      chartData.hurstLower &&
      chartData.hurstLower.length > 0 &&
      hurstLowerRef.current
    ) {
      const formattedHurstLower = chartData.hurstLower.map((point) => ({
        time: point.time / 1000,
        value: point.value,
      }));
      hurstLowerRef.current.setData(formattedHurstLower);
    }
  }, [chartData.hurstUpper, chartData.hurstMiddle, chartData.hurstLower]);

  // Aktualizacja linii trendu
  useEffect(() => {
    if (
      chartData.trendLine &&
      chartData.trendLine.length > 0 &&
      trendLineRef.current
    ) {
      const formattedTrendLine = chartData.trendLine.map((point) => ({
        time: point.time / 1000,
        value: point.value,
      }));
      trendLineRef.current.setData(formattedTrendLine);
    }
  }, [chartData.trendLine]);

  // Obsługa sygnałów - dodawanie markerów
  useEffect(() => {
    if (
      chartData.signals &&
      chartData.signals.length > 0 &&
      candleSeriesRef.current
    ) {
      // Konwersja sygnałów na markery
      const markers = chartData.signals.map((signal) => {
        let marker = {
          time: signal.time / 1000, // Konwersja z millisekund na sekundy
          position: signal.type === "entry" ? "belowBar" : "aboveBar",
          color: signal.type === "entry" ? "#4CAF50" : "#FF5252",
          shape: signal.type === "entry" ? "arrowUp" : "arrowDown",
          text: signal.type.toUpperCase(),
        };
        return marker;
      });

      // Aktualizacja markerów na wykresie
      candleSeriesRef.current.setMarkers(markers);
      markersRef.current = markers;
    }
  }, [chartData.signals]);

  // Obsługa zmiany statystyk
  useEffect(() => {
    if (chartData.trades && chartData.trades.length > 0) {
      // Obliczenie statystyk na podstawie transakcji
      let totalProfit = 0;
      let profitableTrades = 0;
      let totalHoldTime = 0;
      let maxHoldTime = 0;

      chartData.trades.forEach((trade) => {
        totalProfit += trade.profit;
        if (trade.profit > 0) profitableTrades++;

        const holdTime = (trade.exitTime - trade.entryTime) / (60 * 60 * 1000); // w godzinach
        totalHoldTime += holdTime;
        if (holdTime > maxHoldTime) maxHoldTime = holdTime;
      });

      const winRate = (profitableTrades / chartData.trades.length) * 100;
      const avgHoldTime = totalHoldTime / chartData.trades.length;

      setStats({
        totalProfit: `+$${totalProfit.toFixed(2)}`,
        profitPercentage: `+${((totalProfit / 1000) * 100).toFixed(1)}%`, // Przykładowa kalkulacja
        tradesExecuted: chartData.trades.length,
        profitableTrades,
        winRate: `${winRate.toFixed(1)}%`,
        targetWinRate: "65%",
        avgHoldTime: `${avgHoldTime.toFixed(1)}h`,
        maxHoldTime: `${maxHoldTime.toFixed(1)}h`,
      });
    }
  }, [chartData.trades]);

  const handleTimeframeChange = (e) => {
    const newTimeframe = e.target.value;
    setTimeframe(newTimeframe);

    // Mapowanie wyboru z interfejsu na faktyczne interwały czasowe Binance
    const timeframeMap = {
      "1 Minute": "1m",
      "5 Minutes": "5m",
      "15 Minutes": "15m",
      "1 Hour": "1h",
      "4 Hours": "4h",
      "1 Day": "1d",
    };

    onTimeframeChange(timeframeMap[newTimeframe] || "15m");
  };

  // Komponent pary handlowej z listą rozwijaną
  const PairSelector = () => (
    <select
      className="pair-selector"
      value={selectedPair}
      onChange={(e) => onPairChange(e.target.value)}
    >
      <option value="BTCUSDT">BTC/USDT</option>
      <option value="ETHUSDT">ETH/USDT</option>
      <option value="SOLUSDT">SOL/USDT</option>
      <option value="ADAUSDT">ADA/USDT</option>
    </select>
  );

  return (
    <div className="bot-performance card">
      <div className="card-header">
        <h2>Bot Performance</h2>
        <div className="chart-controls">
          <PairSelector />
          <select
            className="time-selector"
            value={timeframe}
            onChange={handleTimeframeChange}
          >
            <option>1 Minute</option>
            <option>5 Minutes</option>
            <option>15 Minutes</option>
            <option>1 Hour</option>
            <option>4 Hours</option>
            <option>1 Day</option>
          </select>
        </div>
      </div>

      <div className="performance-grid">
        <div className="performance-stat">
          <span className="stat-label">Total Profit</span>
          <span className="stat-value profit">{stats.totalProfit}</span>
          <span className="stat-percentage positive">
            {stats.profitPercentage}
          </span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">Trades Executed</span>
          <span className="stat-value">{stats.tradesExecuted}</span>
          <span className="stat-info">{stats.profitableTrades} profitable</span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">Win Rate</span>
          <span className="stat-value">{stats.winRate}</span>
          <span className="stat-info">Target: {stats.targetWinRate}</span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">Avg. Hold Time</span>
          <span className="stat-value">{stats.avgHoldTime}</span>
          <span className="stat-info">Max: {stats.maxHoldTime}</span>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <span className="chart-title">
            Hurst Channel Strategy - {selectedPair} ({selectedTimeframe})
          </span>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color upper-band"></span>
              <span>Upper Band</span>
            </div>
            <div className="legend-item">
              <span className="legend-color middle-band"></span>
              <span>Middle Line</span>
            </div>
            <div className="legend-item">
              <span className="legend-color lower-band"></span>
              <span>Lower Band</span>
            </div>
            <div className="legend-item">
              <span className="legend-color trend-line"></span>
              <span>Trend EMA</span>
            </div>
          </div>
        </div>

        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">WebSocket Connected</span>
          ) : (
            <span className="status-disconnected">WebSocket Disconnected</span>
          )}
        </div>

        <div className="chart-container" ref={chartContainerRef}></div>

        <div className="signals-legend">
          <div className="signal-info entry">
            <span className="signal-icon">▲</span>
            <span>Entry Signal</span>
          </div>
          <div className="signal-info exit">
            <span className="signal-icon">▼</span>
            <span>Exit Signal</span>
          </div>
        </div>
      </div>

      <div className="recent-signals">
        <h3>Recent Signals</h3>
        <div className="signals-list">
          {chartData.signals && chartData.signals.length > 0 ? (
            chartData.signals.slice(0, 5).map((signal, index) => (
              <div key={index} className={`signal-item ${signal.type}`}>
                <span className="signal-time">
                  {new Date(signal.time).toLocaleTimeString()}
                </span>
                <span className="signal-type">{signal.type.toUpperCase()}</span>
                <span className="signal-price">${signal.price.toFixed(2)}</span>
                {signal.message && (
                  <span className="signal-message">{signal.message}</span>
                )}
              </div>
            ))
          ) : (
            <div className="no-signals">No recent signals</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotPerformance;

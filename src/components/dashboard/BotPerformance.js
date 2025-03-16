// src/components/dashboard/BotPerformance.js
import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import "./BotPerformance.css";

const BotPerformance = ({
  chartData,
  isConnected,
  selectedPair,
  selectedTimeframe,
}) => {
  const chartContainerRef = useRef(null);

  // Referencje do wykresu i serii danych
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const priceLineRef = useRef(null);

  // Uproszczone statystyki
  const [stats, setStats] = useState({
    currentPrice: "0.00",
    highPrice: "0.00",
    lowPrice: "0.00",
    priceChange: "0.00%",
    lastUpdate: "Never",
  });

  // Inicjalizacja wykresu
  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      console.log("Inicjalizacja wykresu świecowego");

      try {
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
      } catch (error) {
        console.error("Błąd podczas inicjalizacji wykresu:", error);
      }
    }
  }, []);

  // Aktualizacja danych świecowych
  useEffect(() => {
    if (chartData.candles?.length > 0 && candleSeriesRef.current) {
      try {
        console.log(
          `Aktualizacja wykresu - liczba świec: ${chartData.candles.length}`
        );

        // Mapowanie danych do formatu wymaganego przez lightweight-charts
        const formattedCandles = chartData.candles
          .filter(
            (candle) =>
              candle &&
              candle.openTime &&
              candle.open !== undefined &&
              candle.high !== undefined &&
              candle.low !== undefined &&
              candle.close !== undefined
          )
          .map((candle) => ({
            time: Math.floor(candle.openTime / 1000), // Konwersja z millisekund na sekundy
            open:
              typeof candle.open === "string"
                ? parseFloat(candle.open)
                : candle.open,
            high:
              typeof candle.high === "string"
                ? parseFloat(candle.high)
                : candle.high,
            low:
              typeof candle.low === "string"
                ? parseFloat(candle.low)
                : candle.low,
            close:
              typeof candle.close === "string"
                ? parseFloat(candle.close)
                : candle.close,
          }));

        // Upewnij się, że dane są posortowane według czasu
        formattedCandles.sort((a, b) => a.time - b.time);

        if (formattedCandles.length > 0) {
          // Ustaw dane świecowe
          candleSeriesRef.current.setData(formattedCandles);

          // Ustaw aktualną cenę
          if (chartData.price) {
            // Usuń starą linię ceny, jeśli istnieje
            if (priceLineRef.current) {
              candleSeriesRef.current.removePriceLine(priceLineRef.current);
            }

            // Dodaj nową linię ceny
            priceLineRef.current = candleSeriesRef.current.createPriceLine({
              price: chartData.price,
              color: "#2196F3",
              lineWidth: 2,
              lineStyle: 0,
              axisLabelVisible: true,
              title: "Current Price",
            });
          }

          // Dopasuj skalę czasową, aby zobaczyć wszystkie dane
          chartRef.current.timeScale().fitContent();

          // Aktualizuj statystyki
          const latestCandle = formattedCandles[formattedCandles.length - 1];
          const firstCandle = formattedCandles[0];
          const highPrice = Math.max(...formattedCandles.map((c) => c.high));
          const lowPrice = Math.min(...formattedCandles.map((c) => c.low));
          const priceChange =
            ((latestCandle.close - firstCandle.open) / firstCandle.open) * 100;

          setStats({
            currentPrice: chartData.price
              ? `$${chartData.price.toFixed(2)}`
              : `$${latestCandle.close.toFixed(2)}`,
            highPrice: `$${highPrice.toFixed(2)}`,
            lowPrice: `$${lowPrice.toFixed(2)}`,
            priceChange: `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(
              2
            )}%`,
            lastUpdate: chartData.lastUpdate
              ? new Date(chartData.lastUpdate).toLocaleTimeString()
              : "Unknown",
          });
        }
      } catch (error) {
        console.error("Błąd podczas aktualizacji wykresu:", error);
      }
    }
  }, [chartData.candles, chartData.price, chartData.lastUpdate]);

  return (
    <div className="bot-performance card">
      <div className="card-header">
        <h2>BTC/USDT Performance</h2>
        <div className="pair-info">
          <span className="pair-name">{selectedPair}</span>
          <span className="timeframe">{selectedTimeframe}</span>
        </div>
      </div>

      <div className="performance-grid">
        <div className="performance-stat">
          <span className="stat-label">Current Price</span>
          <span className="stat-value">{stats.currentPrice}</span>
          <span
            className={`stat-percentage ${
              parseFloat(stats.priceChange) >= 0 ? "positive" : "negative"
            }`}
          >
            {stats.priceChange}
          </span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">High / Low</span>
          <span className="stat-value">
            {stats.highPrice} / {stats.lowPrice}
          </span>
          <span className="stat-info">Period: 15m</span>
        </div>

        <div className="performance-stat">
          <span className="stat-label">Last Update</span>
          <span className="stat-value">{stats.lastUpdate}</span>
          <span className="stat-info">
            {isConnected ? "Live Data" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="chart-section">
        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">WebSocket Connected</span>
          ) : (
            <span className="status-disconnected">WebSocket Disconnected</span>
          )}
        </div>

        <div className="chart-container" ref={chartContainerRef}></div>
      </div>
    </div>
  );
};

export default BotPerformance;

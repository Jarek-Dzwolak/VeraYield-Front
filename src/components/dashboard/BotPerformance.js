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

  // Referencje do serii linii dla wskaźników
  const lowerBandSeriesRef = useRef(null);
  const upperBandSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);

  // Referencje do inicjalizacji band
  const upperBandInitialized = useRef(false);
  const lowerBandInitialized = useRef(false);
  const emaInitialized = useRef(false);
  const updateIntervalRef = useRef(null);

  // Referencje do aktualizacji w czasie rzeczywistym
  const priceUpdateRef = useRef(0);
  const animationFrameRef = useRef(null);
  const lastPriceRef = useRef(null);

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

        // Dodaj serie dla kanału Hursta (linie)
        upperBandSeriesRef.current = chartRef.current.addLineSeries({
          color: "rgba(255, 70, 70, 0.8)",
          lineWidth: 1,
          title: "Upper Band",
        });

        lowerBandSeriesRef.current = chartRef.current.addLineSeries({
          color: "rgba(76, 175, 80, 0.8)",
          lineWidth: 1,
          title: "Lower Band",
        });

        // Dodaj serię dla EMA
        emaSeriesRef.current = chartRef.current.addLineSeries({
          color: "rgba(33, 150, 243, 0.8)",
          lineWidth: 2,
          title: "EMA",
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

        // Dodaj interwał wymuszający aktualizację co 1 sekundę
        updateIntervalRef.current = setInterval(() => {
          if (chartRef.current && chartContainerRef.current) {
            // Wymuś przerysowanie wykresu
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        }, 1000);

        return () => {
          window.removeEventListener("resize", handleResize);
          if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
          }
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
          }
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        };
      } catch (error) {
        console.error("Błąd podczas inicjalizacji wykresu:", error);
      }
    }
  }, []);

  // Aktualizacja danych świecowych
  useEffect(() => {
    if (
      chartData.candles?.length > 0 &&
      candleSeriesRef.current &&
      chartRef.current
    ) {
      try {
        console.log(
          `Aktualizacja wykresu - liczba świec: ${chartData.candles.length}`
        );
        console.log("LastUpdate:", chartData.lastUpdate);

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
          // Rozdziel dane między świece historyczne i bieżącą świecę
          const historicalCandles = formattedCandles.slice(0, -1);
          const currentCandle = formattedCandles[formattedCandles.length - 1];

          // Aktualizuj dane historyczne tylko gdy są nowe świece
          if (historicalCandles.length > 0) {
            candleSeriesRef.current.setData(historicalCandles);
          }

          // Aktualizuj bieżącą świecę
          candleSeriesRef.current.update(currentCandle);

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

        // Dodaj aktualizację kanału Hursta, jeśli dostępny
        if (
          chartData.hurstChannel &&
          upperBandSeriesRef.current &&
          lowerBandSeriesRef.current
        ) {
          // Pobierz aktualny timestamp
          const timestamp = formattedCandles[formattedCandles.length - 1].time;

          // Przy pierwszej aktualizacji, inicjalizuj linie z kilkoma punktami historycznymi
          if (!upperBandInitialized.current) {
            const historyPoints = [];
            // Dodaj 5 ostatnich punktów z tą samą wartością, aby linia nie zaczynała się nagle
            for (
              let i = Math.max(0, formattedCandles.length - 5);
              i < formattedCandles.length;
              i++
            ) {
              historyPoints.push({
                time: formattedCandles[i].time,
                value: chartData.hurstChannel.upperBand,
              });
            }
            upperBandSeriesRef.current.setData(historyPoints);
            upperBandInitialized.current = true;
          } else {
            // Aktualizuj tylko ostatni punkt
            upperBandSeriesRef.current.update({
              time: timestamp,
              value: chartData.hurstChannel.upperBand,
            });
          }

          // To samo dla dolnej bandy
          if (!lowerBandInitialized.current) {
            const historyPoints = [];
            for (
              let i = Math.max(0, formattedCandles.length - 5);
              i < formattedCandles.length;
              i++
            ) {
              historyPoints.push({
                time: formattedCandles[i].time,
                value: chartData.hurstChannel.lowerBand,
              });
            }
            lowerBandSeriesRef.current.setData(historyPoints);
            lowerBandInitialized.current = true;
          } else {
            lowerBandSeriesRef.current.update({
              time: timestamp,
              value: chartData.hurstChannel.lowerBand,
            });
          }

          console.log("Zaktualizowano kanał Hursta na wykresie");
        }

        // Dodaj aktualizację EMA, jeśli dostępna
        if (chartData.emaValue !== null && emaSeriesRef.current) {
          const timestamp = formattedCandles[formattedCandles.length - 1].time;

          // Przy pierwszej aktualizacji, inicjalizuj linię EMA
          if (!emaInitialized.current) {
            const historyPoints = [];
            for (
              let i = Math.max(0, formattedCandles.length - 5);
              i < formattedCandles.length;
              i++
            ) {
              historyPoints.push({
                time: formattedCandles[i].time,
                value: chartData.emaValue,
              });
            }
            emaSeriesRef.current.setData(historyPoints);
            emaInitialized.current = true;
          } else {
            // Aktualizuj tylko ostatni punkt
            emaSeriesRef.current.update({
              time: timestamp,
              value: chartData.emaValue,
            });
          }

          console.log("Zaktualizowano EMA na wykresie:", chartData.emaValue);
        }
      } catch (error) {
        console.error("Błąd podczas aktualizacji wykresu:", error);
      }
    }
  }, [chartData]);

  // UseEffect dla aktualizacji cen w czasie rzeczywistym
  useEffect(() => {
    // Funkcja do aktualizacji wykresu w pętli animacji
    const updateChartAnimation = () => {
      // Sprawdź, czy mamy aktualne dane
      if (chartRef.current && candleSeriesRef.current && chartData.price) {
        // Dodaj log aby widzieć aktualizacje ceny
        console.log(
          `Aktualizacja wykresu z ceną: ${chartData.price} (zmiana #${priceUpdateRef.current})`
        );

        // Zwiększ licznik aktualizacji
        priceUpdateRef.current++;

        // Aktualizuj linię ceny bieżącej
        if (priceLineRef.current) {
          candleSeriesRef.current.removePriceLine(priceLineRef.current);
        }

        priceLineRef.current = candleSeriesRef.current.createPriceLine({
          price: chartData.price,
          color: "#2196F3",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: `Current: ${chartData.price.toFixed(2)}`,
        });

        // Aktualizuj również bieżącą świecę
        if (chartData.candles && chartData.candles.length > 0) {
          const currentCandle = chartData.candles[chartData.candles.length - 1];

          // Upewnij się, że wszystkie wartości są liczbami
          const formattedCandle = {
            time: Math.floor(currentCandle.openTime / 1000),
            open:
              typeof currentCandle.open === "string"
                ? parseFloat(currentCandle.open)
                : currentCandle.open,
            high: Math.max(
              typeof currentCandle.high === "string"
                ? parseFloat(currentCandle.high)
                : currentCandle.high,
              chartData.price
            ),
            low: Math.min(
              typeof currentCandle.low === "string"
                ? parseFloat(currentCandle.low)
                : currentCandle.low,
              chartData.price
            ),
            close: chartData.price,
          };

          // Aktualizuj świecę
          candleSeriesRef.current.update(formattedCandle);
        }

        // Wymuszenie przerysowania wykresu
        if (chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }

        // Zapisz ostatnią cenę
        lastPriceRef.current = chartData.price;

        // Aktualizuj statystyki cenowe
        setStats((prev) => ({
          ...prev,
          currentPrice: `${chartData.price.toFixed(2)}`,
          lastUpdate: new Date().toLocaleTimeString(),
        }));
      }

      // Kontynuuj pętlę animacji
      animationFrameRef.current = requestAnimationFrame(updateChartAnimation);
    };

    // Rozpocznij pętlę animacji tylko jeśli jesteśmy połączeni
    if (isConnected) {
      animationFrameRef.current = requestAnimationFrame(updateChartAnimation);
    }

    // Czyszczenie po odmontowaniu komponentu
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isConnected, chartData.price]); // Usunięto zależność od chartData.candles, dodano tylko chartData.price

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

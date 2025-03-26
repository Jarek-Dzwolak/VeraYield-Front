import React, { useState, useEffect, useRef } from "react";
import "./TechnicalAnalysisChart.css";

const TechnicalAnalysisChart = ({ instance, isActive, onToggle }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [chartData, setChartData] = useState(null);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [transactions, setTransactions] = useState([]);

  // Pobieranie parametrów z instancji
  const getInstanceParams = () => {
    if (!instance || !instance.strategy || !instance.strategy.parameters) {
      return {
        symbol: "BTCUSDT",
        hurst: {
          periods: 25,
          upperDeviationFactor: 2.0,
          lowerDeviationFactor: 2.0,
          interval: "15m",
        },
        ema: {
          periods: 30,
          interval: "1h",
        },
      };
    }

    return {
      symbol: instance.symbol || "BTCUSDT",
      hurst: instance.strategy.parameters.hurst || {
        periods: 25,
        upperDeviationFactor: 2.0,
        lowerDeviationFactor: 2.0,
        interval: "15m",
      },
      ema: instance.strategy.parameters.ema || {
        periods: 30,
        interval: "1h",
      },
    };
  };

  // Pobieranie danych świecowych
  // Pobieranie danych świecowych
  const fetchCandleData = async (symbol, interval) => {
    try {
      setLoadingStatus(`Pobieranie danych ${interval} dla ${symbol}...`);

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token available");
        throw new Error("Brak tokenu autoryzacyjnego");
      }

      // Ustawiam dokładnie 4 pełne dni wstecz
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 4);
      startDate.setHours(0, 0, 0, 0); // Ustawiam na początek dnia

      // Ustawiam wyższy limit, żeby na pewno pobrać wszystkie dane
      const url = `/api/v1/market/klines/${symbol}/${interval}?startTime=${startDate.getTime()}&endTime=${endDate.getTime()}&limit=5000`;
      console.log(
        `Pobieranie danych dla zakresu: ${new Date(
          startDate
        ).toLocaleString()} - ${new Date(endDate).toLocaleString()}`
      );
      console.log(`Fetching ${interval} data from:`, url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `HTTP error ${response.status} when fetching ${interval} data`
        );
        throw new Error(
          `Błąd HTTP ${response.status} podczas pobierania danych ${interval}`
        );
      }

      const data = await response.json();

      // Sprawdź strukturę odpowiedzi
      if (!data) {
        console.error(`Empty response when fetching ${interval} data`);
        throw new Error(
          `Pusta odpowiedź podczas pobierania danych ${interval}`
        );
      }

      console.log(`${interval} data response:`, data);

      // Przygotuj dane w odpowiednim formacie
      const candles = data.candles || (Array.isArray(data) ? data : []);

      if (candles.length === 0) {
        console.error(`No candles found in ${interval} data`);
        throw new Error(`Brak świec w danych ${interval}`);
      }

      const formattedCandles = candles.map((candle) => ({
        time: Math.floor(new Date(candle.openTime).getTime() / 1000),
        jsTime: new Date(candle.openTime).getTime(), // Czas w formacie JS (dla łatwiejszego formatowania)
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
      }));

      console.log(
        `Processed ${formattedCandles.length} candles for ${interval}`
      );
      setLoadingStatus(
        `Pobrano ${formattedCandles.length} świec dla ${interval}`
      );

      return formattedCandles;
    } catch (err) {
      console.error(`Error fetching ${interval} data:`, err);
      setLoadingStatus(`Błąd: ${err.message}`);
      throw err;
    }
  };

  // Pobieranie transakcji dla instancji - POPRAWIONE
  const fetchTransactionsForInstance = async (instanceId) => {
    try {
      setLoadingStatus("Pobieranie historii transakcji...");

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token available");
        throw new Error("Brak tokenu autoryzacyjnego");
      }

      // Poprawny endpoint na podstawie dokumentacji
      const url = `/api/v1/signals/instance/${instanceId}`;
      console.log(`Fetching signals from:`, url);

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.warn(`HTTP error ${response.status} when fetching signals`);
          // Jeśli nie udało się pobrać - wygeneruj testowe dane
          return generateTestTransactions();
        }

        const signals = await response.json();

        if (!signals || !Array.isArray(signals)) {
          console.warn("Invalid signals data format");
          return generateTestTransactions();
        }

        // Przetwórz sygnały wejścia i wyjścia na transakcje
        const entrySignals = signals.filter(
          (signal) => signal.type === "entry"
        );
        const exitSignals = signals.filter((signal) => signal.type === "exit");

        // Mapuj dane do formatu używanego przez wykres
        const mappedTransactions = entrySignals.map((entry) => {
          // Znajdź odpowiadający sygnał wyjścia, jeśli istnieje
          const exit = exitSignals.find(
            (exit) => exit.entrySignalId === entry._id
          );

          return {
            id: entry._id,
            openTime: entry.timestamp,
            closeTime: exit ? exit.timestamp : null,
            type: entry.subType === "buy" ? "BUY" : "SELL",
            openPrice: entry.price,
            closePrice: exit ? exit.price : null,
            status: exit ? "CLOSED" : "OPEN",
            metadata: entry.metadata || {},
          };
        });

        console.log("Transactions processed from signals:", mappedTransactions);
        return mappedTransactions;
      } catch (err) {
        console.warn("Error fetching signals:", err);
        // Fallback do testowych danych
        return generateTestTransactions();
      }
    } catch (err) {
      console.error("Error in transaction processing:", err);
      setLoadingStatus(`Błąd pobierania transakcji: ${err.message}`);
      return generateTestTransactions();
    }
  };

  // Generowanie testowych danych transakcji
  const generateTestTransactions = () => {
    console.log("Generating test transactions");
    setLoadingStatus("Używanie przykładowych transakcji (brak dostępu do API)");

    // Pobierz zakres dat z aktualnych świec
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Utwórz kilka testowych transakcji w zakresie ostatnich 4 dni
    return [
      {
        id: "tx1",
        openTime: now - 3.5 * day,
        closeTime: now - 3 * day,
        type: "BUY",
        openPrice: 86200, // Bardziej realistyczne ceny BTC
        closePrice: 86800,
        status: "CLOSED",
      },
      {
        id: "tx2",
        openTime: now - 2.5 * day,
        closeTime: now - 1.8 * day,
        type: "SELL",
        openPrice: 87000,
        closePrice: 86300,
        status: "CLOSED",
      },
      {
        id: "tx3",
        openTime: now - 1.5 * day,
        closeTime: now - 0.8 * day,
        type: "BUY",
        openPrice: 85800,
        closePrice: 86600,
        status: "CLOSED",
      },
      {
        id: "tx4",
        openTime: now - 0.5 * day,
        closeTime: null,
        type: "BUY",
        openPrice: 86400,
        closePrice: null,
        status: "OPEN",
      },
    ];
  };

  // Obliczenie kanału Hursta
  const calculateHurstChannel = (data, params) => {
    if (!data || data.length < params.periods) {
      console.error("Not enough data for Hurst calculation", {
        dataLength: data?.length,
        requiredPeriods: params.periods,
      });
      setLoadingStatus(
        `Za mało danych dla kanału Hursta (dostępne: ${data?.length}, wymagane: ${params.periods})`
      );
      return { upper: [], lower: [], middle: [] };
    }

    try {
      setLoadingStatus("Obliczanie kanału Hursta...");

      // Obliczenie średniej ruchomej
      const movingAvg = [];
      for (let i = params.periods - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < params.periods; j++) {
          sum += data[i - j].close;
        }
        const avg = sum / params.periods;
        movingAvg.push({
          time: data[i].time,
          jsTime: data[i].jsTime,
          value: avg,
        });
      }

      // Obliczenie odchylenia standardowego
      const deviations = [];
      for (let i = params.periods - 1; i < data.length; i++) {
        let sumSquares = 0;
        for (let j = 0; j < params.periods; j++) {
          const diff =
            data[i - j].close - movingAvg[i - (params.periods - 1)].value;
          sumSquares += diff * diff;
        }
        const stdDev = Math.sqrt(sumSquares / params.periods);
        deviations.push({
          time: data[i].time,
          jsTime: data[i].jsTime,
          value: stdDev,
        });
      }

      // Tworzenie górnej i dolnej bandy
      const upper = movingAvg.map((point, index) => ({
        time: point.time,
        jsTime: point.jsTime,
        value:
          point.value + deviations[index].value * params.upperDeviationFactor,
      }));

      const lower = movingAvg.map((point, index) => ({
        time: point.time,
        jsTime: point.jsTime,
        value:
          point.value - deviations[index].value * params.lowerDeviationFactor,
      }));

      console.log("Hurst channel calculated successfully", {
        upperPoints: upper.length,
        lowerPoints: lower.length,
        middlePoints: movingAvg.length,
      });

      setLoadingStatus("Kanał Hursta obliczony pomyślnie");

      return { upper, lower, middle: movingAvg };
    } catch (err) {
      console.error("Error calculating Hurst channel:", err);
      setLoadingStatus(`Błąd obliczania kanału Hursta: ${err.message}`);
      return { upper: [], lower: [], middle: [] };
    }
  };

  // Obliczenie EMA
  const calculateEMA = (data, periods) => {
    if (!data || data.length < periods) {
      console.error("Not enough data for EMA calculation", {
        dataLength: data?.length,
        requiredPeriods: periods,
      });
      setLoadingStatus(
        `Za mało danych dla EMA (dostępne: ${data?.length}, wymagane: ${periods})`
      );
      return [];
    }

    try {
      setLoadingStatus("Obliczanie EMA...");

      const k = 2 / (periods + 1);
      const emaResults = [];

      // Pierwsza wartość EMA to średnia prosta
      let sum = 0;
      for (let i = 0; i < periods; i++) {
        sum += data[i].close;
      }
      const firstEMA = sum / periods;
      emaResults.push({
        time: data[periods - 1].time,
        jsTime: data[periods - 1].jsTime,
        value: firstEMA,
      });

      // Obliczanie kolejnych EMA
      for (let i = periods; i < data.length; i++) {
        const currentEMA =
          data[i].close * k + emaResults[emaResults.length - 1].value * (1 - k);
        emaResults.push({
          time: data[i].time,
          jsTime: data[i].jsTime,
          value: currentEMA,
        });
      }

      console.log("EMA calculated successfully", { points: emaResults.length });
      setLoadingStatus("EMA obliczone pomyślnie");

      return emaResults;
    } catch (err) {
      console.error("Error calculating EMA:", err);
      setLoadingStatus(`Błąd obliczania EMA: ${err.message}`);
      return [];
    }
  };

  // Funkcja formatująca datę
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getDate().toString().padStart(2, "0")}.${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // Funkcja formatująca cenę
  const formatPrice = (price) => {
    if (!price) return "N/A";
    // Formatuj cenę z odpowiednią liczbą miejsc po przecinku
    if (price > 1000) {
      return price.toFixed(2);
    } else if (price > 100) {
      return price.toFixed(3);
    } else {
      return price.toFixed(4);
    }
  };

  // Znajdź rzeczywisty zakres cen dla lepszego skalowania
  const findActualPriceRange = (data, hurstChannel, emaData, txData) => {
    if (!data || data.length === 0) return { min: 0, max: 100 };

    // Użyj aktualnej ceny jako punktu odniesienia
    const lastPrice = data[data.length - 1].close;

    // Ustaw zakres jako +/- 1% aktualnej ceny
    const range = lastPrice * 0.01;
    let minPrice = lastPrice - range;
    let maxPrice = lastPrice + range;

    // Sprawdź, czy kanały Hursta mieszczą się w tym zakresie
    // Jeśli nie, delikatnie rozszerz zakres
    if (hurstChannel) {
      // Weź tylko ostatnie 20% punktów dla aktualnego widoku
      const lastPointsCount = Math.max(20, Math.floor(data.length * 0.2));

      if (hurstChannel.upper && hurstChannel.upper.length > 0) {
        const recentUpper = hurstChannel.upper.slice(-lastPointsCount);
        const maxUpper = Math.max(...recentUpper.map((p) => p.value));
        if (maxUpper > maxPrice) {
          maxPrice = maxUpper;
        }
      }

      if (hurstChannel.lower && hurstChannel.lower.length > 0) {
        const recentLower = hurstChannel.lower.slice(-lastPointsCount);
        const minLower = Math.min(...recentLower.map((p) => p.value));
        if (minLower < minPrice) {
          minPrice = minLower;
        }
      }
    }

    // Zaokrągl dla lepszej czytelności - do setek dla BTC
    if (lastPrice > 1000) {
      minPrice = Math.floor(minPrice / 100) * 100;
      maxPrice = Math.ceil(maxPrice / 100) * 100;
    } else {
      // Dla innych aktywów używaj mniejszych jednostek
      minPrice = Math.floor(minPrice * 20) / 20;
      maxPrice = Math.ceil(maxPrice * 20) / 20;
    }

    console.log(
      `Skalowanie osi Y: ${minPrice} - ${maxPrice} (aktualna cena: ${lastPrice})`
    );

    return { min: minPrice, max: maxPrice };
  };

  // Funkcja inicjalizująca rozbudowany wykres Canvas
  const drawEnhancedChart = (
    container,
    candleData,
    hurstChannel,
    emaData,
    txData
  ) => {
    try {
      setLoadingStatus("Rysowanie wykresu...");

      // Sprawdzanie pełnego zakresu danych
      if (candleData && candleData.length > 0) {
        const firstDate = new Date(candleData[0].jsTime);
        const lastDate = new Date(candleData[candleData.length - 1].jsTime);
        const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

        console.log(
          `Dane obejmują ${daysDiff.toFixed(
            2
          )} dni: ${firstDate.toLocaleString()} - ${lastDate.toLocaleString()}`
        );
        console.log(`Liczba świec: ${candleData.length}`);
      }

      // Wyczyść kontener
      container.innerHTML = "";

      // Utwórz canvas
      const canvas = document.createElement("canvas");
      canvas.width = container.clientWidth;
      canvas.height = 500; // Wyższy wykres
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");

      // Sprawdź czy mamy dane do rysowania
      if (!candleData || candleData.length === 0) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Brak danych do wyświetlenia", 20, 50);
        return;
      }

      // Stałe dla layoutu
      const marginTop = 40;
      const marginBottom = 60;
      const marginLeft = 80;
      const marginRight = 160; // Większy margines dla legendy po prawej

      const chartWidth = canvas.width - marginLeft - marginRight;
      const chartHeight = canvas.height - marginTop - marginBottom;

      // Znajdź min i max wartości dla skalowania - tylko rzeczywisty zakres danych
      const priceRange = findActualPriceRange(
        candleData,
        hurstChannel,
        emaData,
        txData
      );
      const minPrice = priceRange.min;
      const maxPrice = priceRange.max;

      // Ustaw czarny background dla całego obszaru
      ctx.fillStyle = "#1E1E1E"; // Ciemny tło (szare)
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dodaj obszar wykresu
      ctx.fillStyle = "#000000"; // Czarne tło wykresu
      ctx.fillRect(marginLeft, marginTop, chartWidth, chartHeight);

      // Funkcje skalujące
      const scaleX = (time) => {
        const minTime = candleData[0].jsTime;
        const maxTime = candleData[candleData.length - 1].jsTime;
        return (
          marginLeft + ((time - minTime) / (maxTime - minTime)) * chartWidth
        );
      };

      const scaleY = (price) => {
        return (
          marginTop +
          chartHeight -
          ((price - minPrice) / (maxPrice - minPrice)) * chartHeight
        );
      };

      // Rysuj siatkę i osie
      ctx.strokeStyle = "#333333"; // Kolor siatki
      ctx.lineWidth = 0.5;

      // Poziome linie siatki i etykiety osi Y (ceny)
      const yGridCount = 10;
      for (let i = 0; i <= yGridCount; i++) {
        const y = marginTop + (chartHeight / yGridCount) * i;
        const price = maxPrice - (i / yGridCount) * (maxPrice - minPrice);

        // Linia siatki
        ctx.beginPath();
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(marginLeft + chartWidth, y);
        ctx.stroke();

        // Etykieta ceny
        ctx.font = "10px Arial";
        ctx.fillStyle = "#AAAAAA";
        ctx.textAlign = "right";
        ctx.fillText(formatPrice(price), marginLeft - 5, y + 3);
      }

      // Pionowe linie siatki i etykiety osi X (daty)
      const xGridCount = 8; // Więcej podziałek czasowych
      const minTime = candleData[0].jsTime;
      const maxTime = candleData[candleData.length - 1].jsTime;

      for (let i = 0; i <= xGridCount; i++) {
        const x = marginLeft + (chartWidth / xGridCount) * i;
        const time = minTime + (i / xGridCount) * (maxTime - minTime);

        // Linia siatki
        ctx.beginPath();
        ctx.moveTo(x, marginTop);
        ctx.lineTo(x, marginTop + chartHeight);
        ctx.stroke();

        // Etykieta daty
        ctx.save();
        ctx.translate(x, marginTop + chartHeight + 15);
        ctx.rotate(-Math.PI / 4); // Obróć etykiety dla lepszej czytelności
        ctx.font = "10px Arial";
        ctx.fillStyle = "#AAAAAA";
        ctx.textAlign = "right";
        ctx.fillText(formatDate(time), 0, 0);
        ctx.restore();
      }

      // Rysuj tytuł wykresu
      const params = getInstanceParams();
      ctx.font = "12px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(
        `${params.symbol} - Kanał Hursta: ${params.hurst.interval} (${params.hurst.periods}) - EMA: ${params.ema.interval} (${params.ema.periods})`,
        canvas.width / 2 - marginRight / 2,
        20
      );

      // Rysuj legendę - całkowicie po prawej stronie wykresu
      const legendX = marginLeft + chartWidth + 20;
      const legendY = marginTop + 20;

      ctx.font = "11px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.fillText("Legenda:", legendX, legendY);

      // Kanał Hursta - górna banda
      ctx.strokeStyle = "rgba(76, 175, 80, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + 20);
      ctx.lineTo(legendX + 30, legendY + 20);
      ctx.stroke();
      ctx.fillText("Hurst górny", legendX + 40, legendY + 24);

      // Kanał Hursta - dolna banda
      ctx.strokeStyle = "rgba(244, 67, 54, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + 40);
      ctx.lineTo(legendX + 30, legendY + 40);
      ctx.stroke();
      ctx.fillText("Hurst dolny", legendX + 40, legendY + 44);

      // EMA
      if (emaData && emaData.length > 0) {
        ctx.strokeStyle = "rgba(33, 150, 243, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(legendX, legendY + 60);
        ctx.lineTo(legendX + 30, legendY + 60);
        ctx.stroke();
        ctx.fillText(`EMA(${params.ema.periods})`, legendX + 40, legendY + 64);
      }

      // Świece
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(legendX, legendY + 80, 15, 15);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Wzrost", legendX + 40, legendY + 94);

      ctx.fillStyle = "#F44336";
      ctx.fillRect(legendX, legendY + 100, 15, 15);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Spadek", legendX + 40, legendY + 114);

      // Transakcje
      if (txData && txData.length > 0) {
        // Symbol wejścia
        ctx.beginPath();
        ctx.moveTo(legendX, legendY + 130);
        ctx.lineTo(legendX + 15, legendY + 120);
        ctx.lineTo(legendX + 15, legendY + 140);
        ctx.closePath();
        ctx.fillStyle = "#FFEB3B"; // Żółty
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Wejście", legendX + 40, legendY + 134);

        // Symbol wyjścia
        ctx.beginPath();
        ctx.arc(legendX + 7, legendY + 155, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#FF9800"; // Pomarańczowy
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Wyjście", legendX + 40, legendY + 159);
      }

      // Rysuj kanał Hursta jeśli jest dostępny
      if (hurstChannel) {
        // Rysuj górną bandę
        if (hurstChannel.upper && hurstChannel.upper.length > 0) {
          ctx.strokeStyle = "rgba(76, 175, 80, 0.8)"; // Zielony
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]); // Przerywana linia

          ctx.beginPath();

          let firstPointDrawn = false;
          hurstChannel.upper.forEach((point) => {
            const x = scaleX(point.jsTime);
            const y = scaleY(point.value);

            if (!firstPointDrawn) {
              ctx.moveTo(x, y);
              firstPointDrawn = true;
            } else {
              ctx.lineTo(x, y);
            }
          });

          ctx.stroke();
        }

        // Rysuj dolną bandę
        if (hurstChannel.lower && hurstChannel.lower.length > 0) {
          ctx.strokeStyle = "rgba(244, 67, 54, 0.8)"; // Czerwony
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]); // Przerywana linia

          ctx.beginPath();

          let firstPointDrawn = false;
          hurstChannel.lower.forEach((point) => {
            const x = scaleX(point.jsTime);
            const y = scaleY(point.value);

            if (!firstPointDrawn) {
              ctx.moveTo(x, y);
              firstPointDrawn = true;
            } else {
              ctx.lineTo(x, y);
            }
          });

          ctx.stroke();
        }

        // Resetuj styl linii
        ctx.setLineDash([]);
      }

      // Rysuj EMA jeśli jest dostępna
      if (emaData && emaData.length > 0) {
        ctx.strokeStyle = "rgba(33, 150, 243, 0.8)"; // Niebieski
        ctx.lineWidth = 2;
        ctx.setLineDash([]); // Ciągła linia

        ctx.beginPath();

        let firstPointDrawn = false;
        emaData.forEach((point) => {
          const x = scaleX(point.jsTime);
          const y = scaleY(point.value);

          if (!firstPointDrawn) {
            ctx.moveTo(x, y);
            firstPointDrawn = true;
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();
      }

      // Rysuj świece
      const candleWidth = Math.min(
        8,
        Math.max(2, chartWidth / candleData.length / 1.5)
      );

      candleData.forEach((candle) => {
        const x = scaleX(candle.jsTime);

        const open = scaleY(candle.open);
        const close = scaleY(candle.close);
        const high = scaleY(candle.high);
        const low = scaleY(candle.low);

        // Rysuj knot
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, high);
        ctx.lineTo(x, low);
        ctx.stroke();

        // Rysuj ciało świecy
        if (candle.close > candle.open) {
          ctx.fillStyle = "#4CAF50"; // Zielony dla wzrostów
        } else {
          ctx.fillStyle = "#F44336"; // Czerwony dla spadków
        }

        const candleHeight = Math.abs(close - open);
        ctx.fillRect(
          x - candleWidth / 2,
          Math.min(open, close),
          candleWidth,
          Math.max(1, candleHeight)
        );
      });

      // Rysuj aktualną cenę
      const lastPrice = candleData[candleData.length - 1].close;
      const lastPriceY = scaleY(lastPrice);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, lastPriceY);
      ctx.lineTo(marginLeft + chartWidth, lastPriceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tekst z ostatnią ceną
      ctx.font = "12px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.fillText(
        `Cena: ${formatPrice(lastPrice)}`,
        marginLeft + chartWidth + 5,
        lastPriceY + 4
      );

      // Rysuj transakcje - POPRAWIONE (precyzyjnie na linii ceny)
      if (txData && txData.length > 0) {
        txData.forEach((tx) => {
          const openX = scaleX(tx.openTime);
          const openY = scaleY(tx.openPrice);

          // 1. Rysuj pionową linię referencyjną
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = "#FFEB3B"; // Żółty
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(openX, marginTop);
          ctx.lineTo(openX, marginTop + chartHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // 2. Rysuj marker dokładnie na linii ceny
          const markerSize = 8;
          ctx.beginPath();
          ctx.arc(openX, openY, markerSize, 0, 2 * Math.PI);
          ctx.fillStyle =
            tx.type === "BUY"
              ? "rgba(76, 175, 80, 0.8)"
              : "rgba(244, 67, 54, 0.8)";
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Dodaj etykietę ceny (nieco odsunięta)
          ctx.font = "bold 11px Arial";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.fillText(formatPrice(tx.openPrice), openX + 20, openY);

          // Jeśli transakcja jest zamknięta, rysuj punkt wyjścia
          if (tx.closeTime && tx.closePrice) {
            const closeX = scaleX(tx.closeTime);
            const closeY = scaleY(tx.closePrice);

            // Pionowa linia referencyjna dla wyjścia
            ctx.setLineDash([2, 2]);
            ctx.strokeStyle = "#FF9800"; // Pomarańczowy
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(closeX, marginTop);
            ctx.lineTo(closeX, marginTop + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            // Rysuj punkt wyjścia na linii ceny
            ctx.beginPath();
            ctx.arc(closeX, closeY, markerSize, 0, 2 * Math.PI);
            ctx.fillStyle = "#FF9800"; // Pomarańczowy
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Dodaj etykietę ceny
            ctx.font = "bold 11px Arial";
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "center";
            ctx.fillText(formatPrice(tx.closePrice), closeX - 20, closeY);

            // Połącz punkty linią
            ctx.beginPath();
            ctx.moveTo(openX, openY);
            ctx.lineTo(closeX, closeY);
            ctx.strokeStyle =
              tx.type === "BUY"
                ? tx.closePrice > tx.openPrice
                  ? "#4CAF50"
                  : "#F44336"
                : tx.closePrice < tx.openPrice
                ? "#4CAF50"
                : "#F44336";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }

      // Dodaj informacje o parametrach
      const infoY = canvas.height - 15;

      ctx.font = "10px Arial";
      ctx.fillStyle = "#AAAAAA";
      ctx.textAlign = "center";
      ctx.fillText(
        `Okres: ${formatDate(candleData[0].jsTime)} - ${formatDate(
          candleData[candleData.length - 1].jsTime
        )}`,
        canvas.width / 2 - marginRight / 2,
        infoY
      );

      setLoadingStatus("Wykres narysowany pomyślnie");
      console.log("Enhanced chart drawn successfully");

      return canvas;
    } catch (err) {
      console.error("Error drawing enhanced chart:", err);
      setLoadingStatus(`Błąd rysowania wykresu: ${err.message}`);
      return null;
    }
  };

  // Główna funkcja inicjalizacji wykresu
  const initializeChart = async () => {
    if (!isActive) return;

    setLoading(true);
    setError(null);
    setLoadingStatus("Inicjalizacja wykresu...");

    try {
      // Pobierz parametry
      const params = getInstanceParams();
      console.log("Instance parameters:", params);

      setLoadingStatus(
        `Pobieranie parametrów: ${params.symbol}, Hurst: ${params.hurst.interval} (${params.hurst.periods})`
      );

      // Krok 1: Pobierz dane świecowe dla kanału Hursta (15m)
      const hurstCandleData = await fetchCandleData(
        params.symbol,
        params.hurst.interval
      );

      if (!hurstCandleData || hurstCandleData.length === 0) {
        throw new Error(
          `Nie udało się pobrać danych świecowych dla ${params.hurst.interval}`
        );
      }

      // Krok 2: Oblicz kanał Hursta
      const hurstChannel = calculateHurstChannel(hurstCandleData, params.hurst);

      // Krok 3: Pobierz dane minutowe dla dokładności
      setLoadingStatus("Pobieranie dokładnych danych 1m...");
      let minuteData;

      try {
        minuteData = await fetchCandleData(params.symbol, "1m");
      } catch (err) {
        console.warn(
          "Could not fetch 1m data, using Hurst interval data instead",
          err
        );
        setLoadingStatus(
          `Nie udało się pobrać dokładnych danych 1m. Używanie danych ${params.hurst.interval}.`
        );
        minuteData = hurstCandleData;
      }

      // Krok 4: Pobierz dane dla EMA (1h)
      let emaData = null;

      try {
        setLoadingStatus(
          `Pobieranie danych dla EMA (${params.ema.interval})...`
        );
        const emaCandleData = await fetchCandleData(
          params.symbol,
          params.ema.interval
        );

        if (emaCandleData && emaCandleData.length > 0) {
          // Oblicz EMA
          emaData = calculateEMA(emaCandleData, params.ema.periods);
        }
      } catch (err) {
        console.warn("Could not calculate EMA:", err);
        setLoadingStatus(`Nie udało się obliczyć EMA. ${err.message}`);
      }

      // Krok 5: Pobierz dane o transakcjach
      const txData = await fetchTransactionsForInstance(instance?.id || "demo");
      setTransactions(txData);

      // Zapisz dane
      setChartData({
        candleData: minuteData || hurstCandleData,
        hurstChannel: hurstChannel,
        emaData: emaData,
        transactions: txData,
      });

      // Krok 6: Narysuj rozbudowany wykres
      if (chartContainerRef.current) {
        const canvas = drawEnhancedChart(
          chartContainerRef.current,
          minuteData || hurstCandleData,
          hurstChannel,
          emaData,
          txData
        );

        if (canvas) {
          chartRef.current = canvas;
        }
      } else {
        throw new Error("Nie znaleziono kontenera dla wykresu");
      }

      setLoading(false);
      setLoadingStatus("Wykres załadowany");
    } catch (err) {
      console.error("Error initializing chart:", err);
      setError(err.message);
      setLoadingStatus(`Błąd: ${err.message}`);
      setLoading(false);
    }
  };

  // Inicjalizacja wykresu po zmianie statusu aktywności
  useEffect(() => {
    if (isActive) {
      initializeChart();
    }

    return () => {
      // Czyszczenie przy odmontowaniu
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = "";
      }
    };
  }, [isActive, instance]);

  // Renderowanie przycisku aktywacji jeśli wykres jest nieaktywny
  if (!isActive) {
    return (
      <div className="chart-inactive">
        <button className="activate-chart-btn" onClick={onToggle}>
          Pokaż analizę techniczną
        </button>
      </div>
    );
  }

  // Renderowanie błędu
  if (error) {
    return (
      <div className="chart-container error">
        <p>Błąd: {error}</p>
        <button onClick={onToggle} className="close-btn">
          Zamknij
        </button>
      </div>
    );
  }

  // Główny widok wykresu
  return (
    <div className="technical-analysis-chart">
      <div className="chart-controls">
        <div className="control-group">
          <span>Symbol: {getInstanceParams().symbol}</span>
          <span>
            Kanał Hursta: {getInstanceParams().hurst.interval} (
            {getInstanceParams().hurst.periods})
          </span>
          <span>
            EMA: {getInstanceParams().ema.interval} (
            {getInstanceParams().ema.periods})
          </span>
        </div>
        <button className="refresh-data-btn" onClick={initializeChart}>
          Odśwież wykres
        </button>
      </div>

      <div className="chart-wrapper">
        {loading && (
          <div className="chart-overlay-loading">
            <div className="loader"></div>
            <p>Ładowanie wykresu: {loadingStatus}</p>
          </div>
        )}
        <div
          id="chart-container"
          ref={chartContainerRef}
          className="tradingview-chart"
        ></div>
      </div>

      <div className="chart-footer">
        <button onClick={onToggle} className="hide-chart-btn">
          Ukryj wykres
        </button>
        {loadingStatus && !loading && (
          <div className="status-message">
            <small>{loadingStatus}</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalAnalysisChart;

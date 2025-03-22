// src/components/dashboard/TechnicalAnalysisChart.js
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import "./TechnicalAnalysisChart.css";

const TechnicalAnalysisChart = ({ instance, isActive, onToggle }) => {
  console.log("TechnicalAnalysisChart rendering with props:", {
    instanceId: instance?._id,
    symbol: instance?.symbol,
    isActive,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState({
    total: 0,
    loaded: 0,
  });

  // Osobne stany dla każdego timeframe'u
  const [minuteData, setMinuteData] = useState([]); // Dane 1-minutowe dla dokładnej linii ceny
  const [hurstData, setHurstData] = useState([]); // Dane 15-minutowe dla kanału Hursta
  const [emaData, setEmaData] = useState([]); // Dane godzinowe dla EMA

  // Przetworzone kanały i wskaźniki
  const [hurstChannel, setHurstChannel] = useState({ upper: [], lower: [] });
  const [emaTrend, setEmaTrend] = useState([]);

  // Połączone dane do wykresu
  const [combinedData, setCombinedData] = useState([]);

  // Opcje wyświetlania
  const [timeframes, setTimeframes] = useState({
    price: "1m",
    hurst: "15m",
    ema: "1h",
  });
  const [showHurst, setShowHurst] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showPositions, setShowPositions] = useState(true);
  const [positions, setPositions] = useState([]);

  // Pobierz dane historyczne gdy komponent jest aktywny
  useEffect(() => {
    console.log(
      "Chart useEffect triggered - isActive:",
      isActive,
      "instance:",
      instance?.symbol
    );

    // Nie rób nic, jeśli wykres nie jest aktywny lub brak instancji
    if (!isActive || !instance) {
      console.log("Chart inactive or no instance, skipping data fetch");
      return;
    }

    // Funkcja pobierająca dane świecowe z paginacją
    const fetchCandlesWithPagination = async (
      symbol,
      timeframe,
      expectedCandles
    ) => {
      // Określ aktualny zakres dat
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);

      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      console.log(
        `Pobieranie danych od ${startDate.toISOString()} do ${endDate.toISOString()}`
      );

      // Podziel cały zakres na mniejsze fragmenty (1 dzień każdy)
      const allCandles = [];
      const daysToFetch = 14;

      // Pobieranie danych dzień po dniu
      for (let i = 0; i < daysToFetch; i++) {
        const dayEndDate = new Date(endDate);
        dayEndDate.setDate(endDate.getDate() - i);
        dayEndDate.setHours(23, 59, 59, 999);

        const dayStartDate = new Date(dayEndDate);
        dayStartDate.setHours(0, 0, 0, 0);

        const dayStartTime = dayStartDate.getTime();
        const dayEndTime = dayEndDate.getTime();

        console.log(
          `Pobieranie dnia ${i + 1}/14: ${
            dayStartDate.toISOString().split("T")[0]
          }`
        );

        const url = `/api/v1/market/klines/${symbol}/${timeframe}?startTime=${dayStartTime}&endTime=${dayEndTime}&limit=1500`;

        const token = localStorage.getItem("token");
        const headers = {
          Authorization: token ? `Bearer ${token}` : undefined,
          "Content-Type": "application/json",
        };

        try {
          const response = await fetch(url, { headers });

          if (!response.ok) {
            console.warn(`Błąd pobierania dnia ${i + 1}: ${response.status}`);
            continue; // Przejdź do następnego dnia
          }

          const responseData = await response.json();

          // Wyodrębnij świece z odpowiedzi
          let candles;
          if (Array.isArray(responseData)) {
            candles = responseData;
          } else if (
            responseData.candles &&
            Array.isArray(responseData.candles)
          ) {
            candles = responseData.candles;
          } else {
            console.warn(`Nieoczekiwany format odpowiedzi dla dnia ${i + 1}`);
            continue;
          }

          console.log(`Pobrano ${candles.length} świec dla dnia ${i + 1}`);
          allCandles.push(...candles);

          // Aktualizuj postęp ładowania
          setLoadingProgress((prev) => ({
            ...prev,
            loaded: prev.loaded + candles.length,
          }));

          // Krótka przerwa między zapytaniami
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Błąd podczas pobierania dnia ${i + 1}:`, error);
        }
      }

      console.log(
        `Zakończono pobieranie. Łącznie pobrano ${allCandles.length} świec`
      );

      // Sprawdź zakres dat
      if (allCandles.length > 0) {
        const times = allCandles.map((candle) => candle.openTime);
        const oldestTime = Math.min(...times);
        const newestTime = Math.max(...times);
        console.log(
          `Zakres dat w pobranych danych: od ${new Date(
            oldestTime
          ).toISOString()} do ${new Date(newestTime).toISOString()}`
        );
        console.log(
          `Liczba dni: ${(newestTime - oldestTime) / (1000 * 60 * 60 * 24)}`
        );
      }

      return allCandles;
    };

    const fetchAllData = async () => {
      console.log("Starting to fetch chart data...");
      setLoading(true);
      setError(null);
      // Zresetuj postęp ładowania
      setLoadingProgress({ total: 0, loaded: 0 });

      try {
        // Określ symbol na podstawie instancji lub użyj domyślnego BTCUSDT
        const symbol = instance.symbol || "BTCUSDT";
        console.log("Using symbol:", symbol);

        // Określ datę początkową (2 tygodnie temu)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const startTime = twoWeeksAgo.getTime();
        console.log("Start time for data:", new Date(startTime).toISOString());

        // Określ timeframe'y na podstawie instancji lub użyj domyślnych
        const priceTimeframe = "1m"; // Zawsze 1m dla dokładnej linii ceny
        const hurstTimeframe = instance?.intervals?.hurst || "15m";
        const emaTimeframe = instance?.intervals?.ema || "1h";

        // Aktualizuj informacje o timeframe'ach
        setTimeframes({
          price: priceTimeframe,
          hurst: hurstTimeframe,
          ema: emaTimeframe,
        });

        console.log("Using timeframes:", {
          price: priceTimeframe,
          hurst: hurstTimeframe,
          ema: emaTimeframe,
        });

        // Oblicz oczekiwaną liczbę świec dla każdego timeframe'u
        const minutesInTwoWeeks = 14 * 24 * 60; // 20160 minut
        const expectedMinuteCandles = minutesInTwoWeeks; // 1 świeca na minutę
        const expectedHurstCandles = Math.ceil(
          minutesInTwoWeeks / getTimeframeInMinutes(hurstTimeframe)
        );
        const expectedEmaCandles = Math.ceil(
          minutesInTwoWeeks / getTimeframeInMinutes(emaTimeframe)
        );

        // Ustaw całkowity oczekiwany postęp ładowania
        setLoadingProgress({
          total:
            expectedMinuteCandles + expectedHurstCandles + expectedEmaCandles,
          loaded: 0,
        });

        // Sekwencyjne pobieranie danych - jedno po drugim

        // 1. Pobierz dane minutowe dla dokładnej linii ceny
        console.log(
          `Fetching ${priceTimeframe} data for price, expecting ${expectedMinuteCandles} candles...`
        );
        const minuteDataRaw = await fetchCandlesWithPagination(
          symbol,
          priceTimeframe,
          startTime,
          expectedMinuteCandles
        );
        console.log("Received minute data:", minuteDataRaw.length, "candles");

        if (minuteDataRaw.length === 0) {
          throw new Error("Nie udało się pobrać danych minutowych");
        }

        // Sprawdź format danych
        if (minuteDataRaw.length > 0) {
          console.log("Sample minute candle:", minuteDataRaw[0]);
        }

        const processedMinuteData = processCandles(
          minuteDataRaw,
          priceTimeframe
        );
        setMinuteData(processedMinuteData);

        // 2. Pobierz dane dla kanału Hursta
        console.log(
          `Fetching ${hurstTimeframe} data for Hurst channel, expecting ${expectedHurstCandles} candles...`
        );
        const hurstDataRaw = await fetchCandlesWithPagination(
          symbol,
          hurstTimeframe,
          startTime,
          expectedHurstCandles
        );
        console.log("Received Hurst data:", hurstDataRaw.length, "candles");

        if (hurstDataRaw.length === 0) {
          throw new Error("Nie udało się pobrać danych dla kanału Hursta");
        }

        // Sprawdź format danych
        if (hurstDataRaw.length > 0) {
          console.log("Sample Hurst candle:", hurstDataRaw[0]);
        }

        const processedHurstData = processCandles(hurstDataRaw, hurstTimeframe);
        setHurstData(processedHurstData);

        // 3. Pobierz dane dla EMA
        console.log(
          `Fetching ${emaTimeframe} data for EMA, expecting ${expectedEmaCandles} candles...`
        );
        const emaDataRaw = await fetchCandlesWithPagination(
          symbol,
          emaTimeframe,
          startTime,
          expectedEmaCandles
        );
        console.log("Received EMA data:", emaDataRaw.length, "candles");

        if (emaDataRaw.length === 0) {
          throw new Error("Nie udało się pobrać danych dla EMA");
        }

        // Sprawdź format danych
        if (emaDataRaw.length > 0) {
          console.log("Sample EMA candle:", emaDataRaw[0]);
        }

        const processedEmaData = processCandles(emaDataRaw, emaTimeframe);
        setEmaData(processedEmaData);

        // 4. Pobierz pozycje/sygnały jeśli włączone
        if (showPositions && instance?._id) {
          console.log("Fetching positions data...");
          try {
            const token = localStorage.getItem("token");
            const headers = {
              Authorization: token ? `Bearer ${token}` : undefined,
              "Content-Type": "application/json",
            };

            const positionsUrl = `/api/v1/signals/instance/${instance._id}`;
            const positionsResponse = await fetch(positionsUrl, { headers });

            if (positionsResponse.ok) {
              const signalsData = await positionsResponse.json();
              console.log(
                "Received signals data:",
                signalsData.length,
                "signals"
              );

              // Filtruj tylko te sygnały, które występują w zakresie czasu wykresu
              const filteredPositions = signalsData.filter((signal) => {
                const signalTime = new Date(signal.timestamp).getTime();
                return signalTime >= startTime;
              });

              setPositions(filteredPositions);
              console.log(
                "Filtered positions in timeframe:",
                filteredPositions.length
              );
            } else {
              console.warn(
                "Failed to fetch positions, status:",
                positionsResponse.status
              );
            }
          } catch (err) {
            console.warn("Failed to fetch positions data:", err);
            // Nie przerywa ładowania wykresu
          }
        }

        // 5. Oblicz kanał Hursta
        console.log("Calculating Hurst channel...");
        const hurstParams = {
          periods: instance?.hurst?.periods || 25,
          upperDeviationFactor: instance?.hurst?.upperDeviationFactor || 2.0,
          lowerDeviationFactor: instance?.hurst?.lowerDeviationFactor || 2.0,
        };

        const hurstChannelData = calculateHurstChannel(
          processedHurstData,
          hurstParams
        );
        setHurstChannel(hurstChannelData);

        // 6. Oblicz EMA
        console.log("Calculating EMA...");
        const emaParams = {
          periods: instance?.ema?.periods || 30,
        };

        const emaLineData = calculateEMA(processedEmaData, emaParams.periods);
        setEmaTrend(emaLineData);

        // 7. Połącz wszystkie dane do wykresu
        console.log("Combining all data for chart...");
        const combined = combineAllData(
          processedMinuteData,
          hurstChannelData,
          emaLineData
        );
        const combinedTimes = combined.map((point) => point.time);
        const combinedMinTime = new Date(Math.min(...combinedTimes));
        const combinedMaxTime = new Date(Math.max(...combinedTimes));
        console.log(
          `Zakres dat przed optymalizacją: ${combinedMinTime.toISOString()} do ${combinedMaxTime.toISOString()}`
        );
        console.log(
          `Liczba dni przed optymalizacją: ${
            (combinedMaxTime - combinedMinTime) / (1000 * 60 * 60 * 24)
          }`
        );
        setCombinedData(combined);
        console.log(
          "Data combination complete, chart data ready with",
          combined.length,
          "points"
        );
      } catch (err) {
        console.error("Error during chart data processing:", err);
        setError(err.message);
      } finally {
        console.log("Fetch complete, setting loading to false");
        setLoading(false);
      }
    };

    fetchAllData();

    // Funkcja czyszcząca
    return () => {
      console.log("Chart useEffect cleanup");
      if (!isActive) {
        console.log("Chart inactive, clearing data");
        setMinuteData([]);
        setHurstData([]);
        setEmaData([]);
        setCombinedData([]);
        setHurstChannel({ upper: [], lower: [] });
        setEmaTrend([]);
        setPositions([]);
      }
    };
  }, [instance, isActive, showPositions]); // Pomocnicza funkcja uzyskująca interwał w milisekundach
  const getTimeframeInMs = (timeframe) => {
    const match = timeframe.match(/(\d+)([mhd])/);
    if (!match) return 60000; // Domyślnie 1 minuta

    const [_, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case "m":
        return numValue * 60 * 1000; // minuty
      case "h":
        return numValue * 60 * 60 * 1000; // godziny
      case "d":
        return numValue * 24 * 60 * 60 * 1000; // dni
      default:
        return 60000; // domyślnie 1 minuta
    }
  };

  // Pomocnicza funkcja uzyskująca interwał w minutach
  const getTimeframeInMinutes = (timeframe) => {
    const match = timeframe.match(/(\d+)([mhd])/);
    if (!match) return 1; // Domyślnie 1 minuta

    const [_, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case "m":
        return numValue; // minuty
      case "h":
        return numValue * 60; // godziny
      case "d":
        return numValue * 24 * 60; // dni
      default:
        return 1; // domyślnie 1 minuta
    }
  };

  // Funkcja przetwarzająca dane świecowe
  const processCandles = (candlesData, timeframe) => {
    if (!Array.isArray(candlesData)) {
      console.error("candlesData is not an array:", candlesData);
      // Sprawdź różne możliwe formaty odpowiedzi
      if (
        candlesData &&
        candlesData.candles &&
        Array.isArray(candlesData.candles)
      ) {
        candlesData = candlesData.candles;
      } else if (
        candlesData &&
        candlesData.data &&
        Array.isArray(candlesData.data)
      ) {
        candlesData = candlesData.data;
      } else if (candlesData && typeof candlesData === "object") {
        // Próbuj wyodrębnić dane z innych pól
        for (const key in candlesData) {
          if (Array.isArray(candlesData[key])) {
            console.log("Found array in field:", key);
            candlesData = candlesData[key];
            break;
          }
        }
      }

      if (!Array.isArray(candlesData)) {
        console.error("Could not extract array from response:", candlesData);
        return [];
      }
    }

    // Sprawdź, czy dane mają oczekiwany format
    if (
      candlesData.length > 0 &&
      (!candlesData[0].openTime || !candlesData[0].close)
    ) {
      console.error("Unexpected candle data format:", candlesData[0]);
      // Spróbuj dostosować format, jeśli możliwe
      return [];
    }

    return candlesData.map((candle) => {
      const openTime = new Date(candle.openTime).getTime();
      return {
        time: openTime,
        timestamp: candle.openTime,
        date: new Date(candle.openTime).toLocaleDateString(),
        timeframe: timeframe,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
      };
    });
  };

  // Funkcja łącząca wszystkie dane do jednego szeregu czasowego
  const combineAllData = (minuteData, hurstChannel, emaTrend) => {
    if (!minuteData.length) return [];

    // Użyj minutowych danych jako podstawy - najwyższa rozdzielczość
    const result = [...minuteData].map((item) => ({ ...item }));

    // Funkcja pomocnicza do znajdowania najbliższego punktu czasowego
    const findNearestTimeIndex = (timeArray, targetTime) => {
      let closestIndex = -1;
      let minDiff = Infinity;

      for (let i = 0; i < timeArray.length; i++) {
        const diff = Math.abs(timeArray[i].time - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      return closestIndex;
    };

    // Dodaj górną bandę kanału Hursta
    if (hurstChannel.upper.length > 0) {
      hurstChannel.upper.forEach((point) => {
        const index = findNearestTimeIndex(result, point.time);
        if (index !== -1) {
          result[index].hurstUpper = point.value;
        }
      });
    }

    // Dodaj dolną bandę kanału Hursta
    if (hurstChannel.lower.length > 0) {
      hurstChannel.lower.forEach((point) => {
        const index = findNearestTimeIndex(result, point.time);
        if (index !== -1) {
          result[index].hurstLower = point.value;
        }
      });
    }

    // Dodaj linię EMA
    if (emaTrend.length > 0) {
      emaTrend.forEach((point) => {
        const index = findNearestTimeIndex(result, point.time);
        if (index !== -1) {
          result[index].ema = point.value;
        }
      });
    }

    // Sortuj dane według czasu
    result.sort((a, b) => a.time - b.time);

    // Interpolacja wartości dla punktów, które nie mają wartości
    // To zapewni ciągłość linii na wykresie
    interpolateValues(result, "hurstUpper");
    interpolateValues(result, "hurstLower");
    interpolateValues(result, "ema");

    return result;
  };

  // Funkcja do interpolacji wartości dla ciągłości linii
  const interpolateValues = (data, property) => {
    if (!data || data.length === 0) return;

    let lastValidIndex = -1;

    // Znajdź pierwszy punkt z wartością
    for (let i = 0; i < data.length; i++) {
      if (data[i][property] !== undefined) {
        lastValidIndex = i;
        break;
      }
    }

    if (lastValidIndex === -1) return; // Brak punktów z wartościami

    // Iteruj przez wszystkie punkty
    for (let i = lastValidIndex + 1; i < data.length; i++) {
      if (data[i][property] !== undefined) {
        // Znaleziono kolejny punkt z wartością, interpoluj wszystkie punkty pomiędzy
        if (i > lastValidIndex + 1) {
          const startValue = data[lastValidIndex][property];
          const endValue = data[i][property];
          const totalSteps = i - lastValidIndex;

          for (let j = lastValidIndex + 1; j < i; j++) {
            const step = j - lastValidIndex;
            data[j][property] =
              startValue + (endValue - startValue) * (step / totalSteps);
          }
        }

        lastValidIndex = i;
      }
    }
  };

  // Funkcja do obliczania kanału Hursta
  const calculateHurstChannel = (data, params) => {
    if (!data || data.length < params.periods) {
      console.log("Not enough data for Hurst calculation");
      return { upper: [], lower: [] };
    }

    // Oblicz średnią dla określonej liczby okresów
    const movingAvg = [];
    for (let i = params.periods - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < params.periods; j++) {
        sum += data[i - j].close;
      }
      const avg = sum / params.periods;
      movingAvg.push({ time: data[i].time, value: avg });
    }

    // Oblicz odchylenie standardowe
    const deviations = [];
    for (let i = params.periods - 1; i < data.length; i++) {
      let sumSquares = 0;
      for (let j = 0; j < params.periods; j++) {
        const diff =
          data[i - j].close - movingAvg[i - (params.periods - 1)].value;
        sumSquares += diff * diff;
      }
      const stdDev = Math.sqrt(sumSquares / params.periods);
      deviations.push({ time: data[i].time, value: stdDev });
    }

    // Utwórz górną i dolną bandę
    const upper = movingAvg.map((point, index) => ({
      time: point.time,
      value:
        point.value + deviations[index].value * params.upperDeviationFactor,
    }));

    const lower = movingAvg.map((point, index) => ({
      time: point.time,
      value:
        point.value - deviations[index].value * params.lowerDeviationFactor,
    }));

    return { upper, lower };
  };

  // Funkcja do obliczania EMA
  const calculateEMA = (data, periods) => {
    if (!data || data.length < periods) {
      console.log("Not enough data for EMA calculation");
      return [];
    }

    const ema = [];
    // Oblicz SMA dla pierwszego punktu
    let sum = 0;
    for (let i = 0; i < periods; i++) {
      sum += data[i].close;
    }
    const sma = sum / periods;

    // Dodaj pierwszy punkt EMA (równy SMA)
    ema.push({ time: data[periods - 1].time, value: sma });

    // Oblicz mnożnik
    const multiplier = 2 / (periods + 1);

    // Oblicz EMA dla pozostałych punktów
    for (let i = periods; i < data.length; i++) {
      const prevEma = ema[ema.length - 1].value;
      const currentEma = (data[i].close - prevEma) * multiplier + prevEma;
      ema.push({ time: data[i].time, value: currentEma });
    }

    return ema;
  };

  // Renderowanie pozycji handlowych jako referencyjne punkty/linie
  const renderPositionMarkers = () => {
    if (!showPositions || !positions.length || !combinedData.length)
      return null;

    return positions.map((position, index) => {
      // Określ kolor w zależności od typu sygnału
      const color =
        position.type === "entry"
          ? "#4CAF50"
          : position.type === "exit"
          ? "#F44336"
          : "#FF9800";

      const time = new Date(position.timestamp).getTime();

      // Znajdź najbliższy punkt czasowy w danych
      let closestIndex = -1;
      let minDiff = Infinity;

      for (let i = 0; i < combinedData.length; i++) {
        const diff = Math.abs(combinedData[i].time - time);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      if (closestIndex === -1) return null;

      const xValue = combinedData[closestIndex].time;
      const price = position.price;

      // Dla sygnałów wejścia pokaż punkt
      if (position.type === "entry") {
        return (
          <ReferenceDot
            key={`position-${index}`}
            x={xValue}
            y={price}
            r={5}
            fill={color}
            stroke="none"
          />
        );
      }

      // Dla sygnałów wyjścia pokaż linię poziomą
      if (position.type === "exit") {
        return (
          <ReferenceLine
            key={`position-${index}`}
            y={price}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 3"
            label={{
              position: "right",
              value: `Wyjście: $${price.toFixed(2)}`,
              fill: color,
            }}
          />
        );
      }

      return null;
    });
  };

  // Handler do przycisku aktywacji wykresu
  const handleToggleClick = () => {
    console.log("Chart toggle button clicked");
    if (typeof onToggle === "function") {
      onToggle();
    } else {
      console.error("onToggle is not a function:", onToggle);
    }
  };

  // Jeśli wykres nie jest aktywny, wyświetl przycisk aktywacji
  if (!isActive) {
    console.log("Chart inactive, rendering activation button");
    return (
      <div className="chart-inactive">
        <button className="activate-chart-btn" onClick={handleToggleClick}>
          Pokaż analizę techniczną
        </button>
      </div>
    );
  }

  // Jeśli trwa ładowanie danych
  if (loading) {
    console.log("Chart loading, rendering loading state");
    const progressPercentage =
      loadingProgress.total > 0
        ? Math.min(
            100,
            Math.round((loadingProgress.loaded / loadingProgress.total) * 100)
          )
        : 0;

    return (
      <div className="chart-container loading">
        <div className="loader"></div>
        <p>Ładowanie danych... {progressPercentage}%</p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="loading-details">
          Pobieranie danych historycznych dla {instance?.symbol || "BTCUSDT"}
          <br />
          To może potrwać chwilę...
        </p>
      </div>
    );
  }

  // Jeśli wystąpił błąd
  if (error) {
    console.log("Chart error:", error);
    return (
      <div className="chart-container error">
        <p>Błąd: {error}</p>
        <button onClick={handleToggleClick} className="close-btn">
          Zamknij
        </button>
        <div className="error-details">
          <p>
            Sprawdź, czy serwer jest dostępny i czy masz uprawnienia do
            pobierania danych dla pary {instance?.symbol || "BTCUSDT"}.
          </p>
          <p>Możliwe przyczyny błędu:</p>
          <ul>
            <li>Serwer API jest niedostępny</li>
            <li>Token uwierzytelniający wygasł</li>
            <li>Nieprawidłowa konfiguracja API</li>
            <li>Symbol {instance?.symbol || "BTCUSDT"} nie jest obsługiwany</li>
          </ul>
        </div>
      </div>
    );
  }

  // Jeśli nie ma danych, ale wykres jest aktywny
  if (combinedData.length === 0) {
    console.log("Chart active but no data");
    return (
      <div className="chart-container empty">
        <p>Brak danych do wyświetlenia</p>
        <button onClick={handleToggleClick} className="close-btn">
          Zamknij
        </button>
      </div>
    );
  } // Optymalizacja danych dla wykresu (redukcja liczby punktów)
  const optimizeDataForChart = (data, maxPoints = 2000) => {
    if (data.length <= maxPoints) return data;

    // Określ zakres czasu
    const times = data.map((point) => point.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime;

    // Podziel zakres czasu na równe przedziały
    const bucketCount = maxPoints;
    const bucketSize = timeRange / bucketCount;

    // Utwórz tablicę kubełków (buckets)
    const buckets = new Array(bucketCount).fill().map(() => []);

    // Przypisz każdy punkt do odpowiedniego kubełka
    data.forEach((point) => {
      const bucketIndex = Math.min(
        bucketCount - 1,
        Math.floor((point.time - minTime) / bucketSize)
      );
      buckets[bucketIndex].push(point);
    });

    // Wybierz jeden punkt z każdego niepustego kubełka
    const optimized = [];
    buckets.forEach((bucket) => {
      if (bucket.length > 0) {
        // Wybierz środkowy punkt z kubełka lub punkt z ważnymi wartościami
        const importantPoints = bucket.filter(
          (p) =>
            p.hurstUpper !== undefined ||
            p.hurstLower !== undefined ||
            p.ema !== undefined
        );

        // Jeśli są punkty z ważnymi wartościami, wybierz pierwszy taki punkt
        if (importantPoints.length > 0) {
          optimized.push(importantPoints[0]);
        } else {
          // W przeciwnym razie wybierz środkowy punkt z kubełka
          optimized.push(bucket[Math.floor(bucket.length / 2)]);
        }
      }
    });

    // Sortuj dane według czasu
    optimized.sort((a, b) => a.time - b.time);

    console.log(
      `Optymalizacja: zredukowano ${data.length} punktów do ${optimized.length}`
    );

    return optimized;
  };

  console.log("Rendering full chart with data points:", combinedData.length);
  const optimizedData = optimizeDataForChart(combinedData);
  console.log("Optimized to data points:", optimizedData.length);

  const times = optimizedData.map((point) => point.time);
  const minTime = new Date(Math.min(...times));
  const maxTime = new Date(Math.max(...times));
  console.log(
    `Zakres dat po optymalizacji: ${minTime.toISOString()} do ${maxTime.toISOString()}`
  );
  console.log(`Liczba dni: ${(maxTime - minTime) / (1000 * 60 * 60 * 24)}`);

  return (
    <div className="technical-analysis-chart">
      <div className="chart-controls">
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showHurst}
              onChange={() => setShowHurst(!showHurst)}
            />
            Kanał Hursta
          </label>
          <label>
            <input
              type="checkbox"
              checked={showEMA}
              onChange={() => setShowEMA(!showEMA)}
            />
            EMA
          </label>
          <label>
            <input
              type="checkbox"
              checked={showPositions}
              onChange={() => setShowPositions(!showPositions)}
            />
            Pozycje
          </label>
        </div>
        <div className="timeframe-info">
          <span>
            Cena: {timeframes.price} | Hurst: {timeframes.hurst} | EMA:{" "}
            {timeframes.ema}
          </span>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={optimizedData}
            margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={(time) => {
                const date = new Date(time);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
              minTickGap={20} // Zmniejszone z 50 na 20
              scale="time"
              type="number"
              domain={["auto", "auto"]} // Zmienione z ["dataMin", "dataMax"] na ["auto", "auto"]
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              labelFormatter={(time) =>
                new Date(time).toLocaleDateString() +
                " " +
                new Date(time).toLocaleTimeString()
              }
              formatter={(value, name) => {
                if (name === "close") return ["Cena", `$${value.toFixed(2)}`];
                if (name === "hurstUpper")
                  return ["Górny Hurst", `$${value.toFixed(2)}`];
                if (name === "hurstLower")
                  return ["Dolny Hurst", `$${value.toFixed(2)}`];
                if (name === "ema") return ["EMA", `$${value.toFixed(2)}`];
                return [name, value];
              }}
            />
            <Legend />

            {/* Linia ceny */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#8884d8"
              dot={false}
              name="Cena"
              isAnimationActive={false}
              strokeWidth={1.5}
              connectNulls={true}
            />

            {/* Górna banda kanału Hursta */}
            {showHurst && (
              <Line
                type="monotone"
                dataKey="hurstUpper"
                stroke="#82ca9d"
                dot={false}
                strokeDasharray="5 5"
                name="Górny Hurst"
                isAnimationActive={false}
                connectNulls={true}
              />
            )}

            {/* Dolna banda kanału Hursta */}
            {showHurst && (
              <Line
                type="monotone"
                dataKey="hurstLower"
                stroke="#ff8042"
                dot={false}
                strokeDasharray="5 5"
                name="Dolny Hurst"
                isAnimationActive={false}
                connectNulls={true}
              />
            )}

            {/* Linia EMA */}
            {showEMA && (
              <Line
                type="monotone"
                dataKey="ema"
                stroke="#ffc658"
                dot={false}
                name="Trend EMA"
                isAnimationActive={false}
                strokeWidth={2}
                connectNulls={true}
              />
            )}

            {/* Renderowanie pozycji handlowych */}
            {showPositions && renderPositionMarkers()}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-stats">
        {positions.length > 0 && (
          <div className="position-stats">
            <h4>Statystyki pozycji</h4>
            <p>Liczba sygnałów: {positions.length}</p>
            <p>
              Wejścia: {positions.filter((p) => p.type === "entry").length} |
              Wyjścia: {positions.filter((p) => p.type === "exit").length}
            </p>
          </div>
        )}
      </div>

      <div className="chart-footer">
        <div className="chart-info">
          <span>
            {instance?.symbol || "BTCUSDT"} | Hurst ({timeframes.hurst}):{" "}
            {instance?.hurst?.periods || 25} okresów | EMA ({timeframes.ema}):{" "}
            {instance?.ema?.periods || 30} okresów | Ostatnie 14 dni
          </span>
        </div>
        <button onClick={handleToggleClick} className="hide-chart-btn">
          Ukryj wykres
        </button>
      </div>
    </div>
  );
};

export default TechnicalAnalysisChart;

import React, { useState, useEffect, useRef } from "react";
import { createChart, CrosshairMode, LineStyle } from "lightweight-charts";
import "./CandleDataViewer.css";

const CandleDataViewer = ({ data, isLoading, hurstData }) => {
  const [activeTab, setActiveTab] = useState("price");
  const [timeframeView, setTimeframeView] = useState("main");
  const [showSignals, setShowSignals] = useState(true);

  // Referencje do kontenerów wykresów
  const priceChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const combinedChartRef = useRef(null);
  const hurstChartRef = useRef(null);
  const hurstOscillatorRef = useRef(null);

  // Referencje do instancji wykresów
  const chartInstancesRef = useRef({
    price: null,
    volume: null,
    combined: null,
    hurst: null,
    hurstOscillator: null,
  });

  // Referencje do serii danych na wykresach
  const seriesRef = useRef({
    candlestick: null,
    volume: null,
    line: null,
    hurstUpper: null,
    hurstMiddle: null,
    hurstLower: null,
    hurstOscillator: null,
  });

  console.log("Dane otrzymane w CandleDataViewer:", data);

  // Hook useEffect - przed wszystkimi warunkowymi zwrotami
  // Efekt do tworzenia i zarządzania wykresami
  useEffect(() => {
    // Nie rób nic, jeśli ładowanie lub brak danych
    if (isLoading || !data || !data.candles || data.candles.length === 0) {
      return;
    }

    // Sprawdź dane na podstawie timeframe
    const hasPreciseData = data && data.candles1m && data.candles1m.length > 0;

    // Konwertujemy dane do formatu, który jest oczekiwany przez lightweight-charts
    const prepareChartData = (candles) => {
      return candles.map((candle) => {
        const date = new Date(candle.time || candle.timestamp);
        // Format czasu dla lightweight-charts
        return {
          time: date.getTime() / 1000,
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          value: parseFloat(candle.close), // Dla serii liniowej
          volume: parseFloat(candle.volume),
        };
      });
    };

    // Przygotuj dane dla regularnego timeframe i timeframe 1m
    const chartData = prepareChartData(data.candles);
    const chartData1m = hasPreciseData ? prepareChartData(data.candles1m) : [];

    // Funkcja do dodawania danych Hursta do danych wykresu
    const addHurstData = (candleData) => {
      if (!hurstData || !hurstData.middle || hurstData.middle.length === 0) {
        return candleData;
      }

      const hurstTimestamps = hurstData.middle.map(
        (item) => new Date(item.time).getTime() / 1000
      );

      return candleData.map((candle) => {
        // Znajdź najbliższy punkt danych Hursta
        const closestIndex = findClosestIndex(hurstTimestamps, candle.time);

        if (closestIndex !== -1) {
          return {
            ...candle,
            hurstMiddle: hurstData.middle[closestIndex].value,
            hurstUpper: hurstData.upper[closestIndex].value,
            hurstLower: hurstData.lower[closestIndex].value,
            hurstOscillator: hurstData.oscillator[closestIndex].value,
          };
        }

        return candle;
      });
    };

    // Funkcja pomocnicza do znajdowania najbliższego indeksu w tablicy
    const findClosestIndex = (arr, target) => {
      if (arr.length === 0) return -1;

      let closestIndex = 0;
      let closestDiff = Math.abs(arr[0] - target);

      for (let i = 1; i < arr.length; i++) {
        const diff = Math.abs(arr[i] - target);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }

      return closestIndex;
    };

    // Dodaj dane Hursta do obu timeframe'ów
    const chartDataWithHurst = addHurstData(chartData);
    const chartData1mWithHurst = hasPreciseData
      ? addHurstData(chartData1m)
      : [];

    // Wybierz aktywny zestaw danych na podstawie widoku timeframe
    const activeData =
      timeframeView === "1m" && hasPreciseData
        ? chartData1mWithHurst
        : chartDataWithHurst;

    // Oblicz sygnały wejścia i wyjścia
    const calculateSignals = (data) => {
      const entrySignals = [];
      const exitSignals = [];

      if (showSignals && hurstData) {
        // Sygnały wejścia (gdy cena low dotyka dolnej wstęgi)
        for (let i = 0; i < data.length; i++) {
          const candle = data[i];
          if (
            candle.hurstLower !== undefined &&
            candle.low <= candle.hurstLower
          ) {
            entrySignals.push({
              time: candle.time,
              position: "belowBar",
              color: "#00ff00",
              shape: "arrowUp",
              text: "ENTRY",
            });
          }
        }

        // Sygnały wyjścia (gdy cena wraca z górnego ekstremum)
        let foundExtremum = false;
        for (let i = 1; i < data.length; i++) {
          const prevCandle = data[i - 1];
          const candle = data[i];

          // Sprawdź, czy cena wyszła ponad górną wstęgę (ekstremum)
          if (
            prevCandle.hurstUpper !== undefined &&
            prevCandle.high > prevCandle.hurstUpper
          ) {
            foundExtremum = true;
          }

          // Jeśli wcześniej znaleźliśmy ekstremum, a teraz cena wraca poniżej górnej wstęgi
          if (
            foundExtremum &&
            candle.hurstUpper !== undefined &&
            candle.close <= candle.hurstUpper
          ) {
            exitSignals.push({
              time: candle.time,
              position: "aboveBar",
              color: "#ff0000",
              shape: "arrowDown",
              text: "EXIT",
            });
            foundExtremum = false;
          }
        }
      }

      return { entrySignals, exitSignals };
    };

    // Oblicz sygnały dla aktywnego zestawu danych
    const { entrySignals, exitSignals } = calculateSignals(activeData);

    // Ustaw domyślne opcje wykresu
    const chartOptions = {
      layout: {
        textColor: "rgba(255, 255, 255, 0.7)",
        background: { type: "solid", color: "transparent" },
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.1)" },
        horzLines: { color: "rgba(255, 255, 255, 0.1)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 193, 7, 0.5)",
          width: 1,
          style: LineStyle.Dotted,
        },
        horzLine: {
          color: "rgba(255, 193, 7, 0.5)",
          width: 1,
          style: LineStyle.Dotted,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
    };

    // Przechowaj bieżące instancje wykresów do czyszczenia (naprawia problem closure)
    const currentChartInstances = { ...chartInstancesRef.current };

    // Funkcja do tworzenia/aktualizacji wykresu cenowego
    const setupPriceChart = () => {
      if (!priceChartRef.current) return;

      // Wyczyść istniejący wykres, jeśli istnieje
      if (currentChartInstances.price) {
        priceChartRef.current.innerHTML = "";
        currentChartInstances.price.remove();
      }

      // Utwórz nowy wykres
      const chart = createChart(priceChartRef.current, {
        ...chartOptions,
        height: 400,
        width: priceChartRef.current.clientWidth,
      });

      // Utwórz serię świecową
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#4CAF50",
        downColor: "#F44336",
        borderVisible: false,
        wickUpColor: "#4CAF50",
        wickDownColor: "#F44336",
      });

      // Ustaw dane
      candleSeries.setData(activeData);

      // Dodaj markery dla sygnałów wejścia/wyjścia
      if (showSignals && entrySignals.length + exitSignals.length > 0) {
        candleSeries.setMarkers([...entrySignals, ...exitSignals]);
      }

      // Przechowaj wykres i serię do późniejszych aktualizacji
      chartInstancesRef.current.price = chart;
      seriesRef.current.candlestick = candleSeries;

      return chart;
    };

    // Funkcja do tworzenia/aktualizacji wykresu wolumenu
    const setupVolumeChart = () => {
      if (!volumeChartRef.current) return;

      // Wyczyść istniejący wykres, jeśli istnieje
      if (currentChartInstances.volume) {
        volumeChartRef.current.innerHTML = "";
        currentChartInstances.volume.remove();
      }

      // Utwórz nowy wykres
      const chart = createChart(volumeChartRef.current, {
        ...chartOptions,
        height: 400,
        width: volumeChartRef.current.clientWidth,
      });

      // Utwórz serię histogramu
      const volumeSeries = chart.addHistogramSeries({
        color: "#FFC107",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "volume",
      });

      // Formatuj dane wolumenu
      const volumeData = activeData.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "#4CAF50" : "#F44336",
      }));

      // Ustaw dane
      volumeSeries.setData(volumeData);

      // Przechowaj wykres i serię do późniejszych aktualizacji
      chartInstancesRef.current.volume = chart;
      seriesRef.current.volume = volumeSeries;

      return chart;
    };

    // Funkcja do tworzenia/aktualizacji wykresu kombinowanego
    const setupCombinedChart = () => {
      if (!combinedChartRef.current) return;

      // Wyczyść istniejący wykres, jeśli istnieje
      if (currentChartInstances.combined) {
        combinedChartRef.current.innerHTML = "";
        currentChartInstances.combined.remove();
      }

      // Utwórz nowy wykres
      const chart = createChart(combinedChartRef.current, {
        ...chartOptions,
        height: 500,
        width: combinedChartRef.current.clientWidth,
      });

      // Utwórz serię świecową
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#4CAF50",
        downColor: "#F44336",
        borderVisible: false,
        wickUpColor: "#4CAF50",
        wickDownColor: "#F44336",
      });

      // Ustaw dane
      candleSeries.setData(activeData);

      // Dodaj markery dla sygnałów wejścia/wyjścia
      if (showSignals && entrySignals.length + exitSignals.length > 0) {
        candleSeries.setMarkers([...entrySignals, ...exitSignals]);
      }

      // Utwórz serię wolumenu
      const volumeSeries = chart.addHistogramSeries({
        color: "#FFC107",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "volume",
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      // Formatuj dane wolumenu
      const volumeData = activeData.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "#4CAF50" : "#F44336",
      }));

      // Ustaw dane
      volumeSeries.setData(volumeData);

      // Przechowaj wykres do późniejszych aktualizacji
      chartInstancesRef.current.combined = chart;

      return chart;
    };

    // Funkcja do tworzenia/aktualizacji wykresu Hursta
    const setupHurstChart = () => {
      if (!hurstChartRef.current || !hurstData) return;

      // Wyczyść istniejący wykres, jeśli istnieje
      if (currentChartInstances.hurst) {
        hurstChartRef.current.innerHTML = "";
        currentChartInstances.hurst.remove();
      }

      // Utwórz nowy wykres
      const chart = createChart(hurstChartRef.current, {
        ...chartOptions,
        height: 400,
        width: hurstChartRef.current.clientWidth,
      });

      // Utwórz linię ceny
      const priceSeries = chart.addLineSeries({
        color: "#FFC107",
        lineWidth: 2,
        title: "Close Price",
      });

      // Utwórz górną wstęgę Hursta
      const hurstUpperSeries = chart.addLineSeries({
        color: "#F44336",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Hurst Upper Band",
      });

      // Utwórz środkową linię Hursta
      const hurstMiddleSeries = chart.addLineSeries({
        color: "#2196F3",
        lineWidth: 2,
        title: "Hurst Middle",
      });

      // Utwórz dolną wstęgę Hursta
      const hurstLowerSeries = chart.addLineSeries({
        color: "#4CAF50",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Hurst Lower Band",
      });

      // Formatuj dane dla serii
      const priceData = activeData.map((d) => ({
        time: d.time,
        value: d.close,
      }));
      const hurstUpperData = activeData
        .filter((d) => d.hurstUpper !== undefined)
        .map((d) => ({ time: d.time, value: d.hurstUpper }));
      const hurstMiddleData = activeData
        .filter((d) => d.hurstMiddle !== undefined)
        .map((d) => ({ time: d.time, value: d.hurstMiddle }));
      const hurstLowerData = activeData
        .filter((d) => d.hurstLower !== undefined)
        .map((d) => ({ time: d.time, value: d.hurstLower }));

      // Ustaw dane
      priceSeries.setData(priceData);
      hurstUpperSeries.setData(hurstUpperData);
      hurstMiddleSeries.setData(hurstMiddleData);
      hurstLowerSeries.setData(hurstLowerData);

      // Dodaj markery dla sygnałów wejścia/wyjścia
      if (showSignals && entrySignals.length + exitSignals.length > 0) {
        priceSeries.setMarkers([...entrySignals, ...exitSignals]);
      }

      // Przechowaj wykres i serie do późniejszych aktualizacji
      chartInstancesRef.current.hurst = chart;
      seriesRef.current.hurstUpper = hurstUpperSeries;
      seriesRef.current.hurstMiddle = hurstMiddleSeries;
      seriesRef.current.hurstLower = hurstLowerSeries;

      return chart;
    };
    // Funkcja do tworzenia/aktualizacji wykresu oscylatora Hursta
    const setupHurstOscillator = () => {
      if (!hurstOscillatorRef.current || !hurstData) return;

      // Wyczyść istniejący wykres, jeśli istnieje
      if (currentChartInstances.hurstOscillator) {
        hurstOscillatorRef.current.innerHTML = "";
        currentChartInstances.hurstOscillator.remove();
      }

      // Utwórz nowy wykres
      const chart = createChart(hurstOscillatorRef.current, {
        ...chartOptions,
        height: 200,
        width: hurstOscillatorRef.current.clientWidth,
      });

      // Utwórz linię oscylatora
      const oscillatorSeries = chart.addLineSeries({
        color: "#673AB7",
        lineWidth: 2,
        title: "Hurst Oscillator",
      });

      // Utwórz linie referencyjne
      const upperRefSeries = chart.addLineSeries({
        color: "#FF9800",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Upper",
      });

      const zeroRefSeries = chart.addLineSeries({
        color: "#9E9E9E",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Zero",
      });

      const lowerRefSeries = chart.addLineSeries({
        color: "#FF9800",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Lower",
      });

      // Formatuj dane dla oscylatora
      const oscillatorData = activeData
        .filter((d) => d.hurstOscillator !== undefined)
        .map((d) => ({ time: d.time, value: d.hurstOscillator }));

      // Pobierz zakres czasu z danych
      const timeRange = {
        start: activeData.length > 0 ? activeData[0].time : 0,
        end: activeData.length > 0 ? activeData[activeData.length - 1].time : 0,
      };

      // Utwórz dane dla linii referencyjnych
      const refUpperData = [
        { time: timeRange.start, value: 0.8 },
        { time: timeRange.end, value: 0.8 },
      ];

      const refZeroData = [
        { time: timeRange.start, value: 0 },
        { time: timeRange.end, value: 0 },
      ];

      const refLowerData = [
        { time: timeRange.start, value: -0.8 },
        { time: timeRange.end, value: -0.8 },
      ];

      // Ustaw dane
      oscillatorSeries.setData(oscillatorData);
      upperRefSeries.setData(refUpperData);
      zeroRefSeries.setData(refZeroData);
      lowerRefSeries.setData(refLowerData);

      // Przechowaj wykres i serię do późniejszych aktualizacji
      chartInstancesRef.current.hurstOscillator = chart;
      seriesRef.current.hurstOscillator = oscillatorSeries;

      return chart;
    };

    // Utwórz tablicę do przechowywania wszystkich uchwytów zmiany rozmiaru
    const resizeHandlers = [];
    const createdCharts = [];

    // Inicjalizuj lub aktualizuj wykresy na podstawie aktywnej zakładki
    if (activeTab === "price") {
      const chart = setupPriceChart();
      if (chart) {
        const handleResize = () => {
          if (priceChartRef.current) {
            chart.applyOptions({ width: priceChartRef.current.clientWidth });
          }
        };
        window.addEventListener("resize", handleResize);
        resizeHandlers.push({ handler: handleResize });
        createdCharts.push(chart);
      }
    } else if (activeTab === "volume") {
      const chart = setupVolumeChart();
      if (chart) {
        const handleResize = () => {
          if (volumeChartRef.current) {
            chart.applyOptions({ width: volumeChartRef.current.clientWidth });
          }
        };
        window.addEventListener("resize", handleResize);
        resizeHandlers.push({ handler: handleResize });
        createdCharts.push(chart);
      }
    } else if (activeTab === "combined") {
      const chart = setupCombinedChart();
      if (chart) {
        const handleResize = () => {
          if (combinedChartRef.current) {
            chart.applyOptions({ width: combinedChartRef.current.clientWidth });
          }
        };
        window.addEventListener("resize", handleResize);
        resizeHandlers.push({ handler: handleResize });
        createdCharts.push(chart);
      }
    } else if (activeTab === "hurst" && hurstData) {
      const chart1 = setupHurstChart();
      const chart2 = setupHurstOscillator();

      if (chart1) {
        const handleResize1 = () => {
          if (hurstChartRef.current) {
            chart1.applyOptions({ width: hurstChartRef.current.clientWidth });
          }
        };
        window.addEventListener("resize", handleResize1);
        resizeHandlers.push({ handler: handleResize1 });
        createdCharts.push(chart1);
      }

      if (chart2) {
        const handleResize2 = () => {
          if (hurstOscillatorRef.current) {
            chart2.applyOptions({
              width: hurstOscillatorRef.current.clientWidth,
            });
          }
        };
        window.addEventListener("resize", handleResize2);
        resizeHandlers.push({ handler: handleResize2 });
        createdCharts.push(chart2);
      }
    }

    // Czyszczenie przy odmontowaniu komponentu lub zmianie zależności
    return () => {
      // Usuń nasłuchiwacze zdarzeń
      resizeHandlers.forEach(({ handler }) => {
        window.removeEventListener("resize", handler);
      });

      // Wyczyść wykresy utworzone w tym uruchomieniu efektu
      createdCharts.forEach((chart) => {
        if (chart) {
          chart.remove();
        }
      });
    };
  }, [activeTab, timeframeView, showSignals, data, isLoading, hurstData]);

  if (isLoading) {
    return (
      <div className="candle-viewer card loading">
        <div className="loader"></div>
        <h3>Loading data...</h3>
        <p>Fetching market data from database</p>
      </div>
    );
  }

  // Sprawdzamy, czy mamy dane minutowe
  const hasPreciseData = data && data.candles1m && data.candles1m.length > 0;

  if (!data || !data.candles || data.candles.length === 0) {
    return (
      <div className="candle-viewer card empty">
        <div className="placeholder-content">
          <h3>No Data Available</h3>
          <p>
            Import data using the panel on the left to visualize price history
          </p>
        </div>
      </div>
    );
  }

  // Konwertujemy dane do formatu, który jest oczekiwany przez komponenty wykresów
  const chartData = data.candles.map((candle) => ({
    date: new Date(candle.time || candle.timestamp).toLocaleDateString(),
    time: new Date(candle.time || candle.timestamp).toLocaleTimeString(),
    fullDate: new Date(candle.time || candle.timestamp),
    timestamp: new Date(candle.time || candle.timestamp).getTime(),
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
    volume: parseFloat(candle.volume),
  }));

  // Oblicz podstawowe statystyki
  const lastCandle = chartData[chartData.length - 1];
  const firstCandle = chartData[0];
  const priceChange = lastCandle.close - firstCandle.open;
  const percentChange = (priceChange / firstCandle.open) * 100;

  const highestPrice = Math.max(...chartData.map((d) => d.high));
  const lowestPrice = Math.min(...chartData.map((d) => d.low));
  const averageVolume =
    chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length;

  // Pobierz aktywny zestaw danych
  const activeData =
    timeframeView === "1m" && hasPreciseData
      ? data.candles1m.map((candle) => ({
          date: new Date(candle.time || candle.timestamp).toLocaleDateString(),
          time: new Date(candle.time || candle.timestamp).toLocaleTimeString(),
          timestamp: new Date(candle.time || candle.timestamp).getTime(),
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume),
        }))
      : chartData;

  // Oblicz sygnały dla tabeli
  const calculateTableSignals = () => {
    const entrySignals = [];
    const exitSignals = [];

    if (showSignals && hurstData) {
      // Mapuj dane Hursta na znaczniki czasu dla łatwiejszego wyszukiwania
      const hurstMap = {};

      if (hurstData.middle && hurstData.middle.length > 0) {
        hurstData.middle.forEach((item, index) => {
          const timestamp = new Date(item.time).getTime();
          hurstMap[timestamp] = {
            middle: item.value,
            upper: hurstData.upper[index].value,
            lower: hurstData.lower[index].value,
            oscillator: hurstData.oscillator[index].value,
          };
        });
      }

      // Przetwórz każdą świecę dla sygnałów
      let foundExtremum = false;
      for (let i = 0; i < activeData.length; i++) {
        const candle = activeData[i];
        const prevCandle = i > 0 ? activeData[i - 1] : null;

        // Znajdź najbliższy znacznik czasu Hursta
        let closestTimestamp = null;
        let minDiff = Infinity;

        for (const timestamp in hurstMap) {
          const diff = Math.abs(candle.timestamp - parseInt(timestamp));
          if (diff < minDiff) {
            minDiff = diff;
            closestTimestamp = timestamp;
          }
        }

        if (closestTimestamp) {
          const hurstValues = hurstMap[closestTimestamp];

          // Sprawdź sygnał wejścia (gdy cena low dotyka dolnej wstęgi)
          if (candle.low <= hurstValues.lower) {
            entrySignals.push(candle.timestamp);
          }

          // Sprawdź ekstremum (cena wyszła ponad górną wstęgę)
          if (prevCandle && prevCandle.high > hurstValues.upper) {
            foundExtremum = true;
          }

          // Sprawdź sygnał wyjścia (cena wraca poniżej górnej wstęgi po ekstremum)
          if (foundExtremum && candle.close <= hurstValues.upper) {
            exitSignals.push(candle.timestamp);
            foundExtremum = false;
          }
        }
      }
    }

    return { entrySignals, exitSignals };
  };

  const { entrySignals, exitSignals } = calculateTableSignals();

  // Generuj dane tabeli dla zakładki "Data Table"
  const tableData = activeData.map((candle, index) => {
    // Sprawdź, czy ta świeca ma sygnał wejścia lub wyjścia
    const hasEntrySignal = entrySignals.includes(candle.timestamp);
    const hasExitSignal = exitSignals.includes(candle.timestamp);

    return {
      index,
      date: candle.date,
      time: candle.time,
      open: candle.open.toFixed(2),
      high: candle.high.toFixed(2),
      low: candle.low.toFixed(2),
      close: candle.close.toFixed(2),
      volume: candle.volume.toFixed(2),
      hurstOscillator:
        candle.hurstOscillator !== undefined
          ? candle.hurstOscillator.toFixed(4)
          : "-",
      signal: hasEntrySignal ? "ENTRY" : hasExitSignal ? "EXIT" : "-",
      signalType: hasEntrySignal ? "entry" : hasExitSignal ? "exit" : null,
    };
  });

  return (
    <div className="candle-viewer card">
      <div className="data-header">
        <h2>
          Market Data: {data.pair} ({data.timeframe})
        </h2>

        {hasPreciseData && (
          <div className="timeframe-selector">
            <button
              className={timeframeView === "main" ? "active" : ""}
              onClick={() => setTimeframeView("main")}
            >
              {data.timeframe}
            </button>
            <button
              className={timeframeView === "1m" ? "active" : ""}
              onClick={() => setTimeframeView("1m")}
            >
              1m
            </button>
          </div>
        )}

        <div className="data-summary">
          <div className="metric">
            <span className="label">Last Price</span>
            <span className="value">${lastCandle.close.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="label">Change</span>
            <span
              className={`value ${priceChange >= 0 ? "positive" : "negative"}`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
            </span>
          </div>
          <div className="metric">
            <span className="label">Period</span>
            <span className="value small">
              {new Date(data.startDate).toLocaleDateString()} -{" "}
              {new Date(data.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="metric">
            <span className="label">Candles</span>
            <span className="value">
              {timeframeView === "1m" && hasPreciseData
                ? data.candles1m.length
                : data.candles.length}
            </span>
          </div>
        </div>
      </div>

      <div className="view-controls">
        <label className="signal-toggle">
          <input
            type="checkbox"
            checked={showSignals}
            onChange={() => setShowSignals(!showSignals)}
          />
          Show Entry/Exit Signals
        </label>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "price" ? "active" : ""}
          onClick={() => setActiveTab("price")}
        >
          Price Chart
        </button>
        <button
          className={activeTab === "volume" ? "active" : ""}
          onClick={() => setActiveTab("volume")}
        >
          Volume
        </button>
        <button
          className={activeTab === "combined" ? "active" : ""}
          onClick={() => setActiveTab("combined")}
        >
          Price & Volume
        </button>
        {hurstData && (
          <button
            className={activeTab === "hurst" ? "active" : ""}
            onClick={() => setActiveTab("hurst")}
          >
            Hurst Channel
          </button>
        )}
        <button
          className={activeTab === "data" ? "active" : ""}
          onClick={() => setActiveTab("data")}
        >
          Data Table
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "price" && (
          <div className="price-chart-tab">
            <div className="chart-container">
              <div
                ref={priceChartRef}
                className="tv-chart"
                style={{ height: "400px" }}
              ></div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h4>Price Statistics</h4>
                <div className="stat-item">
                  <span>Highest Price:</span>
                  <span>${highestPrice.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Lowest Price:</span>
                  <span>${lowestPrice.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Range:</span>
                  <span>${(highestPrice - lowestPrice).toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Open:</span>
                  <span>${firstCandle.open.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Close:</span>
                  <span>${lastCandle.close.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "volume" && (
          <div className="volume-chart-tab">
            <div className="chart-container">
              <div
                ref={volumeChartRef}
                className="tv-chart"
                style={{ height: "400px" }}
              ></div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h4>Volume Statistics</h4>
                <div className="stat-item">
                  <span>Average Volume:</span>
                  <span>{averageVolume.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Highest Volume:</span>
                  <span>
                    {Math.max(...activeData.map((d) => d.volume)).toFixed(2)}
                  </span>
                </div>
                <div className="stat-item">
                  <span>Lowest Volume:</span>
                  <span>
                    {Math.min(...activeData.map((d) => d.volume)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "combined" && (
          <div className="combined-chart-tab">
            <div className="chart-container">
              <div
                ref={combinedChartRef}
                className="tv-chart"
                style={{ height: "500px" }}
              ></div>
            </div>
          </div>
        )}

        {activeTab === "hurst" && hurstData && (
          <div className="hurst-chart-tab">
            <div className="chart-container">
              <div
                ref={hurstChartRef}
                className="tv-chart"
                style={{ height: "400px" }}
              ></div>
            </div>

            <div className="chart-container" style={{ marginTop: "20px" }}>
              <h4>Hurst Oscillator</h4>
              <div
                ref={hurstOscillatorRef}
                className="tv-chart"
                style={{ height: "200px" }}
              ></div>
            </div>

            <div className="stats-grid" style={{ marginTop: "20px" }}>
              <div className="stat-card">
                <h4>Hurst Channel Settings</h4>
                <div className="stat-item">
                  <span>Period:</span>
                  <span>30</span>
                </div>
                <div className="stat-item">
                  <span>Upper Width:</span>
                  <span>1.16</span>
                </div>
                <div className="stat-item">
                  <span>Lower Width:</span>
                  <span>1.18</span>
                </div>
              </div>

              {showSignals && (
                <div className="stat-card">
                  <h4>Signal Statistics</h4>
                  <div className="stat-item">
                    <span>Entry Signals:</span>
                    <span>{entrySignals.length}</span>
                  </div>
                  <div className="stat-item">
                    <span>Exit Signals:</span>
                    <span>{exitSignals.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="data-table-tab">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Open</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Close</th>
                    <th>Volume</th>
                    {hurstData && <th>Hurst Oscillator</th>}
                    {showSignals && <th>Signal</th>}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr
                      key={row.index}
                      className={
                        row.signalType === "entry"
                          ? "entry-signal-row"
                          : row.signalType === "exit"
                          ? "exit-signal-row"
                          : ""
                      }
                    >
                      <td>
                        {row.date} {row.time}
                      </td>
                      <td>${row.open}</td>
                      <td>${row.high}</td>
                      <td>${row.low}</td>
                      <td>${row.close}</td>
                      <td>{row.volume}</td>
                      {hurstData && <td>{row.hurstOscillator}</td>}
                      {showSignals && (
                        <td>
                          {row.signalType === "entry" ? (
                            <span className="entry-signal">ENTRY</span>
                          ) : row.signalType === "exit" ? (
                            <span className="exit-signal">EXIT</span>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandleDataViewer;

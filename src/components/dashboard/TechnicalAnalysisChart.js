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
  Brush,
} from "recharts";
import "./TechnicalAnalysisChart.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api/v1";

const TechnicalAnalysisChart = ({ instance, isActive, onToggle }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [priceData, setPriceData] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [data15m, setData15m] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [data1h, setData1h] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [combinedData, setCombinedData] = useState([]);

  // Pobieranie parametrów z instancji
  const getInstanceParams = () => {
    if (!instance || !instance.strategy || !instance.strategy.parameters) {
      return {
        symbol: "BTCUSDT",
        hurst: {
          periods: 25,
          upperDeviationFactor: 1.4,
          lowerDeviationFactor: 1.8,
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
        upperDeviationFactor: 1.4,
        lowerDeviationFactor: 1.8,
        interval: "15m",
      },
      ema: instance.strategy.parameters.ema || {
        periods: 30,
        interval: "1h",
      },
    };
  };

  // Usprawniona funkcja do pobierania danych za określony okres
  const fetchCandleData = async (symbol, interval, startDate, endDate) => {
    try {
      setLoadingStatus(`Pobieranie danych ${interval} dla ${symbol}...`);

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token available");
        throw new Error("Brak tokenu autoryzacyjnego");
      }

      const url = `${API_BASE_URL}/market/klines/${symbol}/${interval}?startTime=${startDate.getTime()}&endTime=${endDate.getTime()}&limit=1000`;
      console.log(
        `Pobieranie danych dla zakresu: ${startDate.toLocaleString()} - ${endDate.toLocaleString()}`
      );

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

      if (!data) {
        console.error(`Empty response when fetching ${interval} data`);
        throw new Error(
          `Pusta odpowiedź podczas pobierania danych ${interval}`
        );
      }

      // Przygotuj dane w odpowiednim formacie
      const candles = data.candles || (Array.isArray(data) ? data : []);

      if (candles.length === 0) {
        console.error(`No candles found in ${interval} data`);
        throw new Error(`Brak świec w danych ${interval}`);
      }

      // Formatujemy dane dla wykresu Recharts
      const formattedData = candles.map((candle) => ({
        time: new Date(candle.openTime).getTime(),
        date: new Date(candle.openTime).toLocaleString(),
        price: parseFloat(candle.close),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
      }));

      console.log(`Processed ${formattedData.length} candles for ${interval}`);
      setLoadingStatus(`Pobrano ${formattedData.length} świec dla ${interval}`);

      return formattedData;
    } catch (err) {
      console.error(`Error fetching ${interval} data:`, err);
      setLoadingStatus(`Błąd: ${err.message}`);
      throw err;
    }
  };

  // Usprawnione pobieranie danych 1-minutowych z podziałem na mniejsze fragmenty
  const fetchAllMinuteData = async (symbol) => {
    try {
      // Aktualny czas
      const endDate = new Date();

      // Dokładnie 4 dni wstecz
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 4);
      startDate.setHours(0, 0, 0, 0);

      // Upewnij się, że mamy czas teraz (dla endDate) i dokładnie 4*24h wstecz (dla startDate)
      console.log(`Start date: ${startDate.toLocaleString()}`);
      console.log(`End date: ${endDate.toLocaleString()}`);

      setLoadingStatus("Pobieranie danych minutowych za 4 dni...");

      // W ciągu 4 dni mamy maksymalnie 4*24*60 = 5760 minut
      // Podzielmy ten okres na 8 fragmentów po 12 godzin (720 minut) każdy
      // Zapewni to, że każde zapytanie zwróci mniej niż 1000 świec
      const fragmentsCount = 8;
      const minutesPerFragment = (4 * 24 * 60) / fragmentsCount;
      const fragments = [];

      // Tworzenie fragmentów po 12 godzin
      for (let i = 0; i < fragmentsCount; i++) {
        const fragmentStart = new Date(startDate.getTime());
        fragmentStart.setMinutes(
          fragmentStart.getMinutes() + i * minutesPerFragment
        );

        const fragmentEnd = new Date(startDate.getTime());
        fragmentEnd.setMinutes(
          fragmentEnd.getMinutes() + (i + 1) * minutesPerFragment
        );

        // Dla ostatniego fragmentu upewnij się, że sięga do aktualnego czasu
        const actualEnd = i === fragmentsCount - 1 ? endDate : fragmentEnd;

        fragments.push({
          start: fragmentStart,
          end: actualEnd,
        });
      }

      let allCandles = [];

      // Dodaj opóźnienie między zapytaniami aby respektować limit 1 zapytanie/sekundę
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Pobierz dane dla każdego fragmentu sekwencyjnie z opóźnieniem 1 sekundy
      for (let i = 0; i < fragments.length; i++) {
        const fragment = fragments[i];

        setLoadingStatus(
          `Pobieranie pakietu ${i + 1}/${fragments.length} danych minutowych...`
        );
        console.log(
          `Przedział ${
            i + 1
          }: ${fragment.start.toLocaleString()} - ${fragment.end.toLocaleString()}`
        );

        try {
          const candles = await fetchCandleData(
            symbol,
            "1m",
            fragment.start,
            fragment.end
          );

          if (candles && candles.length > 0) {
            allCandles = [...allCandles, ...candles];
            console.log(
              `Dodano ${candles.length} świec z pakietu ${i + 1}. Łącznie: ${
                allCandles.length
              }`
            );
          }

          // Poczekaj 1 sekundę przed następnym zapytaniem
          if (i < fragments.length - 1) {
            await delay(1000);
          }
        } catch (err) {
          console.warn(`Błąd pobierania pakietu ${i + 1}: ${err.message}`);
          // Poczekaj 1 sekundę przed próbą pobrania kolejnego fragmentu
          await delay(1000);
        }
      }

      // Sortowanie i deduplikacja
      allCandles.sort((a, b) => a.time - b.time);

      // Deduplikacja po czasie
      const uniqueMap = new Map();
      const uniqueCandles = [];

      for (const candle of allCandles) {
        if (!uniqueMap.has(candle.time)) {
          uniqueMap.set(candle.time, true);
          uniqueCandles.push(candle);
        }
      }

      setLoadingStatus(
        `Pobrano łącznie ${uniqueCandles.length} unikalnych świec minutowych za 4 dni`
      );

      // Sprawdź czy pokrywamy pełne 4 dni
      if (uniqueCandles.length > 0) {
        const firstCandleTime = new Date(uniqueCandles[0].time);
        const lastCandleTime = new Date(
          uniqueCandles[uniqueCandles.length - 1].time
        );
        const daysCovered =
          (lastCandleTime - firstCandleTime) / (1000 * 60 * 60 * 24);

        console.log(
          `Zakres danych: ${firstCandleTime.toLocaleString()} - ${lastCandleTime.toLocaleString()}`
        );
        console.log(`Pokryte dni: ${daysCovered.toFixed(2)}`);
      }

      // Weryfikacja ciągłości danych - wykrywanie luk
      const minuteInMillis = 60 * 1000;
      let gapsCount = 0;

      for (let i = 1; i < uniqueCandles.length; i++) {
        const timeDiff = uniqueCandles[i].time - uniqueCandles[i - 1].time;
        if (timeDiff > minuteInMillis * 2) {
          // Jeśli przerwa większa niż 2 minuty
          gapsCount++;
          console.warn(
            `Znaleziono lukę w danych: ${new Date(
              uniqueCandles[i - 1].time
            ).toLocaleString()} -> ${new Date(
              uniqueCandles[i].time
            ).toLocaleString()}, różnica: ${timeDiff / minuteInMillis} minut`
          );
        }
      }

      if (gapsCount > 0) {
        console.warn(`Wykryto ${gapsCount} luk w danych minutowych`);
      }

      return uniqueCandles;
    } catch (err) {
      console.error("Error fetching all minute data:", err);
      setLoadingStatus(`Błąd pobierania danych: ${err.message}`);
      throw err;
    }
  };

  // Usprawnione pobieranie danych 15-minutowych
  const fetchAll15mData = async (symbol, startDate, endDate) => {
    try {
      setLoadingStatus(`Pobieranie danych 15m...`);

      // 15m ma maksymalnie (4 dni * 24 godziny * 4 świece na godzinę) = 384 świece
      // Podzielmy na 3 zapytania aby zapewnić dokładność i kompletność danych
      const timeRange = endDate.getTime() - startDate.getTime();
      const fragment1End = new Date(startDate.getTime() + timeRange / 3);
      const fragment2End = new Date(startDate.getTime() + (timeRange * 2) / 3);

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Pierwsze zapytanie
      const firstThird = await fetchCandleData(
        symbol,
        "15m",
        startDate,
        fragment1End
      );
      await delay(1000); // Czekaj 1 sekundę

      // Drugie zapytanie
      const secondThird = await fetchCandleData(
        symbol,
        "15m",
        fragment1End,
        fragment2End
      );
      await delay(1000); // Czekaj 1 sekundę

      // Trzecie zapytanie
      const lastThird = await fetchCandleData(
        symbol,
        "15m",
        fragment2End,
        endDate
      );

      // Łączymy wszystkie części
      let allCandles = [...firstThird, ...secondThird, ...lastThird];

      // Sortowanie i deduplikacja
      allCandles.sort((a, b) => a.time - b.time);

      // Deduplikacja po czasie
      const uniqueMap = new Map();
      const uniqueCandles = [];

      for (const candle of allCandles) {
        if (!uniqueMap.has(candle.time)) {
          uniqueMap.set(candle.time, true);
          uniqueCandles.push(candle);
        }
      }

      console.log(
        `Pobrano łącznie ${uniqueCandles.length} unikalnych świec 15m`
      );

      // Weryfikacja ciągłości danych
      const fifteenMinInMillis = 15 * 60 * 1000;
      let gapsCount = 0;

      for (let i = 1; i < uniqueCandles.length; i++) {
        const timeDiff = uniqueCandles[i].time - uniqueCandles[i - 1].time;
        if (timeDiff > fifteenMinInMillis * 2) {
          // Więcej niż 30 minut
          gapsCount++;
          console.warn(
            `Znaleziono lukę w danych 15m: ${new Date(
              uniqueCandles[i - 1].time
            ).toLocaleString()} -> ${new Date(
              uniqueCandles[i].time
            ).toLocaleString()}, różnica: ${
              timeDiff / fifteenMinInMillis
            } okresy 15m`
          );
        }
      }

      if (gapsCount > 0) {
        console.warn(`Wykryto ${gapsCount} luk w danych 15m`);
      }

      return uniqueCandles;
    } catch (err) {
      console.error("Error fetching 15m data:", err);
      setLoadingStatus(`Błąd pobierania danych 15m: ${err.message}`);
      throw err;
    }
  };

  // Usprawnione pobieranie danych godzinowych
  const fetchAll1hData = async (symbol, startDate, endDate) => {
    try {
      setLoadingStatus(`Pobieranie danych 1h...`);

      // 1h ma maksymalnie (4 dni * 24 godziny) = 96 świec
      // Podzielmy na 2 zapytania aby zapewnić dokładność
      const midPoint = new Date(
        startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2
      );

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Pierwsze zapytanie
      const firstHalf = await fetchCandleData(
        symbol,
        "1h",
        startDate,
        midPoint
      );
      await delay(1000); // Czekaj 1 sekundę

      // Drugie zapytanie
      const secondHalf = await fetchCandleData(symbol, "1h", midPoint, endDate);

      // Łączymy obie części
      let allCandles = [...firstHalf, ...secondHalf];

      // Sortowanie i deduplikacja
      allCandles.sort((a, b) => a.time - b.time);

      // Deduplikacja po czasie
      const uniqueMap = new Map();
      const uniqueCandles = [];

      for (const candle of allCandles) {
        if (!uniqueMap.has(candle.time)) {
          uniqueMap.set(candle.time, true);
          uniqueCandles.push(candle);
        }
      }

      console.log(
        `Pobrano łącznie ${uniqueCandles.length} unikalnych świec 1h`
      );

      // Weryfikacja ciągłości danych
      const hourInMillis = 60 * 60 * 1000;
      let gapsCount = 0;

      for (let i = 1; i < uniqueCandles.length; i++) {
        const timeDiff = uniqueCandles[i].time - uniqueCandles[i - 1].time;
        if (timeDiff > hourInMillis * 2) {
          // Więcej niż 2 godziny
          gapsCount++;
          console.warn(
            `Znaleziono lukę w danych 1h: ${new Date(
              uniqueCandles[i - 1].time
            ).toLocaleString()} -> ${new Date(
              uniqueCandles[i].time
            ).toLocaleString()}, różnica: ${timeDiff / hourInMillis} godziny`
          );
        }
      }

      if (gapsCount > 0) {
        console.warn(`Wykryto ${gapsCount} luk w danych 1h`);
      }

      return uniqueCandles;
    } catch (err) {
      console.error("Error fetching 1h data:", err);
      setLoadingStatus(`Błąd pobierania danych 1h: ${err.message}`);
      throw err;
    }
  };

  // Pobieranie rzeczywistych transakcji
  // Pobieranie rzeczywistych transakcji
  // Znajdź funkcję fetchTransactions i zmodyfikuj ją tak:
  const fetchTransactions = async (instanceId) => {
    try {
      setLoadingStatus("Pobieranie historii transakcji...");
      console.log("Pobieranie transakcji dla instanceId:", instanceId);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Brak tokenu autoryzacyjnego");
      }

      // Najpierw spróbujmy pobrać dane z historii pozycji (zamknięte pozycje)
      const positionsUrl = `${API_BASE_URL}/signals/positions/history?instanceId=${instanceId}`;
      console.log(`Fetching position history from:`, positionsUrl);

      const positionsResponse = await fetch(positionsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Pokaż szczegóły odpowiedzi HTTP
      console.log(
        "Position history response status:",
        positionsResponse.status
      );

      let positions = [];

      if (positionsResponse.ok) {
        // Pobierz surową odpowiedź i pokaż ją
        const rawText = await positionsResponse.text();
        console.log("Raw API response:", rawText);

        if (rawText && rawText.trim() !== "") {
          try {
            const positionsData = JSON.parse(rawText);
            console.log("Parsed positions data:", positionsData);

            // Obsługa obu formatów API (tablica lub obiekt z tablicą history)
            positions = Array.isArray(positionsData)
              ? positionsData
              : positionsData.history
              ? positionsData.history
              : [];
          } catch (e) {
            console.error("Error parsing positions data:", e);
          }
        }
      }

      // Jeśli nie znaleziono pozycji, spróbuj pobrać sygnały i zrekonstruować transakcje
      if (!positions || positions.length === 0) {
        console.log("No positions found, trying to fetch signals...");

        // Pobierz sygnały dla tej instancji (zarówno wejścia jak i wyjścia)
        const signalsUrl = `${API_BASE_URL}/signals/instance/${instanceId}`;
        const signalsResponse = await fetch(signalsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (signalsResponse.ok) {
          const signalsData = await signalsResponse.json();
          console.log("Fetched signals:", signalsData);

          if (
            signalsData &&
            signalsData.signals &&
            signalsData.signals.length > 0
          ) {
            // Zrekonstruuj transakcje z sygnałów
            const entrySignals = signalsData.signals.filter(
              (s) => s.type === "entry" && s.status === "executed"
            );

            const exitSignals = signalsData.signals.filter(
              (s) => s.type === "exit" && s.status === "executed"
            );

            console.log(
              `Found ${entrySignals.length} entry signals and ${exitSignals.length} exit signals`
            );

            // Grupuj według ID pozycji
            const positionMap = new Map();

            // Dodaj wszystkie sygnały wejścia
            for (const signal of entrySignals) {
              if (signal.positionId) {
                if (!positionMap.has(signal.positionId)) {
                  positionMap.set(signal.positionId, {
                    positionId: signal.positionId,
                    entries: [],
                    exits: [],
                  });
                }

                positionMap.get(signal.positionId).entries.push({
                  signalId: signal._id,
                  price: signal.price,
                  timestamp: signal.timestamp,
                  allocation: signal.allocation,
                  amount: signal.amount,
                  subType: signal.subType,
                });
              }
            }

            // Dodaj sygnały wyjścia
            for (const signal of exitSignals) {
              if (signal.positionId && positionMap.has(signal.positionId)) {
                positionMap.get(signal.positionId).exits.push({
                  signalId: signal._id,
                  price: signal.price,
                  timestamp: signal.timestamp,
                  profit: signal.profit,
                  profitPercent: signal.profitPercent,
                });
              }
            }

            console.log(
              "Reconstructed positions:",
              Array.from(positionMap.values())
            );

            // Konwertuj na format pozycji
            positions = Array.from(positionMap.values()).map((pos) => {
              // Sortuj wejścia według timestamp
              pos.entries.sort((a, b) => a.timestamp - b.timestamp);

              // Weź najwcześniejsze wejście jako główne
              const firstEntry = pos.entries[0];

              // Weź ostatnie wyjście (jeśli istnieje)
              const lastExit =
                pos.exits.length > 0
                  ? pos.exits.sort((a, b) => b.timestamp - a.timestamp)[0]
                  : null;

              return {
                _id: pos.positionId,
                positionId: pos.positionId,
                entryTime: firstEntry ? firstEntry.timestamp : null,
                entryPrice: firstEntry ? firstEntry.price : null,
                exitTime: lastExit ? lastExit.timestamp : null,
                exitPrice: lastExit ? lastExit.price : null,
                profit: lastExit ? lastExit.profit : null,
                profitPercent: lastExit ? lastExit.profitPercent : null,
                entries: pos.entries,
                status: lastExit ? "CLOSED" : "OPEN",
              };
            });
          }
        }
      }

      if (!positions || positions.length === 0) {
        console.warn("No transactions found after all attempts");
        return [];
      }

      // Mapuj pozycje na format wykresu
      const mappedTransactions = positions.map((position) => {
        // Oblicz średnią cenę wejścia, jeśli nie jest dostępna bezpośrednio
        let entryPrice = position.entryPrice;
        if (!entryPrice && position.entries && position.entries.length > 0) {
          const totalAllocation = position.entries.reduce(
            (sum, entry) => sum + (entry.allocation || 0),
            0
          );
          const weightedSum = position.entries.reduce(
            (sum, entry) => sum + (entry.price * (entry.allocation || 0) || 0),
            0
          );
          entryPrice = totalAllocation > 0 ? weightedSum / totalAllocation : 0;
        }

        return {
          id: position._id || position.positionId || `pos-${Math.random()}`,
          openTime: position.entryTime ? Number(position.entryTime) : null, // Konwersja na liczbę
          closeTime: position.exitTime ? Number(position.exitTime) : null, // Konwersja na liczbę
          type:
            position.entries && position.entries.length > 0
              ? position.entries[0].subType || "unknown"
              : "unknown",
          openPrice: entryPrice ? Number(entryPrice) : null, // Konwersja na liczbę
          closePrice: position.exitPrice ? Number(position.exitPrice) : null, // Konwersja na liczbę
          status: position.status || (position.exitTime ? "CLOSED" : "OPEN"),
        };
      });

      console.log("Final transactions to display:", mappedTransactions);
      return mappedTransactions;
    } catch (err) {
      console.error("Error in transaction processing:", err);
      setLoadingStatus(`Błąd pobierania transakcji: ${err.message}`);
      return [];
    }
  };
  // Funkcja formatująca datę na osi X
  const formatXAxis = (timestamp) => {
    if (!timestamp) return "";
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

  // Format liczb na osi Y
  const formatYAxis = (price) => {
    if (typeof price !== "number") return "";
    if (price > 1000) {
      return price.toFixed(0);
    } else if (price > 100) {
      return price.toFixed(2);
    } else {
      return price.toFixed(4);
    }
  };

  // Format dla tooltipa
  const formatTooltip = (value, name) => {
    if (name === "price" && typeof value === "number") {
      return [`${value.toFixed(2)} USD`, "Cena"];
    } else if (name.includes("Hurst") && typeof value === "number") {
      return [`${value.toFixed(2)} USD`, name];
    } else if (name.includes("EMA") && typeof value === "number") {
      return [`${value.toFixed(2)} USD`, name];
    }
    return [value, name];
  };

  // Usprawnione obliczenie kanału Hursta
  const calculateHurstChannel = (data, params) => {
    try {
      setLoadingStatus(
        `Obliczanie kanału Hursta (periods: ${params.periods})...`
      );

      if (!data || data.length < params.periods) {
        console.warn(
          `Za mało danych do obliczenia kanału Hursta: ${data?.length} < ${params.periods}`
        );
        return { upper: [], lower: [], middle: [] };
      }

      // Obliczanie średniej kroczącej
      const movingAvg = [];
      for (let i = params.periods - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < params.periods; j++) {
          sum += data[i - j].close;
        }
        const avg = sum / params.periods;
        movingAvg.push({
          time: data[i].time,
          value: avg,
        });
      }

      // Obliczanie odchylenia standardowego
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
          value: stdDev,
        });
      }

      // Tworzenie górnej i dolnej bandy
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

      console.log(`Obliczono kanał Hursta: ${upper.length} punktów`);
      return { upper, lower, middle: movingAvg };
    } catch (err) {
      console.error("Error calculating Hurst channel:", err);
      setLoadingStatus(`Błąd obliczania kanału Hursta: ${err.message}`);
      return { upper: [], lower: [], middle: [] };
    }
  };

  // Obliczenie EMA
  const calculateEMA = (data, periods) => {
    try {
      setLoadingStatus(`Obliczanie EMA(${periods})...`);

      if (!data || data.length < periods) {
        console.warn(
          `Za mało danych do obliczenia EMA: ${data?.length} < ${periods}`
        );
        return [];
      }

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
        value: firstEMA,
      });

      // Obliczanie kolejnych EMA
      for (let i = periods; i < data.length; i++) {
        const currentEMA =
          data[i].close * k + emaResults[emaResults.length - 1].value * (1 - k);
        emaResults.push({
          time: data[i].time,
          value: currentEMA,
        });
      }

      console.log(`Obliczono EMA(${periods}): ${emaResults.length} punktów`);
      return emaResults;
    } catch (err) {
      console.error("Error calculating EMA:", err);
      setLoadingStatus(`Błąd obliczania EMA: ${err.message}`);
      return [];
    }
  };

  // Usprawniona interpolacja dla wskaźników z lepszą obsługą luk
  const interpolateIndicatorValues = (minuteData, indicatorData) => {
    if (
      !indicatorData ||
      indicatorData.length === 0 ||
      !minuteData ||
      minuteData.length === 0
    ) {
      return [];
    }

    const indicatorMap = new Map();
    const result = new Array(minuteData.length);

    // Indeksujemy punkty wskaźnika według czasu dla szybkiego dostępu
    indicatorData.forEach((point) => {
      indicatorMap.set(point.time, point.value);
    });

    // Sortujemy punkty wskaźnika według czasu
    const sortedIndicatorPoints = [...indicatorData].sort(
      (a, b) => a.time - b.time
    );

    // Zakres czasowy wskaźnika
    const indicatorStartTime = sortedIndicatorPoints[0].time;
    const indicatorEndTime =
      sortedIndicatorPoints[sortedIndicatorPoints.length - 1].time;

    // Dla każdego punktu danych minutowych
    for (let i = 0; i < minuteData.length; i++) {
      const currentTime = minuteData[i].time;

      // Jeśli czas jest poza zakresem wskaźnika, pomijamy
      if (currentTime < indicatorStartTime || currentTime > indicatorEndTime) {
        result[i] = null;
        continue;
      }

      // Jeśli mamy dokładne dopasowanie, używamy tej wartości
      if (indicatorMap.has(currentTime)) {
        result[i] = indicatorMap.get(currentTime);
        continue;
      }

      // W przeciwnym razie szukamy dwóch najbliższych punktów dla interpolacji
      let beforeIndex = -1;
      let afterIndex = -1;

      // Znajdź najbliższy punkt przed
      for (let j = 0; j < sortedIndicatorPoints.length; j++) {
        if (sortedIndicatorPoints[j].time <= currentTime) {
          beforeIndex = j;
        } else {
          break;
        }
      }

      // Znajdź najbliższy punkt po
      for (let j = 0; j < sortedIndicatorPoints.length; j++) {
        if (sortedIndicatorPoints[j].time >= currentTime) {
          afterIndex = j;
          break;
        }
      }

      // Jeśli mamy punkty przed i po, interpolujemy
      if (beforeIndex !== -1 && afterIndex !== -1) {
        const beforePoint = sortedIndicatorPoints[beforeIndex];
        const afterPoint = sortedIndicatorPoints[afterIndex];

        // Sprawdzamy czy punkty nie są zbyt oddalone (max 2 okresy wskaźnika)
        const maxTimeGap = afterPoint.time - beforePoint.time;
        const expectedInterval = getExpectedInterval(indicatorData);

        if (maxTimeGap <= expectedInterval * 2) {
          // Interpolacja liniowa
          const ratio =
            (currentTime - beforePoint.time) /
            (afterPoint.time - beforePoint.time);
          result[i] =
            beforePoint.value + (afterPoint.value - beforePoint.value) * ratio;
        } else {
          // Jeśli dystans jest za duży, używamy najbliższego punktu
          result[i] =
            currentTime - beforePoint.time < afterPoint.time - currentTime
              ? beforePoint.value
              : afterPoint.value;
        }
      }
      // Jeśli mamy tylko punkt przed lub tylko punkt po, używamy go
      else if (beforeIndex !== -1) {
        result[i] = sortedIndicatorPoints[beforeIndex].value;
      } else if (afterIndex !== -1) {
        result[i] = sortedIndicatorPoints[afterIndex].value;
      } else {
        result[i] = null;
      }
    }

    return result;
  };

  // Pomocnicza funkcja do określenia oczekiwanego interwału na podstawie danych
  const getExpectedInterval = (data) => {
    if (!data || data.length < 2) return 60 * 60 * 1000; // Domyślnie 1 godzina

    // Znajdź medianę różnic czasowych
    const timeDiffs = [];
    for (let i = 1; i < data.length; i++) {
      const diff = data[i].time - data[i - 1].time;
      if (diff > 0) timeDiffs.push(diff);
    }

    if (timeDiffs.length === 0) return 60 * 60 * 1000;

    // Sortuj różnice i wybierz medianę
    timeDiffs.sort((a, b) => a - b);
    const medianIndex = Math.floor(timeDiffs.length / 2);
    return timeDiffs[medianIndex];
  };

  // Funkcja pomocnicza do znajdowania najbliższego punktu czasowego
  const findClosestTimeIndex = (data, targetTime) => {
    if (!data || data.length === 0) return -1;

    let closestIndex = 0;
    let minDiff = Math.abs(data[0].time - targetTime);

    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i].time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  };

  // Usprawniona funkcja do łączenia danych
  // Usprawniona funkcja do łączenia danych
  const createCombinedData = (
    minuteData,
    hurstUpper,
    hurstLower,
    emaData,
    transactionsData
  ) => {
    try {
      setLoadingStatus("Łączenie danych z różnych źródeł...");

      if (!minuteData || minuteData.length === 0) {
        console.warn("Brak danych minutowych do połączenia");
        return [];
      }

      console.log(
        `Łączenie ${
          minuteData.length
        } punktów danych minutowych z wskaźnikami i ${
          transactionsData?.length || 0
        } transakcjami`
      );

      // Dane minutowe jako podstawa - są zachowane 1:1
      const combined = minuteData.map((point) => ({
        ...point, // Zachowujemy wszystkie oryginalne dane
        price: point.close, // Ustawiamy cenę jako cenę zamknięcia do wykresu
      }));

      // Interpolujemy wartości wskaźników do danych minutowych
      const interpolatedHurstUpper = interpolateIndicatorValues(
        minuteData,
        hurstUpper
      );
      const interpolatedHurstLower = interpolateIndicatorValues(
        minuteData,
        hurstLower
      );
      const interpolatedEMA = interpolateIndicatorValues(minuteData, emaData);

      // Dodajemy zinterpolowane wartości do danych
      for (let i = 0; i < combined.length; i++) {
        if (interpolatedHurstUpper[i] !== null) {
          combined[i].hurstUpper = interpolatedHurstUpper[i];
        }

        if (interpolatedHurstLower[i] !== null) {
          combined[i].hurstLower = interpolatedHurstLower[i];
        }

        if (interpolatedEMA[i] !== null) {
          combined[i].ema = interpolatedEMA[i];
        }
      }

      // Dodaj markery transakcji do najbliższych punktów w czasie
      if (transactionsData && transactionsData.length > 0) {
        console.log(
          "Dodawanie markerów transakcji do danych:",
          transactionsData
        );

        // Dla każdej transakcji znajdź najbliższy punkt danych minutowych
        transactionsData.forEach((tx) => {
          // Dodaj marker wejścia
          if (tx.openTime) {
            const closestEntryIndex = findClosestTimeIndex(
              combined,
              tx.openTime
            );
            if (closestEntryIndex !== -1) {
              combined[closestEntryIndex].entryMarker = true;
              combined[closestEntryIndex].entryPrice = tx.openPrice;
              combined[closestEntryIndex].entryType = tx.type || "unknown";
              combined[closestEntryIndex].entryId = tx.id;
              console.log(
                `Dodano marker wejścia (${tx.type}) przy cenie ${
                  tx.openPrice
                } w czasie ${new Date(tx.openTime).toLocaleString()}`
              );
            }
          }

          // Dodaj marker wyjścia
          if (tx.closeTime) {
            const closestExitIndex = findClosestTimeIndex(
              combined,
              tx.closeTime
            );
            if (closestExitIndex !== -1) {
              combined[closestExitIndex].exitMarker = true;
              combined[closestExitIndex].exitPrice = tx.closePrice;
              combined[closestExitIndex].exitId = tx.id;
              console.log(
                `Dodano marker wyjścia przy cenie ${
                  tx.closePrice
                } w czasie ${new Date(tx.closeTime).toLocaleString()}`
              );
            }
          }
        });
      }

      // Sprawdzamy pokrycie wskaźnikami
      const hurstUpperCount = combined.filter(
        (p) => p.hurstUpper !== undefined
      ).length;
      const hurstLowerCount = combined.filter(
        (p) => p.hurstLower !== undefined
      ).length;
      const emaCount = combined.filter((p) => p.ema !== undefined).length;
      const entryMarkerCount = combined.filter((p) => p.entryMarker).length;
      const exitMarkerCount = combined.filter((p) => p.exitMarker).length;

      console.log(
        `Pokrycie wskaźnikami: HurstUpper ${hurstUpperCount}/${combined.length}, HurstLower ${hurstLowerCount}/${combined.length}, EMA ${emaCount}/${combined.length}, EntryMarkers: ${entryMarkerCount}, ExitMarkers: ${exitMarkerCount}`
      );
      console.log(
        `Pokrycie wskaźnikami: HurstUpper ${hurstUpperCount}/${combined.length}, HurstLower ${hurstLowerCount}/${combined.length}, EMA ${emaCount}/${combined.length}, EntryMarkers: ${entryMarkerCount}, ExitMarkers: ${exitMarkerCount}`
      );
      if (transactionsData && transactionsData.length > 0) {
        console.log("=== DIAGNOSTYKA TRANSAKCJI ===");
        console.log(
          "Zakres czasowy świec:",
          new Date(combined[0].time).toLocaleString(),
          "do",
          new Date(combined[combined.length - 1].time).toLocaleString()
        );

        transactionsData.forEach((tx, index) => {
          console.log(`Transakcja ${index + 1} (${tx.id}):`);
          console.log(
            `- Wejście: ${
              tx.openTime ? new Date(tx.openTime).toLocaleString() : "brak"
            }, cena: ${tx.openPrice}`
          );
          console.log(
            `- Wyjście: ${
              tx.closeTime ? new Date(tx.closeTime).toLocaleString() : "brak"
            }, cena: ${tx.closePrice}`
          );

          if (tx.openTime) {
            const openIndex = findClosestTimeIndex(combined, tx.openTime);
            console.log(`- Indeks wejścia: ${openIndex}`);
            if (openIndex !== -1) {
              console.log(
                `  Czas znalezionego punktu: ${new Date(
                  combined[openIndex].time
                ).toLocaleString()}`
              );
              console.log(
                `  Czy ma flagę entryMarker?: ${
                  combined[openIndex].entryMarker ? "TAK" : "NIE"
                }`
              );
            }
          }

          if (tx.closeTime) {
            const closeIndex = findClosestTimeIndex(combined, tx.closeTime);
            console.log(`- Indeks wyjścia: ${closeIndex}`);
            if (closeIndex !== -1) {
              console.log(
                `  Czas znalezionego punktu: ${new Date(
                  combined[closeIndex].time
                ).toLocaleString()}`
              );
              console.log(
                `  Czy ma flagę exitMarker?: ${
                  combined[closeIndex].exitMarker ? "TAK" : "NIE"
                }`
              );
            }
          }

          // Sprawdź czy transakcja jest w zakresie czasowym wykresu
          const inTimeRange =
            tx.openTime >= combined[0].time &&
            tx.openTime <= combined[combined.length - 1].time;
          console.log(
            `- Czy w zakresie czasowym wykresu?: ${inTimeRange ? "TAK" : "NIE"}`
          );
        });
        console.log("==============================");
      }

      return combined;
    } catch (err) {
      console.error("Error combining data:", err);
      setLoadingStatus(`Błąd łączenia danych: ${err.message}`);
      return [];
    }
  };

  // Główna funkcja inicjalizacji wykresu
  const initializeChart = async () => {
    if (!isActive) return;

    setLoading(true);
    setError(null);
    setPriceData([]);
    setData15m([]);
    setData1h([]);
    setTransactions([]);
    setCombinedData([]);
    setLoadingStatus("Inicjalizacja wykresu...");

    try {
      // Pobierz parametry
      const params = getInstanceParams();
      console.log("Instance parameters:", params);

      // Ustaw wspólny zakres dat dla wszystkich zapytań
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 4); // Pobieramy dokładnie 4 dni

      setLoadingStatus("Pobieranie danych dla wszystkich interwałów...");

      // Pobierz dane wszystkich trzech interwałów i transakcje równolegle
      const [minuteData, data15mResult, data1hResult, txData] =
        await Promise.all([
          fetchAllMinuteData(params.symbol),
          fetchAll15mData(params.symbol, startDate, endDate),
          fetchAll1hData(params.symbol, startDate, endDate),
          fetchTransactions(
            instance?.instanceId || instance?.id || instance?._id
          ),
        ]);

      if (!minuteData || minuteData.length === 0) {
        throw new Error("Nie udało się pobrać danych minutowych");
      }

      // Zapisz pobrane dane
      setPriceData(minuteData);
      setData15m(data15mResult);
      setData1h(data1hResult);
      setTransactions(txData);

      setLoadingStatus("Obliczanie wskaźników technicznych...");

      // Oblicz kanał Hursta na danych 15-minutowych
      const hurstChannel = calculateHurstChannel(data15mResult, {
        periods: params.hurst.periods,
        upperDeviationFactor: params.hurst.upperDeviationFactor,
        lowerDeviationFactor: params.hurst.lowerDeviationFactor,
      });

      // Oblicz EMA na danych godzinowych
      const emaResult = calculateEMA(data1hResult, params.ema.periods);

      setLoadingStatus("Synchronizacja danych...");

      // Połącz wszystkie dane w jeden zestaw - minutowe dane jako podstawa
      const combinedResult = createCombinedData(
        minuteData,
        hurstChannel.upper,
        hurstChannel.lower,
        emaResult,
        txData // Dodane dane transakcji
      );

      // Zapisz dane w stanie komponentu
      setCombinedData(combinedResult);

      setLoading(false);
      setLoadingStatus(
        `Wykres załadowany: ${minuteData.length} świec, ${data15mResult.length} świec 15m, ${data1hResult.length} świec 1h`
      );
    } catch (err) {
      console.error("Error initializing chart:", err);
      setError(err.message);
      setLoadingStatus(`Błąd: ${err.message}`);
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isActive) {
      initializeChart();
    }

    // Czyszczenie przy odmontowaniu
    return () => {
      // Żadnych operacji czyszczenia nie jest potrzebnych dla Recharts
    };
  }, [isActive, instance]);
  /* eslint-enable react-hooks/exhaustive-deps */
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

  // Pobierz parametry dla wyświetlenia
  const params = getInstanceParams();
  useEffect(() => {
    if (combinedData.length > 0) {
      console.log("BEZPOŚREDNIO PRZED RENDEROWANIEM WYKRESU:", {
        czyTransakcjeIstnieją: transactions && transactions.length > 0,
        ilośćTransakcji: transactions ? transactions.length : 0,
        pierwszaTransakcja:
          transactions && transactions.length > 0
            ? {
                openTime: transactions[0].openTime,
                openDate: new Date(transactions[0].openTime).toLocaleString(),
              }
            : null,
        zakresWykresu: {
          start: new Date(combinedData[0].time).toLocaleString(),
          koniec: new Date(
            combinedData[combinedData.length - 1].time
          ).toLocaleString(),
        },
      });
    }
  }, [combinedData, transactions]);
  // Główny widok wykresu
  return (
    <div className="technical-analysis-chart">
      <div className="chart-controls">
        <div className="control-group">
          <span>Symbol: {params.symbol}</span>
          <span>
            Kanał Hursta: {params.hurst.periods} ({params.hurst.interval})
          </span>
          <span>
            EMA: {params.ema.periods} ({params.ema.interval})
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

        <div className="tradingview-chart">
          {combinedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={combinedData}
                margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: 12, fill: "#aaa" }}
                  stroke="#555"
                  minTickGap={50}
                  height={50}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 12, fill: "#aaa" }}
                  stroke="#555"
                  width={60}
                />
                <Tooltip
                  labelFormatter={(label) => formatXAxis(label)}
                  formatter={formatTooltip}
                  contentStyle={{
                    backgroundColor: "#1E1E1E",
                    border: "1px solid #30363d",
                  }}
                />
                <Legend />

                {/* Kanał Hursta - dolna banda */}
                <Line
                  type="monotone"
                  dataKey="hurstLower"
                  name={`Hurst Lower (${params.hurst.periods})`}
                  stroke="#F44336"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  isAnimationActive={false}
                  connectNulls={true}
                />

                {/* EMA */}
                <Line
                  type="monotone"
                  dataKey="ema"
                  name={`EMA (${params.ema.periods})`}
                  stroke="#FF9800"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  connectNulls={true}
                />
                {/* Linia ceny */}
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Cena"
                  stroke="#2196f3"
                  strokeWidth={1.5}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                  connectNulls={true}
                />

                {/* Kanał Hursta - górna banda */}
                <Line
                  type="monotone"
                  dataKey="hurstUpper"
                  name={`Hurst Upper (${params.hurst.periods})`}
                  stroke="#4CAF50"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  isAnimationActive={false}
                  connectNulls={true}
                />

                {transactions && transactions.length > 0 ? (
                  transactions.map((tx, i) => {
                    console.log(`Renderowanie transakcji ${i}:`, {
                      id: tx.id,
                      openTime: tx.openTime,
                      openDate: tx.openTime
                        ? new Date(tx.openTime).toLocaleString()
                        : "brak",
                      closeTime: tx.closeTime,
                      closeDate: tx.closeTime
                        ? new Date(tx.closeTime).toLocaleString()
                        : "brak",
                      type: tx.type,
                    });
                    return (
                      <React.Fragment key={tx.id}>
                        {/* Marker otwarcia transakcji */}
                        {tx.openTime && (
                          <ReferenceLine
                            x={tx.openTime}
                            stroke="#FF0000" // Jaskrawy czerwony
                            strokeWidth={4} // Bardzo gruba linia
                            strokeDasharray="5 5"
                            isFront={true} // Próba wymuszenia renderowania na wierzchu
                            label={{
                              value: `WEJŚCIE (${tx.type || "unknown"}) @ ${
                                tx.openPrice ? tx.openPrice.toFixed(2) : "?"
                              }`,
                              position: "insideTopLeft",
                              fill: "#FFFFFF", // Biały tekst
                              fontSize: 16, // Większa czcionka
                              fontWeight: "bold",
                              backgroundColor: "#FF0000", // Czerwone tło
                            }}
                          />
                        )}

                        {/* Marker zamknięcia transakcji (jeśli istnieje) */}
                        {tx.closeTime && (
                          <ReferenceLine
                            x={tx.closeTime}
                            stroke="#0000FF" // Jaskrawy niebieski
                            strokeWidth={4} // Bardzo gruba linia
                            strokeDasharray="5 5"
                            isFront={true} // Próba wymuszenia renderowania na wierzchu
                            label={{
                              value: `WYJŚCIE @ ${
                                tx.closePrice ? tx.closePrice.toFixed(2) : "?"
                              }`,
                              position: "insideTopRight",
                              fill: "#FFFFFF", // Biały tekst
                              fontSize: 16, // Większa czcionka
                              fontWeight: "bold",
                              backgroundColor: "#0000FF", // Niebieskie tło
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <React.Fragment></React.Fragment>
                )}
                {/* Suwak do przewijania */}
                <Brush
                  dataKey="time"
                  height={40}
                  stroke="#555"
                  fill="#30363d"
                  tickFormatter={formatXAxis}
                  travellerWidth={10}
                  startIndex={0}
                  endIndex={combinedData.length - 1}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            !loading && (
              <div className="no-data-message">
                <p>Brak danych do wyświetlenia</p>
              </div>
            )
          )}
        </div>
      </div>

      <div className="chart-footer">
        <button onClick={onToggle} className="hide-chart-btn">
          Ukryj wykres
        </button>
        <div className="status-message">
          <small>
            {loadingStatus}
            {combinedData.length > 0 && !loading && (
              <>
                {" "}
                | Górny dewiator: {params.hurst.upperDeviationFactor} | Dolny
                dewiator: {params.hurst.lowerDeviationFactor}
              </>
            )}
          </small>
        </div>
      </div>
    </div>
  );
};

export default TechnicalAnalysisChart;

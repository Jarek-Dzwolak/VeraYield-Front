import React, { useState, useEffect, useRef } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import "./TechnicalAnalysisChart.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api/v1";

const TechnicalAnalysisChart = ({ instance, isActive, onToggle }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");

  // Refs dla wykresu
  const chartContainerRef = useRef();
  const chartInstanceRef = useRef(null);
  const seriesRefs = useRef({
    price: null,
    hurstUpper: null,
    hurstLower: null,
    ema: null,
    markers: null,
  });

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

      // Formatujemy dane dla wykresu
      const formattedData = candles.map((candle) => ({
        time: new Date(candle.openTime).getTime() / 1000, // TradingView używa timestamp w sekundach
        date: new Date(candle.openTime).toLocaleString(),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        value: parseFloat(candle.close), // Dodajemy property 'value' dla linii
        volume: parseFloat(candle.volume),
        originalTime: new Date(candle.openTime).getTime(), // Zachowujemy oryginalny timestamp w ms
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
        const firstCandleTime = new Date(uniqueCandles[0].originalTime);
        const lastCandleTime = new Date(
          uniqueCandles[uniqueCandles.length - 1].originalTime
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
        const timeDiff =
          uniqueCandles[i].originalTime - uniqueCandles[i - 1].originalTime;
        if (timeDiff > minuteInMillis * 2) {
          // Jeśli przerwa większa niż 2 minuty
          gapsCount++;
          console.warn(
            `Znaleziono lukę w danych: ${new Date(
              uniqueCandles[i - 1].originalTime
            ).toLocaleString()} -> ${new Date(
              uniqueCandles[i].originalTime
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
        const timeDiff =
          uniqueCandles[i].originalTime - uniqueCandles[i - 1].originalTime;
        if (timeDiff > fifteenMinInMillis * 2) {
          // Więcej niż 30 minut
          gapsCount++;
          console.warn(
            `Znaleziono lukę w danych 15m: ${new Date(
              uniqueCandles[i - 1].originalTime
            ).toLocaleString()} -> ${new Date(
              uniqueCandles[i].originalTime
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
        const timeDiff =
          uniqueCandles[i].originalTime - uniqueCandles[i - 1].originalTime;
        if (timeDiff > hourInMillis * 2) {
          // Więcej niż 2 godziny
          gapsCount++;
          console.warn(
            `Znaleziono lukę w danych 1h: ${new Date(
              uniqueCandles[i - 1].originalTime
            ).toLocaleString()} -> ${new Date(
              uniqueCandles[i].originalTime
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
          openTime: position.entryTime ? Number(position.entryTime) : null,
          closeTime: position.exitTime ? Number(position.exitTime) : null,
          type:
            position.entries && position.entries.length > 0
              ? position.entries[0].subType || "unknown"
              : "unknown",
          openPrice: entryPrice ? Number(entryPrice) : null,
          closePrice: position.exitPrice ? Number(position.exitPrice) : null,
          status: position.status || (position.exitTime ? "CLOSED" : "OPEN"),
        };
      });

      // Dodatkowe informacje o transakcjach
      console.log("Final transactions to display:", mappedTransactions);

      if (mappedTransactions.length > 0) {
        console.log("SZCZEGÓŁY TRANSAKCJI:", {
          liczbaTransakcji: mappedTransactions.length,
          pierwszaTransakcja: {
            id: mappedTransactions[0].id,
            openTime: mappedTransactions[0].openTime,
            openTimeDate: new Date(
              mappedTransactions[0].openTime
            ).toLocaleString(),
            closeTime: mappedTransactions[0].closeTime,
            closeTimeDate: mappedTransactions[0].closeTime
              ? new Date(mappedTransactions[0].closeTime).toLocaleString()
              : "brak",
            type: mappedTransactions[0].type,
          },
        });
      }

      return mappedTransactions;
    } catch (err) {
      console.error("Error in transaction processing:", err);
      setLoadingStatus(`Błąd pobierania transakcji: ${err.message}`);
      return [];
    }
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
          originalTime: data[i].originalTime,
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
          originalTime: data[i].originalTime,
        });
      }

      // Tworzenie górnej i dolnej bandy
      const upper = movingAvg.map((point, index) => ({
        time: point.time,
        value:
          point.value + deviations[index].value * params.upperDeviationFactor,
        originalTime: point.originalTime,
      }));

      const lower = movingAvg.map((point, index) => ({
        time: point.time,
        value:
          point.value - deviations[index].value * params.lowerDeviationFactor,
        originalTime: point.originalTime,
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
        originalTime: data[periods - 1].originalTime,
      });

      // Obliczanie kolejnych EMA
      for (let i = periods; i < data.length; i++) {
        const currentEMA =
          data[i].close * k + emaResults[emaResults.length - 1].value * (1 - k);
        emaResults.push({
          time: data[i].time,
          value: currentEMA,
          originalTime: data[i].originalTime,
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

  // Funkcja pomocnicza do znajdowania najbliższego punktu czasowego
  const findClosestTimeIndex = (data, targetTime) => {
    if (!data || data.length === 0) return -1;

    let closestIndex = 0;
    let minDiff = Math.abs(data[0].originalTime - targetTime);

    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i].originalTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  };

  // Funkcja do przygotowania markerów transakcji dla wykresu
  const prepareTransactionMarkers = (minuteData, transactionsData) => {
    if (
      !transactionsData ||
      transactionsData.length === 0 ||
      !minuteData ||
      minuteData.length === 0
    ) {
      return [];
    }

    const markers = [];

    // Dla każdej transakcji
    transactionsData.forEach((tx) => {
      if (tx.openTime) {
        const closestEntryIndex = findClosestTimeIndex(minuteData, tx.openTime);
        if (closestEntryIndex !== -1) {
          const candle = minuteData[closestEntryIndex];
          markers.push({
            time: candle.time,
            position: "belowBar",
            color: "#4CAF50",
            shape: "arrowUp",
            text: `WEJŚCIE (${tx.type || "unknown"}) @ ${
              tx.openPrice?.toFixed(2) || "?"
            }`,
            id: `entry-${tx.id}`,
            size: 2,
          });
          console.log(
            `Dodano marker wejścia (${tx.type}) przy cenie ${
              tx.openPrice
            } w czasie ${new Date(tx.openTime).toLocaleString()}`
          );
        }
      }

      if (tx.closeTime) {
        const closestExitIndex = findClosestTimeIndex(minuteData, tx.closeTime);
        if (closestExitIndex !== -1) {
          const candle = minuteData[closestExitIndex];
          markers.push({
            time: candle.time,
            position: "aboveBar",
            color: "#FF9800",
            shape: "arrowDown",
            text: `WYJŚCIE @ ${tx.closePrice?.toFixed(2) || "?"}`,
            id: `exit-${tx.id}`,
            size: 2,
          });
          console.log(
            `Dodano marker wyjścia przy cenie ${
              tx.closePrice
            } w czasie ${new Date(tx.closeTime).toLocaleString()}`
          );
        }
      }
    });

    return markers;
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

    const result = [];

    // Dla każdego punktu wskaźnika znajdź odpowiadający jemu punkt czasowy w danych minutowych
    for (const point of indicatorData) {
      // Znajdź najbliższy punkt w danych minutowych
      const closestIndex = findClosestTimeIndex(minuteData, point.originalTime);
      if (closestIndex !== -1) {
        // Użyj jego czasu (w formacie dla TradingView) i wartości wskaźnika
        result.push({
          time: minuteData[closestIndex].time,
          value: point.value,
        });
      }
    }

    return result;
  };

  // Funkcja do tworzenia i inicjalizacji wykresu
  const createAndSetupChart = () => {
    if (!chartContainerRef.current) return;

    // Usuń poprzedni wykres, jeśli istnieje
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      seriesRefs.current = {
        price: null,
        hurstUpper: null,
        hurstLower: null,
        ema: null,
        markers: null,
      };
    }

    // Stwórz nowy wykres
    const chart = createChart(chartContainerRef.current, {
      height: 500,
      layout: {
        backgroundColor: "#151924",
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: {
          color: "rgba(42, 46, 57, 0.5)",
        },
        horzLines: {
          color: "rgba(42, 46, 57, 0.5)",
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(197, 203, 206, 0.8)",
      },
      timeScale: {
        borderColor: "rgba(197, 203, 206, 0.8)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Dodaj serię cenową
    const lineSeries = chart.addLineSeries({
      color: "#2196f3",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      lastValueVisible: true,
      priceLineVisible: true,
    });
    seriesRefs.current.price = lineSeries;

    // Dodaj serię dla górnej bandy Hursta
    const hurstUpperSeries = chart.addLineSeries({
      color: "#4CAF50",
      lineWidth: 1.5,
      lineStyle: 1, // przerywana
      lastValueVisible: true,
      priceLineVisible: false,
    });
    seriesRefs.current.hurstUpper = hurstUpperSeries;

    // Dodaj serię dla dolnej bandy Hursta
    const hurstLowerSeries = chart.addLineSeries({
      color: "#F44336",
      lineWidth: 1.5,
      lineStyle: 1, // przerywana
      lastValueVisible: true,
      priceLineVisible: false,
    });
    seriesRefs.current.hurstLower = hurstLowerSeries;

    // Dodaj serię dla EMA
    const emaSeries = chart.addLineSeries({
      color: "#FF9800",
      lineWidth: 1.5,
      lineStyle: 0, // ciągła
      lastValueVisible: true,
      priceLineVisible: false,
    });
    seriesRefs.current.ema = emaSeries;

    // Zapisz instancję wykresu
    chartInstanceRef.current = chart;

    // Dodaj obsługę zmiany rozmiaru
    const resizeObserver = new ResizeObserver(() => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // Zwróć funkcję czyszczącą
    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  };

  // Funkcja do renderowania danych na wykresie
  const renderChartData = (priceData, hurstUpper, hurstLower, ema, markers) => {
    if (!chartInstanceRef.current) return;

    // Przygotuj dane dla wykresów
    const formattedPriceData = priceData.map((candle) => ({
      time: candle.time,
      value: candle.close,
    }));

    // Ustaw dane dla serii
    seriesRefs.current.price.setData(formattedPriceData);
    seriesRefs.current.hurstUpper.setData(hurstUpper);
    seriesRefs.current.hurstLower.setData(hurstLower);
    seriesRefs.current.ema.setData(ema);

    // Dodaj markery transakcji
    if (markers && markers.length > 0) {
      seriesRefs.current.price.setMarkers(markers);
    }

    // Dostosuj widoczny zakres
    if (formattedPriceData.length > 0) {
      chartInstanceRef.current.timeScale().fitContent();
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

      setLoadingStatus("Obliczanie wskaźników technicznych...");

      // Oblicz kanał Hursta na danych 15-minutowych
      const hurstChannel = calculateHurstChannel(data15mResult, {
        periods: params.hurst.periods,
        upperDeviationFactor: params.hurst.upperDeviationFactor,
        lowerDeviationFactor: params.hurst.lowerDeviationFactor,
      });

      // Oblicz EMA na danych godzinowych
      const emaResult = calculateEMA(data1hResult, params.ema.periods);

      setLoadingStatus("Przygotowywanie danych do wykresu...");

      // Interpoluj dane wskaźników do formatu TradingView
      const interpolatedHurstUpper = interpolateIndicatorValues(
        minuteData,
        hurstChannel.upper
      );
      const interpolatedHurstLower = interpolateIndicatorValues(
        minuteData,
        hurstChannel.lower
      );
      const interpolatedEMA = interpolateIndicatorValues(minuteData, emaResult);

      // Przygotuj markery transakcji
      const transactionMarkers = prepareTransactionMarkers(minuteData, txData);

      // Logi diagnostyczne
      console.log(
        `Przygotowane dane: Price ${minuteData.length}, HurstUpper ${interpolatedHurstUpper.length}, ` +
          `HurstLower ${interpolatedHurstLower.length}, EMA ${interpolatedEMA.length}, Markers ${transactionMarkers.length}`
      );

      // Stwórz wykres, jeśli jeszcze nie istnieje
      createAndSetupChart();

      // Renderuj dane na wykresie
      renderChartData(
        minuteData,
        interpolatedHurstUpper,
        interpolatedHurstLower,
        interpolatedEMA,
        transactionMarkers
      );

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

  // Efekty dla inicjalizacji i czyszczenia wykresu
  useEffect(() => {
    if (isActive) {
      initializeChart();
    }

    // Czyszczenie przy odmontowaniu
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Pobierz parametry dla wyświetlenia
  const params = getInstanceParams();

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

        <div
          id="tradingview-chart"
          ref={chartContainerRef}
          style={{ width: "100%", height: "500px" }}
        ></div>
      </div>

      <div className="chart-footer">
        <button onClick={onToggle} className="hide-chart-btn">
          Ukryj wykres
        </button>
        <div className="status-message">
          <small>
            {loadingStatus}
            {!loading && (
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

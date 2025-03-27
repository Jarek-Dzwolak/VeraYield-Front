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

const TechnicalAnalysisChart = ({ instance, isActive, onToggle }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [priceData, setPriceData] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Pobieranie parametrów z instancji
  const getInstanceParams = () => {
    if (!instance || !instance.strategy || !instance.strategy.parameters) {
      return {
        symbol: "BTCUSDT",
      };
    }

    return {
      symbol: instance.symbol || "BTCUSDT",
    };
  };

  // Funkcja do pobierania danych za określony okres
  const fetchCandleData = async (symbol, interval, startDate, endDate) => {
    try {
      setLoadingStatus(`Pobieranie danych ${interval} dla ${symbol}...`);

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token available");
        throw new Error("Brak tokenu autoryzacyjnego");
      }

      const url = `/api/v1/market/klines/${symbol}/${interval}?startTime=${startDate.getTime()}&endTime=${endDate.getTime()}&limit=1000`;
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

  // Pobieranie rzeczywistych danych minutowych z kilku zapytań
  const fetchAllMinuteData = async (symbol) => {
    try {
      // Aktualny czas
      const endDate = new Date();

      // Dokładnie 4 dni wstecz
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 4);

      // Upewnij się, że mamy czas teraz (dla endDate) i dokładnie 4*24h wstecz (dla startDate)
      console.log(`Start date: ${startDate.toLocaleString()}`);
      console.log(`End date: ${endDate.toLocaleString()}`);

      setLoadingStatus("Pobieranie danych minutowych za 4 dni...");

      // W ciągu 4 dni mamy maksymalnie 4*24*60 = 5760 minut, więc potrzebujemy 6 zapytań po 1000 świec
      const minutesPerFragment = 1440; // 1 dzień = 1440 minut
      const fragments = [];

      // Tworzenie 4 fragmentów po jednym dniu
      for (let i = 0; i < 4; i++) {
        const fragmentStart = new Date(startDate);
        fragmentStart.setMinutes(
          fragmentStart.getMinutes() + i * minutesPerFragment
        );

        const fragmentEnd = new Date(startDate);
        fragmentEnd.setMinutes(
          fragmentEnd.getMinutes() + (i + 1) * minutesPerFragment
        );

        // Dla ostatniego fragmentu upewnij się, że sięga do aktualnego czasu
        const actualEnd = i === 3 ? endDate : fragmentEnd;

        fragments.push({
          start: fragmentStart,
          end: actualEnd,
        });
      }

      // Dzielimy ostatni dzień na 2 części po 12 godzin, aby mieć większą dokładność
      const lastDayStart = new Date(startDate);
      lastDayStart.setDate(lastDayStart.getDate() + 3);

      const midDayPoint = new Date(lastDayStart);
      midDayPoint.setHours(midDayPoint.getHours() + 12);

      // Zastępujemy ostatni fragment dwoma mniejszymi
      fragments.pop();
      fragments.push({
        start: lastDayStart,
        end: midDayPoint,
      });

      fragments.push({
        start: midDayPoint,
        end: endDate,
      });

      let allCandles = [];

      // Pobierz dane dla każdego fragmentu
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
        } catch (err) {
          console.warn(`Błąd pobierania pakietu ${i + 1}: ${err.message}`);
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

      return uniqueCandles;
    } catch (err) {
      console.error("Error fetching all minute data:", err);
      setLoadingStatus(`Błąd pobierania danych: ${err.message}`);
      throw err;
    }
  };

  // Pobieranie rzeczywistych transakcji
  const fetchTransactions = async (instanceId) => {
    try {
      setLoadingStatus("Pobieranie historii transakcji...");

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Brak tokenu autoryzacyjnego");
      }

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
          return []; // Zwracamy pustą tablicę zamiast generowania przykładowych danych
        }

        const signals = await response.json();

        if (!signals || !Array.isArray(signals)) {
          console.warn("Invalid signals data format");
          return [];
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
          };
        });

        console.log("Transactions processed from signals:", mappedTransactions);
        return mappedTransactions;
      } catch (err) {
        console.warn("Error processing signals:", err);
        return []; // Zwracamy pustą tablicę
      }
    } catch (err) {
      console.error("Error in transaction processing:", err);
      setLoadingStatus(`Błąd pobierania transakcji: ${err.message}`);
      return []; // Zwracamy pustą tablicę
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
    }
    return [value, name];
  };

  // Główna funkcja inicjalizacji wykresu
  const initializeChart = async () => {
    if (!isActive) return;

    setLoading(true);
    setError(null);
    setPriceData([]);
    setTransactions([]);
    setLoadingStatus("Inicjalizacja wykresu...");

    try {
      // Pobierz parametry
      const params = getInstanceParams();
      console.log("Instance parameters:", params);

      // Pobierz dane minutowe
      const minuteData = await fetchAllMinuteData(params.symbol);

      if (!minuteData || minuteData.length === 0) {
        throw new Error("Nie udało się pobrać danych minutowych");
      }

      // Pobierz rzeczywiste transakcje
      const txData = await fetchTransactions(instance?.id || instance?._id);

      // Zapisz dane w stanie komponentu
      setPriceData(minuteData);
      setTransactions(txData);

      setLoading(false);
      setLoadingStatus(
        `Wykres załadowany: ${minuteData.length} świec, ${txData.length} transakcji`
      );
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

    // Czyszczenie przy odmontowaniu
    return () => {
      // Żadnych operacji czyszczenia nie jest potrzebnych dla Recharts
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
          <span>Interwał: 1m (dane minutowe)</span>
          <span>Okres: 4 dni</span>
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
          {priceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={priceData}
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
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Cena"
                  stroke="#2196f3"
                  dot={false}
                  strokeWidth={1.5}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />

                {/* Renderowanie markerów transakcji */}
                {transactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    {/* Marker otwarcia transakcji */}
                    <ReferenceLine
                      x={tx.openTime}
                      stroke={tx.type === "BUY" ? "#4CAF50" : "#F44336"}
                      strokeDasharray="3 3"
                      label={{
                        value: `${tx.type} @ ${tx.openPrice.toFixed(2)}`,
                        position: "insideTopLeft",
                        fill: tx.type === "BUY" ? "#4CAF50" : "#F44336",
                        fontSize: 12,
                      }}
                    />

                    {/* Marker zamknięcia transakcji (jeśli istnieje) */}
                    {tx.closeTime && (
                      <ReferenceLine
                        x={tx.closeTime}
                        stroke="#FF9800"
                        strokeDasharray="3 3"
                        label={{
                          value: `EXIT @ ${tx.closePrice.toFixed(2)}`,
                          position: "insideTopRight",
                          fill: "#FF9800",
                          fontSize: 12,
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}

                {/* Suwak do przewijania - ważne! */}
                <Brush
                  dataKey="time"
                  height={40}
                  stroke="#555"
                  fill="#30363d"
                  tickFormatter={formatXAxis}
                  travellerWidth={10}
                  startIndex={Math.max(0, priceData.length - 200)}
                  endIndex={priceData.length - 1}
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
            {priceData.length > 0 && !loading && (
              <> | Świec: {priceData.length}</>
            )}
          </small>
        </div>
      </div>
    </div>
  );
};

export default TechnicalAnalysisChart;

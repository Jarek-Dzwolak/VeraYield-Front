import React, { useState } from "react";
import "./CreateInstanceForm.css";

const CreateInstanceForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  // Stan dla nowej instancji
  const [newInstance, setNewInstance] = useState({
    name: "",
    symbol: "BTCUSDT",
    testMode: true, // Dodajemy to pole, aby aktywować tryb testowy
    strategy: {
      parameters: {
        hurst: {
          periods: 25,
          upperDeviationFactor: 2.0,
          lowerDeviationFactor: 2.0,
        },
        ema: {
          periods: 30,
        },
        signals: {
          checkEMATrend: true,
          minEntryTimeGap: 7200000, // 2 godziny w milisekundach
        },
        capitalAllocation: {
          firstEntry: 0.1,
          secondEntry: 0.25,
          thirdEntry: 0.5,
          maxEntries: 3,
        },
        intervals: {
          hurst: "15m",
          ema: "1h",
        },
      },
    },
  });

  // Handlery do aktualizacji różnych części stanu
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setNewInstance((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleHurstChange = (e) => {
    const { name, value } = e.target;

    // Pozwól na wpisywanie przecinków, kropek i cyfr oraz pustego pola
    if (name === "periods") {
      // Dla okresów, tylko liczby całkowite
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        setNewInstance((prev) => ({
          ...prev,
          strategy: {
            ...prev.strategy,
            parameters: {
              ...prev.strategy.parameters,
              hurst: {
                ...prev.strategy.parameters.hurst,
                [name]: numValue,
              },
            },
          },
        }));
      }
    } else {
      // Dla współczynników odchylenia, akceptujemy zarówno kropkę jak i przecinek
      // Nie konwertujemy na liczbę w trakcie edycji, aby nie utrudniać wprowadzania
      setNewInstance((prev) => ({
        ...prev,
        strategy: {
          ...prev.strategy,
          parameters: {
            ...prev.strategy.parameters,
            hurst: {
              ...prev.strategy.parameters.hurst,
              [name]: value,
            },
          },
        },
      }));
    }
  };

  const handleEMAChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);

    if (!isNaN(numValue)) {
      setNewInstance((prev) => ({
        ...prev,
        strategy: {
          ...prev.strategy,
          parameters: {
            ...prev.strategy.parameters,
            ema: {
              ...prev.strategy.parameters.ema,
              [name]: numValue,
            },
          },
        },
      }));
    }
  };

  const handleSignalsChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Dla checkboxów używamy wartości checked, dla innych inputs wartości value
    let actualValue;
    if (type === "checkbox") {
      actualValue = checked;
    } else if (name === "minEntryTimeGap") {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        actualValue = numValue * 60 * 1000; // Konwersja z minut na milisekundy
      } else {
        return; // Przerwij jeśli wartość nie jest liczbą
      }
    } else {
      actualValue = value;
    }

    setNewInstance((prev) => ({
      ...prev,
      strategy: {
        ...prev.strategy,
        parameters: {
          ...prev.strategy.parameters,
          signals: {
            ...prev.strategy.parameters.signals,
            [name]: actualValue,
          },
        },
      },
    }));
  };

  const handleCapitalChange = (e) => {
    const { name, value } = e.target;
    // Konwertuj wartość procentową na dziesiętną (np. 10% -> 0.1)
    const numValue = parseFloat(value) / 100;

    if (!isNaN(numValue)) {
      setNewInstance((prev) => ({
        ...prev,
        strategy: {
          ...prev.strategy,
          parameters: {
            ...prev.strategy.parameters,
            capitalAllocation: {
              ...prev.strategy.parameters.capitalAllocation,
              [name]: numValue,
            },
          },
        },
      }));
    }
  };

  const handleIntervalsChange = (e) => {
    const { name, value } = e.target;

    setNewInstance((prev) => ({
      ...prev,
      strategy: {
        ...prev.strategy,
        parameters: {
          ...prev.strategy.parameters,
          intervals: {
            ...prev.strategy.parameters.intervals,
            [name]: value,
          },
        },
      },
    }));
  };

  // Funkcja do tworzenia nowej instancji
  const createInstance = async (e) => {
    e.preventDefault();

    // Walidacja
    if (!newInstance.name.trim()) {
      setError("Nazwa instancji jest wymagana");
      return;
    }

    // Przygotuj dane do wysłania, zamieniając przecinki na kropki w wartościach zmiennoprzecinkowych
    const dataToSend = {
      ...newInstance,
      testMode: true, // Upewnij się, że tryb testowy jest zawsze włączony
      strategy: {
        ...newInstance.strategy,
        parameters: {
          ...newInstance.strategy.parameters,
          hurst: {
            ...newInstance.strategy.parameters.hurst,
            upperDeviationFactor: parseFloat(
              String(
                newInstance.strategy.parameters.hurst.upperDeviationFactor
              ).replace(",", ".")
            ),
            lowerDeviationFactor: parseFloat(
              String(
                newInstance.strategy.parameters.hurst.lowerDeviationFactor
              ).replace(",", ".")
            ),
          },
        },
      },
    };

    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Brak autoryzacji");
      }

      // Logowanie danych przed wysłaniem dla celów debugowania
      console.log(
        "Wysyłanie danych instancji:",
        JSON.stringify(dataToSend, null, 2)
      );

      const response = await fetch("/api/v1/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Błąd podczas tworzenia instancji"
        );
      }

      const data = await response.json();
      setSuccessMessage(
        `Instancja "${newInstance.name}" została utworzona pomyślnie!`
      );

      // Resetuj formularz
      setNewInstance({
        name: "",
        symbol: "BTCUSDT",
        testMode: true,
        strategy: {
          parameters: {
            hurst: {
              periods: 25,
              upperDeviationFactor: 2.0,
              lowerDeviationFactor: 2.0,
            },
            ema: {
              periods: 30,
            },
            signals: {
              checkEMATrend: true,
              minEntryTimeGap: 7200000,
            },
            capitalAllocation: {
              firstEntry: 0.1,
              secondEntry: 0.25,
              thirdEntry: 0.5,
              maxEntries: 3,
            },
            intervals: {
              hurst: "15m",
              ema: "1h",
            },
          },
        },
      });

      setIsLoading(false);

      // Wyczyść wiadomość po 5 sekundach
      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (err) {
      console.error("Błąd:", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="create-instance-container">
      <div className="form-tabs">
        <button
          className={`tab ${activeTab === "basic" ? "active" : ""}`}
          onClick={() => setActiveTab("basic")}
        >
          Podstawowe
        </button>
        <button
          className={`tab ${activeTab === "hurst" ? "active" : ""}`}
          onClick={() => setActiveTab("hurst")}
        >
          Kanał Hursta
        </button>
        <button
          className={`tab ${activeTab === "ema" ? "active" : ""}`}
          onClick={() => setActiveTab("ema")}
        >
          EMA
        </button>
        <button
          className={`tab ${activeTab === "signals" ? "active" : ""}`}
          onClick={() => setActiveTab("signals")}
        >
          Sygnały
        </button>
        <button
          className={`tab ${activeTab === "capital" ? "active" : ""}`}
          onClick={() => setActiveTab("capital")}
        >
          Kapitał
        </button>
        <button
          className={`tab ${activeTab === "intervals" ? "active" : ""}`}
          onClick={() => setActiveTab("intervals")}
        >
          Interwały
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <form onSubmit={createInstance}>
        {/* Podstawowe informacje */}
        {activeTab === "basic" && (
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="name">Nazwa Instancji:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newInstance.name}
                onChange={handleBasicInfoChange}
                placeholder="Np. BTC Strategy 1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="symbol">Symbol:</label>
              <select
                id="symbol"
                name="symbol"
                value={newInstance.symbol}
                onChange={handleBasicInfoChange}
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
                <option value="ADAUSDT">ADA/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="DOGEUSDT">DOGE/USDT</option>
              </select>
            </div>

            <p className="section-description">
              Wybierz unikalną nazwę dla Twojej instancji oraz parę handlową, na
              której będzie działać bot.
            </p>
          </div>
        )}

        {/* Parametry kanału Hursta */}
        {activeTab === "hurst" && (
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="periods">Liczba okresów:</label>
              <input
                type="number"
                id="periods"
                name="periods"
                value={newInstance.strategy.parameters.hurst.periods}
                onChange={handleHurstChange}
                min="10"
                max="100"
                step="1"
              />
              <div className="field-description">Liczba całkowita (np. 25)</div>
            </div>

            <div className="form-group">
              <label htmlFor="upperDeviationFactor">
                Czynnik górnego odchylenia:
              </label>
              <input
                type="text"
                id="upperDeviationFactor"
                name="upperDeviationFactor"
                value={
                  newInstance.strategy.parameters.hurst.upperDeviationFactor
                }
                onChange={handleHurstChange}
                placeholder="np. 1,4 lub 1.8"
              />
              <div className="field-description">
                Wartość może być wpisana z kropką (1.4) lub przecinkiem (1,4)
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="lowerDeviationFactor">
                Czynnik dolnego odchylenia:
              </label>
              <input
                type="text"
                id="lowerDeviationFactor"
                name="lowerDeviationFactor"
                value={
                  newInstance.strategy.parameters.hurst.lowerDeviationFactor
                }
                onChange={handleHurstChange}
                placeholder="np. 1,4 lub 1.8"
              />
              <div className="field-description">
                Wartość może być wpisana z kropką (1.4) lub przecinkiem (1,4)
              </div>
            </div>

            <p className="section-description">
              Kanał Hursta to główny wskaźnik używany przez strategię. Okresy
              określają liczbę świec używanych do obliczeń, a czynniki
              odchylenia określają szerokość kanału. Typowe wartości to 1.4-2.5.
            </p>
          </div>
        )}

        {/* Parametry EMA */}
        {activeTab === "ema" && (
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="emaPeriods">Okresy EMA:</label>
              <input
                type="number"
                id="emaPeriods"
                name="periods"
                value={newInstance.strategy.parameters.ema.periods}
                onChange={handleEMAChange}
                min="5"
                max="200"
                step="1"
              />
            </div>

            <p className="section-description">
              EMA (Exponential Moving Average) pomaga określić kierunek trendu
              na wyższym timeframe. Jest używana do filtrowania sygnałów i
              zapewnienia, że transakcje są zgodne z głównym trendem.
            </p>
          </div>
        )}

        {/* Parametry sygnałów */}
        {activeTab === "signals" && (
          <div className="form-section">
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="checkEMATrend"
                name="checkEMATrend"
                checked={newInstance.strategy.parameters.signals.checkEMATrend}
                onChange={handleSignalsChange}
              />
              <label htmlFor="checkEMATrend">Sprawdzaj trend EMA</label>
            </div>

            <div className="form-group">
              <label htmlFor="minEntryTimeGap">
                Minimalny odstęp między wejściami (minuty):
              </label>
              <input
                type="number"
                id="minEntryTimeGap"
                name="minEntryTimeGap"
                value={
                  newInstance.strategy.parameters.signals.minEntryTimeGap /
                  (60 * 1000)
                }
                onChange={handleSignalsChange}
                min="5"
                max="1440"
                step="5"
              />
            </div>

            <p className="section-description">
              Te parametry określają, jak sygnały są filtrowane i przetwarzane.
              Sprawdzanie trendu EMA zapewnia, że wejścia są zgodne z głównym
              trendem. Minimalny odstęp zapobiega zbyt częstym wejściom.
            </p>
          </div>
        )}

        {/* Parametry alokacji kapitału */}
        {activeTab === "capital" && (
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="firstEntry">Pierwsze wejście (%):</label>
              <input
                type="number"
                id="firstEntry"
                name="firstEntry"
                value={
                  newInstance.strategy.parameters.capitalAllocation.firstEntry *
                  100
                }
                onChange={handleCapitalChange}
                min="1"
                max="50"
                step="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="secondEntry">Drugie wejście (%):</label>
              <input
                type="number"
                id="secondEntry"
                name="secondEntry"
                value={
                  newInstance.strategy.parameters.capitalAllocation
                    .secondEntry * 100
                }
                onChange={handleCapitalChange}
                min="1"
                max="70"
                step="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="thirdEntry">Trzecie wejście (%):</label>
              <input
                type="number"
                id="thirdEntry"
                name="thirdEntry"
                value={
                  newInstance.strategy.parameters.capitalAllocation.thirdEntry *
                  100
                }
                onChange={handleCapitalChange}
                min="1"
                max="90"
                step="1"
              />
            </div>

            <p className="section-description">
              Te parametry określają, jaki procent dostępnego kapitału będzie
              przydzielony do każdego wejścia. Strategia umożliwia do 3 wejść w
              jedną pozycję, z różnymi alokacjami kapitału.
            </p>
          </div>
        )}

        {/* Parametry interwałów czasowych */}
        {activeTab === "intervals" && (
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="hurstInterval">Interwał kanału Hursta:</label>
              <select
                id="hurstInterval"
                name="hurst"
                value={newInstance.strategy.parameters.intervals.hurst}
                onChange={handleIntervalsChange}
              >
                <option value="5m">5 minut</option>
                <option value="15m">15 minut</option>
                <option value="30m">30 minut</option>
                <option value="1h">1 godzina</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="emaInterval">Interwał EMA:</label>
              <select
                id="emaInterval"
                name="ema"
                value={newInstance.strategy.parameters.intervals.ema}
                onChange={handleIntervalsChange}
              >
                <option value="15m">15 minut</option>
                <option value="30m">30 minut</option>
                <option value="1h">1 godzina</option>
                <option value="4h">4 godziny</option>
              </select>
            </div>

            <p className="section-description">
              Te parametry określają, na jakich interwałach czasowych będą
              obliczane wskaźniki. EMA powinna być obliczana na wyższym
              timeframe niż kanał Hursta.
            </p>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "Tworzenie..." : "Utwórz Instancję"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInstanceForm;

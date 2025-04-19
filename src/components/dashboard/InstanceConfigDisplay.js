import React, { useState, useEffect } from "react";
import "./InstanceConfigDisplay.css";

const InstanceConfigDisplay = ({ instance }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInstanceConfig = async () => {
      if (!instance) {
        setConfig(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Brak tokenu autoryzacji");
        }

        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api/v1";
        const instanceId = instance.instanceId || instance._id;

        const response = await fetch(
          `${API_BASE_URL}/instances/${instanceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Błąd pobierania konfiguracji: ${response.status}`);
        }

        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.error("Błąd pobierania konfiguracji instancji:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstanceConfig();
  }, [instance]);

  // Formatowanie procentów z wartości dziesiętnych
  const formatPercent = (value) => {
    if (value === undefined || value === null) return "-";
    return `${(value * 100).toFixed(2)}%`;
  };

  // Formatowanie czasu z milisekund
  const formatTime = (ms) => {
    if (ms === undefined || ms === null) return "-";
    const minutes = Math.floor(ms / (60 * 1000));

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
  };

  if (isLoading) {
    return (
      <div className="instance-config card">
        <div className="card-header">
          <div className="card-header-with-line">
            <div className="vertical-line"></div>
            <h2>Konfiguracja Instancji</h2>
          </div>
        </div>
        <div className="card-content loading">
          <div className="loading-indicator">Ładowanie konfiguracji...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="instance-config card">
        <div className="card-header">
          <div className="card-header-with-line">
            <div className="vertical-line"></div>
            <h2>Konfiguracja Instancji</h2>
          </div>
        </div>
        <div className="card-content error">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!instance || !config) {
    return (
      <div className="instance-config card">
        <div className="card-header">
          <div className="card-header-with-line">
            <div className="vertical-line"></div>
            <h2>Konfiguracja Instancji</h2>
          </div>
        </div>
        <div className="card-content empty">
          <div className="empty-state">
            <p>Wybierz instancję, aby zobaczyć jej konfigurację</p>
          </div>
        </div>
      </div>
    );
  }

  // Upewnij się, że mamy dostęp do parametrów strategii
  const strategyParams = config.strategy?.parameters || {};
  const hurstParams = strategyParams.hurst || {};
  const emaParams = strategyParams.ema || {};
  const signalParams = strategyParams.signals || {};
  const capitalParams = strategyParams.capitalAllocation || {};

  return (
    <div className="instance-config card">
      <div className="card-header">
        <div className="card-header-with-line">
          <div className="vertical-line"></div>
          <h2>Konfiguracja: {instance.name}</h2>
        </div>
        {config.testMode && <div className="test-mode-badge">Tryb Testowy</div>}
      </div>
      <div className="card-content">
        <div className="config-sections">
          <div className="config-section">
            <h3>Kanał Hursta</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">Okresy</span>
                <span className="config-value">
                  {hurstParams.periods || "-"}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Górne odchylenie</span>
                <span className="config-value">
                  {hurstParams.upperDeviationFactor?.toFixed(2) || "-"}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Dolne odchylenie</span>
                <span className="config-value">
                  {hurstParams.lowerDeviationFactor?.toFixed(2) || "-"}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Interwał</span>
                <span className="config-value">
                  {hurstParams.interval || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>EMA</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">Okresy</span>
                <span className="config-value">{emaParams.periods || "-"}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Interwał</span>
                <span className="config-value">
                  {emaParams.interval || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>Sygnały</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">Sprawdzaj EMA</span>
                <span className="config-value boolean">
                  {signalParams.checkEMATrend !== undefined
                    ? signalParams.checkEMATrend
                      ? "Tak"
                      : "Nie"
                    : "-"}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">
                  Min. odstęp między wejściami
                </span>
                <span className="config-value">
                  {formatTime(signalParams.minEntryTimeGap)}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Trailing Stop</span>
                <span className="config-value boolean">
                  {signalParams.enableTrailingStop !== undefined
                    ? signalParams.enableTrailingStop
                      ? "Włączony"
                      : "Wyłączony"
                    : "-"}
                </span>
              </div>
              {signalParams.enableTrailingStop && (
                <>
                  <div className="config-item">
                    <span className="config-label">Wartość Trailing Stop</span>
                    <span className="config-value">
                      {formatPercent(signalParams.trailingStop)}
                    </span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">
                      Opóźnienie Trailing Stop
                    </span>
                    <span className="config-value">
                      {formatTime(signalParams.trailingStopDelay)}
                    </span>
                  </div>
                </>
              )}
              <div className="config-item">
                <span className="config-label">
                  Min. czas pierwszego wejścia
                </span>
                <span className="config-value">
                  {formatTime(signalParams.minFirstEntryDuration)}
                </span>
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>Alokacja Kapitału</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">Pierwsze wejście</span>
                <span className="config-value">
                  {formatPercent(capitalParams.firstEntry)}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Drugie wejście</span>
                <span className="config-value">
                  {formatPercent(capitalParams.secondEntry)}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Trzecie wejście</span>
                <span className="config-value">
                  {formatPercent(capitalParams.thirdEntry)}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Maks. liczba wejść</span>
                <span className="config-value">
                  {capitalParams.maxEntries || "-"}
                </span>
              </div>
            </div>
          </div>

          {config.financials && (
            <div className="config-section financials">
              <h3>Dane Finansowe</h3>
              <div className="config-grid">
                <div className="config-item">
                  <span className="config-label">Alokowany kapitał</span>
                  <span className="config-value">
                    ${config.financials.allocatedCapital?.toFixed(2) || "-"}
                  </span>
                </div>
                <div className="config-item">
                  <span className="config-label">Bieżący bilans</span>
                  <span className="config-value">
                    ${config.financials.currentBalance?.toFixed(2) || "-"}
                  </span>
                </div>
                <div className="config-item">
                  <span className="config-label">Dostępne środki</span>
                  <span className="config-value">
                    ${config.financials.availableBalance?.toFixed(2) || "-"}
                  </span>
                </div>
                <div className="config-item">
                  <span className="config-label">Zablokowane środki</span>
                  <span className="config-value">
                    ${config.financials.lockedBalance?.toFixed(2) || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstanceConfigDisplay;

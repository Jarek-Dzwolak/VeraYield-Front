import React, { useState, useEffect } from "react";
import "./InstanceSettings.css";

const InstanceSettings = ({ instanceId }) => {
  const [activeTab, setActiveTab] = useState("strategy");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // Pobierz aktualną konfigurację po załadowaniu komponentu
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Brak autoryzacji");
        }

        const response = await fetch(`/api/v1/instances/${instanceId}/config`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać konfiguracji instancji");
        }

        const data = await response.json();
        setConfig(data.strategy.parameters);
        setEditedConfig(data.strategy.parameters);
        setIsLoading(false);
      } catch (err) {
        console.error("Błąd:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [instanceId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleInputChange = (category, field, value) => {
    // Konwertuj wartość liczbową jeśli to potrzebne
    const parsedValue = [
      "periods",
      "upperDeviationFactor",
      "lowerDeviationFactor",
      "firstEntry",
      "secondEntry",
      "thirdEntry",
      "minEntryTimeGap",
    ].includes(field)
      ? parseFloat(value)
      : value === "true" || value === "false"
      ? value === "true"
      : value;

    setEditedConfig((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: parsedValue,
      },
    }));
  };

  const handleSaveConfig = async () => {
    try {
      setSaveStatus("saving");
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Brak autoryzacji");
      }

      const response = await fetch(`/api/v1/instances/${instanceId}/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Błąd podczas aktualizacji konfiguracji"
        );
      }

      // Aktualizacja powiodła się
      const data = await response.json();
      setConfig(data.config.strategy.parameters);
      setIsEditing(false);
      setSaveStatus("success");

      // Po 3 sekundach wyczyść status
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (err) {
      console.error("Błąd:", err);
      setSaveStatus("error");
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditedConfig(config);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="instance-settings card">
        <div className="card-header">
          <h2>Instance Settings</h2>
        </div>
        <div className="loading-indicator">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="instance-settings card">
        <div className="card-header">
          <h2>Instance Settings</h2>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // Formatowanie czasu (minEntryTimeGap z ms na minuty)
  const formatTimeGap = (ms) => {
    return ms / (60 * 1000);
  };

  // Format liczbowy z 2 miejscami po przecinku
  const formatNumber = (num) => {
    return parseFloat(num).toFixed(2);
  };

  return (
    <div className="instance-settings card">
      <div className="card-header">
        <h2>Instance Settings</h2>
        <div className="card-tabs">
          <button
            className={`tab ${activeTab === "strategy" ? "active" : ""}`}
            onClick={() => handleTabChange("strategy")}
          >
            Strategy
          </button>
          <button
            className={`tab ${activeTab === "capital" ? "active" : ""}`}
            onClick={() => handleTabChange("capital")}
          >
            Capital
          </button>
          <button
            className={`tab ${activeTab === "intervals" ? "active" : ""}`}
            onClick={() => handleTabChange("intervals")}
          >
            Intervals
          </button>
        </div>
      </div>

      <div className="settings-container">
        {!isEditing ? (
          <div className="action-buttons">
            <button className="edit-button" onClick={() => setIsEditing(true)}>
              Edit Settings
            </button>
          </div>
        ) : (
          <div className="action-buttons">
            <button
              className="save-button"
              onClick={handleSaveConfig}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving..." : "Save Changes"}
            </button>
            <button className="cancel-button" onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        )}

        {saveStatus === "success" && (
          <div className="success-message">
            Configuration updated successfully!
          </div>
        )}

        {saveStatus === "error" && (
          <div className="error-message">
            Failed to update configuration. Please try again.
          </div>
        )}

        {activeTab === "strategy" && (
          <div className="settings-section">
            <h3>Hurst Channel Parameters</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Periods:</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedConfig.hurst.periods}
                    onChange={(e) =>
                      handleInputChange("hurst", "periods", e.target.value)
                    }
                    min="10"
                    max="100"
                    step="1"
                  />
                ) : (
                  <span>{config.hurst.periods}</span>
                )}
              </div>
              <div className="setting-item">
                <label>Upper Band Deviation:</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedConfig.hurst.upperDeviationFactor}
                    onChange={(e) =>
                      handleInputChange(
                        "hurst",
                        "upperDeviationFactor",
                        e.target.value
                      )
                    }
                    min="0.5"
                    max="5.0"
                    step="0.1"
                  />
                ) : (
                  <span>{formatNumber(config.hurst.upperDeviationFactor)}</span>
                )}
              </div>
              <div className="setting-item">
                <label>Lower Band Deviation:</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedConfig.hurst.lowerDeviationFactor}
                    onChange={(e) =>
                      handleInputChange(
                        "hurst",
                        "lowerDeviationFactor",
                        e.target.value
                      )
                    }
                    min="0.5"
                    max="5.0"
                    step="0.1"
                  />
                ) : (
                  <span>{formatNumber(config.hurst.lowerDeviationFactor)}</span>
                )}
              </div>
            </div>

            <h3>EMA Parameters</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>EMA Periods:</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedConfig.ema.periods}
                    onChange={(e) =>
                      handleInputChange("ema", "periods", e.target.value)
                    }
                    min="5"
                    max="200"
                    step="1"
                  />
                ) : (
                  <span>{config.ema.periods}</span>
                )}
              </div>
              <div className="setting-item">
                <label>Check EMA Trend:</label>
                {isEditing ? (
                  <select
                    value={editedConfig.signals.checkEMATrend.toString()}
                    onChange={(e) =>
                      handleInputChange(
                        "signals",
                        "checkEMATrend",
                        e.target.value
                      )
                    }
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : (
                  <span>
                    {config.signals.checkEMATrend ? "Enabled" : "Disabled"}
                  </span>
                )}
              </div>
            </div>

            <h3>Signal Parameters</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Min Time Between Entries (minutes):</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formatTimeGap(editedConfig.signals.minEntryTimeGap)}
                    onChange={(e) =>
                      handleInputChange(
                        "signals",
                        "minEntryTimeGap",
                        e.target.value * 60 * 1000
                      )
                    }
                    min="5"
                    max="1440"
                    step="5"
                  />
                ) : (
                  <span>{formatTimeGap(config.signals.minEntryTimeGap)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "capital" && (
          <div className="settings-section">
            <h3>Capital Allocation</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>First Entry (%):</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedConfig.capitalAllocation.firstEntry * 100}
                    onChange={(e) =>
                      handleInputChange(
                        "capitalAllocation",
                        "firstEntry",
                        e.target.value / 100
                      )
                    }
                    min="1"
                    max="50"
                    step="1"
                  />
                ) : (
                  <span>
                    {(config.capitalAllocation.firstEntry * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="setting-item">
                <label>Second Entry (%):</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedConfig.capitalAllocation.secondEntry * 100}
                    onChange={(e) =>
                      handleInputChange(
                        "capitalAllocation",
                        "secondEntry",
                        e.target.value / 100
                      )
                    }
                    min="1"
                    max="70"
                    step="1"
                  />
                ) : (
                  <span>
                    {(config.capitalAllocation.secondEntry * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="setting-item">
                <label>Third Entry (%):</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedConfig.capitalAllocation.thirdEntry * 100}
                    onChange={(e) =>
                      handleInputChange(
                        "capitalAllocation",
                        "thirdEntry",
                        e.target.value / 100
                      )
                    }
                    min="1"
                    max="90"
                    step="1"
                  />
                ) : (
                  <span>
                    {(config.capitalAllocation.thirdEntry * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="setting-item">
                <label>Max Entries:</label>
                <span>{config.capitalAllocation.maxEntries}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "intervals" && (
          <div className="settings-section">
            <h3>Time Intervals</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Hurst Channel Interval:</label>
                {isEditing ? (
                  <select
                    value={editedConfig.intervals.hurst}
                    onChange={(e) =>
                      handleInputChange("intervals", "hurst", e.target.value)
                    }
                  >
                    <option value="5m">5 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                  </select>
                ) : (
                  <span>{config.intervals.hurst}</span>
                )}
              </div>
              <div className="setting-item">
                <label>EMA Interval:</label>
                {isEditing ? (
                  <select
                    value={editedConfig.intervals.ema}
                    onChange={(e) =>
                      handleInputChange("intervals", "ema", e.target.value)
                    }
                  >
                    <option value="15m">15 minutes</option>
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="4h">4 hours</option>
                  </select>
                ) : (
                  <span>{config.intervals.ema}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstanceSettings;

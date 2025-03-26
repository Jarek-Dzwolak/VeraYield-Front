import React, { useState, useEffect } from "react";
import "./InstanceManager.css";

const InstanceManager = () => {
  const [instances, setInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Pobierz instancje po załadowaniu komponentu
  useEffect(() => {
    fetchInstances();
  }, []);

  // Funkcja pobierająca instancje
  const fetchInstances = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Brak autoryzacji");
      }

      const response = await fetch("/api/v1/instances", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Błąd podczas pobierania instancji"
        );
      }

      const data = await response.json();
      setInstances(data.instances || []);
      setIsLoading(false);
    } catch (err) {
      console.error("Błąd:", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Funkcja do usuwania instancji
  const deleteInstance = async (instanceId, instanceName) => {
    // Potwierdzenie przed usunięciem
    if (
      !window.confirm(`Czy na pewno chcesz usunąć instancję "${instanceName}"?`)
    ) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Brak autoryzacji");
      }

      const response = await fetch(`/api/v1/instances/${instanceId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Błąd podczas usuwania instancji");
      }

      // Usuń instancję z lokalnego stanu
      setInstances(
        instances.filter((instance) => instance.instanceId !== instanceId)
      );

      setSuccessMessage(
        `Instancja "${instanceName}" została usunięta pomyślnie!`
      );
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

  // Funkcja do zatrzymywania instancji
  const stopInstance = async (instanceId, instanceName) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Brak autoryzacji");
      }

      const response = await fetch(`/api/v1/instances/${instanceId}/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Błąd podczas zatrzymywania instancji"
        );
      }

      setSuccessMessage(
        `Instancja "${instanceName}" została zatrzymana pomyślnie!`
      );

      // Odśwież listę instancji
      fetchInstances();

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

  // Funkcja do uruchamiania instancji
  const startInstance = async (instanceId, instanceName) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Brak autoryzacji");
      }

      const response = await fetch(`/api/v1/instances/${instanceId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Błąd podczas uruchamiania instancji"
        );
      }

      setSuccessMessage(
        `Instancja "${instanceName}" została uruchomiona pomyślnie!`
      );

      // Odśwież listę instancji
      fetchInstances();

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
    <div className="instance-manager-container">
      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {isLoading ? (
        <div className="loading-message">Ładowanie instancji...</div>
      ) : (
        <>
          {instances.length === 0 ? (
            <div className="empty-state">
              <p>
                Nie masz jeszcze żadnych instancji. Utwórz pierwszą instancję,
                aby rozpocząć.
              </p>
            </div>
          ) : (
            <div className="instances-table-container">
              <table className="instances-table">
                <thead>
                  <tr>
                    <th>Nazwa</th>
                    <th>Symbol</th>
                    <th>Status</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr key={instance.instanceId}>
                      <td>{instance.name}</td>
                      <td>{instance.symbol}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            instance.active ? "active" : "inactive"
                          }`}
                        >
                          {instance.active ? "Aktywna" : "Nieaktywna"}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {instance.active ? (
                          <button
                            className="action-button stop-button"
                            onClick={() =>
                              stopInstance(instance.instanceId, instance.name)
                            }
                            disabled={isLoading}
                          >
                            Zatrzymaj
                          </button>
                        ) : (
                          <button
                            className="action-button start-button"
                            onClick={() =>
                              startInstance(instance.instanceId, instance.name)
                            }
                            disabled={isLoading}
                          >
                            Uruchom
                          </button>
                        )}
                        <button
                          className="action-button delete-button"
                          onClick={() =>
                            deleteInstance(instance.instanceId, instance.name)
                          }
                          disabled={isLoading}
                        >
                          Usuń
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InstanceManager;

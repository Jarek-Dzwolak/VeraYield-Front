import React, { useState, useEffect } from "react";
import "./InstanceOverview.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api/v1";

const InstanceOverview = ({ onSelectInstance }) => {
  const [instances, setInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstance, setSelectedInstance] = useState(null);

  // Pobierz listę aktywnych instancji po załadowaniu komponentu
  useEffect(() => {
    const fetchInstances = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Brak autoryzacji");
        }

        const response = await fetch(`${API_BASE_URL}/instances/active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać instancji");
        }

        const data = await response.json();

        // Sprawdź strukturę odpowiedzi
        const instancesArray = Array.isArray(data)
          ? data
          : data.instances || [];

        if (instancesArray.length > 0) {
          setInstances(instancesArray);

          // Jeśli nie ma wybranej instancji, wybierz pierwszą
          if (!selectedInstance) {
            setSelectedInstance(instancesArray[0]);

            // Powiadom komponent nadrzędny o wybranej instancji
            if (typeof onSelectInstance === "function") {
              console.log(
                "Automatically selecting first instance:",
                instancesArray[0]
              );
              onSelectInstance(instancesArray[0]);
            }
          }
        } else {
          setInstances([]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching instances:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchInstances();
    // Usuń selectedInstance z listy zależności, aby uniknąć nieskończonej pętli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pusta tablica zależności - uruchom useEffect tylko raz przy montowaniu

  const handleInstanceSelect = (instance) => {
    setSelectedInstance(instance);

    // Powiadom komponent nadrzędny o wybranej instancji
    if (typeof onSelectInstance === "function") {
      console.log("Selected instance:", instance);
      onSelectInstance(instance);
    } else {
      console.warn("onSelectInstance is not a function:", onSelectInstance);
    }
  };

  if (isLoading) {
    return (
      <div className="instance-overview-container">
        <div className="loading-indicator">Ładowanie instancji...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="instance-overview-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="instance-overview-container">
        <div className="empty-state">
          <p>Brak aktywnych instancji</p>
          <p>Utwórz instancję w ustawieniach, aby zacząć.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="instance-overview-container">
      <div className="instances-list">
        {instances.map((instance) => {
          const id = instance.instanceId || instance._id;
          const isSelected =
            selectedInstance &&
            (selectedInstance.instanceId === id || selectedInstance._id === id);

          return (
            <div
              key={id}
              className={`instance-item ${isSelected ? "selected" : ""}`}
              onClick={() => handleInstanceSelect(instance)}
            >
              <div className="instance-name">{instance.name}</div>
              <div className="instance-symbol">{instance.symbol}</div>
              <div
                className={`instance-status ${
                  instance.active ? "active" : "inactive"
                }`}
              >
                {instance.active ? "Aktywna" : "Nieaktywna"}
              </div>
            </div>
          );
        })}
      </div>

      {selectedInstance && (
        <div className="instance-details">
          <h3>Szczegóły Instancji</h3>
          <div className="details-content">
            <div className="details-section">
              <h4>Podstawowe Informacje</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Nazwa:</span>
                  <span className="detail-value">{selectedInstance.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Symbol:</span>
                  <span className="detail-value">
                    {selectedInstance.symbol}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span
                    className={`detail-value status ${
                      selectedInstance.active ? "active" : "inactive"
                    }`}
                  >
                    {selectedInstance.active ? "Aktywna" : "Nieaktywna"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Utworzono:</span>
                  <span className="detail-value">
                    {new Date(selectedInstance.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {selectedInstance.testMode && (
              <div className="test-mode-indicator">
                Ta instancja działa w trybie testowym
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstanceOverview;

import React, { useEffect } from "react";
import "./StrategySelector.css";

const StrategySelector = ({ onStrategySelect, selectedStrategy }) => {
  // Teraz mamy tylko jedną strategię - Hurst
  const defaultStrategy = {
    id: "hurst",
    name: "Hurst Channel Strategy",
    description:
      "Trading strategy based on Hurst Channel indicator, entering at lower band touch and exiting when price returns from upper extremum.",
    parameters: {
      period: 30,
      upperWidth: 1.16,
      lowerWidth: 1.18,
      firstEntry: 10,
      secondEntry: 25,
      thirdEntry: 50,
    },
  };

  useEffect(() => {
    // Automatycznie wybierz strategię Hurst po załadowaniu komponentu
    onStrategySelect(defaultStrategy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="strategy-selector card">
      <h2>Strategy</h2>
      <div className="strategies-list">
        <div className="strategy-item">
          <div className="strategy-header selected">
            <span className="strategy-name">{defaultStrategy.name}</span>
            <span className="expand-icon">✓</span>
          </div>

          <div className="strategy-details expanded">
            <p className="strategy-description">
              {defaultStrategy.description}
            </p>

            <div className="parameters-list">
              <h3>Parameters</h3>
              <div className="parameter-item">
                <label>Period:</label>
                <span>{defaultStrategy.parameters.period}</span>
              </div>
              <div className="parameter-item">
                <label>Upper Channel Width:</label>
                <span>{defaultStrategy.parameters.upperWidth}</span>
              </div>
              <div className="parameter-item">
                <label>Lower Channel Width:</label>
                <span>{defaultStrategy.parameters.lowerWidth}</span>
              </div>
              <div className="parameter-item">
                <label>First Entry Size (%):</label>
                <span>{defaultStrategy.parameters.firstEntry}%</span>
              </div>
              <div className="parameter-item">
                <label>Second Entry Size (%):</label>
                <span>{defaultStrategy.parameters.secondEntry}%</span>
              </div>
              <div className="parameter-item">
                <label>Third Entry Size (%):</label>
                <span>{defaultStrategy.parameters.thirdEntry}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategySelector;

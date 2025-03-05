import React from "react";
import "./StrategySelector.css";

const StrategySelector = ({ onStrategySelect, selectedStrategy }) => {
  const strategies = [
    {
      id: "momentum",
      name: "Momentum Strategy",
      description:
        "Trades based on price momentum indicators like RSI and MACD",
      parameters: [
        { name: "rsiPeriod", label: "RSI Period", type: "number", default: 14 },
        {
          name: "rsiOverbought",
          label: "RSI Overbought",
          type: "number",
          default: 70,
        },
        {
          name: "rsiOversold",
          label: "RSI Oversold",
          type: "number",
          default: 30,
        },
        {
          name: "macdFast",
          label: "MACD Fast EMA",
          type: "number",
          default: 12,
        },
        {
          name: "macdSlow",
          label: "MACD Slow EMA",
          type: "number",
          default: 26,
        },
        {
          name: "macdSignal",
          label: "MACD Signal",
          type: "number",
          default: 9,
        },
      ],
    },
    {
      id: "breakout",
      name: "Breakout Strategy",
      description: "Identifies and trades breakouts from key price levels",
      parameters: [
        { name: "period", label: "Period", type: "number", default: 20 },
        {
          name: "multiplier",
          label: "ATR Multiplier",
          type: "number",
          default: 2.5,
        },
        { name: "atrPeriod", label: "ATR Period", type: "number", default: 14 },
      ],
    },
    {
      id: "meanreversion",
      name: "Mean Reversion",
      description: "Trades based on price returning to its statistical mean",
      parameters: [
        {
          name: "lookback",
          label: "Lookback Period",
          type: "number",
          default: 50,
        },
        {
          name: "entryDeviation",
          label: "Entry Deviation",
          type: "number",
          default: 2,
        },
        {
          name: "exitDeviation",
          label: "Exit Deviation",
          type: "number",
          default: 0.5,
        },
      ],
    },
  ];

  const [expandedStrategy, setExpandedStrategy] = React.useState(null);
  const [parameters, setParameters] = React.useState({});

  React.useEffect(() => {
    // Inicjalizacja domyślnych parametrów
    const defaultParams = {};
    strategies.forEach((strategy) => {
      const strategyParams = {};
      strategy.parameters.forEach((param) => {
        strategyParams[param.name] = param.default;
      });
      defaultParams[strategy.id] = strategyParams;
    });
    setParameters(defaultParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStrategyClick = (strategyId) => {
    setExpandedStrategy(expandedStrategy === strategyId ? null : strategyId);

    if (expandedStrategy !== strategyId) {
      const strategy = strategies.find((s) => s.id === strategyId);
      onStrategySelect({
        ...strategy,
        parameters: parameters[strategyId],
      });
    }
  };

  const handleParameterChange = (strategyId, paramName, value) => {
    const updatedParams = {
      ...parameters,
      [strategyId]: {
        ...parameters[strategyId],
        [paramName]: value,
      },
    };

    setParameters(updatedParams);

    if (selectedStrategy && selectedStrategy.id === strategyId) {
      onStrategySelect({
        ...selectedStrategy,
        parameters: updatedParams[strategyId],
      });
    }
  };

  return (
    <div className="strategy-selector card">
      <h2>Select Strategy</h2>

      <div className="strategies-list">
        {strategies.map((strategy) => (
          <div key={strategy.id} className="strategy-item">
            <div
              className={`strategy-header ${
                selectedStrategy?.id === strategy.id ? "selected" : ""
              }`}
              onClick={() => handleStrategyClick(strategy.id)}
            >
              <span className="strategy-name">{strategy.name}</span>
              <span className="expand-icon">
                {expandedStrategy === strategy.id ? "−" : "+"}
              </span>
            </div>

            <div
              className={`strategy-details ${
                expandedStrategy === strategy.id ? "expanded" : ""
              }`}
            >
              <p className="strategy-description">{strategy.description}</p>

              <div className="parameters-list">
                <h3>Parameters</h3>
                {strategy.parameters.map((param) => (
                  <div key={param.name} className="parameter-item">
                    <label htmlFor={`${strategy.id}-${param.name}`}>
                      {param.label}
                    </label>
                    <input
                      id={`${strategy.id}-${param.name}`}
                      type={param.type}
                      value={
                        parameters[strategy.id]?.[param.name] || param.default
                      }
                      onChange={(e) =>
                        handleParameterChange(
                          strategy.id,
                          param.name,
                          param.type === "number"
                            ? Number(e.target.value)
                            : e.target.value
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategySelector;

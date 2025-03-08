import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import "./CandleDataViewer.css";

const CandleDataViewer = ({ data, isLoading, hurstData }) => {
  const [activeTab, setActiveTab] = useState("price");

  console.log("Dane otrzymane w CandleDataViewer:", data);

  if (isLoading) {
    return (
      <div className="candle-viewer card loading">
        <div className="loader"></div>
        <h3>Loading data...</h3>
        <p>Fetching market data from database</p>
      </div>
    );
  }

  if (!data || !data.candles || data.candles.length === 0) {
    return (
      <div className="candle-viewer card empty">
        <div className="placeholder-content">
          <h3>No Data Available</h3>
          <p>
            Import data using the panel on the left to visualize price history
          </p>
        </div>
      </div>
    );
  }

  // Konwertujemy dane do formatu, który jest oczekiwany przez komponenty wykresów
  const chartData = data.candles.map((candle) => ({
    date: new Date(candle.time || candle.timestamp).toLocaleDateString(),
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
    volume: parseFloat(candle.volume),
  }));

  // Dodajemy dane wskaźnika Hursta jeśli są dostępne
  let chartDataWithHurst = chartData;
  if (hurstData && hurstData.middle && hurstData.middle.length > 0) {
    // Mapowanie danych Hursta do dat
    const hurstDateMap = {
      middle: {},
      upper: {},
      lower: {},
      oscillator: {},
    };

    hurstData.middle.forEach((item) => {
      const date = new Date(item.time).toLocaleDateString();
      hurstDateMap.middle[date] = item.value;
    });

    hurstData.upper.forEach((item) => {
      const date = new Date(item.time).toLocaleDateString();
      hurstDateMap.upper[date] = item.value;
    });

    hurstData.lower.forEach((item) => {
      const date = new Date(item.time).toLocaleDateString();
      hurstDateMap.lower[date] = item.value;
    });

    hurstData.oscillator.forEach((item) => {
      const date = new Date(item.time).toLocaleDateString();
      hurstDateMap.oscillator[date] = item.value;
    });

    // Dodajemy wskaźniki Hursta do danych wykresu
    chartDataWithHurst = chartData.map((item) => ({
      ...item,
      hurstMiddle: hurstDateMap.middle[item.date],
      hurstUpper: hurstDateMap.upper[item.date],
      hurstLower: hurstDateMap.lower[item.date],
      hurstOscillator: hurstDateMap.oscillator[item.date],
    }));
  }

  // Używamy wszystkich danych bez filtrowania
  const filteredData = chartDataWithHurst;

  // Calculate basic statistics
  const lastCandle = chartData[chartData.length - 1];
  const firstCandle = chartData[0];
  const priceChange = lastCandle.close - firstCandle.close;
  const percentChange = (priceChange / firstCandle.close) * 100;

  const highestPrice = Math.max(...chartData.map((d) => d.high));
  const lowestPrice = Math.min(...chartData.map((d) => d.low));
  const averageVolume =
    chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length;

  return (
    <div className="candle-viewer card">
      <div className="data-header">
        <h2>
          Market Data: {data.pair} ({data.timeframe})
        </h2>
        <div className="data-summary">
          <div className="metric">
            <span className="label">Last Price</span>
            <span className="value">${lastCandle.close.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="label">Change</span>
            <span
              className={`value ${priceChange >= 0 ? "positive" : "negative"}`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
            </span>
          </div>
          <div className="metric">
            <span className="label">Period</span>
            <span className="value small">
              {new Date(data.startDate).toLocaleDateString()} -{" "}
              {new Date(data.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="metric">
            <span className="label">Candles</span>
            <span className="value">{data.candles.length}</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "price" ? "active" : ""}
          onClick={() => setActiveTab("price")}
        >
          Price Chart
        </button>
        <button
          className={activeTab === "volume" ? "active" : ""}
          onClick={() => setActiveTab("volume")}
        >
          Volume
        </button>
        <button
          className={activeTab === "combined" ? "active" : ""}
          onClick={() => setActiveTab("combined")}
        >
          Price & Volume
        </button>
        {hurstData && (
          <button
            className={activeTab === "hurst" ? "active" : ""}
            onClick={() => setActiveTab("hurst")}
          >
            Hurst Channel
          </button>
        )}
        <button
          className={activeTab === "data" ? "active" : ""}
          onClick={() => setActiveTab("data")}
        >
          Data Table
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "price" && (
          <div className="price-chart-tab">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(value) => [`$${value.toFixed(2)}`, "Price"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#FFC107"
                    name="Close Price"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="high"
                    stroke="#4CAF50"
                    name="High"
                    dot={false}
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="low"
                    stroke="#F44336"
                    name="Low"
                    dot={false}
                    strokeDasharray="3 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h4>Price Statistics</h4>
                <div className="stat-item">
                  <span>Highest Price:</span>
                  <span>${highestPrice.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Lowest Price:</span>
                  <span>${lowestPrice.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Range:</span>
                  <span>${(highestPrice - lowestPrice).toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Open:</span>
                  <span>${firstCandle.open.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Close:</span>
                  <span>${lastCandle.close.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "volume" && (
          <div className="volume-chart-tab">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [value.toFixed(2), "Volume"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="volume" fill="#FFC107" name="Volume" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h4>Volume Statistics</h4>
                <div className="stat-item">
                  <span>Average Volume:</span>
                  <span>{averageVolume.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span>Highest Volume:</span>
                  <span>
                    {Math.max(...filteredData.map((d) => d.volume)).toFixed(2)}
                  </span>
                </div>
                <div className="stat-item">
                  <span>Lowest Volume:</span>
                  <span>
                    {Math.min(...filteredData.map((d) => d.volume)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "combined" && (
          <div className="combined-chart-tab">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" domain={["auto", "auto"]} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="close"
                    stroke="#FFC107"
                    name="Price"
                    dot={false}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="volume"
                    fill="#4CAF50"
                    name="Volume"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "hurst" && hurstData && (
          <div className="hurst-chart-tab">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#FFC107"
                    name="Close Price"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="hurstUpper"
                    stroke="#F44336"
                    name="Hurst Upper Band"
                    dot={false}
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="hurstMiddle"
                    stroke="#2196F3"
                    name="Hurst Middle"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="hurstLower"
                    stroke="#4CAF50"
                    name="Hurst Lower Band"
                    dot={false}
                    strokeDasharray="3 3"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container" style={{ marginTop: "20px" }}>
              <h4>Hurst Oscillator</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[-1, 1]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hurstOscillator"
                    stroke="#673AB7"
                    name="Hurst Oscillator"
                  />
                  <Line
                    type="monotone"
                    dataKey={() => 0.9}
                    stroke="#FF9800"
                    strokeDasharray="3 3"
                    name="Upper Threshold"
                  />
                  <Line
                    type="monotone"
                    dataKey={() => 0}
                    stroke="#9E9E9E"
                    strokeDasharray="3 3"
                    name="Middle"
                  />
                  <Line
                    type="monotone"
                    dataKey={() => -0.9}
                    stroke="#FF9800"
                    strokeDasharray="3 3"
                    name="Lower Threshold"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="stats-grid" style={{ marginTop: "20px" }}>
              <div className="stat-card">
                <h4>Hurst Channel Settings</h4>
                <div className="stat-item">
                  <span>Period:</span>
                  <span>30</span>
                </div>
                <div className="stat-item">
                  <span>Upper Width:</span>
                  <span>1.16</span>
                </div>
                <div className="stat-item">
                  <span>Lower Width:</span>
                  <span>1.18</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="data-table-tab">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Open</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Close</th>
                    <th>Volume</th>
                    {hurstData && <th>Hurst Oscillator</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((candle, index) => (
                    <tr key={index}>
                      <td>{candle.date}</td>
                      <td>${candle.open.toFixed(2)}</td>
                      <td>${candle.high.toFixed(2)}</td>
                      <td>${candle.low.toFixed(2)}</td>
                      <td>${candle.close.toFixed(2)}</td>
                      <td>{candle.volume.toFixed(2)}</td>
                      {hurstData && (
                        <td>
                          {candle.hurstOscillator !== undefined
                            ? candle.hurstOscillator.toFixed(4)
                            : "-"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandleDataViewer;

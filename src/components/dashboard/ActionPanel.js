import React, { useState } from "react";
import "./ActionPanel.css";

const ActionPanel = () => {
  const [isDeadManSwitchActive, setDeadManSwitchActive] = useState(false);

  const toggleDeadManSwitch = () => {
    setDeadManSwitchActive(!isDeadManSwitchActive);
    // Tu faktycznie nic się nie robi, jak w założeniu
    console.log("Dead Man Switch toggled:", !isDeadManSwitchActive);
  };

  return (
    <div className="action-panel">
      <div className="quick-actions">
        <button className="action-btn start-bot">
          <span className="btn-icon">▶</span>
          Start Bot
        </button>

        <button className="action-btn pause-bot">
          <span className="btn-icon">⏸</span>
          Pause Bot
        </button>

        <button className="action-btn settings">
          <span className="btn-icon">⚙</span>
          Bot Settings
        </button>

        <button
          className={`action-btn dead-man-switch ${
            isDeadManSwitchActive ? "active" : ""
          }`}
          onClick={toggleDeadManSwitch}
        >
          <span className="btn-icon">⚠</span>
          Dead Man Switch
        </button>
      </div>

      {isDeadManSwitchActive && (
        <div className="switch-confirmation">
          Dead Man Switch is active. The bot will execute the emergency protocol
          if not deactivated within the set time.
        </div>
      )}
    </div>
  );
};

export default ActionPanel;

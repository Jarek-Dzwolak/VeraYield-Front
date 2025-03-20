import React, { useState, useEffect } from "react";
import "./ActionPanel.css";

const ActionPanel = () => {
  const [isDeadManSwitchActive, setDeadManSwitchActive] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Wykrywanie rozmiaru ekranu
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleDeadManSwitch = () => {
    setDeadManSwitchActive(!isDeadManSwitchActive);
  };

  return (
    <div>
      <div className="quick-actions">
        <div></div>
        <button className="action-btn start-bot">
          <span className="btn-icon">▶</span>
          <div className="btn-text">
            {isMobile ? (
              "Start Bot"
            ) : (
              <>
                <span>Start</span>
                <span>Bot</span>
              </>
            )}
          </div>
        </button>

        <button className="action-btn pause-bot">
          <span className="btn-icon">⏸</span>
          <div className="btn-text">
            {isMobile ? (
              "Pause Bot"
            ) : (
              <>
                <span>Pause</span>
                <span>Bot</span>
              </>
            )}
          </div>
        </button>

        <button className="action-btn settings">
          <span className="btn-icon">⚙</span>
          <div className="btn-text">
            {isMobile ? (
              "Bot Settings"
            ) : (
              <>
                <span>Bot</span>
                <span>Settings</span>
              </>
            )}
          </div>
        </button>

        <button
          className={`action-btn dead-man-switch ${
            isDeadManSwitchActive ? "active" : ""
          }`}
          onClick={toggleDeadManSwitch}
        >
          <span className="btn-icon">⚠</span>
          <div className="btn-text">
            {isMobile ? (
              "Dead Man Switch"
            ) : (
              <>
                <span>Dead</span>
                <span>Man</span>
                <span>Switch</span>
              </>
            )}
          </div>
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

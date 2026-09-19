import React, { useState } from "react";
import { useSocket, getBackendUrl } from "../context/SocketContext";
import { getAiBackendUrl } from "../services/aiApi";
import { Settings, Check, RefreshCw, X, AlertCircle } from "lucide-react";

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { setCustomBackendUrl, isConnected } = useSocket();
  const [sensorUrl, setSensorUrl] = useState(() => getBackendUrl());
  const [aiUrl, setAiUrl] = useState(() => getAiBackendUrl());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSensor = sensorUrl.trim();
    const cleanAi = aiUrl.trim();

    setCustomBackendUrl(cleanSensor);
    localStorage.setItem("pmp_ai_backend_url", cleanAi);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetToRender = () => {
    setSensorUrl("https://pmp-sensor-simulator.onrender.com");
    setAiUrl("https://pmp-ai-backend.onrender.com");
  };

  const handleResetToLocal = () => {
    setSensorUrl("http://localhost:3001");
    setAiUrl("http://localhost:8000");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(10, 15, 29, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="card-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#0d1527",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings size={18} color="var(--color-accent)" />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#fff" }}>
              Backend Connection Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(14, 165, 233, 0.2)",
            borderRadius: "6px",
            padding: "10px",
            fontSize: "11px",
            color: "#94a3b8",
            lineHeight: 1.4,
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-accent)", fontWeight: 600, marginBottom: "4px" }}>
            <AlertCircle size={14} /> Render Free Tier Notice
          </div>
          Render free tier web services spin down after 15 minutes of inactivity. On the first request, they take approximately <strong>45-60 seconds</strong> to wake up. Paste your public <code>.onrender.com</code> service URLs below.
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Sensor Simulator & WebSocket Gateway URL
            </label>
            <input
              type="text"
              value={sensorUrl}
              onChange={(e) => setSensorUrl(e.target.value)}
              placeholder="https://pmp-sensor-simulator.onrender.com"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#080d1a",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "#e2e8f0",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                boxSizing: "border-box",
              }}
            />
            <span style={{ fontSize: "10px", color: isConnected ? "var(--color-ok)" : "var(--color-warn)", marginTop: "3px", display: "block" }}>
              Status: {isConnected ? "● Connected (Receiving Telemetry)" : "○ Not connected or waking up"}
            </span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              AI Microservice URL (FastAPI / Prognostics / Copilot)
            </label>
            <input
              type="text"
              value={aiUrl}
              onChange={(e) => setAiUrl(e.target.value)}
              placeholder="https://pmp-ai-backend.onrender.com"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#080d1a",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "#e2e8f0",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={handleResetToRender}
              style={{
                flex: 1,
                padding: "6px",
                fontSize: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Default Render URLs
            </button>
            <button
              type="button"
              onClick={handleResetToLocal}
              style={{
                flex: 1,
                padding: "6px",
                fontSize: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Reset to Localhost
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 14px",
                fontSize: "11px",
                background: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                padding: "6px 16px",
              }}
            >
              {savedSuccess ? <Check size={13} /> : <RefreshCw size={13} />}
              {savedSuccess ? "Saved!" : "Save & Reconnect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

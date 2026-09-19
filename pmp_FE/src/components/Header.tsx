import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { computeMLPrediction } from "../utils/predictiveEngine";
import { fetchMLPrediction } from "../services/aiApi";
import { Cpu, Wifi, WifiOff, Bot, Sparkles, Settings } from "lucide-react";
import { FeederState } from "../types/telemetry";
import type { MLPrediction } from "../types/ai";
import { ApiSettingsModal } from "./ApiSettingsModal";

interface HeaderProps {
  onOpenCopilot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCopilot }) => {
  const { telemetry, isConnected } = useSocket();
  const [prediction, setPrediction] = useState<MLPrediction>(() => computeMLPrediction(telemetry));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchMLPrediction(telemetry).then((pred) => {
      if (isMounted) setPrediction(pred);
    });
    return () => {
      isMounted = false;
    };
  }, [telemetry]);

  const health = telemetry?.healthScore ?? 100;

  // Decide health color
  let healthColorClass = "ok";
  if (health < 40) healthColorClass = "crit";
  else if (health < 75) healthColorClass = "warn";

  // Decide state string styling
  const state = telemetry?.state ?? FeederState.IDLE;
  let stateStyle = {};
  if (state === FeederState.RUNNING) stateStyle = { color: "var(--color-ok)" };
  else if (state === FeederState.DEGRADED || state === FeederState.PRE_FAILURE) stateStyle = { color: "var(--color-warn)" };
  else if (state === FeederState.FAILURE || state === FeederState.TRIP) stateStyle = { color: "var(--color-crit)" };

  const hasAnomaly = telemetry?.activeFailureMode || (telemetry?.alerts && telemetry.alerts.length > 0) || health < 75;

  return (
    <header className="card-panel" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "6px", padding: "5px 12px", marginBottom: "0px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ background: "rgba(14, 165, 233, 0.15)", border: "1px solid rgba(14, 165, 233, 0.3)", padding: "6px", borderRadius: "4px", display: "flex", alignItems: "center" }}>
          <Cpu size={18} color="#0ea5e9" className="pulse-indicator" />
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, letterSpacing: "0.2px", textTransform: "uppercase", background: "linear-gradient(to right, #0ea5e9, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Predictive Maintenance Platform
          </h1>
          <p style={{ fontSize: "10.5px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            AIoT Industry 4.0 Asset Diagnostics
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
        {/* Connection status & API Config button */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Gateway:</span>
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Click to check or configure backend URLs"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            {isConnected ? (
              <span className="status-badge ok" style={{ fontSize: "10px", padding: "1px 6px" }}>
                <Wifi size={11} style={{ marginRight: "3px" }} /> Online
              </span>
            ) : (
              <span className="status-badge crit" style={{ fontSize: "10px", padding: "1px 6px" }}>
                <WifiOff size={11} style={{ marginRight: "3px" }} /> Offline
              </span>
            )}
            <Settings size={12} color="var(--text-secondary)" style={{ opacity: 0.7 }} />
          </button>
        </div>

        <ApiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        {/* Equipment status info */}
        {telemetry && (
          <>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>Equipment</span>
              <span style={{ fontSize: "11.5px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{telemetry.equipmentId}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>Plant</span>
              <span style={{ fontSize: "11.5px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{telemetry.plantId}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>State</span>
              <span style={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "var(--font-mono)", ...stateStyle }}>{state}</span>
            </div>
          </>
        )}

        {/* Est RUL and Health Score Meter */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>Est. RUL</span>
            <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono)", color: prediction.estimatedRulHours < 48 ? "var(--color-crit)" : prediction.estimatedRulHours < 150 ? "var(--color-warn)" : "var(--color-ok)" }}>
              {prediction.estimatedRulHours}h
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>Health</span>
            <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono)", color: `var(--color-${healthColorClass})` }}>{health}%</span>
          </div>
          <div style={{ width: "65px", height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--border-color)", position: "relative" }}>
            <div
              style={{
                width: `${health}%`,
                height: "100%",
                background: `var(--color-${healthColorClass})`,
                boxShadow: `0 0 8px var(--color-${healthColorClass})`,
                transition: "width 0.5s ease-in-out, background 0.3s ease"
              }}
            />
          </div>
        </div>

        {/* AI Copilot Summon Button */}
        {onOpenCopilot && (
          <button
            onClick={onOpenCopilot}
            style={{
              background: hasAnomaly ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(14, 165, 233, 0.25))" : "linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(16, 185, 129, 0.15))",
              border: hasAnomaly ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid rgba(14, 165, 233, 0.4)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 600,
              boxShadow: hasAnomaly ? "0 0 10px rgba(239, 68, 68, 0.35)" : "none",
              transition: "all 0.2s ease"
            }}
            title="Open AI Maintenance Copilot & RAG Manuals"
          >
            <Bot size={14} color={hasAnomaly ? "#fca5a5" : "#38bdf8"} className={hasAnomaly ? "pulse-indicator" : ""} />
            <span>AI Copilot</span>
            {hasAnomaly ? (
              <span style={{ background: "#ef4444", color: "#fff", fontSize: "8.5px", padding: "1px 4px", borderRadius: "8px", fontWeight: 700 }}>
                Alert
              </span>
            ) : (
              <Sparkles size={11} color="#38bdf8" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};

import React from "react";
import { useSocket } from "../context/SocketContext";
import { Cpu, Wifi, WifiOff } from "lucide-react";
import { FeederState } from "../types/telemetry";

export const Header: React.FC = () => {
  const { telemetry, isConnected } = useSocket();

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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px" }}>
        {/* Connection status */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Gateway:</span>
          {isConnected ? (
            <span className="status-badge ok" style={{ fontSize: "10px", padding: "1px 6px" }}>
              <Wifi size={11} style={{ marginRight: "3px" }} /> Online
            </span>
          ) : (
            <span className="status-badge crit" style={{ fontSize: "10px", padding: "1px 6px" }}>
              <WifiOff size={11} style={{ marginRight: "3px" }} /> Offline
            </span>
          )}
        </div>

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

        {/* Health Score Meter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>Health</span>
            <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono)", color: `var(--color-${healthColorClass})` }}>{health}%</span>
          </div>
          <div style={{ width: "70px", height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--border-color)", position: "relative" }}>
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
      </div>
    </header>
  );
};

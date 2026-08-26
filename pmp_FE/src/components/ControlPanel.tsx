import React from "react";
import { useSocket } from "../context/SocketContext";
import { Sliders, AlertOctagon, RotateCcw } from "lucide-react";
import { FeederState } from "../types/telemetry";

export const ControlPanel: React.FC = () => {
  const { telemetry, changeSetpoint, injectFailure, resetFeeder, isConnected } = useSocket();

  const setpoint = telemetry?.sensors.feed_rate_setpoint.value ?? 50;
  const activeFault = telemetry?.activeFailureMode ?? null;
  const isHalted = telemetry?.state === FeederState.TRIP;

  const faults = [
    { code: "FM-01", label: "Zero Drift", desc: "Scale build-up weight offset" },
    { code: "FM-02", label: "Belt Slippage", desc: "Pulley speed lag & current spike" },
    { code: "FM-03", label: "Bearing Wear", desc: "Drive housing vibration (>7.1 mm/s)" },
    { code: "FM-04", label: "Chute Blockage", desc: "Belt stall & motor interlock trip" },
    { code: "FM-05", label: "Mistracking", desc: "Asymmetric tension & oscillation" }
  ];

  return (
    <div className="card-panel" style={{ padding: "10px 12px" }}>
      <h2 className="card-title" style={{ marginBottom: "8px" }}>
        <Sliders size={14} color="#0ea5e9" /> Control Console
      </h2>

      {/* Setpoint Slider */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px" }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Target Feed Setpoint</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-accent)" }}>
            {setpoint} t/h
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="90"
          value={setpoint}
          disabled={!isConnected || isHalted}
          onChange={(e) => changeSetpoint(parseInt(e.target.value, 10))}
          className="input-range"
          style={{ margin: "2px 0" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          <span>10 t/h</span>
          <span>50 t/h</span>
          <span>90 t/h</span>
        </div>
      </div>

      {/* Fault Injection Panel */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", fontSize: "10.5px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <AlertOctagon size={12} color="#f87171" /> Inject Diagnostics
        </div>
        
        {/* Single Column Vertical Stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {faults.map((f) => {
            const isActive = activeFault === f.code;
            return (
              <button
                key={f.code}
                className={`btn-control btn-danger ${isActive ? "active" : ""}`}
                disabled={!isConnected || isHalted}
                onClick={() => injectFailure(f.code)}
                style={{ 
                  padding: "5px 8px", 
                  fontSize: "11px", 
                  justifyContent: "flex-start",
                  textAlign: "left",
                  width: "100%"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                  <span style={{ fontWeight: 600, color: isActive ? "#ff8a8a" : "inherit" }}>{f.code}: {f.label}</span>
                  <span style={{ fontSize: "9.5px", opacity: 0.7, fontWeight: 400, whiteSpace: "normal" }}>{f.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset & Restart Command */}
      <div style={{ display: "flex", marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
        <button
          className="btn-control btn-success"
          onClick={resetFeeder}
          disabled={!isConnected}
          style={{ flex: 1, padding: "6px", fontWeight: 600, fontSize: "11px" }}
        >
          <RotateCcw size={12} /> Reset & Clear Faults
        </button>
      </div>
    </div>
  );
};

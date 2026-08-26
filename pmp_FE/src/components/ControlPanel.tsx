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
    { code: "FM-01", label: "Load Cell Zero Drift", desc: "Buildup on scale causing weight offset" },
    { code: "FM-02", label: "Belt Slippage Anomaly", desc: "Tension loss, speed output drop" },
    { code: "FM-03", label: "Drive Bearing Wear", desc: "ISO-10816 bearing housing vibration" },
    { code: "FM-04", label: "Feed Chute Jam / Stall", desc: "Sudden load spike, belt stall" },
    { code: "FM-05", label: "Pulley Mistracking", desc: "Asymmetric belt tension, oscillation" }
  ];

  return (
    <div className="card-panel">
      <h2 className="card-title">
        <Sliders size={18} color="#0ea5e9" /> Control Console
      </h2>

      {/* Setpoint Slider */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Feed Rate Setpoint</span>
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
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          <span>10 t/h</span>
          <span>50 t/h</span>
          <span>90 t/h</span>
        </div>
      </div>

      {/* Fault Injection Panel */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <AlertOctagon size={14} color="#f87171" /> Inject Diagnostics Anomalies
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {faults.map((f) => {
            const isActive = activeFault === f.code;
            return (
              <button
                key={f.code}
                className={`btn-control btn-danger ${isActive ? "active" : ""}`}
                disabled={!isConnected || isHalted}
                onClick={() => injectFailure(f.code)}
                style={{ justifyContent: "flex-start", textAlign: "left", padding: "10px 12px" }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>{f.code}: {f.label}</span>
                  <span style={{ fontSize: "11px", opacity: 0.7, fontWeight: 400 }}>{f.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset & Restart Command */}
      <div style={{ display: "flex", gap: "10px", marginTop: "20px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
        <button
          className="btn-control btn-success"
          onClick={resetFeeder}
          disabled={!isConnected}
          style={{ flex: 1, padding: "10px", fontWeight: 600 }}
        >
          <RotateCcw size={16} /> Reset & Clear Faults
        </button>
      </div>
    </div>
  );
};

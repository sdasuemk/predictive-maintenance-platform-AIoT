import React from "react";
import { useSocket } from "../context/SocketContext";
import { 
  Gauge, Scale, TrendingUp, TrendingDown, Thermometer, Zap, Activity, Droplets, Shield, Compass
} from "lucide-react";
import { SensorStatus } from "../types/telemetry";
import type { SensorReading } from "../types/telemetry";

export const MetricsGrid: React.FC = () => {
  const { telemetry } = useSocket();

  if (!telemetry) {
    return (
      <div className="card-panel" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", fontFamily: "var(--font-mono)" }}>
          Waiting for live telemetry stream packet ingestion...
        </p>
      </div>
    );
  }

  const s = telemetry.sensors;

  const processMetrics = [
    { key: "feed_rate_actual", label: "Actual Feed Rate", reading: s.feed_rate_actual, icon: <Gauge size={16} /> },
    { key: "feed_rate_setpoint", label: "Feed Setpoint", reading: s.feed_rate_setpoint, icon: <Compass size={16} /> },
    { key: "feed_rate_deviation", label: "Rate Deviation", reading: s.feed_rate_deviation, icon: s.feed_rate_deviation.value >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} /> },
    { key: "belt_load", label: "Belt Load Cell", reading: s.belt_load, icon: <Scale size={16} /> },
    { key: "belt_speed", label: "Belt Speed", reading: s.belt_speed, icon: <Gauge size={16} /> },
    { key: "totalizer", label: "Totalizer Accumulator", reading: s.totalizer, icon: <Shield size={16} />, isTotalizer: true }
  ];

  const mechMetrics = [
    { key: "motor_current", label: "Motor Current", reading: s.motor_current, icon: <Zap size={16} /> },
    { key: "motor_temp", label: "Motor Temp", reading: s.motor_temp, icon: <Thermometer size={16} /> },
    { key: "belt_tension", label: "Belt Tension", reading: s.belt_tension, icon: <Scale size={16} /> },
    { key: "vibration_drive", label: "Drive End Vibration", reading: s.vibration_drive, icon: <Activity size={16} /> },
    { key: "vibration_tail", label: "Tail End Vibration", reading: s.vibration_tail, icon: <Activity size={16} /> },
    { key: "zero_drift", label: "Zero-Point Drift", reading: s.zero_drift, icon: <Scale size={16} /> }
  ];

  const envMetrics = [
    { key: "moisture", label: "Material Moisture", reading: s.moisture, icon: <Droplets size={16} /> },
    { key: "ambient_temp", label: "Ambient Temp", reading: s.ambient_temp, icon: <Thermometer size={16} /> }
  ];

  const renderCard = (m: any) => {
    const reading = m.reading as SensorReading;
    const isWarn = reading.status === SensorStatus.WARNING || reading.status === SensorStatus.HIGH || reading.status === SensorStatus.LOW;
    const isCrit = reading.status === SensorStatus.CRITICAL;

    let badgeClass = "ok";
    if (isCrit) badgeClass = "crit";
    else if (isWarn) badgeClass = "warn";

    let borderStyle = {};
    if (isCrit) borderStyle = { borderColor: "var(--color-crit)", boxShadow: "0 0 10px rgba(248,113,113,0.1)" };
    else if (isWarn) borderStyle = { borderColor: "var(--color-warn)", boxShadow: "0 0 10px rgba(251,191,36,0.08)" };

    // Format value
    let valStr = reading.value.toString();
    if (m.isTotalizer) {
      valStr = reading.value.toFixed(2);
    } else if (typeof reading.value === "number") {
      // Keep decimal places clean
      valStr = Number.isInteger(reading.value) ? reading.value.toString() : reading.value.toFixed(2);
    }

    return (
      <div 
        key={m.key} 
        className="card-panel" 
        style={{ 
          padding: "12px 16px", 
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "space-between", 
          gap: "10px",
          background: "rgba(10, 15, 30, 0.4)",
          ...borderStyle
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
            <span style={{ color: isCrit ? "var(--color-crit)" : isWarn ? "var(--color-warn)" : "var(--color-accent)" }}>
              {m.icon}
            </span>
            {m.label}
          </span>
          <span className={`status-badge ${badgeClass}`} style={{ fontSize: "9px", padding: "1px 6px" }}>
            {reading.status}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ 
            fontSize: "20px", 
            fontWeight: 700, 
            fontFamily: "var(--font-mono)", 
            color: isCrit ? "var(--color-crit)" : isWarn ? "var(--color-warn)" : "#fff" 
          }}>
            {valStr}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {reading.unit}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Process Metrics Section */}
      <div>
        <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-accent)" }} />
          Process Variables Telemetry
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
          {processMetrics.map(renderCard)}
        </div>
      </div>

      {/* Mechanical Metrics Section */}
      <div>
        <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-info)" }} />
          Mechanical & Pulley Diagnostics
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
          {mechMetrics.map(renderCard)}
        </div>
      </div>

      {/* Environment Metrics Section */}
      <div>
        <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-ok)" }} />
          Ambient & Material Conditions
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
          {envMetrics.map(renderCard)}
        </div>
      </div>
    </div>
  );
};

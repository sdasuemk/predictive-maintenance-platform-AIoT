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
      <div className="card-panel" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "150px" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
          Awaiting telemetry payload...
        </p>
      </div>
    );
  }

  const s = telemetry.sensors;

  const allMetrics = [
    { key: "feed_rate_actual", label: "Feed Actual", reading: s.feed_rate_actual, icon: <Gauge size={11} /> },
    { key: "feed_rate_setpoint", label: "Feed Setpt", reading: s.feed_rate_setpoint, icon: <Compass size={11} /> },
    { key: "feed_rate_deviation", label: "Deviation", reading: s.feed_rate_deviation, icon: s.feed_rate_deviation.value >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} /> },
    { key: "belt_load", label: "Belt Load", reading: s.belt_load, icon: <Scale size={11} /> },
    { key: "belt_speed", label: "Belt Speed", reading: s.belt_speed, icon: <Gauge size={11} /> },
    { key: "totalizer", label: "Totalizer", reading: s.totalizer, icon: <Shield size={11} />, isTotalizer: true },
    { key: "motor_current", label: "Motor Curr", reading: s.motor_current, icon: <Zap size={11} /> },
    { key: "motor_temp", label: "Motor Temp", reading: s.motor_temp, icon: <Thermometer size={11} /> },
    { key: "belt_tension", label: "Tension", reading: s.belt_tension, icon: <Scale size={11} /> },
    { key: "vibration_drive", label: "Drive Vib", reading: s.vibration_drive, icon: <Activity size={11} /> },
    { key: "vibration_tail", label: "Tail Vib", reading: s.vibration_tail, icon: <Activity size={11} /> },
    { key: "zero_drift", label: "Zero Drift", reading: s.zero_drift, icon: <Scale size={11} /> },
    { key: "moisture", label: "Moisture", reading: s.moisture, icon: <Droplets size={11} /> },
    { key: "ambient_temp", label: "Ambient", reading: s.ambient_temp, icon: <Thermometer size={11} /> }
  ];

  return (
    <div className="card-panel" style={{ padding: "5px 8px" }}>
      <h2 className="card-title" style={{ marginBottom: "4px", fontSize: "10.5px", paddingBottom: "2px" }}>
        <Activity size={11} color="var(--color-accent)" /> Telemetry Parameters
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 6px" }}>
        {allMetrics.map((m) => {
          const reading = m.reading as SensorReading;
          const isWarn = reading.status === SensorStatus.WARNING || reading.status === SensorStatus.HIGH || reading.status === SensorStatus.LOW;
          const isCrit = reading.status === SensorStatus.CRITICAL;

          let statusColor = "var(--color-ok)";
          if (isCrit) statusColor = "var(--color-crit)";
          else if (isWarn) statusColor = "var(--color-warn)";

          // Format value
          let valStr = reading.value.toString();
          if (m.isTotalizer) {
            valStr = reading.value.toFixed(1);
          } else if (typeof reading.value === "number") {
            valStr = Number.isInteger(reading.value) ? reading.value.toString() : reading.value.toFixed(2);
          }

          return (
            <div 
              key={m.key} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                padding: "2px 4px",
                borderRadius: "3px",
                background: isCrit ? "rgba(239, 68, 68, 0.08)" : isWarn ? "rgba(251, 191, 36, 0.05)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${isCrit ? "rgba(239, 68, 68, 0.2)" : isWarn ? "rgba(251, 191, 36, 0.2)" : "rgba(255,255,255,0.03)"}`,
                minWidth: 0
              }}
            >
              {/* Left: Icon + Name */}
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9.5px", color: "var(--text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: isCrit ? "var(--color-crit)" : isWarn ? "var(--color-warn)" : "var(--color-accent)", display: "flex", flexShrink: 0 }}>
                  {m.icon}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</span>
              </span>

              {/* Right: Value + Unit + Status Dot */}
              <div style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0, marginLeft: "4px" }}>
                <span style={{ 
                  fontSize: "10px", 
                  fontWeight: 600, 
                  fontFamily: "var(--font-mono)",
                  color: isCrit ? "var(--color-crit)" : isWarn ? "var(--color-warn)" : "#fff"
                }}>
                  {valStr}
                </span>
                <span style={{ fontSize: "8px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {reading.unit}
                </span>
                {/* Status Dot */}
                <span 
                  className={isCrit || isWarn ? "pulse-indicator" : ""}
                  style={{ 
                    width: "5px", 
                    height: "5px", 
                    borderRadius: "50%", 
                    background: statusColor,
                    display: "inline-block",
                    marginLeft: "2px"
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

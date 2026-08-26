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
    { key: "feed_rate_actual", label: "Actual Feed Rate", reading: s.feed_rate_actual, icon: <Gauge size={13} /> },
    { key: "feed_rate_setpoint", label: "Feed Setpoint", reading: s.feed_rate_setpoint, icon: <Compass size={13} /> },
    { key: "feed_rate_deviation", label: "Rate Deviation", reading: s.feed_rate_deviation, icon: s.feed_rate_deviation.value >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} /> },
    { key: "belt_load", label: "Belt Load Cell", reading: s.belt_load, icon: <Scale size={13} /> },
    { key: "belt_speed", label: "Belt Speed", reading: s.belt_speed, icon: <Gauge size={13} /> },
    { key: "totalizer", label: "Totalizer Accumulator", reading: s.totalizer, icon: <Shield size={13} />, isTotalizer: true },
    { key: "motor_current", label: "Motor Current", reading: s.motor_current, icon: <Zap size={13} /> },
    { key: "motor_temp", label: "Motor Temp", reading: s.motor_temp, icon: <Thermometer size={13} /> },
    { key: "belt_tension", label: "Belt Tension", reading: s.belt_tension, icon: <Scale size={13} /> },
    { key: "vibration_drive", label: "Drive End Vib", reading: s.vibration_drive, icon: <Activity size={13} /> },
    { key: "vibration_tail", label: "Tail End Vib", reading: s.vibration_tail, icon: <Activity size={13} /> },
    { key: "zero_drift", label: "Zero-Point Drift", reading: s.zero_drift, icon: <Scale size={13} /> },
    { key: "moisture", label: "Material Moisture", reading: s.moisture, icon: <Droplets size={13} /> },
    { key: "ambient_temp", label: "Ambient Temp", reading: s.ambient_temp, icon: <Thermometer size={13} /> }
  ];

  return (
    <div className="card-panel" style={{ padding: "6px 8px" }}>
      <h2 className="card-title" style={{ marginBottom: "4px", fontSize: "11px", paddingBottom: "3px" }}>
        <Activity size={12} color="var(--color-accent)" /> Telemetry Parameters
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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
                padding: "3px 6px",
                borderRadius: "4px",
                background: isCrit ? "rgba(239, 68, 68, 0.05)" : isWarn ? "rgba(251, 191, 36, 0.03)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.02)"
              }}
            >
              {/* Left: Icon + Name */}
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span style={{ color: isCrit ? "var(--color-crit)" : isWarn ? "var(--color-warn)" : "var(--color-accent)", display: "flex" }}>
                  {m.icon}
                </span>
                {m.label}
              </span>

              {/* Right: Value + Status Dot */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ 
                  fontSize: "11.5px", 
                  fontWeight: 600, 
                  fontFamily: "var(--font-mono)",
                  color: isCrit ? "var(--color-crit)" : isWarn ? "var(--color-warn)" : "#fff"
                }}>
                  {valStr}
                </span>
                <span style={{ fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", width: "30px" }}>
                  {reading.unit}
                </span>
                {/* Status Dot */}
                <span 
                  className={isCrit || isWarn ? "pulse-indicator" : ""}
                  style={{ 
                    width: "6px", 
                    height: "6px", 
                    borderRadius: "50%", 
                    background: statusColor,
                    display: "inline-block"
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

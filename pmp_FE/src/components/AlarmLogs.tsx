import React, { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { Terminal, AlertTriangle, Info, BellRing } from "lucide-react";

interface LogMessage {
  id: string;
  time: string;
  type: "info" | "warn" | "crit";
  message: string;
}

export const AlarmLogs: React.FC = () => {
  const { telemetry, alarms } = useSocket();
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);

  // Generate logs dynamically based on telemetry changes
  const prevTelemetryState = useRef<string | null>(null);
  const prevFailureMode = useRef<string | null>(null);
  const prevSetpoint = useRef<number | null>(null);

  useEffect(() => {
    if (!telemetry) return;

    const timeStr = new Date().toLocaleTimeString();
    const newLogs: LogMessage[] = [];

    // Log State Transitions
    if (prevTelemetryState.current !== telemetry.state) {
      newLogs.push({
        id: Math.random().toString(),
        time: timeStr,
        type: telemetry.state === "RUNNING" ? "info" : telemetry.state === "TRIP" || telemetry.state === "FAILURE" ? "crit" : "warn",
        message: `System transitioned state: [${prevTelemetryState.current ?? "INITIAL"}] -> [${telemetry.state}]`
      });
      prevTelemetryState.current = telemetry.state;
    }

    // Log Fault Injections
    if (prevFailureMode.current !== telemetry.activeFailureMode) {
      if (telemetry.activeFailureMode) {
        newLogs.push({
          id: Math.random().toString(),
          time: timeStr,
          type: "crit",
          message: `DIAGNOSTIC ALARM: Fault mode ${telemetry.activeFailureMode} injected into processor!`
        });
      } else if (prevFailureMode.current) {
        newLogs.push({
          id: Math.random().toString(),
          time: timeStr,
          type: "info",
          message: `Diagnostics cleared. Feeder operating on normal parameters.`
        });
      }
      prevFailureMode.current = telemetry.activeFailureMode;
    }

    // Log Setpoint updates
    const currentSetpoint = telemetry.sensors.feed_rate_setpoint.value;
    if (prevSetpoint.current !== null && prevSetpoint.current !== currentSetpoint) {
      newLogs.push({
        id: Math.random().toString(),
        time: timeStr,
        type: "info",
        message: `Setpoint target updated: ${prevSetpoint.current} -> ${currentSetpoint} t/h`
      });
    }
    prevSetpoint.current = currentSetpoint;

    if (newLogs.length > 0) {
      setLogs((prev) => [...prev, ...newLogs].slice(-100)); // limit to last 100 logs
    }
  }, [telemetry]);

  // Scroll terminal logs console to bottom
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="card-panel" style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
      
      {/* Active alarms Section */}
      <div>
        <h2 className="card-title">
          <BellRing size={18} color="var(--color-crit)" /> Active Controller Alarms
        </h2>
        
        {alarms.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "6px", color: "var(--color-ok)", fontSize: "13px" }}>
            <Info size={16} />
            <span>No active system warnings or critical thresholds breached.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
            {alarms.map((alert, idx) => {
              const isCrit = alert.severity === "CRITICAL";
              return (
                <div 
                  key={alert.code + idx} 
                  style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: "10px", 
                    padding: "10px 12px", 
                    background: isCrit ? "rgba(248, 113, 113, 0.08)" : "rgba(251, 191, 36, 0.08)", 
                    border: `1px solid ${isCrit ? "rgba(248, 113, 113, 0.3)" : "rgba(251, 191, 36, 0.3)"}`, 
                    borderRadius: "6px",
                    fontSize: "12.5px"
                  }}
                >
                  <AlertTriangle 
                    size={16} 
                    color={isCrit ? "var(--color-crit)" : "var(--color-warn)"} 
                    style={{ flexShrink: 0, marginTop: "2px" }}
                    className="pulse-indicator"
                  />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                      <span style={{ color: isCrit ? "#f87171" : "#fbbf24" }}>{alert.code} ({alert.severity})</span>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 400, fontFamily: "var(--font-mono)" }}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ color: "var(--text-primary)", marginTop: "2px" }}>{alert.message}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Diagnostics terminal logs */}
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <h2 className="card-title">
          <Terminal size={18} color="var(--color-accent)" /> Diagnostic Logs Console
        </h2>
        
        <div 
          style={{ 
            flexGrow: 1, 
            background: "#030712", 
            border: "1px solid var(--border-color)", 
            borderRadius: "8px", 
            padding: "12px", 
            fontFamily: "var(--font-mono)", 
            fontSize: "11.5px", 
            maxHeight: "260px",
            minHeight: "180px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            color: "#38bdf8"
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Console initialized. Listening to telemetry streams...</div>
          ) : (
            logs.map((log) => {
              let logColor = "#94a3b8"; // default
              if (log.type === "crit") logColor = "#f87171";
              else if (log.type === "warn") logColor = "#fbbf24";
              else if (log.type === "info") logColor = "#34d399";
              
              return (
                <div key={log.id} style={{ display: "flex", gap: "8px" }}>
                  <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>[{log.time}]</span>
                  <span style={{ color: logColor }}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={consoleBottomRef} />
        </div>
      </div>
    </div>
  );
};

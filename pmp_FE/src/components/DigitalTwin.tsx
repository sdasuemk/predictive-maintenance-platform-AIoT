import React from "react";
import { useSocket } from "../context/SocketContext";
import { AlertTriangle, Play, Pause, Zap } from "lucide-react";
import { FeederState } from "../types/telemetry";

export const DigitalTwin: React.FC = () => {
  const { telemetry } = useSocket();

  const state = telemetry?.state ?? FeederState.IDLE;
  const speed = telemetry?.sensors.belt_speed.value ?? 0;
  const load = telemetry?.sensors.belt_load.value ?? 0;
  const activeFault = telemetry?.activeFailureMode ?? null;

  const isRunning = state === FeederState.RUNNING || state === FeederState.DEGRADED || state === FeederState.PRE_FAILURE;
  const isTripped = state === FeederState.TRIP || state === FeederState.FAILURE;
  
  // Calculate roller rotation duration based on speed
  // Max speed is 1.5 m/s, let's map rotation duration from 0.5s (fastest) to 5s (slowest)
  const rotationDuration = speed > 0 ? `${Math.max(0.5, 3 / speed).toFixed(2)}s` : "0s";

  return (
    <div className="card-panel" style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <h2 className="card-title" style={{ justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ActivityIcon state={state} /> Digital Twin Asset Visualizer
        </span>
        <span style={{ fontSize: "11px", textTransform: "none", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Belt Feeder Controller Simulator
        </span>
      </h2>

      {/* SVG Canvas Container */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6, 9, 19, 0.4)", borderRadius: "8px", border: "1px solid var(--border-color)", padding: "6px", position: "relative", overflow: "hidden" }}>
        
        {/* State Banner */}
        <div style={{ position: "absolute", top: "8px", left: "8px", display: "flex", gap: "6px", flexWrap: "wrap", zIndex: 2 }}>
          <div style={{ fontSize: "10.5px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: isRunning ? "rgba(16, 185, 129, 0.1)" : "rgba(71, 85, 105, 0.1)", border: `1px solid ${isRunning ? "var(--color-ok)" : "var(--text-muted)"}`, color: isRunning ? "var(--color-ok)" : "var(--text-secondary)", textTransform: "uppercase" }}>
            {isRunning ? "BELT RUNNING" : "BELT IDLE"}
          </div>
          {!activeFault && !isTripped && (
            <div style={{ fontSize: "10.5px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--color-ok)", color: "var(--color-ok)", boxShadow: "0 0 8px rgba(16, 185, 129, 0.2)" }}>
              SYSTEM HEALTHY
            </div>
          )}
          {activeFault && (
            <div style={{ fontSize: "10.5px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid var(--color-crit)", color: "var(--color-crit)", animation: "pulse-glow 1.5s infinite" }}>
              ALERT: {activeFault}
            </div>
          )}
        </div>

        {/* Dynamic Telemetry Quick Info */}
        <div style={{ position: "absolute", bottom: "8px", right: "8px", display: "flex", gap: "10px", fontSize: "11.5px", fontFamily: "var(--font-mono)", zIndex: 2 }}>
          <span style={{ color: "var(--text-secondary)" }}>Speed: <strong style={{ color: "#fff" }}>{speed.toFixed(2)} m/s</strong></span>
          <span style={{ color: "var(--text-secondary)" }}>Load: <strong style={{ color: "#fff" }}>{load.toFixed(1)} kg/m</strong></span>
        </div>

        <svg viewBox="0 0 600 240" style={{ width: "100%", height: "100%", maxHeight: "100%", objectFit: "contain" }}>
          <defs>
            {/* Ambient Shadow glow filter */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-yellow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BACKGROUND STRUCTURE */}
          {/* Main frame chassis */}
          <rect x="80" y="110" width="440" height="35" rx="6" fill="#1e293b" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <line x1="140" y1="145" x2="140" y2="200" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="460" y1="145" x2="460" y2="200" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <rect x="110" y="195" width="60" height="10" rx="3" fill="#0f172a" />
          <rect x="430" y="195" width="60" height="10" rx="3" fill="#0f172a" />

          {/* MATERIAL CHUTE INLET (Left) */}
          <path d="M 60 20 L 120 20 L 100 80 L 80 80 Z" fill="#334155" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <rect x="75" y="78" width="30" height="12" fill="#1e293b" />
          {/* Flowing material simulation from inlet chute */}
          {isRunning && !isTripped && activeFault !== "FM-04" && (
            <g opacity="0.8">
              <path d="M 80 90 Q 82 120 85 130 Q 88 120 90 90 Z" fill="#64748b">
                <animate attributeName="d" dur="0.8s" repeatCount="indefinite"
                  values="M 80 90 Q 82 120 85 130 Q 88 120 90 90 Z;
                          M 80 90 Q 85 125 87 130 Q 92 125 90 90 Z;
                          M 80 90 Q 82 120 85 130 Q 88 120 90 90 Z" />
              </path>
            </g>
          )}

          {/* FAULT MARKER: Chute Blockage (FM-04) */}
          {activeFault === "FM-04" && (
            <g filter="url(#glow-red)">
              <path d="M 50 15 L 130 15 L 110 95 L 70 95 Z" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" strokeWidth="2" />
              <circle cx="90" cy="55" r="22" fill="#ef4444" opacity="0.3" className="pulse-indicator" />
              <path d="M 90 42 L 103 65 L 77 65 Z" fill="#ef4444" />
              <rect x="88" y="52" width="4" height="6" fill="#060913" />
              <circle cx="90" cy="61" r="2" fill="#060913" />
              <text x="90" y="86" textAnchor="middle" fill="#f87171" fontSize="10" fontFamily="var(--font-mono)" fontWeight="bold">CHUTE JAMMED</text>
            </g>
          )}

          {/* MAIN WEIGH FEEDER BELT TRACK */}
          {/* Pulleys: Tail (Left) & Drive (Right) */}
          {/* Tail Pulley Bearing & Roller (Left) */}
          <g>
            <circle cx="120" cy="128" r="28" fill="#111827" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="120" cy="128" r="22" fill="#334155" />
            {/* Spinning Roller markings */}
            <circle cx="120" cy="128" r="22" stroke="#64748b" strokeWidth="3" strokeDasharray="5 5" className={`belt-roller ${isRunning ? "" : "paused"}`} style={{ animationDuration: rotationDuration }} />
            <circle cx="120" cy="128" r="5" fill="#475569" />
          </g>

          {/* Drive Pulley Bearing & Roller (Right) */}
          <g>
            <circle cx="480" cy="128" r="28" fill="#111827" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="480" cy="128" r="22" fill="#334155" />
            {/* Spinning Roller markings */}
            <circle cx="480" cy="128" r="22" stroke="#64748b" strokeWidth="3" strokeDasharray="5 5" className={`belt-roller ${isRunning ? "" : "paused"}`} style={{ animationDuration: rotationDuration }} />
            <circle cx="480" cy="128" r="5" fill="#475569" />
          </g>

          {/* Drive End Motor & Gearbox */}
          <g>
            <rect x="495" y="105" width="42" height="46" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            {/* Motor ribs */}
            <line x1="504" y1="110" x2="504" y2="146" stroke="#1e293b" strokeWidth="2" />
            <line x1="512" y1="110" x2="512" y2="146" stroke="#1e293b" strokeWidth="2" />
            <line x1="520" y1="110" x2="520" y2="146" stroke="#1e293b" strokeWidth="2" />
            {/* Motor Fan Cap */}
            <path d="M 537 114 L 543 118 L 543 138 L 537 142 Z" fill="#334155" />
          </g>

          {/* FAULT MARKER: Bearing Wear Drive End (FM-03) */}
          {activeFault === "FM-03" && (
            <g filter="url(#glow-red)" className="pulse-indicator">
              <circle cx="480" cy="128" r="32" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="4 4" />
              <circle cx="480" cy="128" r="8" fill="#ef4444" opacity="0.7" />
              <text x="480" y="85" textAnchor="middle" fill="#f87171" fontSize="10" fontFamily="var(--font-mono)" fontWeight="bold">BEARING VIBE CRITICAL</text>
            </g>
          )}

          {/* WEIGHBRIDGE LOAD CELL SYSTEM (Middle) */}
          <g>
            {/* Scale Base */}
            <rect x="260" y="145" width="80" height="15" fill="#1e293b" stroke="rgba(255,255,255,0.05)" />
            {/* Load cells sensors props */}
            <line x1="275" y1="128" x2="275" y2="145" stroke="#64748b" strokeWidth="3" />
            <line x1="325" y1="128" x2="325" y2="145" stroke="#64748b" strokeWidth="3" />
            {/* Support Roller */}
            <circle cx="300" cy="128" r="12" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <circle cx="300" cy="128" r="3" fill="#1e293b" />
          </g>

          {/* FAULT MARKER: Load Cell Zero Drift (FM-01) */}
          {activeFault === "FM-01" && (
            <g filter="url(#glow-yellow)">
              <rect x="255" y="142" width="90" height="20" fill="none" stroke="#fbbf24" strokeWidth="2" rx="4" />
              <circle cx="300" cy="148" r="14" fill="#fbbf24" opacity="0.3" className="pulse-indicator" />
              <path d="M 300 140 L 308 153 L 292 153 Z" fill="#fbbf24" />
              <text x="300" y="177" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="var(--font-mono)" fontWeight="bold">ZERO-POINT DRIFT</text>
            </g>
          )}

          {/* CONVEYOR BELT BODY (Path) */}
          {/* Top loop of belt */}
          <line x1="120" y1="100" x2="480" y2="100" stroke="#020617" strokeWidth="8" strokeLinecap="round" />
          {/* Bottom loop of belt */}
          <line x1="120" y1="156" x2="480" y2="156" stroke="#020617" strokeWidth="8" strokeLinecap="round" />

          {/* Material riding on the belt */}
          {isRunning && !isTripped && activeFault !== "FM-04" && (
            <g>
              {/* Draw a bumpy brown/grey path represent material load */}
              <path d="M 120 95 Q 160 92 200 95 T 300 94 T 400 95 T 480 94" fill="none" stroke="#4b5563" strokeWidth="10" strokeLinecap="round" opacity="0.8">
                {/* Dynamic amplitude adjustment based on load */}
                <animate attributeName="strokeWidth" values={`${Math.max(4, load / 3).toFixed(1)}; ${Math.max(4, load / 3 + 2).toFixed(1)}; ${Math.max(4, load / 3).toFixed(1)}`} dur="1.5s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* Animated belt movement indicator dots */}
          <path d="M 120 100 L 480 100 A 28 28 0 0 1 480 156 L 120 156 A 28 28 0 0 1 120 100 Z" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="8 8" className={`conveyor-dots ${isRunning ? "" : "paused"}`} style={{ animationDuration: rotationDuration }} />

          {/* FAULT MARKER: Belt Slippage (FM-02) */}
          {activeFault === "FM-02" && (
            <g filter="url(#glow-yellow)">
              <path d="M 120 100 L 480 100 A 28 28 0 0 1 480 156 L 120 156 A 28 28 0 0 1 120 100 Z" fill="none" stroke="#fbbf24" strokeWidth="4" strokeDasharray="16 8" className="conveyor-dots" style={{ animationDuration: "5s" }} />
              <text x="300" y="65" textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="var(--font-mono)" fontWeight="bold" className="pulse-indicator">⚠️ WARNING: BELT SLIP DETECTED</text>
            </g>
          )}

          {/* FAULT MARKER: Mistracking / Oscillation (FM-05) */}
          {activeFault === "FM-05" && (
            <g filter="url(#glow-yellow)">
              {/* Draw oscillating arrow vectors around tail pulley */}
              <path d="M 60 110 L 45 128 L 60 146" fill="none" stroke="#fbbf24" strokeWidth="3">
                <animate attributeName="transform" type="translate" values="translate(0, 0); translate(-8, 0); translate(0, 0)" dur="1s" repeatCount="indefinite" />
              </path>
              <path d="M 70 128 L 50 128" fill="none" stroke="#fbbf24" strokeWidth="3" />
              <text x="120" y="65" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="var(--font-mono)" fontWeight="bold">BELT MISALIGNMENT</text>
            </g>
          )}

          {/* DISCHARGING OUTLET CHUTE (Right) */}
          <path d="M 480 105 L 530 115 L 510 180 L 470 160 Z" fill="#334155" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {/* Falling material output */}
          {isRunning && !isTripped && activeFault !== "FM-04" && (
            <g opacity="0.8">
              <path d="M 485 160 Q 487 195 489 210 M 495 162 Q 498 198 501 210" fill="none" stroke="#64748b" strokeWidth="4" strokeLinecap="round">
                <animate attributeName="strokeDasharray" values="10 10; 20 20; 10 10" dur="0.5s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* SYSTEM FAILURE / TRIP STATUS RED CARD OVERLAY */}
          {state === FeederState.TRIP && (
            <g filter="url(#glow-red)">
              <rect x="180" y="80" width="240" height="80" rx="8" fill="rgba(239, 68, 68, 0.9)" />
              <text x="300" y="112" textAnchor="middle" fill="#ffffff" fontSize="16" fontFamily="var(--font-display)" fontWeight="800" letterSpacing="1">FEEDER TRIPPED</text>
              <text x="300" y="138" textAnchor="middle" fill="#ffccd0" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">INTERLOCK SAFETY TRIGGERED</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

const ActivityIcon: React.FC<{ state: FeederState }> = ({ state }) => {
  if (state === FeederState.RUNNING) {
    return <Play size={18} color="var(--color-ok)" />;
  }
  if (state === FeederState.IDLE) {
    return <Pause size={18} color="var(--text-secondary)" />;
  }
  if (state === FeederState.TRIP || state === FeederState.FAILURE) {
    return <Zap size={18} color="var(--color-crit)" className="pulse-indicator" />;
  }
  return <AlertTriangle size={18} color="var(--color-warn)" className="pulse-indicator" />;
};

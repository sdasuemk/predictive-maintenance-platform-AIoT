import React from "react";
import { useSocket } from "../context/SocketContext";
import { LineChart } from "lucide-react";

export const TelemetryChart: React.FC = () => {
  const { history } = useSocket();

  const maxPoints = 30;
  const chartWidth = 600;
  const chartHeight = 100;
  
  // Padding dimensions
  const padLeft = 38;
  const padRight = 12;
  const padTop = 6;
  const padBottom = 20;

  const graphWidth = chartWidth - padLeft - padRight;
  const graphHeight = chartHeight - padTop - padBottom;

  const minVal = 0;
  const maxVal = 100;

  // Get data points (limit to last 30)
  const data = history.slice(-maxPoints);

  // Helper to map values to coordinates
  const getCoordinates = (index: number, val: number) => {
    // If we have fewer than maxPoints, stretch to fill the X axis anyway
    const totalSlots = Math.max(data.length - 1, 1);
    const x = padLeft + (index / totalSlots) * graphWidth;
    
    // Clamp val to min/max
    const clampedVal = Math.max(minVal, Math.min(maxVal, val));
    const y = padTop + graphHeight - ((clampedVal - minVal) / (maxVal - minVal)) * graphHeight;
    return { x, y };
  };

  // Build svg paths
  let actualPath = "";
  let setpointPath = "";

  data.forEach((d, i) => {
    const act = d.sensors.feed_rate_actual.value;
    const set = d.sensors.feed_rate_setpoint.value;

    const ptAct = getCoordinates(i, act);
    const ptSet = getCoordinates(i, set);

    if (i === 0) {
      actualPath = `M ${ptAct.x} ${ptAct.y}`;
      setpointPath = `M ${ptSet.x} ${ptSet.y}`;
    } else {
      actualPath += ` L ${ptAct.x} ${ptAct.y}`;
      setpointPath += ` L ${ptSet.x} ${ptSet.y}`;
    }
  });

  const gridLines = [25, 50, 75];

  return (
    <div className="card-panel" style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "6px 10px", height: "100%", minHeight: 0 }}>
      <h2 className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", fontSize: "10.5px", paddingBottom: "2px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
          <LineChart size={12} color="var(--color-accent)" /> Feed Rate Trend
        </span>
        
        {/* Legend */}
        <div style={{ display: "flex", gap: "6px", fontSize: "9px", fontFamily: "var(--font-mono)", textTransform: "none", whiteSpace: "nowrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "3px", background: "var(--color-ok)", borderRadius: "2px" }} />
            Actual
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "3px", background: "var(--color-accent)", strokeDasharray: "2 2", borderTop: "2px dashed var(--color-accent)" }} />
            Setpoint
          </span>
        </div>
      </h2>

      {/* SVG Plot Canvas */}
      <div style={{ width: "100%", flex: 1, minHeight: 0, background: "rgba(6, 9, 19, 0.4)", borderRadius: "4px", border: "1px solid var(--border-color)", padding: "2px 6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {data.length < 2 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
            Accumulating telemetry trend signals (Waiting for ticks: {data.length}/2)...
          </p>
        ) : (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%">
            <defs>
              <filter id="glow-chart-green" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {gridLines.map((gl) => {
              const y = padTop + graphHeight - ((gl - minVal) / (maxVal - minVal)) * graphHeight;
              return (
                <g key={gl}>
                  <line 
                    x1={padLeft} 
                    y1={y} 
                    x2={chartWidth - padRight} 
                    y2={y} 
                    stroke="var(--border-color)" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x={padLeft - 8} 
                    y={y + 4} 
                    textAnchor="end" 
                    fill="var(--text-secondary)" 
                    fontSize="10" 
                    fontFamily="var(--font-mono)"
                  >
                    {gl}
                  </text>
                </g>
              );
            })}

            {/* Min and Max Y labels */}
            <text x={padLeft - 8} y={padTop + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="10" fontFamily="var(--font-mono)">100</text>
            <text x={padLeft - 8} y={padTop + graphHeight + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="10" fontFamily="var(--font-mono)">0</text>

            {/* Bounding Axes */}
            <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + graphHeight} stroke="var(--border-color)" strokeWidth="1" />
            <line x1={padLeft} y1={padTop + graphHeight} x2={chartWidth - padRight} y2={padTop + graphHeight} stroke="var(--border-color)" strokeWidth="1" />

            {/* Setpoint target line path */}
            <path 
              d={setpointPath} 
              fill="none" 
              stroke="var(--color-accent)" 
              strokeWidth="2" 
              strokeDasharray="4 4" 
              opacity="0.8"
            />

            {/* Actual feed rate line path (with neon green glow filter) */}
            <path 
              d={actualPath} 
              fill="none" 
              stroke="var(--color-ok)" 
              strokeWidth="2.5" 
              filter="url(#glow-chart-green)"
              style={{ transition: "d 0.3s ease" }}
            />

            {/* Timeline X Labels */}
            <text x={padLeft} y={94} fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-mono)">-60s ago</text>
            <text x={padLeft + graphWidth / 2} y={94} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-mono)">-30s ago</text>
            <text x={chartWidth - padRight} y={94} textAnchor="end" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-mono)">Live</text>
          </svg>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { computeMLPrediction } from "../utils/predictiveEngine";
import { fetchMLPrediction } from "../services/aiApi";
import { BrainCircuit, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import type { DegradationStage, MLPrediction } from "../types/ai";

interface PredictiveHealthCardProps {
  onOpenCopilot: (prompt?: string) => void;
}

export const PredictiveHealthCard: React.FC<PredictiveHealthCardProps> = ({ onOpenCopilot }) => {
  const { telemetry } = useSocket();
  const [prediction, setPrediction] = useState<MLPrediction>(() => computeMLPrediction(telemetry));

  // Asynchronously fetch live ML prognostics from Python FastAPI microservice
  useEffect(() => {
    let isMounted = true;
    fetchMLPrediction(telemetry).then((pred) => {
      if (isMounted) {
        setPrediction(pred);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [telemetry]);

  const getStageBadge = (stage: DegradationStage) => {
    switch (stage) {
      case "NOMINAL":
        return { text: "Nominal Baseline", bg: "rgba(16, 185, 129, 0.12)", color: "var(--color-ok)", border: "rgba(16, 185, 129, 0.3)" };
      case "EARLY_DEGRADATION":
        return { text: "Early Degradation", bg: "rgba(245, 158, 11, 0.12)", color: "var(--color-warn)", border: "rgba(245, 158, 11, 0.3)" };
      case "ACCELERATED_WEAR":
        return { text: "Accelerated Wear", bg: "rgba(249, 115, 22, 0.15)", color: "#f97316", border: "rgba(249, 115, 22, 0.4)" };
      case "CRITICAL_ZONE":
        return { text: "Critical Zone", bg: "rgba(239, 68, 68, 0.15)", color: "var(--color-crit)", border: "rgba(239, 68, 68, 0.4)" };
    }
  };

  const stageBadge = getStageBadge(prediction.degradationStage);

  const isAlertState = prediction.failureProbability > 40 || prediction.healthIndex < 70;

  return (
    <div 
      className="card-panel" 
      style={{ 
        padding: "5px 8px", 
        border: isAlertState ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(14, 165, 233, 0.3)",
        background: isAlertState 
          ? "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(45, 15, 20, 0.8))"
          : "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background AI circuit accent */}
      <div 
        style={{
          position: "absolute",
          top: "-15px",
          right: "-15px",
          opacity: 0.08,
          pointerEvents: "none"
        }}
      >
        <BrainCircuit size={85} color="#0ea5e9" />
      </div>

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <BrainCircuit size={12} color="#0ea5e9" className={isAlertState ? "pulse-indicator" : ""} />
          <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.2px", textTransform: "uppercase", color: "#e2e8f0" }}>
            AI Predictive Health & RUL
          </span>
        </div>
        <span 
          style={{ 
            fontSize: "8.5px", 
            fontWeight: 600, 
            padding: "1px 5px", 
            borderRadius: "3px", 
            background: stageBadge.bg, 
            color: stageBadge.color,
            border: `1px solid ${stageBadge.border}`,
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)"
          }}
        >
          {stageBadge.text}
        </span>
      </div>

      {/* Core Dual Metric: RUL & Failure Probability */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginBottom: "5px" }}>
        {/* RUL Card */}
        <div 
          style={{ 
            background: "rgba(15, 23, 42, 0.6)", 
            padding: "4px 6px", 
            borderRadius: "4px", 
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "3px", color: "var(--text-secondary)", fontSize: "9px", marginBottom: "1px" }}>
            <Clock size={10} color="var(--color-accent)" />
            <span>ESTIMATED RUL</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
            <span 
              style={{ 
                fontSize: "14px", 
                fontWeight: 700, 
                fontFamily: "var(--font-mono)",
                color: prediction.estimatedRulHours < 48 ? "var(--color-crit)" : prediction.estimatedRulHours < 150 ? "var(--color-warn)" : "var(--color-ok)"
              }}
            >
              {prediction.estimatedRulHours}
            </span>
            <span style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>hrs</span>
          </div>
          <span style={{ fontSize: "8px", color: "var(--text-muted)" }}>
            Confidence: {prediction.confidence}%
          </span>
        </div>

        {/* Failure Probability Card */}
        <div 
          style={{ 
            background: "rgba(15, 23, 42, 0.6)", 
            padding: "4px 6px", 
            borderRadius: "4px", 
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "3px", color: "var(--text-secondary)", fontSize: "9px", marginBottom: "1px" }}>
            <AlertTriangle size={10} color={prediction.failureProbability > 50 ? "var(--color-crit)" : "var(--color-warn)"} />
            <span>FAILURE PROB</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
            <span 
              style={{ 
                fontSize: "14px", 
                fontWeight: 700, 
                fontFamily: "var(--font-mono)",
                color: prediction.failureProbability > 70 ? "var(--color-crit)" : prediction.failureProbability > 30 ? "var(--color-warn)" : "var(--color-ok)"
              }}
            >
              {prediction.failureProbability}%
            </span>
            <span style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>
              {prediction.trend === "RAPID_DECLINE" ? "▲ Rapid" : prediction.trend === "DEGRADING" ? "▲ Rising" : "━ Steady"}
            </span>
          </div>
          {/* Mini progress bar */}
          <div style={{ width: "100%", height: "3px", background: "#334155", borderRadius: "2px", overflow: "hidden", marginTop: "3px" }}>
            <div 
              style={{ 
                width: `${prediction.failureProbability}%`, 
                height: "100%", 
                background: prediction.failureProbability > 70 ? "var(--color-crit)" : prediction.failureProbability > 30 ? "var(--color-warn)" : "var(--color-ok)",
                transition: "width 0.4s ease"
              }} 
            />
          </div>
        </div>
      </div>

      {/* Top Failure Mode & Copilot CTA */}
      <div 
        style={{ 
          background: "rgba(15, 23, 42, 0.4)", 
          borderRadius: "4px", 
          padding: "3px 6px", 
          border: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "4px"
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "8px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>
            Primary Forecast Risk
          </div>
          <div 
            style={{ 
              fontSize: "9.5px", 
              fontWeight: 600, 
              color: isAlertState ? "#fca5a5" : "#cbd5e1",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }} 
            title={prediction.primaryFailureRisk}
          >
            {prediction.primaryFailureRisk}
          </div>
        </div>

        <button
          onClick={() => onOpenCopilot(isAlertState ? `Diagnose current condition: ${prediction.primaryFailureRisk}` : "Run full equipment health check")}
          style={{
            background: isAlertState ? "rgba(239, 68, 68, 0.25)" : "rgba(14, 165, 233, 0.2)",
            border: isAlertState ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(14, 165, 233, 0.4)",
            color: isAlertState ? "#fca5a5" : "#38bdf8",
            padding: "2px 6px",
            borderRadius: "3px",
            fontSize: "9.5px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            flexShrink: 0,
            transition: "all 0.2s ease"
          }}
          className="copilot-action-btn"
        >
          <span>Ask AI</span>
          <ArrowRight size={9} />
        </button>
      </div>
    </div>
  );
};

import type { TelemetryPayload } from "../types/telemetry";
import type { MLPrediction, DegradationStage } from "../types/ai";

export function computeMLPrediction(telemetry: TelemetryPayload | null): MLPrediction {
  if (!telemetry) {
    return {
      healthIndex: 100,
      failureProbability: 5,
      estimatedRulHours: 720,
      primaryFailureRisk: "System Nominal - No Imminent Hazards",
      degradationStage: "NOMINAL",
      confidence: 96,
      trend: "STABLE",
      vibrationAnomalyScore: 0.05,
      thermalGradientScore: 0.08,
    };
  }

  const s = telemetry.sensors;
  const health = telemetry.healthScore;
  const fm = telemetry.activeFailureMode;

  let failureProbability = Math.max(4, Math.round(100 - health * 0.94));
  let estimatedRulHours = Math.max(1, Math.round((health / 100) * 650));
  let primaryRisk = "System Nominal - Baseline Operation";
  let stage: DegradationStage = "NOMINAL";
  let trend: "STABLE" | "DEGRADING" | "RAPID_DECLINE" = "STABLE";

  // Check vibration anomaly score (normalized 0 - 1)
  const vibDrive = s.vibration_drive?.value ?? 1.2;
  const vibAnomaly = Math.min(1.0, Math.max(0.02, parseFloat(((vibDrive - 1.0) / 4.0).toFixed(2))));

  // Check thermal gradient score
  const motorT = s.motor_temp?.value ?? 42;
  const thermalScore = Math.min(1.0, Math.max(0.05, parseFloat(((motorT - 35) / 50).toFixed(2))));

  if (fm === "FM-01") {
    primaryRisk = "FM-01: Gravimetric Tare Drift / Scale Buildup";
    failureProbability = Math.min(95, Math.max(48, 100 - health));
    estimatedRulHours = Math.max(14, Math.round(health * 1.8));
    trend = "DEGRADING";
  } else if (fm === "FM-02") {
    primaryRisk = "FM-02: Drive Pulley Belt Slip / Friction Loss";
    failureProbability = Math.min(98, Math.max(65, 105 - health));
    estimatedRulHours = Math.max(6, Math.round(health * 0.6));
    trend = "RAPID_DECLINE";
  } else if (fm === "FM-03") {
    primaryRisk = "FM-03: Drive Bearing Spalling & Micro-Pitting";
    failureProbability = Math.min(99, Math.max(72, 110 - health));
    estimatedRulHours = Math.max(4, Math.round(health * 0.5));
    trend = "RAPID_DECLINE";
  } else if (fm === "FM-04") {
    primaryRisk = "FM-04: Infeed Chute Material Blockage / Stall";
    failureProbability = Math.min(99, Math.max(88, 115 - health));
    estimatedRulHours = Math.max(1, Math.round(health * 0.15));
    trend = "RAPID_DECLINE";
  } else if (fm === "FM-05") {
    primaryRisk = "FM-05: Asymmetric Belt Mistracking / Edge Scuffing";
    failureProbability = Math.min(92, Math.max(55, 95 - health));
    estimatedRulHours = Math.max(22, Math.round(health * 2.1));
    trend = "DEGRADING";
  } else if (health < 75) {
    primaryRisk = "Compound Parameter Drift (Inspection Required)";
    trend = health < 45 ? "RAPID_DECLINE" : "DEGRADING";
  }

  // Determine degradation stage
  if (health >= 85) {
    stage = "NOMINAL";
  } else if (health >= 65) {
    stage = "EARLY_DEGRADATION";
  } else if (health >= 35) {
    stage = "ACCELERATED_WEAR";
  } else {
    stage = "CRITICAL_ZONE";
  }

  // Confidence is high if data is steady
  const confidence = fm ? 94 : 91;

  return {
    healthIndex: health,
    failureProbability,
    estimatedRulHours,
    primaryFailureRisk: primaryRisk,
    degradationStage: stage,
    confidence,
    trend,
    vibrationAnomalyScore: vibAnomaly,
    thermalGradientScore: thermalScore,
  };
}

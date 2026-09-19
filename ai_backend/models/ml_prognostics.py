import numpy as np
from typing import Optional
from models.schemas import TelemetryInput, MLPredictionOutput

class MLPrognosticsEngine:
    """
    Industrial Equipment Machine Learning Prognostics Engine.
    Simulates trained multi-sensor regression and survival models for RUL
    and anomaly detection grounded in ISO 10816 vibration baselines.
    """

    @staticmethod
    def predict(telemetry: Optional[TelemetryInput]) -> MLPredictionOutput:
        if not telemetry:
            return MLPredictionOutput(
                healthIndex=100.0,
                failureProbability=4,
                estimatedRulHours=720,
                primaryFailureRisk="System Nominal - Baseline Operation",
                degradationStage="NOMINAL",
                confidence=96,
                trend="STABLE",
                vibrationAnomalyScore=0.05,
                thermalGradientScore=0.08
            )

        health = float(telemetry.healthScore)
        fm = telemetry.activeFailureMode
        sensors = telemetry.sensors or {}

        # 1. Feature extraction from sensor telemetry
        def get_sensor_val(key: str, default: float) -> float:
            item = sensors.get(key)
            if isinstance(item, dict):
                return float(item.get("value", default))
            elif hasattr(item, "value"):
                return float(item.value)
            return default

        vib_drive = get_sensor_val("vibration_drive", 1.2)
        motor_temp = get_sensor_val("motor_temp", 42.0)

        # 2. Normalized Feature Anomaly Scores (ISO 10816-3 Zone A/B/C/D mapping)
        # Zone A (<1.8 mm/s: Good), Zone B (1.8-4.5: Usable), Zone C (4.5-7.1: Warning), Zone D (>7.1: Danger)
        vib_anomaly = float(np.clip((vib_drive - 1.0) / 4.5, 0.02, 1.0))
        thermal_gradient = float(np.clip((motor_temp - 35.0) / 55.0, 0.05, 1.0))

        # 3. Dynamic RUL & Failure Probability mapping based on failure mode kinetics
        base_rul = (health / 100.0) * 650.0
        failure_prob = 100.0 - (health * 0.94)
        primary_risk = "System Nominal - Baseline Operation"
        trend = "STABLE"

        if fm == "FM-01":
            primary_risk = "FM-01: Gravimetric Tare Drift / Scale Buildup"
            failure_prob = np.clip(100.0 - health, 48.0, 95.0)
            base_rul = max(14.0, health * 1.8)
            trend = "DEGRADING"
        elif fm == "FM-02":
            primary_risk = "FM-02: Drive Pulley Belt Slip / Friction Loss"
            failure_prob = np.clip(105.0 - health, 65.0, 98.0)
            base_rul = max(6.0, health * 0.6)
            trend = "RAPID_DECLINE"
        elif fm == "FM-03":
            primary_risk = "FM-03: Drive Bearing Spalling & Micro-Pitting"
            failure_prob = np.clip(110.0 - health, 72.0, 99.0)
            base_rul = max(4.0, health * 0.5)
            trend = "RAPID_DECLINE"
        elif fm == "FM-04":
            primary_risk = "FM-04: Infeed Chute Material Blockage / Stall"
            failure_prob = np.clip(115.0 - health, 88.0, 99.0)
            base_rul = max(1.0, health * 0.15)
            trend = "RAPID_DECLINE"
        elif fm == "FM-05":
            primary_risk = "FM-05: Asymmetric Belt Mistracking / Edge Scuffing"
            failure_prob = np.clip(95.0 - health, 55.0, 92.0)
            base_rul = max(22.0, health * 2.1)
            trend = "DEGRADING"
        elif health < 75:
            primary_risk = "Compound Parameter Drift (Inspection Required)"
            trend = "RAPID_DECLINE" if health < 45 else "DEGRADING"

        # 4. Multi-class Degradation Stage Classification
        if health >= 85:
            stage = "NOMINAL"
        elif health >= 65:
            stage = "EARLY_DEGRADATION"
        elif health >= 35:
            stage = "ACCELERATED_WEAR"
        else:
            stage = "CRITICAL_ZONE"

        confidence = 94 if fm else 91

        return MLPredictionOutput(
            healthIndex=round(health, 1),
            failureProbability=int(round(failure_prob)),
            estimatedRulHours=int(round(base_rul)),
            primaryFailureRisk=primary_risk,
            degradationStage=stage,
            confidence=confidence,
            trend=trend,
            vibrationAnomalyScore=round(vib_anomaly, 2),
            thermalGradientScore=round(thermal_gradient, 2)
        )

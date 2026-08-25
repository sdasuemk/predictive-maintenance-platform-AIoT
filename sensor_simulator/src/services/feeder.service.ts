import { CONFIG } from "../config/config.js";
import { SignalPatterns } from "../utils/signal-patterns.js";
import { AnomalyInjector, FailureMode } from "../utils/anomaly-injector.js";
import { FeederState } from "../enums/feeder-state.enum.js";
import { SensorStatus } from "../enums/sensor-status.enum.js";
import {
  SensorReading,
  Alert,
  TelemetryPayload,
} from "../types/telemetry.types.js";

export class FeederService {
  private id: string;
  private plantId: string;
  public state: FeederState = FeederState.IDLE;
  private anomalyInjector: AnomalyInjector;

  // Process variables
  public targetFeedRate = CONFIG.FEEDER.NOMINAL_FEED_RATE;
  private currentSpeed = 0.0; // m/s
  private totalTonnage = 1245.8; // t
  private motorTemp = 42.0; // °C
  
  private ticks = 0;
  private startTicks = 0;
  private activeAlerts: Alert[] = [];
  private healthScore = 100;

  constructor(id: string, plantId: string) {
    this.id = id;
    this.plantId = plantId;
    this.anomalyInjector = new AnomalyInjector();
  }

  public getEquipmentId(): string {
    return this.id;
  }

  public triggerFailure(mode: FailureMode): void {
    this.anomalyInjector.trigger(mode);
    if (this.state === FeederState.RUNNING || this.state === FeederState.DEGRADED) {
      this.state = FeederState.DEGRADED;
    }
  }

  public resetFailure(): void {
    this.anomalyInjector.reset();
    if (
      this.state === FeederState.FAILURE ||
      this.state === FeederState.TRIP ||
      this.state === FeederState.DEGRADED ||
      this.state === FeederState.PRE_FAILURE
    ) {
      this.state = FeederState.STARTING;
      this.startTicks = 0;
    }
  }

  public start(): void {
    if (this.state === FeederState.IDLE || this.state === FeederState.TRIP) {
      this.state = FeederState.STARTING;
      this.startTicks = 0;
    }
  }

  public stop(): void {
    this.state = FeederState.IDLE;
    this.currentSpeed = 0.0;
  }

  /**
   * Evaluates the sensor value against standard bounds and returns a status.
   */
  private evaluateStatus(
    val: number,
    lowCritical?: number,
    lowWarning?: number,
    highWarning?: number,
    highCritical?: number
  ): SensorStatus {
    if (lowCritical !== undefined && val <= lowCritical) return SensorStatus.CRITICAL;
    if (highCritical !== undefined && val >= highCritical) return SensorStatus.CRITICAL;
    if (lowWarning !== undefined && val <= lowWarning) return SensorStatus.WARNING;
    if (highWarning !== undefined && val >= highWarning) return SensorStatus.WARNING;
    return SensorStatus.NORMAL;
  }

  /**
   * Run one simulation step (tick).
   */
  public tick(): TelemetryPayload {
    this.ticks++;
    const timeAcc = CONFIG.FEEDER.TIME_ACCELERATION;
    this.anomalyInjector.tick(timeAcc);

    // Get failure impacts
    const activeFM = this.anomalyInjector.getActiveMode();
    const progression = this.anomalyInjector.getProgression();
    const effects = this.anomalyInjector.getEffects();

    // 1. Handle State Transitions
    this.updateState(activeFM, progression);

    // 2. Physical variables calculation
    let isRunning =
      this.state === FeederState.RUNNING ||
      this.state === FeederState.DEGRADED ||
      this.state === FeederState.PRE_FAILURE ||
      this.state === FeederState.FAILURE;

    // Environmental / Baseline parameters
    const moisture = SignalPatterns.noisyValue(8.2, 0.2); // steady moisture %
    const ambientTemp = SignalPatterns.noisyValue(28.0, 0.5) + SignalPatterns.periodicPattern(this.ticks, 720, 3.0); // 24hr cycle

    // Raw belt load (actual material on belt in kg/m)
    let beltLoadActual = 0;
    if (isRunning) {
      const gateVariation = SignalPatterns.noisyValue(23.5, 0.8 * effects.loadNoiseMultiplier);
      const cyclicVariation = SignalPatterns.periodicPattern(this.ticks, 25, 1.2);
      beltLoadActual = (gateVariation + cyclicVariation) * effects.loadScale;
    }

    // Zero-drift calculation
    const zeroDrift = effects.zeroDriftOffset;

    // The load cells report: Actual + Zero Drift
    const beltLoadReported = isRunning ? Math.max(0, beltLoadActual + zeroDrift) : 0;

    // Speed target selection based on DISOCONT controller formula: Speed = Setpoint / (Load * 3.6)
    let speedSetpoint = 0.0;
    if (isRunning) {
      if (beltLoadReported > 1.0) {
        speedSetpoint = this.targetFeedRate / (beltLoadReported * 3.6);
        // Clamp to speed limits
        speedSetpoint = Math.min(CONFIG.BOUNDS.BELT_SPEED.max, Math.max(CONFIG.BOUNDS.BELT_SPEED.min, speedSetpoint));
      } else {
        speedSetpoint = CONFIG.BOUNDS.BELT_SPEED.min; // Run at minimum speed if empty
      }
    }

    // Actual speed with inertia and slip factor
    if (isRunning) {
      const speedInertia = 0.4;
      this.currentSpeed += (speedSetpoint - this.currentSpeed) * speedInertia;
      // Anomaly multiplier
      this.currentSpeed = this.currentSpeed * effects.speedScale;
    } else {
      this.currentSpeed = 0.0;
    }

    // Calculate Feed Rates (t/h)
    const feedRateReported = beltLoadReported * this.currentSpeed * 3.6;
    const feedRateActual = beltLoadActual * this.currentSpeed * 3.6;

    // Totalizer accumulation (t) based on physically transported load
    if (feedRateActual > 0) {
      const tickHours = (CONFIG.FEEDER.TICK_INTERVAL_MS / 1000) / 3600;
      this.totalTonnage += feedRateActual * tickHours * timeAcc;
    }

    const feedRateDeviation = this.targetFeedRate > 0
      ? ((feedRateReported - this.targetFeedRate) / this.targetFeedRate) * 100
      : 0;

    // Motor Current (A)
    let motorCurrent = 0.0;
    if (isRunning) {
      const speedFraction = this.currentSpeed / CONFIG.BOUNDS.BELT_SPEED.max;
      const loadFraction = beltLoadActual / CONFIG.BOUNDS.BELT_LOAD.max;
      const currentBase = 6.0 + 7.0 * speedFraction + 5.0 * loadFraction;
      motorCurrent = Math.max(0, SignalPatterns.noisyValue(currentBase, 0.25) + effects.motorCurrentOffset);
    }

    // Motor Temperature (°C)
    let targetMotorTemp = ambientTemp;
    if (isRunning) {
      const nominalI = CONFIG.BOUNDS.MOTOR_CURRENT.nominal;
      targetMotorTemp = ambientTemp + Math.pow(motorCurrent / nominalI, 2.0) * 35.0 + effects.motorTempOffset;
    }
    this.motorTemp += (targetMotorTemp - this.motorTemp) * 0.05 * timeAcc;

    // Belt Tension (N)
    let beltTension = 0.0;
    if (this.state !== FeederState.IDLE) {
      const tensionBase = CONFIG.BOUNDS.BELT_TENSION.nominal - (beltLoadActual * 5.0);
      beltTension = SignalPatterns.noisyValue(tensionBase, 15) * effects.tensionScale;
    }

    // Vibrations (mm/s)
    let vibrationDrive = 0.0;
    let vibrationTail = 0.0;
    if (isRunning) {
      const speedFraction = this.currentSpeed / CONFIG.BOUNDS.BELT_SPEED.max;
      vibrationDrive = SignalPatterns.noisyValue(0.8 + 1.2 * speedFraction, 0.1) + effects.vibrationDriveOffset;
      vibrationTail = SignalPatterns.noisyValue(0.6 + 0.9 * speedFraction, 0.1) + effects.vibrationTailOffset;
    } else {
      vibrationDrive = SignalPatterns.noisyValue(0.05, 0.01);
      vibrationTail = SignalPatterns.noisyValue(0.04, 0.01);
    }

    // 3. Sensor Reading Formats and Severity Checks
    const sensors = {
      belt_load: {
        value: parseFloat(beltLoadReported.toFixed(2)),
        unit: "kg/m",
        status: this.evaluateStatus(beltLoadReported, 2, 5, 45, 48),
      },
      belt_speed: {
        value: parseFloat(this.currentSpeed.toFixed(2)),
        unit: "m/s",
        status: this.evaluateStatus(this.currentSpeed, undefined, undefined, 1.35, 1.5),
      },
      feed_rate_actual: {
        value: parseFloat(feedRateReported.toFixed(2)),
        unit: "t/h",
        status: this.evaluateStatus(feedRateReported, 40, 45, 55, 60),
      },
      feed_rate_setpoint: {
        value: this.targetFeedRate,
        unit: "t/h",
        status: SensorStatus.NORMAL,
      },
      feed_rate_deviation: {
        value: parseFloat(feedRateDeviation.toFixed(1)),
        unit: "%",
        status: this.evaluateStatus(feedRateDeviation, -10, -5, 5, 10),
      },
      totalizer: {
        value: parseFloat(this.totalTonnage.toFixed(2)),
        unit: "t",
        status: SensorStatus.NORMAL,
      },
      motor_current: {
        value: parseFloat(motorCurrent.toFixed(1)),
        unit: "A",
        status: this.evaluateStatus(motorCurrent, undefined, undefined, 22, 25),
      },
      motor_temp: {
        value: parseFloat(this.motorTemp.toFixed(1)),
        unit: "°C",
        status: this.evaluateStatus(this.motorTemp, undefined, undefined, CONFIG.BOUNDS.MOTOR_TEMP.warning, CONFIG.BOUNDS.MOTOR_TEMP.critical),
      },
      belt_tension: {
        value: parseFloat(beltTension.toFixed(0)),
        unit: "N",
        status: this.evaluateStatus(beltTension, 400, 600, 1600, 1800),
      },
      vibration_drive: {
        value: parseFloat(vibrationDrive.toFixed(2)),
        unit: "mm/s",
        status: this.evaluateStatus(vibrationDrive, undefined, undefined, CONFIG.BOUNDS.VIBRATION.warning, CONFIG.BOUNDS.VIBRATION.critical),
      },
      vibration_tail: {
        value: parseFloat(vibrationTail.toFixed(2)),
        unit: "mm/s",
        status: this.evaluateStatus(vibrationTail, undefined, undefined, CONFIG.BOUNDS.VIBRATION.warning - 0.5, CONFIG.BOUNDS.VIBRATION.critical - 0.5),
      },
      zero_drift: {
        value: parseFloat(zeroDrift.toFixed(2)),
        unit: "kg/m",
        status: this.evaluateStatus(zeroDrift, undefined, undefined, 1.0, 2.0),
      },
      moisture: {
        value: parseFloat(moisture.toFixed(1)),
        unit: "%",
        status: SensorStatus.NORMAL,
      },
      ambient_temp: {
        value: parseFloat(ambientTemp.toFixed(1)),
        unit: "°C",
        status: SensorStatus.NORMAL,
      },
    };

    // 4. Alerts Generation & Health Score Calculation
    this.updateAlerts(sensors);
    this.calculateHealth(progression, activeFM);

    // 5. Package and Return Payload
    return {
      equipmentId: this.id,
      equipmentType: "weigh_feeder",
      model: CONFIG.FEEDER.MODEL,
      controller: CONFIG.FEEDER.CONTROLLER,
      plantId: this.plantId,
      timestamp: new Date().toISOString(),
      state: this.state,
      activeFailureMode: activeFM,
      healthScore: Math.round(this.healthScore),
      sensors,
      alerts: [...this.activeAlerts],
      metadata: {
        manufacturer: "Schenck Process",
        model: CONFIG.FEEDER.MODEL,
        serialNo: "WF-2021-04712",
        installDate: "2021-06-10",
        material: CONFIG.FEEDER.MATERIAL,
        location: CONFIG.FEEDER.LOCATION,
        nominalFeedRate: CONFIG.FEEDER.NOMINAL_FEED_RATE,
        beltWidth: CONFIG.FEEDER.BELT_WIDTH,
      },
    };
  }

  private updateState(activeFM: FailureMode | null, progression: number): void {
    if (this.state === FeederState.TRIP) return;

    if (this.state === FeederState.IDLE) {
      return;
    }

    if (this.state === FeederState.STARTING) {
      this.startTicks++;
      if (this.startTicks >= 5) {
        this.state = FeederState.RUNNING;
      }
      return;
    }

    if (activeFM) {
      if (progression > 0.85) {
        if (activeFM === "FM-04" || activeFM === "FM-03") {
          this.state = FeederState.TRIP;
          this.currentSpeed = 0;
          this.activeAlerts.push({
            code: "TRIP-001",
            message: `CRITICAL TRIP: Controller Emergency Stop activated. Reason: ${activeFM === "FM-04" ? "Chute Blocked" : "Drive Jam / Bearing Lockup"}.`,
            severity: "CRITICAL",
            timestamp: new Date().toISOString(),
          });
        } else {
          this.state = FeederState.FAILURE;
        }
      } else if (progression > 0.5) {
        this.state = FeederState.PRE_FAILURE;
      } else {
        this.state = FeederState.DEGRADED;
      }
    } else {
      this.state = FeederState.RUNNING;
    }
  }

  private updateAlerts(sensors: any): void {
    this.activeAlerts = this.activeAlerts.filter((a) => a.code.startsWith("TRIP-"));

    const addAlert = (code: string, message: string, severity: "WARNING" | "CRITICAL", sensor: string) => {
      this.activeAlerts.push({
        code,
        message,
        severity,
        sensor,
        timestamp: new Date().toISOString(),
      });
    };

    if (sensors.vibration_drive.status === SensorStatus.CRITICAL) {
      addAlert("ALT-001", "Severe drive bearing vibration. Danger of structural damage.", "CRITICAL", "vibration_drive");
    } else if (sensors.vibration_drive.status === SensorStatus.WARNING) {
      addAlert("ALT-002", "Drive bearing vibration elevated. Inspection recommended.", "WARNING", "vibration_drive");
    }

    if (sensors.motor_temp.status === SensorStatus.CRITICAL) {
      addAlert("ALT-003", "Motor winding temperature exceeds safe operating limit.", "CRITICAL", "motor_temp");
    } else if (sensors.motor_temp.status === SensorStatus.WARNING) {
      addAlert("ALT-004", "Motor running hot. Check ventilation or load.", "WARNING", "motor_temp");
    }

    if (sensors.belt_tension.status === SensorStatus.CRITICAL && sensors.belt_tension.value < 500) {
      addAlert("ALT-005", "Critical low belt tension. Severe belt slip detected.", "CRITICAL", "belt_tension");
    } else if (sensors.belt_tension.status === SensorStatus.WARNING && sensors.belt_tension.value < 700) {
      addAlert("ALT-006", "Low belt tension. Tension correction required.", "WARNING", "belt_tension");
    }

    if (sensors.feed_rate_deviation.status === SensorStatus.CRITICAL) {
      addAlert("ALT-007", "Actual feed rate deviates critically from setpoint.", "CRITICAL", "feed_rate_deviation");
    } else if (sensors.feed_rate_deviation.status === SensorStatus.WARNING) {
      addAlert("ALT-008", "Feed rate out of tolerance threshold.", "WARNING", "feed_rate_deviation");
    }

    if (sensors.zero_drift.status === SensorStatus.CRITICAL) {
      addAlert("ALT-009", "Zero point calibration drift critical. Clear material buildup.", "CRITICAL", "zero_drift");
    }
  }

  private calculateHealth(progression: number, activeFM: FailureMode | null): void {
    if (this.state === FeederState.TRIP) {
      this.healthScore = 0;
      return;
    }

    let baseHealth = 100;

    if (activeFM) {
      baseHealth -= progression * 75;
    }

    const criticalCount = this.activeAlerts.filter((a) => a.severity === "CRITICAL").length;
    const warningCount = this.activeAlerts.filter((a) => a.severity === "WARNING").length;

    baseHealth -= criticalCount * 15;
    baseHealth -= warningCount * 5;

    this.healthScore = Math.max(0, Math.min(100, baseHealth));
  }
}

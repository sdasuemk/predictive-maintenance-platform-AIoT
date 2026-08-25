import { FeederState } from "../enums/feeder-state.enum.js";
import { SensorStatus } from "../enums/sensor-status.enum.js";

export interface SensorReading {
  value: number;
  unit: string;
  status: SensorStatus;
}

export interface Alert {
  code: string;
  message: string;
  severity: "WARNING" | "CRITICAL";
  sensor?: string;
  timestamp: string;
}

export interface TelemetryPayload {
  equipmentId: string;
  equipmentType: string;
  model: string;
  controller: string;
  plantId: string;
  timestamp: string;
  state: FeederState;
  activeFailureMode: string | null;
  healthScore: number;
  sensors: {
    belt_load: SensorReading;
    belt_speed: SensorReading;
    feed_rate_actual: SensorReading;
    feed_rate_setpoint: SensorReading;
    feed_rate_deviation: SensorReading;
    totalizer: SensorReading;
    motor_current: SensorReading;
    motor_temp: SensorReading;
    belt_tension: SensorReading;
    vibration_drive: SensorReading;
    vibration_tail: SensorReading;
    zero_drift: SensorReading;
    moisture: SensorReading;
    ambient_temp: SensorReading;
  };
  alerts: Alert[];
  metadata: {
    manufacturer: string;
    model: string;
    serialNo: string;
    installDate: string;
    material: string;
    location: string;
    nominalFeedRate: number;
    beltWidth: number;
  };
}

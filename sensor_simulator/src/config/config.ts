import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  
  // MQTT settings
  MQTT: {
    USE_EMBEDDED: process.env.USE_EMBEDDED_MQTT !== "false", // Default true for easy start
    BROKER_URL: process.env.MQTT_BROKER_URL || "mqtt://127.0.0.1:1883",
    CLIENT_ID: process.env.MQTT_CLIENT_ID || "weigh_feeder_sim",
    TOPIC_PREFIX: "pmp/PLANT-001/weigh_feeder/WF-P1-001",
  },

  // MongoDB settings
  MONGO: {
    ENABLED: process.env.MONGO_ENABLED === "true", // Default false
    URI: process.env.MONGO_URI || "mongodb://localhost:27017/pmp_aiot",
  },

  // Feeder parameters
  FEEDER: {
    EQUIPMENT_ID: "WF-P1-001",
    PLANT_ID: "PLANT-001",
    MODEL: "MULTIDOS-H",
    CONTROLLER: "DISOCONT-Tersus",
    MATERIAL: "Coal",
    LOCATION: "Transfer House-2, Bay-4",
    NOMINAL_FEED_RATE: 50.0, // t/h
    BELT_WIDTH: 800, // mm
    TICK_INTERVAL_MS: parseInt(process.env.TICK_INTERVAL_MS || "2000", 10),
    TIME_ACCELERATION: parseFloat(process.env.TIME_ACCELERATION || "1.0"), // 1.0 = real-time
  },

  // Bounds for Normal operations
  BOUNDS: {
    BELT_LOAD: { min: 8, max: 40, unit: "kg/m" },
    BELT_SPEED: { min: 0.1, max: 1.5, unit: "m/s" },
    MOTOR_CURRENT: { nominal: 12, max: 25, unit: "A" },
    MOTOR_TEMP: { nominal: 45, warning: 85, critical: 95, unit: "°C" },
    BELT_TENSION: { nominal: 1100, min: 800, max: 1400, unit: "N" },
    VIBRATION: { nominal: 1.0, warning: 5.0, critical: 7.1, unit: "mm/s" },
    MOISTURE: { min: 4, max: 12, unit: "%" },
    AMBIENT_TEMP: { min: 20, max: 40, unit: "°C" },
  }
};

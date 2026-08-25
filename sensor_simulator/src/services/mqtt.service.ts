import mqtt, { MqttClient } from "mqtt";
import { CONFIG } from "../config/config.js";
import { TelemetryPayload } from "../types/telemetry.types.js";

export class MqttService {
  private client: MqttClient | null = null;
  private brokerUrl: string;
  private topicPrefix: string;
  private lastState: string = "";

  constructor() {
    this.brokerUrl = CONFIG.MQTT.BROKER_URL;
    this.topicPrefix = CONFIG.MQTT.TOPIC_PREFIX;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[MQTT Publisher] Connecting to broker at ${this.brokerUrl}...`);

      this.client = mqtt.connect(this.brokerUrl, {
        clientId: CONFIG.MQTT.CLIENT_ID + "_" + Math.random().toString(16).substring(2, 8),
        reconnectPeriod: 5000,
      });

      this.client.on("connect", () => {
        console.log(`[MQTT Publisher] Connected successfully to MQTT Broker.`);
        resolve();
      });

      this.client.on("error", (err) => {
        console.error(`[MQTT Publisher] Connection error:`, err);
        reject(err);
      });
    });
  }

  public publishTelemetry(payload: TelemetryPayload): void {
    if (!this.client || !this.client.connected) return;

    // 1. Publish standard full payload
    const telemetryTopic = `${this.topicPrefix}/telemetry`;
    this.client.publish(telemetryTopic, JSON.stringify(payload), { qos: 0 });

    // 2. Publish state change topic (only if it changes)
    if (payload.state !== this.lastState) {
      const stateTopic = `${this.topicPrefix}/state`;
      this.client.publish(
        stateTopic,
        JSON.stringify({
          previous: this.lastState,
          current: payload.state,
          timestamp: payload.timestamp,
        }),
        { qos: 1, retain: true }
      );
      this.lastState = payload.state;
    }

    // 3. Publish alerts topic if there are warning/critical items
    if (payload.alerts.length > 0) {
      const alertsTopic = `${this.topicPrefix}/alerts`;
      this.client.publish(alertsTopic, JSON.stringify(payload.alerts), { qos: 1 });
    }
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => {
          console.log("[MQTT Publisher] Disconnected from broker.");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

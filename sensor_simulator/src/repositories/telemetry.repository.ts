import { CONFIG } from "../config/config.js";
import { TelemetryPayload } from "../types/telemetry.types.js";
import { TelemetryDocument } from "../models/telemetry.model.js";

export class TelemetryRepository {
  private enabled: boolean;
  private client: any = null;
  private collection: any = null;

  constructor() {
    this.enabled = CONFIG.MONGO.ENABLED;
  }

  public async connect(): Promise<void> {
    if (!this.enabled) {
      console.log("[Telemetry Repository] MongoDB is disabled in configuration.");
      return;
    }

    try {
      console.log(`[Telemetry Repository] Connecting to MongoDB at ${CONFIG.MONGO.URI}...`);
      
      const { MongoClient } = await import("mongodb");
      
      this.client = new MongoClient(CONFIG.MONGO.URI);
      await this.client.connect();
      
      const db = this.client.db();
      this.collection = db.collection("telemetry");
      
      // TTL index to automatically clean historical logs after 30 days
      await this.collection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 30 * 24 * 60 * 60 }
      );
      
      console.log("[Telemetry Repository] Connected to MongoDB database successfully.");
    } catch (err: any) {
      console.warn(`[Telemetry Repository] Connection failed: ${err.message}`);
      console.warn("[Telemetry Repository] Running without persistent DB logging.");
      this.enabled = false;
    }
  }

  public async save(payload: TelemetryPayload): Promise<void> {
    if (!this.enabled || !this.collection) return;

    try {
      const document: TelemetryDocument = {
        ...payload,
        timestamp: new Date(payload.timestamp),
      };
      await this.collection.insertOne(document);
    } catch (err: any) {
      console.error("[Telemetry Repository] Error writing document:", err.message);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log("[Telemetry Repository] Closed connection.");
    }
  }
}

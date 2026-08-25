import { TelemetryPayload } from "../types/telemetry.types.js";

/**
 * MongoDB Time-series Document Model Interface
 */
export interface TelemetryDocument extends Omit<TelemetryPayload, "timestamp"> {
  _id?: any; // MongoDB ObjectId
  timestamp: Date; // Date object for indexing and TTL expirations
}

import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { FeederService } from "./feeder.service.js";
import { TelemetryPayload } from "../types/telemetry.types.js";
import { FailureMode } from "../utils/anomaly-injector.js";

export class SocketService {
  private io: Server;
  private feederService: FeederService;

  constructor(httpServer: HttpServer, feederService: FeederService) {
    this.feederService = feederService;
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.io.on("connection", (socket) => {
      console.log(`[Socket.IO] Web client connected: ${socket.id}`);

      // Setpoint change listener
      socket.on("control:setpoint", (data: { setpoint: number }) => {
        const { setpoint } = data;
        if (typeof setpoint === "number" && setpoint >= 5 && setpoint <= 100) {
          this.feederService.targetFeedRate = setpoint;
          console.log(`[Socket.IO] Setpoint updated via WS to ${setpoint} t/h`);
          this.io.emit("control:setpoint:ack", { targetFeedRate: this.feederService.targetFeedRate });
        }
      });

      // Failure trigger listener
      socket.on("control:failure", (data: { mode: FailureMode }) => {
        const { mode } = data;
        if (["FM-01", "FM-02", "FM-03", "FM-04", "FM-05"].includes(mode)) {
          this.feederService.triggerFailure(mode);
          console.log(`[Socket.IO] Failure mode ${mode} injected via WS`);
          this.io.emit("control:failure:ack", { activeFailureMode: mode, state: this.feederService.state });
        }
      });

      // Reset listener
      socket.on("control:reset", () => {
        this.feederService.resetFailure();
        console.log("[Socket.IO] Feeder reset via WS");
        this.io.emit("control:reset:ack", { state: this.feederService.state });
      });

      socket.on("disconnect", () => {
        console.log(`[Socket.IO] Web client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Broadcasts standard telemetry snapshots to all web clients
   */
  public broadcastTelemetry(payload: TelemetryPayload): void {
    this.io.emit("telemetry:stream", payload);

    // If active alerts are present, also broadcast on alert channel
    if (payload.alerts.length > 0) {
      this.io.emit("alert:emit", payload.alerts);
    }
  }
}

import { Request, Response } from "express";
import { FeederService } from "../services/feeder.service.js";
import { CONFIG } from "../config/config.js";

export class TelemetryController {
  private feederService: FeederService;

  constructor(feederService: FeederService) {
    this.feederService = feederService;
  }

  public getHealth = (req: Request, res: Response): void => {
    res.json({
      status: "UP",
      timestamp: new Date().toISOString(),
      equipmentId: this.feederService.getEquipmentId(),
      config: {
        mqttEmbedded: CONFIG.MQTT.USE_EMBEDDED,
        mongoEnabled: CONFIG.MONGO.ENABLED,
      },
    });
  };

  public getTelemetry = (req: Request, res: Response): void => {
    const payload = this.feederService.tick();
    res.json(payload);
  };
}

import { Request, Response } from "express";
import { FeederService } from "../services/feeder.service.js";
import { FailureMode } from "../utils/anomaly-injector.js";

export class ControlController {
  private feederService: FeederService;

  constructor(feederService: FeederService) {
    this.feederService = feederService;
  }

  public triggerFailure = (req: Request, res: Response): void => {
    const { mode } = req.body as { mode: FailureMode };

    if (!mode || !["FM-01", "FM-02", "FM-03", "FM-04", "FM-05"].includes(mode)) {
      res.status(400).json({
        error: "Invalid failure mode. Must be one of: FM-01, FM-02, FM-03, FM-04, FM-05",
      });
      return;
    }

    this.feederService.triggerFailure(mode);
    res.json({
      message: `Triggered failure mode ${mode} successfully.`,
      state: this.feederService.state,
    });
  };

  public resetFailure = (req: Request, res: Response): void => {
    this.feederService.resetFailure();
    res.json({
      message: "Reset feeder failure status and cleared active anomalies.",
      state: this.feederService.state,
    });
  };

  public setSetpoint = (req: Request, res: Response): void => {
    const { setpoint } = req.body as { setpoint: number };

    if (typeof setpoint !== "number" || setpoint < 5 || setpoint > 100) {
      res.status(400).json({
        error: "Invalid setpoint value. Must be a number between 5 and 100 t/h.",
      });
      return;
    }

    this.feederService.targetFeedRate = setpoint;
    res.json({
      message: `Setpoint updated to ${setpoint} t/h.`,
      targetFeedRate: this.feederService.targetFeedRate,
    });
  };
}

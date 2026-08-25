import { Router } from "express";
import { FeederService } from "../services/feeder.service.js";
import { TelemetryController } from "../controllers/telemetry.controller.js";
import { ControlController } from "../controllers/control.controller.js";
import { createTelemetryRouter } from "./telemetry.router.js";
import { createControlRouter } from "./control.router.js";

export function createApiRouter(feederService: FeederService): Router { /* Exposes a public function that accepts an instance of FeederService. */
  const apiRouter = Router(); // create router

  const telemetryController = new TelemetryController(feederService);
  const controlController = new ControlController(feederService);

  // Mount sub-routers
  apiRouter.use(createTelemetryRouter(telemetryController));
  apiRouter.use(createControlRouter(controlController));

  return apiRouter;
}

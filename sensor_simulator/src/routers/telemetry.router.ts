import { Router } from "express";
import { TelemetryController } from "../controllers/telemetry.controller.js";

export function createTelemetryRouter(controller: TelemetryController): Router {
  const router = Router();
  
  router.get("/health", controller.getHealth);
  router.get("/telemetry", controller.getTelemetry);
  
  return router;
}

import { Router } from "express";
import { ControlController } from "../controllers/control.controller.js";

export function createControlRouter(controller: ControlController): Router {
  const router = Router();

  router.post("/failure/trigger", controller.triggerFailure);
  router.post("/failure/reset", controller.resetFailure);
  router.post("/feed-rate/setpoint", controller.setSetpoint);

  return router;
}

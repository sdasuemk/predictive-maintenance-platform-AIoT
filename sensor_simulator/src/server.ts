import express from "express";
import { FeederService } from "./services/feeder.service.js";
import { CONFIG } from "./config/config.js";
import { createApp } from "./app.js";

export function startExpressServer(feederService: FeederService): express.Express {
  const app = createApp(feederService);

  app.listen(CONFIG.PORT, () => {
    console.log(`[Express Server] HTTP REST API listening at http://localhost:${CONFIG.PORT}`);
  });

  return app;
}

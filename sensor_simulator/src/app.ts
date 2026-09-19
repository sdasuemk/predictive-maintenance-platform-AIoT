import express from "express";
import { FeederService } from "./services/feeder.service.js";
import { createApiRouter } from "./routers/index.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { loggingMiddleware } from "./middlewares/logging.middleware.js";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware.js";

export function createApp(feederService: FeederService): express.Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(corsMiddleware);
  app.use(loggingMiddleware);

  // Health check endpoint for Render
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ONLINE", service: "pmp-sensor-simulator" });
  });

  // API Routes
  app.use("/api", createApiRouter(feederService));

  // 404 & Global Error Middleware
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

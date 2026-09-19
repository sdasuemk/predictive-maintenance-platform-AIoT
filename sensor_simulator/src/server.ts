import express from "express";
import { createServer, Server as HttpServer } from "http";
import { FeederService } from "./services/feeder.service.js";
import { SocketService } from "./services/socket.service.js";
import { CONFIG } from "./config/config.js";
import { createApp } from "./app.js";

export interface ServerInstance {
  app: express.Express;
  httpServer: HttpServer;
  socketService: SocketService;
}

export function startExpressServer(feederService: FeederService): ServerInstance {
  const app = createApp(feederService);
  const httpServer = createServer(app);
  const socketService = new SocketService(httpServer, feederService);

  httpServer.listen(CONFIG.PORT, "0.0.0.0", () => {
    console.log(`[Express Server] HTTP REST API listening on http://0.0.0.0:${CONFIG.PORT}`);
    console.log(`[Socket.IO Server] WebSocket server listening on same port.`);
  });

  return { app, httpServer, socketService };
}

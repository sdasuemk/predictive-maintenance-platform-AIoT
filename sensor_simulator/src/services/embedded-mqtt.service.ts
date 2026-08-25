import { Aedes } from "aedes";
import { createServer } from "net";

export class EmbeddedMqttService {
  private brokerInstance: any;
  private serverInstance: any;
  private port: number;

  constructor(port: number = 1883) {
    this.port = port;
  }

  public async start(): Promise<void> {
    try {
      // Use standard Mosqujs / Aedes async factory
      const broker = await Aedes.createBroker();
      this.brokerInstance = broker;

      return new Promise<void>((resolve, reject) => {
        const server = createServer(broker.handle);
        this.serverInstance = server;

        server.listen(this.port, "0.0.0.0", () => {
          console.log(`[Embedded MQTT] Broker listening on port ${this.port}`);
          resolve();
        });

        server.on("error", (err) => {
          console.error("[Embedded MQTT] Server error:", err);
          reject(err);
        });

        broker.on("client", (client: any) => {
          console.log(`[Embedded MQTT] Client Connected: ${client ? client.id : "unknown"}`);
        });

        broker.on("clientDisconnect", (client: any) => {
          console.log(`[Embedded MQTT] Client Disconnected: ${client ? client.id : "unknown"}`);
        });
      });
    } catch (err) {
      throw err;
    }
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.serverInstance) {
        this.serverInstance.close(() => {
          if (this.brokerInstance) {
            this.brokerInstance.close(() => {
              console.log("[Embedded MQTT] Broker stopped");
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

# Weigh Feeder Simulator (Node.js + TypeScript)

This is an Industry 4.0 telemetry simulator modeling a **MULTIDOS-H Belt Weigh Feeder** controlled by a **DISOCONT Tersus** gravimetric controller.

It features physics-accurate telemetry calculations, active closed-loop speed regulation, progressive failure modes, and multiple communication layers (MQTT, REST API, MongoDB).

---

## Technical Stack
* **Language:** TypeScript
* **Runtime:** Node.js
* **Execution Engine:** `tsx` (TypeScript Execute)
* **MQTT:** In-process Aedes broker
* **Database:** MongoDB time-series collection (Optional)
* **API Wrapper:** Express.js REST interface

---

## Quick Start

### 1. Configure the Environment
Ensure your `.env` file is initialized:
```bash
# sensor_simulator/.env
PORT=3001
USE_EMBEDDED_MQTT=true
MONGO_ENABLED=false
TICK_INTERVAL_MS=2000
TIME_ACCELERATION=10.0
```

### 2. Launch the Simulator
Run the following command to start the simulator in development mode:
```bash
npm run dev
```

You will see an interactive CLI Dashboard printing live telemetry values directly to the console.

---

## Interactive Controls (CLI Menu)

When running the simulator in the terminal, you can interact with the live weigh feeder using these hotkeys:

* `1`: Inject **Load Cell Zero Drift** (`FM-01`)
* `2`: Inject **Belt Slippage** (`FM-02`)
* `3`: Inject **Drive Bearing Wear** (`FM-03`)
* `4`: Inject **Chute Blockage / Stall** (`FM-04`)
* `5`: Inject **Belt Mistracking/Oscillations** (`FM-05`)
* `R`: **Reset** active faults, clear anomalies, and restart the feeder
* `S`: **Toggle Start/Stop** states (transition between `IDLE` and `RUNNING`)
* `Q` or `Ctrl + C`: Safe **exit** and shut down MQTT broker and MongoDB client

---

## REST API Documentation

The simulator starts an Express HTTP server alongside the process on port `3001` to interface with dashboards and AI copilots:

### 1. Health Status Check
* **Endpoint:** `GET http://localhost:3001/api/health`
* **Response:**
  ```json
  {
    "status": "UP",
    "timestamp": "2026-08-25T15:50:00.000Z",
    "equipmentId": "WF-P1-001",
    "config": { "mqttEmbedded": true, "mongoEnabled": false }
  }
  ```

### 2. Get Telemetry Snapshot
* **Endpoint:** `GET http://localhost:3001/api/telemetry`
* **Response:** Returns the standard Industry 4.0 JSON payload containing 14 physical sensor objects, alert arrays, machine states, and asset metadata.

### 3. Programmatic Fault Injection
* **Endpoint:** `POST http://localhost:3001/api/failure/trigger`
* **Request Body:**
  ```json
  { "mode": "FM-03" }
  ```
  *(Supported modes: `FM-01`, `FM-02`, `FM-03`, `FM-04`, `FM-05`)*

### 4. Clear Faults
* **Endpoint:** `POST http://localhost:3001/api/failure/reset`

### 5. Adjust Feed Setpoint
* **Endpoint:** `POST http://localhost:3001/api/setpoint`
* **Request Body:**
  ```json
  { "setpoint": 45.0 }
  ```

---

## MQTT Communication Schema

Telemetry metrics and events are published on the following topics:

* `pmp/PLANT-001/weigh_feeder/WF-P1-001/telemetry`: High-frequency sensor values (JSON object containing all metrics).
* `pmp/PLANT-001/weigh_feeder/WF-P1-001/state`: Published only on state changes (e.g. `RUNNING` -> `DEGRADED`).
* `pmp/PLANT-001/weigh_feeder/WF-P1-001/alerts`: Event stream of warnings and critical system alerts.

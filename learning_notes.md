# PMP AIoT Weigh Feeder Simulator: Learning Notes

This document provides a comprehensive breakdown of the concepts, architecture, and physics equations implemented in the **Schenck Process MULTIDOS Weigh Feeder Simulator**.

---

## 1. Directory Architecture (Production-Grade)

The project is structured using a **Layered Architecture** pattern standard in enterprise backend environments (e.g., NestJS, Spring Boot). 

```
src/
├── config/           # Centralized environment configuration
├── enums/            # Pure state & status dictionaries
├── types/            # TypeScript contracts & payload interfaces
├── models/           # Database document schema definitions
├── repositories/     # Data Access Layer (queries & DB insertions)
├── services/         # Core business engines (Physics, MQTT brokers, publishers)
├── controllers/      # HTTP request/response validation layer
├── routers/          # Pathway mapping
├── middlewares/      # Cross-cutting concerns (CORS, logs, errors)
└── utils/            # Helper utilities (signals, injector, colors)
```

### Why this separation of concerns?
* **Decoupling:** You can change your database from MongoDB to PostgreSQL by editing ONLY the `telemetry.repository.ts` file. The rest of the app doesn't know or care how database writes happen.
* **Maintainability:** If you add a route, you write a `router` and a `controller`. The core physics service (`feeder.service.ts`) remains clean.
* **Testability:** By passing dependencies into class constructors (Dependency Injection), you can easily mock services and test controllers in isolation.

---

## 2. Data Organization: Enums vs. Types vs. Models

TypeScript files are separated strictly by their data semantics:

| Layer | Folder Location | What it represents | Example |
|---|---|---|---|
| **Enums** | `src/enums/` | Fixed sets of constant string options. | `FeederState` (`RUNNING`, `TRIP`) |
| **Types** | `src/types/` | Data transfer interfaces (payloads in transition). | `TelemetryPayload` (JSON shape sent to API/MQTT) |
| **Models** | `src/models/` | Database collection schemas. | `TelemetryDocument` (Data shape stored in MongoDB) |

### Key Detail: `TelemetryPayload` vs `TelemetryDocument`
* In the API/MQTT stream, `timestamp` is a string (ISO-8601).
* In MongoDB, we cast `timestamp` to a JavaScript `Date` object:
  ```typescript
  export interface TelemetryDocument extends Omit<TelemetryPayload, 'timestamp'> {
    timestamp: Date;
  }
  ```
  This is a critical best practice because it allows MongoDB to optimize queries using native BSON date indexes and automatically expire old logs.

---

## 3. MQTT: The Pub/Sub Real-Time Pipeline

In an **Industry 4.0** system, dashboards require millisecond-level telemetry updates. Standard databases are too slow for real-time polling. We use **MQTT** to solve this.

```
                  PUBLISH
[ Feeder Simulator ] ────► [ Topic: pmp/.../telemetry ]
                                  │
                                  ▼ (MQTT Broker Aedes)
                         ┌────────┴────────┐
                         ▼                 ▼
                     SUBSCRIBE         SUBSCRIBE
               [ React Dashboard ]   [ Alert Pipeline ]
```

### Key Concepts:
* **Decoupled Messaging:** The publisher doesn't know who is listening. It simply sends messages to the broker. This keeps the simulator engine lightweight.
* **Embedded Aedes Broker:** We run an in-process broker directly in Node.js, removing external dependencies (like Mosquitto) for local testing. We bind to `0.0.0.0` and connect to `127.0.0.1` to ensure stable loopback adapters on Windows local networks.
* **Data Division:** 
  * **MQTT** manages **Live Streaming data** (Data-in-Motion).
  * **MongoDB** manages **Historical records** (Data-at-Rest).

---

## 4. MongoDB Time-Series & TTL

To prevent the telemetry collection from consuming excessive disk space during continuous simulation, the repository configures a **TTL (Time-To-Live)** index:

```typescript
await this.collection.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);
```

### How it works:
A background thread in MongoDB continuously monitors this index and automatically deletes any document whose `timestamp` is older than 30 days, keeping database size bounded.

---

## 5. Feeder Physics & Closed-Loop Control

The simulator models a real **Schenck Process MULTIDOS** closed-loop speed regulation.

```
       Setpoint (e.g. 50 t/h)
                 │
                 ▼
  [ DISOCONT Controller Logic ]
                 │
                 ▼ (Adjust speed target)
  [ VFD Motor Speed Controller ] ◄── (Inertia Lag)
                 │
                 ▼
          Actual Speed (v)
                 │
                 ├────────────────► Calculate actual feed rate:
                 ▼                  I = Load * Speed * 3.6
        Actual Load (Q)
```

### The Equations:
1. **Feed Rate calculation ($I$ in t/h):**
   $$I = Q \times v \times 3.6$$
   Where $Q$ is Belt Load ($\text{kg/m}$) and $v$ is Belt Speed ($\text{m/s}$). The factor $3.6$ converts $\text{kg/s}$ to $\text{t/h}$.

2. **Speed Regulation target ($v_{sp}$ in m/s):**
   $$v_{sp} = \frac{I_{sp}}{Q_{rep} \times 3.6}$$
   Where $I_{sp}$ is the setpoint ($50.0\text{ t/h}$) and $Q_{rep}$ is the reported load-cell weight.

3. **Motor Inertia:**
   To simulate real physical weight, the belt speed doesn't instantly jump to the target. It responds with lag:
   $$v_{\text{current}} = v_{\text{current}} + (v_{sp} - v_{\text{current}}) \times 0.4$$

---

## 6. Progressive Anomaly Engine

Industrial equipment failures are rarely instantaneous. They start as minor micro-anomalies that slowly degrade the machine over hours or days. 

The `AnomalyInjector` models this using a **progression factor ($p$)** from $0.0$ ($0\%$) to $1.0$ ($100\%$):

* **FM-01 (Load Cell Drift):** Simulates material building up on the weighbridge scales. It offsets the load readings by $p \times 3.5\text{ kg/m}$. This tricks the controller into slowing the belt down, which in turn drops the *actual* material feed rate below the target setpoint.
* **FM-02 (Belt Slippage):** Tension drops ($tension \times (1 - 0.7p)$) causing speed to fall behind the drive pulley output. Drive motor current and temperature spike as the system fights the slip.
* **FM-03 (Bearing Wear):** Drive end vibration climbs exponentially towards $7.5\text{ mm/s}$ (violating ISO-10816 standards) accompanied by temperature and current rises.
* **FM-04 (Chute Blockage):** Extreme load spike, speed stalls to $0$, motor current maxes out, leading to an emergency system **`TRIP`** state.

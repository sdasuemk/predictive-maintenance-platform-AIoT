# PMP AIoT Weigh Feeder Simulator: Learning Notes

This document provides a comprehensive breakdown of the concepts, architecture, and physics equations implemented in the **AIoT Gravimetric Weigh Feeder Simulator**.

---

## 1. Directory Architecture (Production-Grade)

The project is structured using a **Layered Architecture** pattern standard in enterprise backend and frontend environments. 

### Backend Layout
```
sensor_simulator/src/
├── config/           # Centralized environment configuration (generic settings)
├── enums/            # Pure state & status dictionaries
├── types/            # TypeScript contracts & payload interfaces
├── models/           # Database document schema definitions (BSON)
├── repositories/     # Data Access Layer (queries & DB insertions)
├── services/         # Core business engines (Physics, MQTT brokers, socket publishers)
├── controllers/      # HTTP request/response validation layer
├── routers/          # Pathway mapping
├── middlewares/      # Cross-cutting concerns (CORS, logs, errors)
└── utils/            # Helper utilities (signals, injector, colors)
```

### Frontend Layout
```
pmp_FE/src/
├── components/       # Reusable UI widgets (Header, Controls, DigitalTwin, Metrics, Charts, Alarms)
├── context/          # Socket.IO WebSocket context bridge
├── types/            # TypeScript schemas and unions (no enum rule compliant)
├── App.tsx           # Dashboard main orchestrator and responsive workspace
├── index.css         # Styling system tokens, animations, and viewport rules
└── main.tsx          # App bootstrap
```

### Why this separation of concerns?
* **Decoupling:** You can change your database from MongoDB to PostgreSQL by editing ONLY the repository files. The rest of the app doesn't know or care how database writes happen.
* **Maintainability:** If you add a route, you write a `router` and a `controller`. The core physics service (`feeder.service.ts`) remains clean.
* **Testability:** By passing dependencies into class constructors (Dependency Injection), you can easily mock services and test controllers in isolation.

---

## 2. Data Organization: Enums vs. Types vs. Models

TypeScript files are separated strictly by their data semantics:

| Layer | Folder Location | What it represents | Example |
|---|---|---|---|
| **Enums** | `src/enums/` (Backend) | Fixed sets of constant string options. | `FeederState` (`RUNNING`, `TRIP`) |
| **Types** | `src/types/` (Both) | Data transfer interfaces (payloads in transition). | `TelemetryPayload` (JSON shape sent to API/MQTT) |
| **Models** | `src/models/` (Backend) | Database collection schemas. | `TelemetryDocument` (Data shape stored in MongoDB) |

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

### ❓ Is MQTT storing data in the Database here?
**No. MQTT is strictly a transport protocol (a postman), not a storage database.** 

In our simulator flow, the database storage and MQTT distribution are completely separate actions performed by the orchestration thread (`simulator.ts`) on every tick:
1. **MQTT Pipeline:** The simulator tells `MqttService` to publish a message. The broker forwards this instantly to any connected dashboards and drops it immediately.
2. **MongoDB Pipeline:** The simulator separately calls `TelemetryRepository.save(telemetry)` which connects directly to MongoDB Atlas and writes the data to the hard disk for long-term storage.

---

## 3.1 MQTT: A Layman's Storytelling Analogy

Imagine you want to start a **local neighborhood newsletter** about cooking:

1. **The Writer (Publisher - Simulator):** You write a new recipe card every morning (sensor telemetry data). You don't want to walk door-to-door to deliver it to 50 houses because it would take too long.
2. **The Bulletin Board (Broker - Aedes):** Instead, you walk to the neighborhood community center and pin your recipe card on the board labeled **"Topic: Recipes"**.
3. **The Neighbors (Subscribers - React Dashboard):** Neighbors who signed up for recipe alerts sit in the community lobby. The moment you pin the recipe, the manager copies it and hands it to them instantly (Pub/Sub delivery).
4. **The Library (Database - MongoDB):** The community center has a filing cabinet in the back. Each afternoon, a librarian copies your recipes and files them away.
5. **Why they are different:**
   * If a new neighbor walks in at 3 PM, they can look at the Bulletin Board, but they will only see the *current* recipe pinned there. They cannot see yesterday's recipe on the board because the board has limited space and is only for "today's news" (**MQTT**).
   * If they want to see last week's recipes, they must walk to the filing cabinet in the back and search through the folders (**MongoDB**).

---

## 3.2 MQTT vs. WebSockets (Socket.IO) for Web Dashboards

A common architectural question is: **"If MQTT already uses WebSockets under the hood, why can't a React frontend connect directly to the MQTT broker? Why build an Express + Socket.IO bridge?"**

In production Industry 4.0 platforms, we build a **Socket.IO gateway** on our backend API server instead of letting web browsers connect directly to the MQTT broker for three major reasons:

### 1. The IT/OT Security Divide (The Gatekeeper Pattern)
* **The OT Zone (Operational Technology):** The MQTT broker lives inside the plant's private, firewalled industrial network alongside the actual PLCs, SCADA gateways, and physical weight sensors. Exposing this broker directly to the public internet so that external browsers can connect is a **massive cybersecurity risk** (e.g., unauthorized users injecting malicious command topics).
* **The IT Zone (Information Technology):** The Express backend server sits in a public-facing network zone (DMZ). It acts as a **secure gatekeeper**. It connects to the private MQTT broker on the inside and relays the filtered telemetry safely to the browser on the outside via **Socket.IO**.

```
[ PLCs / Sensors ]
       │ (High-freq Modbus/OPC-UA)
       ▼
 [ Private MQTT Broker ] (Protected OT Zone)
       │
       ▼ (Inside Connection)
 [ Express + Socket.IO Server ] (The Gatekeeper DMZ)
       │
       ▼ (Secure HTTPS/WSS Connection)
 [ React Web Dashboard ] (Public IT Zone)
```

### 2. User Authentication & Access Control
* **Express & Socket.IO:** Standard web security (JWT tokens, OAuth, HTTP session cookies) can be mapped directly to Socket.IO connections. We can instantly check if a user is authorized, has a valid login, or belongs to a specific plant group before sending data.
* **MQTT Brokers:** Standard MQTT brokers (like Aedes) are optimized for low-overhead device telemetry, not complex user sessions. Mapping enterprise web authentication to raw MQTT topics is highly non-standard and difficult to manage.

### 3. Payload Filtering and Optimization
An industrial weigh feeder publishes raw sensor signals, calibration variables, and debugging packets. A web dashboard only needs a subset of these for visual meters. The Express bridge allows us to intercept high-frequency industrial topics, filter or format the JSON payloads, and emit lightweight objects tailored for web rendering, conserving browser memory and user bandwidth.

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

### 📥 How MongoDB Loads and Saves Data (The Database Pipeline)

* **Saving Data (Ingestion):**
  1. Every 2 seconds, `simulator.ts` calls `telemetryRepository.save(payload)`.
  2. The repository intercepts the string ISO-8601 timestamp (e.g. `"2026-08-26T01:00:00.000Z"`) and converts it to a native **BSON Date Object** (`new Date()`).
  3. The MongoDB Node.js driver issues an asynchronous `insertOne` command, which writes the JSON document onto the storage engine disk block.

* **Loading Data (Querying):**
  1. When a client makes a REST request (e.g., `GET /api/telemetry`), the controller triggers a read.
  2. In the next stage (AI Copilot & Analytics), the system will query the repository using MongoDB range filters (e.g. `db.telemetry.find({ timestamp: { $gte: startTime, $lte: endTime } })`).
  3. MongoDB utilizes the BSON index on `timestamp` to instantly locate and load matching records from disk into RAM, returning them as a JSON list.

---

## 5. Frontend SCADA & Viewport Compaction

The frontend dashboard is designed as a single-viewport SCADA monitoring screen, optimizing visual space and preventing scrolling:

### A. Single Viewport Height Constraints
* **Body Lock**: Set `overflow: hidden` and `height: 100vh` on the HTML `body` and `#root` elements to disable outer browser page scrollbars.
* **Grid Flex Layout**: Main container uses `display: flex; flex-direction: column` and sections use `flex: 1; min-height: 0; overflow: hidden;` to force components to fit inside the viewport height.
* **Internal Scrolling**: Cards with variable length lists (like the console logging terminal and active alarms list) use `overflow-y: auto` to enable scrollbars *inside* their panels rather than expanding the outer page.

### B. Column Grid Layout Reordering
To balance component sizing and fit all telemetry metrics within a single screen width of `1024px` and above, the dashboard uses a three-column grid:
`grid-template-columns: 290px 1fr 350px;`

* **Left Column (290px)**: Control Console (Setpoint slider & fault injections) and the Logs Console (Real-time telemetry streams terminal). This keeps controllers and their logs adjacent.
* **Middle Column (1fr - approx 876px)**: Conveyor Belt Digital Twin (top) and a side-by-side split row (bottom) containing the Diagnostic Guide (`250px` width) and the Telemetry Chart (`1fr` width).
* **Right Column (350px)**: Telemetry Parameters Grid (14 variables list with status dots) and the Active Alarms list.

---

## 6. Technical UI Fixes & Features

### A. Roller SVG Rotation Centering Fix
Inline SVGs using CSS rotation animations often orbit around the top-left origin of the canvas `(0,0)` rather than rotating around their local center on major browsers.
We resolved this by defining both `transform-origin` and `transform-box` inside [`index.css`](file:///c:/Coding/PMP_AIoT/pmp_FE/src/index.css):
```css
.belt-roller {
  transform-origin: center;
  transform-box: fill-box;
  animation: rotate-roller 4s linear infinite;
}
```
* **`transform-box: fill-box`** locks the coordinate workspace context to the object's local bounding box, forcing the pulley center to remain locked as the rotation pivot point.

### B. Reverse Chronological Alarms Sorting
Active alarms are sorted in reverse chronological order (newest on top) so that operator attention is immediately directed to the latest faults:
```typescript
{[...alarms].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(...)
```
This sorts the alarms list explicitly by timestamp in descending order before mapping to UI nodes.

### C. System Healthy Indicator Signal
A glowing green `SYSTEM HEALTHY` badge is added to the top-left of the Digital Twin visualizer canvas. It evaluates active state flags:
`{!activeFault && !isTripped}`
If no failure mode is active and the feeder has not tripped, it renders the system healthy badge, giving operators immediate confidence.

---

## 7. Feeder Physics & Closed-Loop Control

The simulator models closed-loop speed regulation on a gravimetric weigh belt feeder:

```
        Setpoint (e.g. 50 t/h)
                 │
                 ▼
     [ Controller Speed Logic ]
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

## 8. Progressive Anomaly Engine

Industrial equipment failures start as minor micro-anomalies that slowly degrade the machine over hours or days. The `AnomalyInjector` models this using a **progression factor ($p$)** from $0.0$ ($0\%$) to $1.0$ ($100\%$):

* **FM-01 (Load Cell Drift):** Simulates material building up on the weighbridge scales. It offsets the load readings by $p \times 3.5\text{ kg/m}$. This tricks the controller into slowing the belt down, which in turn drops the *actual* material feed rate below the target setpoint.
* **FM-02 (Belt Slippage):** Tension drops ($tension \times (1 - 0.7p)$) causing speed to fall behind the drive pulley output. Drive motor current and temperature spike as the system fights the slip.
* **FM-03 (Bearing Wear):** Drive end vibration climbs exponentially towards $7.5\text{ mm/s}$ (violating ISO-10816 standards) accompanied by temperature and current rises.
* **FM-04 (Chute Blockage):** Extreme load spike, speed stalls to $0$, motor current maxes out, leading to an emergency system **`TRIP`** state.
* **FM-05 (Mistracking):** Asymmetric belt loading leading to tail oscillation waves.

---

## 9. Today's Learning Concepts (Summary)

During today's platform integration and visual tuning session, we explored and implemented five core web dashboard design and engineering patterns:

### A. Viewport height confinement in SCADA terminals
To eliminate browser scrollbars and lock layout structures within the view bounds (e.g. `730px` height):
* We use `height: 100vh` and `overflow: hidden` on root containers.
* Inside nested CSS grids, child elements must use `flex: 1` and `min-height: 0` alongside `overflow: hidden` to size themselves dynamically inside the viewport grid without pushing content down.
* Internally growing elements (alarms, console terminal lists) must explicitly implement `overflow-y: auto` to establish internal container scroll context.

### B. CSS SVG Rotation Origin Pivots (`transform-box: fill-box`)
By default, web browsers calculate rotation parameters (`transform-origin: center`) in inline or external SVG files relative to the parent SVG canvas coordinate space origin `(0,0)`, causing circles to orbit.
* Adding **`transform-box: fill-box`** binds the transform coordinate space to the object's local bounding box dimension limits rather than the root coordinate viewport, forcing SVG circles to rotate on their true local centers.

### C. Active Alarm Timestamp Sorting
While array reversals (`[...alarms].reverse()`) can rearrange streams, they depend on socket packet order consistency.
* Direct array sorting using explicit UTC values (`.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())`) guarantees reverse chronological ordering (latest alert always pinned to the top of the operator list).

### D. Multi-State Indicator Signal Intersections
A glowing status badge requires intersection checks across multiple state flags.
* Evaluating `{!activeFault && !isTripped}` ensures the **`SYSTEM HEALTHY`** banner displays only when no fault modes are active and the system has not entered an interlock safety trip state.

### E. Trademark Names Generalization for Prototypes
To keep a prototype product general:
* We generalized all vendor-specific descriptors (`DISOCONT-Tersus`, `MULTIDOS-H`) to generic AIoT/Edge definitions (`AIOT-EDGE`, `BF-PROTOTYPE`) across configurations, console print banners, and UI labels.

---

## 10. Foundational Concepts: WebSockets, Socket.IO, & Digital Twins

This section reviews the architectural theory behind real-time data streaming and asset visualizers.

### A. WebSockets vs. HTTP (The Transport Highway)
* **Standard HTTP (Request/Response)**: The browser initiates a request, the server responds, and the connection closes immediately. The server cannot push data to the browser unsolicited. In a real-time system, this requires resource-intensive HTTP polling.
* **WebSockets (Persistent TCP Connection)**: A client initiates an HTTP handshake which upgrades the socket connection to a persistent, full-duplex TCP tunnel. Both client and server can push payloads back and forth at any time without connection overhead.

### B. Socket.IO vs. Raw WebSockets (The Framework Layer)
Socket.IO is not a separate protocol, but a JavaScript framework built on top of WebSockets that simplifies connection orchestration:
* **Auto-Reconnection**: Reconnects automatically in the background if the network connection breaks.
* **HTTP Long-Polling Fallback**: Automatically falls back to standard HTTP polling if firewalls block raw WebSocket packets.
* **Event-Based API**: Supports namespaces and custom event topics (e.g. `socket.emit('control:setpoint', val)`) rather than managing raw text frames.
* **Heartbeats**: Regularly pings connected clients to detect dead sockets and prevent memory leaks.

### B1. Deep-Dive: Socket.IO Internals & Lifecycles

To build production-grade real-time systems, we must understand the lower-level mechanics of Socket.IO:

#### 1. Engine.IO vs. Socket.IO Architecture
Socket.IO is divided into two distinct layers:
* **Engine.IO**: The underlying engine responsible for establishing the physical connection, validating handshakes, handling CORS, managing timeouts, and upgrading the transport protocols.
* **Socket.IO**: The user-facing API layer built on top of Engine.IO, providing features like custom events, binary packet multiplexing, client rooms, and multi-tenant namespaces.

#### 2. The Handshake & Protocol Upgrade Lifecycle
Unlike raw WebSockets which connect over TCP immediately, Socket.IO prioritizes connection success by starting with HTTP:
1. **HTTP Handshake Request**: The client requests a handshake from the server:
   `GET /socket.io/?EIO=4&transport=polling&t=Pj9g`
   The server replies with a JSON handshake payload containing the connection ID (`sid`), the ping interval (e.g., 25000ms), and the ping timeout (e.g., 20000ms).
2. **HTTP Long-Polling Session**: The connection starts immediately using HTTP POST/GET requests. This ensures the app works even behind restrictive firewalls that block standard WebSockets.
3. **WebSocket Probe Check**: In the background, the client opens a parallel WebSocket connection to test if the network supports it:
   `GET /socket.io/?EIO=4&transport=websocket&sid=<Session_ID>`
4. **Transport Upgrade**: Once the WebSocket test succeeds, the client sends a "ping" packet over WebSockets. The server replies with a "pong", and Socket.IO immediately **discards** the old HTTP long-polling connection, switching 100% of data traffic to the high-performance WebSocket connection.

#### 3. Heartbeat Mechanism (Ping/Pong)
To prevent inactive socket connections from hanging in RAM forever (wasting server resources):
* The server sends a `2` (ping) packet to the client at regular intervals (configured by `pingInterval`).
* The client must respond immediately with a `3` (pong) packet.
* If the server does not receive a pong packet within `pingTimeout` milliseconds, it closes the connection and emits a `disconnect` event, allowing the server to clean up client state variables and free memory.

#### 4. Logical Segmentation: Namespaces and Rooms
Socket.IO allows you to partition a single TCP connection into distinct channels:
* **Namespaces (`io.of("/namespace")`)**: Separate endpoints sharing the same port but isolated from each other. Useful for dividing logic (e.g. a `/feeders` namespace for operators, and `/admin` for configuration changes).
* **Rooms (`socket.join("room-name")`)**: Dynamic channels that sockets can join or leave on the server. The server can broadcast messages to a subset of users:
  ```typescript
  io.to("plant-001").emit("telemetry", data); // Sends only to clients in plant-001 room
  ```

#### 5. Cross-Origin Resource Sharing (CORS) Configuration
WebSockets bypass standard browser CORS policies once established. However, the initial HTTP handshake *is* subject to CORS. Therefore, the server must explicitly configure allowed origins during initialization:
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // React dev server URL
    methods: ["GET", "POST"]
  }
});
```
Without this, modern web browsers will block the initial handshake, preventing the connection.

### B2. Cheat Sheet: Essential Socket.IO Code Snippets

Use these quick snippets to remember standard socket syntax:

#### 1. Server Setup & Initialization (Node.js)
```javascript
import { Server } from "socket.io";

const io = new Server(httpServer, {
  cors: {
    origin: "*", // allow all origins
    methods: ["GET", "POST"]
  }
});
```

#### 2. Server Event Handling & Broadcasting
```javascript
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // A. Receive event from this specific client
  socket.on("client:data", (payload) => {
    console.log("Data received:", payload);
  });

  // B. Emit event BACK only to this specific client
  socket.emit("server:ack", { success: true });

  // C. Broadcast event to ALL clients EXCEPT the sender
  socket.broadcast.emit("alert:global", { msg: "System warning" });

  // D. Broadcast event to ALL connected clients
  io.emit("telemetry:stream", { timestamp: Date.now() });

  // E. Handle client disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});
```

#### 3. Room Management (Server-Side)
```javascript
io.on("connection", (socket) => {
  // Join a room channel
  socket.join("conveyors");

  // Leave a room channel
  socket.leave("conveyors");

  // Send message to ALL clients in "conveyors" room (including sender)
  io.to("conveyors").emit("speed:update", 1.2);

  // Send message to ALL clients in "conveyors" room EXCEPT the sender
  socket.to("conveyors").emit("operator:joined", socket.id);
});
```

#### 4. Client Setup & Event Listening (React/JS)
```javascript
import { io } from "socket.io-client";

// Initialize socket connection
const socket = io("http://localhost:3001", {
  transports: ["websocket"] // force WebSocket protocol only
});

// A. Handle successful connection
socket.on("connect", () => {
  console.log(`Connected with ID: ${socket.id}`);
});

// B. Listen to server events
socket.on("telemetry:stream", (data) => {
  console.log("Telemetry received:", data);
});

// C. Emit event to server
socket.emit("control:setpoint", { setpoint: 65 });

// D. Clean up connection on unmount
socket.disconnect();
```

### C. What is a "Digital Twin"?
A **Digital Twin** is a virtual, software-based replica of a physical machine or industrial process that is continuously updated with real-time telemetry data to reflect its exact physical status:
1. **The Physical Entity**: The physical equipment simulated by our Node.js physics backend engine.
2. **The Real-Time Data Link**: The WebSocket connection piping telemetry variables from the equipment sensors.
3. **The Virtual Entity**: The interactive SVG visualizer on the React dashboard that changes speed, load density, and warning alerts dynamically based on the socket feed.
* **Value**: Enables remote operations monitoring, safe virtual "what-if" fault simulation, and predictive maintenance schedules based on telemetry deviations (fixing issues before breakdown occurs).



import { Header } from "./components/Header";
import { ControlPanel } from "./components/ControlPanel";
import { DigitalTwin } from "./components/DigitalTwin";
import { MetricsGrid } from "./components/MetricsGrid";
import { AlarmLogs } from "./components/AlarmLogs";
import { TelemetryChart } from "./components/TelemetryChart";

function App() {

  return (
    <div className="dashboard-container">
      {/* 1. Header (Overall Status) */}
      <Header />

      {/* 2. Main Diagnostic Workspace Grid */}
      <main className="dashboard-grid">
        
        {/* Left Column: Input & Fault Console */}
        <section style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <ControlPanel />
          
          {/* Compact Diagnostic Reference */}
          <div className="card-panel" style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4", padding: "8px 10px" }}>
            <h4 style={{ color: "#fff", marginBottom: "6px", fontWeight: 600, fontSize: "11.5px", borderBottom: "1px solid var(--border-color)", paddingBottom: "3px" }}>Diagnostic Guide</h4>
            <ul style={{ listStyleType: "none", display: "flex", flexDirection: "column", gap: "3px" }}>
              <li><strong>FM-01 Zero Drift:</strong> Scale build-up tricks controller into adjusting speed.</li>
              <li><strong>FM-02 Belt Slip:</strong> Speed drops while motor current spikes.</li>
              <li><strong>FM-03 Bearing Wear:</strong> Drive end vibration spikes above ISO limit (&gt;7.1mm/s).</li>
              <li><strong>FM-04 Chute Jam:</strong> Feed chute blocks, stalling belt and causing TRIP.</li>
              <li><strong>FM-05 Mistracking:</strong> Asymmetric belt tension causes tail oscillations.</li>
            </ul>
          </div>
        </section>

        {/* Middle Column: Digital Twin & History Trends */}
        <section style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ flexGrow: 1 }}>
            <DigitalTwin />
          </div>
          <TelemetryChart />
        </section>

        {/* Right Column: Sensor Metrics & Alarm Logs */}
        <section style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <MetricsGrid />
          <div style={{ flexGrow: 1 }}>
            <AlarmLogs />
          </div>
        </section>

      </main>

      {/* 3. Footer */}
      <footer style={{ marginTop: "30px", borderTop: "1px solid var(--border-color)", paddingTop: "15px", textAlign: "center", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        AIoT Industry 4.0 Predictive Maintenance Platform. Real-Time Telemetry Loop via WebSockets.
      </footer>
    </div>
  );
}

export default App;

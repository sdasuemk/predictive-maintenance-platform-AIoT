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
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <ControlPanel />
          
          {/* Diagnostic Info Card */}
          <div className="card-panel" style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            <h4 style={{ color: "#fff", marginBottom: "8px", fontWeight: 600 }}>Diagnostic Reference Manual</h4>
            <p style={{ marginBottom: "6px" }}>
              <strong>FM-01 Zero Drift:</strong> Compensation offset tricking speed controller.
            </p>
            <p style={{ marginBottom: "6px" }}>
              <strong>FM-02 Belt Slip:</strong> Tachometer speed lag causing drive pulley overload current.
            </p>
            <p style={{ marginBottom: "6px" }}>
              <strong>FM-03 Bearing Wear:</strong> ISO-10816 vibration standard threshold breach (&gt;7.1 mm/s).
            </p>
            <p style={{ marginBottom: "6px" }}>
              <strong>FM-04 Chute Jam:</strong> Material blockage trigger belt stall and emergency Trip.
            </p>
            <p>
              <strong>FM-05 Mistracking:</strong> Asymmetric belt loading leading to tail oscillation waves.
            </p>
          </div>
        </section>

        {/* Middle Column: Digital Twin & History Trends */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ flexGrow: 1 }}>
            <DigitalTwin />
          </div>
          <TelemetryChart />
        </section>

        {/* Right Column: Sensor Metrics & Alarm Logs */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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

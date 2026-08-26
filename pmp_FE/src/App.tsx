import { Header } from "./components/Header";
import { ControlPanel } from "./components/ControlPanel";
import { DigitalTwin } from "./components/DigitalTwin";
import { MetricsGrid } from "./components/MetricsGrid";
import { ActiveAlarms, LogsConsole } from "./components/AlarmLogs";
import { TelemetryChart } from "./components/TelemetryChart";

function App() {

  return (
    <div className="dashboard-container">
      {/* 1. Header (Overall Status) */}
      <Header />

      {/* 2. Main Diagnostic Workspace Grid */}
      <main className="dashboard-grid">
        
        {/* Left Column: Input & Fault Console */}
        <section style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", minHeight: 0, overflow: "hidden" }}>
          <ControlPanel />
          <LogsConsole />
        </section>

        {/* Middle Column: Digital Twin & History Trends */}
        <section style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", minHeight: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DigitalTwin />
          </div>
          
          {/* Chart and Guide Row */}
          <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "8px", flexShrink: 0 }}>
            {/* Compact Diagnostic Reference */}
            <div className="card-panel" style={{ fontSize: "10.2px", color: "var(--text-secondary)", lineHeight: "1.3", padding: "6px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h4 style={{ color: "#fff", marginBottom: "4px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid var(--border-color)", paddingBottom: "2px" }}>Diagnostic Guide</h4>
              <ul style={{ listStyleType: "none", display: "flex", flexDirection: "column", gap: "2.5px" }}>
                <li><strong>FM-01 Zero Drift:</strong> Scale build-up weight offset.</li>
                <li><strong>FM-02 Belt Slip:</strong> Speed drops while current spikes.</li>
                <li><strong>FM-03 Bearing Wear:</strong> Drive vibration limit spike.</li>
                <li><strong>FM-04 Chute Jam:</strong> Jam stalls belt, causing TRIP.</li>
                <li><strong>FM-05 Mistracking:</strong> Asymmetric tension oscillation.</li>
              </ul>
            </div>
            <TelemetryChart />
          </div>
        </section>

        {/* Right Column: Sensor Metrics & Alarm Logs */}
        <section style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", minHeight: 0, overflow: "hidden" }}>
          <MetricsGrid />
          <ActiveAlarms />
        </section>

      </main>
      
      {/* 3. Footer */}
      <footer style={{ flexShrink: 0, borderTop: "1px solid var(--border-color)", paddingTop: "4px", textAlign: "center", fontSize: "9.5px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
        AIoT Industry 4.0 Predictive Maintenance Platform. Real-Time Telemetry Stream via WebSockets.
      </footer>
    </div>
  );
}

export default App;

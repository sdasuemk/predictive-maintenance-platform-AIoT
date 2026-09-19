import { useState } from "react";
import { Header } from "./components/Header";
import { ControlPanel } from "./components/ControlPanel";
import { DigitalTwin } from "./components/DigitalTwin";
import { MetricsGrid } from "./components/MetricsGrid";
import { ActiveAlarms, LogsConsole } from "./components/AlarmLogs";
import { TelemetryChart } from "./components/TelemetryChart";
import { PredictiveHealthCard } from "./components/PredictiveHealthCard";
import { AICopilotDrawer } from "./components/AICopilotDrawer";
import { BookOpen } from "lucide-react";

function App() {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState<string | undefined>(undefined);

  const handleOpenCopilot = (prompt?: string) => {
    setCopilotPrompt(prompt);
    setIsCopilotOpen(true);
  };

  const handleCloseCopilot = () => {
    setIsCopilotOpen(false);
    setCopilotPrompt(undefined);
  };

  return (
    <div className="dashboard-container">
      {/* 1. Header (Overall Status & AI Copilot Summon) */}
      <Header onOpenCopilot={() => handleOpenCopilot()} />

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
          
          {/* Lower Middle Row: Feed Rate Trend & SOP Diagnostic Guide (50/50 Split) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", flexShrink: 0, height: "140px" }}>
            <div style={{ minWidth: 0, height: "100%" }}>
              <TelemetryChart />
            </div>
            <div style={{ minWidth: 0, height: "100%" }}>
              {/* Diagnostic Reference & SOP Guide */}
              <div className="card-panel" style={{ fontSize: "9.5px", color: "var(--text-secondary)", lineHeight: "1.3", padding: "5px 8px", height: "100%", minHeight: 0, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                <h4 style={{ color: "#fff", marginBottom: "3px", fontWeight: 600, fontSize: "10.5px", borderBottom: "1px solid var(--border-color)", paddingBottom: "2px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <BookOpen size={12} color="var(--color-accent)" /> Diagnostic Fault Guide & SOP
                  </span>
                  <span style={{ fontSize: "8.5px", color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontWeight: 400 }}>
                    OEM SOP-42
                  </span>
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, gap: "2px", margin: "1px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1px 5px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "3px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", fontWeight: 700, color: "#38bdf8", background: "rgba(14, 165, 233, 0.12)", padding: "1px 4px", borderRadius: "2px" }}>FM-01</span>
                      <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "9px" }}>Zero Drift:</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "8.5px" }}>Scale build-up tare offset</span>
                    </span>
                    <span style={{ fontSize: "8px", color: "var(--color-warn)", fontFamily: "var(--font-mono)" }}>Tare Rec</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1px 5px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "3px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", fontWeight: 700, color: "#fbbf24", background: "rgba(251, 191, 36, 0.12)", padding: "1px 4px", borderRadius: "2px" }}>FM-02</span>
                      <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "9px" }}>Belt Slip:</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "8.5px" }}>Speed drops, current spikes</span>
                    </span>
                    <span style={{ fontSize: "8px", color: "#fbbf24", fontFamily: "var(--font-mono)" }}>Tension Adj</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1px 5px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "3px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", fontWeight: 700, color: "#f87171", background: "rgba(248, 113, 113, 0.12)", padding: "1px 4px", borderRadius: "2px" }}>FM-03</span>
                      <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "9px" }}>Bearing Wear:</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "8.5px" }}>Drive vib &gt;7.1 mm/s RMS</span>
                    </span>
                    <span style={{ fontSize: "8px", color: "#f87171", fontFamily: "var(--font-mono)" }}>SKF Lube</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1px 5px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "3px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", fontWeight: 700, color: "#ef4444", background: "rgba(239, 68, 68, 0.15)", padding: "1px 4px", borderRadius: "2px" }}>FM-04</span>
                      <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "9px" }}>Chute Jam:</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "8.5px" }}>Material stall & TRIP event</span>
                    </span>
                    <span style={{ fontSize: "8px", color: "#ef4444", fontFamily: "var(--font-mono)" }}>Clear Inlet</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1px 5px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "3px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", fontWeight: 700, color: "#a855f7", background: "rgba(168, 85, 247, 0.12)", padding: "1px 4px", borderRadius: "2px" }}>FM-05</span>
                      <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "9px" }}>Mistracking:</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "8.5px" }}>Asymmetric tension skew</span>
                    </span>
                    <span style={{ fontSize: "8px", color: "#a855f7", fontFamily: "var(--font-mono)" }}>Align Idlers</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "2px", fontSize: "8px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  <span>ISO 10816-3 & SKF Standards</span>
                  <span style={{ color: "var(--color-ok)" }}>● Indexed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: AI Prognostics, Sensor Metrics & Active Alarms */}
        <section style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", minHeight: 0, overflow: "hidden" }}>
          {/* ML Predictive Health & RUL Card */}
          <PredictiveHealthCard onOpenCopilot={handleOpenCopilot} />
          <MetricsGrid />
          
          {/* Active Alarms Console (Flex: 1 to fill right column) */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <ActiveAlarms />
          </div>
        </section>

      </main>
      
      {/* 3. Footer */}
      <footer style={{ flexShrink: 0, borderTop: "1px solid var(--border-color)", paddingTop: "2px", textAlign: "center", fontSize: "9.5px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "0px" }}>
        AIoT Industry 4.0 Predictive Maintenance Platform. Real-Time Telemetry Stream via WebSockets • LangChain Agentic Copilot & RAG.
      </footer>

      {/* 4. Slide-over Agentic AI Copilot & RAG Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={handleCloseCopilot}
        initialPrompt={copilotPrompt}
      />
    </div>
  );
}

export default App;

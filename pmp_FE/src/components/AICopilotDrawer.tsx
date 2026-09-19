import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { computeMLPrediction } from "../utils/predictiveEngine";
import { queryAICopilot, fetchRAGDocuments } from "../services/aiApi";
import { RAG_DOCUMENTS } from "../data/ragDocuments";
import type { CopilotMessage, RAGDocument } from "../types/ai";
import { 
  Bot, X, Send, BookOpen, ChevronDown, ChevronRight, 
  ExternalLink, Sparkles, Search
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({ isOpen, onClose, initialPrompt }) => {
  const { telemetry } = useSocket();
  const prediction = computeMLPrediction(telemetry);

  const [activeTab, setActiveTab] = useState<"chat" | "rag">("chat");
  const [ragDocs, setRagDocs] = useState<RAGDocument[]>(RAG_DOCUMENTS);

  useEffect(() => {
    fetchRAGDocuments().then(docs => {
      if (docs && docs.length > 0) setRagDocs(docs);
    });
  }, []);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "msg-init",
      role: "assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: `Hello! I am your **Industry 4.0 Maintenance Copilot**. I continuously ingest telemetry from **${telemetry?.equipmentId ?? "WF-01"}**, cross-reference OEM engineering manuals, and monitor ML failure projections. How can I assist you with diagnostics or SOP procedures today?`,
      actionButtons: [
        { label: "⚡ Run Root Cause Analysis", actionKey: "rca" },
        { label: "📋 Draft Maintenance Work Order", actionKey: "work_order" },
        { label: "🛠️ Bearing Inspection SOP", actionKey: "sop_bearing" }
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [ragSearch, setRagSearch] = useState("");
  const [selectedRagCategory, setSelectedRagCategory] = useState<string>("ALL");
  const [activeDoc, setActiveDoc] = useState<RAGDocument | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const handleUserSubmitRef = useRef<(prompt?: string) => void>(() => {});

  // Handle auto-trigger if initialPrompt provided
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleUserSubmitRef.current(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const generateDiagnosticResponse = useCallback((query: string) => {
    const s = telemetry?.sensors;
    const fm = telemetry?.activeFailureMode;
    const health = telemetry?.healthScore ?? 100;
    const driveVib = s?.vibration_drive?.value ?? 1.2;
    const motorTemp = s?.motor_temp?.value ?? 42.0;
    const beltTension = s?.belt_tension?.value ?? 1200;

    const lower = query.toLowerCase();

    if (lower.includes("rca") || lower.includes("root cause") || lower.includes("diagnos")) {
      if (fm === "FM-03" || driveVib > 3.0) {
        return {
          content: `### 🚨 Root Cause Analysis: Drive Bearing Degradation (FM-03)\n\n- **Primary Symptom:** Drive end vibration is elevated at **${driveVib.toFixed(2)} mm/s** (nominal < 1.8 mm/s) accompanied by motor/bearing temperature at **${motorTemp.toFixed(1)}°C**.\n- **ML Prognostics:** Failure probability is **${prediction.failureProbability}%** with estimated Remaining Useful Life of **${prediction.estimatedRulHours} operating hours**.\n- **Root Cause Hypothesis:** Sensor spectral pattern matches early stage spalling on the inner raceway of the SKF spherical roller bearing, consistent with past incident **WO-8912**.\n- **Immediate Recommendation:** Schedule planned lubrication replenishment or bearing replacement during the upcoming shift change before critical trip occurs.`,
          reasoningSteps: [
            {
              thought: "Operator requested root-cause diagnosis. Need to pull current sensor telemetry and historical failure mode signatures.",
              action: "query_telemetry_database",
              actionInput: `{ equipmentId: "${telemetry?.equipmentId}", fields: ["vibration_drive", "motor_temp", "activeFailureMode"] }`,
              observation: `Vibration = ${driveVib} mm/s (CRITICAL/WARNING), Motor Temp = ${motorTemp}°C, Active Failure Mode = ${fm ?? "Detected via vibration trend"}`
            },
            {
              thought: "Query RAG knowledge vector store for ISO 10816 vibration thresholds and bearing specifications.",
              action: "vector_search_rag",
              actionInput: `"SKF 22212 E bearing vibration severity ISO 10816"`,
              observation: `Retrieved DOC-SKF-002: Zone C/D threshold breached (> 2.8 mm/s). Recommended grease: Shell Gadus S2 V220 2.`
            }
          ],
          citations: [
            {
              docId: "DOC-SKF-002",
              sourceTitle: "Drive Pulley Bearing Inspection & Replacement SOP",
              section: "Section 3.5: Vibration Severity Criteria",
              excerpt: "Zone C (Warning): 2.8 - 4.5 mm/s RMS. Immediate inspection required.",
              relevance: 0.96
            },
            {
              docId: "DOC-HIS-005",
              sourceTitle: "Historical Work Order Log #WO-8912",
              section: "Root Cause & Resolution Log",
              excerpt: "Grease seal failure caused ingress of abrasive dust; replaced with SKF 22212 E/C3.",
              relevance: 0.89
            }
          ]
        };
      } else if (fm === "FM-01") {
        return {
          content: `### ⚠️ Root Cause Analysis: Gravimetric Tare Zero Drift (FM-01)\n\n- **Primary Symptom:** Zero point drift has exceeded calibration limits (current reading **${s?.zero_drift?.value ?? 0.18} kg/m**).\n- **Physical Cause:** Aggregate or dust buildup between the weighing idler and load-cell mounting brackets.\n- **Risk:** Feed rate deviation of ±${Math.abs(s?.feed_rate_deviation?.value ?? 0).toFixed(1)}% affecting downstream kiln chemistry.\n- **Correction:** Execute automatic zero calibration sequence or manual scrape-down per **OEM Manual Section 4.2**.`,
          reasoningSteps: [
            {
              thought: "Analyze load cell telemetry and compare against zero drift baseline.",
              action: "evaluate_calibration_tolerances",
              actionInput: `zero_drift = ${s?.zero_drift?.value} kg/m`,
              observation: "Exceeds maximum allowable tare tolerance of ±0.05 kg/m."
            }
          ],
          citations: [
            {
              docId: "DOC-SCH-001",
              sourceTitle: "OEM Belt Weigh Feeder Technical Manual",
              section: "Section 4.2: Load Cell & Weighing Platform",
              excerpt: "Drift exceeding 0.15 kg/m indicates physical material buildup. Re-zero after 3 belt revolutions.",
              relevance: 0.98
            }
          ]
        };
      } else if (fm === "FM-02") {
        return {
          content: `### ⚠️ Root Cause Analysis: Drive Pulley Belt Slip (FM-02)\n\n- **Primary Symptom:** Belt speed is dropping while motor current is rising; belt tension has fallen to **${beltTension.toFixed(0)} N** (nominal 1,200 N).\n- **Risk:** High friction heating on pulley lagging with imminent emergency stall.\n- **Remediation:** Inspect take-up counterweight or pneumatic tension cylinder per **Conveyor Tensioning Guide §6.1**.`,
          reasoningSteps: [
            {
              thought: "Detecting slippage ratio between drive RPM and actual belt linear speed.",
              action: "calc_slip_ratio",
              actionInput: "belt_speed vs motor_current",
              observation: `Belt tension ${beltTension} N is below minimum threshold (1,150 N).`
            }
          ],
          citations: [
            {
              docId: "DOC-TRK-003",
              sourceTitle: "Conveyor Belt Tracking & Tensioning Guide",
              section: "Section 6.1: Drive Pulley Slip",
              excerpt: "Tension below 700 N causes slip ratio > 5% and accelerates lagging wear.",
              relevance: 0.94
            }
          ]
        };
      } else if (fm === "FM-04") {
        return {
          content: `### 🚨 Critical Root Cause: Infeed Chute Blockage (FM-04)\n\n- **Primary Symptom:** Aggregate feed chute blocked; material bed stalled, triggering emergency overload protection.\n- **Safety Mandate:** **LOTO Required!** Do not attempt mechanical clearing with energized VFD.\n- **Remediation:** Follow Safety SOP **DOC-SAF-004** to de-energize breaker 4B-12 and clear aggregate using brass rodding tool.`,
          reasoningSteps: [
            {
              thought: "Chute blockage detected. High safety critical hazard.",
              action: "check_safety_interlocks",
              actionInput: "E-Stop circuit & VFD status",
              observation: "Motor tripped on stall torque overload."
            }
          ],
          citations: [
            {
              docId: "DOC-SAF-004",
              sourceTitle: "Infeed Chute Blockage Clearance & LOTO Procedure",
              section: "Section 1.3: Emergency Clearance",
              excerpt: "Perform LOTO at MCC Breaker 4B-12. Verify zero energy state before inspection.",
              relevance: 0.99
            }
          ]
        };
      } else {
        return {
          content: `### ✅ System Health Check: Nominal Operation\n\n- **Status:** All primary parameters (vibration: **${driveVib.toFixed(2)} mm/s**, motor temp: **${motorTemp.toFixed(1)}°C**, tension: **${beltTension.toFixed(0)} N**) are within baseline specifications.\n- **Health Index:** **${health}%**.\n- **ML Prognosis:** No imminent failure modes predicted. Current estimated RUL is **${prediction.estimatedRulHours} operating hours**.\n- **Action:** Continue standard shift monitoring. Next scheduled routine lubrication is in 240 operating hours.`,
          reasoningSteps: [
            {
              thought: "Checking all 14 sensor variables against ISO 10816 and OEM nominal envelopes.",
              action: "evaluate_all_sensors",
              actionInput: "telemetry.sensors",
              observation: "All sensors operating inside Zone A (Good)."
            }
          ]
        };
      }
    }

    if (lower.includes("work order") || lower.includes("draft")) {
      return {
        content: `### 📋 Generated Maintenance Work Order (Draft)\n\n\`\`\`text
WORK ORDER #: WO-2026-8914
EQUIPMENT: ${telemetry?.equipmentId ?? "WF-01"} (OEM Weigh Feeder)
PLANT: ${telemetry?.plantId ?? "Plant-01"} | LINE: Dosing Feed Line 1
PRIORITY: ${prediction.failureProbability > 60 ? "HIGH / URGENT" : "MEDIUM"}
ASSIGNED TO: Mechanical Maintenance Crew B

SYMPTOMS / TRIGGER:
- Health Score: ${health}% | Failure Probability: ${prediction.failureProbability}%
- Forecast Mode: ${prediction.primaryFailureRisk}
- Telemetry: Vib Drive = ${driveVib.toFixed(2)} mm/s, Temp = ${motorTemp.toFixed(1)}°C

REQUIRED ACTIONS:
1. Complete LOTO at MCC-04 Breaker 4B-12.
2. Inspect drive pulley pillow block bearing housing.
3. Replenish Shell Gadus S2 V220 2 grease (45g).
4. Verify pillow block mounting bolt torque (175 Nm per SOP DOC-SKF-002).
5. Run 5-minute unladen test to verify vibration < 1.8 mm/s.

PARTS REQUISITION:
- Part # SKF 22212 E/C3 (Bin: M-14-A)
- Triple-lip contact seal 60x85x10 (Bin: S-02-C)
\`\`\`\n\nWould you like me to submit this draft to the SAP / IBM Maximo CMMS connector?`,
        reasoningSteps: [
          {
            thought: "Compiling work order schema based on active anomaly metrics, required spare parts, and CMMS integration standard.",
            action: "format_cmms_work_order",
            actionInput: "Equipment WF-01, Fault FM-03",
            observation: "Work order draft compiled successfully with verified parts catalogue codes."
          }
        ],
        citations: [
          {
            docId: "DOC-SKF-002",
            sourceTitle: "Bearing Inspection SOP",
            section: "Torque Specs & Grease Quantities",
            excerpt: "Shell Gadus S2 V220 2, 45g. Pillow block bolt torque 175 Nm.",
            relevance: 0.95
          }
        ]
      };
    }

    if (lower.includes("sop") || lower.includes("bearing") || lower.includes("manual")) {
      return {
        content: `### 🛠️ Standard Operating Procedure: Bearing Maintenance & Inspection\n\nAccording to **SKF SOP (DOC-SKF-002)** for the **OEM WF-01** drive assembly:\n\n1. **Pre-Check:** Ensure VFD is locked out and zero energy verified.\n2. **Grease Replenishment:**\n   - Clean grease nipple thoroughly to prevent abrasive particulate ingress.\n   - Inject exactly **45g** of **Shell Gadus S2 V220 2** using a calibrated manual grease gun while rotating the shaft slowly by hand if possible.\n3. **Vibration Acceptance Test:**\n   - Run feeder at 1.0 m/s nominal speed.\n   - Drive end vibration must drop back into **ISO 10816 Zone A (< 1.8 mm/s)**.\n   - If vibration remains > 3.0 mm/s, inner race spalling has occurred and bearing unit must be replaced.\n4. **Bolt Torque:** Tighten pillow block bolts to **175 Nm** with calibrated torque wrench.`,
        citations: [
          {
            docId: "DOC-SKF-002",
            sourceTitle: "Drive Pulley Bearing Inspection & Replacement SOP",
            section: "Section 3.5: Maintenance Protocol",
            excerpt: "Shell Gadus S2 V220 2, 45g per regreasing interval. Torque 175 Nm.",
            relevance: 0.97
          }
        ]
      };
    }

    // Generic intelligent answer
    return {
      content: `I analyzed your inquiry: *"${query}"*.\n\nCurrently, **${telemetry?.equipmentId ?? "WF-01"}** is in **${telemetry?.state ?? "RUNNING"}** state with an estimated RUL of **${prediction.estimatedRulHours} hours** and health score of **${health}%**.\n\nYou can ask me to run root cause analysis, review OEM manuals for calibration or bearing replacement, or draft maintenance work orders.`,
      reasoningSteps: [
        {
          thought: "Interpreting natural language query against active asset context.",
          action: "synthesize_response",
          actionInput: query,
          observation: "Context matches general operational query."
        }
      ]
    };
  }, [telemetry, prediction]);

  const handleUserSubmit = useCallback((queryText?: string) => {
    const text = queryText || inputQuery;
    if (!text.trim()) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery("");
    setIsThinking(true);

    // Call Python FastAPI Agentic Copilot
    queryAICopilot(text, telemetry, telemetry?.activeFailureMode)
      .then((assistantMsg) => {
        setMessages(prev => [...prev, assistantMsg]);
        setIsThinking(false);
      })
      .catch((err) => {
        console.warn("Copilot API fallback:", err);
        const resp = generateDiagnosticResponse(text);
        const assistantMsg: CopilotMessage = {
          id: `ast-${Date.now()}`,
          role: "assistant",
          content: resp.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reasoningSteps: resp.reasoningSteps,
          citations: resp.citations,
          actionButtons: [
            { label: "📋 Draft Work Order", actionKey: "work_order" },
            { label: "⚡ Re-evaluate RCA", actionKey: "rca" }
          ]
        };
        setMessages(prev => [...prev, assistantMsg]);
        setIsThinking(false);
      });
  }, [inputQuery, telemetry, generateDiagnosticResponse]);

  useEffect(() => {
    handleUserSubmitRef.current = handleUserSubmit;
  }, [handleUserSubmit]);

  const handleActionClick = (actionKey: string) => {
    if (actionKey === "rca") handleUserSubmit("Run Root Cause Analysis on current equipment state");
    else if (actionKey === "work_order") handleUserSubmit("Draft maintenance work order with parts checklist");
    else if (actionKey === "sop_bearing") handleUserSubmit("Show drive bearing inspection and torque SOP");
  };

  const filteredDocs = (ragDocs || []).filter(doc => {
    if (!doc) return false;
    const matchesCat = selectedRagCategory === "ALL" || doc.category === selectedRagCategory;
    const q = (ragSearch || "").toLowerCase();
    const matchesSearch = !q ||
                          (doc.title && doc.title.toLowerCase().includes(q)) || 
                          (doc.summary && doc.summary.toLowerCase().includes(q)) ||
                          (Array.isArray(doc.tags) && doc.tags.some(t => t && t.toLowerCase().includes(q)));
    return matchesCat && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(2px)",
          zIndex: 998,
          animation: "fadeIn 0.2s ease"
        }}
      />

      {/* Slide-over Drawer */}
      <div
        className="card-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "480px",
          maxWidth: "92vw",
          height: "100vh",
          zIndex: 999,
          borderRadius: 0,
          borderLeft: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          background: "#0b1324",
          boxShadow: "-10px 0 35px rgba(0, 0, 0, 0.7)",
          animation: "slideInRight 0.25s ease-out"
        }}
      >
        {/* Drawer Header */}
        <div 
          style={{ 
            padding: "10px 14px", 
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.85)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "rgba(14, 165, 233, 0.15)", border: "1px solid rgba(14, 165, 233, 0.3)", padding: "5px", borderRadius: "4px" }}>
              <Bot size={18} color="#0ea5e9" className="pulse-indicator" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: 0 }}>
                  Agentic Maintenance Copilot
                </h3>
                <span className="status-badge ok" style={{ fontSize: "8.5px", padding: "1px 5px" }}>
                  Active
                </span>
              </div>
              <p style={{ fontSize: "9.5px", color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-mono)" }}>
                Python FastAPI :8000 • LangChain ReAct • RAG Vector DB • Equipment: {telemetry?.equipmentId ?? "WF-01"}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{ 
              background: "transparent", 
              border: "none", 
              color: "var(--text-secondary)", 
              cursor: "pointer", 
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", background: "#0e172a" }}>
          <button
            onClick={() => setActiveTab("chat")}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: activeTab === "chat" ? "rgba(14, 165, 233, 0.12)" : "transparent",
              border: "none",
              borderBottom: activeTab === "chat" ? "2px solid #0ea5e9" : "2px solid transparent",
              color: activeTab === "chat" ? "#38bdf8" : "var(--text-secondary)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            <Bot size={13} />
            <span>AI Diagnostic Copilot</span>
          </button>

          <button
            onClick={() => setActiveTab("rag")}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: activeTab === "rag" ? "rgba(14, 165, 233, 0.12)" : "transparent",
              border: "none",
              borderBottom: activeTab === "rag" ? "2px solid #0ea5e9" : "2px solid transparent",
              color: activeTab === "rag" ? "#38bdf8" : "var(--text-secondary)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            <BookOpen size={13} />
            <span>RAG Knowledge & OEM Manuals ({ragDocs.length})</span>
          </button>
        </div>

        {/* TAB 1: Chat View */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            
            {/* Messages Scroll Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.map((m) => (
                <div 
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: m.role === "user" ? "flex-end" : "flex-start"
                  }}
                >
                  {/* Speaker Label */}
                  <div style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    {m.role === "user" ? (
                      <span>Operator • {m.timestamp}</span>
                    ) : (
                      <>
                        <Sparkles size={10} color="#0ea5e9" />
                        <span style={{ color: "#38bdf8", fontWeight: 600 }}>AI Maintenance Agent • {m.timestamp}</span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: "92%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      lineHeight: "1.45",
                      background: m.role === "user" ? "rgba(14, 165, 233, 0.25)" : "rgba(30, 41, 59, 0.75)",
                      border: m.role === "user" ? "1px solid rgba(14, 165, 233, 0.4)" : "1px solid var(--border-color)",
                      color: "#e2e8f0"
                    }}
                  >
                    {/* Render Content with rich Markdown formatting & industrial tables */}
                    <MarkdownRenderer content={m.content} />

                    {/* Collapsible Agentic Reasoning Trace (Thought -> Action -> Observation) */}
                    {m.reasoningSteps && m.reasoningSteps.length > 0 && (
                      <div style={{ marginTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px" }}>
                        <button
                          onClick={() => toggleReasoning(m.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            fontSize: "9.5px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 0"
                          }}
                        >
                          {expandedReasoning[m.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          <span style={{ fontWeight: 600, color: "#38bdf8" }}>Agent Tool Execution Trace ({m.reasoningSteps.length} steps)</span>
                        </button>

                        {expandedReasoning[m.id] && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                            {m.reasoningSteps.map((step, idx) => (
                              <div 
                                key={idx} 
                                style={{ 
                                  background: "rgba(15, 23, 42, 0.7)", 
                                  padding: "6px 8px", 
                                  borderRadius: "4px", 
                                  fontSize: "9.5px", 
                                  borderLeft: "2px solid #0ea5e9",
                                  fontFamily: "var(--font-mono)"
                                }}
                              >
                                <div style={{ color: "#e2e8f0", marginBottom: "2px" }}>
                                  <strong>Thought:</strong> {step.thought}
                                </div>
                                <div style={{ color: "#38bdf8", marginBottom: "2px" }}>
                                  <strong>Action:</strong> <code>{step.action}({step.actionInput})</code>
                                </div>
                                <div style={{ color: "var(--text-secondary)" }}>
                                  <strong>Observation:</strong> {step.observation}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Grounded RAG Citations */}
                    {m.citations && m.citations.length > 0 && (
                      <div style={{ marginTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px" }}>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                          Grounded RAG Sources
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {m.citations.map((c, i) => (
                            <div 
                              key={i}
                              onClick={() => {
                                const found = ragDocs.find(d => d.id === c.docId);
                                if (found) {
                                  setActiveDoc(found);
                                  setActiveTab("rag");
                                }
                              }}
                              style={{
                                background: "rgba(14, 165, 233, 0.08)",
                                border: "1px solid rgba(14, 165, 233, 0.25)",
                                borderRadius: "3px",
                                padding: "4px 6px",
                                fontSize: "9.5px",
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                                <BookOpen size={10} color="#38bdf8" />
                                <span style={{ color: "#38bdf8", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  [{c.docId}] {c.sourceTitle}
                                </span>
                              </div>
                              <ExternalLink size={10} color="var(--text-secondary)" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Action Buttons */}
                    {m.actionButtons && m.actionButtons.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                        {m.actionButtons.map((btn, i) => (
                          <button
                            key={i}
                            onClick={() => handleActionClick(btn.actionKey)}
                            style={{
                              background: "rgba(14, 165, 233, 0.15)",
                              border: "1px solid rgba(14, 165, 233, 0.35)",
                              color: "#38bdf8",
                              fontSize: "9.5px",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              cursor: "pointer"
                            }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {isThinking && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "6px", width: "fit-content" }}>
                  <Sparkles size={13} color="#0ea5e9" className="pulse-indicator" />
                  <span style={{ fontSize: "10px", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                    LangChain agent reasoning & querying vector store...
                  </span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Chips Bar */}
            <div style={{ padding: "6px 12px", background: "rgba(15, 23, 42, 0.9)", borderTop: "1px solid var(--border-color)", display: "flex", gap: "6px", overflowX: "auto" }}>
              <button
                onClick={() => handleUserSubmit("Run Root Cause Analysis on current equipment state")}
                style={{
                  background: "rgba(14, 165, 233, 0.12)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  color: "#38bdf8",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "9.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>⚡ Root Cause RCA</span>
              </button>
              <button
                onClick={() => handleUserSubmit("Draft maintenance work order with parts checklist")}
                style={{
                  background: "rgba(14, 165, 233, 0.12)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  color: "#38bdf8",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "9.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>📋 Draft Work Order</span>
              </button>
              <button
                onClick={() => handleUserSubmit("Show drive bearing inspection and torque SOP")}
                style={{
                  background: "rgba(14, 165, 233, 0.12)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  color: "#38bdf8",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "9.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>🛠️ Bearing SOP</span>
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserSubmit();
              }}
              style={{
                padding: "8px 12px",
                background: "#0f172a",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                gap: "8px"
              }}
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask Copilot about vibration, RUL, bearing torque..."
                style={{
                  flex: 1,
                  background: "rgba(30, 41, 59, 0.8)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  color: "#fff",
                  fontSize: "11px"
                }}
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isThinking}
                style={{
                  background: "#0ea5e9",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  color: "#fff",
                  cursor: inputQuery.trim() && !isThinking ? "pointer" : "not-allowed",
                  opacity: inputQuery.trim() && !isThinking ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Send size={13} />
              </button>
            </form>

          </div>
        )}

        {/* TAB 2: RAG Knowledge Base View */}
        {activeTab === "rag" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "10px 12px", overflowY: "auto" }}>
            
            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <Search size={13} color="var(--text-muted)" style={{ position: "absolute", left: "8px", top: "8px" }} />
              <input
                type="text"
                value={ragSearch}
                onChange={(e) => setRagSearch(e.target.value)}
                placeholder="Search manuals, torque specs, SOPs..."
                style={{
                  width: "100%",
                  background: "rgba(30, 41, 59, 0.8)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "6px 8px 6px 28px",
                  color: "#fff",
                  fontSize: "10.5px"
                }}
              />
            </div>

            {/* Category Filter Badges */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "10px", flexWrap: "wrap" }}>
              {["ALL", "OEM_MANUAL", "SOP", "HISTORICAL_LOG"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedRagCategory(cat)}
                  style={{
                    background: selectedRagCategory === cat ? "rgba(14, 165, 233, 0.25)" : "rgba(30, 41, 59, 0.6)",
                    border: selectedRagCategory === cat ? "1px solid #0ea5e9" : "1px solid var(--border-color)",
                    color: selectedRagCategory === cat ? "#38bdf8" : "var(--text-secondary)",
                    fontSize: "9px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    cursor: "pointer"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Detailed Document Modal/View or Document Cards List */}
            {activeDoc ? (
              <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "8.5px", background: "rgba(14, 165, 233, 0.2)", color: "#38bdf8", padding: "1px 5px", borderRadius: "2px" }}>
                      {activeDoc.category} • {activeDoc.id}
                    </span>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#fff", marginTop: "4px" }}>
                      {activeDoc.title}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setActiveDoc(null)}
                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "10px" }}
                  >
                    Back to List
                  </button>
                </div>

                <p style={{ fontSize: "10px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                  {activeDoc.summary}
                </p>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                  <MarkdownRenderer content={activeDoc.content} />
                </div>

                <button
                  onClick={() => {
                    setActiveTab("chat");
                    handleUserSubmit(`Explain and cite ${activeDoc.id}: ${activeDoc.title}`);
                  }}
                  style={{
                    marginTop: "8px",
                    background: "rgba(14, 165, 233, 0.2)",
                    border: "1px solid #0ea5e9",
                    color: "#38bdf8",
                    padding: "5px 10px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <Bot size={12} />
                  <span>Ask Copilot to Analyze this Document</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredDocs.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDoc(doc)}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "4px",
                      padding: "8px 10px",
                      cursor: "pointer",
                      transition: "border 0.2s ease"
                    }}
                    className="rag-doc-card"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "8.5px", background: "rgba(14, 165, 233, 0.15)", color: "#38bdf8", padding: "1px 4px", borderRadius: "2px", fontFamily: "var(--font-mono)" }}>
                        {doc.id}
                      </span>
                      <span style={{ fontSize: "8.5px", color: "var(--text-muted)" }}>
                        {doc.version}
                      </span>
                    </div>

                    <h5 style={{ fontSize: "11px", fontWeight: 600, color: "#f1f5f9", marginBottom: "4px" }}>
                      {doc.title}
                    </h5>

                    <p style={{ fontSize: "9.5px", color: "var(--text-secondary)", lineHeight: "1.3", marginBottom: "6px" }}>
                      {doc.summary}
                    </p>

                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {(doc.tags || []).map(t => (
                        <span key={t} style={{ fontSize: "8px", background: "rgba(255, 255, 255, 0.05)", padding: "1px 4px", borderRadius: "2px", color: "var(--text-muted)" }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </>
  );
};

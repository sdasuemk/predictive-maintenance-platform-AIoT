import json
import uuid
from typing import Dict, Any, List, Literal
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from copilot.state import MaintenanceAgentState, DiagnosticFinding, WorkOrderDraft
from copilot.tools import COPILOT_TOOLS
from copilot.llm_factory import get_chat_model
from rag.knowledge_store import RAGKnowledgeStore

# ---------------------------------------------------------------------------
# 1. NODE: Telemetry Validator & ISO 10816 Zone Assessor
# ---------------------------------------------------------------------------
def telemetry_validator_node(state: MaintenanceAgentState) -> Dict[str, Any]:
    sensors = state.get("sensor_telemetry", {}) or {}
    health = state.get("health_score", 100.0)

    def get_val(k: str, default: float) -> float:
        s = sensors.get(k)
        if isinstance(s, dict):
            return float(s.get("value", default))
        return default

    drive_vib = get_val("vibration_drive", 1.0)
    motor_temp = get_val("motor_temp", 42.0)
    belt_tension = get_val("belt_tension", 1100.0)
    zero_drift = get_val("zero_drift", 0.0)

    # Assess ISO 10816-3 Zone
    if drive_vib < 1.8:
        iso_zone = "Zone A (Good - Newly Commissioned Baseline)"
        breached = False
    elif drive_vib < 2.8:
        iso_zone = "Zone B (Acceptable - Long-Term Operation)"
        breached = False
    elif drive_vib < 4.5:
        iso_zone = "Zone C (Warning / Early Degradation - Schedule Maintenance)"
        breached = True
    else:
        iso_zone = "Zone D (Critical Hazard - Immediate Shutdown Risk)"
        breached = True

    finding: DiagnosticFinding = {
        "iso_zone": iso_zone,
        "iso_breached": breached,
        "affected_components": []
    }

    if breached or drive_vib > 2.8:
        finding["affected_components"].append("Drive Pulley Spherical Roller Bearing (SKF 22212)")
    if abs(zero_drift) > 0.08:
        finding["affected_components"].append("Weigh Platform Load Cells & Apron Skirt")
    if belt_tension < 900.0:
        finding["affected_components"].append("Pneumatic Belt Take-Up Cylinder")

    trace = {
        "thought": "Ingesting and cross-validating real-time telemetry against ISO 10816-3 vibration standards.",
        "action": "validate_sensor_envelopes",
        "actionInput": f"vibration={drive_vib:.2f} mm/s, motor_temp={motor_temp:.1f}°C, health={health}%",
        "observation": f"ISO 10816 Status: {iso_zone}. Identified {len(finding['affected_components'])} potential stress vectors."
    }

    traces = list(state.get("reasoning_traces", []))
    traces.append(trace)

    return {
        "diagnosis": finding,
        "reasoning_traces": traces
    }

# ---------------------------------------------------------------------------
# 2. NODE: Grounded RAG Knowledge Retrieval
# ---------------------------------------------------------------------------
def rag_retriever_node(state: MaintenanceAgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    query = messages[-1].content if messages else ""
    fm = state.get("active_failure_mode")

    search_query = str(query)
    if fm:
        search_query += f" {fm}"

    rag_results = RAGKnowledgeStore.search(search_query, limit=3)
    citations = []
    for r in rag_results:
        citations.append({
            "docId": r.docId,
            "sourceTitle": r.sourceTitle,
            "section": r.section,
            "excerpt": r.excerpt,
            "relevance": r.relevance
        })

    trace = {
        "thought": "Querying local RAG knowledge store for OEM technical specifications and SOPs.",
        "action": "vector_search_rag",
        "actionInput": search_query[:60],
        "observation": f"Retrieved {len(citations)} engineering documents with maximum relevance score {citations[0]['relevance'] if citations else 0.0}."
    }

    traces = list(state.get("reasoning_traces", []))
    traces.append(trace)

    return {
        "retrieved_documents": citations,
        "reasoning_traces": traces
    }

# ---------------------------------------------------------------------------
# 3. NODE: LLM Reasoning & ReAct Execution
# ---------------------------------------------------------------------------
def llm_reasoner_node(state: MaintenanceAgentState) -> Dict[str, Any]:
    llm = get_chat_model()
    model_with_tools = llm.bind_tools(COPILOT_TOOLS)

    messages = list(state.get("messages", []))
    
    # Prepend System Prompt with grounded engineering context
    diag = state.get("diagnosis", {})
    docs = state.get("retrieved_documents", [])
    context_str = f"Equipment: {state.get('equipment_id', 'WF-P1-001')} | Health: {state.get('health_score', 100)}%\n"
    if diag:
        context_str += f"ISO Assessment: {diag.get('iso_zone')}\n"
    if docs:
        context_str += "OEM Document Excerpts:\n" + "\n".join(f"- [{d['sourceTitle']}] {d['excerpt']}" for d in docs[:2])

    system_prompt = SystemMessage(
        content=(
            "You are the Agentic AI Maintenance Copilot for heavy industrial weigh feeders, cranes, and conveyors.\n"
            "Use the provided tools to verify telemetry, calculate RUL, check OEM manuals, and look up spare parts.\n"
            f"Current Context:\n{context_str}\n"
            "Always formulate grounded, actionable engineering advice conforming to ISO 10816-3 standards."
        )
    )

    full_history = [system_prompt] + messages
    response = model_with_tools.invoke(full_history)

    traces = list(state.get("reasoning_traces", []))
    if hasattr(response, "tool_calls") and response.tool_calls:
        for tc in response.tool_calls:
            traces.append({
                "thought": f"Agent selected tool '{tc['name']}' based on inquiry requirements.",
                "action": tc["name"],
                "actionInput": json.dumps(tc.get("args", {})),
                "observation": "Tool scheduled for invocation."
            })

    return {
        "messages": [response],
        "reasoning_traces": traces
    }

# ---------------------------------------------------------------------------
# 4. NODE: Tools Execution
# ---------------------------------------------------------------------------
def tool_execution_node(state: MaintenanceAgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else None
    
    tool_map = {t.name: t for t in COPILOT_TOOLS}
    tool_messages = []
    traces = list(state.get("reasoning_traces", []))

    if last_msg and hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        for tc in last_msg.tool_calls:
            name = tc["name"]
            args = tc.get("args", {})
            call_id = tc.get("id", str(uuid.uuid4()))

            tool_fn = tool_map.get(name)
            if tool_fn:
                try:
                    result = tool_fn.invoke(args)
                except Exception as e:
                    result = f"Error executing tool {name}: {str(e)}"
            else:
                result = f"Tool '{name}' not found."

            tool_messages.append(ToolMessage(content=str(result), tool_call_id=call_id))
            traces.append({
                "thought": f"Completed execution of {name}.",
                "action": name,
                "actionInput": json.dumps(args),
                "observation": str(result)[:140] + ("..." if len(str(result)) > 140 else "")
            })

    return {
        "messages": tool_messages,
        "reasoning_traces": traces
    }

def should_call_tools(state: MaintenanceAgentState) -> Literal["call_tools", "complete"]:
    messages = state.get("messages", [])
    if not messages:
        return "complete"
    last_msg = messages[-1]
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "call_tools"
    return "complete"

# ---------------------------------------------------------------------------
# 5. NODE: Safety Compliance & LOTO Guardrails
# ---------------------------------------------------------------------------
def safety_compliance_node(state: MaintenanceAgentState) -> Dict[str, Any]:
    sensors = state.get("sensor_telemetry", {}) or {}
    messages = state.get("messages", [])
    query = messages[0].content.lower() if messages else ""

    drive_vib = float(sensors.get("vibration_drive", {}).get("value", 1.0) if isinstance(sensors.get("vibration_drive"), dict) else 1.0)
    requires_approval = any(w in query for w in ["work order", "cmms", "draft", "replace", "loto", "dispatch"])
    safety_violation = drive_vib > 7.1  # ISO 10816 Zone D

    return {
        "safety_violation": safety_violation,
        "requires_human_approval": requires_approval
    }

# ---------------------------------------------------------------------------
# 6. NODE: Work Order Generator (CMMS Schema)
# ---------------------------------------------------------------------------
def work_order_generator_node(state: MaintenanceAgentState) -> Dict[str, Any]:
    eq_id = state.get("equipment_id", "WF-P1-001")
    health = state.get("health_score", 100.0)
    fm = state.get("active_failure_mode", "FM-03")

    wo_id = f"WO-2026-{(abs(hash(eq_id + str(health))) % 8999) + 1000}"
    work_order: WorkOrderDraft = {
        "work_order_id": wo_id,
        "equipment_id": eq_id,
        "priority": "HIGH (Degradation Phase 3)" if health < 70 else "MEDIUM",
        "spares_required": [
            {"part": "SKF 22212 E/C3 Spherical Roller Bearing", "qty": "1"},
            {"part": "Triple-lip Nitrile Seal 60x85x10", "qty": "2"}
        ],
        "lubricant": "45g Shell Gadus S2 V220 2 (Lithium Hydroxystearate)",
        "torque_specs": "Pillow block bolts: 175 Nm, Base bolts: 85 Nm",
        "safety_procedure": "Mandatory LOTO DOC-SAF-004 on 415V MCC feeder bucket before housing unbolting.",
        "estimated_downtime_hours": 2.5,
        "status": "PENDING_OPERATOR_APPROVAL"
    }

    traces = list(state.get("reasoning_traces", []))
    traces.append({
        "thought": "Drafting CMMS work order requisition based on active telemetry and BOM parts catalogue.",
        "action": "format_cmms_work_order",
        "actionInput": f"Equipment {eq_id}, Priority {work_order['priority']}",
        "observation": f"Generated draft #{wo_id}. Requiring operator sign-off."
    })

    return {
        "work_order": work_order,
        "reasoning_traces": traces
    }

# ---------------------------------------------------------------------------
# 7. NODE: Final Response Synthesizer
# ---------------------------------------------------------------------------
def response_synthesizer_node(state: MaintenanceAgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else None
    existing_content = str(last_msg.content) if last_msg and last_msg.content else ""

    wo = state.get("work_order")
    diag = state.get("diagnosis", {})
    sensors = state.get("sensor_telemetry", {}) or {}

    def get_val(k: str, default: float) -> float:
        s = sensors.get(k)
        if isinstance(s, dict):
            return float(s.get("value", default))
        return default

    drive_vib = get_val("vibration_drive", 1.2)
    motor_temp = get_val("motor_temp", 42.0)
    health = state.get("health_score", 100.0)

    if wo:
        spares_str = ", ".join(f"{p['qty']}x {p['part']}" for p in wo.get("spares_required", []))
        content = (
            f"### 📋 Generated CMMS Work Order Draft: #{wo['work_order_id']}\n\n"
            f"| Field | Specification |\n"
            f"|---|---|\n"
            f"| **Equipment Tag** | {wo['equipment_id']} (OEM Weigh Feeder) |\n"
            f"| **Priority** | {wo['priority']} |\n"
            f"| **Required Spares** | {spares_str} |\n"
            f"| **Lubricant** | {wo['lubricant']} |\n"
            f"| **Target Torque** | {wo['torque_specs']} |\n"
            f"| **Est. Downtime** | {wo['estimated_downtime_hours']} hours during planned changeover |\n\n"
            f"> **Safety Notice:** {wo['safety_procedure']}\n\n"
            f"*Status: `{wo['status']}`. Click 'Approve & Dispatch' to transmit to SAP / IBM Maximo.*"
        )
    elif diag.get("iso_breached"):
        content = (
            f"### 🚨 Root Cause Analysis: Critical Feeder Degradation\n\n"
            f"- **Telemetry Finding:** Measured Drive End Vibration is **{drive_vib:.2f} mm/s**, placing asset in ISO 10816 **{diag.get('iso_zone')}**.\n"
            f"- **Thermal Gradient:** Motor housing temperature is **{motor_temp:.1f}°C**.\n"
            f"- **Predicted Health:** Overall index is **{int(health)}%** with accelerated wear trajectory.\n"
            f"- **Affected Components:** {', '.join(diag.get('affected_components', ['Drive Pulley SRB Bearing']))}.\n"
            f"- **Immediate Action:** Execute lubrication replenishment (45g Shell Gadus) or schedule planned bearing changeover before unscheduled trip occurs."
        )
    elif existing_content and len(existing_content.strip()) > 30:
        content = existing_content
    else:
        content = (
            f"### ✅ Feeder Operational Diagnosis: System Nominal\n\n"
            f"- **Status:** Equipment **{state.get('equipment_id', 'WF-P1-001')}** is operating inside baseline envelopes.\n"
            f"- **Vibration Rating:** **{drive_vib:.2f} mm/s** ({diag.get('iso_zone', 'Zone A - Good')}).\n"
            f"- **Health Index:** **{int(health)}%**.\n"
            f"- **Recommendation:** Continue routine operational monitoring. Next scheduled inspection interval in 240 operating hours."
        )

    return {
        "final_response": content
    }

# ---------------------------------------------------------------------------
# 8. COMPILED LANGGRAPH BUILDER
# ---------------------------------------------------------------------------
def build_maintenance_agent_graph():
    """
    Compiles the complete LangGraph StateGraph.
    """
    workflow = StateGraph(MaintenanceAgentState)

    workflow.add_node("telemetry_validator", telemetry_validator_node)
    workflow.add_node("rag_retriever", rag_retriever_node)
    workflow.add_node("llm_reasoner", llm_reasoner_node)
    workflow.add_node("tools", tool_execution_node)
    workflow.add_node("safety_compliance", safety_compliance_node)
    workflow.add_node("work_order_generator", work_order_generator_node)
    workflow.add_node("response_synthesizer", response_synthesizer_node)

    # Edge connections
    workflow.set_entry_point("telemetry_validator")
    workflow.add_edge("telemetry_validator", "rag_retriever")
    workflow.add_edge("rag_retriever", "llm_reasoner")

    # Cyclical ReAct Tool Calling
    workflow.add_conditional_edges(
        "llm_reasoner",
        should_call_tools,
        {
            "call_tools": "tools",
            "complete": "safety_compliance"
        }
    )
    workflow.add_edge("tools", "llm_reasoner")

    # Safety & Work Order Branch
    workflow.add_conditional_edges(
        "safety_compliance",
        lambda state: "generate_wo" if state.get("requires_human_approval") else "synthesize",
        {
            "generate_wo": "work_order_generator",
            "synthesize": "response_synthesizer"
        }
    )
    workflow.add_edge("work_order_generator", "response_synthesizer")
    workflow.add_edge("response_synthesizer", END)

    memory = MemorySaver()
    compiled_app = workflow.compile(checkpointer=memory)
    return compiled_app

# Singleton compiled graph instance
MAINTENANCE_GRAPH = build_maintenance_agent_graph()

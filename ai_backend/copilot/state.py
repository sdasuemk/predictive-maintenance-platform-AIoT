from typing import Annotated, Sequence, TypedDict, Optional, List, Dict, Any
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class DiagnosticFinding(TypedDict, total=False):
    root_cause: str
    confidence: float
    affected_components: List[str]
    iso_zone: str
    iso_breached: bool
    recommended_action: str

class WorkOrderDraft(TypedDict, total=False):
    work_order_id: str
    equipment_id: str
    priority: str
    spares_required: List[Dict[str, str]]
    lubricant: str
    torque_specs: str
    safety_procedure: str
    estimated_downtime_hours: float
    status: str

class MaintenanceAgentState(TypedDict):
    """
    Centralized LangGraph State for the AIoT Maintenance Copilot.
    Accumulates chat messages, telemetry, RAG chunks, and reasoning steps.
    """
    # Conversational messages with LangGraph automatic reducer
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # Current telemetry context
    equipment_id: str
    plant_id: str
    health_score: float
    active_failure_mode: Optional[str]
    sensor_telemetry: Dict[str, Any]

    # Retrieved OEM engineering documentation & case histories
    retrieved_documents: List[Dict[str, Any]]

    # Step-by-step reasoning steps for explainable AI audit trail
    reasoning_traces: List[Dict[str, Any]]

    # Diagnostic findings & work order
    diagnosis: Optional[DiagnosticFinding]
    work_order: Optional[WorkOrderDraft]

    # Guardrails & Human-in-the-Loop flags
    safety_violation: bool
    requires_human_approval: bool
    final_response: str

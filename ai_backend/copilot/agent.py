import uuid
from datetime import datetime
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage

from models.schemas import (
    CopilotQueryRequest, CopilotQueryResponse, ReasoningStep,
    Citation, CopilotActionButton
)
from copilot.graph import MAINTENANCE_GRAPH

class AgenticMaintenanceCopilot:
    """
    LangGraph StateGraph-powered Industrial ReAct Agent.
    Evaluates telemetry context, runs cyclical reasoning with dynamic tools,
    enforces ISO 10816 and LOTO safety guardrails, and drafts CMMS work orders.
    """

    @classmethod
    def process_query(cls, request: CopilotQueryRequest) -> CopilotQueryResponse:
        query = request.query
        context = request.telemetryContext or {}
        sensors = context.get("sensors", {})
        fm = request.activeFailureMode or context.get("activeFailureMode")
        health = float(context.get("healthScore", 100))
        equipment_id = context.get("equipmentId", "WF-P1-001")
        plant_id = context.get("plantId", "PLANT-001")
        thread_id = f"thread-{equipment_id}-{uuid.uuid4().hex[:6]}"

        now_time = datetime.now().strftime("%I:%M:%S %p")
        msg_id = f"msg-{uuid.uuid4().hex[:8]}"

        try:
            # Prepare LangGraph initial state
            initial_state = {
                "messages": [HumanMessage(content=query)],
                "equipment_id": equipment_id,
                "plant_id": plant_id,
                "health_score": health,
                "active_failure_mode": fm,
                "sensor_telemetry": sensors,
                "retrieved_documents": [],
                "reasoning_traces": [],
                "diagnosis": None,
                "work_order": None,
                "safety_violation": False,
                "requires_human_approval": False,
                "final_response": ""
            }

            # Invoke compiled LangGraph workflow
            config = {"configurable": {"thread_id": thread_id}}
            final_state = MAINTENANCE_GRAPH.invoke(initial_state, config=config)

            # Map reasoning traces to ReasoningStep objects
            reasoning_steps = [
                ReasoningStep(
                    thought=t.get("thought", ""),
                    action=t.get("action", ""),
                    actionInput=t.get("actionInput", ""),
                    observation=t.get("observation", "")
                )
                for t in final_state.get("reasoning_traces", [])
            ]

            # Map retrieved documents to Citations
            citations = [
                Citation(
                    docId=doc.get("docId", ""),
                    sourceTitle=doc.get("sourceTitle", ""),
                    section=doc.get("section", ""),
                    excerpt=doc.get("excerpt", ""),
                    relevance=float(doc.get("relevance", 0.9))
                )
                for doc in final_state.get("retrieved_documents", [])
            ]

            # Action buttons
            action_buttons = []
            if final_state.get("work_order"):
                action_buttons.append(CopilotActionButton(label="✅ Approve & Submit to CMMS", actionKey="approve_wo"))
                action_buttons.append(CopilotActionButton(label="📋 Review LOTO SOP", actionKey="view_loto"))
            elif final_state.get("diagnosis", {}).get("iso_breached"):
                action_buttons.append(CopilotActionButton(label="⚡ Draft Work Order", actionKey="draft_wo"))
                action_buttons.append(CopilotActionButton(label="🔍 Bearing Inspection SOP", actionKey="bearing_sop"))
            else:
                action_buttons.append(CopilotActionButton(label="📊 Run Full Diagnostics", actionKey="rca"))

            return CopilotQueryResponse(
                id=msg_id,
                role="assistant",
                timestamp=now_time,
                content=final_state.get("final_response", "Diagnosis complete."),
                reasoningSteps=reasoning_steps,
                citations=citations,
                actionButtons=action_buttons
            )

        except Exception as e:
            # Graceful error recovery
            return CopilotQueryResponse(
                id=msg_id,
                role="assistant",
                timestamp=now_time,
                content=f"⚠️ Copilot agent encountered a processing interruption: {str(e)}. Operating in fallback mode.",
                reasoningSteps=[
                    ReasoningStep(
                        thought="LangGraph execution failed; returning fallback response.",
                        action="error_fallback",
                        actionInput=query,
                        observation=str(e)
                    )
                ],
                citations=[]
            )

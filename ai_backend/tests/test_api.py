import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import TelemetryInput, CopilotQueryRequest, RAGSearchRequest
from models.ml_prognostics import MLPrognosticsEngine
from copilot.agent import AgenticMaintenanceCopilot
from rag.knowledge_store import RAGKnowledgeStore

def run_tests():
    print("[1] Testing ML Prognostics Engine...")
    tel = TelemetryInput(
        equipmentId="WF-P1-001",
        healthScore=68.0,
        activeFailureMode="FM-03",
        sensors={"vibration_drive": {"value": 4.8, "unit": "mm/s"}}
    )
    pred = MLPrognosticsEngine.predict(tel)
    print(f" -> Predicted RUL: {pred.estimatedRulHours}h, Prob: {pred.failureProbability}%, Stage: {pred.degradationStage}")
    assert pred.failureProbability > 40
    assert pred.degradationStage in ["EARLY_DEGRADATION", "ACCELERATED_WEAR", "CRITICAL_ZONE"]

    print("[2] Testing RAG Knowledge Store Search...")
    search_res = RAGKnowledgeStore.search("bearing replacement torque ISO 10816", limit=2)
    print(f" -> RAG Matches: {len(search_res)}, Top: {search_res[0].sourceTitle} ({search_res[0].relevance})")
    assert len(search_res) > 0

    print("[3] Testing Agentic Maintenance Copilot...")
    req = CopilotQueryRequest(
        query="Run root cause analysis on current vibration",
        telemetryContext={"equipmentId": "WF-P1-001", "healthScore": 68, "activeFailureMode": "FM-03", "sensors": {"vibration_drive": {"value": 4.8}}}
    )
    copilot_res = AgenticMaintenanceCopilot.process_query(req)
    print(f" -> Copilot Response ID: {copilot_res.id}")
    print(f" -> Reasoning Steps: {len(copilot_res.reasoningSteps)}")
    print(f" -> Citations: {len(copilot_res.citations)}")
    assert len(copilot_res.reasoningSteps) > 0
    assert len(copilot_res.citations) > 0

    print("\nALL PYTHON AI ENGINE TESTS PASSED!")

if __name__ == "__main__":
    run_tests()

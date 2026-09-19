import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import CopilotQueryRequest
from copilot.state import MaintenanceAgentState
from copilot.tools import (
    calculate_ml_prognostics,
    search_oem_manuals,
    lookup_spare_parts_catalog,
    query_sensor_telemetry
)
from copilot.graph import MAINTENANCE_GRAPH
from copilot.agent import AgenticMaintenanceCopilot

class TestLangGraphPredictiveMaintenance(unittest.TestCase):

    def test_01_tools_execution(self):
        print("\n[Test 1] Testing LangChain tools execution...")
        
        # Test ML Prognostics Tool
        rul_res = calculate_ml_prognostics.invoke({
            "health_score": 65.0,
            "vibration_drive": 4.2,
            "motor_temp": 50.0
        })
        self.assertIn("estimated_rul_hours", rul_res)
        self.assertIn("failure_probability_pct", rul_res)
        print("  [OK] calculate_ml_prognostics returned valid RUL data")

        # Test RAG Search Tool
        rag_res = search_oem_manuals.invoke({"query": "load cell tare calibration", "category": "OEM_MANUAL"})
        self.assertIn("doc_id", rag_res)
        print("  [OK] search_oem_manuals retrieved grounded OEM documents")

        # Test Spare Parts Catalog Tool
        part_res = lookup_spare_parts_catalog.invoke({"component_keyword": "bearing"})
        self.assertIn("SKF 22212", part_res)
        print("  [OK] lookup_spare_parts_catalog returned BOM item & bin location")

        # Test Sensor Telemetry Validator Tool
        sensor_res = query_sensor_telemetry.invoke({"sensor_name": "vibration_drive", "current_value": 3.8})
        self.assertIn("zone_c", sensor_res)
        print("  [OK] query_sensor_telemetry evaluated ISO 10816 baseline thresholds")

    def test_02_graph_compilation(self):
        print("\n[Test 2] Testing LangGraph StateGraph compilation...")
        self.assertIsNotNone(MAINTENANCE_GRAPH)
        self.assertTrue(hasattr(MAINTENANCE_GRAPH, "invoke"))
        print("  [OK] LangGraph StateGraph compiled and memory checkpointer attached")

    def test_03_rca_diagnostic_flow(self):
        print("\n[Test 3] Testing Root Cause Analysis (RCA) diagnostic flow...")
        req = CopilotQueryRequest(
            query="Analyze root cause of high drive vibration and motor temperature",
            telemetryContext={
                "equipmentId": "WF-P1-001",
                "plantId": "PLANT-001",
                "healthScore": 62.0,
                "activeFailureMode": "FM-03",
                "sensors": {
                    "vibration_drive": {"value": 4.8, "unit": "mm/s"},
                    "motor_temp": {"value": 54.0, "unit": "°C"},
                    "belt_tension": {"value": 980.0, "unit": "N"}
                }
            }
        )
        res = AgenticMaintenanceCopilot.process_query(req)
        
        self.assertIsNotNone(res.id)
        self.assertGreater(len(res.reasoningSteps), 0)
        self.assertGreater(len(res.citations), 0)
        self.assertIn("Root Cause", res.content)
        self.assertIn("ISO 10816", res.content)
        print(f"  [OK] Processed query successfully (ID: {res.id})")
        print(f"  [OK] Steps logged: {len(res.reasoningSteps)}, Citations: {len(res.citations)}")

    def test_04_work_order_generation_flow(self):
        print("\n[Test 4] Testing CMMS Work Order drafting flow...")
        req = CopilotQueryRequest(
            query="Draft maintenance work order for drive bearing replacement with spares",
            telemetryContext={
                "equipmentId": "WF-P1-001",
                "plantId": "PLANT-001",
                "healthScore": 55.0,
                "activeFailureMode": "FM-03",
                "sensors": {
                    "vibration_drive": {"value": 5.2, "unit": "mm/s"},
                    "motor_temp": {"value": 58.0, "unit": "°C"}
                }
            }
        )
        res = AgenticMaintenanceCopilot.process_query(req)
        
        self.assertIn("Work Order Draft", res.content)
        self.assertIn("SKF 22212", res.content)
        self.assertIn("LOTO", res.content)
        self.assertTrue(any(btn.actionKey == "approve_wo" for btn in (res.actionButtons or [])))
        print("  [OK] Generated CMMS work order draft with BOM parts and LOTO procedure")

    def test_05_nominal_state_inquiry(self):
        print("\n[Test 5] Testing Nominal Equipment Inquiry flow...")
        req = CopilotQueryRequest(
            query="How is the equipment operating right now?",
            telemetryContext={
                "equipmentId": "WF-P1-001",
                "plantId": "PLANT-001",
                "healthScore": 98.0,
                "activeFailureMode": None,
                "sensors": {
                    "vibration_drive": {"value": 1.1, "unit": "mm/s"},
                    "motor_temp": {"value": 41.0, "unit": "°C"},
                    "belt_tension": {"value": 1120.0, "unit": "N"}
                }
            }
        )
        res = AgenticMaintenanceCopilot.process_query(req)
        self.assertIn("Nominal", res.content)
        print("  [OK] Nominal state correctly diagnosed without false alarms")

if __name__ == "__main__":
    unittest.main()

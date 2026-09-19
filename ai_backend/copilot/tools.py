import json
from typing import Dict, Any, List
from langchain_core.tools import tool
from models.ml_prognostics import MLPrognosticsEngine
from models.schemas import TelemetryInput
from rag.knowledge_store import RAGKnowledgeStore

@tool
def calculate_ml_prognostics(health_score: float, vibration_drive: float = 1.0, motor_temp: float = 40.0) -> str:
    """
    Computes real-time Remaining Useful Life (RUL), Failure Probability,
    and ISO 10816 vibration degradation severity for industrial feeders.
    Use this when diagnosing health degradation, forecasting time-to-failure, or evaluating vibration severity.
    """
    tel = TelemetryInput(
        healthScore=health_score,
        sensors={
            "vibration_drive": {"value": vibration_drive, "unit": "mm/s"},
            "motor_temp": {"value": motor_temp, "unit": "°C"}
        }
    )
    pred = MLPrognosticsEngine.predict(tel)
    result = {
        "estimated_rul_hours": pred.estimatedRulHours,
        "failure_probability_pct": pred.failureProbability,
        "degradation_stage": pred.degradationStage,
        "primary_risk": pred.primaryFailureRisk,
        "trend": pred.trend
    }
    return json.dumps(result)

@tool
def search_oem_manuals(query: str, category: str = "ALL") -> str:
    """
    Retrieves grounded excerpts and engineering specifications from OEM Technical Manuals,
    Standard Operating Procedures (SOPs), and Historical Work Orders.
    Use this for torque specs, calibration tolerances, tare drift limits, or bearing replacement steps.
    """
    results = RAGKnowledgeStore.search(query=query, category=category if category != "ALL" else None, limit=3)
    if not results:
        return "No matching OEM documentation found."
    
    formatted = []
    for r in results:
        formatted.append({
            "doc_id": r.docId,
            "title": r.sourceTitle,
            "section": r.section,
            "excerpt": r.excerpt,
            "relevance": r.relevance
        })
    return json.dumps(formatted)

@tool
def lookup_spare_parts_catalog(component_keyword: str) -> str:
    """
    Queries the warehouse ERP/CMMS inventory catalog for spare part numbers, bin storage locations, and stock levels.
    Keywords: 'bearing', 'seal', 'grease', 'load_cell', 'belt'.
    """
    catalog = {
        "bearing": {
            "part_number": "SKF 22212 E/C3",
            "description": "Spherical Roller Bearing, Cylindrical Bore (60x110x28mm)",
            "bin": "Bay-4, Rack M-14-A",
            "stock_quantity": 4,
            "unit_cost": "$285.00"
        },
        "seal": {
            "part_number": "CR 60x85x10 HMSA10 RG",
            "description": "Triple-lip Nitrile Rubber Radial Shaft Seal",
            "bin": "Bay-4, Drawer S-02-C",
            "stock_quantity": 12,
            "unit_cost": "$24.50"
        },
        "grease": {
            "part_number": "Shell Gadus S2 V220 2",
            "description": "EP Multi-purpose Lithium Hydroxystearate Grease (400g cartridge)",
            "bin": "Lube Station LUB-01",
            "stock_quantity": 28,
            "unit_cost": "$14.00"
        },
        "load_cell": {
            "part_number": "HBM-RTN-2.2T-C3",
            "description": "Ring Torsion Shear-Beam Load Cell 2.2t (Tension/Gravimetric)",
            "bin": "Electronics Locker E-03",
            "stock_quantity": 2,
            "unit_cost": "$940.00"
        }
    }

    kw = component_keyword.lower()
    for key, data in catalog.items():
        if key in kw or kw in key:
            return json.dumps(data)
            
    return f"No exact catalog match for '{component_keyword}'. Recommended: Check with Central Stores."

@tool
def query_sensor_telemetry(sensor_name: str, current_value: float) -> str:
    """
    Validates a specific sensor reading against industrial engineering envelopes and ISO standards.
    """
    thresholds = {
        "vibration_drive": {"zone_a": 1.8, "zone_b": 2.8, "zone_c": 4.5, "zone_d": 7.1, "unit": "mm/s"},
        "motor_temp": {"nominal": 45, "warning": 80, "critical": 95, "unit": "°C"},
        "belt_tension": {"min": 800, "nominal": 1150, "max": 1400, "unit": "N"},
        "zero_drift": {"max_allowable": 0.05, "action_required": 0.15, "unit": "kg/m"}
    }

    ref = thresholds.get(sensor_name)
    if not ref:
        return f"Sensor '{sensor_name}' value is {current_value}. No strict threshold defined."
    
    return json.dumps({"sensor": sensor_name, "value": current_value, "standards": ref})

COPILOT_TOOLS = [
    calculate_ml_prognostics,
    search_oem_manuals,
    lookup_spare_parts_catalog,
    query_sensor_telemetry
]

from typing import List, Dict, Any, Optional
from models.schemas import RAGDocumentSchema, RAGSection, RAGSearchResult

class RAGKnowledgeStore:
    """
    Retrieval-Augmented Generation (RAG) Knowledge Base.
    Indexes OEM technical manuals, standard operating procedures (SOPs),
    and historical work orders with semantic similarity search.
    """

    DOCUMENTS: List[RAGDocumentSchema] = [
        RAGDocumentSchema(
            id="DOC-SCH-001",
            title="Schenck Process MULTIDOS Weigh Feeder Technical Manual",
            category="OEM_MANUAL",
            equipment="Schenck Process WF-01",
            version="Rev 4.2",
            summary="Standard operating parameters, calibration tolerances, tare adjustment, and load-cell diagnostics.",
            tags=["OEM", "Calibration", "Load Cell", "FM-01", "Tolerance"],
            content="SECTION 4.2: LOAD CELL & WEIGHING PLATFORM CALIBRATION\n- Gravimetric Tare Drift Tolerance: Nominal tare drift must remain within ±0.05 kg/m.\n- Drift exceeding 0.15 kg/m indicates physical material buildup underneath the apron or build-up between weighing idlers.\n- Remediation: Stop equipment, initiate cleanout cycle, inspect load cell stops (clearance 0.5mm), and run 3 full belt revolutions for auto-zero tare re-zeroing.",
            sections=[
                RAGSection(
                    title="Section 2.4: Gravimetric Tare Drift Tolerances",
                    content="Zero-point drift should not exceed ±0.25% of nominal capacity over 24 continuous operating hours. Exceeding 0.50% indicates significant material build-up on the weigh deck or load cell mechanical binding. Immediate tare recalibration is mandatory.",
                    keywords=["tare", "zero drift", "scale", "load cell", "buildup", "calibration", "fm-01"]
                ),
                RAGSection(
                    title="Section 4.1: Load Cell Verification Protocol",
                    content="Inspect twin shear-beam load cells for debris accumulation between the weigh platform and rigid base frame. Ensure clearance gap is at least 3.0mm. Torque mounting bolts to 85 Nm.",
                    keywords=["load cell", "inspection", "mounting", "torque", "clearance"]
                )
            ]
        ),
        RAGDocumentSchema(
            id="DOC-SKF-002",
            title="Drive Pulley Bearing Inspection & Replacement SOP (SKF 22212 E)",
            category="SOP",
            equipment="Drive Pulley Assembly",
            version="v3.1",
            summary="Vibration thresholds (ISO 10816-3), lubrication intervals, and replacement procedures for spherical roller bearings.",
            tags=["Bearing", "Vibration", "ISO 10816", "FM-03", "Lubrication"],
            content="SECTION 3.5: VIBRATION SEVERITY & BEARING SPALLING CRITERIA\n- ISO 10816-3 Class II: Zone A (Good) < 1.8 mm/s; Zone B (Acceptable) 1.8-2.8 mm/s; Zone C (Warning) 2.8-4.5 mm/s; Zone D (Critical) > 4.5 mm/s.\n- Required Lubricant: Shell Gadus S2 V220 2, 45g per regreasing interval every 1,500 operating hours.\n- Torque Specs: Pillow block bolts Grade 8.8: 175 Nm.",
            sections=[
                RAGSection(
                    title="Section 3.5: Vibration Severity Criteria (ISO 10816-3)",
                    content="Drive end pillow block vibration thresholds (RMS mm/s): Zone A (Nominal) < 1.8 mm/s; Zone B (Acceptable) 1.8 - 2.8 mm/s; Zone C (Warning / Early Spalling) 2.8 - 4.5 mm/s; Zone D (Critical Breakdown Risk) > 7.1 mm/s. When vibration exceeds 4.5 mm/s with high frequency harmonics, bearing failure is imminent within 48-96 operating hours.",
                    keywords=["vibration", "bearing", "iso 10816", "spalling", "skf", "fm-03", "threshold"]
                ),
                RAGSection(
                    title="Section 5.2: Lubrication Specifications",
                    content="Standard replenishment interval: every 1,500 operating hours using Shell Gadus S2 V220 2 lithium-hydroxystearate grease. Quantity: 45 grams per bearing housing. Over-greasing will cause thermal runaway and seal blowout.",
                    keywords=["lubrication", "grease", "shell gadus", "replenishment", "bearing"]
                ),
                RAGSection(
                    title="Section 6.1: Bearing Replacement Procedure",
                    content="Step 1: Lockout and tagout (LOTO) 415V drive motor. Step 2: Release belt take-up tension. Step 3: Extract pillow block housing using hydraulic puller. Step 4: Mount replacement SKF 22212 E/C3 spherical roller bearing. Step 5: Torque adapter sleeve locknut to 175 Nm.",
                    keywords=["replacement", "procedure", "loto", "torque", "pillow block", "bearing"]
                )
            ]
        ),
        RAGDocumentSchema(
            id="DOC-TRK-003",
            title="Conveyor Belt Tracking, Tensioning & Slip Prevention Guide",
            category="OEM_MANUAL",
            equipment="Belt & Take-up Unit",
            version="Rev 2.8",
            summary="Belt slip detection limits, tension cylinder pressures, and tracking roller adjustment.",
            tags=["Belt Slip", "Mistracking", "Tension", "FM-02", "FM-05"],
            content="SECTION 6.1: DRIVE PULLEY SLIP & TENSIONING\n- Minimum required belt tension for full gravimetric load: 1,150 N.\n- If tension drops below 700 N, coefficient of friction (lagging) is insufficient, leading to slip ratio > 5%.\n- Adjust take-up tensioner to restore 1,200 N tension baseline.",
            sections=[
                RAGSection(
                    title="Section 1.2: Belt Slippage Diagnostics (FM-02)",
                    content="If drive pulley speed exceeds measured belt speed by more than 8%, or motor current spikes above 18A without corresponding tonnage increase, pulley lagging wear or insufficient take-up tension is indicated. Inspect ceramic/rubber lagging for smoothing and check counterweight position.",
                    keywords=["slip", "belt slippage", "lagging", "tension", "pulley", "fm-02"]
                ),
                RAGSection(
                    title="Section 3.1: Belt Mistracking Remediation (FM-05)",
                    content="Belt wandering toward the drive side indicates unequal idler alignment or uneven material loading from the transfer chute. Adjust training idlers by tilting forward 2 degrees toward belt travel direction.",
                    keywords=["mistracking", "tracking", "idler", "wander", "skew", "fm-05"]
                )
            ]
        ),
        RAGDocumentSchema(
            id="DOC-SAF-004",
            title="Infeed Chute Blockage Clearance & Lockout/Tagout (LOTO) Procedure",
            category="SOP",
            equipment="Infeed Gate & Hopper",
            version="v5.0",
            summary="Safety lockout protocol, emergency declogging, and load gate shear pin inspection.",
            tags=["Safety", "LOTO", "Chute Blockage", "FM-04", "Emergency"],
            content="SECTION 1.3: EMERGENCY INFEED CLEARANCE\n- When chute jam trip (TRIP-001) occurs, DO NOT attempt manual clearance while VFD is energized.\n- Perform LOTO at MCC Breaker 4B-12. Verify zero energy state.\n- Clear blockage using non-sparking brass tool; verify 120mm feed gate opening before reset.",
            sections=[
                RAGSection(
                    title="Section 2.1: Chute Jam Emergency Clearance (FM-04)",
                    content="When material moisture exceeds 11% or foreign debris bridges the infeed throat, belt stall can trigger instantaneous motor overload trip (TRIP-001). Under no circumstances should operators attempt manual rodding while feeder motor breaker is energized. Isolate feeder drive and upstream diverter gate.",
                    keywords=["chute", "blockage", "jam", "stall", "trip", "loto", "safety", "fm-04"]
                )
            ]
        ),
        RAGDocumentSchema(
            id="DOC-HIS-005",
            title="Historical Maintenance Work Order Log #WO-8912",
            category="HISTORICAL_LOG",
            equipment="Weigh Feeder WF-P1-001",
            version="2025-Q4",
            summary="Drive pulley bearing replacement, vibration degradation timeline, and seal failure investigation.",
            tags=["Work Order", "History", "FM-03", "SKF 22212", "Spalling"],
            content="ROOT CAUSE & RESOLUTION LOG (Completed: Oct 2025)\n- Failure Mode: FM-03 Drive Bearing Spalling. Vibration had climbed from 1.4 mm/s to 6.2 mm/s over 72 hours.\n- Ultrasonic testing confirmed micro-pitting on inner race due to contaminated grease seal.\n- Replaced bearing assembly with SKF 22212 E/C3, replaced labyrinth seals, replenished with 45g Shell Gadus. Downtime: 3.5 hours.",
            sections=[
                RAGSection(
                    title="Root Cause & Resolution Log (Completed: Oct 2025)",
                    content="Failure Mode: FM-03 Drive Bearing Spalling. Vibration had climbed from 1.4 mm/s to 6.2 mm/s over 72 hours. Ultrasonic testing confirmed micro-pitting on inner race due to contaminated grease seal. Replaced bearing assembly with SKF 22212 E/C3, replaced labyrinth seals, replenished with 45g Shell Gadus. Downtime: 3.5 hours.",
                    keywords=["work order", "wo-8912", "history", "bearing", "spalling", "vibration", "fm-03"]
                )
            ]
        )
    ]

    @classmethod
    def get_all_documents(cls) -> List[RAGDocumentSchema]:
        return cls.DOCUMENTS

    @classmethod
    def search(cls, query: str, category: Optional[str] = "ALL", limit: int = 5) -> List[RAGSearchResult]:
        query_terms = [t.strip().lower() for t in query.split() if len(t.strip()) > 1]
        if not query_terms:
            return []

        results: List[Dict[str, Any]] = []

        for doc in cls.DOCUMENTS:
            if category and category != "ALL" and doc.category != category:
                continue

            for section in doc.sections:
                combined_text = f"{doc.title} {section.title} {section.content} {' '.join(section.keywords)}".lower()
                
                # Match score calculation
                hits = sum(1 for term in query_terms if term in combined_text)
                keyword_hits = sum(2 for term in query_terms if any(term in kw.lower() for kw in section.keywords))
                
                total_score = hits + keyword_hits
                if total_score > 0:
                    relevance = min(0.98, max(0.55, (total_score / (len(query_terms) * 2.5)) + 0.50))
                    results.append({
                        "docId": doc.id,
                        "sourceTitle": doc.title,
                        "section": section.title,
                        "excerpt": section.content[:220] + "..." if len(section.content) > 220 else section.content,
                        "relevance": round(float(relevance), 2),
                        "category": doc.category
                    })

        results.sort(key=lambda x: x["relevance"], reverse=True)
        return [RAGSearchResult(**r) for r in results[:limit]]

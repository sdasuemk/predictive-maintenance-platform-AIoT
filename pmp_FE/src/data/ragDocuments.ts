import type { RAGDocument } from "../types/ai";

export const RAG_DOCUMENTS: RAGDocument[] = [
  {
    id: "DOC-SCH-001",
    title: "Schenck Process MULTIDOS Weigh Feeder Technical Manual",
    category: "OEM_MANUAL",
    equipment: "Schenck Process WF-01",
    version: "Rev 4.2",
    summary: "Standard operating parameters, calibration tolerances, tare adjustment, and load-cell diagnostics.",
    tags: ["OEM", "Calibration", "Load Cell", "FM-01", "Tolerance"],
    content: `SECTION 4.2: LOAD CELL & WEIGHING PLATFORM CALIBRATION
- Gravimetric Tare Drift Tolerance: Nominal tare drift must remain within ±0.05 kg/m.
- Drift exceeding 0.15 kg/m indicates physical material buildup underneath the apron or build-up between weighing idlers.
- Remediation: Stop equipment, initiate cleanout cycle, inspect load cell stops (clearance 0.5mm), and run 3 full belt revolutions for auto-zero tare re-zeroing.`
  },
  {
    id: "DOC-SKF-002",
    title: "Drive Pulley Bearing Inspection & Replacement SOP (SKF 22212 E)",
    category: "SOP",
    equipment: "Drive Pulley Assembly",
    version: "v3.1",
    summary: "Vibration thresholds (ISO 10816-3), lubrication intervals, and replacement procedures for spherical roller bearings.",
    tags: ["Bearing", "Vibration", "ISO 10816", "FM-03", "Lubrication"],
    content: `SECTION 3.5: VIBRATION SEVERITY & BEARING SPALLING CRITERIA
- ISO 10816-3 Class II (Industrial machinery with 15-75kW drive):
  * Zone A (Good): < 1.8 mm/s RMS
  * Zone B (Acceptable): 1.8 - 2.8 mm/s RMS
  * Zone C (Warning / Early Degradation): 2.8 - 4.5 mm/s RMS (Schedule inspection within 48h)
  * Zone D (Critical Hazard): > 4.5 mm/s RMS (Immediate shutdown to prevent shaft scoring)
- Required Lubricant: Shell Gadus S2 V220 2, 45g per regreasing interval every 1,500 operating hours.
- Torque Specs: Bearing housing pillow block bolts M16, Grade 8.8: 175 Nm.`
  },
  {
    id: "DOC-TRK-003",
    title: "Conveyor Belt Tracking, Tensioning & Slip Prevention Guide",
    category: "OEM_MANUAL",
    equipment: "Belt & Take-up Unit",
    version: "Rev 2.8",
    summary: "Belt slip detection limits, tension cylinder pressures, and tracking roller adjustment.",
    tags: ["Belt Slip", "Mistracking", "Tension", "FM-02", "FM-05"],
    content: `SECTION 6.1: DRIVE PULLEY SLIP & TENSIONING
- Minimum required belt tension for full gravimetric load: 1,150 N.
- If tension drops below 700 N, coefficient of friction (lagging) is insufficient, leading to slip ratio > 5%.
- Belt slip causes high localized heat (> 70°C) and accelerates lagging wear.
- Adjust counterweight take-up screw or pneumatic take-up cylinder to restore 1,200 N tension baseline.`
  },
  {
    id: "DOC-SAF-004",
    title: "Infeed Chute Blockage Clearance & Lockout/Tagout (LOTO) Procedure",
    category: "SOP",
    equipment: "Infeed Gate & Hopper",
    version: "v5.0",
    summary: "Safety lockout protocol, emergency declogging, and load gate shear pin inspection.",
    tags: ["Safety", "LOTO", "Chute Blockage", "FM-04", "Emergency"],
    content: `SECTION 1.3: EMERGENCY INFEED CLEARANCE
- When chute jam trip (TRIP-001) occurs, DO NOT attempt manual clearance while VFD is energized.
- Perform LOTO at MCC Breaker 4B-12. Verify zero energy state.
- Inspect aggregate flow gate; break arching agglomerates using non-sparking brass rodding tool.
- Inspect feed gate opening ratio; verify clearance is 120mm before resetting trip circuit.`
  },
  {
    id: "DOC-HIS-005",
    title: "Historical Maintenance Work Order Log #WO-8912",
    category: "HISTORICAL_LOG",
    equipment: "Schenck Process WF-01",
    version: "Archived 2025-08-14",
    summary: "Resolution log for high drive end vibration and 54°C bearing temperature elevation.",
    tags: ["Work Order", "Case Study", "FM-03", "Resolution"],
    content: `INCIDENT SUMMARY:
- Date: 2025-08-14 | Plant: Plant-01 Line 2
- Symptoms: Drive vibration reached 4.6 mm/s, bearing temperature climbed from 41°C to 54.2°C over 18 hours.
- Root Cause: Grease seal failure caused ingress of abrasive clinker dust, producing spalling on inner raceway.
- Corrective Action: Replaced bearing unit with SKF 22212 E/C3, replaced triple-lip contact seal, flushed housing.
- Total Downtime: 2.8 hours. Asset restored to 100% health.`
  }
];

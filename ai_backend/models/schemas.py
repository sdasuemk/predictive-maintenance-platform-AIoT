from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class TelemetryAlertInput(BaseModel):
    code: str
    message: str
    severity: str
    sensor: Optional[str] = None
    timestamp: Optional[str] = None

class TelemetryInput(BaseModel):
    equipmentId: str = "WF-P1-001"
    plantId: str = "PLANT-001"
    state: str = "RUNNING"
    healthScore: float = 100.0
    activeFailureMode: Optional[str] = None
    sensors: Optional[Dict[str, Any]] = None
    alerts: Optional[List[TelemetryAlertInput]] = []
    timestamp: Optional[str] = None

class MLPredictionOutput(BaseModel):
    healthIndex: float
    failureProbability: int
    estimatedRulHours: int
    primaryFailureRisk: str
    degradationStage: str  # NOMINAL | EARLY_DEGRADATION | ACCELERATED_WEAR | CRITICAL_ZONE
    confidence: int
    trend: str  # STABLE | DEGRADING | RAPID_DECLINE
    vibrationAnomalyScore: float
    thermalGradientScore: float

class CopilotActionButton(BaseModel):
    label: str
    actionKey: str

class ReasoningStep(BaseModel):
    thought: str
    action: str
    actionInput: str
    observation: str

class Citation(BaseModel):
    docId: str
    sourceTitle: str
    section: str
    excerpt: str
    relevance: float

class CopilotQueryRequest(BaseModel):
    query: str
    telemetryContext: Optional[Dict[str, Any]] = None
    activeFailureMode: Optional[str] = None

class CopilotQueryResponse(BaseModel):
    id: str
    role: str = "assistant"
    timestamp: str
    content: str
    reasoningSteps: List[ReasoningStep] = []
    citations: List[Citation] = []
    actionButtons: Optional[List[CopilotActionButton]] = None

class RAGSection(BaseModel):
    title: str
    content: str
    keywords: List[str] = []

class RAGDocumentSchema(BaseModel):
    id: str
    title: str
    category: str
    equipment: str = "Weigh Feeder"
    version: str = "v1.0"
    summary: str = ""
    content: str = ""
    tags: List[str] = []
    sections: List[RAGSection] = []

class RAGSearchRequest(BaseModel):
    query: str
    category: Optional[str] = "ALL"
    limit: Optional[int] = 5

class RAGSearchResult(BaseModel):
    docId: str
    sourceTitle: str
    section: str
    excerpt: str
    relevance: float
    category: str

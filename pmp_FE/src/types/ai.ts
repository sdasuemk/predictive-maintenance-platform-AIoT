export type DegradationStage = "NOMINAL" | "EARLY_DEGRADATION" | "ACCELERATED_WEAR" | "CRITICAL_ZONE";

export interface MLPrediction {
  healthIndex: number; // 0 - 100%
  failureProbability: number; // 0 - 100%
  estimatedRulHours: number; // Hours remaining
  primaryFailureRisk: string; // e.g. "FM-03: Drive Bearing Spalling / Wear"
  degradationStage: DegradationStage;
  confidence: number; // e.g. 94%
  trend: "STABLE" | "DEGRADING" | "RAPID_DECLINE";
  vibrationAnomalyScore: number;
  thermalGradientScore: number;
}

export interface AgentReasoningStep {
  thought: string;
  action: string;
  actionInput?: string;
  observation: string;
}

export interface RAGCitation {
  docId: string;
  sourceTitle: string;
  section: string;
  excerpt: string;
  relevance: number;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  reasoningSteps?: AgentReasoningStep[];
  citations?: RAGCitation[];
  actionButtons?: { label: string; actionKey: string }[];
}

export interface RAGDocument {
  id: string;
  title: string;
  category: "OEM_MANUAL" | "SOP" | "HISTORICAL_LOG" | "SPEC_SHEET";
  equipment: string;
  version: string;
  summary: string;
  content: string;
  tags: string[];
}

export interface RAGSearchResult {
  docId: string;
  sourceTitle: string;
  section: string;
  excerpt: string;
  relevance: number;
  category: string;
}


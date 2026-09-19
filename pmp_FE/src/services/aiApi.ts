import type { TelemetryPayload } from "../types/telemetry";
import type { MLPrediction, CopilotMessage, RAGDocument, RAGSearchResult } from "../types/ai";
import { computeMLPrediction } from "../utils/predictiveEngine";
import { RAG_DOCUMENTS } from "../data/ragDocuments";

const rawAiUrl = import.meta.env.VITE_AI_BACKEND_URL || "http://localhost:8000";
const AI_BACKEND_URL = rawAiUrl.startsWith("http") ? rawAiUrl : `https://${rawAiUrl}`;

/**
 * Fetches real-time ML prognostics (RUL, Failure Probability, Degradation Stage)
 * from the dedicated Python FastAPI microservice.
 */
export async function fetchMLPrediction(telemetry: TelemetryPayload | null): Promise<MLPrediction> {
  if (!telemetry) {
    return computeMLPrediction(null);
  }

  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telemetry),
    });

    if (!response.ok) {
      throw new Error(`AI Backend returned HTTP ${response.status}`);
    }

    const data: MLPrediction = await response.json();
    return data;
  } catch (err) {
    // Graceful fallback to client-side heuristic engine if backend is starting or offline
    console.warn("[aiApi] Backend predict unreachable, using client fallback:", err);
    return computeMLPrediction(telemetry);
  }
}

/**
 * Queries the Python LangChain-style ReAct Agent for Root Cause Analysis,
 * maintenance work order generation, and SOP guidance.
 */
export async function queryAICopilot(
  query: string,
  telemetry: TelemetryPayload | null,
  activeFailureMode?: string | null
): Promise<CopilotMessage> {
  try {
    const payload = {
      query,
      telemetryContext: telemetry,
      activeFailureMode: activeFailureMode ?? telemetry?.activeFailureMode ?? null,
    };

    const response = await fetch(`${AI_BACKEND_URL}/api/copilot/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`AI Backend returned HTTP ${response.status}`);
    }

    const data: CopilotMessage = await response.json();
    return data;
  } catch (err) {
    console.warn("[aiApi] Backend copilot query failed, returning fallback:", err);
    // Fallback response with offline warning
    return {
      id: `msg-fallback-${Date.now()}`,
      role: "assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: `⚠️ **AI Backend Service Notice**: Could not reach Python FastAPI agent on \`${AI_BACKEND_URL}\`. Operating on local client fallback. Please ensure \`uvicorn main:app --port 8000\` is running in \`ai_backend\`.`,
      actionButtons: [
        { label: "⚡ Retry RCA", actionKey: "rca" }
      ]
    };
  }
}

/**
 * Retrieves all indexed OEM engineering manuals from the Python RAG knowledge store.
 */
export async function fetchRAGDocuments(): Promise<RAGDocument[]> {
  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/rag/documents`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn("[aiApi] Backend RAG documents fetch failed, using local bundle:", err);
    return RAG_DOCUMENTS;
  }
}

/**
 * Searches the Python RAG vector store using semantic similarity.
 */
export async function searchRAGKnowledgeStore(
  query: string,
  category: string = "ALL"
): Promise<RAGSearchResult[]> {
  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/rag/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, category, limit: 6 }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn("[aiApi] Backend RAG search failed, using local search:", err);
    return [];
  }
}

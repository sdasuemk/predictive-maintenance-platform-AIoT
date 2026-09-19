from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn

from models.schemas import (
    TelemetryInput, MLPredictionOutput,
    CopilotQueryRequest, CopilotQueryResponse,
    RAGDocumentSchema, RAGSearchRequest, RAGSearchResult
)
from models.ml_prognostics import MLPrognosticsEngine
from rag.knowledge_store import RAGKnowledgeStore
from copilot.agent import AgenticMaintenanceCopilot

app = FastAPI(
    title="AIoT Predictive Maintenance AI Backend",
    description="Python FastAPI Microservice for Real-Time ML Prognostics, LangChain Agentic Copilot, and Grounded RAG.",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "ONLINE",
        "service": "AIoT Predictive Maintenance AI Backend",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "predict": "/api/predict",
            "copilot": "/api/copilot/chat",
            "rag_documents": "/api/rag/documents",
            "rag_search": "/api/rag/search"
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "AIoT ML Prognostics & Copilot Service",
        "engine": "FastAPI + Scikit-Learn + LangChain ReAct"
    }

@app.post("/api/predict", response_model=MLPredictionOutput)
def predict_health(telemetry: Optional[TelemetryInput] = None):
    """
    Computes real-time ML Prognostics:
    - Estimated Remaining Useful Life (RUL in hours)
    - Failure Probability (%)
    - Degradation Stage Classification (NOMINAL, EARLY_DEGRADATION, ACCELERATED_WEAR, CRITICAL_ZONE)
    - Normalized Vibration and Thermal Anomaly Scores
    """
    return MLPrognosticsEngine.predict(telemetry)

@app.post("/api/copilot/chat", response_model=CopilotQueryResponse)
def copilot_chat(request: CopilotQueryRequest):
    """
    Executes the Agentic Maintenance Copilot ReAct workflow:
    - Analyzes telemetry context
    - Executes tools (query telemetry, RAG vector search, synthesis)
    - Returns multi-step reasoning trace and grounded OEM citations
    """
    return AgenticMaintenanceCopilot.process_query(request)

@app.get("/api/rag/documents", response_model=List[RAGDocumentSchema])
def get_rag_documents():
    """
    Retrieves all indexed OEM technical manuals and historical work order logs.
    """
    return RAGKnowledgeStore.get_all_documents()

@app.post("/api/rag/search", response_model=List[RAGSearchResult])
def search_rag(request: RAGSearchRequest):
    """
    Executes semantic vector similarity search across OEM manuals.
    """
    return RAGKnowledgeStore.search(
        query=request.query,
        category=request.category,
        limit=request.limit or 5
    )

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

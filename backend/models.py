from pydantic import BaseModel
from typing import Optional


class AnalyzeRequest(BaseModel):
    product: str


class EvidenceItem(BaseModel):
    claim: str
    source: str
    url: Optional[str] = None
    confidence: float  # 0.0 - 1.0


class DimensionScore(BaseModel):
    name: str
    score: float  # 0 - 10
    confidence: str  # "high" | "medium" | "low" | "insufficient_data"
    evidence: list[EvidenceItem]


class Alternative(BaseModel):
    name: str
    brand: str
    reason: str


class SustainabilityReport(BaseModel):
    product: str
    brand: str
    category: str
    overall_score: float
    dimensions: list[DimensionScore]
    alternatives: list[Alternative]
    summary: str


class AgentEvent(BaseModel):
    type: str  # "thinking" | "searching" | "reading" | "scoring" | "done" | "error"
    message: str
    data: Optional[dict] = None


class HistoryEntry(BaseModel):
    id: int
    product: str
    report: SustainabilityReport
    timestamp: float  # Unix epoch seconds

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


def _normalize_context(item: Any) -> dict[str, Any]:
    """Coerce a single context item to a dict with at least a 'text' key.

    Accepts:
    - str  → {"text": str}
    - dict → returned as-is
    """
    if isinstance(item, str):
        return {"text": item}
    if isinstance(item, dict):
        return item
    raise ValueError(f"Context item must be a string or dict, got {type(item).__name__}")


# ---------------------------------------------------------------------------
# EvaluationResult sub-schema (used inside RAGObservationResponse)
# ---------------------------------------------------------------------------


class EvaluationResultResponse(BaseModel):
    evaluation_result_id: uuid.UUID
    trace_id: uuid.UUID
    rag_observation_id: uuid.UUID | None
    span_id: uuid.UUID | None
    metric: str
    score: float | None
    reason: str | None
    source: str
    evaluator: str | None
    judge_version: str | None
    status: str
    error: str | None
    metadata: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# RAGObservation request / response schemas
# ---------------------------------------------------------------------------


class RAGObservationCreate(BaseModel):
    question: str = Field(..., min_length=1, examples=["What is the capital of France?"])
    answer: str = Field(..., min_length=1, examples=["The capital of France is Paris."])
    model: str | None = Field(default=None, examples=["gpt-4o"])
    contexts: list[str | dict[str, Any]] = Field(
        default_factory=list,
        examples=[[{"text": "Paris is the capital city of France.", "score": 0.97}]],
    )
    latency_ms: int | None = Field(default=None, ge=0, examples=[342])
    usage: dict[str, Any] | None = Field(
        default=None,
        examples=[{"prompt_tokens": 120, "completion_tokens": 40, "total_tokens": 160}],
    )
    reference_answer: str | None = Field(default=None, examples=["Paris"])
    metadata: dict[str, Any] | None = Field(default=None)
    auto_evaluate: bool = Field(
        default=False,
        description=(
            "When true, the heuristic judge runs synchronously and evaluation "
            "results are returned in the response. Set false to skip evaluation."
        ),
    )
    create_spans: bool = Field(
        default=False,
        description="Reserved for future use. Span creation not yet implemented.",
    )

    @field_validator("contexts", mode="before")
    @classmethod
    def normalize_contexts(cls, v: list) -> list[dict[str, Any]]:
        return [_normalize_context(item) for item in v]


class RAGObservationResponse(BaseModel):
    rag_observation_id: uuid.UUID
    trace_id: uuid.UUID
    question: str
    answer: str
    model: str | None
    contexts: list[dict[str, Any]]
    latency_ms: int | None
    usage: dict[str, Any] | None
    reference_answer: str | None
    metadata: dict[str, Any] | None
    evaluation_status: str
    created_at: datetime
    evaluations: list[EvaluationResultResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class RAGObservationListResponse(BaseModel):
    items: list[RAGObservationResponse]
    total: int

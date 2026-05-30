import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EvaluationCreate(BaseModel):
    relevance_score: float = Field(..., ge=0.0, le=1.0, examples=[0.85])
    faithfulness_score: float = Field(..., ge=0.0, le=1.0, examples=[0.91])
    groundedness_score: float = Field(..., ge=0.0, le=1.0, examples=[0.78])
    notes: str | None = Field(default=None, examples=["Retrieval was on-topic but answer hallucinated one date."])


class EvaluationResponse(BaseModel):
    evaluation_id: uuid.UUID
    trace_id: uuid.UUID
    relevance_score: float
    faithfulness_score: float
    groundedness_score: float
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class EvaluationListResponse(BaseModel):
    items: list[EvaluationResponse]
    total: int

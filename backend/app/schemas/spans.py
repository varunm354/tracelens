import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

SpanKind = Literal["retrieval", "llm", "tool", "evaluation", "function"]


class SpanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["retrieve_chunks"])
    kind: SpanKind = Field(..., examples=["retrieval"])
    start_time: datetime | None = Field(default=None)
    end_time: datetime | None = Field(default=None)
    metadata: dict[str, Any] | None = Field(default=None)


class SpanResponse(BaseModel):
    span_id: uuid.UUID
    trace_id: uuid.UUID
    name: str
    kind: str
    start_time: datetime | None
    end_time: datetime | None
    metadata: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SpanListResponse(BaseModel):
    items: list[SpanResponse]
    total: int

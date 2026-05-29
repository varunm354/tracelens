import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TraceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["rag.answer_question"])
    metadata: dict[str, Any] | None = Field(
        default=None,
        examples=[{"user_id": "u_123", "env": "production"}],
    )


class TraceResponse(BaseModel):
    trace_id: uuid.UUID
    name: str
    metadata: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}

"""
Lightweight return types for SDK methods.

These mirror the API response shapes but carry no Pydantic dependency —
just plain dataclasses so callers get attribute access and IDE completion.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class TraceData:
    trace_id: uuid.UUID
    name: str
    metadata: dict[str, Any] | None
    created_at: datetime


@dataclass
class SpanData:
    span_id: uuid.UUID
    trace_id: uuid.UUID
    name: str
    kind: str
    start_time: datetime | None
    end_time: datetime | None
    metadata: dict[str, Any] | None
    created_at: datetime


@dataclass
class EvaluationData:
    evaluation_id: uuid.UUID
    trace_id: uuid.UUID
    relevance_score: float
    faithfulness_score: float
    groundedness_score: float
    notes: str | None
    created_at: datetime

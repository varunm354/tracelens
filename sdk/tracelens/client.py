"""
TraceLensClient — thin HTTP wrapper around the TraceLens API.

All methods are synchronous and raise TraceLensError on non-2xx responses.
Async support and automatic retry/batching are intentional future additions
(see FUTURE HOOK comments).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

import requests

from tracelens.types import EvaluationData, SpanData, TraceData


class TraceLensError(Exception):
    """Raised when the TraceLens API returns a non-2xx response."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"TraceLens API error {status_code}: {detail}")


class TraceLensClient:
    """
    HTTP client for the TraceLens API.

    Usage::

        client = TraceLensClient(base_url="http://localhost:8000")
        trace = client.create_trace(name="rag.answer_question")
        span  = client.create_span(trace_id=trace.trace_id, name="retrieve", kind="retrieval")
        eval_ = client.create_evaluation(trace_id=trace.trace_id, relevance_score=0.9, ...)

    FUTURE HOOK — background flush queue:
        Replace _post() with a queue.Queue that a background thread drains in batches.
        The public API stays identical; callers never need to know.
    """

    def __init__(self, base_url: str = "http://localhost:8000", timeout: int = 10) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        # FUTURE HOOK — inject auth headers here (e.g. api_key param → Authorization header)
        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        resp = self._session.post(url, json=payload, timeout=self.timeout)
        if not resp.ok:
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            raise TraceLensError(resp.status_code, detail)
        return resp.json()

    @staticmethod
    def _iso(dt: datetime | None) -> str | None:
        return dt.isoformat() if dt is not None else None

    # ------------------------------------------------------------------
    # Traces
    # ------------------------------------------------------------------

    def create_trace(
        self,
        name: str,
        metadata: dict[str, Any] | None = None,
    ) -> TraceData:
        """Create a new trace and return its data."""
        body: dict[str, Any] = {"name": name}
        if metadata is not None:
            body["metadata"] = metadata
        data = self._post("/v1/traces", body)
        return TraceData(
            trace_id=uuid.UUID(data["trace_id"]),
            name=data["name"],
            metadata=data.get("metadata"),
            created_at=datetime.fromisoformat(data["created_at"]),
        )

    # ------------------------------------------------------------------
    # Spans
    # ------------------------------------------------------------------

    def create_span(
        self,
        trace_id: uuid.UUID | str,
        name: str,
        kind: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> SpanData:
        """Add a span to an existing trace."""
        body: dict[str, Any] = {"name": name, "kind": kind}
        if start_time is not None:
            body["start_time"] = self._iso(start_time)
        if end_time is not None:
            body["end_time"] = self._iso(end_time)
        if metadata is not None:
            body["metadata"] = metadata
        data = self._post(f"/v1/traces/{trace_id}/spans", body)
        return SpanData(
            span_id=uuid.UUID(data["span_id"]),
            trace_id=uuid.UUID(data["trace_id"]),
            name=data["name"],
            kind=data["kind"],
            start_time=datetime.fromisoformat(data["start_time"]) if data.get("start_time") else None,
            end_time=datetime.fromisoformat(data["end_time"]) if data.get("end_time") else None,
            metadata=data.get("metadata"),
            created_at=datetime.fromisoformat(data["created_at"]),
        )

    # ------------------------------------------------------------------
    # Evaluations
    # ------------------------------------------------------------------

    def create_evaluation(
        self,
        trace_id: uuid.UUID | str,
        relevance_score: float,
        faithfulness_score: float,
        groundedness_score: float,
        notes: str | None = None,
    ) -> EvaluationData:
        """Attach an evaluation to an existing trace."""
        body: dict[str, Any] = {
            "relevance_score": relevance_score,
            "faithfulness_score": faithfulness_score,
            "groundedness_score": groundedness_score,
        }
        if notes is not None:
            body["notes"] = notes
        data = self._post(f"/v1/traces/{trace_id}/evaluations", body)
        return EvaluationData(
            evaluation_id=uuid.UUID(data["evaluation_id"]),
            trace_id=uuid.UUID(data["trace_id"]),
            relevance_score=data["relevance_score"],
            faithfulness_score=data["faithfulness_score"],
            groundedness_score=data["groundedness_score"],
            notes=data.get("notes"),
            created_at=datetime.fromisoformat(data["created_at"]),
        )

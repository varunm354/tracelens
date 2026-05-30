"""
trace() — context manager for instrumenting a block of code as a TraceLens trace.

Usage::

    client = TraceLensClient(base_url="http://localhost:8000")

    with trace("rag.answer_question", client=client, metadata={"user_id": "u_1"}) as t:
        # t.trace_id is available here for creating child spans
        span = client.create_span(t.trace_id, name="retrieve", kind="retrieval")
        ...

FUTURE HOOK — active trace context:
    Replace the explicit `client` parameter with a module-level configured client
    (set via tracelens.init()), and use a contextvars.ContextVar to hold the active
    trace so nested helpers can call create_span() without passing trace_id explicitly.
    This is the natural next step toward decorator-based auto-instrumentation.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from tracelens.client import TraceLensClient
    from tracelens.types import TraceData


class trace:
    """
    Context manager that creates a trace on entry and makes its data available
    inside the block. Does not suppress exceptions.

    Args:
        name:     Trace name, e.g. ``"rag.answer_question"``.
        client:   A configured ``TraceLensClient`` instance.
        metadata: Optional dict of arbitrary tags (user_id, session_id, env, …).
    """

    def __init__(
        self,
        name: str,
        client: TraceLensClient,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.name = name
        self.client = client
        self.metadata = metadata
        self._trace_data: TraceData | None = None

    # Expose trace_id directly on the context manager so callers can write
    # `t.trace_id` rather than `t._trace_data.trace_id`.
    @property
    def trace_id(self):
        if self._trace_data is None:
            raise RuntimeError("trace_id is not available before entering the context manager")
        return self._trace_data.trace_id

    @property
    def data(self) -> TraceData:
        if self._trace_data is None:
            raise RuntimeError("trace data is not available before entering the context manager")
        return self._trace_data

    def __enter__(self) -> trace:
        self._trace_data = self.client.create_trace(
            name=self.name,
            metadata=self.metadata,
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        # FUTURE HOOK — on exit, patch the trace with status ("ok" / "error")
        # and duration once the backend supports PATCH /v1/traces/{id}.
        # exc_type is not None when the block raised an exception.
        return None  # do not suppress exceptions

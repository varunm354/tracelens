"""
tracelens — Python SDK for TraceLens.

Quickstart::

    from tracelens import TraceLensClient
    from tracelens.trace import trace

    client = TraceLensClient(base_url="http://localhost:8000")

    with trace("rag.answer_question", client=client) as t:
        span = client.create_span(t.trace_id, name="retrieve", kind="retrieval")
        eval_ = client.create_evaluation(
            t.trace_id,
            relevance_score=0.9,
            faithfulness_score=0.85,
            groundedness_score=0.88,
        )
"""

from tracelens.client import TraceLensClient, TraceLensError
from tracelens.types import EvaluationData, SpanData, TraceData

__all__ = [
    "TraceLensClient",
    "TraceLensError",
    "TraceData",
    "SpanData",
    "EvaluationData",
]

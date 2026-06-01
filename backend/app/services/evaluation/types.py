"""Shared types for the evaluation service layer.

MetricResult carries the output of a single judge metric.
RAGJudge is a Protocol that any judge implementation must satisfy —
swap HeuristicRAGJudge for an LLM-backed judge in Phase 9.3B without touching
the runner or route.
"""

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class MetricResult:
    """Output of one evaluated metric for a single RAG observation."""

    metric: str
    score: float
    reason: str
    source: str = "generated"
    evaluator: str = "heuristic"
    judge_version: str = "heuristic_v0"
    status: str = "complete"
    error: str | None = None
    metadata: dict[str, Any] | None = field(default=None)


class RAGJudge(Protocol):
    """Replaceable judge interface.

    Implementations must expose `evaluator`, `judge_version`, and `evaluate()`.
    Both HeuristicRAGJudge (Phase 9.3A) and any future LLM judge (Phase 9.3B)
    must satisfy this protocol without requiring explicit inheritance.
    """

    evaluator: str
    judge_version: str

    def evaluate(
        self,
        question: str,
        contexts: list[dict[str, Any]],
        answer: str,
    ) -> list[MetricResult]:
        """Return one MetricResult per metric, in a deterministic order."""
        ...

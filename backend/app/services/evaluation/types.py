"""Shared types for the evaluation service layer.

MetricResult carries the output of a single judge metric.
RAGJudge is a Protocol that any judge implementation must satisfy —
both HeuristicRAGJudge and LLMRAGJudge implement it via duck-typing.

Protocol signature uses optional kwargs so new arguments (reference_answer,
metadata) can be added without breaking existing implementations.
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
    `reference_answer` and `metadata` are optional so the protocol remains
    backward-compatible as the signature evolves.
    """

    evaluator: str
    judge_version: str

    def evaluate(
        self,
        question: str,
        contexts: list[dict[str, Any]],
        answer: str,
        reference_answer: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> list[MetricResult]:
        """Return one MetricResult per metric, in a deterministic order."""
        ...

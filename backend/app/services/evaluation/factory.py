"""Judge factory and FallbackRAGJudge.

build_judge(name, settings) is the single entry-point for resolving a judge
from a string name.  Unknown names fall back to heuristic — the app never
hard-fails simply because a judge name was unrecognised.

FallbackRAGJudge wraps a primary and a fallback judge.  On primary failure it
runs the fallback and annotates every MetricResult.metadata with:
  fallback_used: True / False
  fallback_reason: short reason code (only present when fallback_used=True)

This keeps the runner and route completely unaware of which judge ran.
"""

import dataclasses
import logging
from typing import Any

from app.services.evaluation.heuristic_judge import HeuristicRAGJudge
from app.services.evaluation.llm_judge import LLMRAGJudge
from app.services.evaluation.types import MetricResult, RAGJudge

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _annotate(
    results: list[MetricResult],
    *,
    fallback_used: bool,
    fallback_reason: str | None = None,
) -> list[MetricResult]:
    """Return a new list of MetricResults with fallback provenance injected."""
    annotated = []
    for r in results:
        extra: dict[str, Any] = {"fallback_used": fallback_used}
        if fallback_reason is not None:
            extra["fallback_reason"] = fallback_reason
        merged = {**(r.metadata or {}), **extra}
        annotated.append(dataclasses.replace(r, metadata=merged))
    return annotated


def _reason_code(exc: Exception) -> str:
    """Extract a short, loggable reason code from an exception."""
    msg = str(exc)
    # Truncate very long error messages so they fit cleanly in JSONB
    return msg[:200] if len(msg) <= 200 else msg[:197] + "..."


# ------------------------------------------------------------------
# FallbackRAGJudge
# ------------------------------------------------------------------


class FallbackRAGJudge:
    """Wraps a primary judge with a heuristic fallback.

    On any exception from the primary:
    - logs a warning (not exception — the error is expected/handled)
    - runs the fallback judge
    - annotates every MetricResult.metadata with fallback_used=True

    On primary success:
    - annotates every MetricResult.metadata with fallback_used=False

    evaluator and judge_version reflect the *primary* judge so the intent
    is visible; actual per-row provenance lives in MetricResult.evaluator.
    """

    evaluator: str = "fallback"
    judge_version: str = "fallback_v1"

    def __init__(self, primary: RAGJudge, fallback: RAGJudge) -> None:
        self.primary = primary
        self.fallback = fallback
        # Surface primary identity for logging
        self.evaluator = getattr(primary, "evaluator", "fallback")
        self.judge_version = getattr(primary, "judge_version", "fallback_v1")

    def evaluate(
        self,
        question: str,
        contexts: list[dict[str, Any]],
        answer: str,
        reference_answer: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> list[MetricResult]:
        kwargs: dict[str, Any] = dict(
            question=question,
            contexts=contexts,
            answer=answer,
            reference_answer=reference_answer,
            metadata=metadata,
        )
        try:
            results = self.primary.evaluate(**kwargs)
            return _annotate(results, fallback_used=False)
        except Exception as exc:
            reason = _reason_code(exc)
            logger.warning(
                "Primary judge %s failed (%s); falling back to %s",
                self.primary.__class__.__name__,
                reason,
                self.fallback.__class__.__name__,
            )
            results = self.fallback.evaluate(**kwargs)
            return _annotate(results, fallback_used=True, fallback_reason=reason)


# ------------------------------------------------------------------
# Factory
# ------------------------------------------------------------------


def build_judge(name: str | None, settings: Any = None) -> RAGJudge:
    """Resolve a judge by name.

    Args:
        name:     "heuristic" | "llm" | None.  Anything unrecognised is
                  treated as "heuristic" so the app never crashes on a
                  misconfigured env var.
        settings: Optional Settings instance; fetched via get_settings() if
                  omitted.  Passed explicitly in tests to avoid lru_cache.

    Returns:
        A RAGJudge implementation.
    """
    if name == "llm":
        if settings is None:
            from app.config import get_settings  # noqa: PLC0415

            settings = get_settings()
        return FallbackRAGJudge(
            primary=LLMRAGJudge(
                model=settings.tracelens_llm_judge_model,
                timeout_seconds=settings.tracelens_llm_judge_timeout_seconds,
                api_key=settings.openai_api_key,
            ),
            fallback=HeuristicRAGJudge(),
        )

    if name not in (None, "heuristic"):
        logger.warning("Unknown judge name %r — using heuristic judge", name)

    return HeuristicRAGJudge()

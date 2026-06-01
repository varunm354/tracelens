"""Evaluation runner: load a RAGObservation, invoke the judge, persist results.

The runner owns the write path for evaluation_results and the
evaluation_status lifecycle on rag_observations.

Lifecycle:
  "skipped"  — set by the ingest route when auto_evaluate=False
  "running"  — set optimistically by run_rag_evaluation before the judge fires
  "complete" — set on success
  "failed"   — set when the judge raises past the fallback safety net

Judge resolution order (most-specific wins):
  1. Explicit `judge=` kwarg  (test injection / direct callers)
  2. build_judge(judge_name)  (request-level override, e.g. body.judge="llm")
  3. build_judge(settings.tracelens_eval_judge)  (env-configured default)

The runner does NOT commit.  Transaction management is the caller's (route's)
responsibility; this keeps the function simple and testable in isolation.
"""

import logging
import uuid

from sqlalchemy.orm import Session

from app.models.evaluation_result import EvaluationResult
from app.models.rag_observation import RAGObservation
from app.services.evaluation.factory import build_judge
from app.services.evaluation.types import RAGJudge

logger = logging.getLogger(__name__)


def run_rag_evaluation(
    db: Session,
    rag_observation_id: uuid.UUID,
    *,
    judge: RAGJudge | None = None,
    judge_name: str | None = None,
) -> list[EvaluationResult]:
    """Run a judge against the named RAGObservation and persist metric rows.

    Args:
        db:                  Active SQLAlchemy session.  Caller must commit.
        rag_observation_id:  PK of the target RAGObservation.
        judge:               Explicit RAGJudge instance (tests / direct callers).
                             When provided, judge_name is ignored.
        judge_name:          "heuristic" | "llm" | None.  When None the env
                             default (tracelens_eval_judge) is used.

    Returns:
        List of EvaluationResult ORM objects added to the session.
        On catastrophic failure the list contains a single failed row.

    Raises:
        ValueError: If the RAGObservation is not found in the session.
    """
    obs: RAGObservation | None = db.get(RAGObservation, rag_observation_id)
    if obs is None:
        raise ValueError(f"RAGObservation {rag_observation_id} not found")

    # Resolve judge: explicit injection beats factory lookup.
    if judge is None:
        from app.config import get_settings  # noqa: PLC0415 — lazy to avoid circularity

        settings = get_settings()
        resolved_name = judge_name or settings.tracelens_eval_judge
        judge = build_judge(resolved_name, settings=settings)

    obs.evaluation_status = "running"
    db.flush()

    try:
        metric_results = judge.evaluate(
            question=obs.question,
            contexts=obs.contexts or [],
            answer=obs.answer,
            reference_answer=obs.reference_answer,
        )
    except Exception as exc:
        logger.exception(
            "Judge %s failed for rag_observation %s", judge.__class__.__name__, obs.id
        )
        obs.evaluation_status = "failed"
        failed = EvaluationResult(
            id=uuid.uuid4(),
            trace_id=obs.trace_id,
            rag_observation_id=obs.id,
            metric="overall",
            score=None,
            reason=None,
            source="generated",
            evaluator=getattr(judge, "evaluator", None),
            judge_version=getattr(judge, "judge_version", None),
            status="failed",
            error=str(exc),
        )
        db.add(failed)
        return [failed]

    rows: list[EvaluationResult] = []
    for mr in metric_results:
        er = EvaluationResult(
            id=uuid.uuid4(),
            trace_id=obs.trace_id,
            rag_observation_id=obs.id,
            metric=mr.metric,
            score=mr.score,
            reason=mr.reason,
            source=mr.source,
            evaluator=mr.evaluator,
            judge_version=mr.judge_version,
            status=mr.status,
            error=mr.error,
            metadata_=mr.metadata,
        )
        db.add(er)
        rows.append(er)

    obs.evaluation_status = "complete"
    return rows

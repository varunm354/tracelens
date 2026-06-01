"""Evaluation runner: load a RAGObservation, invoke the judge, persist results.

The runner owns the write path for evaluation_results and the
evaluation_status lifecycle on rag_observations.

Lifecycle:
  "skipped"  — set by the ingest route when auto_evaluate=False
  "running"  — set optimistically by run_rag_evaluation before the judge fires
  "complete" — set on success
  "failed"   — set when the judge raises an unexpected exception

The runner does NOT commit.  Transaction management is the caller's (route's)
responsibility; this keeps the function simple and testable in isolation.
"""

import logging
import uuid

from sqlalchemy.orm import Session

from app.models.evaluation_result import EvaluationResult
from app.models.rag_observation import RAGObservation
from app.services.evaluation.heuristic_judge import HeuristicRAGJudge
from app.services.evaluation.types import RAGJudge

logger = logging.getLogger(__name__)

# Module-level judge singleton.  Swap this for an LLM judge in Phase 9.3B
# by replacing the instance or injecting a different RAGJudge implementation.
_default_judge: RAGJudge = HeuristicRAGJudge()


def run_rag_evaluation(
    db: Session,
    rag_observation_id: uuid.UUID,
    *,
    judge: RAGJudge = _default_judge,
) -> list[EvaluationResult]:
    """Run *judge* against the named RAGObservation and persist metric rows.

    Args:
        db: Active SQLAlchemy session.  Caller must commit after this returns.
        rag_observation_id: PK of the target RAGObservation.
        judge: RAGJudge implementation (defaults to the heuristic judge).

    Returns:
        List of EvaluationResult ORM objects added to the session.
        On judge failure the list contains a single failed EvaluationResult.

    Raises:
        ValueError: If the RAGObservation is not found in the session.
    """
    obs: RAGObservation | None = db.get(RAGObservation, rag_observation_id)
    if obs is None:
        raise ValueError(f"RAGObservation {rag_observation_id} not found")

    obs.evaluation_status = "running"
    db.flush()

    try:
        metric_results = judge.evaluate(
            question=obs.question,
            contexts=obs.contexts or [],
            answer=obs.answer,
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

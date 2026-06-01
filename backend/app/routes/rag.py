import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models.evaluation_result import EvaluationResult
from app.models.rag_observation import RAGObservation
from app.models.trace import Trace
from app.schemas.rag import (
    EvaluationResultResponse,
    RAGObservationCreate,
    RAGObservationListResponse,
    RAGObservationResponse,
)
from app.services.evaluation.runner import run_rag_evaluation

router = APIRouter(prefix="/v1/traces/{trace_id}/rag", tags=["rag"])


def _require_trace(trace_id: uuid.UUID, db: Session) -> Trace:
    trace = db.get(Trace, trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    return trace


def _eval_result_to_response(er: EvaluationResult) -> EvaluationResultResponse:
    return EvaluationResultResponse(
        evaluation_result_id=er.id,
        trace_id=er.trace_id,
        rag_observation_id=er.rag_observation_id,
        span_id=er.span_id,
        metric=er.metric,
        score=er.score,
        reason=er.reason,
        source=er.source,
        evaluator=er.evaluator,
        judge_version=er.judge_version,
        status=er.status,
        error=er.error,
        metadata=er.metadata_,
        created_at=er.created_at,
    )


def _to_response(obs: RAGObservation) -> RAGObservationResponse:
    return RAGObservationResponse(
        rag_observation_id=obs.id,
        trace_id=obs.trace_id,
        question=obs.question,
        answer=obs.answer,
        model=obs.model,
        contexts=obs.contexts or [],
        latency_ms=obs.latency_ms,
        usage=obs.usage,
        reference_answer=obs.reference_answer,
        metadata=obs.metadata_,
        evaluation_status=obs.evaluation_status,
        created_at=obs.created_at,
        evaluations=[_eval_result_to_response(er) for er in obs.evaluation_results],
    )


@router.post(
    "",
    response_model=RAGObservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a RAG observation",
    description=(
        "Store a question/answer/context tuple for a trace. "
        "When `auto_evaluate=true` the configured judge runs synchronously and "
        "evaluation results are included in the response. "
        "Use `judge` to override the default judge for this request. "
        "`create_spans` is reserved for a future phase. "
        "Returns 404 if the trace does not exist."
    ),
)
def create_rag_observation(
    trace_id: uuid.UUID,
    body: RAGObservationCreate,
    db: Session = Depends(get_db),
) -> RAGObservationResponse:
    _require_trace(trace_id, db)
    obs = RAGObservation(
        id=uuid.uuid4(),
        trace_id=trace_id,
        question=body.question,
        answer=body.answer,
        model=body.model,
        contexts=body.contexts,
        latency_ms=body.latency_ms,
        usage=body.usage,
        reference_answer=body.reference_answer,
        metadata_=body.metadata,
        evaluation_status="skipped",
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)

    if body.auto_evaluate:
        judge_name = body.judge or get_settings().tracelens_eval_judge
        run_rag_evaluation(db, obs.id, judge_name=judge_name)
        db.commit()
        db.refresh(obs)

    return _to_response(obs)


@router.get(
    "",
    response_model=RAGObservationListResponse,
    summary="List RAG observations for a trace",
    description=(
        "Return all RAG observations for a trace ordered oldest to newest. "
        "Each observation includes any linked evaluation results. "
        "Returns 404 if the trace does not exist."
    ),
)
def list_rag_observations(
    trace_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> RAGObservationListResponse:
    _require_trace(trace_id, db)
    total = db.scalar(
        select(func.count())
        .select_from(RAGObservation)
        .where(RAGObservation.trace_id == trace_id)
    )
    rows = db.scalars(
        select(RAGObservation)
        .where(RAGObservation.trace_id == trace_id)
        .order_by(RAGObservation.created_at.asc())
    ).all()
    return RAGObservationListResponse(
        items=[_to_response(obs) for obs in rows],
        total=total or 0,
    )

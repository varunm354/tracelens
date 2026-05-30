import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.evaluation import Evaluation
from app.models.trace import Trace
from app.schemas.evaluations import EvaluationCreate, EvaluationListResponse, EvaluationResponse

router = APIRouter(prefix="/v1/traces/{trace_id}/evaluations", tags=["evaluations"])


def _require_trace(trace_id: uuid.UUID, db: Session) -> Trace:
    trace = db.get(Trace, trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    return trace


def _to_response(ev: Evaluation) -> EvaluationResponse:
    return EvaluationResponse(
        evaluation_id=ev.id,
        trace_id=ev.trace_id,
        relevance_score=ev.relevance_score,
        faithfulness_score=ev.faithfulness_score,
        groundedness_score=ev.groundedness_score,
        notes=ev.notes,
        created_at=ev.created_at,
    )


@router.post(
    "",
    response_model=EvaluationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an evaluation",
    description="Attach an evaluation to an existing trace. Returns 404 if the trace does not exist.",
)
def create_evaluation(
    trace_id: uuid.UUID,
    body: EvaluationCreate,
    db: Session = Depends(get_db),
) -> EvaluationResponse:
    _require_trace(trace_id, db)
    ev = Evaluation(
        id=uuid.uuid4(),
        trace_id=trace_id,
        relevance_score=body.relevance_score,
        faithfulness_score=body.faithfulness_score,
        groundedness_score=body.groundedness_score,
        notes=body.notes,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return _to_response(ev)


@router.get(
    "",
    response_model=EvaluationListResponse,
    summary="List evaluations for a trace",
    description="Return all evaluations for a trace ordered oldest to newest. Returns 404 if the trace does not exist.",
)
def list_evaluations(
    trace_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> EvaluationListResponse:
    _require_trace(trace_id, db)
    total = db.scalar(
        select(func.count()).select_from(Evaluation).where(Evaluation.trace_id == trace_id)
    )
    rows = db.scalars(
        select(Evaluation)
        .where(Evaluation.trace_id == trace_id)
        .order_by(Evaluation.created_at.asc())
    ).all()
    return EvaluationListResponse(
        items=[_to_response(ev) for ev in rows],
        total=total or 0,
    )

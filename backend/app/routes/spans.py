import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.span import Span
from app.models.trace import Trace
from app.schemas.spans import SpanCreate, SpanListResponse, SpanResponse

router = APIRouter(prefix="/v1/traces/{trace_id}/spans", tags=["spans"])


def _require_trace(trace_id: uuid.UUID, db: Session) -> Trace:
    trace = db.get(Trace, trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    return trace


def _to_response(span: Span) -> SpanResponse:
    return SpanResponse(
        span_id=span.id,
        trace_id=span.trace_id,
        name=span.name,
        kind=span.kind,
        start_time=span.start_time,
        end_time=span.end_time,
        metadata=span.metadata_,
        created_at=span.created_at,
    )


@router.post(
    "",
    response_model=SpanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a span",
    description="Add a span to an existing trace. Returns 404 if the trace does not exist.",
)
def create_span(
    trace_id: uuid.UUID,
    body: SpanCreate,
    db: Session = Depends(get_db),
) -> SpanResponse:
    _require_trace(trace_id, db)
    span = Span(
        id=uuid.uuid4(),
        trace_id=trace_id,
        name=body.name,
        kind=body.kind,
        start_time=body.start_time,
        end_time=body.end_time,
        metadata_=body.metadata,
    )
    db.add(span)
    db.commit()
    db.refresh(span)
    return _to_response(span)


@router.get(
    "",
    response_model=SpanListResponse,
    summary="List spans for a trace",
    description="Return all spans for a trace ordered by created_at ascending. Returns 404 if the trace does not exist.",
)
def list_spans(
    trace_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> SpanListResponse:
    _require_trace(trace_id, db)
    total = db.scalar(
        select(func.count()).select_from(Span).where(Span.trace_id == trace_id)
    )
    rows = db.scalars(
        select(Span).where(Span.trace_id == trace_id).order_by(Span.created_at.asc())
    ).all()
    return SpanListResponse(
        items=[_to_response(s) for s in rows],
        total=total or 0,
    )

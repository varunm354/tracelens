import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.trace import Trace
from app.schemas.traces import TraceCreate, TraceListResponse, TraceResponse

router = APIRouter(prefix="/v1/traces", tags=["traces"])


def _to_response(trace: Trace) -> TraceResponse:
    return TraceResponse(
        trace_id=trace.id,
        name=trace.name,
        metadata=trace.metadata_,
        created_at=trace.created_at,
    )


@router.post(
    "",
    response_model=TraceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a trace",
    description="Ingest a new trace. Returns the server-assigned trace ID.",
)
def create_trace(body: TraceCreate, db: Session = Depends(get_db)) -> TraceResponse:
    trace = Trace(
        id=uuid.uuid4(),
        name=body.name,
        metadata_=body.metadata,
    )
    db.add(trace)
    db.commit()
    db.refresh(trace)
    return _to_response(trace)


@router.get(
    "",
    response_model=TraceListResponse,
    summary="List traces",
    description="Return traces ordered newest first. Paginate with `limit` and `offset`.",
)
def list_traces(
    limit: int = Query(default=20, ge=1, le=100, description="Max results to return (1–100)"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
) -> TraceListResponse:
    total = db.scalar(select(func.count()).select_from(Trace))
    rows = db.scalars(
        select(Trace).order_by(Trace.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return TraceListResponse(
        items=[_to_response(t) for t in rows],
        total=total or 0,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{trace_id}",
    response_model=TraceResponse,
    summary="Get a trace",
    description="Return a single trace by UUID. Returns 404 if not found.",
)
def get_trace(trace_id: uuid.UUID, db: Session = Depends(get_db)) -> TraceResponse:
    trace = db.get(Trace, trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    return _to_response(trace)

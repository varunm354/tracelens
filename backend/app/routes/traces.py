import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.trace import Trace
from app.schemas.traces import TraceCreate, TraceResponse

router = APIRouter(prefix="/v1/traces", tags=["traces"])


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

    return TraceResponse(
        trace_id=trace.id,
        name=trace.name,
        metadata=trace.metadata_,
        created_at=trace.created_at,
    )

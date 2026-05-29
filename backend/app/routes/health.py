from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings
from app.db import check_db_connection

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    environment: str
    database: str
    version: str


@router.get("/healthz", response_model=HealthResponse)
def healthz() -> HealthResponse:
    """Liveness + readiness check. Returns 200 if the app and DB are reachable."""
    db_ok = check_db_connection()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        environment=get_settings().environment,
        database="connected" if db_ok else "unreachable",
        version="0.1.0",
    )

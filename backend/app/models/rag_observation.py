import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.evaluation_result import EvaluationResult
    from app.models.trace import Trace


class RAGObservation(Base):
    __tablename__ = "rag_observations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    trace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("traces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contexts: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usage: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reference_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    evaluation_status: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="skipped",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    trace: Mapped["Trace"] = relationship("Trace", back_populates="rag_observations")
    evaluation_results: Mapped[list["EvaluationResult"]] = relationship(
        "EvaluationResult",
        back_populates="rag_observation",
        cascade="all, delete-orphan",
        foreign_keys="EvaluationResult.rag_observation_id",
    )

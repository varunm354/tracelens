from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


def _build_engine():
    settings = get_settings()
    return create_engine(
        settings.db_url,
        pool_pre_ping=True,   # reconnect gracefully after Postgres restarts
        pool_size=5,
        max_overflow=10,
        echo=settings.is_development,
    )


engine = _build_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models (imported here so Alembic can discover them)."""


def create_tables() -> None:
    """Create all tables that are not yet present in the database.

    Called once at startup. Safe to call repeatedly — SQLAlchemy skips tables
    that already exist. Alembic will take over schema migrations in a later phase.
    """
    # Import every model module so their Table objects are registered on Base.metadata
    # before create_all() runs.
    import app.models.trace  # noqa: F401
    import app.models.span   # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Returns True if a simple SELECT 1 succeeds, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

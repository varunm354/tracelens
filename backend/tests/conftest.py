"""Pytest configuration for TraceLens backend tests.

Tests require a running PostgreSQL instance.  By default they connect to the
development database (postgresql+psycopg2://tracelens:tracelens@localhost:5432/tracelens).
Override the connection string by setting the TEST_DATABASE_URL environment
variable before running pytest.

All tables are created once per session (idempotent via create_all).  Each
test that modifies data should rely on the `client` fixture, which wraps the
session used by FastAPI dependency injection so that inserted rows can be
inspected within the test.  The `_clean_tables` autouse fixture truncates all
tables after every test so subsequent tests start with a clean slate.
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Must be set before the app module tree is imported so that get_settings()
# and its @lru_cache pick up the right DATABASE_URL on first call.
_TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://tracelens:tracelens@localhost:5432/tracelens",
)
os.environ["DATABASE_URL"] = _TEST_DB_URL

from app.db import Base, get_db  # noqa: E402 — must follow env-var assignment
from app.main import app  # noqa: E402

_engine = create_engine(_TEST_DB_URL, pool_pre_ping=True)
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

# Tables to truncate between tests (children before parents to respect FKs).
_TRUNCATE_TABLES = (
    "evaluation_results",
    "rag_observations",
    "evaluations",
    "spans",
    "traces",
)


@pytest.fixture(scope="session", autouse=True)
def _setup_schema():
    """Create all tables once for the test session."""
    import app.models.evaluation  # noqa: F401
    import app.models.evaluation_result  # noqa: F401
    import app.models.rag_observation  # noqa: F401
    import app.models.span  # noqa: F401
    import app.models.trace  # noqa: F401

    Base.metadata.create_all(bind=_engine)
    yield


@pytest.fixture()
def db(_setup_schema):
    """Yield a SQLAlchemy session for the current test."""
    session = _TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _clean_tables(db):
    """Truncate all data tables after each test."""
    yield
    tables = ", ".join(_TRUNCATE_TABLES)
    db.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))
    db.commit()


@pytest.fixture()
def client(db):
    """FastAPI TestClient whose routes share the test DB session."""

    def _override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

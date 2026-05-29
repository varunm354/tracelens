# TraceLens — Backend

FastAPI backend for the TraceLens observability platform.

## Requirements

- Python 3.11+
- PostgreSQL 16 (or run via Docker Compose)

## Local development (recommended — Docker Compose)

```bash
# From the repo root:
cp .env.example .env          # edit if needed
docker compose up --build
```

The API will be available at <http://localhost:8000>.

| URL | Description |
|-----|-------------|
| `GET /healthz` | Liveness + DB connectivity check |
| `GET /docs` | Swagger UI |
| `GET /redoc` | ReDoc |

---

## Local development (without Docker)

### 1. Start Postgres

```bash
# Requires Docker
docker run --rm -d \
  --name tracelens-db \
  -e POSTGRES_USER=tracelens \
  -e POSTGRES_PASSWORD=tracelens \
  -e POSTGRES_DB=tracelens \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Install dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

### 3. Configure environment

```bash
cp ../.env.example .env
# Open .env and set POSTGRES_HOST=localhost
```

### 4. Run the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Project structure

```
backend/
├── Dockerfile
├── pyproject.toml
└── app/
    ├── main.py          # FastAPI app factory + middleware
    ├── config.py        # pydantic-settings — reads from .env
    ├── db.py            # SQLAlchemy engine, session, Base, get_db()
    └── routes/
        └── health.py    # GET /healthz
```

## Running tests

```bash
pytest
```

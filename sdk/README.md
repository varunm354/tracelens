# tracelens Python SDK

> For a product overview, architecture diagram, and quick start, see the [root README](../README.md).

Python SDK for [TraceLens](https://github.com/varunmohanraj/tracelens) — observability and evaluation for RAG and AI agent systems.

## Installation

```bash
pip install -e .   # from sdk/ directory (local dev)
```

## Quickstart

```python
from tracelens import TraceLensClient
from tracelens.trace import trace

client = TraceLensClient(base_url="http://localhost:8000")

with trace("rag.answer_question", client=client, metadata={"user_id": "u_1"}) as t:
    span = client.create_span(
        trace_id=t.trace_id,
        name="retrieve_chunks",
        kind="retrieval",
        metadata={"top_k": 5},
    )
    eval_ = client.create_evaluation(
        trace_id=t.trace_id,
        relevance_score=0.92,
        faithfulness_score=0.88,
        groundedness_score=0.95,
        notes="Grounded and on-topic.",
    )
```

## Requirements

- Python 3.10+
- A running TraceLens backend (`docker compose up` from repo root)

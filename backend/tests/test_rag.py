"""Tests for Phase 9.1/9.2 — RAG observation ingest and read endpoints.

Test cases:
1.  POST creates a RAG observation successfully (minimal fields).
2.  POST creates a RAG observation with all optional fields.
3.  POST returns 404 for a missing trace.
4.  POST validates required fields (question and answer).
5.  POST accepts structured context dicts.
6.  POST accepts string contexts and normalises them to {"text": ...}.
7.  POST accepts a mixed list of string and dict contexts.
8.  POST always sets evaluation_status to "skipped" (ignores auto_evaluate).
9.  GET returns all RAG observations for a trace.
10. GET returns an empty list for a trace with no observations.
11. GET returns 404 for a missing trace.
12. Existing trace/span/evaluation routes are unaffected (smoke test).
"""

import uuid

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_trace(client, name: str = "test.trace") -> dict:
    resp = client.post("/v1/traces", json={"name": name})
    assert resp.status_code == 201
    return resp.json()


def _post_rag(client, trace_id: str, payload: dict) -> dict:
    return client.post(f"/v1/traces/{trace_id}/rag", json=payload)


_MINIMAL_PAYLOAD = {
    "question": "What is the capital of France?",
    "answer": "Paris.",
}

_FULL_PAYLOAD = {
    "question": "Who wrote Hamlet?",
    "answer": "William Shakespeare wrote Hamlet.",
    "model": "gpt-4o",
    "contexts": [
        {"text": "Hamlet is a tragedy written by William Shakespeare.", "score": 0.97},
        {"text": "It was written around 1600.", "score": 0.85},
    ],
    "latency_ms": 312,
    "usage": {"prompt_tokens": 100, "completion_tokens": 30, "total_tokens": 130},
    "reference_answer": "Shakespeare",
    "metadata": {"session_id": "abc123"},
    "auto_evaluate": True,
    "create_spans": False,
}


# ---------------------------------------------------------------------------
# POST /v1/traces/{trace_id}/rag
# ---------------------------------------------------------------------------


def test_post_rag_minimal(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _MINIMAL_PAYLOAD)

    assert resp.status_code == 201
    data = resp.json()

    assert "rag_observation_id" in data
    assert data["trace_id"] == trace["trace_id"]
    assert data["question"] == _MINIMAL_PAYLOAD["question"]
    assert data["answer"] == _MINIMAL_PAYLOAD["answer"]
    assert data["evaluation_status"] == "skipped"
    assert data["evaluations"] == []
    assert data["contexts"] == []
    assert data["model"] is None
    assert data["latency_ms"] is None


def test_post_rag_all_fields(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _FULL_PAYLOAD)

    assert resp.status_code == 201
    data = resp.json()

    assert data["model"] == "gpt-4o"
    assert data["latency_ms"] == 312
    assert data["usage"] == _FULL_PAYLOAD["usage"]
    assert data["reference_answer"] == "Shakespeare"
    assert data["metadata"] == {"session_id": "abc123"}
    assert len(data["contexts"]) == 2
    assert data["contexts"][0]["text"] == "Hamlet is a tragedy written by William Shakespeare."
    assert data["evaluation_status"] == "skipped"


def test_post_rag_missing_trace(client):
    missing_id = str(uuid.uuid4())
    resp = _post_rag(client, missing_id, _MINIMAL_PAYLOAD)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Trace not found"


def test_post_rag_missing_question(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], {"answer": "Paris."})
    assert resp.status_code == 422


def test_post_rag_missing_answer(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], {"question": "What is Paris?"})
    assert resp.status_code == 422


def test_post_rag_empty_question(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], {"question": "", "answer": "Paris."})
    assert resp.status_code == 422


def test_post_rag_structured_context_dicts(client):
    trace = _create_trace(client)
    contexts = [
        {"text": "Paris is in France.", "score": 0.99, "source": "wiki"},
        {"text": "France is a country in western Europe.", "score": 0.75},
    ]
    resp = _post_rag(
        client,
        trace["trace_id"],
        {**_MINIMAL_PAYLOAD, "contexts": contexts},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["contexts"] == contexts


def test_post_rag_string_contexts_normalised(client):
    trace = _create_trace(client)
    resp = _post_rag(
        client,
        trace["trace_id"],
        {**_MINIMAL_PAYLOAD, "contexts": ["Paris is in France.", "France is in Europe."]},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["contexts"] == [
        {"text": "Paris is in France."},
        {"text": "France is in Europe."},
    ]


def test_post_rag_mixed_contexts(client):
    trace = _create_trace(client)
    resp = _post_rag(
        client,
        trace["trace_id"],
        {
            **_MINIMAL_PAYLOAD,
            "contexts": [
                "plain string context",
                {"text": "already a dict", "score": 0.9},
            ],
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["contexts"] == [
        {"text": "plain string context"},
        {"text": "already a dict", "score": 0.9},
    ]


def test_post_rag_auto_evaluate_true_still_skipped(client):
    """auto_evaluate=True must not trigger a judge — evaluation_status stays 'skipped'."""
    trace = _create_trace(client)
    resp = _post_rag(
        client,
        trace["trace_id"],
        {**_MINIMAL_PAYLOAD, "auto_evaluate": True},
    )
    assert resp.status_code == 201
    assert resp.json()["evaluation_status"] == "skipped"
    assert resp.json()["evaluations"] == []


# ---------------------------------------------------------------------------
# GET /v1/traces/{trace_id}/rag
# ---------------------------------------------------------------------------


def test_get_rag_returns_observations(client):
    trace = _create_trace(client)
    tid = trace["trace_id"]

    _post_rag(client, tid, {**_MINIMAL_PAYLOAD, "question": "Q1"})
    _post_rag(client, tid, {**_MINIMAL_PAYLOAD, "question": "Q2"})

    resp = client.get(f"/v1/traces/{tid}/rag")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total"] == 2
    assert len(data["items"]) == 2
    questions = {item["question"] for item in data["items"]}
    assert questions == {"Q1", "Q2"}


def test_get_rag_empty_for_trace_without_observations(client):
    trace = _create_trace(client)
    resp = client.get(f"/v1/traces/{trace['trace_id']}/rag")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_get_rag_missing_trace(client):
    missing_id = str(uuid.uuid4())
    resp = client.get(f"/v1/traces/{missing_id}/rag")
    assert resp.status_code == 404


def test_get_rag_observations_include_evaluations_field(client):
    trace = _create_trace(client)
    _post_rag(client, trace["trace_id"], _MINIMAL_PAYLOAD)

    resp = client.get(f"/v1/traces/{trace['trace_id']}/rag")
    assert resp.status_code == 200
    item = resp.json()["items"][0]
    assert "evaluations" in item
    assert item["evaluations"] == []


def test_get_rag_ordered_oldest_first(client):
    trace = _create_trace(client)
    tid = trace["trace_id"]

    for i in range(3):
        _post_rag(client, tid, {**_MINIMAL_PAYLOAD, "question": f"Q{i}"})

    resp = client.get(f"/v1/traces/{tid}/rag")
    assert resp.status_code == 200
    questions = [item["question"] for item in resp.json()["items"]]
    assert questions == ["Q0", "Q1", "Q2"]


# ---------------------------------------------------------------------------
# Smoke — existing routes still work
# ---------------------------------------------------------------------------


def test_existing_trace_routes_unaffected(client):
    resp = client.get("/v1/traces")
    assert resp.status_code == 200
    assert "items" in resp.json()


def test_existing_span_routes_unaffected(client):
    trace = _create_trace(client)
    resp = client.post(
        f"/v1/traces/{trace['trace_id']}/spans",
        json={"name": "retrieve", "kind": "retrieval"},
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "retrieve"


def test_existing_evaluation_routes_unaffected(client):
    trace = _create_trace(client)
    resp = client.post(
        f"/v1/traces/{trace['trace_id']}/evaluations",
        json={
            "relevance_score": 0.9,
            "faithfulness_score": 0.8,
            "groundedness_score": 0.7,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["relevance_score"] == pytest.approx(0.9)

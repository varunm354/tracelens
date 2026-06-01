"""Tests for Phase 9.1/9.2/9.3A — RAG observation ingest, read, and evaluation.

Phase 9.1/9.2 cases (unchanged):
1.  POST creates a RAG observation successfully (minimal fields).
2.  POST creates a RAG observation with all optional fields.
3.  POST returns 404 for a missing trace.
4.  POST validates required fields (question and answer).
5.  POST accepts structured context dicts.
6.  POST accepts string contexts and normalises them to {"text": ...}.
7.  POST accepts a mixed list of string and dict contexts.
8.  POST with auto_evaluate=False → evaluation_status="skipped", evaluations=[].
9.  GET returns all RAG observations for a trace.
10. GET returns an empty list for a trace with no observations.
11. GET returns 404 for a missing trace.
12. GET includes an evaluations field (empty when not auto-evaluated).
13. GET returns observations ordered oldest-first.

Phase 9.3A cases (new):
14. auto_evaluate=True → evaluation_status="complete".
15. auto_evaluate=True → evaluations list has 4 rows (one per metric).
16. Metric names are exactly {context_relevance, faithfulness, answer_quality, overall}.
17. All scores are floats in [0, 1].
18. All reasons are non-empty strings.
19. Each result carries evaluator="heuristic", judge_version="heuristic_v0", source="generated".
20. With overlapping contexts, context_relevance and faithfulness are > 0.
21. With no contexts, context_relevance and faithfulness scores are 0.
22. GET returns observations with their evaluation results included.
23. Existing trace/span/evaluation routes are unaffected (smoke test).

Unit-level heuristic judge tests (no DB required):
24. HeuristicRAGJudge returns four metrics.
25. Scores are deterministic for the same inputs.
26. Scores are clamped to [0, 1].
"""

import uuid

import pytest

from app.services.evaluation.heuristic_judge import HeuristicRAGJudge


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_trace(client, name: str = "test.trace") -> dict:
    resp = client.post("/v1/traces", json={"name": name})
    assert resp.status_code == 201
    return resp.json()


def _post_rag(client, trace_id: str, payload: dict):
    return client.post(f"/v1/traces/{trace_id}/rag", json=payload)


# Payload without auto_evaluate — always skipped.
_MINIMAL_PAYLOAD = {
    "question": "What is the capital of France?",
    "answer": "Paris.",
}

# Payload *with* auto_evaluate=True and rich contexts — produces complete results.
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

# Dedicated evaluation payload — richer contexts for overlap assertions.
_EVAL_PAYLOAD = {
    "question": "Who wrote Hamlet?",
    "answer": "William Shakespeare wrote Hamlet.",
    "contexts": [
        {"text": "Hamlet is a tragedy written by William Shakespeare."},
        {"text": "William Shakespeare was an English playwright born in Stratford."},
    ],
    "auto_evaluate": True,
}

_EXPECTED_METRICS = {"context_relevance", "faithfulness", "answer_quality", "overall"}


# ---------------------------------------------------------------------------
# Phase 9.1/9.2 — POST /v1/traces/{trace_id}/rag
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
    """_FULL_PAYLOAD includes auto_evaluate=True so status is now 'complete'."""
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
    # auto_evaluate=True → judge ran → complete
    assert data["evaluation_status"] == "complete"
    assert len(data["evaluations"]) == 4


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
    assert resp.json()["contexts"] == contexts


def test_post_rag_string_contexts_normalised(client):
    trace = _create_trace(client)
    resp = _post_rag(
        client,
        trace["trace_id"],
        {**_MINIMAL_PAYLOAD, "contexts": ["Paris is in France.", "France is in Europe."]},
    )
    assert resp.status_code == 201
    assert resp.json()["contexts"] == [
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
    assert resp.json()["contexts"] == [
        {"text": "plain string context"},
        {"text": "already a dict", "score": 0.9},
    ]


def test_post_rag_auto_evaluate_false_is_skipped(client):
    """auto_evaluate=False (default) → evaluation_status stays 'skipped'."""
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _MINIMAL_PAYLOAD)
    assert resp.status_code == 201
    assert resp.json()["evaluation_status"] == "skipped"
    assert resp.json()["evaluations"] == []


# ---------------------------------------------------------------------------
# Phase 9.1/9.2 — GET /v1/traces/{trace_id}/rag
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
# Phase 9.3A — auto_evaluate=True triggers heuristic judge
# ---------------------------------------------------------------------------


def test_auto_evaluate_true_status_complete(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _EVAL_PAYLOAD)
    assert resp.status_code == 201
    assert resp.json()["evaluation_status"] == "complete"


def test_auto_evaluate_true_returns_four_metrics(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _EVAL_PAYLOAD)
    assert resp.status_code == 201
    evaluations = resp.json()["evaluations"]
    assert len(evaluations) == 4


def test_auto_evaluate_metric_names(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _EVAL_PAYLOAD)
    names = {e["metric"] for e in resp.json()["evaluations"]}
    assert names == _EXPECTED_METRICS


def test_auto_evaluate_scores_are_in_range(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _EVAL_PAYLOAD)
    for ev in resp.json()["evaluations"]:
        assert isinstance(ev["score"], float), f"score for {ev['metric']} is not a float"
        assert 0.0 <= ev["score"] <= 1.0, f"score {ev['score']} out of range for {ev['metric']}"


def test_auto_evaluate_reasons_non_empty(client):
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _EVAL_PAYLOAD)
    for ev in resp.json()["evaluations"]:
        assert ev["reason"], f"empty reason for metric {ev['metric']}"


def test_auto_evaluate_provenance_fields(client):
    """source, evaluator, judge_version must match the heuristic judge constants."""
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _EVAL_PAYLOAD)
    for ev in resp.json()["evaluations"]:
        assert ev["source"] == "generated"
        assert ev["evaluator"] == "heuristic"
        assert ev["judge_version"] == "heuristic_v0"
        assert ev["status"] == "complete"


def test_auto_evaluate_with_contexts_nonzero_overlap_scores(client):
    """When contexts share terms with question/answer, overlap scores must be > 0."""
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _EVAL_PAYLOAD)
    by_metric = {e["metric"]: e["score"] for e in resp.json()["evaluations"]}
    assert by_metric["context_relevance"] > 0.0, "expected context_relevance > 0"
    assert by_metric["faithfulness"] > 0.0, "expected faithfulness > 0"
    assert by_metric["overall"] > 0.0, "expected overall > 0"


def test_auto_evaluate_no_contexts_zero_context_and_faithfulness(client):
    """With no contexts, context_relevance and faithfulness must both be 0."""
    trace = _create_trace(client)
    resp = _post_rag(
        client,
        trace["trace_id"],
        {**_MINIMAL_PAYLOAD, "contexts": [], "auto_evaluate": True},
    )
    assert resp.status_code == 201
    by_metric = {e["metric"]: e["score"] for e in resp.json()["evaluations"]}
    assert by_metric["context_relevance"] == 0.0
    assert by_metric["faithfulness"] == 0.0


def test_get_rag_includes_evaluations_after_auto_eval(client):
    """GET must return the persisted evaluation_results for an auto-evaluated obs."""
    trace = _create_trace(client)
    tid = trace["trace_id"]
    _post_rag(client, tid, _EVAL_PAYLOAD)

    resp = client.get(f"/v1/traces/{tid}/rag")
    assert resp.status_code == 200
    item = resp.json()["items"][0]
    assert item["evaluation_status"] == "complete"
    assert len(item["evaluations"]) == 4
    names = {e["metric"] for e in item["evaluations"]}
    assert names == _EXPECTED_METRICS


def test_get_rag_mixed_skipped_and_evaluated(client):
    """GET must return correct evaluations per-observation when the trace has both kinds."""
    trace = _create_trace(client)
    tid = trace["trace_id"]

    _post_rag(client, tid, _MINIMAL_PAYLOAD)         # skipped
    _post_rag(client, tid, _EVAL_PAYLOAD)            # complete

    resp = client.get(f"/v1/traces/{tid}/rag")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2

    skipped_item = next(i for i in items if i["evaluation_status"] == "skipped")
    complete_item = next(i for i in items if i["evaluation_status"] == "complete")

    assert skipped_item["evaluations"] == []
    assert len(complete_item["evaluations"]) == 4


# ---------------------------------------------------------------------------
# Phase 9.3A — unit tests for HeuristicRAGJudge (no DB, no HTTP)
# ---------------------------------------------------------------------------


_JUDGE = HeuristicRAGJudge()
_Q = "Who wrote Hamlet?"
_A = "William Shakespeare wrote Hamlet."
_CTXS = [{"text": "Hamlet is a tragedy written by William Shakespeare."}]


def test_judge_returns_four_metrics():
    results = _JUDGE.evaluate(question=_Q, contexts=_CTXS, answer=_A)
    assert len(results) == 4
    assert {r.metric for r in results} == _EXPECTED_METRICS


def test_judge_is_deterministic():
    r1 = _JUDGE.evaluate(question=_Q, contexts=_CTXS, answer=_A)
    r2 = _JUDGE.evaluate(question=_Q, contexts=_CTXS, answer=_A)
    assert [(r.metric, r.score) for r in r1] == [(r.metric, r.score) for r in r2]


def test_judge_scores_clamped():
    results = _JUDGE.evaluate(question=_Q, contexts=_CTXS, answer=_A)
    for r in results:
        assert 0.0 <= r.score <= 1.0


def test_judge_empty_contexts_zero_overlap():
    results = _JUDGE.evaluate(question=_Q, contexts=[], answer=_A)
    by_metric = {r.metric: r for r in results}
    assert by_metric["context_relevance"].score == 0.0
    assert by_metric["faithfulness"].score == 0.0


def test_judge_high_overlap_high_scores():
    """A near-verbatim answer well-grounded in context should score highly."""
    question = "What language is Python?"
    answer = "Python is a high-level programming language."
    contexts = [{"text": "Python is a high-level programming language used in many domains."}]
    results = _JUDGE.evaluate(question=question, contexts=contexts, answer=answer)
    by_metric = {r.metric: r for r in results}
    assert by_metric["faithfulness"].score >= 0.5
    assert by_metric["overall"].score > 0.0


def test_judge_overall_is_weighted_average():
    """overall should be close to 0.35*cr + 0.35*f + 0.30*aq."""
    results = _JUDGE.evaluate(question=_Q, contexts=_CTXS, answer=_A)
    by_metric = {r.metric: r.score for r in results}
    expected = round(
        0.35 * by_metric["context_relevance"]
        + 0.35 * by_metric["faithfulness"]
        + 0.30 * by_metric["answer_quality"],
        2,
    )
    assert by_metric["overall"] == pytest.approx(expected, abs=0.01)


def test_judge_string_reason_non_empty():
    results = _JUDGE.evaluate(question=_Q, contexts=_CTXS, answer=_A)
    for r in results:
        assert isinstance(r.reason, str) and r.reason.strip()


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

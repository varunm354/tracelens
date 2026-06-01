"""Tests for Phase 9.3A — LLM judge, FallbackRAGJudge, factory, and prompts.

No network calls are made anywhere in this file.  The openai client is
replaced with a lightweight in-process mock that can be configured to return
valid JSON, malformed JSON, or raise exceptions.

Test index
----------
Unit — LLMRAGJudge (injected mock client):
 1. valid response → 4 MetricResults with correct evaluator / judge_version
 2. score clamping: >1.0 → 1.0, <0 → 0.0, rounded to 2dp
 3. invalid JSON → LLMJudgeError raised
 4. missing metric key → LLMJudgeError raised
 5. API exception (generic) → LLMJudgeError raised
 6. timeout-style exception → LLMJudgeError raised
 7. missing api_key (empty string) → LLMJudgeError raised

Unit — FallbackRAGJudge:
 8. primary succeeds → fallback_used=False in every metadata
 9. primary fails → heuristic results returned, fallback_used=True
10. fallback reason is propagated in metadata

Unit — build_judge / factory:
11. build_judge("heuristic") → HeuristicRAGJudge instance
12. build_judge("llm") → FallbackRAGJudge wrapping LLMRAGJudge
13. build_judge(unknown) → HeuristicRAGJudge (safe fallback)
14. build_judge(None) → HeuristicRAGJudge

Unit — prompts:
15. build_messages includes question, contexts, answer in user message
16. build_messages includes reference_answer when provided
17. build_messages omits reference section when reference_answer is None

Route-level integration (mocked build_judge via monkeypatch):
18. judge="llm" + working mock judge → evaluation_status="complete", evaluator="llm"
19. judge="llm" + judge raises → FallbackRAGJudge falls back; fallback_used=True
20. default path (body.judge omitted) → heuristic provenance
"""

import dataclasses
import json
import uuid

import pytest

from app.services.evaluation.factory import FallbackRAGJudge, build_judge
from app.services.evaluation.heuristic_judge import HeuristicRAGJudge
from app.services.evaluation.llm_judge import LLMJudgeError, LLMRAGJudge
from app.services.evaluation.prompts import METRICS, PROMPT_VERSION, build_messages
from app.services.evaluation.types import MetricResult


# ---------------------------------------------------------------------------
# Mock OpenAI client
# ---------------------------------------------------------------------------

_VALID_LLM_JSON = json.dumps(
    {
        "context_relevance": {"score": 0.8, "reason": "Context is relevant."},
        "faithfulness": {"score": 0.9, "reason": "Answer is grounded."},
        "answer_quality": {"score": 0.7, "reason": "Answer is clear."},
        "overall": {"score": 0.8, "reason": "Good overall."},
    }
)

_CLAMPING_LLM_JSON = json.dumps(
    {
        "context_relevance": {"score": 1.5, "reason": "Over max."},
        "faithfulness": {"score": -0.2, "reason": "Under min."},
        "answer_quality": {"score": 0.55555, "reason": "Needs rounding."},
        "overall": {"score": 0.0, "reason": "Zero is valid."},
    }
)


class _MockCompletion:
    """Minimal stand-in for openai.ChatCompletion."""

    def __init__(self, content: str) -> None:
        self.choices = [_MockChoice(content)]


class _MockChoice:
    def __init__(self, content: str) -> None:
        self.message = _MockMessage(content)


class _MockMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _MockCompletions:
    def __init__(self, content: str | None = None, exc: Exception | None = None) -> None:
        self._content = content
        self._exc = exc

    def create(self, **_kwargs) -> _MockCompletion:
        if self._exc is not None:
            raise self._exc
        return _MockCompletion(self._content or "")


class _MockChat:
    def __init__(self, content: str | None = None, exc: Exception | None = None) -> None:
        self.completions = _MockCompletions(content=content, exc=exc)


class MockOpenAIClient:
    """Fake openai.OpenAI that returns a fixed completion or raises."""

    def __init__(self, content: str | None = None, exc: Exception | None = None) -> None:
        self.chat = _MockChat(content=content, exc=exc)


def _llm_judge(content: str | None = None, exc: Exception | None = None) -> LLMRAGJudge:
    """Build an LLMRAGJudge with an injected mock client."""
    return LLMRAGJudge(
        model="gpt-4.1-mini",
        timeout_seconds=5,
        api_key="test-key",
        client=MockOpenAIClient(content=content, exc=exc),
    )


# Shared evaluate kwargs used across judge tests.
_EVAL_KWARGS = dict(
    question="Who wrote Hamlet?",
    contexts=[{"text": "Hamlet is a tragedy by William Shakespeare."}],
    answer="William Shakespeare wrote Hamlet.",
)


# ---------------------------------------------------------------------------
# 1–7  LLMRAGJudge unit tests
# ---------------------------------------------------------------------------


def test_llm_valid_response_returns_four_metrics():
    results = _llm_judge(_VALID_LLM_JSON).evaluate(**_EVAL_KWARGS)
    assert len(results) == 4
    assert {r.metric for r in results} == set(METRICS)


def test_llm_valid_response_evaluator_and_version():
    results = _llm_judge(_VALID_LLM_JSON).evaluate(**_EVAL_KWARGS)
    for r in results:
        assert r.evaluator == "llm"
        assert r.judge_version == "openai_v1"
        assert r.source == "generated"
        assert r.status == "complete"


def test_llm_valid_response_metadata_provenance():
    results = _llm_judge(_VALID_LLM_JSON).evaluate(**_EVAL_KWARGS)
    for r in results:
        assert r.metadata is not None
        assert r.metadata["judge_type"] == "llm"
        assert r.metadata["model"] == "gpt-4.1-mini"
        assert r.metadata["prompt_version"] == PROMPT_VERSION


def test_llm_score_clamping_and_rounding():
    results = _llm_judge(_CLAMPING_LLM_JSON).evaluate(**_EVAL_KWARGS)
    by_metric = {r.metric: r.score for r in results}
    assert by_metric["context_relevance"] == 1.0   # 1.5 clamped
    assert by_metric["faithfulness"] == 0.0         # -0.2 clamped
    assert by_metric["answer_quality"] == 0.56      # 0.55555 rounded to 2dp
    assert by_metric["overall"] == 0.0              # exact zero


def test_llm_invalid_json_raises():
    with pytest.raises(LLMJudgeError, match="invalid_json"):
        _llm_judge("this is not json").evaluate(**_EVAL_KWARGS)


def test_llm_missing_metric_raises():
    partial = json.dumps(
        {
            "context_relevance": {"score": 0.5, "reason": "ok"},
            # faithfulness, answer_quality, overall missing
        }
    )
    with pytest.raises(LLMJudgeError, match="missing_metric"):
        _llm_judge(partial).evaluate(**_EVAL_KWARGS)


def test_llm_api_exception_raises():
    with pytest.raises(LLMJudgeError, match="api_error"):
        _llm_judge(exc=RuntimeError("connection refused")).evaluate(**_EVAL_KWARGS)


def test_llm_timeout_raises():
    class _FakeTimeoutError(Exception):
        pass

    with pytest.raises(LLMJudgeError):
        _llm_judge(exc=_FakeTimeoutError("timed out")).evaluate(**_EVAL_KWARGS)


def test_llm_missing_api_key_raises():
    judge = LLMRAGJudge(model="gpt-4.1-mini", timeout_seconds=5, api_key="")
    with pytest.raises(LLMJudgeError, match="missing_api_key"):
        judge.evaluate(**_EVAL_KWARGS)


# ---------------------------------------------------------------------------
# 8–10  FallbackRAGJudge unit tests
# ---------------------------------------------------------------------------


def test_fallback_success_annotates_fallback_false():
    primary = _llm_judge(_VALID_LLM_JSON)
    judge = FallbackRAGJudge(primary=primary, fallback=HeuristicRAGJudge())
    results = judge.evaluate(**_EVAL_KWARGS)
    assert all(r.metadata is not None for r in results)
    assert all(r.metadata["fallback_used"] is False for r in results)


def test_fallback_on_primary_failure_uses_heuristic():
    primary = _llm_judge(exc=RuntimeError("boom"))
    judge = FallbackRAGJudge(primary=primary, fallback=HeuristicRAGJudge())
    results = judge.evaluate(**_EVAL_KWARGS)
    # FallbackRAGJudge ran heuristic — evaluator comes from heuristic MetricResult
    assert len(results) == 4
    assert all(r.metadata is not None for r in results)
    assert all(r.metadata["fallback_used"] is True for r in results)


def test_fallback_reason_is_annotated():
    primary = _llm_judge(exc=RuntimeError("deliberate failure"))
    judge = FallbackRAGJudge(primary=primary, fallback=HeuristicRAGJudge())
    results = judge.evaluate(**_EVAL_KWARGS)
    for r in results:
        assert "fallback_reason" in r.metadata
        assert "deliberate failure" in r.metadata["fallback_reason"]


def test_fallback_success_preserves_llm_evaluator():
    primary = _llm_judge(_VALID_LLM_JSON)
    judge = FallbackRAGJudge(primary=primary, fallback=HeuristicRAGJudge())
    results = judge.evaluate(**_EVAL_KWARGS)
    assert all(r.evaluator == "llm" for r in results)


def test_fallback_failure_preserves_heuristic_evaluator():
    primary = _llm_judge(exc=RuntimeError("fail"))
    judge = FallbackRAGJudge(primary=primary, fallback=HeuristicRAGJudge())
    results = judge.evaluate(**_EVAL_KWARGS)
    assert all(r.evaluator == "heuristic" for r in results)


# ---------------------------------------------------------------------------
# 11–14  build_judge / factory unit tests
# ---------------------------------------------------------------------------


class _FakeSettings:
    """Minimal settings stub for build_judge tests; avoids lru_cache."""

    openai_api_key = "sk-test"
    tracelens_llm_judge_model = "gpt-4.1-mini"
    tracelens_llm_judge_timeout_seconds = 5


def test_build_judge_heuristic_returns_heuristic():
    judge = build_judge("heuristic", settings=_FakeSettings())
    assert isinstance(judge, HeuristicRAGJudge)


def test_build_judge_llm_returns_fallback_wrapping_llm():
    judge = build_judge("llm", settings=_FakeSettings())
    assert isinstance(judge, FallbackRAGJudge)
    assert isinstance(judge.primary, LLMRAGJudge)
    assert isinstance(judge.fallback, HeuristicRAGJudge)


def test_build_judge_unknown_falls_back_to_heuristic():
    judge = build_judge("banana", settings=_FakeSettings())
    assert isinstance(judge, HeuristicRAGJudge)


def test_build_judge_none_falls_back_to_heuristic():
    judge = build_judge(None, settings=_FakeSettings())
    assert isinstance(judge, HeuristicRAGJudge)


def test_build_judge_empty_string_falls_back_to_heuristic():
    judge = build_judge("", settings=_FakeSettings())
    assert isinstance(judge, HeuristicRAGJudge)


# ---------------------------------------------------------------------------
# 15–17  prompts unit tests
# ---------------------------------------------------------------------------


def test_prompts_build_messages_structure():
    msgs = build_messages(question="Q", contexts=[], answer="A")
    assert len(msgs) == 2
    assert msgs[0]["role"] == "system"
    assert msgs[1]["role"] == "user"


def test_prompts_includes_question_and_answer():
    msgs = build_messages(question="What is X?", contexts=[], answer="X is Y.")
    user = msgs[1]["content"]
    assert "What is X?" in user
    assert "X is Y." in user


def test_prompts_includes_reference_answer_when_provided():
    msgs = build_messages(
        question="Q",
        contexts=[],
        answer="A",
        reference_answer="The gold standard answer.",
    )
    user = msgs[1]["content"]
    assert "The gold standard answer." in user
    assert "Reference Answer" in user


def test_prompts_omits_reference_answer_section_when_none():
    msgs = build_messages(question="Q", contexts=[], answer="A", reference_answer=None)
    user = msgs[1]["content"]
    assert "Reference Answer" not in user


def test_prompts_includes_context_text():
    msgs = build_messages(
        question="Q",
        contexts=[{"text": "Some relevant passage."}],
        answer="A",
    )
    user = msgs[1]["content"]
    assert "Some relevant passage." in user


def test_prompts_prompt_version_is_stable():
    assert PROMPT_VERSION == "rag_eval_v1"


# ---------------------------------------------------------------------------
# 18–20  Route-level integration tests (mocked build_judge)
# ---------------------------------------------------------------------------

# Shared helpers (mirrors test_rag.py helpers, kept local to this file)


def _create_trace(client, name: str = "test.trace") -> dict:
    resp = client.post("/v1/traces", json={"name": name})
    assert resp.status_code == 201
    return resp.json()


def _post_rag(client, trace_id: str, payload: dict):
    return client.post(f"/v1/traces/{trace_id}/rag", json=payload)


def _make_llm_judge_mock(content: str) -> FallbackRAGJudge:
    """Return a FallbackRAGJudge whose primary uses the mock LLM client."""
    return FallbackRAGJudge(
        primary=_llm_judge(content),
        fallback=HeuristicRAGJudge(),
    )


_ROUTE_PAYLOAD = {
    "question": "Who wrote Hamlet?",
    "answer": "William Shakespeare wrote Hamlet.",
    "contexts": [{"text": "Hamlet is a tragedy by William Shakespeare."}],
    "auto_evaluate": True,
    "judge": "llm",
}


def test_route_llm_judge_success(client, monkeypatch):
    """judge='llm' + working LLM mock → status='complete', evaluator='llm'."""
    mock_judge = _make_llm_judge_mock(_VALID_LLM_JSON)
    monkeypatch.setattr(
        "app.services.evaluation.runner.build_judge",
        lambda *_a, **_kw: mock_judge,
    )
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _ROUTE_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["evaluation_status"] == "complete"
    evaluations = data["evaluations"]
    assert len(evaluations) == 4
    assert all(e["evaluator"] == "llm" for e in evaluations)
    assert all(e["metadata"] is not None for e in evaluations)
    assert all(e["metadata"]["fallback_used"] is False for e in evaluations)


def test_route_llm_judge_fallback_on_failure(client, monkeypatch):
    """judge='llm' + failing LLM → FallbackRAGJudge uses heuristic, fallback_used=True."""
    failing_judge = FallbackRAGJudge(
        primary=_llm_judge(exc=RuntimeError("forced failure")),
        fallback=HeuristicRAGJudge(),
    )
    monkeypatch.setattr(
        "app.services.evaluation.runner.build_judge",
        lambda *_a, **_kw: failing_judge,
    )
    trace = _create_trace(client)
    resp = _post_rag(client, trace["trace_id"], _ROUTE_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["evaluation_status"] == "complete"
    evaluations = data["evaluations"]
    assert len(evaluations) == 4
    assert all(e["evaluator"] == "heuristic" for e in evaluations)
    assert all(e["metadata"]["fallback_used"] is True for e in evaluations)


def test_route_default_heuristic_path(client):
    """Omitting judge → heuristic runs; existing behaviour is preserved."""
    trace = _create_trace(client)
    resp = _post_rag(
        client,
        trace["trace_id"],
        {
            "question": "Who wrote Hamlet?",
            "answer": "William Shakespeare.",
            "contexts": [{"text": "Hamlet was written by Shakespeare."}],
            "auto_evaluate": True,
            # no judge field → default
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["evaluation_status"] == "complete"
    evaluations = data["evaluations"]
    assert len(evaluations) == 4
    assert all(e["evaluator"] == "heuristic" for e in evaluations)


def test_route_auto_evaluate_false_ignores_judge_field(client):
    """judge='llm' is irrelevant when auto_evaluate=False."""
    trace = _create_trace(client)
    resp = _post_rag(
        client,
        trace["trace_id"],
        {
            "question": "Q",
            "answer": "A",
            "auto_evaluate": False,
            "judge": "llm",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["evaluation_status"] == "skipped"
    assert data["evaluations"] == []

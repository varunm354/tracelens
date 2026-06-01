"""OpenAI-backed LLM RAG judge (Phase 9.3A).

LLMRAGJudge satisfies the RAGJudge Protocol.  It lazily imports the `openai`
package so the app starts even when `openai` is not installed.

All exceptional conditions (missing key, import failure, API errors, timeouts,
invalid or incomplete JSON) are raised as LLMJudgeError so callers —
specifically FallbackRAGJudge in factory.py — can react uniformly.

Design notes
------------
- openai is imported inside _client() to keep it optional.
- The injected `client` constructor arg allows tests to pass a mock without
  installing or calling openai at all.
- Scores are clamped to [0.0, 1.0] and rounded to 2 decimal places.
- Provenance (judge_type, model, prompt_version) is embedded in each
  MetricResult.metadata so it flows to evaluation_results.metadata_ without
  requiring any new DB columns.
"""

import json
import logging
from typing import Any

from app.services.evaluation.prompts import METRICS, PROMPT_VERSION, build_messages
from app.services.evaluation.types import MetricResult

logger = logging.getLogger(__name__)

EVALUATOR = "llm"
JUDGE_VERSION = "openai_v1"


class LLMJudgeError(Exception):
    """Raised for any condition that prevents LLM scoring from completing.

    The message is a short snake_case code suitable for logging and for
    the fallback_reason annotation in FallbackRAGJudge.
    """


class LLMRAGJudge:
    """OpenAI chat-completion judge.

    Attributes:
        evaluator:     Identifies the judge family in EvaluationResult rows.
        judge_version: Ties each result to a specific prompt + model contract.
    """

    evaluator: str = EVALUATOR
    judge_version: str = JUDGE_VERSION

    def __init__(
        self,
        *,
        model: str,
        timeout_seconds: int,
        api_key: str,
        client: Any = None,
    ) -> None:
        """
        Args:
            model:           OpenAI model identifier (e.g. "gpt-4.1-mini").
            timeout_seconds: HTTP timeout forwarded to the openai client.
            api_key:         OPENAI_API_KEY value (empty string → LLMJudgeError).
            client:          Optional pre-built client; skip openai import in tests.
        """
        self._model = model
        self._timeout_seconds = timeout_seconds
        self._api_key = api_key
        self._injected_client = client

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def evaluate(
        self,
        question: str,
        contexts: list[dict[str, Any]],
        answer: str,
        reference_answer: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> list[MetricResult]:
        """Call OpenAI and return one MetricResult per metric.

        Raises:
            LLMJudgeError: On any condition that prevents completion.
        """
        messages = build_messages(
            question=question,
            contexts=contexts,
            answer=answer,
            reference_answer=reference_answer,
        )
        content = self._call_api(messages)
        return self._parse(content)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _client(self) -> Any:
        """Return the openai client, building it lazily on first call."""
        if self._injected_client is not None:
            return self._injected_client

        if not self._api_key:
            raise LLMJudgeError("missing_api_key")

        try:
            import openai  # noqa: PLC0415
        except ImportError as exc:
            raise LLMJudgeError("openai_not_installed") from exc

        return openai.OpenAI(api_key=self._api_key, timeout=float(self._timeout_seconds))

    def _call_api(self, messages: list[dict[str, str]]) -> str:
        """Execute the chat completion and return the raw content string."""
        client = self._client()
        try:
            response = client.chat.completions.create(
                model=self._model,
                messages=messages,
                response_format={"type": "json_object"},
                timeout=float(self._timeout_seconds),
            )
            return response.choices[0].message.content
        except LLMJudgeError:
            raise
        except Exception as exc:
            # Classify by class name to avoid a hard openai import here.
            cls_name = type(exc).__name__
            if "Timeout" in cls_name:
                raise LLMJudgeError("timeout") from exc
            raise LLMJudgeError(f"api_error: {exc}") from exc

    def _parse(self, content: str) -> list[MetricResult]:
        """Parse the JSON string returned by the model into MetricResults."""
        try:
            raw = json.loads(content)
        except (json.JSONDecodeError, TypeError) as exc:
            raise LLMJudgeError(f"invalid_json: {exc}") from exc

        if not isinstance(raw, dict):
            raise LLMJudgeError("invalid_json: top-level value is not a JSON object")

        results: list[MetricResult] = []
        for metric in METRICS:
            if metric not in raw:
                raise LLMJudgeError(f"missing_metric: {metric}")

            entry = raw[metric]
            if not isinstance(entry, dict):
                raise LLMJudgeError(f"schema_error: {metric} value is not an object")

            if "score" not in entry:
                raise LLMJudgeError(f"schema_error: {metric}.score is missing")
            if "reason" not in entry:
                raise LLMJudgeError(f"schema_error: {metric}.reason is missing")

            try:
                raw_score = float(entry["score"])
            except (TypeError, ValueError) as exc:
                raise LLMJudgeError(f"schema_error: {metric}.score is not numeric") from exc

            score = round(max(0.0, min(1.0, raw_score)), 2)
            reason = str(entry["reason"]).strip() or f"Score: {score:.2f}"

            results.append(
                MetricResult(
                    metric=metric,
                    score=score,
                    reason=reason,
                    source="generated",
                    evaluator=self.evaluator,
                    judge_version=self.judge_version,
                    metadata={
                        "judge_type": "llm",
                        "model": self._model,
                        "prompt_version": PROMPT_VERSION,
                    },
                )
            )

        return results

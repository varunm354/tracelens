"""Deterministic heuristic RAG judge (Phase 9.3A).

Scores are computed via word-overlap between question, contexts, and answer.
No external API calls are made.  All results are reproducible for the same inputs.

Metrics produced (in order):
  context_relevance — how much of the question vocabulary appears in the contexts
  faithfulness      — how much of the answer is grounded in the contexts
  answer_quality    — answer length adequacy + overlap with question/context tokens
  overall           — weighted average (0.35 / 0.35 / 0.30)

Scoring details:
  _overlap_ratio(A, B) = |A ∩ B| / |A|   (recall-style, 0 when A is empty)
  All scores are clamped to [0.0, 1.0] and rounded to 2 decimal places.
  Stop-words are stripped before tokenisation to improve signal quality.
"""

import re
from typing import Any

from app.services.evaluation.types import MetricResult

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------

EVALUATOR = "heuristic"
JUDGE_VERSION = "heuristic_v0"

_STOPWORDS: frozenset[str] = frozenset(
    {
        "a", "an", "the",
        "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "shall", "can",
        "of", "in", "on", "at", "to", "for", "and", "or", "but", "nor",
        "it", "its", "that", "this", "with", "by", "from", "as", "not",
        "i", "you", "he", "she", "we", "they",
        "what", "which", "who", "how", "when", "where", "why",
    }
)

# Overall metric weights — must sum to 1.0.
_W_CONTEXT_RELEVANCE = 0.35
_W_FAITHFULNESS = 0.35
_W_ANSWER_QUALITY = 0.30

# answer_quality internal weights
_W_AQ_LENGTH = 0.40
_W_AQ_RELEVANCE = 0.60

# answer_quality length saturation point (number of meaningful tokens)
_AQ_LENGTH_SATURATION = 15


# ------------------------------------------------------------------
# Tokenisation helpers
# ------------------------------------------------------------------


def _tokens(text: str) -> set[str]:
    """Return lowercase alphabetic word tokens with stop-words removed."""
    words = re.findall(r"\b[a-z]+\b", text.lower())
    return {w for w in words if w not in _STOPWORDS}


def _context_tokens(contexts: list[dict[str, Any]]) -> set[str]:
    """Union of tokens from the 'text' field of each context dict."""
    combined = " ".join(c.get("text", "") for c in contexts if isinstance(c, dict))
    return _tokens(combined)


def _overlap_ratio(target: set[str], reference: set[str]) -> float:
    """Fraction of *target* tokens that appear in *reference*  (recall-style)."""
    if not target:
        return 0.0
    return len(target & reference) / len(target)


def _clamp(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 2)


def _band_reason(score: float, high: str, mid: str, low: str) -> str:
    if score >= 0.6:
        return high
    if score >= 0.3:
        return mid
    return low


# ------------------------------------------------------------------
# Judge
# ------------------------------------------------------------------


class HeuristicRAGJudge:
    """Deterministic word-overlap judge satisfying the RAGJudge protocol."""

    evaluator: str = EVALUATOR
    judge_version: str = JUDGE_VERSION

    def evaluate(
        self,
        question: str,
        contexts: list[dict[str, Any]],
        answer: str,
    ) -> list[MetricResult]:
        """Return four MetricResult objects: context_relevance, faithfulness,
        answer_quality, overall."""
        q_tok = _tokens(question)
        a_tok = _tokens(answer)
        ctx_tok = _context_tokens(contexts)
        has_ctx = bool(contexts)

        cr_score, cr_reason = self._context_relevance(q_tok, ctx_tok, has_ctx)
        f_score, f_reason = self._faithfulness(a_tok, ctx_tok, has_ctx)
        aq_score, aq_reason = self._answer_quality(q_tok, a_tok, ctx_tok)

        overall_raw = (
            _W_CONTEXT_RELEVANCE * cr_score
            + _W_FAITHFULNESS * f_score
            + _W_ANSWER_QUALITY * aq_score
        )
        ov_score = _clamp(overall_raw)
        ov_reason = (
            f"Weighted average of context_relevance ({cr_score:.2f}), "
            f"faithfulness ({f_score:.2f}), and answer_quality ({aq_score:.2f})."
        )

        def _r(metric: str, score: float, reason: str) -> MetricResult:
            return MetricResult(
                metric=metric,
                score=score,
                reason=reason,
                evaluator=self.evaluator,
                judge_version=self.judge_version,
            )

        return [
            _r("context_relevance", cr_score, cr_reason),
            _r("faithfulness", f_score, f_reason),
            _r("answer_quality", aq_score, aq_reason),
            _r("overall", ov_score, ov_reason),
        ]

    # ------------------------------------------------------------------
    # Per-metric helpers
    # ------------------------------------------------------------------

    def _context_relevance(
        self,
        q_tok: set[str],
        ctx_tok: set[str],
        has_ctx: bool,
    ) -> tuple[float, str]:
        if not has_ctx:
            return 0.0, "No context was provided to evaluate against."
        score = _clamp(_overlap_ratio(q_tok, ctx_tok))
        reason = _band_reason(
            score,
            high="The retrieved context shares many key terms with the question.",
            mid="The retrieved context shares some relevant terms with the question.",
            low="The retrieved context shares few terms with the question.",
        )
        return score, reason

    def _faithfulness(
        self,
        a_tok: set[str],
        ctx_tok: set[str],
        has_ctx: bool,
    ) -> tuple[float, str]:
        if not has_ctx:
            return 0.0, "No context was provided; faithfulness cannot be assessed."
        score = _clamp(_overlap_ratio(a_tok, ctx_tok))
        reason = _band_reason(
            score,
            high="The answer is well-supported by the retrieved context.",
            mid="The answer is partially supported by the retrieved context.",
            low="The answer has little support from the retrieved context.",
        )
        return score, reason

    def _answer_quality(
        self,
        q_tok: set[str],
        a_tok: set[str],
        ctx_tok: set[str],
    ) -> tuple[float, str]:
        length_factor = min(1.0, len(a_tok) / _AQ_LENGTH_SATURATION)
        all_ref = q_tok | ctx_tok
        relevance = _overlap_ratio(a_tok, all_ref)
        score = _clamp(_W_AQ_LENGTH * length_factor + _W_AQ_RELEVANCE * relevance)
        reason = _band_reason(
            score,
            high="The answer is clear and directly addresses the question.",
            mid="The answer addresses the question but could be more complete.",
            low="The answer is brief or does not clearly address the question.",
        )
        return score, reason

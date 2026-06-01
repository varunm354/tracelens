"""Prompt templates for the LLM RAG judge.

PROMPT_VERSION is embedded in every EvaluationResult.metadata so that score
comparisons across time are always tied to a specific prompt revision.

build_messages() returns an OpenAI-compatible messages list (system + user).
The system message enforces strict JSON-only output; the user message presents
the question, contexts, answer, and optionally a reference answer.
"""

from typing import Any

PROMPT_VERSION = "rag_eval_v1"

# Canonical metric order — parse and persist in this sequence.
METRICS: tuple[str, ...] = (
    "context_relevance",
    "faithfulness",
    "answer_quality",
    "overall",
)

_SYSTEM_MESSAGE = """\
You are a RAG (Retrieval-Augmented Generation) quality evaluator.
Your task is to evaluate a question-answering interaction and return a JSON \
object — nothing else, no preamble, no trailing text.

Score each metric as a float between 0.0 (worst) and 1.0 (best):

context_relevance
  How well do the retrieved context passages address the question?
  1.0 = the context directly and fully answers the question
  0.5 = the context is partially relevant
  0.0 = the context is irrelevant or absent

faithfulness
  How well is the answer grounded in and supported by the retrieved contexts?
  1.0 = every claim in the answer is fully supported by the context
  0.5 = the answer is partially supported; some claims lack context backing
  0.0 = the answer contradicts or ignores the context, or is entirely hallucinated

answer_quality
  How clear, complete, and useful is the answer for the given question?
  1.0 = the answer is clear, concise, and directly addresses the question
  0.5 = the answer is relevant but incomplete or unclear
  0.0 = the answer is empty, incoherent, or entirely off-topic

overall
  A holistic assessment of the RAG system quality for this interaction,
  taking all three dimensions into account.

Return ONLY the following JSON structure (no markdown fences, no other keys):
{
  "context_relevance": {"score": <float 0-1>, "reason": "<one sentence>"},
  "faithfulness":      {"score": <float 0-1>, "reason": "<one sentence>"},
  "answer_quality":    {"score": <float 0-1>, "reason": "<one sentence>"},
  "overall":           {"score": <float 0-1>, "reason": "<one sentence>"}
}
"""


def _format_contexts(contexts: list[dict[str, Any]]) -> str:
    if not contexts:
        return "(none)"
    parts = []
    for i, ctx in enumerate(contexts, start=1):
        text = ctx.get("text", "").strip()
        parts.append(f"[{i}] {text}" if text else f"[{i}] (empty)")
    return "\n".join(parts)


def build_messages(
    question: str,
    contexts: list[dict[str, Any]],
    answer: str,
    reference_answer: str | None = None,
) -> list[dict[str, str]]:
    """Return a two-element messages list suitable for the OpenAI chat API.

    Args:
        question:         The user question that was posed to the RAG system.
        contexts:         Retrieved context passages (list of dicts with 'text').
        answer:           The answer produced by the RAG system.
        reference_answer: Optional gold-standard answer for comparison.

    Returns:
        [{"role": "system", "content": ...}, {"role": "user", "content": ...}]
    """
    ctx_text = _format_contexts(contexts)

    user_parts = [
        f"Question:\n{question.strip()}",
        f"\nRetrieved Contexts:\n{ctx_text}",
        f"\nAnswer:\n{answer.strip()}",
    ]
    if reference_answer is not None:
        user_parts.append(f"\nReference Answer:\n{reference_answer.strip()}")

    user_parts.append(
        "\nPlease evaluate the RAG response using the four metrics defined in "
        "your instructions and return the JSON object."
    )

    return [
        {"role": "system", "content": _SYSTEM_MESSAGE},
        {"role": "user", "content": "\n".join(user_parts)},
    ]

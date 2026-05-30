"""
TraceLens SDK — quickstart example.

Simulates a minimal RAG pipeline:
  1. Create a trace for the whole request.
  2. Create a "retrieval" span representing the vector search step.
  3. Create an "llm" span representing the generation step.
  4. Attach an evaluation to the trace.

Run:
    # Start the backend first:
    #   docker compose up  (from repo root)

    cd sdk
    pip install -e .
    python ../examples/rag_quickstart/trace_example.py
"""

from __future__ import annotations

from datetime import datetime, timezone

from tracelens import TraceLensClient
from tracelens.trace import trace


def simulate_retrieval() -> list[str]:
    """Fake vector search — returns a list of chunk texts."""
    return [
        "RAG stands for Retrieval-Augmented Generation.",
        "It combines a retriever with a language model.",
    ]


def simulate_llm(question: str, chunks: list[str]) -> str:
    """Fake LLM call — echoes question and chunk count."""
    return f"Based on {len(chunks)} retrieved chunks, here is the answer to '{question}'."


def main() -> None:
    client = TraceLensClient(base_url="http://localhost:8000")

    question = "What is RAG?"

    with trace("rag.answer_question", client=client, metadata={"user_id": "u_demo"}) as t:
        print(f"Created trace: {t.trace_id}")

        # --- Retrieval span ---
        t0 = datetime.now(timezone.utc)
        chunks = simulate_retrieval()
        t1 = datetime.now(timezone.utc)

        retrieval_span = client.create_span(
            trace_id=t.trace_id,
            name="retrieve_chunks",
            kind="retrieval",
            start_time=t0,
            end_time=t1,
            metadata={"top_k": 2, "num_results": len(chunks)},
        )
        print(f"Created retrieval span: {retrieval_span.span_id}")

        # --- LLM span ---
        t2 = datetime.now(timezone.utc)
        answer = simulate_llm(question, chunks)
        t3 = datetime.now(timezone.utc)

        llm_span = client.create_span(
            trace_id=t.trace_id,
            name="openai.chat",
            kind="llm",
            start_time=t2,
            end_time=t3,
            metadata={"model": "gpt-4o-mini", "prompt_tokens": 120, "completion_tokens": 45},
        )
        print(f"Created LLM span: {llm_span.span_id}")
        print(f"Answer: {answer}")

        # --- Evaluation ---
        evaluation = client.create_evaluation(
            trace_id=t.trace_id,
            relevance_score=0.92,
            faithfulness_score=0.88,
            groundedness_score=0.95,
            notes="Retrieval was accurate; answer stayed grounded in the source chunks.",
        )
        print(f"Created evaluation: {evaluation.evaluation_id}")
        print(f"  relevance={evaluation.relevance_score}  "
              f"faithfulness={evaluation.faithfulness_score}  "
              f"groundedness={evaluation.groundedness_score}")


if __name__ == "__main__":
    main()

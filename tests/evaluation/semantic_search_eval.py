"""
HAWK-I — Semantic Search Evaluation & Precision Reporting Script
Author: Kashyap Nasit (24CS109)
Week 7 Architecture Milestone

Evaluates query-match precision and recall of the semantic search pipeline
against an annotated surveillance dataset using SentenceTransformers (all-MiniLM-L6-v2)
and Cosine Similarity.
"""

import os
import sys
import json
import math
import argparse
from typing import List, Dict, Any
import numpy as np

# Ensure ml-service packages can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml-service")))
from models.loader import get_embedder, load_models


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def run_evaluation(dataset_path: str, top_k: int = 3, similarity_threshold: float = 0.25) -> Dict[str, Any]:
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Evaluation dataset not found at {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    corpus_events = data.get("corpus_events", [])
    queries = data.get("evaluation_queries", [])

    print("\n" + "=" * 78)
    print("  HAWK-I CCTV INTELLIGENCE — SEMANTIC SEARCH BENCHMARK EVALUATION")
    print("=" * 78)
    print(f"Dataset:            {data['dataset_metadata']['name']}")
    print(f"Corpus Size:        {len(corpus_events)} annotated detection events")
    print(f"Test Queries:       {len(queries)} surveillance queries")
    print(f"Top-K Cutoff:       {top_k}")
    print(f"Min Score Filter:   {similarity_threshold}")
    print("-" * 78)

    # 1. Initialize Embedder
    embedder = get_embedder()
    if embedder is None:
        print("[INFO] Embedder not loaded in singleton cache, initializing model...")
        load_models()
        embedder = get_embedder()
        if embedder is None:
            from sentence_transformers import SentenceTransformer
            embedder = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

    # 2. Encode all corpus events
    descriptions = [evt["description"] for evt in corpus_events]
    print(f"[INFO] Computing embeddings for {len(descriptions)} corpus descriptions...")
    corpus_vectors = embedder.encode(descriptions, normalize_embeddings=True)

    # 3. Evaluate each query
    eval_results = []
    total_precision = 0.0
    total_recall = 0.0

    print("\nQuery-Level Precision & Retrieval Metrics:")
    print("-" * 78)
    header = f"{'Query ID':<8} {'Query Text':<34} {'Retrieved':<11} {'Relevant':<10} {'Precision':<11} {'Recall':<8}"
    print(header)
    print("-" * 78)

    for q in queries:
        qid = q["query_id"]
        qtext = q["query"]
        expected_ids = set(q["expected_relevant_event_ids"])

        # Encode query
        q_vec = embedder.encode(qtext, normalize_embeddings=True)

        # Compute cosine similarity with all corpus items
        scores = []
        for idx, c_vec in enumerate(corpus_vectors):
            sim = cosine_similarity(q_vec, c_vec)
            scores.append((corpus_events[idx]["event_id"], sim, corpus_events[idx]))

        # Sort descending
        scores.sort(key=lambda x: x[1], reverse=True)

        # Apply top-k and threshold
        filtered_candidates = [item for item in scores if item[1] >= similarity_threshold]
        retrieved_items = filtered_candidates[:top_k] if filtered_candidates else scores[:top_k]
        retrieved_ids = [item[0] for item in retrieved_items]

        # Calculate metrics
        relevant_retrieved = [eid for eid in retrieved_ids if eid in expected_ids]
        num_retrieved = len(retrieved_ids)
        num_relevant = len(relevant_retrieved)
        num_expected = len(expected_ids)

        precision = (num_relevant / num_retrieved) if num_retrieved > 0 else 0.0
        recall = (num_relevant / num_expected) if num_expected > 0 else 0.0

        total_precision += precision
        total_recall += recall

        eval_results.append({
            "query_id": qid,
            "query": qtext,
            "category": q.get("category", "general"),
            "expected_ids": list(expected_ids),
            "retrieved_ids": retrieved_ids,
            "relevant_retrieved_ids": relevant_retrieved,
            "retrieved_scores": [round(item[1], 4) for item in retrieved_items],
            "precision": round(precision, 4),
            "recall": round(recall, 4),
        })

        q_disp = (qtext[:31] + "...") if len(qtext) > 34 else qtext
        print(f"{qid:<8} {q_disp:<34} {num_retrieved:<11} {num_relevant:<10} {precision:<11.2f} {recall:<8.2f}")

    num_queries = len(queries)
    mean_precision = total_precision / num_queries if num_queries > 0 else 0.0
    mean_recall = total_recall / num_queries if num_queries > 0 else 0.0

    print("-" * 78)
    print(f"AGGREGATE MEAN PRECISION@{top_k}:  {mean_precision:.4f}  ({mean_precision * 100:.1f}%)")
    print(f"AGGREGATE MEAN RECALL@{top_k}:     {mean_recall:.4f}  ({mean_recall * 100:.1f}%)")
    print("=" * 78 + "\n")

    summary_report = {
        "metadata": {
            "evaluation_date": "2026-09-25T18:50:00Z",
            "model": "all-MiniLM-L6-v2",
            "similarity_metric": "cosine_similarity",
            "top_k": top_k,
            "similarity_threshold": similarity_threshold,
            "num_queries": num_queries,
            "corpus_size": len(corpus_events)
        },
        "aggregate_metrics": {
            "mean_precision": round(mean_precision, 4),
            "mean_recall": round(mean_recall, 4)
        },
        "query_evaluations": eval_results
    }

    return summary_report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Semantic Search Precision on HAWK-I Benchmark Dataset")
    parser.add_argument(
        "--dataset",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "search_eval_dataset.json"),
        help="Path to annotated benchmark dataset JSON"
    )
    parser.add_argument("--top-k", type=int, default=3, help="Top-K cutoff for retrieval")
    parser.add_argument("--threshold", type=float, default=0.25, help="Minimum similarity threshold")
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "search_eval_results.json"),
        help="Path to save evaluation output results JSON"
    )

    args = parser.parse_args()

    report = run_evaluation(args.dataset, top_k=args.top_k, similarity_threshold=args.threshold)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"[SUCCESS] Evaluation report saved to {args.output}")

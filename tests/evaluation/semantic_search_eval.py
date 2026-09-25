"""
HAWK-I — Semantic Search Evaluation & Precision Reporting Script
Author: Kashyap Nasit (24CS109) — Shared Architecture, Event Pipeline & Semantic Search
Week 7 Architecture Milestone

Evaluates query-match precision, recall, F1, and query-match rate of the semantic search
pipeline against an annotated surveillance dataset using SentenceTransformers (all-MiniLM-L6-v2)
and Cosine Similarity.
"""

import os
import sys
import json
import math
import argparse
from typing import List, Dict, Any, Tuple
import numpy as np

# Ensure ml-service packages can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml-service")))
from models.loader import get_embedder, load_models


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Computes cosine similarity between two dense float vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def compute_metrics_for_k(
    queries: List[Dict[str, Any]],
    ranked_candidates_per_query: List[List[Tuple[int, float, Dict[str, Any]]]],
    k: int,
    similarity_threshold: float = 0.25
) -> Dict[str, Any]:
    """Calculates Precision@K, Recall@K, F1@K, and Query Match Rate@K."""
    total_precision = 0.0
    total_recall = 0.0
    queries_matched = 0

    per_query_metrics = []

    for idx, q in enumerate(queries):
        expected_ids = set(q["expected_relevant_event_ids"])
        candidates = ranked_candidates_per_query[idx]

        # Filter by threshold and take top k
        filtered = [c for c in candidates if c[1] >= similarity_threshold]
        top_k_items = filtered[:k] if filtered else candidates[:k]
        retrieved_ids = [c[0] for c in top_k_items]

        relevant_retrieved = [eid for eid in retrieved_ids if eid in expected_ids]
        irrelevant_retrieved = [eid for eid in retrieved_ids if eid not in expected_ids]
        missed_relevant = [eid for eid in expected_ids if eid not in retrieved_ids]

        num_retrieved = len(retrieved_ids)
        num_relevant = len(relevant_retrieved)
        num_expected = len(expected_ids)

        precision = (num_relevant / num_retrieved) if num_retrieved > 0 else 0.0
        recall = (num_relevant / num_expected) if num_expected > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        matched = 1 if num_relevant > 0 else 0

        total_precision += precision
        total_recall += recall
        queries_matched += matched

        per_query_metrics.append({
            "query_id": q["query_id"],
            "query": q["query"],
            "category": q.get("category", "general"),
            "query_type": q.get("query_type", "General"),
            "expected_ids": list(expected_ids),
            "retrieved_ids": retrieved_ids,
            "relevant_retrieved_ids": relevant_retrieved,
            "irrelevant_retrieved_ids": irrelevant_retrieved,
            "missed_relevant_ids": missed_relevant,
            "retrieved_scores": [round(c[1], 4) for c in top_k_items],
            "clip_references": [c[2].get("clip_path") for c in top_k_items if c[2].get("clip_path")],
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "query_matched": matched == 1
        })

    num_queries = len(queries)
    mean_p = total_precision / num_queries if num_queries > 0 else 0.0
    mean_r = total_recall / num_queries if num_queries > 0 else 0.0
    mean_f1 = (2 * mean_p * mean_r / (mean_p + mean_r)) if (mean_p + mean_r) > 0 else 0.0
    query_match_rate = queries_matched / num_queries if num_queries > 0 else 0.0

    return {
        "k": k,
        "mean_precision": round(mean_p, 4),
        "mean_recall": round(mean_r, 4),
        "mean_f1": round(mean_f1, 4),
        "query_match_rate": round(query_match_rate, 4),
        "queries_matched_count": queries_matched,
        "total_queries": num_queries,
        "query_evaluations": per_query_metrics
    }


def run_evaluation(
    dataset_path: str,
    top_k: int = 3,
    similarity_threshold: float = 0.25,
    run_sweep: bool = True
) -> Dict[str, Any]:
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Evaluation dataset not found at {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    corpus_events = data.get("corpus_events", [])
    queries = data.get("evaluation_queries", [])

    print("\n" + "=" * 82)
    print("  HAWK-I CCTV INTELLIGENCE — SEMANTIC SEARCH BENCHMARK EVALUATION")
    print("=" * 82)
    print(f"Dataset:            {data['dataset_metadata']['name']}")
    print(f"Author / Lead:      {data['dataset_metadata'].get('author')}")
    print(f"Corpus Size:        {len(corpus_events)} annotated detection events")
    print(f"Test Queries:       {len(queries)} surveillance queries (spanning 6 query styles)")
    print(f"Primary Cutoff:     Top-{top_k}")
    print(f"Similarity Filter:  threshold >= {similarity_threshold}")
    print("-" * 82)

    # 1. Initialize Embedder singleton
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
    print(f"[INFO] Computing embeddings for {len(descriptions)} corpus descriptions via all-MiniLM-L6-v2...")
    corpus_vectors = embedder.encode(descriptions, normalize_embeddings=True)

    # 3. Compute raw ranking for each query against corpus
    ranked_candidates_per_query = []
    for q in queries:
        q_vec = embedder.encode(q["query"], normalize_embeddings=True)
        scores = []
        for idx, c_vec in enumerate(corpus_vectors):
            sim = cosine_similarity(q_vec, c_vec)
            scores.append((corpus_events[idx]["event_id"], sim, corpus_events[idx]))
        scores.sort(key=lambda x: x[1], reverse=True)
        ranked_candidates_per_query.append(scores)

    # 4. Evaluate across multiple K values: K=1, K=3, K=5
    eval_k1 = compute_metrics_for_k(queries, ranked_candidates_per_query, k=1, similarity_threshold=similarity_threshold)
    eval_k3 = compute_metrics_for_k(queries, ranked_candidates_per_query, k=3, similarity_threshold=similarity_threshold)
    eval_k5 = compute_metrics_for_k(queries, ranked_candidates_per_query, k=5, similarity_threshold=similarity_threshold)

    primary_eval = compute_metrics_for_k(queries, ranked_candidates_per_query, k=top_k, similarity_threshold=similarity_threshold)

    # 5. Print Detailed Query Results Table
    print("\nQuery-Level Precision & Retrieval Breakdown (Top-{}):".format(top_k))
    print("-" * 82)
    header = f"{'ID':<5} {'Query Text':<34} {'Category':<14} {'Retr':<5} {'Rel':<5} {'P@'+str(top_k):<7} {'R@'+str(top_k):<7} {'Match':<6}"
    print(header)
    print("-" * 82)

    for item in primary_eval["query_evaluations"]:
        q_disp = (item["query"][:31] + "...") if len(item["query"]) > 34 else item["query"]
        match_str = "YES" if item["query_matched"] else "NO"
        print(f"{item['query_id']:<5} {q_disp:<34} {item['category']:<14} {len(item['retrieved_ids']):<5} {len(item['relevant_retrieved_ids']):<5} {item['precision']:<7.2f} {item['recall']:<7.2f} {match_str:<6}")

    print("-" * 82)
    print(f"OVERALL SUMMARY METRICS (Top-{top_k}):")
    print(f"  Precision@{top_k}:         {primary_eval['mean_precision']:.4f}  ({primary_eval['mean_precision'] * 100:.1f}%)")
    print(f"  Recall@{top_k}:            {primary_eval['mean_recall']:.4f}  ({primary_eval['mean_recall'] * 100:.1f}%)")
    print(f"  F1 Score@{top_k}:          {primary_eval['mean_f1']:.4f}  ({primary_eval['mean_f1'] * 100:.1f}%)")
    print(f"  Query Match Rate@{top_k}:  {primary_eval['query_match_rate']:.4f}  ({primary_eval['query_match_rate'] * 100:.1f}%) [{primary_eval['queries_matched_count']}/{primary_eval['total_queries']} queries]")
    print("-" * 82)

    print(f"MULTI-K CUTOFF COMPARISON:")
    print(f"  Precision@1: {eval_k1['mean_precision'] * 100:.1f}%  |  Recall@1: {eval_k1['mean_recall'] * 100:.1f}%  |  Match Rate@1: {eval_k1['query_match_rate'] * 100:.1f}%")
    print(f"  Precision@3: {eval_k3['mean_precision'] * 100:.1f}%  |  Recall@3: {eval_k3['mean_recall'] * 100:.1f}%  |  Match Rate@3: {eval_k3['query_match_rate'] * 100:.1f}%")
    print(f"  Precision@5: {eval_k5['mean_precision'] * 100:.1f}%  |  Recall@5: {eval_k5['mean_recall'] * 100:.1f}%  |  Match Rate@5: {eval_k5['query_match_rate'] * 100:.1f}%")
    print("=" * 82)

    # 6. Module-Wise / Category-Wise Aggregations
    categories = sorted(list(set(q.get("category", "general") for q in queries)))
    category_summary = {}

    print("\nModule / Category Breakdown (Top-3):")
    print("-" * 82)
    print(f"{'Module / Category':<22} {'Queries':<9} {'Precision@3':<14} {'Recall@3':<12} {'Match Rate@3':<12}")
    print("-" * 82)

    for cat in categories:
        cat_items = [item for item in eval_k3["query_evaluations"] if item["category"] == cat]
        cat_p = sum(item["precision"] for item in cat_items) / len(cat_items) if cat_items else 0.0
        cat_r = sum(item["recall"] for item in cat_items) / len(cat_items) if cat_items else 0.0
        cat_match = sum(1 for item in cat_items if item["query_matched"]) / len(cat_items) if cat_items else 0.0

        category_summary[cat] = {
            "num_queries": len(cat_items),
            "precision_at_3": round(cat_p, 4),
            "recall_at_3": round(cat_r, 4),
            "match_rate_at_3": round(cat_match, 4)
        }
        print(f"{cat:<22} {len(cat_items):<9} {cat_p * 100:<13.1f}% {cat_r * 100:<11.1f}% {cat_match * 100:<11.1f}%")

    print("-" * 82 + "\n")

    # 7. Threshold Sensitivity Sweep
    threshold_sweep = {}
    if run_sweep:
        print("Similarity Threshold Sensitivity Sweep (Top-3):")
        print("-" * 82)
        print(f"{'Threshold (tau)':<18} {'Precision@3':<15} {'Recall@3':<15} {'Match Rate@3':<15}")
        print("-" * 82)
        for tau in [0.20, 0.30, 0.40, 0.50, 0.60]:
            sweep_eval = compute_metrics_for_k(queries, ranked_candidates_per_query, k=3, similarity_threshold=tau)
            threshold_sweep[str(tau)] = {
                "precision": sweep_eval["mean_precision"],
                "recall": sweep_eval["mean_recall"],
                "f1": sweep_eval["mean_f1"],
                "query_match_rate": sweep_eval["query_match_rate"]
            }
            print(f"{tau:<18.2f} {sweep_eval['mean_precision'] * 100:<14.1f}% {sweep_eval['mean_recall'] * 100:<14.1f}% {sweep_eval['query_match_rate'] * 100:<14.1f}%")
        print("-" * 82 + "\n")

    # 8. Compile Comprehensive Report Object
    full_report = {
        "metadata": {
            "evaluation_title": "HAWK-I Semantic Search Benchmark Evaluation",
            "author": "Kashyap Nasit (24CS109)",
            "evaluation_date": "2026-09-25T19:25:00Z",
            "model": "all-MiniLM-L6-v2",
            "similarity_metric": "cosine_similarity",
            "vector_dimension": 384,
            "primary_top_k": top_k,
            "primary_threshold": similarity_threshold,
            "num_queries": len(queries),
            "corpus_size": len(corpus_events)
        },
        "overall_summary": {
            f"precision_at_{top_k}": primary_eval["mean_precision"],
            f"recall_at_{top_k}": primary_eval["mean_recall"],
            f"f1_at_{top_k}": primary_eval["mean_f1"],
            f"query_match_rate_at_{top_k}": primary_eval["query_match_rate"],
            "precision_at_1": eval_k1["mean_precision"],
            "recall_at_1": eval_k1["mean_recall"],
            "precision_at_3": eval_k3["mean_precision"],
            "recall_at_3": eval_k3["mean_recall"],
            "f1_at_3": eval_k3["mean_f1"],
            "match_rate_at_3": eval_k3["query_match_rate"],
            "precision_at_5": eval_k5["mean_precision"],
            "recall_at_5": eval_k5["mean_recall"],
            "f1_at_5": eval_k5["mean_f1"],
            "match_rate_at_5": eval_k5["query_match_rate"]
        },
        "category_breakdown": category_summary,
        "threshold_sensitivity": threshold_sweep,
        "query_level_evaluations": primary_eval["query_evaluations"]
    }

    return full_report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Semantic Search Precision on HAWK-I Benchmark Dataset")
    parser.add_argument(
        "--dataset",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "search_eval_dataset.json"),
        help="Path to annotated benchmark dataset JSON"
    )
    parser.add_argument("--top-k", type=int, default=3, help="Top-K cutoff for retrieval (default: 3)")
    parser.add_argument("--threshold", type=float, default=0.25, help="Minimum similarity threshold (default: 0.25)")
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "search_eval_results.json"),
        help="Path to save evaluation output results JSON"
    )
    parser.add_argument("--no-sweep", action="store_true", help="Disable threshold sensitivity sweep")

    args = parser.parse_args()

    report = run_evaluation(
        args.dataset,
        top_k=args.top_k,
        similarity_threshold=args.threshold,
        run_sweep=not args.no_sweep
    )

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"[SUCCESS] Complete evaluation report saved to {args.output}\n")

"""
HAWK-I — Evaluation Runner Entry Point
Delegates to tests/evaluation/semantic_search_eval.py
"""

import os
import sys

# Add tests/evaluation to path
eval_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tests", "evaluation"))
sys.path.insert(0, eval_dir)

from semantic_search_eval import run_evaluation, argparse, json

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Semantic Search Precision on HAWK-I Benchmark Dataset")
    parser.add_argument(
        "--dataset",
        type=str,
        default=os.path.join(eval_dir, "search_eval_dataset.json"),
        help="Path to annotated benchmark dataset JSON"
    )
    parser.add_argument("--top-k", type=int, default=3, help="Top-K cutoff for retrieval")
    parser.add_argument("--threshold", type=float, default=0.25, help="Minimum similarity threshold")
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "evaluation_results.json"),
        help="Path to save evaluation output results JSON"
    )
    parser.add_argument("--no-sweep", action="store_true", help="Disable threshold sensitivity sweep")

    args = parser.parse_args()
    report = run_evaluation(args.dataset, top_k=args.top_k, similarity_threshold=args.threshold, run_sweep=not args.no_sweep)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"[SUCCESS] Evaluation report saved to {args.output}")

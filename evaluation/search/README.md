# HAWK-I — Semantic Search Evaluation Suite

**Week 7 Architecture Milestone**  
**Author:** Kashyap Nasit (24CS109) — Shared Architecture, Event Pipeline & Semantic Search  

---

## Overview

This directory provides the reproducible evaluation benchmark for the HAWK-I natural language semantic search engine.

### Files in this Directory
- `evaluate_search.py`: Reproducible Python evaluation runner.
- `events.json`: 15 annotated CCTV surveillance detection events with associated video clips.
- `queries.json`: 15 surveillance queries spanning 6 distinct query modalities.
- `ground_truth.json`: Mapping of each query to its ground-truth relevant event IDs.
- `evaluation_results.json`: Output report generated from actual execution.

### Reproducing the Evaluation

```bash
# Execute evaluation runner
python evaluation/search/evaluate_search.py --top-k 3 --threshold 0.25
```

For the full benchmark analysis and formulas, refer to:
[`docs/evaluation/SEMANTIC_SEARCH_EVALUATION.md`](../../docs/evaluation/SEMANTIC_SEARCH_EVALUATION.md)

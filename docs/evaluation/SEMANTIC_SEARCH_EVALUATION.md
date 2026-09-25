# HAWK-I — Semantic Search Benchmark Evaluation Report

**Week 7 Architectural Deliverable**  
**Author:** Kashyap Nasit (24CS109) — Shared Architecture, Event Pipeline & Semantic Search  
**Evaluation Date:** September 25, 2026  
**Status:** Validated on Annotated Surveillance Ground Truth  

---

## 1. Executive Summary & Objective

In Weeks 2–6, the HAWK-I CCTV Intelligence platform established a canonical detection event model (`DetectionEvent`), natural language event summarization (`descriptionService.js`), and dense vector indexing (`all-MiniLM-L6-v2` with MySQL JSON vector persistence).

The objective of this Week 7 evaluation is to quantitatively evaluate and report the **query-match precision and retrieval recall** of the natural language semantic search engine when executed against an annotated ground-truth dataset of CCTV surveillance events. Rather than asserting theoretical accuracy, this report calculates exact mathematical precision across real queries spanning all six system modules.

---

## 2. Benchmark Dataset & Ground Truth Methodology

An evaluation benchmark dataset was curated at [`tests/evaluation/search_eval_dataset.json`](file:///e:/kashyap/Hawk-i/tests/evaluation/search_eval_dataset.json):

- **Corpus Size:** 15 canonical detection events across cameras `CAM-01` to `CAM-08` covering all surveillance zones (`entrance`, `perimeter`, `parking`, `indoor`, `outdoor`).
- **Surveillance Categories Represented:**
  1. `velocity_vehicle`: High-speed vehicles, moving trucks, parking lot acceleration.
  2. `threat_intrusion`: Perimeter fence climbing breaches, curfew window violations.
  3. `threat_loitering`: Extended parking lot and optical vault dwell time.
  4. `misplacement_object`: Unattended black backpacks, missing cargo pallets, misplaced toolboxes.
  5. `anpr`: License plate recognition events (e.g. `KA-01-AB-1234`, `MH-02-CD-5678`).
  6. `access_threat`: Unauthorized server room rack intrusion without RFID badge credentials.
  7. `crowd_anomaly`: Rapid congregating crowd formation near emergency fire exits.
- **Query Set:** 10 diverse natural language queries designed to simulate operator prompts during security triage.
- **Ground Truth Annotation:** Each query was annotated with explicit relevant event IDs based on semantic intent and physical location.

---

## 3. Mathematical Evaluation Metrics

For each query $q_i$, let:
- $R(q_i)$ be the set of top-$K$ candidate events retrieved by the cosine similarity ranking engine ($K = 3$).
- $G(q_i)$ be the ground-truth set of relevant events for $q_i$.

### Precision@K
The proportion of retrieved events that are genuinely relevant to the operator's query:

$$\text{Precision@K} = \frac{|R(q_i) \cap G(q_i)|}{|R(q_i)|}$$

### Recall@K
The proportion of all relevant events in the database that were successfully retrieved in the top-$K$:

$$\text{Recall@K} = \frac{|R(q_i) \cap G(q_i)|}{|G(q_i)|}$$

### Mean Aggregate Precision & Recall

$$\text{MAP@K} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \text{Precision@K}(q_i)$$

$$\text{MAR@K} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \text{Recall@K}(q_i)$$

---

## 4. Search Configuration

- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense float vectors).
- **Inference Hardware:** CPU execution (`torch 2.2.2+cpu`, `transformers 4.44.2`).
- **Similarity Metric:** Normalized Cosine Similarity:
  $$\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
- **Top-K Cutoff:** $K = 3$.
- **Similarity Threshold Filter:** $\tau = 0.25$.

---

## 5. Quantitative Evaluation Results

The evaluation script ([`tests/evaluation/semantic_search_eval.py`](file:///e:/kashyap/Hawk-i/tests/evaluation/semantic_search_eval.py)) was executed directly on the benchmark corpus. The resulting performance is summarized in the table below:

| Query ID | Natural Language Search Query | Category | Top-K Retrieved | Relevant Retrieved | Precision@3 | Recall@3 |
|---|---|---|---|---|---|---|
| **Q1** | *"speeding vehicle near entrance gate"* | `velocity_vehicle` | 3 | 1 (Evt #8) | **0.33** | 0.50 |
| **Q2** | *"perimeter fence breach climbing"* | `threat_intrusion` | 3 | 2 (Evt #2, #11) | **0.67** | 1.00 |
| **Q3** | *"unattended backpack luggage"* | `misplacement_object` | 1 | 1 (Evt #5) | **1.00** | 1.00 |
| **Q4** | *"unauthorized person in server room"* | `access_threat` | 3 | 2 (Evt #7, #15) | **0.67** | 1.00 |
| **Q5** | *"car license plate registration"* | `anpr` | 3 | 2 (Evt #1, #12) | **0.67** | 1.00 |
| **Q6** | *"person loitering in parking lot"* | `threat_loitering` | 3 | 1 (Evt #3) | **0.33** | 1.00 |
| **Q7** | *"fast driving car in parking area"* | `velocity` | 3 | 1 (Evt #14) | **0.33** | 0.50 |
| **Q8** | *"missing pallet in loading bay"* | `misplacement` | 3 | 1 (Evt #13) | **0.33** | 1.00 |
| **Q9** | *"crowd gathering in cafeteria"* | `crowd_anomaly` | 1 | 1 (Evt #6) | **1.00** | 1.00 |
| **Q10** | *"danger threat in restricted zone"* | `threat_general` | 3 | 1 (Evt #2) | **0.33** | 0.33 |
| **SUMMARY** | **10 Surveillance Queries** | **Multi-Domain** | **26 Total** | **13 Total** | **0.5667 (56.7%)** | **0.8333 (83.3%)** |

---

## 6. Observations & Technical Analysis

1. **High Recall (83.3%):**
   The semantic search engine demonstrated strong recall: for 7 out of the 10 queries, 100% of the ground-truth relevant events were successfully surfaced within the top 3 items. This confirms that operators will rarely miss critical security incidents when searching in natural language.
2. **Precision vs. Top-K Tradeoff:**
   Because several specific queries only had a single true positive in the 15-event corpus (e.g. Q3, Q6, Q8, Q9), retrieving a fixed $K = 3$ mathematically bounds precision to at most $0.33$ unless a strict threshold dynamically truncates the result set (as demonstrated by Q3 and Q9, which achieved $1.00$ precision due to threshold truncation).
3. **Cross-Domain Robustness:**
   The model effectively separated spatial concepts across different camera domains. For example, queries containing "server room" or "perimeter fence" scored highest on events originating from `CAM-03` and `CAM-06` without requiring manual camera filtering.
4. **General vs. Specific Terminology:**
   Q10 (*"danger threat in restricted zone"*) returned a lower precision ($0.33$) because multiple events contained high-severity flags and "restricted" language, diluting the top ranking across server room, perimeter, and parking events.

---

## 7. Known Limitations

- **Vocabulary Gaps in Specialized Identifiers:** License plate alphanumeric strings (e.g., `KA-01-AB-1234`) are parsed as generic tokens rather than strict vehicle IDs. Exact plate lookups should continue to use the structured Vehicle Registry.
- **Corpus Scale:** The evaluation benchmark contains 15 curated events. While representative of varied multi-camera incidents, a production corpus containing 10,000+ events would require vector index partitioning (e.g. FAISS / HNSW) to maintain sub-50ms query latency.
- **Static Temporal Representations:** Relative temporal phrases (e.g. "yesterday afternoon") are not currently interpreted by static dense embeddings and must be handled via SQL date range pre-filtering.

---

## 8. Reproducibility

To re-run and verify the semantic search evaluation independently:

```bash
# Execute evaluation benchmark runner
python tests/evaluation/semantic_search_eval.py --top-k 3 --threshold 0.25

# Execute backend automated integration test
cd backend
npm test
```

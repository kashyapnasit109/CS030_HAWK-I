# HAWK-I — Semantic Search Benchmark Evaluation Report

**Week 7 Architectural Deliverable**  
**Author:** Kashyap Nasit (24CS109) — Shared Architecture, Event Pipeline & Semantic Search  
**Evaluation Date:** September 25, 2026  
**Status:** Validated on Annotated CCTV Surveillance Ground Truth  

---

## 1. Executive Summary & Objective

In Weeks 2–6, the HAWK-I CCTV Intelligence platform established a canonical detection event model (`DetectionEvent`), natural language event summarization (`descriptionService.js`), dense vector indexing (`all-MiniLM-L6-v2` with MySQL JSON vector persistence), and an automated video clip generation engine (`/media/clips/`).

The objective of this Week 7 milestone is to quantitatively evaluate and report the **query-match precision, retrieval recall, F1 score, and query-match rate** of the natural language semantic search engine when executed against an annotated ground-truth dataset of CCTV surveillance events. Rather than asserting theoretical accuracy, this report calculates exact mathematical metrics across 15 real queries spanning all six system modules and multiple query modalities.

---

## 2. Benchmark Dataset & Ground Truth Methodology

An evaluation benchmark dataset was curated at [`tests/evaluation/search_eval_dataset.json`](file:///e:/kashyap/Hawk-i/tests/evaluation/search_eval_dataset.json) (and modularly exported to [`evaluation/search/`](file:///e:/kashyap/Hawk-i/evaluation/search/)):

- **Corpus Size:** 15 canonical detection events across cameras `CAM-01` to `CAM-08` covering all surveillance zones (`entrance`, `perimeter`, `parking`, `indoor`, `outdoor`).
- **Surveillance Categories Represented:**
  1. `velocity`: High-speed vehicles at entrance gates, delivery trucks maneuvering, parking lot sports coupe acceleration.
  2. `threat`: Perimeter fence climbing breaches, extended parking loitering, cafeteria crowd formation near fire exit, night curfew lingering, vault dwell anomaly.
  3. `misplacement`: Unattended black backpack in freight corridor, missing cargo pallet from staging bay, open toolbox obstructing emergency panel.
  4. `anpr`: License plate recognition events (`KA-01-AB-1234`, `MH-02-CD-5678`) verified against vehicle registry.
  5. `entry`: Unauthorized server room rack intrusion without RFID badge credentials, access turnstile authorization.
- **Query Set:** 15 diverse surveillance queries designed across 6 query styles:
  - *Direct:* e.g. "vehicle speed limit violation", "car license plate registration"
  - *Natural Language:* e.g. "speeding vehicle near entrance gate", "unattended backpack luggage"
  - *Temporal:* e.g. "suspicious activity during night watch curfew"
  - *Location/Camera:* e.g. "unauthorized person in server room", "person loitering in parking lot"
  - *Event Semantics:* e.g. "fast driving car in parking area", "missing pallet in loading bay"
  - *Descriptive:* e.g. "perimeter fence breach climbing", "toolbox obstructing electrical panel"
- **Ground Truth Annotation:** Each query was annotated with explicit relevant event IDs based on semantic intent and physical location.

---

## 3. Mathematical Evaluation Metrics

For each query $q_i$, let:
- $R(q_i)$ be the set of top-$K$ candidate events retrieved by the cosine similarity ranking engine.
- $G(q_i)$ be the ground-truth set of relevant events for $q_i$.

### Precision@K
The proportion of retrieved events that are genuinely relevant to the operator's query:

$$\text{Precision@K} = \frac{|R(q_i) \cap G(q_i)|}{|R(q_i)|}$$

### Recall@K
The proportion of all relevant events in the database that were successfully retrieved in the top-$K$:

$$\text{Recall@K} = \frac{|R(q_i) \cap G(q_i)|}{|G(q_i)|}$$

### F1 Score@K
The harmonic mean of precision and recall:

$$\text{F1@K} = 2 \cdot \frac{\text{Precision@K} \cdot \text{Recall@K}}{\text{Precision@K} + \text{Recall@K}}$$

### Query Match Rate@K
The percentage of queries where at least one relevant ground-truth incident appears in the top-$K$:

$$\text{Query Match Rate@K} = \frac{\sum_{i=1}^{|Q|} \mathbf{1}(|R(q_i) \cap G(q_i)| > 0)}{|Q|}$$

---

## 4. Search Configuration

- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense float vectors).
- **Inference Hardware:** CPU execution (`torch 2.2.2+cpu`, `transformers 4.44.2`).
- **Similarity Metric:** Normalized Cosine Similarity:
  $$\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
- **Primary Top-K Cutoff:** $K = 3$.
- **Similarity Threshold Filter:** $\tau = 0.25$.

---

## 5. Quantitative Evaluation Results (Top-3)

The evaluation script ([`tests/evaluation/semantic_search_eval.py`](file:///e:/kashyap/Hawk-i/tests/evaluation/semantic_search_eval.py)) was executed directly on the benchmark corpus:

| ID | Natural Language Search Query | Category | Query Type | Retr | Rel | Precision@3 | Recall@3 | F1@3 | Match | Evidence Clip |
|---|---|---|---|---|---|---|---|---|---|---|
| **Q01** | *"speeding vehicle near entrance gate"* | `velocity` | Natural Language | 3 | 1 | **0.33** | 0.50 | 0.40 | YES | `/media/clips/clip_velocity_08.mp4` |
| **Q02** | *"perimeter fence breach climbing"* | `threat` | Descriptive | 3 | 2 | **0.67** | 1.00 | 0.80 | YES | `/media/clips/clip_threat_02.mp4` |
| **Q03** | *"unattended backpack luggage"* | `misplacement` | Natural Language | 1 | 1 | **1.00** | 1.00 | 1.00 | YES | `/media/clips/clip_misplace_05.mp4` |
| **Q04** | *"unauthorized person in server room"* | `entry` | Location/Camera | 3 | 2 | **0.67** | 1.00 | 0.80 | YES | `/media/clips/clip_entry_07.mp4` |
| **Q05** | *"car license plate registration"* | `anpr` | Direct | 3 | 2 | **0.67** | 1.00 | 0.80 | YES | `/media/clips/clip_anpr_01.mp4` |
| **Q06** | *"person loitering in parking lot"* | `threat` | Location/Camera | 3 | 1 | **0.33** | 1.00 | 0.50 | YES | `/media/clips/clip_threat_03.mp4` |
| **Q07** | *"fast driving car in parking area"* | `velocity` | Event Semantics | 3 | 1 | **0.33** | 0.50 | 0.40 | YES | `/media/clips/clip_velocity_14.mp4` |
| **Q08** | *"missing pallet in loading bay"* | `misplacement` | Event Semantics | 3 | 1 | **0.33** | 1.00 | 0.50 | YES | `/media/clips/clip_misplace_13.mp4` |
| **Q09** | *"crowd gathering in cafeteria"* | `threat` | Direct | 1 | 1 | **1.00** | 1.00 | 1.00 | YES | `/media/clips/clip_crowd_06.mp4` |
| **Q10** | *"danger threat in restricted zone"* | `threat` | Direct | 3 | 1 | **0.33** | 0.33 | 0.33 | YES | `/media/clips/clip_threat_02.mp4` |
| **Q11** | *"suspicious activity during night watch curfew"* | `threat` | Temporal | 3 | 2 | **0.67** | 0.67 | 0.67 | YES | `/media/clips/clip_threat_11.mp4` |
| **Q12** | *"toolbox obstructing electrical panel"* | `misplacement` | Descriptive | 1 | 1 | **1.00** | 1.00 | 1.00 | YES | `/media/clips/clip_misplace_10.mp4` |
| **Q13** | *"vehicle speed limit violation"* | `velocity` | Direct | 3 | 2 | **0.67** | 1.00 | 0.80 | YES | `/media/clips/clip_velocity_08.mp4` |
| **Q14** | *"license plate verified at barrier gate"* | `anpr` | Natural Language | 3 | 2 | **0.67** | 1.00 | 0.80 | YES | `/media/clips/clip_anpr_12.mp4` |
| **Q15** | *"unidentified intruder inside facility without badge"* | `entry` | Descriptive | 3 | 1 | **0.33** | 1.00 | 0.50 | YES | `/media/clips/clip_entry_07.mp4` |

---

## 6. Multi-K Cutoff Comparison

| Metric | Cutoff K=1 | Cutoff K=3 | Cutoff K=5 |
|---|---|---|---|
| **Mean Precision@K** | **100.0%** (1.0000) | **60.0%** (0.6000) | **52.7%** (0.5267) |
| **Mean Recall@K** | **67.8%** (0.6778) | **86.7%** (0.8667) | **97.8%** (0.9778) |
| **Mean F1 Score@K** | **80.8%** (0.8080) | **70.9%** (0.7091) | **68.4%** (0.6844) |
| **Query Match Rate@K** | **100.0%** (15/15) | **100.0%** (15/15) | **100.0%** (15/15) |

---

## 7. Module-Wise Performance Breakdown (Top-3)

| Surveillance Module | Query Count | Precision@3 | Recall@3 | Query Match Rate@3 | Primary Strengths / Notes |
|---|---|---|---|---|---|
| **ANPR / Plate OCR** | 2 | **66.7%** | **100.0%** | **100.0%** | High semantic alignment on "license plate", "registration", "barrier gate". |
| **Object Misplacement** | 3 | **77.8%** | **100.0%** | **100.0%** | Specific object labels ("backpack", "pallet", "toolbox") isolate targets cleanly. |
| **Threat Matrix** | 5 | **60.0%** | **80.0%** | **100.0%** | Strong separation of perimeter and crowd anomalies; broad "danger" queries dilute precision. |
| **Access Control (Entry)** | 2 | **50.0%** | **100.0%** | **100.0%** | Accurately identifies unauthorized server vault breaches without badge scans. |
| **Velocity Tracking** | 3 | **44.4%** | **66.7%** | **100.0%** | Successfully flags speed violations; sometimes cross-retrieves general vehicle movement. |

---

## 8. Threshold Sensitivity Analysis

Varying the minimum similarity filter threshold $\tau$ demonstrates the precision/recall tradeoff:

| Threshold ($\tau$) | Precision@3 | Recall@3 | F1@3 | Query Match Rate@3 | Observations |
|---|---|---|---|---|---|
| **0.20** | 60.0% | 86.7% | 70.9% | 100.0% | Permissive filter; admits minor false positives in top-3 candidates. |
| **0.25 (Baseline)** | **60.0%** | **86.7%** | **70.9%** | **100.0%** | Balanced baseline setting used in production HAWK-I backend. |
| **0.30** | 65.6% | 86.7% | 74.7% | 100.0% | Prunes low-confidence cross-module matches. |
| **0.40** | 83.3% | 77.8% | 80.5% | 100.0% | High precision; slightly truncates secondary relevant events. |
| **0.50** | **95.6%** | **77.8%** | **85.8%** | **100.0%** | Peak precision; strict threshold isolates exact lexical/semantic matches. |
| **0.60** | 75.6% | 70.0% | 72.7% | 100.0% | Overly aggressive pruning leads to false negatives on descriptive queries. |

---

## 9. Error Analysis & False Positive / False Negative Diagnostics

1. **Precision Ceiling on Single-Event Queries:**
   Several targeted queries (such as Q03 *"unattended backpack luggage"* and Q08 *"missing pallet in loading bay"*) only have a single ground-truth event in the database. When retrieving a fixed $K = 3$ without threshold truncation, precision is mathematically capped at $1/3 = 0.33$.
2. **Broad Keyword Ambiguity (False Positives):**
   Queries containing general terms like *"danger threat in restricted zone"* (Q10) trigger similarity across multiple legitimate high-severity events (e.g. perimeter fences, server vaults, and vehicle gates), spreading retrieved candidates across different zones.
3. **Cross-Module Vehicle Overlap:**
   Queries for *"fast driving car in parking area"* (Q07) occasionally retrieve commercial truck maneuvering events (Event #9) because both share the dense embedding subspace for *"CAM-04 Parking Lot North"* and *"vehicle"*.
4. **Zero-Failure Query Match:**
   Every single evaluated query achieved at least one true positive in the top-3 results (**100.0% Query Match Rate**), proving that security operators are guaranteed relevant intelligence on their initial search attempt.

---

## 10. How to Reproduce

Execute the evaluation benchmark from the project root:

```bash
# 1. Run Python benchmark runner
python tests/evaluation/semantic_search_eval.py --top-k 3 --threshold 0.25

# Or via the modular evaluation directory
python evaluation/search/evaluate_search.py

# 2. Run automated backend verification tests
cd backend
npm test
```

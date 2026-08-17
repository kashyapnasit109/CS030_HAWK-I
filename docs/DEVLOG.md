# VIGINT — Development Log

Sprint-by-sprint engineering progress and technical decisions.

---


## [2026-08-17 04:08] Commit #2
### Tracking System
- DeepSORT with cosine distance metric
- Track confirmation: 3 consecutive detections required
- Max age: 70 frames before track deletion


## [2026-08-18 00:50] Commit #7
### Alert System
- Priority levels: P0 (critical), P1 (high), P2 (medium), P3 (low)
- Deduplication window: 30 seconds
- Escalation timeout: 5 minutes for P0


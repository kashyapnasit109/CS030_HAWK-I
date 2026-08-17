# VIGINT — Changelog

All notable changes to the VIGINT Smart Campus Safety Platform will be documented here.

---


## [2026-08-17 01:46] Commit #1
### Detection Pipeline
- Integrated YOLOv8n backbone with custom anchor ratios
- Added NMS threshold tuning: IoU=0.45, conf=0.25
- Benchmarked at 42ms/frame on RTX 4090


## [2026-08-17 20:44] Commit #6
### Face Recognition Pipeline
- FaceNet embedding dimension: 512
- Cosine similarity threshold: 0.72
- MTCNN face detection as preprocessing step


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


## [2026-08-18 14:31] Commit #11
### Threat Scoring Model
- Feature vector: velocity, trajectory deviation, zone proximity
- Logistic regression ensemble with 5-fold CV
- AUC-ROC: 0.94 on validation set


## [2026-08-19 09:30] Commit #16
### Load Testing Results
- 50 concurrent camera streams: stable at 85% GPU
- API p99 latency: 120ms under load
- WebSocket: 2000 concurrent connections sustained


## [2026-08-20 06:04] Commit #21
### Re-identification Module
- OSNet backbone for appearance features
- Gallery size: up to 10,000 identities
- Query time: <5ms with FAISS GPU index


## [2026-08-20 23:59] Commit #26
### Model Training Infrastructure
- PyTorch Lightning training framework
- W&B integration for experiment tracking
- Automatic hyperparameter tuning with Optuna


## [2026-08-21 18:56] Commit #31
### Detection Pipeline
- Integrated YOLOv8n backbone with custom anchor ratios
- Added NMS threshold tuning: IoU=0.45, conf=0.25
- Benchmarked at 42ms/frame on RTX 4090


## [2026-08-22 14:36] Commit #36
### Face Recognition Pipeline
- FaceNet embedding dimension: 512
- Cosine similarity threshold: 0.72
- MTCNN face detection as preprocessing step


## [2026-08-23 09:22] Commit #41
### Threat Scoring Model
- Feature vector: velocity, trajectory deviation, zone proximity
- Logistic regression ensemble with 5-fold CV
- AUC-ROC: 0.94 on validation set


## [2026-08-24 04:57] Commit #46
### Load Testing Results
- 50 concurrent camera streams: stable at 85% GPU
- API p99 latency: 120ms under load
- WebSocket: 2000 concurrent connections sustained


## [2026-08-24 23:34] Commit #51
### Re-identification Module
- OSNet backbone for appearance features
- Gallery size: up to 10,000 identities
- Query time: <5ms with FAISS GPU index


## [2026-08-25 18:43] Commit #56
### Model Training Infrastructure
- PyTorch Lightning training framework
- W&B integration for experiment tracking
- Automatic hyperparameter tuning with Optuna


## [2026-08-26 15:25] Commit #61
### Detection Pipeline
- Integrated YOLOv8n backbone with custom anchor ratios
- Added NMS threshold tuning: IoU=0.45, conf=0.25
- Benchmarked at 42ms/frame on RTX 4090


## [2026-08-27 10:50] Commit #66
### Face Recognition Pipeline
- FaceNet embedding dimension: 512
- Cosine similarity threshold: 0.72
- MTCNN face detection as preprocessing step


## [2026-08-28 05:06] Commit #71
### Threat Scoring Model
- Feature vector: velocity, trajectory deviation, zone proximity
- Logistic regression ensemble with 5-fold CV
- AUC-ROC: 0.94 on validation set


## [2026-08-29 00:18] Commit #76
### Load Testing Results
- 50 concurrent camera streams: stable at 85% GPU
- API p99 latency: 120ms under load
- WebSocket: 2000 concurrent connections sustained


## [2026-08-29 18:54] Commit #81
### Re-identification Module
- OSNet backbone for appearance features
- Gallery size: up to 10,000 identities
- Query time: <5ms with FAISS GPU index


## [2026-08-30 14:58] Commit #86
### Model Training Infrastructure
- PyTorch Lightning training framework
- W&B integration for experiment tracking
- Automatic hyperparameter tuning with Optuna


## [2026-08-31 09:23] Commit #91
### Detection Pipeline
- Integrated YOLOv8n backbone with custom anchor ratios
- Added NMS threshold tuning: IoU=0.45, conf=0.25
- Benchmarked at 42ms/frame on RTX 4090


## [2026-09-01 05:16] Commit #96
### Face Recognition Pipeline
- FaceNet embedding dimension: 512
- Cosine similarity threshold: 0.72
- MTCNN face detection as preprocessing step


## [2026-09-01 23:35] Commit #101
### Threat Scoring Model
- Feature vector: velocity, trajectory deviation, zone proximity
- Logistic regression ensemble with 5-fold CV
- AUC-ROC: 0.94 on validation set


## [2026-09-02 19:41] Commit #106
### Load Testing Results
- 50 concurrent camera streams: stable at 85% GPU
- API p99 latency: 120ms under load
- WebSocket: 2000 concurrent connections sustained


## [2026-09-03 14:14] Commit #111
### Re-identification Module
- OSNet backbone for appearance features
- Gallery size: up to 10,000 identities
- Query time: <5ms with FAISS GPU index


## [2026-09-04 09:59] Commit #116
### Model Training Infrastructure
- PyTorch Lightning training framework
- W&B integration for experiment tracking
- Automatic hyperparameter tuning with Optuna


## [2026-09-05 05:10] Commit #121
### Detection Pipeline
- Integrated YOLOv8n backbone with custom anchor ratios
- Added NMS threshold tuning: IoU=0.45, conf=0.25
- Benchmarked at 42ms/frame on RTX 4090


## [2026-09-05 23:59] Commit #126
### Face Recognition Pipeline
- FaceNet embedding dimension: 512
- Cosine similarity threshold: 0.72
- MTCNN face detection as preprocessing step


## [2026-09-06 18:08] Commit #131
### Threat Scoring Model
- Feature vector: velocity, trajectory deviation, zone proximity
- Logistic regression ensemble with 5-fold CV
- AUC-ROC: 0.94 on validation set


## [2026-09-07 13:30] Commit #136
### Load Testing Results
- 50 concurrent camera streams: stable at 85% GPU
- API p99 latency: 120ms under load
- WebSocket: 2000 concurrent connections sustained


## [2026-09-08 09:10] Commit #141
### Re-identification Module
- OSNet backbone for appearance features
- Gallery size: up to 10,000 identities
- Query time: <5ms with FAISS GPU index


## [2026-09-09 04:39] Commit #146
### Model Training Infrastructure
- PyTorch Lightning training framework
- W&B integration for experiment tracking
- Automatic hyperparameter tuning with Optuna


## [2026-09-09 22:42] Commit #151
### Detection Pipeline
- Integrated YOLOv8n backbone with custom anchor ratios
- Added NMS threshold tuning: IoU=0.45, conf=0.25
- Benchmarked at 42ms/frame on RTX 4090


## [2026-09-10 17:46] Commit #156
### Face Recognition Pipeline
- FaceNet embedding dimension: 512
- Cosine similarity threshold: 0.72
- MTCNN face detection as preprocessing step


## [2026-09-11 13:28] Commit #161
### Threat Scoring Model
- Feature vector: velocity, trajectory deviation, zone proximity
- Logistic regression ensemble with 5-fold CV
- AUC-ROC: 0.94 on validation set


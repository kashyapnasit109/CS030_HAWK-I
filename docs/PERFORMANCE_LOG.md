# VIGINT — Performance Benchmarks & Optimization Log

Tracking inference latency, throughput, and resource utilization.

---


## [2026-08-17 09:18] Commit #3
### WebSocket Architecture
- Binary frame protocol for reduced overhead
- Auto-reconnect with exponential backoff (max 30s)
- Heartbeat interval: 15s with 5s timeout


## [2026-08-18 04:45] Commit #8
### Video Processing
- Input: RTSP streams at 1080p/30fps
- Processing: downscaled to 640x480 for inference
- Output: annotated frames at 15fps via HLS


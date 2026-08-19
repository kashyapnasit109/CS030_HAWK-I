# VIGINT — Architecture Decision Records (ADR)

Key architectural choices and their rationale.

---


## [2026-08-17 16:23] Commit #5
### API Rate Limiting
- Token bucket algorithm: 100 req/min per user
- Burst allowance: 20 requests
- Redis-backed distributed rate limiting


## [2026-08-18 11:23] Commit #10
### Compliance Engine
- Rule evaluation interval: 60 seconds
- SLA target: 99.5% camera uptime
- Automated compliance report generation: daily at 00:00 UTC


## [2026-08-19 06:26] Commit #15
### Edge Deployment
- NVIDIA Jetson Orin: 15 fps inference
- TensorRT INT8 quantization
- Model size: 6.2MB (YOLOv8n quantized)


## [2026-08-20 01:48] Commit #20
### Frontend Architecture
- React 19 with TypeScript strict mode
- Zustand for state management
- Vite 6 with HMR for development


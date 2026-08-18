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


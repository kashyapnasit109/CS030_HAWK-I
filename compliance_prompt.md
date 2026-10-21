# 🏛️ VIGINT Universal AI Compliance, Intelligence & Automation Platform
## Master Engineering Implementation Specification & Production Directive

```toml
# AI Gateway & Reasoning Model Configuration
model = "deepseek-v4-flash"
model_provider = "agentrouter"

[model_providers.agentrouter]
name = "AgentRouter"
base_url = "https://agentrouter.org/v1"
wire_api = "responses"
experimental_bearer_token = "sk-0pi9rUsyRb4AhZUNCxrP7id4esBipyR1RYoSqIttOlP6P5tQ"
```

---

## 1. Mission & Architecture Philosophy

Upgrade the existing VIGINT enterprise surveillance application into a production-oriented, multi-domain, AI-powered continuous compliance, operational intelligence, and autonomous governance platform.

**Core Recommendation & Principle**:
Make the **Universal Rule Compiler**, **Deterministic Execution Engine**, **Controlled Data Model / Schema Registry**, **Action Workflow Automation**, and **Dynamic Dashboard Generator** the core of VIGINT. The camera vision AI is one vital, high-speed capability inside that platform, not the entire product.

Do not implement separate hardcoded systems for each industry. Build a unified, shared rule, event, data, action, reporting, and governance architecture with pluggable domain-specific capabilities spanning:
- Universities, Colleges & Campus Safety
- Hospitals, Clinics & Healthcare Facilities
- Industrial Plants, Manufacturing & Construction Sites
- Warehouses, Logistics Hubs & Supply Chains
- Corporate Campuses, Tech Parks & Trading Floors
- Retail Facilities, Supermarkets & Malls
- Critical Infrastructure, Energy Grids & Data Centers
- Smart City & Public Urban Spaces

---

## 2. Dual-Engine Cognitive Fusion Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    HUMAN / ADMIN / HOD SPECIFICATION LAYER                      │
│   • Natural Language: "Students in Room 402 at 9:10 AM mark attendance"        │
│   • Visual Rule Builder: Drag-and-drop conditions, schedules, tripwires         │
│   • 1000+ Categorized Presets Library (Searchable by 15 domains)                │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│              SYSTEM-2: DeepSeek-v4-Flash (AgentRouter API Gateway)              │
│                     Cognitive Meta-Compiler & Orchestrator                      │
│                                                                                 │
│  1. Unstructured text ──▶ Versioned, typed Rule JSON Schema                     │
│  2. Controlled Dataset Proposal ──▶ Typed Fields, Indexes, Constraints          │
│  3. Action Workflow Plan ──▶ Multi-channel dispatch, retries, cooldowns         │
│  4. Dynamic Dashboard Spec ──▶ KPI Cards, Time-series, Rosters, Heatmaps        │
└───────────────┬───────────────────────┬───────────────────────┬─────────────────┘
                │                       │                       │
                ▼                       ▼                       ▼
┌──────────────────────────┐ ┌────────────────────┐ ┌─────────────────────────────┐
│  DETERMINISTIC EVALUATOR │ │  DATASET REGISTRY  │ │  ACTION & WORKFLOW ENGINE   │
│  • Boolean logic         │ │  • Safe typed data │ │  • Outbox pattern           │
│  • Temporal schedules    │ │  • Versioned model │ │  • Email, SMS, Webhook      │
│  • Dwell & hysteresis    │ │  • Row-level access│ │  • Sirens, Push alerts      │
│  • Spatial geofencing    │ │  • Aggregations    │ │  • Idempotency & retries    │
└───────────────▲──────────┘ └──────────▲─────────┘ └─────────────┬───────────────┘
                │                       │                         │
                ▼                       │                         ▼
┌───────────────────────────────────────┴──┐     ┌────────────────────────────────┐
│   SYSTEM-1: Fast Stream Reflex (<35ms)   │     │    AUDIT & EVIDENCE PACKAGING  │
│   • RelateAnything (RAM) Triplets        │     │  • 10s MP4 Clip (150 pre/post) │
│   • YOLOv8/v11 + YOLO-Pose + ByteTrack   │     │  • SHA-256 Cryptographic Hash  │
│   • 300-Frame In-Memory Ring Buffer      │     │  • Section 65B IEA / BNSS 2023 │
└──────────────────────────────────────────┘     └────────────────────────────────┘
```

### System-1: Fast Physical Reflex (<35ms Non-Autoregressive)
- **Perception**: YOLOv8/v11 for objects/PPE, YOLO-Pose for 17-point skeletons (fall, climb, altercations), ByteTrack for persistent tracking IDs and dwell timers.
- **Relational Scene Graphs (RAM)**: Extracts `<Subject, Predicate, Object>` triplets (e.g. `<worker, without, helmet>`, `<student, inside, classroom>`).
- **Laya & JEV**: Joint Embedding Vision non-autoregressive evaluator. Evaluates scene graphs against rule conditions in under 18.4ms per frame.
- **Decoupled RTSP Ring Buffer**: 300 frames in-memory ring buffer (10s rolling window at 30 FPS) with 3–5 FPS downsampled inference cadence. Zero disk I/O during normal streaming.

### System-2: Cognitive Reasoning & Meta-Orchestrator (DeepSeek-v4-Flash)
- Runs asynchronously outside the live frame loop via AgentRouter:
  - Base URL: `https://agentrouter.org/v1`
  - Model: `deepseek-v4-flash`
  - Bearer Token: `sk-0pi9rUsyRb4AhZUNCxrP7id4esBipyR1RYoSqIttOlP6P5tQ`
- Compiles natural language into strict JSON configurations.
- Proposes datasets, fields, indexes, and retention rules.
- Generates dynamic dashboard specifications (KPIs, charts, tables).
- Drafts court-admissible forensic incident narratives.

---

## 3. Metadata-Driven Dynamic Datasets & Safe Schema Governance

**Critical Anti-Pattern Avoidance**:
Do not generate arbitrary dynamic SQL or create physical tables with arbitrary names directly from user input.
Instead, implement a **Metadata-Driven Dataset Registry**:
1. `compliance_datasets`: Registered datasets with stable system identifiers (e.g. `ds_attendance_records`, `ds_hazard_incidents`, `ds_ppe_violations`), display names, version, owner tenant, and retention policy.
2. `compliance_dataset_fields`: Typed schema definitions per dataset (`string`, `integer`, `float`, `boolean`, `timestamp`, `json`) with constraints and indexing flags.
3. `compliance_dataset_records`: High-performance storage containing:
   - `record_id TEXT PRIMARY KEY`
   - `dataset_id TEXT NOT NULL`
   - `rule_id TEXT NOT NULL`
   - `event_time REAL NOT NULL`
   - `entity_id TEXT` (e.g. student_id, worker_id, camera_id)
   - `status TEXT` (e.g. 'ON_TIME', 'LATE', 'VIOLATION')
   - `confidence REAL`
   - `keyframe_url TEXT`
   - `evidence_hash TEXT`
   - `payload JSON` (structured record attributes conforming to dataset schema)
4. Full validation before insertion: incoming records are strictly validated against the registered field types.

---

## 4. Universal Compliance Studio (`/compliance`)

A complete command center providing:
- **Operational Health**: Active rules, evaluated events/sec, uptime, stream latency.
- **Natural Language Rule Compiler**: Conversational rule definition powered by DeepSeek-v4-Flash with real-time schema preview.
- **Visual Rule Builder**: Guided configuration of triggers, boolean logic, spatial geofences, dwell timers, calendar schedules, and actions.
- **1000+ Preset Rules Library**: Searchable, filterable across 15 domains, 1-click clone and customize.
- **Live Stream Wall**: Multi-camera RTSP views with interactive HTML5 polygon drawing canvas and active zone overlays.
- **Dynamic Dashboards**: Auto-adapting dashboards for Attendance, Hazard Safety, PPE Compliance, Healthcare Falls, and Access Control.
- **Incident & Evidence Center**: Live incident stream, keyframe viewer, 10s MP4 video player, SHA-256 seal verification, and triage buttons.
- **Dataset Registry & Query Console**: Inspect dynamic datasets, execute filtered aggregations, and export CSV reports.
- **Governance & Audit Trail**: Rule versions, rollback, approval workflow, and execution history.

---

## 5. Measurable Intelligence Acceptance Criteria

| Capability | Metric | Target Standard |
| :--- | :--- | :--- |
| **Rule Compilation** | Schema Validity Rate | >98% valid configurations with zero invented fields |
| **Ambiguity Handling** | Clarification Prompts | Identifies missing parameters instead of guessing |
| **Temporal Logic** | Schedule Boundary Accuracy | 100% adherence to weekdays, 09:10 AM, grace periods |
| **Spatial Evaluation** | Ray-Casting Polygon Check | Sub-5ms point-in-polygon and tripwire intersection |
| **Action Outbox** | Idempotency & Delivery | Zero duplicate notifications; full delivery tracking |
| **Evidence Integrity** | SHA-256 Verification | Cryptographic hash match across Section 65B exports |
| **Resilience** | Stream Disconnection Recovery | Auto-reconnect with zero unhandled exceptions |
| **Governance** | Version Rollback | Complete restore of prior configuration & execution audit |

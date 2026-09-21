# HAWK-I — System Working Flowchart & Architectural Pipeline

> **Unified AI-Powered CCTV Intelligence Platform**  
> **Academic Software Engineering Flowchart Specification (ISO 5807 Compliant)**  
> Prepared for B.Tech / CSE Capstone Technical Review, Faculty Evaluation & Report Documentation

---

## 1. Overview & Diagram Artifacts

The system working flow diagram has been prepared in a **vertical top-to-bottom architecture** with high-contrast, large-font components (**3600 × 9500 px Ultra-HD render**).

Every component, model endpoint, decision gate, parameter list, database table, and feedback loop is rendered with **large 13.5pt to 16pt body typography and 16pt to 25pt headers**, ensuring that **every single box and label is crisp and easily legible** when opened in image viewers or included in documents.

### Available Formats & Files

| File | Format | Resolution / Scale | Primary Academic Use Case |
| :--- | :--- | :--- | :--- |
| [`system-flow-diagram.png`](file:///e:/kashyap/Hawk-i/diagrams/system-flow-diagram.png) | **PNG** | **3600 × 9500 px** (Ultra-HD, 300+ DPI) | Project report printouts, Word/LaTeX documentation, zero distortion |
| [`system-flow-diagram.jpg`](file:///e:/kashyap/Hawk-i/diagrams/system-flow-diagram.jpg) | **JPG** | **3600 × 9500 px** (High Quality 95%) | Digital faculty submission, presentation slides |
| [`system-flow-diagram.svg`](file:///e:/kashyap/Hawk-i/diagrams/system-flow-diagram.svg) | **SVG** | Vector (Scalable to infinite resolution) | Web integration, draw.io / Visio imports, high-end vector rendering |
| [`system-flow-diagram.html`](file:///e:/kashyap/Hawk-i/diagrams/system-flow-diagram.html) | **HTML** | Interactive Web Viewer | In-browser pan/zoom, fit-to-width, live presentations, instant downloads |

*(Matching copies are also maintained under [`docs/architecture/`](file:///e:/kashyap/Hawk-i/docs/architecture/)).*

---

## 2. Standard Flowchart Notations (ISO 5807)

The flowchart strictly adheres to standard software engineering notation:

1. **Oval / Rounded Terminator (`START` / `END`):** System ingestion start, rejection endpoints, and continuous monitoring steady-states.
2. **Parallelogram (`Input / Output`):** CCTV stream/file inputs, operator review, natural language queries, and rendered intelligence displays.
3. **Rectangle (`Process / Operation`):** Concrete computational stages, frame sampling, tensor inference, coordinate normalization, database writes, and vector cosine calculations.
4. **Diamond (`Decision / Branching`):** Conditional validation gates with explicitly labeled `YES` / `NO` routing paths.
5. **Cylinder (`Database / Storage`):** MySQL 8.0 central persistent repository showing relational tables and vector embeddings.
6. **Directed Arrows & Orthogonal Buses:** Control flow, parallel dispatch buses, normalization convergence lines, and feedback loops.

---

## 3. End-to-End Processing Flow

```
STAGE 1: System Start & Video Input Validation
  [START] → [CCTV Stream Input] → [Video Input Validation & Probe] → <Valid Video Source?>
                                                                      ├─ NO ──→ [Reject / 400 Bad Request] → [END / Retry]
                                                                      └─ YES
                                                                         ↓
STAGE 2: Shared Video Ingestion & Frame Sampling Pipeline
  1. Video Ingestion Service (VideoIngestor Context Manager)
  2. Video File / Stream Lifecycle Management (Safe temp-file cleanup)
  3. Frame Extraction Engine (OpenCV cv2.VideoCapture)
  4. Configurable Frame Sampling (Default 5 FPS, dynamic step downsampling)
  5. Frame Timestamp & Index Generation (timestamp_sec & ISO-8601 detected_at)
  6. Frame Preprocessing & Tensor Normalization (BGR → RGB, dimension scaling)
                                                                         ↓
═════════════════════════════════════════════════════════════════════════════════════════════════════════
STAGE 3: Parallel Detection Modules (6 Concurrent Inference Engines in 2 Rows)
  Row 1:
  ┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
  │         1. ANPR              │    2. OBJECT MISPLACEMENT    │ 3. VELOCITY / SPEED DETECTION│
  │ • YOLOv8 Plate Detection     │ • YOLOv8 Object Classifier   │ • YOLOv8 Vehicle Detection   │
  │ • EasyOCR Text Recognition   │ • Baseline Reference Matrix  │ • ByteTrack Motion Tracker   │
  │ • Plate Regex Formatting     │ • Temporal Matrix Difference │ • 2-Point Distance Calib     │
  │ • Vehicle-Plate Link         │ • Displaced Object Alert     │ • Speed Threshold Violation  │
  └──────────────┬───────────────┴──────────────┬───────────────┴──────────────┬───────────────┘
                 │                              │                              │
  Row 2:         │                              │                              │
  ┌──────────────┴───────────────┬──────────────┴───────────────┬──────────────┴───────────────┐
  │    4. UNAUTHORIZED ENTRY     │  5. THREAT & ANOMALY DETECT  │ 6. SEMANTIC / KEYWORD SEARCH │
  │ • Polygon Zone Overlay       │ • Human Track & Pose History │ • Scene Context & Tagging    │
  │ • Ray-Casting Point-in-Poly  │ • Loitering Duration Monitor │ • NL Description Generation  │
  │ • Entry Sequence Tracking    │ • Restricted-Zone Activity   │ • MiniLM-L6-v2 Embeddings    │
  │ • Perimeter Breach Trigger   │ • Panic / Sudden Speed Alert │ • 384-dim Dense Vector Store │
  └──────────────┬───────────────┴──────────────┬───────────────┴──────────────┬───────────────┘
                 └──────────────────────────────┼──────────────────────────────┘
                                                ↓
═════════════════════════════════════════════════════════════════════════════════════════════════════════
STAGE 4: Normalization, Canonical Event & Database Persistence
  [Detection Result Normalization Layer]
                ↓
  [Canonical DetectionEvent Builder (EventBuilder)]
                ↓
  <Valid Detection Event Contract?> ── NO ──→ [Discard / Log Schema Violation]
                ↓ YES
  [Event Persistence Service (Express Backend)] ──→ [HAWK-I CENTRAL DATABASE (MySQL 8.0)]
                                                    (detection_events | cameras | alerts | vehicles | embeddings)
                                                                ↓
═════════════════════════════════════════════════════════════════════════════════════════════════════════
STAGE 5: Parallel Event Intelligence & Microservices (2 Rows)
  Row 1:
  ┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
  │       A. ALERT ENGINE        │   B. SEMANTIC SEARCH ENGINE  │ C. VEHICLE & ANPR LOG SERVICE│
  │ • Severity Rule Matching     │ • NL Query Processing        │ • GET /api/vehicles Registry │
  │ • Creates Open Alerts        │ • MiniLM Query Embeddings    │ • Hotlist Flag Verification  │
  │ • Real-time Toast Delivery   │ • Cosine Vector Matching     │ • Searchable Audit Trail     │
  └──────────────┬───────────────┴──────────────┬───────────────┴──────────────┬───────────────┘
                 │                              │                              │
  Row 2:         │                              │                              │
  ┌──────────────┴───────────────┬──────────────┴──────────────────────────────┘
  │ D. ANALYTICS & AGGREGATION   │   E. CAMERA HEALTH SERVICE   │
  │ • GET /api/analytics         │ • Continuous Stream Ping     │
  │ • Hourly Violation Graphs    │ • Online / Offline Logic     │
  │ • Camera Density Heatmaps    │ • Diagnostic Log Recording   │
  └──────────────┬───────────────┴──────────────┬───────────────┘
                 └──────────────────────────────┼──────────────────────────────┘
                                                ↓
═════════════════════════════════════════════════════════════════════════════════════════════════════════
STAGE 6 & 7: Frontend Application & Closed-Loop Operator Interaction
  [HAWK-I Web Dashboard (React + TypeScript + Vite Single-Page Application)]
  (Live Matrix | ANPR | Velocity | Misplacement | Entry | Threat | Search | Alerts | Vehicles | Analytics | Admin)
                ↓
  [RENDERED INTELLIGENCE & ALERTS DISPLAY (I/O)]
                ↓
  [CCTV OPERATOR / SECURITY OFFICER REVIEWS EVENT (I/O)]
                ↓
  <Further Action Required?>
    ├─ YES ──→ [Forensic Investigation & Feedback Submission] ── (Feedback Loop back to DB/Dashboard)
    └─ NO  ──→ [CONTINUOUS SURVEILLANCE ACTIVE] ─────────────── (Loop back to Ingestion Cycle)
```

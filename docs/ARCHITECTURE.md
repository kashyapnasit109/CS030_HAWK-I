# System Architecture & Folder Layout

## High-Level Architecture
HAWK-I operates on a modular, decoupled three-tier architecture connecting a React user interface, an Express API gateway, and a FastAPI computer vision inference engine.

```
       +---------------------------------------------+
       |             React/Vite Frontend             |
       +----------------------++----------------------+
                              || HTTP / REST
                              \/
       +---------------------------------------------+
       |             Node/Express Backend            |
       +------++-----------------------------++------+
              || HTTP / REST                 || SQL
              \/                             \/
+-----------------------------+     +-----------------+
|  Python/FastAPI ML Service  |     |  MySQL Database |
+-------------++--------------+     +-----------------+
              || Imports
              \/
+-----------------------------+
|    Computer Vision Models   |
| (YOLOv8, EasyOCR, MiniLM)   |
+-----------------------------+
```

### Role of Each Layer

1. **React/Vite Frontend:**
   - Provides a responsive, high-contrast dashboard using the Chakra Petch, Outfit, and Inter typography systems.
   - Handles operator interaction, including live log reviews, manual test bench video uploads, camera administration, and natural language search inputs.
   - Enforces Role-Based Access Control (RBAC) constraints on views and actions.

2. **Node/Express Backend:**
   - Serves as the central API gateway and orchestrator.
   - Manages operator authentication and session tokens (JWT) and checks security roles.
   - Communicates with the ML Service to proxy user test bench uploads or text searches.
   - Generates natural language event descriptions and maintains the relational schema in the MySQL database.
   - Handles mock and simulated camera feeds, generating alert logs and camera health histories.

3. **Python/FastAPI ML Service:**
   - Serves as a dedicated high-performance inference engine.
   - Loads singleton computer vision models (YOLOv8 weights, EasyOCR reader, SentenceTransformer) into memory at startup.
   - Exposes REST endpoints to parse uploaded video files/frames and execute module-specific pipelines.

4. **Database (MySQL):**
   - Stores user credentials, camera records, virtual zone details, and event logs.
   - Houses the `event_embeddings` table storing event summaries and vector embeddings for semantic search.

---

## Detection Pipeline
When a video file or stream frame is ingested by the platform, it passes through the following steps:

```
[Video Input]
      ↓
[Frame Extraction]
      ↓
[Object Detection & Tracking] (YOLOv8 / ByteTrack)
      ↓
[Feature Extraction] (EasyOCR text / coordinates speed / frame diffs)
      ↓
[Rule/Heuristic Engine] (Correlation with access logs / restricted zone polygon limits)
      ↓
[Event & Metadata JSON Generation]
      ↓
[Database Persistence] (Node Backend records event and creates text embedding)
      ↓
[Alert & Search indexing] (Available immediately for UI querying and alerts center)
```

---

## Common Detection Event Structure
All detection modules generate events conforming to a standardized schema stored in the `detection_events` table:

```json
{
  "event_id": 104,
  "camera_id": 2,
  "detected_at": "2026-08-10T12:00:00.000Z",
  "module": "vehicle",
  "object_type": "car",
  "confidence": 0.985,
  "bounding_box": {
    "x": 120,
    "y": 220,
    "w": 150,
    "h": 100
  },
  "zone": "Entry Gate Checkpoint",
  "severity": "low",
  "metadata": {
    "plate_text": "KA-01-AB-1234",
    "registry_match": true,
    "speed_kmh": 45
  }
}
```

---

## Folder Structure
The actual current structure of the HAWK-I project is laid out as follows:

```
HAWK-I/
├── backend/                   # Node/Express API Server
│   ├── config/                # Database pool connection configuration
│   ├── controllers/           # Endpoint controllers (auth, alerts, cameras, search)
│   ├── middleware/            # JWT authentication middleware
│   ├── routes/                # Express API routes
│   ├── scripts/               # DB bootstrap and vector backfill scripts
│   ├── services/              # AI call wrappers and description text generators
│   ├── .env                   # Local environment parameters (gitignored)
│   ├── package.json           # Node project dependencies
│   └── server.js              # Backend server gateway entrypoint
│
├── database/                  # MySQL Relational Database Scripts
│   ├── schema.sql             # SQL definitions for core tables
│   ├── seed.sql               # Seed scripts (operator users, mock cameras)
│   ├── migrate_prompt8.sql    # Migration script adding event_embeddings
│   └── README.md              # Database setup documentation
│
├── docs/                      # Project Specifications and Architecture Guides
│   ├── ARCHITECTURE.md        # System architecture and folder layout (this file)
│   ├── PROJECT_SPECIFICATION.md # Project objectives, statement, and features
│   ├── REQUIREMENTS.md        # Software Requirements Specification (SRS)
│   ├── USE_CASES.md           # Mermaid use case diagrams and workflows
│   └── README.md              # Index of documentation
│
├── frontend/                  # React/Vite Single Page Application (SPA)
│   ├── assets/                # Core visual assets (hawk-i-mark.png)
│   ├── public/                # Static public directory
│   ├── src/
│   │   ├── components/        # Shared components (AppShell layout, ui cards, buttons)
│   │   ├── context/           # React context (Auth context)
│   │   ├── design-tokens/     # Design token variables (colors)
│   │   ├── pages/             # Page views (Dashboard, Alerts, Search, Test Benches)
│   │   ├── App.tsx            # Main router and shell layout setup
│   │   ├── index.css          # Tailwind configurations and utility styles
│   │   └── main.tsx           # React entry point mounting to root
│   ├── package.json           # Node package dependencies
│   └── vite.config.ts         # Vite bundler configurations
│
└── ml-service/                # Python Computer Vision Inference API (FastAPI)
    ├── models/                # Singleton model loaders (loader.py)
    ├── routes/                # FastAPI endpoint handlers (anpr, velocity, search)
    ├── main.py                # FastAPI server entrypoint
    ├── requirements.txt       # Python library dependencies (YOLO, EasyOCR, PyTorch)
    └── yolov8n.pt             # YOLOv8 object detection model weights (gitignored)
```

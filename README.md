# 🦅 Hawk-I — Unified AI-Powered CCTV Intelligence Platform

Hawk-I is a next-generation, dark-glassmorphic **security command center platform** that merges live multi-camera surveillance feeds, real-time computer vision AI alerts, and role-based operator controls into a unified, high-density interface.

---

## 📸 Key Platform Features

- 💎 **Jewel-Tone Glassmorphic Aesthetic:** Deep charcoal-navy background (`#020306`) with frosted glass panels, ambient colored light glows, and custom typography (Chakra Petch for headers & wordmark, Outfit for displays, Inter for body/tables).
- 🔐 **Role-Based Authentication (RBAC):** Secure JWT-based session authorization supporting **Admin**, **Operator**, and **Viewer** roles with server-enforced privilege checks.
- ⚡ **Resilient Hybrid Data Layer:** Connects to a live **MySQL database** via pooled connection queries, with built-in **automatic fallback mode** for offline or zero-configuration development runs.
- 📊 **Real-Time Analytics & KPI Metrics:** Visualizes system throughput, AI detections today, active stream FPS, camera health indices, and alert severity distributions.
- 🚨 **Interactive Security Alerts:** Live alert feed with filterable severity levels (High/Medium/Info) and status lifecycle state transitions (Open → Acknowledged → Resolved).
- 🔍 **Natural Language Semantic Search:** Allows operators to search historical event summaries using natural language queries, supported by local vector embeddings.

---

## 🦅 Six Core Intelligence Modules

1. **ANPR / Number Plate Recognition (Module 1):** Detects license plates using YOLOv8, extracts text via EasyOCR, and checks against the registered vehicles database.
2. **Object Misplacement Detection (Module 2):** Compares reference and current frames to flag new (`#9F2138` burgundy) or missing (`#3D6FE0` sapphire) objects using background differencing and YOLOv8 classification.
3. **Semantic Query Search (Module 3):** Generates vector embeddings using `all-MiniLM-L6-v2` to enable semantic description queries over detection logs.
4. **Velocity Detection (Module 4):** Tracks moving targets using ByteTrack, estimating vehicle speed in real time based on camera perspective and video FPS.
5. **Unauthorized Entry Detection (Module 5):** Evaluates human bounding boxes within perimeter polygons and correlates presence against gate entry logs to identify intruders.
6. **Threat / Anomaly Detection (Module 6):** Runs rule-based heuristics over object coordinates and class associations to flag high-risk situations (e.g. loitering at midnight, weapon detection).

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend UI** | React 19 + Vite | TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion |
| **Backend API** | Node.js + Express | RESTful API, MySQL2 connection pool, JWT Auth, Multer, dotenv |
| **ML Microservice** | Python 3.11 + FastAPI | Ultralytics YOLOv8, EasyOCR (PyTorch), OpenCV, SentenceTransformers |
| **Database** | MySQL 8.0 / MariaDB | Relational tables inside XAMPP |

---

## 📂 Repository Layout & Architecture

```text
Hawk-i/
├── frontend/                   # Client-side React 19 + Vite Web Application
│   ├── assets/                 # Core visual assets (hawk-i-mark.png)
│   ├── src/
│   │   ├── components/         # Reusable Component Library (layout & ui primitives)
│   │   ├── pages/              # Page views (Dashboard, Alerts, Search, Test Benches)
│   │   ├── index.css           # Global glassmorphism styles & Tailwind configurations
│   │   └── main.tsx            # Application DOM root
│
├── backend/                    # Node.js + Express API Gateway
│   ├── config/                 # MySQL2 connection pool initialization
│   ├── controllers/            # Controller logic (auth, alerts, search, modules)
│   ├── scripts/                # Database setup & vector backfill utilities
│   ├── services/               # AI wrapper and description text generator
│   └── server.js               # Express server entry point (Port 3000)
│
├── ml-service/                 # Python FastAPI Computer Vision Service
│   ├── models/                 # Singleton loaders (YOLOv8 + EasyOCR + Embeddings)
│   ├── routes/                 # FastAPI routes (anpr, velocity, search, threat, entry)
│   └── main.py                 # FastAPI application entry (Port 8000)
│
├── database/                   # Database Schemas & Seed Data
│   ├── schema.sql              # MySQL DDL script
│   ├── seed.sql                # SQL DML seed script
│   └── migrate_prompt8.sql    # Migration script adding event_embeddings
│
├── docs/                       # System documentation & specifications
└── README.md                   # Project documentation (this file)
```

---

## ⚡ Quick Start & Installation

### 1. Database Setup (MySQL via XAMPP)
Ensure MySQL is running on port `3306`. Navigate to `/backend` and run the bootstrap script to automatically create `hawki_db`, apply the schemas, insert seed data, and execute migrations:
```bash
cd backend
npm install
node scripts/setupDb.js
```

### 2. ML Microservice (Python FastAPI)
Open a terminal in `/ml-service`:
```bash
cd ml-service

# Create & activate Python virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Install dependencies & run ML service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Verify ML service health at: `http://localhost:8000/health`*

### 3. Backend API (Node.js Express)
Open a terminal in `/backend`:
```bash
cd backend
npm run dev
```
*Server starts on: `http://localhost:3000`*

### 4. Frontend Application (React + Vite)
Open a terminal in `/frontend`:
```bash
cd frontend
npm install
npm run dev
```
*Access UI at: `http://localhost:5173`*

---

## 🔑 Operator Credentials (Test Accounts)

You can log in to the platform with any of the seeded test accounts:

| Role | Operator ID (Username) | Password | Clearance Permissions |
|------|------------------------|----------|------------------------|
| **Admin** | `admin` | `admin123` | Full access, system config, alert resolution |
| **Operator** | `operator` | `operator123` | Surveillance monitoring, alert acknowledgment/resolution |
| **Viewer** | `viewer` | `viewer123` | Read-only view (mutations blocked by RBAC) |

---

## 📡 API Endpoints Overview

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/login` | Public | Authenticates credentials, returns signed JWT |
| `GET` | `/api/cameras` | Authenticated | Lists all connected cameras and RTSP statuses |
| `GET` | `/api/alerts` | Authenticated | Retrieves security alerts with optional severity filters |
| `PATCH` | `/api/alerts/:id` | Admin / Operator | Updates alert status (`acknowledged` or `resolved`) |
| `GET` | `/api/vehicles` | Authenticated | Searches registered vehicle logs |
| `POST` | `/api/search` | Authenticated | Cosine-similarity natural language query over events |
| `GET` | `/api/analytics/summary` | Authenticated | Aggregates system metrics, camera counts & detection totals |
| `POST` | `/api/modules/anpr/test` | Authenticated | Uploads image, runs ANPR, and performs SQL match |
| `POST` | `/api/modules/velocity/test` | Authenticated | Uploads video, tracks targets and calculates velocity |
| `POST` | `/api/modules/misplacement/test` | Authenticated | Uploads current/reference frames, checks misplacement |
| `POST` | `/api/modules/threat/test` | Authenticated | Ingests clip, runs threat assessment checks |
| `POST` | `/api/modules/entry/test` | Authenticated | Ingests clip, checks zone boundary and gate access |

---

## 👥 Team Members & Responsibilities
- **Kashyap:** Platform Architecture, Semantic Search (Module 3), Node.js API Gateway, Alert Engine, Threat Heuristics.
- **Hitansh:** ANPR (Module 1), Speed Calibration & Tracking (Module 4), React Dashboard & Test Bench UIs.
- **Meet:** Object Misplacement (Module 2), Unauthorized Entry (Module 5), Unit Testing & Stream Simulations.

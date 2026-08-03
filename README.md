# 🦅 Hawk-I — Unified AI-Powered CCTV Intelligence Platform

Hawk-I is a next-generation, dark-glassmorphic **security command center platform** that merges live multi-camera surveillance feeds, real-time computer vision AI alerts, automatic number plate recognition (ANPR), vehicle registry cross-checking, and role-based operator controls into a unified, high-density interface.

---

## 📸 Key Platform Features

- 💎 **Jewel-Tone Glassmorphic Aesthetic**: Deep charcoal-navy background (`#0A0A0C`) with frosted glass panels, ambient colored light glows, and custom typography (*Clash Display* for headers & metrics, *Inter* / *Outfit* for data displays).
- 🔐 **Role-Based Authentication (RBAC)**: Secure JWT-based session authorization supporting **Admin**, **Operator**, and **Viewer** roles with server-enforced privilege checks.
- ⚡ **Resilient Hybrid Data Layer**: Connects to a live **MySQL database** via pooled connection queries, with built-in **automatic fallback mode** for offline or zero-configuration development runs.
- 🚘 **ANPR & Vision Modules Test Bench**: Real-time License Plate Recognition (YOLOv8 + EasyOCR), **Velocity Detection** (YOLOv8 ByteTrack + OpenCV dynamic FPS + 2-point pixel-to-meter spatial calibration), and **Object Misplacement Detection** (OpenCV background differencing + reference/current frame YOLOv8 object classification).
- 🎨 **Jewel-Tone Design System**: Burgundy (`#9F2138`) for newly placed objects, Sapphire (`#3D6FE0`) for missing objects, Emerald for normal speeds, and Crimson for speed limit violations.
- 📊 **Real-Time Analytics & KPI Metrics**: Visualizes system throughput, AI detections today, active stream FPS, camera health indices, and alert severity distributions with responsive Area & Donut charts.
- 🚨 **Interactive Security Alerts**: Live alert feed with filterable severity levels (High/Medium/Info) and status lifecycle state transitions (Open → Acknowledged → Resolved).

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend UI** | React 18 + Vite | TypeScript, Tailwind CSS, Lucide Icons, Recharts |
| **Backend API** | Node.js + Express | RESTful API, MySQL2 connection pool, JWT Auth, Multer |
| **ML Microservice** | Python 3.10+ + FastAPI | Ultralytics YOLOv8, EasyOCR (PyTorch), OpenCV |
| **Database** | MySQL 8.0 / MariaDB | 9 Relational tables with foreign key constraints |

---

## 📂 Repository Layout & Architecture

```text
Hawk-i/
├── frontend/                   # Client-side React 18 + Vite Web Application
│   ├── public/                 # Static assets, SVG icons, and logo branding
│   ├── src/
│   │   ├── components/         # Reusable Component Library
│   │   │   ├── layout/         # Navigation Shell (AppShell, Sidebar, TopBar)
│   │   │   └── ui/             # Design Tokens & UI Primitives (Card, Button, Badge, Logo, ProgressRing, StatCard)
│   │   ├── context/            # React Context (AuthContext for JWT & user state)
│   │   ├── design-tokens/      # Color palettes, ambient glows, and glass utility tokens
│   │   ├── pages/              # Application Page Views
│   │   │   ├── DashboardPage.tsx     # Command center KPI overview & camera health grid
│   │   │   ├── ANPRTestBench.tsx     # ML-powered Number Plate Detection test bench
│   │   │   ├── AlertsPage.tsx        # Security alert log & status resolution
│   │   │   ├── VehicleLogPage.tsx    # Detected vehicle registry log
│   │   │   ├── LiveViewPage.tsx      # Multi-camera grid view
│   │   │   ├── SearchPage.tsx        # Natural-language & attribute search
│   │   │   ├── AnalyticsPage.tsx     # Detailed module throughput charts
│   │   │   ├── ZonesCamerasPage.tsx  # Camera & zone management
│   │   │   ├── SettingsPage.tsx      # Platform configuration
│   │   │   └── LoginPage.tsx         # Operator login & clearance authentication
│   │   ├── App.tsx             # Protected client-side router
│   │   ├── index.css           # Global glassmorphism styles & Tailwind utilities
│   │   └── main.tsx            # Application DOM root
│   ├── package.json
│   └── vite.config.ts          # Vite dev server config with /api proxy target
│
├── backend/                    # Node.js + Express API Gateway
│   ├── config/
│   │   └── db.js               # MySQL2 connection pool initialization
│   ├── controllers/            # Controller Business Logic (with DB query + fallback support)
│   │   ├── auth.js             # User login & JWT signing
│   │   ├── cameras.js          # RTSP stream status & camera metadata
│   │   ├── alerts.js           # Alert retrieval & status updates
│   │   ├── vehicles.js         # Registered vehicle lookup
│   │   ├── analytics.js        # Dashboard aggregation summary
│   │   └── modules.js          # ANPR image forwarding to ML service + SQL matching
│   ├── middleware/
│   │   └── auth.js             # Bearer JWT verification & role authorization
│   ├── routes/                 # Express Endpoint Routers
│   │   ├── auth.js             # POST /api/auth/login
│   │   ├── cameras.js          # GET /api/cameras
│   │   ├── alerts.js           # GET /api/alerts, PATCH /api/alerts/:id
│   │   ├── vehicles.js         # GET /api/vehicles
│   │   ├── analytics.js        # GET /api/analytics/summary
│   │   └── modules.js          # POST /api/modules/anpr/test
│   ├── server.js               # Express server entry point (Port 3000)
│   └── package.json
│
├── ml-service/                 # Python FastAPI Computer Vision Service
│   ├── models/
│   │   └── loader.py           # Singleton manager loading YOLOv8 + EasyOCR once into RAM
│   ├── routes/
│   │   └── anpr.py             # POST /detect/anpr (Vehicle detection -> crop -> OCR)
│   ├── main.py                 # FastAPI application entry & GET /health check (Port 8000)
│   ├── requirements.txt        # Pinned Python ML dependencies
│   └── README.md
│
├── database/                   # Database Schemas & Seed Data
│   ├── schema.sql              # MySQL DDL script (9 relational tables)
│   └── seed.sql                # SQL DML seed script (Default users, cameras, alerts, vehicles)
│
├── docs/                       # System documentation & specs
└── README.md                   # Project documentation (this file)
```

---

## ⚡ Quick Start & Installation

Follow these steps in order to start all Hawk-I services:

### 1. Database Setup (MySQL / phpMyAdmin)
Import `database/schema.sql` and `database/seed.sql` into your local MySQL server:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
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

# Create environment file
cp .env.example .env

# Install dependencies & start server
npm install
npm start
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
| `GET` | `/api/analytics/summary` | Authenticated | Aggregates system metrics, camera counts & detection totals |
| `POST` | `/api/modules/anpr/test` | Authenticated | Uploads image, runs ML ANPR pipeline, and performs SQL match |
| `GET` | `http://localhost:8000/health` | Public | ML service status report (YOLOv8 + EasyOCR load status) |

---

## 📄 License & Attribution

Built for **Hawk-I Surveillance Intelligence Platform**. All UI components adhere to custom jewel-tone dark-mode design specifications.

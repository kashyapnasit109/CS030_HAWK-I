# Hawk-I

**Unified AI-Powered CCTV Intelligence Platform**

Hawk-I gives security operators a live multi-camera dashboard, AI-generated alerts, and natural-language search over recorded footage — all in one calm, precise command-center interface.

---

## Repository Layout

```
Hawk-i/
├── frontend/       → React + Vite + TypeScript + Tailwind CSS
│                     UI shell, design system, routing, and all client components.
│
├── backend/        → Node.js + Express
│                     REST API server. Handles auth, data access, and ML-service orchestration.
│
├── ml-service/     → Python (planned)
│                     Computer-vision inference, alert generation, and NL search.
│
├── database/       → PostgreSQL + pgvector (planned)
│                     Schema definitions, migrations, seed data.
│
└── docs/           → Project documentation
                      Architecture diagrams, API specs, runbooks.
```

## Quick Start

```bash
# Frontend
cd frontend
npm install
npm run dev          # → http://localhost:5173

# Backend
cd backend
npm install
npm run dev          # → http://localhost:3001
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, lucide-react, recharts |
| Backend | Node.js, Express, TypeScript |
| ML Service | Python, (TBD — planned) |
| Database | PostgreSQL + pgvector (planned) |

## Status

🟢 **Prompt 1 complete** — Project scaffolding & design system  
⬜ Prompt 2+ — AI/ML integration, database, authentication (upcoming)

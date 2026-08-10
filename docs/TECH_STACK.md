# Technology Stack

This document lists the officially selected technologies and packages actively used in the HAWK-I CCTV Intelligence Platform.

## Frontend
- **React (v19.2.8):** Declarative component library for rendering state, managing dashboard views, and structuring user interactions.
- **Vite (v8.2.0):** Lightweight build tool and dev server providing rapid Hot Module Replacement (HMR).
- **TypeScript (v6.0.2):** Used for type safety, interfaces, and compile-time verification across UI state and API requests.
- **TailwindCSS (v4.3.3) & `@tailwindcss/vite`:** Utility-first CSS framework used for UI layout, interactive glass-panel styling, and theme tokens configuration.
- **Recharts (v3.10.1):** Data visualization library utilized for dashboard stats and camera uptime indexes.
- **Lucide React (v1.28.0):** High-contrast iconography system matching the clean, technical design language.
- **Motion (v13.0.0):** Micro-interactions and subtle transitions library.

## Backend
- **Node.js (v22.19.0):** Javascript runtime environment powering the API.
- **Express.js (v4.22.2):** REST framework routing user requests, handling middleware authentication, and serving metadata controllers.
- **mysql2 (v3.23.2):** High-performance MySQL driver with promise support.
- **jsonwebtoken (v9.0.3):** Used to sign and verify secure session tokens.
- **bcrypt (v6.0.0):** Utilized for hashing and validating operator passwords in the database.
- **node-fetch (v3.3.2):** Used for server-to-server HTTP communication between the Node backend and the FastAPI ML service.
- **multer (v2.2.0):** Middleware for parsing multipart form data uploads (video clips in test benches).

## ML / Computer Vision (FastAPI Engine)
- **Python (v3.11):** Scripting environment for ML inference.
- **FastAPI (v0.115.0):** High-performance API framework utilized for exposing vision model routes.
- **uvicorn (v0.30.6):** ASGI web server powering the ML service.
- **ultralytics (v8.2.0):** Package powering YOLOv8 object detection, segmentation, and ByteTrack frame-by-frame tracking.
- **easyocr (v1.7.1):** Optical Character Recognition (OCR) module used by the ANPR module to parse text from license plates.
- **sentence-transformers (v5.6.1):** Machine learning module utilizing the **all-MiniLM-L6-v2** text embedding model to represent event summaries for semantic search.
- **opencv-python (v4.10.0.84):** Frame extraction, coordinate plotting, and video FPS retrieval utility.
- **numpy (v1.26.x) & Pillow (v10.x):** Multi-dimensional array operations and image resizing.

## Database
- **MySQL / MariaDB:** Local relational database management system. In this local configuration, MySQL is hosted on port `3306` inside **XAMPP**.

## Infrastructure & Deployments
- **Local Host Execution:** Frontend, backend, and FastAPI engines run locally inside standalone node/python runtimes.
- **dotenv (v17.4.2):** Environment variable loader for backend and python-dotenv for ML service config.

## Development Tools
- **Git & GitHub:** Version control system and collaborative project repository hosting.
- **VS Code:** Native editor environment.
- **npm:** Package manager.

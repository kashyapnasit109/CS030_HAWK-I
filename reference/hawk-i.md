# SentinelVision — AI CCTV Investigation & VMS Platform
### Complete Build Specification for Law Enforcement / Cyber Cell Deployment
*Merged from your original SentinelVision spec + the official "AI-based CCTV Analysis Tool" problem statement (investigator workflows: reference-image search, keyword search, forensic export). Written to be pitch-ready for Gujarat Police / Cyber Cell and investor-ready as a product.*

---

## 0. Positioning

SentinelVision is no longer "a smart-campus CCTV add-on." It is now positioned as an **investigation-grade AI video intelligence platform + full VMS (Video Management System)**, built for two audiences at once:

1. **The investigator** (Cyber Cell officer, IO on a missing-person/theft/terror case) — needs to drop in hours of footage from multiple cameras and timeframes, search it by a suspect's photo or a plain-language description ("man in black jacket, red helmet"), and get back timestamped, exportable, forensically defensible evidence — in minutes, not days.
2. **The control-room operator** — needs a normal VMS: live multi-camera wall, continuous recording, playback with a scrubbable timeline, camera health, and automated alerting — because no department will deploy a search tool that isn't also their day-to-day monitoring system.

Every requirement from the official problem statement is mapped below to a concrete module so nothing gets lost:

| Problem statement requirement | SentinelVision module |
|---|---|
| Ingest .mp4/.avi/.mov, batch upload, multiple cameras/timeframes | **Case Management & Batch Ingestion** (Phase 9) |
| Search by reference image (face/object/vehicle re-ID) | **Reference Image Search** (Phase 10) |
| Search by keyword/tag/natural language, object detection, pose, colour/attribute | **Keyword & Attribute Search** (Phase 11) + existing Module 6 semantic search |
| Result display: frames, timestamp, camera ID, export clips/reports/annotated images | **Events Explorer / Event Detail**, **Forensic Export** (Phase 17) |
| Frame filtering from long footage | Core detection+tracking pipeline (Phase 5) feeding all search modules |
| Multi-language keywords (Hindi/Gujarati) | **Multilingual Semantic Search** (Phase 12) |
| Filtering by time window, motion, activity zones | Zones (existing) + Recordings timeline (Phase 15) |
| ANPR / face-recognition integration | Module 1 (ANPR, existing) + Phase 10 (face re-ID) |
| Chain-of-custody metadata, report generation | **Forensic Export & Chain-of-Custody** (Phase 17) |
| Live-feed snapshot scanning (future) | Live View + watchlist engine (Phase 14), architected to extend to live RTSP later |
| VMS: manage/view all CCTVs, recordings, analytics | Camera Management + Recordings + Reports (Phases 4, 15, 16) |

---

## 1. Critical Technology Decision — Why NOT pure PHP, and how phpMyAdmin still fits

You asked to use phpMyAdmin/MySQL, and PHP/HTML/CSS/JS where possible, with other languages only where required. Here's the honest engineering call, worth stating explicitly in your pitch/report so no one on a technical panel catches you off guard:

- **phpMyAdmin is not a database or a language — it's a GUI on top of MySQL.** You keep it. Every table below lives in MySQL, and phpMyAdmin remains your inspection/admin tool throughout development and in production for DB audits.
- **PHP itself cannot run YOLOv8, face-recognition embeddings, OCR, or re-identification models in real time.** There is no mature, maintained computer-vision stack in PHP comparable to Python's (Ultralytics, PyTorch, InsightFace, EasyOCR). Forcing the AI pipeline into PHP would mean either shelling out to Python scripts per-request (slow, fragile, insecure) or reimplementing vision models — neither is viable for a working, accurate, production system, and a technical judge will see through it immediately.
- **Recommended stack (final):**
  - **Database:** MySQL 8.x, managed via phpMyAdmin — as requested.
  - **AI/backend core:** Python (FastAPI) — REST API, WebSocket alerts, and the always-on AI pipeline (detection, tracking, re-ID, OCR, NLP search parsing) live here, talking to the same MySQL database.
  - **Frontend:** React (Vite) + Tailwind — for a genuinely modern, fast, dark investigator UI (a plain HTML/CSS/JS admin panel cannot deliver the live-wall, canvas zone-drawing, WebSocket alerting, or timeline-scrubbing UX this product needs to look investable).
  - **Optional PHP surface:** if your evaluators specifically want to see PHP in the stack, add a **thin PHP/HTML/CSS/JS "Legacy Records Portal"** (read-only) that queries the same MySQL database directly for simple case lookups/report downloads — genuinely useful for low-bandwidth police-station terminals, and it demonstrates PHP competency without putting AI workloads on it. This is optional (Phase 22) and never sits on the critical path.
  - This is the same architecture real VMS + investigation products (Milestone, Genetec, BriefCam) use: Python/C++ AI core, web frontend, SQL database. Say this explicitly in your pitch — it signals you understood the problem, not just followed instructions literally.

---

## 2. Team Structure (layer-based, extended for the new scope)

| Role | Owns |
|---|---|
| **Frontend Engineer** | React dashboard: all VMS + investigation pages, zone-drawing, live wall, playback/timeline, reference-image upload UI, multilingual search UI, forensic export UI, watchlist UI |
| **Backend Engineer** | MySQL schema (phpMyAdmin), REST API, JWT + RBAC + 2FA, WebSocket server, media/recording storage, chain-of-custody logging, automation/cron |
| **Model Testing & Integration Engineer** | YOLOv8 detection/tracking, all 6 original modules, **face + person + vehicle re-identification**, **attribute/pose recognition**, **multilingual NLP query parsing**, dataset collection/fine-tuning, evaluation, DB integration |

Same Week-0 joint setup, branch strategy, and integration-checkpoint cadence as before (§2, §6–8 of your original work guide still apply — no changes needed there beyond adding the new modules to each person's later-week checklist).

---

## 3. Complete Module List (12 total)

| # | Module | Type | What it does |
|---|---|---|---|
| 1 | ANPR | Core | Detect + OCR vehicle plates |
| 2 | Velocity Estimation | Core | Calibrated speed estimation |
| 3 | Unauthorized Entry | Heuristic | Person in restricted zone/hours |
| 4 | Object Misplacement | Heuristic | Static abandoned object |
| 5 | Anomaly (loitering/crowd/fast-motion) | Heuristic, honestly scoped | Rule-based flags, not "threat AI" |
| 6 | Semantic Search (English) | Core | NL query → structured filter → SQL |
| 7 | **Reference Image Search (Face + Person + Vehicle Re-ID)** | Core, NEW | Upload a photo → find matching appearances across all ingested footage |
| 8 | **Keyword & Attribute Search** | Core, NEW | "man in black jacket, red helmet" → attribute-filtered detections (colour, headgear, bag, pose) |
| 9 | **Multilingual Query Parsing** | Core, NEW | Hindi/Gujarati/English natural language → same structured filter as Module 6/8 |
| 10 | **Case Management & Batch Ingestion** | Core, NEW | Group footage/evidence under an investigation case, multi-camera/multi-timeframe upload |
| 11 | **Forensic Export & Chain of Custody** | Core, NEW | Hash-verified exports, custody log, signed PDF incident report |
| 12 | **VMS Recording & Playback** | Core, NEW | Continuous recording, scrubbable timeline, motion heatmap, camera health, PTZ stub |

---

## 4. Extended Database Schema (add to your existing schema.sql)

Keep all existing tables (`cameras`, `zones`, `detection_events`, `object_tracks`, `vehicles`, `media_files`, `alerts`, `users`, `audit_log`, `search_queries`). Add:

```sql
-- Investigation cases (the organizing unit for investigator workflows)
CREATE TABLE cases (
  case_id INT AUTO_INCREMENT PRIMARY KEY,
  case_number VARCHAR(50) UNIQUE NOT NULL,     -- e.g. FIR/case ref
  title VARCHAR(200) NOT NULL,
  description TEXT,
  investigating_officer_id INT,
  status ENUM('open','under_review','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (investigating_officer_id) REFERENCES users(user_id)
);

-- Footage uploaded/attached to a case (batch ingestion, not live cameras)
CREATE TABLE case_media (
  media_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  source_label VARCHAR(150),          -- e.g. "Shop CCTV, MG Road, 14 Jul"
  original_filename VARCHAR(255),
  file_path VARCHAR(255) NOT NULL,
  sha256_hash CHAR(64) NOT NULL,      -- forensic integrity, computed on upload
  duration_seconds DECIMAL(10,2),
  resolution VARCHAR(20),
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_status ENUM('queued','processing','done','failed') DEFAULT 'queued',
  FOREIGN KEY (case_id) REFERENCES cases(case_id),
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Reference images (suspect photo, vehicle photo) uploaded for re-ID search
CREATE TABLE reference_images (
  ref_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT,
  uploaded_by INT,
  image_path VARCHAR(255) NOT NULL,
  subject_type ENUM('person','vehicle') NOT NULL,
  label VARCHAR(150),
  embedding JSON NOT NULL,            -- serialized feature vector
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(case_id),
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Re-identification match results
CREATE TABLE reid_matches (
  match_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ref_id INT NOT NULL,
  event_id BIGINT NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL,
  reviewed BOOLEAN DEFAULT FALSE,
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ref_id) REFERENCES reference_images(ref_id),
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id)
);

-- Per-detection visual attributes, powers keyword/attribute search
CREATE TABLE person_attributes (
  attribute_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  top_color VARCHAR(30),
  bottom_color VARCHAR(30),
  headgear VARCHAR(30),               -- e.g. helmet, cap, none
  bag_present BOOLEAN,
  pose_state VARCHAR(30),             -- standing/running/crouching
  confidence DECIMAL(4,3),
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id)
);

-- Watchlists (known suspects / plates), for proactive alerting
CREATE TABLE watchlists (
  watchlist_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('face','plate') NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE watchlist_entries (
  entry_id INT AUTO_INCREMENT PRIMARY KEY,
  watchlist_id INT NOT NULL,
  reference_image_id INT NULL,
  plate_number VARCHAR(20) NULL,
  alert_severity ENUM('low','medium','high') DEFAULT 'high',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (watchlist_id) REFERENCES watchlists(watchlist_id),
  FOREIGN KEY (reference_image_id) REFERENCES reference_images(ref_id)
);

-- Chain of custody — every touch of evidentiary media is logged, tamper-evident
CREATE TABLE chain_of_custody (
  custody_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  media_id BIGINT NULL,
  event_id BIGINT NULL,
  action ENUM('ingested','hashed','viewed','exported','annotated') NOT NULL,
  user_id INT NOT NULL,
  hash_value CHAR(64),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Signed forensic export reports
CREATE TABLE export_reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  generated_by INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  sha256_hash CHAR(64) NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(case_id),
  FOREIGN KEY (generated_by) REFERENCES users(user_id)
);

-- Continuous VMS recording (distinct from event-triggered clips in media_files)
CREATE TABLE recordings (
  recording_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  sha256_hash CHAR(64),
  storage_tier ENUM('hot','archive') DEFAULT 'hot',
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id)
);

-- PTZ presets (stub for future hardware integration)
CREATE TABLE ptz_presets (
  preset_id INT AUTO_INCREMENT PRIMARY KEY,
  camera_id INT NOT NULL,
  name VARCHAR(100),
  pan DECIMAL(6,2), tilt DECIMAL(6,2), zoom DECIMAL(6,2),
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id)
);

-- Extend existing tables
ALTER TABLE users
  ADD COLUMN role_ext ENUM('admin','supervisor','investigator','operator','auditor') DEFAULT 'operator',
  ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN totp_secret VARCHAR(64) NULL;

ALTER TABLE search_queries ADD COLUMN language VARCHAR(10) DEFAULT 'en';

-- Indexes
CREATE INDEX idx_reid_ref ON reid_matches(ref_id, similarity_score);
CREATE INDEX idx_custody_media ON chain_of_custody(media_id);
CREATE INDEX idx_recordings_camera_time ON recordings(camera_id, start_time);
CREATE INDEX idx_case_media_case ON case_media(case_id);
```

**On storing embeddings:** MySQL JSON columns hold the vectors for correctness/auditability, but brute-force JSON similarity search won't scale past a few thousand faces. Architect the re-ID service to keep an **in-memory/FAISS index** (or Milvus if you want to look more "enterprise" in a pitch) built from `reference_images.embedding` and `detection_events` face/body crops, with MySQL as the system of record and FAISS purely as a fast lookup cache rebuilt on service start. State this tradeoff plainly in your report — it's exactly the kind of design decision a technical panel respects.

---

## 5. Expanded UI/UX Page Map

All pages: premium dark theme (charcoal-navy `#0B0F14`, elevated cards `#1A2129`, teal `#2DD4BF` accent, amber/red severity), Inter + JetBrains Mono, glassmorphism panels, Cmd/Ctrl+K command palette — same design language as before, applied across a bigger page set:

| Page | Purpose |
|---|---|
| Login (+ 2FA) | Auth entry, government-grade |
| **Command Center (Dashboard)** | Today's alerts, active cases, live camera preview, recent matches |
| **Live Wall (VMS)** | Multi-camera grid, click-to-expand, zone overlay, PTZ stub controls |
| **Recordings & Playback (VMS)** | Per-camera scrubbable timeline, motion-density heatmap on the scrubber, jump-to-event, export a time-range clip |
| Camera Management | CRUD, zone drawing, calibration points, continuous-recording toggle per camera |
| **Case Management** | Create/manage investigation cases, attach officers, case status, linked media/exports |
| **Batch Footage Upload** | Drag-drop multi-file upload tied to a case, per-file processing status |
| **Reference Image Search** | Upload a suspect/vehicle photo, subject-type toggle, similarity threshold slider, ranked result grid with timestamps/camera/confidence |
| **Keyword & Attribute Search** | Query bar (supports Hindi/Gujarati/English), attribute chip builder (colour, headgear, object), "parsed as" preview, shared result grid |
| Events Explorer | Filterable table of all detection events |
| Event Detail | Clip playback, bounding boxes, metadata, linked case, mark reviewed |
| Alerts | Realtime severity-sorted alert queue incl. watchlist hits |
| **Watchlists** | Manage known-suspect faces / plates, alert severity per entry |
| ANPR Log | Plate list, registered/unregistered, entry/exit pairing, plate-based trail |
| Reports / Analytics | Volume charts, module breakdown, heatmaps, **tag cloud of searched keywords**, search-history timeline |
| **Forensic Export Center** | Generate signed, hash-verified case reports/exports, view chain-of-custody log per item |
| User Management | RBAC (admin/supervisor/investigator/operator/auditor), MFA enrollment |
| Settings | Thresholds, retention policy, branding, smart-feature toggles |

---

## 6. Security, Privacy & Forensic Compliance (Cyber Cell-grade)

- **RBAC, 5 roles:** admin, supervisor, investigator, operator, auditor — enforced server-side on every mutating endpoint, not just hidden UI.
- **MFA (TOTP)** required for admin/supervisor/auditor roles at minimum.
- **Full audit trail:** every view, export, and edit of case media logged to `audit_log` + `chain_of_custody` — auditors get a read-only page over this, nothing else.
- **Hash-verified evidence:** SHA-256 computed at ingestion time and re-verified at export time; any mismatch is surfaced loudly, never silently passed.
- **Encryption at rest** for the media volume (LUKS/BitLocker at the OS/disk level — document this as an ops requirement, not app code) and **TLS everywhere** in transit.
- **Parameterized SQL everywhere**, especially the two LLM-touching paths (Modules 6/8/9) — LLM output is always validated JSON, never raw SQL, per your original Module 6 safety note.
- **Data retention & DPDP Act awareness:** name this explicitly in your pitch deck — CCTV + face data is sensitive personal data under India's DPDP Act; the platform supports configurable retention and role-gated access, and a real deployment would need departmental SOPs and signage compliance on top.
- **Session security:** short-lived JWT + refresh tokens, forced re-login on role change, IP/device logging on login.

---

## 7. Phase-Wise AI Build Prompts

*Same discipline as before: one phase at a time into your AI coding tool, verify before moving on. Phases 0–8 are your existing core build (updated with forensic hashing); Phases 9–17 are the new investigation/VMS layer; 18–23 close it out.*

### Phase 0 — Environment & Repository Setup (Manual)
1. Install Node.js LTS, Python 3.10+, Git, XAMPP (Apache+MySQL+phpMyAdmin), VS Code.
2. Additionally install: `pip install ultralytics opencv-python ffmpeg-python easyocr insightface onnxruntime faiss-cpu` (re-ID + face pipeline, Phase 10) and `pip install indic-nlp-library` (Phase 12, optional if using local translation).
3. Create GitHub repo `sentinelvision`, folders: `frontend/ backend/ database/ media/ recordings/ docs/`, `.gitignore` covering `node_modules/ __pycache__/ .env media/ recordings/`.
4. In phpMyAdmin: create `sentinelvision_db` (utf8mb4_general_ci), create a scoped non-root MySQL user.
5. Get a Claude API key (console.anthropic.com) for Modules 6/9/12 — supports Hindi/Gujarati natively, keep out of Git.

**Verify:** phpMyAdmin loads, DB exists, non-root login works, repo pushed with skeleton.

---

### Phase 1 — Database Schema & Backend Skeleton
**AI Prompt:**
```
Build the backend skeleton for SentinelVision, an AI-powered CCTV investigation
and VMS platform for law enforcement use.

1. Python FastAPI backend in /backend: app/main.py, app/config.py, app/database.py
   (SQLAlchemy engine/session for MySQL), app/models/, app/schemas/, app/routers/,
   app/services/, app/websocket_manager.py.
2. Generate the COMPLETE MySQL schema (raw SQL in /database/schema.sql AND matching
   SQLAlchemy models) covering both the original CCTV tables (cameras, zones,
   detection_events, object_tracks, vehicles, media_files, alerts, users, audit_log,
   search_queries) AND the investigation/VMS extension tables (cases, case_media,
   reference_images, reid_matches, person_attributes, watchlists, watchlist_entries,
   chain_of_custody, export_reports, recordings, ptz_presets) exactly as specified
   in the schema section of this document. Include all listed indexes.
3. users table: role_ext enum('admin','supervisor','investigator','operator','auditor'),
   mfa_enabled, totp_secret.
4. Working /health endpoint confirming DB connectivity.
5. .env.example with DB_HOST/USER/PASSWORD/NAME, JWT_SECRET, ANTHROPIC_API_KEY,
   MEDIA_ROOT, RECORDINGS_ROOT.
6. requirements.txt: fastapi, uvicorn, sqlalchemy, pymysql, python-jose,
   passlib[bcrypt], python-dotenv, websockets, pyotp (for MFA).

Schema + skeleton only, no business logic. Tell me the exact local run commands.
```
**Verify:** `uvicorn app.main:app --reload` starts clean, `/health` returns 200, all 21 tables appear correctly in phpMyAdmin.

---

### Phase 2 — Premium Government-Grade Design System & UI Shell
**AI Prompt:**
```
Build the frontend foundation in /frontend using React (Vite) + Tailwind CSS.
This is an investigation-grade product for police cyber cell use — premium,
serious, trustworthy, modern. Not a generic admin template.

DESIGN SYSTEM: deep charcoal-navy dark theme (#0B0F14 bg, #121821 panels, #1A2129
elevated cards) as default; electric teal/cyan (#2DD4BF) for primary/AI elements,
amber (#F59E0B) medium alerts, red (#EF4444) high-severity/watchlist alerts, slate
for secondary text. Inter for UI text, JetBrains Mono for timestamps/plate numbers/
hashes/coordinates. Subtle glassmorphism on modals, soft glow on live/active
elements, 150-200ms micro-interactions, rounded 8-12px corners, low-opacity white
1px borders.

Component library: Button, Card, Badge, Table, Modal, Toast, Input, Select, Toggle,
Skeleton, EmptyState, FileDropzone (for batch upload), SimilaritySlider, HashBadge
(shows a truncated SHA-256 with a copy button — used across evidence pages).
Command palette (Cmd/Ctrl+K).

APP SHELL: persistent left sidebar (lucide-react icons) grouped into sections —
MONITOR (Dashboard, Live Wall, Recordings), INVESTIGATE (Cases, Batch Upload,
Reference Search, Keyword Search, Events Explorer, Watchlists, ANPR Log),
INSIGHTS (Alerts, Reports), ADMIN (Forensic Export Center, User Management,
Settings). Top bar: page title, realtime alert bell, active-case switcher
dropdown, user menu with MFA status indicator.

Set up React Router with every page above as an empty "Coming in a later phase"
placeholder, React Query for server state, an auth Context for JWT + active case.
Design-system and navigation shell only, but pixel-quality.
```
**Verify:** every sidebar link navigates, theme looks premium/dark, command palette works, active-case switcher is visible in the top bar, no console errors.

---

### Phase 3 — Authentication, RBAC & Chain-of-Custody Audit Trail
**AI Prompt:**
```
Implement authentication and access control, backend and frontend.

BACKEND:
- POST /auth/login (bcrypt check, JWT access ~30min + httpOnly refresh cookie
  ~7 days). If mfa_enabled, require a second POST /auth/mfa-verify (pyotp TOTP)
  before issuing tokens.
- POST /auth/mfa/enroll — generates a TOTP secret + QR code payload for the user.
- POST /auth/refresh, POST /auth/logout.
- JWT middleware extracting user_id + role_ext.
- Role matrix: admin (full), supervisor (full except user management), investigator
  (cases/search/export, no user/camera management), operator (live/recordings/
  events only, no export), auditor (read-only access to audit_log + chain_of_custody
  only, nothing else).
- GET/POST/PATCH /users — admin only.
- Every request that touches case_media, reference_images, or export_reports must
  write a chain_of_custody row (action, user_id, timestamp) automatically via a
  shared dependency/decorator — do not make individual routes remember to log this.
- Seed one default admin user.

FRONTEND:
- Login page with MFA step when required, matching the design system.
- MFA enrollment flow (QR code display) in Settings.
- Route protection per role_ext — hide AND block routes, don't just hide nav items.
- User Management page: table, add/edit modal, role assignment, MFA status column.

Explain the JWT_SECRET generation value for .env.
```
**Verify:** login + MFA works, an operator account genuinely cannot open Forensic Export or User Management (test it), viewing an event as any role writes a `chain_of_custody` row — confirm in phpMyAdmin.

---

### Phase 4 — Camera Management, Zone Drawing & VMS Live Wall
**AI Prompt:**
```
Build Camera Management, zone drawing, and the Live Wall, backend and frontend.

BACKEND:
- GET/POST/PUT/DELETE /cameras (add a `continuous_recording BOOLEAN` and
  `ptz_capable BOOLEAN` field).
- GET/PUT /cameras/{id}/zones (polygon_points as before).
- POST /cameras/{id}/snapshot — upload reference snapshot for zone drawing.
- GET/POST /cameras/{id}/ptz-presets (stub only — store pan/tilt/zoom values,
  no real hardware call yet, clearly comment this is a stub for future ONVIF/PTZ
  hardware integration).

FRONTEND:
- Camera Management page: table with add/edit/delete, continuous-recording toggle,
  PTZ-capable flag.
- Zone-drawing tool as before: canvas over reference snapshot, multi-zone, named,
  colored, calibration-point mode with real-world distance input, undo support.
- Live Wall page: responsive multi-camera grid (each camera card shows its latest
  thumbnail as a placeholder "live" frame with a pulsing LIVE badge and an honest
  small label noting real RTSP streaming is not yet wired), click to expand a
  single camera, zone-overlay toggle, PTZ preset buttons (call the stub endpoint,
  show a toast confirming the preset was "sent").

Style entirely per the established premium dark design system.
```
**Verify:** add a camera, upload snapshot, draw a zone, save, reload, confirm `polygon_points` JSON persists correctly in phpMyAdmin; Live Wall grid renders all cameras.

---

### Phase 5 — AI Pipeline Core: Detection + Tracking
*(Unchanged from your original spec — this is the shared foundation every module below builds on.)*

**Manual Setup:** `pip install ultralytics opencv-python ffmpeg-python` in `/backend/ai_pipeline`, gather 3–5 test videos (person, vehicle+plate, object left behind, a face-visible clip for Phase 10, a mixed-crowd clip).

**AI Prompt:**
```
Build the core AI detection and tracking pipeline in /backend/ai_pipeline. This is
a separate always-on Python process, not part of the FastAPI request cycle.

1. ingest.py — reads a video file frame-by-frame (stand-in for RTSP), configurable
   sampling rate (default every 3rd frame).
2. detector.py — YOLOv8 (COCO weights) returning boxes+class+confidence for
   person/car/truck/motorcycle/bicycle.
3. tracker.py — ByteTrack for persistent track IDs across frames.
4. run_test.py — ties them together, draws boxes+IDs+labels, saves an annotated
   output video for visual verification.

No module logic or DB writes yet. Give me the exact run command against a test video.
```
**Verify:** boxes draw correctly, track IDs stay stable across frames (flag ID-switching).

---

### Phase 6 — Modules 1 & 2: ANPR + Velocity Estimation
*(Same as original spec — build `anpr.py` and `velocity.py` in `/backend/ai_pipeline/modules/`, debounced by track ID, using calibration points from Phase 4.)*

**Verify:** manually check OCR text against visible plates, log an honest accuracy %; speed estimates plausible against eye-timed objects.

---

### Phase 7 — Modules 3, 4, 5: Unauthorized Entry, Misplacement, Anomaly
*(Same as original spec — rule-based, explicitly commented as heuristic, not "AI understanding," per the module honesty note.)*

**Verify:** each module fires on its intended test video only, no false positives on the others.

---

### Phase 8 — Forensic Media Pipeline: Clips, Thumbnails, Timestamp Burn-In & Hash Integrity
**AI Prompt:**
```
Build the media capture pipeline in /backend/ai_pipeline/clip_writer.py, extending
the original clip-writer spec with forensic integrity:

media/{camera_id}/{YYYY-MM-DD}/clips/{event_id}_{HHMMSS}.mp4
media/{camera_id}/{YYYY-MM-DD}/thumbnails/{event_id}_{HHMMSS}.jpg

1. Rolling pre-roll buffer (~15s) + ~10s post-roll, cut via FFmpeg on trigger.
2. Burn a visible timestamp (drawtext, bottom-right, semi-transparent background,
   local time + timezone label; store UTC internally).
3. Generate a thumbnail per clip.
4. NEW — compute a SHA-256 hash of the final clip file immediately after writing
   it, store it on the media_files row (add a `sha256_hash CHAR(64)` column via
   migration), and write a chain_of_custody row with action='hashed'.
5. Disk-usage safety cap per camera/day (default 2GB), stop + warn rather than
   silently filling disk.

Return file paths + duration + size + hash for DB insertion. Test against my
Phase 5 videos by triggering a fake event and confirming a correctly hashed,
timestamped clip appears.
```
**Verify:** open a clip, confirm burned-in timestamp; recompute the SHA-256 of the file manually (`sha256sum`) and confirm it matches the DB row exactly.

---

### Phase 9 — Case Management & Batch Footage Ingestion
**AI Prompt:**
```
Build case management and batch footage ingestion, backend and frontend — this
is the investigator's entry point for uploaded (non-live) evidence.

BACKEND:
- CRUD on /cases (case_number, title, description, investigating_officer_id,
  status).
- POST /cases/{id}/media — multipart batch upload endpoint accepting multiple
  video files at once, each saved under /media/cases/{case_id}/, immediately
  SHA-256 hashed, a case_media row created with processing_status='queued',
  and a chain_of_custody row (action='ingested').
- A background worker that picks up 'queued' case_media rows, runs them through
  the Phase 5-8 pipeline (detection, tracking, all applicable modules) tagging
  every resulting detection_event with the case_id via a join, updates
  processing_status to 'processing' then 'done' (or 'failed' with a logged reason).
- GET /cases/{id}/media — list with processing status per file.

FRONTEND:
- Case Management page: case list/create/edit, status badges, linked officer.
- Batch Footage Upload page: drag-and-drop multi-file dropzone (using the
  FileDropzone component), per-file upload progress, then a live-updating
  processing-status list (queued/processing/done/failed) that polls or listens
  via WebSocket.
- Case detail view: shows all linked media, their processing status, and a
  jump-in to Events Explorer pre-filtered to this case.

This is the workflow: officer opens a case -> uploads footage from 3 different
shop CCTVs covering the same evening -> comes back later to search across all
of it at once.
```
**Verify:** upload 2–3 files to a test case, confirm hashes appear in `case_media`, confirm processing status moves queued→done and detection_events get tagged with the right case_id.

---

### Phase 10 — Reference Image Search: Face & Person/Vehicle Re-Identification
**Manual Setup:** `pip install insightface onnxruntime faiss-cpu` in the AI pipeline venv; gather a handful of test photos of people appearing in your test videos (for verifying re-ID actually finds them).

**AI Prompt:**
```
Implement Module 7 — reference image search — in /backend/ai_pipeline/modules/reid.py
and matching API routes. This is the single most important investigator feature:
upload a photo, find every appearance of that person/vehicle across all processed
footage.

PIPELINE:
1. Face embeddings: use InsightFace (ArcFace) to compute a 512-d embedding for any
   detected face (both in stored reference_images and in every person detection
   crop from detection_events).
2. Person re-ID (for cases with no clear face, e.g. back-facing or low-res): compute
   a body-appearance embedding per person crop using a lightweight re-ID feature
   extractor (e.g. OSNet via torchreid, or a documented simpler CNN-embedding
   fallback if torchreid is too heavy — pick one and justify it in comments).
3. Vehicle re-ID: combine plate match (exact, from Module 1) with a coarse
   color+type classifier as a fallback when no plate is readable.
4. Maintain an in-memory FAISS index per subject_type (face / person / vehicle),
   rebuilt on service start from all embeddings in detection_events +
   reference_images, refreshed incrementally as new events land.

BACKEND API:
- POST /reference-images — upload a photo, subject_type, optional case_id;
  compute and store its embedding; log chain_of_custody (action='ingested').
- POST /search/reference/{ref_id} — runs a FAISS similarity search against the
  matching index, returns ranked results with similarity_score, event_id,
  camera_id, timestamp, thumbnail — write results to reid_matches.
- Similarity threshold is a query param (default 0.55 for faces, tune and
  document your chosen defaults).

FRONTEND:
- Reference Image Search page: upload dropzone for the photo, subject-type toggle
  (person/vehicle), similarity threshold slider, "Search" button, results shown
  as a ranked grid (highest similarity first) with % match badge, camera, and
  timestamp, click-through to Event Detail. Tie results to the active case if
  one is selected.

Be explicit in code comments that face/person re-ID accuracy depends heavily on
image quality/angle/lighting — this must be stated in the report, not oversold.
```
**Verify:** upload a reference photo of someone who appears in your test videos, confirm they show up near the top of the ranked results; upload an unrelated photo, confirm no high-confidence false matches.

---

### Phase 11 — Keyword & Attribute Search
**AI Prompt:**
```
Implement Module 8 — keyword/attribute search — in /backend/ai_pipeline/modules/
attributes.py and matching API routes. This lets an investigator type "man in
black jacket, red helmet" and get matching detections without a reference photo.

PIPELINE:
1. attribute_extractor.py — for each person detection crop, run a lightweight
   colour-clustering pass (dominant colour of the upper-body and lower-body
   bounding-box regions, e.g. k-means on cropped pixels) to get top_color/
   bottom_color, a simple headgear classifier (helmet/cap/none — can start as
   a small fine-tuned YOLOv8 head-accessory class or a rule-based heuristic on
   head-region features; document which), bag_present (secondary object
   detection near the person box), and pose_state (standing/running/crouching
   via keypoint aspect-ratio heuristics or a lightweight pose model). Write to
   person_attributes.
2. Wire attribute extraction into the Phase 5 pipeline so it runs automatically
   on every person detection.

BACKEND:
- POST /search/attributes — accepts a structured filter (colors, headgear,
  bag_present, pose_state, camera_id, date range) OR a free-text query that
  first goes through the Module 6 LLM parser to produce this same structured
  filter, then queries person_attributes joined to detection_events.

FRONTEND:
- Keyword & Attribute Search page: a single search bar for natural language,
  PLUS a visual attribute chip-builder (color swatches, headgear icons, bag
  toggle) for investigators who prefer clicking over typing. Both produce the
  same "parsed as:" preview chip row before showing results in the shared
  result-grid component.

Comment clearly that colour/attribute recognition is approximate (lighting-
dependent) and should be presented as a ranked candidate list, not a certainty.
```
**Verify:** run 4–5 attribute queries against your test videos, confirm plausible matches, confirm the "parsed as" preview accurately reflects the query.

---

### Phase 12 — Multilingual Semantic Search (Hindi / Gujarati / English)
**AI Prompt:**
```
Extend Module 6/8's LLM query parser to support Hindi and Gujarati input directly,
in addition to English.

BACKEND:
- Update services/llm_query_parser.py: the Claude API system prompt should
  explicitly instruct the model to understand queries in English, Hindi
  (Devanagari or romanized), or Gujarati, and always output the SAME constrained
  JSON schema in English field values regardless of input language (module,
  object_type, camera_id, date_from, date_to, plate_number, colors, headgear).
  Include one few-shot example per language.
- Detect and store the input language on the search_queries row (language column).
- Keep the existing SQL-safety validation (allow-list check before building
  parameterized SQL) — this does not change with multilingual input.

FRONTEND:
- Add a language indicator/auto-detect badge next to the search bar on both
  Semantic Search and Keyword & Attribute Search pages (e.g. "Detected: Gujarati").
- No other UI changes needed — same "parsed as" preview and result grid.

Test with 3 sample queries per language (English/Hindi/Gujarati) covering the
same intent, and confirm all three produce the same parsed filter.
```
**Verify:** run the 3-language test set, confirm consistent parsed filters and correct results across all three.

---

### Phase 13 — Events Explorer, Event Detail, Live View
*(Same as your original Phase 9 — filterable table, clip playback, mark reviewed/false-positive, all tied into `audit_log` + `chain_of_custody`. Add a "Case" column/filter and a "Matched via Reference Search" indicator when an event has `reid_matches` rows.)*

**Verify:** filters work, clip plays with visible timestamp, review actions persist to `audit_log`.

---

### Phase 14 — Realtime Alerts, Watchlist Engine & WebSocket
**AI Prompt:**
```
Implement realtime alerting AND the watchlist engine end to end.

BACKEND:
- WebSocket /ws/alerts pushes any new alerts row to connected clients.
- GET/PATCH /alerts, filterable by severity/status.
- Watchlist engine: on every new face/person/vehicle embedding computed
  (Phase 10) or plate logged (Module 1), check similarity against all active
  watchlist_entries; on a hit above threshold, write a high-severity alert
  referencing the matched watchlist entry and event, and push it via WebSocket
  immediately — this is the "proactive" half of the platform (vs. investigator-
  initiated search).
- CRUD on /watchlists and /watchlists/{id}/entries (face reference image or
  plate number, severity).

FRONTEND:
- Watchlists page: create/manage watchlists, add entries (upload face photo or
  type plate), severity setting.
- Alert bell + Alerts page as before, with watchlist hits visually distinguished
  (e.g. a small "WATCHLIST" tag) from module-triggered alerts.
- Toast notification on new high-severity/watchlist alerts anywhere in the app.

Test by adding a face from one of your test videos to a watchlist, re-running
that video through the pipeline, and confirming a watchlist alert fires live.
```
**Verify:** watchlist hit produces an immediate WebSocket alert with correct severity and a working link to Event Detail.

---

### Phase 15 — Recordings & Playback (VMS)
**AI Prompt:**
```
Build the VMS continuous-recording and playback experience.

BACKEND:
- A recorder service (per camera with continuous_recording=true) that segments
  the ingested feed into fixed-length chunks (e.g. 10 min) via FFmpeg, writes
  them under /recordings/{camera_id}/, hashes each segment, and inserts a
  recordings row (start_time, end_time, sha256_hash).
- GET /recordings/{camera_id}?date=YYYY-MM-DD — returns the day's segments plus
  a per-minute motion-density array (derived from detection_events counts in
  that window) for the timeline heatmap.
- GET /recordings/{camera_id}/export — given a start/end time, stitch the
  relevant segments into a single exported clip via FFmpeg, hash it, log
  chain_of_custody (action='exported').

FRONTEND:
- Recordings & Playback page: camera selector, date picker, a horizontal
  scrubbable timeline for the selected day showing a motion-density heatmap
  (denser color where more detections occurred), click-to-seek video playback,
  a "mark range + export clip" tool (drag to select a time range, click Export),
  jump-to-next/previous-event buttons.

This page is the day-to-day control-room workhorse — it needs to feel as fast
and reliable as commercial VMS software (Milestone/Hikvision-style), not just
a video tag with a slider.
```
**Verify:** scrubbing the timeline seeks correctly, the heatmap visually correlates with periods you know have activity in your test data, exporting a range produces a correctly hashed, correctly-timed clip.

---

### Phase 16 — Analytics, Reports Dashboard & Tag Cloud
**AI Prompt:**
```
Build the Dashboard and Reports/Analytics pages.

BACKEND:
- GET /reports/summary — event counts (today/week), module breakdown, camera
  breakdown, alert counts by severity, 30-day time-series, per-zone activity,
  case-level breakdown (events per active case).
- GET /reports/search-insights — most frequent search terms/attributes (for the
  tag cloud) and a timeline of search volume, derived from search_queries.

FRONTEND:
- Dashboard: summary cards (today's events, open high-severity/watchlist alerts,
  active cameras, open cases) each deep-linking to a pre-filtered page; recent-
  events feed; live camera grid preview.
- Reports page: event-volume line chart, module-breakdown bar chart, zone
  activity heatmap overlay on camera snapshots, a searched-keyword tag cloud,
  search-volume-over-time chart, PDF export of the current view.
- All charts styled to the dark theme, teal/amber/red palette, subtle gridlines.

This page is what an investor or a police-department decision-maker sees first
— it must read as a real, credible operational product.
```
**Verify:** numbers match real DB counts, deep-links apply correct filters, tag cloud reflects actual recent search terms, PDF export is readable.

---

### Phase 17 — Forensic Export & Chain-of-Custody Reporting
**AI Prompt:**
```
Build the Forensic Export Center — this is the feature that makes the platform
"court-usable" rather than just an internal tool, and a strong differentiator
in your pitch.

BACKEND:
- POST /cases/{id}/export — generates a signed PDF report for a case containing:
  case metadata, investigating officer, list of linked media with their
  SHA-256 hashes, list of matched events (from reference/attribute/keyword
  searches run during the case) with thumbnails/timestamps/camera IDs, and a
  full chain_of_custody timeline for every item (who viewed/exported what,
  when). Hash the generated PDF itself and store it in export_reports.
- GET /cases/{id}/custody-log — full chain_of_custody entries for a case,
  chronological, exportable as CSV.
- GET /export-reports/{id}/verify — re-hashes the stored PDF on demand and
  confirms it matches the stored sha256_hash (tamper-evidence check).

FRONTEND:
- Forensic Export Center page: pick a case, preview what will be included,
  "Generate Report" button, list of previously generated reports with a
  "Verify Integrity" button that calls the verify endpoint and shows a clear
  pass/fail result.
- Chain-of-custody log view: a clean, timestamped, non-editable audit view per
  case — this is the page to show a Cyber Cell technical panel to prove the
  system isn't just "AI magic" but produces defensible evidence trails.

Use the docx or pdf generation approach appropriate for your stack; the report
must be genuinely professional-looking (header/letterhead area for department
branding, page numbers, a clear structure), not a bare text dump.
```
**Verify:** generate a report for a test case, confirm every hash listed matches the actual files, alter a test file's bytes and confirm the verify endpoint correctly reports a mismatch.

---

### Phase 18 — Automation Layer: Retention, Watchdog, Scheduled Jobs
*(Same as your original Phase 13 — `retention_job.py`, `watchdog.py`, configurable via a settings table/Settings page. Extend retention logic to respect `recordings` and `case_media` in addition to `media_files`, and to never delete anything referenced by an `export_reports` row without an explicit admin override + audit log entry.)*

**Verify:** retention correctly soft-deletes expired media but skips anything tied to a generated export report; watchdog restarts a killed worker within threshold.

---

### Phase 19 — Extra Smart Features Pack
*(Same menu as your original Phase 14 — face-blur privacy mode, automated email reports, Telegram alerts, dwell-time analytics, false-positive feedback loop, plate-based re-ID trail on ANPR Log — plus one addition:)*
```
8. LOW-BANDWIDTH LEGACY PORTAL (PHP) — a minimal read-only PHP/HTML/CSS/JS page
   (separate small app, /legacy-portal) that connects directly to the same MySQL
   database and lets a station-level user look up a case by case_number and view
   its status, linked officer, and download a previously generated export report
   — no AI features, no write access, just fast lookups for low-resource
   terminals. Clearly comment this as an optional, isolated surface, not on the
   critical path of the main system.
```
**Verify:** each feature toggle demonstrably does what it claims against a real test event; the legacy PHP portal correctly reads real case data without any write capability.

---

### Phase 20 — Security Hardening (Government-Grade)
**AI Prompt:**
```
Do a full security hardening pass, extending the original checklist:

1. Every mutating endpoint checks JWT + role_ext — audit and list gaps.
2. All SQL parameterized everywhere, explicitly re-verify the reference-image,
   attribute, and multilingual search paths (three LLM/embedding-adjacent
   entry points now, not one).
3. Rate limiting on /auth/login, /auth/mfa-verify, /search/*, and
   /reference-images (prevent brute force + API-cost abuse).
4. Bcrypt password hashing confirmed, TOTP secrets never logged in plaintext.
5. CORS restricted to actual frontend origin only.
6. .env genuinely gitignored, full repo secret-scan.
7. Pydantic validation on all inputs; uploaded images/videos validated by type
   + size limit before saving (prevent arbitrary file upload abuse) — this
   matters more here since Batch Upload and Reference Image Search both accept
   files from investigators, a higher-risk entry point than the original app.
8. Confirm chain_of_custody entries cannot be edited or deleted via any API
   route (append-only table, enforce at the DB-user-privilege level too if
   possible — a MySQL user with only INSERT on this table, no UPDATE/DELETE).
9. Confirm MFA is actually enforced for admin/supervisor/auditor logins, not
   just offered.

Give me a written summary of every issue found and fixed for the report's
security section, and explicitly confirm point 8 (append-only custody log) since
that's the detail a cyber cell technical reviewer is most likely to test.
```
**Verify:** try 10 rapid wrong-password logins and confirm rate limiting kicks in; try to UPDATE a `chain_of_custody` row via the API and confirm it's rejected.

---

### Phase 21 — Pixel-Polish UI/UX Pass
*(Same as original Phase 15, applied across the full expanded page set — consistent spacing, skeleton loaders, empty/error states, smooth transitions, keyboard navigability, responsive check, contrast audit. Pay particular attention to the Recordings timeline, Reference Search results grid, and Forensic Export Center — these are the three pages most likely to be demoed live to police/investors.)*

---

### Phase 22 — Sellable / Investor & Government Pitch Readiness Pass
**AI Prompt:**
```
Add product-readiness and pitch-readiness touches:

1. Configurable branding in Settings (department logo, product name, accent
   color override) — supports a white-labeled "Gujarat Police Edition" build.
2. A first-run onboarding wizard: create first camera → draw first zone →
   create first case → invite first officer.
3. Admin-only API key management page for a read-only /api/v1/events endpoint
   (separate auth) so a department's other systems could pull data
   programmatically.
4. An "About / Compliance" footer: version number, a short DPDP-Act-aware data
   handling statement, and a note on the honestly-scoped heuristic modules
   (module 5 anomaly detection is rule-based, not "AI threat detection" —
   keep this framing consistent everywhere in the UI, not just the report).
5. A one-page "System Overview" printable/exportable summary (architecture,
   modules, security posture) suitable for handing to a non-technical
   decision-maker after a live demo.

Keep this scoped — no billing, no multi-tenant DB partitioning, no public
marketing site. This is about the existing deployment feeling finished,
credible, and easy to explain to a funding or procurement decision-maker
in under two minutes.
```
**Verify:** run through onboarding as a first-time user; the one-page System Overview reads clearly to someone outside the team.

---

### Phase 23 — Final Testing, QA & Demo Preparation
**Manual Setup:**
1. Prepare 4–5 test videos as reliable demo triggers (module coverage + one with a clear face for reference search + one multi-camera scenario for a case).
2. `mysqldump` full backup before this phase.

**AI Prompt:**
```
Do a final end-to-end QA pass on SentinelVision:

1. Walk the full investigator journey: log in (MFA) → create a case → batch-
   upload 2 test videos → confirm processing completes → run a reference-image
   search against a known face → confirm a ranked match → run a keyword search
   ("person in black jacket") in Gujarati → confirm consistent results → open
   Event Detail, play the clip, confirm timestamp + hash → generate a Forensic
   Export for the case → verify its integrity → confirm every step appears in
   the chain-of-custody log.
2. Walk the full control-room journey: Live Wall → Recordings & Playback →
   scrub timeline → export a clip → confirm it's hashed.
3. Fix any breakage found in either journey — these are exactly the sequences
   you'll run live for police/investors.
4. Generate docs/DEMO_SCRIPT.md covering both journeys with expected results
   at each step.
5. Generate docs/SETUP.md covering every manual step from Phase 0 onward, so a
   clean machine can stand this up from scratch.

Give me a final, honest list of known limitations (e.g., re-ID accuracy depends
on image quality, heuristic vs. true AI threat detection, plate-based vs.
visual re-ID, RTSP live-streaming not yet wired, PTZ is a stub) — I need to be
able to answer questions about every one of these confidently in front of a
technical panel rather than get caught off guard.
```
**Verify:** run both full journeys live, twice, ideally on a non-primary machine.

---

## 8. Quick Reference — Full Phase Order

| # | Phase | Type |
|---|---|---|
| 0 | Environment & repo setup | Manual |
| 1 | DB schema + backend skeleton (full, incl. investigation tables) | AI |
| 2 | Premium dark design system + UI shell | AI |
| 3 | Auth, RBAC (5 roles), MFA, custody logging | AI |
| 4 | Camera management, zones, Live Wall | AI |
| 5 | AI pipeline core: detection + tracking | AI + manual videos |
| 6 | ANPR + velocity estimation | AI + manual dataset |
| 7 | Unauthorized entry, misplacement, anomaly | AI |
| 8 | Forensic media pipeline: clips + hash integrity | AI |
| 9 | Case management & batch ingestion | AI |
| 10 | Reference image search (face/person/vehicle re-ID) | AI + manual test photos |
| 11 | Keyword & attribute search | AI |
| 12 | Multilingual search (Hindi/Gujarati/English) | AI |
| 13 | Events Explorer, Event Detail, Live View | AI |
| 14 | Realtime alerts + watchlist engine | AI |
| 15 | Recordings & playback (VMS timeline) | AI |
| 16 | Analytics, reports, tag cloud | AI |
| 17 | Forensic export & chain-of-custody reporting | AI |
| 18 | Automation: retention, watchdog, scheduling | AI + manual cron |
| 19 | Extra smart features pack (+ legacy PHP portal) | AI + manual bot/SMTP |
| 20 | Security hardening (government-grade) | AI |
| 21 | Pixel-polish UI/UX pass | AI + manual review |
| 22 | Investor/government pitch readiness | AI |
| 23 | Final QA + demo prep | AI + manual rehearsal |

---

## 9. Pitch Talking Points (for the Cyber Cell / investor presentation)

- **The core problem it solves:** hours of manual footage review → minutes of targeted search, by photo or by plain-language description, in the investigator's own language.
- **It's not just a search tool — it's a full VMS**, so it replaces existing monitoring software rather than sitting awkwardly alongside it.
- **Forensically defensible:** every piece of evidence is hashed at ingestion, every access is logged, exports are independently verifiable — this is the detail that turns "interesting AI demo" into "something we could actually deploy."
- **Honest scoping is a strength, not a weakness:** be upfront that Module 5 is rule-based heuristics and re-ID accuracy depends on image quality — a panel that catches you overclaiming will trust nothing else you say; a panel that hears you scope it precisely will trust the rest of the pitch.
- **Architecture matches real commercial VMS/investigation products** (Python/AI core + SQL + modern web frontend) — this is a deliberate, defensible engineering choice, not a shortcut.

-- VisionCCTV / SentinelVision SQLite Schema Spec

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role_ext TEXT NOT NULL DEFAULT 'operator', -- admin, supervisor, investigator, operator, auditor
  mfa_enabled INTEGER NOT NULL DEFAULT 0,    -- 0 = False, 1 = True
  totp_secret TEXT NULL
);

-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
  camera_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'generic',
  is_connected INTEGER NOT NULL DEFAULT 0,
  is_running INTEGER NOT NULL DEFAULT 0,
  detection_active INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  fps REAL NOT NULL DEFAULT 25.0,
  error TEXT NULL,
  added_at REAL NOT NULL,
  continuous_recording INTEGER NOT NULL DEFAULT 0,
  ptz_capable INTEGER NOT NULL DEFAULT 0
);

-- Camera Zones Table
CREATE TABLE IF NOT EXISTS zones (
  zone_id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'general', -- restricted, general
  points TEXT NOT NULL,                      -- JSON coordinate pairs array
  active_from TEXT NOT NULL DEFAULT '00:00',
  active_to TEXT NOT NULL DEFAULT '23:59',
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE
);

-- Investigation Cases
CREATE TABLE IF NOT EXISTS cases (
  case_id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  investigating_officer_id INTEGER NULL,
  status TEXT NOT NULL DEFAULT 'open',      -- open, under_review, closed
  created_at REAL NOT NULL,
  closed_at REAL NULL,
  FOREIGN KEY (investigating_officer_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Case Media (Ingested Evidence Clips)
CREATE TABLE IF NOT EXISTS case_media (
  media_id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  source_label TEXT NULL,
  original_filename TEXT NULL,
  file_path TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,                -- Forensic hash computed on upload
  duration_seconds REAL NULL,
  resolution TEXT NULL,
  uploaded_by INTEGER NULL,
  uploaded_at REAL NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, done, failed
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Case Evidence (search hits / crops pinned to a case from any AI module)
CREATE TABLE IF NOT EXISTS case_evidence (
  evidence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  kind TEXT NOT NULL,                       -- face, keyword, lpr, object, manual
  label TEXT NOT NULL,                      -- human-readable match label
  summary TEXT NULL,                        -- e.g. "Face match 92% @ 00:34 in subway.mp4"
  video_id TEXT NULL,                       -- source uploaded video id (if any)
  source_label TEXT NULL,                   -- original filename / camera name
  timestamp_seconds REAL NULL,              -- position within the source clip
  confidence REAL NULL,                     -- 0..1 match score
  thumb_url TEXT NULL,                      -- crop/frame image url
  frame_hash TEXT NULL,                     -- forensic hash of the frame image
  meta_json TEXT NULL,                      -- extra fields (bbox, plate, etc.) as JSON
  added_by INTEGER NULL,
  added_at REAL NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Reference Images (Suspect or Vehicle Photos)
CREATE TABLE IF NOT EXISTS reference_images (
  ref_id TEXT PRIMARY KEY,
  case_id INTEGER NULL,
  uploaded_by INTEGER NULL,
  image_path TEXT NOT NULL,
  subject_type TEXT NOT NULL,               -- person, vehicle
  label TEXT NULL,
  embedding TEXT NULL,                      -- JSON serialized vector embedding
  created_at REAL NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Detection Events (CCTV Frames matched by modules)
CREATE TABLE IF NOT EXISTS detection_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NULL,
  camera_id TEXT NOT NULL,
  module TEXT NOT NULL,                     -- ANPR, VELOCITY, INTRUSION, etc.
  object_type TEXT NOT NULL,                -- person, vehicle, etc.
  object_label TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',     -- low, medium, high
  summary TEXT NOT NULL,
  searchable TEXT NOT NULL,
  plate TEXT NULL,
  detected_at REAL NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0,
  false_positive INTEGER NOT NULL DEFAULT 0,
  heuristic INTEGER NOT NULL DEFAULT 1,
  frame_hash TEXT NULL,                     -- Forensic hash of frame image file
  frame_path TEXT NULL,
  track_id TEXT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE SET NULL,
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE
);

-- Re-ID Matches
CREATE TABLE IF NOT EXISTS reid_matches (
  match_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_id TEXT NOT NULL,
  event_id INTEGER NOT NULL,
  similarity_score REAL NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0,
  matched_at REAL NOT NULL,
  FOREIGN KEY (ref_id) REFERENCES reference_images(ref_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE CASCADE
);

-- Person Visual Attributes
CREATE TABLE IF NOT EXISTS person_attributes (
  attribute_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  top_color TEXT NULL,
  bottom_color TEXT NULL,
  headgear TEXT NULL,                       -- helmet, cap, none
  bag_present INTEGER NOT NULL DEFAULT 0,   -- 0 = False, 1 = True
  pose_state TEXT NULL,                     -- standing, running, crouching
  confidence REAL NOT NULL DEFAULT 1.0,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE CASCADE
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  watchlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                       -- face, plate
  created_by INTEGER NULL,
  created_at REAL NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Watchlist Entries
CREATE TABLE IF NOT EXISTS watchlist_entries (
  entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL,
  reference_image_id TEXT NULL,
  plate_number TEXT NULL,
  alert_severity TEXT NOT NULL DEFAULT 'high', -- low, medium, high
  added_at REAL NOT NULL,
  FOREIGN KEY (watchlist_id) REFERENCES watchlists(watchlist_id) ON DELETE CASCADE,
  FOREIGN KEY (reference_image_id) REFERENCES reference_images(ref_id) ON DELETE CASCADE
);

-- Chain of Custody (tamper-evident audit log for evidence pieces)
CREATE TABLE IF NOT EXISTS chain_of_custody (
  custody_id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id INTEGER NULL,
  event_id INTEGER NULL,
  action TEXT NOT NULL,                     -- ingested, hashed, viewed, exported, annotated
  user_id INTEGER NOT NULL,
  hash_value TEXT NULL,
  notes TEXT NULL,
  created_at REAL NOT NULL,
  FOREIGN KEY (media_id) REFERENCES case_media(media_id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Export Reports (Signed forensic exports)
CREATE TABLE IF NOT EXISTS export_reports (
  report_id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  generated_by INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  generated_at REAL NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Continuous Playback Recording Chunks
CREATE TABLE IF NOT EXISTS recordings (
  recording_id INTEGER PRIMARY KEY AUTOINCREMENT,
  camera_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  sha256_hash TEXT NULL,
  storage_tier TEXT NOT NULL DEFAULT 'hot', -- hot, archive
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE
);

-- PTZ Presets
CREATE TABLE IF NOT EXISTS ptz_presets (
  preset_id INTEGER PRIMARY KEY AUTOINCREMENT,
  camera_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pan REAL NOT NULL DEFAULT 0.0,
  tilt REAL NOT NULL DEFAULT 0.0,
  zoom REAL NOT NULL DEFAULT 1.0,
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE
);

-- Global Auditing Operations Logs
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts REAL NOT NULL,
  user TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL
);

-- Active Learning & Re-ID Human Feedback Store
CREATE TABLE IF NOT EXISTS model_feedback (
  feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  search_type TEXT DEFAULT 'face_recognition',
  reference_label TEXT NOT NULL,
  predicted_label TEXT NOT NULL,
  rating TEXT NOT NULL, -- 'good' (true positive match) or 'bad' (false positive match)
  correction_label TEXT NULL,
  frame_url TEXT,
  frame_hash TEXT,
  camera_id TEXT,
  timestamp_val REAL,
  timestamp_str TEXT,
  box_json TEXT,
  embedding_json TEXT,
  notes TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);

-- Create Indexes for fast visual lookup and reports integrity
CREATE INDEX IF NOT EXISTS idx_events_camera_time ON detection_events(camera_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_reid_ref_score ON reid_matches(ref_id, similarity_score);
CREATE INDEX IF NOT EXISTS idx_custody_media ON chain_of_custody(media_id);
CREATE INDEX IF NOT EXISTS idx_recordings_camera_time ON recordings(camera_id, start_time);
CREATE INDEX IF NOT EXISTS idx_case_media_case ON case_media(case_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id, added_at);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON model_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_label ON model_feedback(reference_label);




-- Compliance Rules Master
CREATE TABLE IF NOT EXISTS compliance_rules (
    rule_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    domain TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'High',
    enabled INTEGER NOT NULL DEFAULT 1,
    camera_ids TEXT NOT NULL,              -- JSON array: ["GATE-01", "LOBBY-02"]
    natural_language_prompt TEXT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'event', -- event, schedule, threshold, spatial
    conditions_json TEXT NOT NULL,         -- Structured AST of conditions
    actions_json TEXT NOT NULL,            -- Array of action definitions
    dataset_id TEXT NULL,                  -- Target dataset for structured record output
    dashboard_config TEXT NULL,            -- Custom widget specification
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active', -- draft, pending_approval, active, paused
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

-- Compliance Rule Versions & Audit History
CREATE TABLE IF NOT EXISTS compliance_rule_versions (
    version_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    change_summary TEXT NULL,
    created_at REAL NOT NULL,
    FOREIGN KEY (rule_id) REFERENCES compliance_rules(rule_id) ON DELETE CASCADE
);

-- Metadata-Driven Datasets Registry
CREATE TABLE IF NOT EXISTS compliance_datasets (
    dataset_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NULL,
    domain TEXT NOT NULL,
    schema_json TEXT NOT NULL,            -- JSON array of field definitions [{name, type, required}]
    retention_days INTEGER NOT NULL DEFAULT 90,
    created_at REAL NOT NULL
);

-- Generic Structured Record Store for Datasets
CREATE TABLE IF NOT EXISTS compliance_dataset_records (
    record_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    event_time REAL NOT NULL,
    entity_id TEXT NULL,
    status TEXT NOT NULL,                 -- e.g. ON_TIME, LATE, COMPLIANT, VIOLATION
    confidence REAL NOT NULL DEFAULT 1.0,
    keyframe_url TEXT NULL,
    evidence_hash TEXT NULL,
    payload_json TEXT NOT NULL,           -- Structured attributes conforming to dataset schema
    created_at REAL NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES compliance_datasets(dataset_id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES compliance_rules(rule_id) ON DELETE CASCADE
);

-- Compliance Violations & Evidence Table
CREATE TABLE IF NOT EXISTS compliance_violations (
    violation_id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    camera_name TEXT NOT NULL,
    severity TEXT NOT NULL,
    timestamp REAL NOT NULL,
    relational_triplet TEXT NULL,
    calibrated_confidence REAL NOT NULL,
    keyframe_url TEXT NOT NULL,
    footage_clip_url TEXT NULL,
    sha256_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, DISPATCHED, RESOLVED
    assigned_officer TEXT NULL,
    resolution_notes TEXT NULL,
    action_dispatch_status TEXT NULL,
    created_at REAL NOT NULL,
    FOREIGN KEY (rule_id) REFERENCES compliance_rules(rule_id) ON DELETE CASCADE
);

-- Actions Outbox (Idempotent Execution & Delivery Tracking)
CREATE TABLE IF NOT EXISTS compliance_actions_outbox (
    action_id TEXT PRIMARY KEY,
    violation_id TEXT NULL,
    rule_id TEXT NOT NULL,
    action_type TEXT NOT NULL,           -- email, webhook, siren, in_app, dataset_record
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, DELIVERED, FAILED
    retry_count INTEGER NOT NULL DEFAULT 0,
    response_detail TEXT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at REAL NOT NULL,
    delivered_at REAL NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_comp_rules_domain ON compliance_rules(domain, status);
CREATE INDEX IF NOT EXISTS idx_comp_records_dataset ON compliance_dataset_records(dataset_id, event_time);
CREATE INDEX IF NOT EXISTS idx_comp_violations_rule_time ON compliance_violations(rule_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_comp_actions_status ON compliance_actions_outbox(status);

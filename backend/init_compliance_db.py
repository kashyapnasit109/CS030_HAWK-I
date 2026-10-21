"""
VIGINT Compliance System Database Migration & Seeding
Adds compliance rules, versions, datasets, dataset records, violations, and action outbox tables
safely without modifying or dropping any existing tables in visioncctv.db.
"""

import time
import json
from pathlib import Path
from database import get_connection, DB_PATH

SCHEMA_COMPLIANCE_SQL = """
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
"""

DEFAULT_DATASETS = [
    {
        "dataset_id": "ds_attendance_records",
        "name": "Classroom & Workplace Attendance Roster",
        "description": "Continuous tracking of student / staff arrivals, timestamps, on-time vs late statuses, and visual verification.",
        "domain": "education",
        "schema_json": json.dumps([
            {"name": "person_id", "type": "string", "label": "Person / Student ID", "required": True},
            {"name": "person_name", "type": "string", "label": "Full Name", "required": True},
            {"name": "arrival_time_str", "type": "string", "label": "Arrival Time", "required": True},
            {"name": "status", "type": "string", "label": "Attendance Status", "required": True},
            {"name": "zone", "type": "string", "label": "Classroom / Room No", "required": True},
            {"name": "confidence", "type": "float", "label": "Recognition Confidence", "required": False}
        ]),
        "retention_days": 180
    },
    {
        "dataset_id": "ds_hazard_incidents",
        "name": "Optical Fire, Smoke & Thermal Hazard Events",
        "description": "Critical environmental emergencies detected via optical flame, turbulent smoke plume, and spatial geofences.",
        "domain": "safety",
        "schema_json": json.dumps([
            {"name": "hazard_type", "type": "string", "label": "Hazard Classification", "required": True},
            {"name": "intensity_score", "type": "float", "label": "Flame / Plume Severity", "required": True},
            {"name": "sector", "type": "string", "label": "Facility Sector", "required": True},
            {"name": "recipient_alerted", "type": "string", "label": "Dispatched Contacts", "required": True},
            {"name": "audio_siren_fired", "type": "boolean", "label": "Siren Activated", "required": True}
        ]),
        "retention_days": 365
    },
    {
        "dataset_id": "ds_ppe_violations",
        "name": "Industrial PPE Compliance Logs",
        "description": "Continuous monitoring of hard hats, high-vis vests, goggles, and safety harnesses in designated zones.",
        "domain": "industrial",
        "schema_json": json.dumps([
            {"name": "worker_track_id", "type": "string", "label": "Track ID", "required": True},
            {"name": "missing_gear", "type": "string", "label": "Missing Protective Equipment", "required": True},
            {"name": "work_shift", "type": "string", "label": "Shift", "required": True},
            {"name": "danger_zone", "type": "string", "label": "Industrial Zone", "required": True}
        ]),
        "retention_days": 180
    },
    {
        "dataset_id": "ds_hygiene_audits",
        "name": "Healthcare & ICU Sanitization Compliance",
        "description": "Hand hygiene station adherence, sterile scrub verification, and dwell duration tracking.",
        "domain": "healthcare",
        "schema_json": json.dumps([
            {"name": "staff_id", "type": "string", "label": "Healthcare Staff ID", "required": False},
            {"name": "dispenser_id", "type": "string", "label": "Sanitizer Unit", "required": True},
            {"name": "scrub_dwell_sec", "type": "float", "label": "Dwell Seconds", "required": True},
            {"name": "compliant", "type": "boolean", "label": "Compliance Met", "required": True}
        ]),
        "retention_days": 365
    },
    {
        "dataset_id": "ds_access_tailgating",
        "name": "Turnstile Anti-Tailgating & Piggybacking Logs",
        "description": "Proximity tracking of dual centroids crossing tripwires on a single authorization event.",
        "domain": "corporate",
        "schema_json": json.dumps([
            {"name": "turnstile_id", "type": "string", "label": "Turnstile Lane", "required": True},
            {"name": "time_delta_sec", "type": "float", "label": "Inter-Person Delta (s)", "required": True},
            {"name": "authorized_badge", "type": "string", "label": "Badge Scanned", "required": False},
            {"name": "tailgater_detected", "type": "boolean", "label": "Tailgater Present", "required": True}
        ]),
        "retention_days": 90
    }
]

def migrate():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        print("Executing compliance schema migration...")
        cursor.executescript(SCHEMA_COMPLIANCE_SQL)
        
        # Seed default datasets if not existing
        for ds in DEFAULT_DATASETS:
            cursor.execute("SELECT dataset_id FROM compliance_datasets WHERE dataset_id = ?", (ds["dataset_id"],))
            if not cursor.fetchone():
                cursor.execute(
                    """INSERT INTO compliance_datasets 
                       (dataset_id, name, description, domain, schema_json, retention_days, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?);""",
                    (ds["dataset_id"], ds["name"], ds["description"], ds["domain"], ds["schema_json"], ds["retention_days"], time.time())
                )
                print(f"Seeded default dataset: {ds['name']}")
                
        # Also append to schema.sql for fresh setups if not already present
        schema_path = Path(__file__).parent / "storage" / "schema.sql"
        if schema_path.exists():
            content = schema_path.read_text(encoding="utf-8")
            if "compliance_rules" not in content:
                print("Appending compliance schema to schema.sql...")
                schema_path.write_text(content + "\n\n" + SCHEMA_COMPLIANCE_SQL, encoding="utf-8")
                
        conn.commit()
        print("Compliance database migration completed successfully!")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

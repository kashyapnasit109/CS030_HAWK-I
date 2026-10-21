"""
VIGINT Compliance System — Metadata-Driven Dataset Manager
Handles schema validation, structured record insertion, dynamic querying,
aggregations, and safe schema governance without arbitrary SQL generation.
"""

import time
import json
import uuid
from typing import Dict, Any, List, Optional, Tuple
from database import get_connection

class DatasetManager:
    """Manages metadata-driven datasets and strongly-typed records."""

    @staticmethod
    def list_datasets() -> List[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM compliance_datasets ORDER BY created_at DESC;")
            rows = cursor.fetchall()
            datasets = []
            for r in rows:
                datasets.append({
                    "dataset_id": r["dataset_id"],
                    "name": r["name"],
                    "description": r["description"],
                    "domain": r["domain"],
                    "schema": json.loads(r["schema_json"]) if r["schema_json"] else [],
                    "retention_days": r["retention_days"],
                    "created_at": r["created_at"]
                })
            return datasets
        finally:
            conn.close()

    @staticmethod
    def get_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM compliance_datasets WHERE dataset_id = ?;", (dataset_id,))
            r = cursor.fetchone()
            if not r:
                return None
            return {
                "dataset_id": r["dataset_id"],
                "name": r["name"],
                "description": r["description"],
                "domain": r["domain"],
                "schema": json.loads(r["schema_json"]) if r["schema_json"] else [],
                "retention_days": r["retention_days"],
                "created_at": r["created_at"]
            }
        finally:
            conn.close()

    @staticmethod
    def register_dataset(
        dataset_id: str,
        name: str,
        domain: str,
        schema: List[Dict[str, Any]],
        description: str = "",
        retention_days: int = 90
    ) -> Dict[str, Any]:
        """Registers a new metadata-driven dataset schema."""
        # Sanitize dataset_id
        safe_id = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in dataset_id.lower())
        if not safe_id.startswith("ds_"):
            safe_id = f"ds_{safe_id}"

        conn = get_connection()
        try:
            cursor = conn.cursor()
            now = time.time()
            cursor.execute(
                """INSERT INTO compliance_datasets 
                   (dataset_id, name, description, domain, schema_json, retention_days, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(dataset_id) DO UPDATE SET
                   name = excluded.name,
                   description = excluded.description,
                   schema_json = excluded.schema_json,
                   retention_days = excluded.retention_days;""",
                (safe_id, name, description, domain, json.dumps(schema), retention_days, now)
            )
            conn.commit()
            return {
                "dataset_id": safe_id,
                "name": name,
                "domain": domain,
                "schema": schema,
                "description": description,
                "retention_days": retention_days,
                "created_at": now
            }
        finally:
            conn.close()

    @staticmethod
    def validate_payload(schema: List[Dict[str, Any]], payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Strictly validates a payload dictionary against the dataset schema."""
        field_specs = {f["name"]: f for f in schema}
        for f in schema:
            if f.get("required") and f["name"] not in payload:
                return False, f"Missing mandatory field '{f['name']}' ({f.get('label', '')})"

        for key, val in payload.items():
            if key in field_specs:
                expected_type = field_specs[key].get("type", "string")
                if val is not None:
                    if expected_type == "string" and not isinstance(val, str):
                        return False, f"Field '{key}' expected string, got {type(val).__name__}"
                    elif expected_type == "integer" and not isinstance(val, int):
                        return False, f"Field '{key}' expected integer, got {type(val).__name__}"
                    elif expected_type == "float" and not isinstance(val, (int, float)):
                        return False, f"Field '{key}' expected float, got {type(val).__name__}"
                    elif expected_type == "boolean" and not isinstance(val, bool):
                        return False, f"Field '{key}' expected boolean, got {type(val).__name__}"
        return True, None

    @staticmethod
    def insert_record(
        dataset_id: str,
        rule_id: str,
        status: str,
        payload: Dict[str, Any],
        entity_id: Optional[str] = None,
        confidence: float = 1.0,
        keyframe_url: Optional[str] = None,
        evidence_hash: Optional[str] = None,
        event_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """Inserts a structured observation record into the dataset record store."""
        ds = DatasetManager.get_dataset(dataset_id)
        if not ds:
            raise ValueError(f"Dataset '{dataset_id}' is not registered.")

        ok, err = DatasetManager.validate_payload(ds["schema"], payload)
        if not ok:
            raise ValueError(f"Payload validation failed for dataset '{dataset_id}': {err}")

        record_id = f"REC-{uuid.uuid4().hex[:12].upper()}"
        ts = event_time if event_time is not None else time.time()

        conn = get_connection()
        try:
            cursor = conn.cursor()
            # Ensure rule_id exists in compliance_rules to satisfy foreign key
            cursor.execute("SELECT rule_id FROM compliance_rules WHERE rule_id = ?;", (rule_id,))
            if not cursor.fetchone():
                cursor.execute(
                    """INSERT OR IGNORE INTO compliance_rules 
                       (rule_id, name, category, domain, severity, enabled, camera_ids, trigger_type, conditions_json, actions_json, version, status, created_at, updated_at)
                       VALUES (?, 'Dataset Ingestion Rule', 'General', 'general', 'Low', 1, '[]', 'event', '{}', '[]', 1, 'active', ?, ?);""",
                    (rule_id, ts, ts)
                )

            cursor.execute(
                """INSERT INTO compliance_dataset_records
                   (record_id, dataset_id, rule_id, event_time, entity_id, status, confidence, keyframe_url, evidence_hash, payload_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                (record_id, dataset_id, rule_id, ts, entity_id, status, confidence, keyframe_url, evidence_hash, json.dumps(payload), time.time())
            )
            conn.commit()
            return {
                "record_id": record_id,
                "dataset_id": dataset_id,
                "rule_id": rule_id,
                "event_time": ts,
                "entity_id": entity_id,
                "status": status,
                "confidence": confidence,
                "keyframe_url": keyframe_url,
                "evidence_hash": evidence_hash,
                "payload": payload
            }
        finally:
            conn.close()

    @staticmethod
    def query_records(
        dataset_id: str,
        rule_id: Optional[str] = None,
        status: Optional[str] = None,
        entity_id: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Queries records from a dataset with safe filtering and pagination."""
        conn = get_connection()
        try:
            cursor = conn.cursor()
            query = "SELECT * FROM compliance_dataset_records WHERE dataset_id = ?"
            params: List[Any] = [dataset_id]

            if rule_id:
                query += " AND rule_id = ?"
                params.append(rule_id)
            if status:
                query += " AND status = ?"
                params.append(status)
            if entity_id:
                query += " AND entity_id = ?"
                params.append(entity_id)
            if start_time is not None:
                query += " AND event_time >= ?"
                params.append(start_time)
            if end_time is not None:
                query += " AND event_time <= ?"
                params.append(end_time)

            # Count total
            count_query = query.replace("SELECT *", "SELECT COUNT(*) as total")
            cursor.execute(count_query, params)
            total = cursor.fetchone()["total"]

            # Fetch page
            query += " ORDER BY event_time DESC LIMIT ? OFFSET ?;"
            params.extend([limit, offset])
            cursor.execute(query, params)
            rows = cursor.fetchall()

            records = []
            for r in rows:
                records.append({
                    "record_id": r["record_id"],
                    "dataset_id": r["dataset_id"],
                    "rule_id": r["rule_id"],
                    "event_time": r["event_time"],
                    "entity_id": r["entity_id"],
                    "status": r["status"],
                    "confidence": r["confidence"],
                    "keyframe_url": r["keyframe_url"],
                    "evidence_hash": r["evidence_hash"],
                    "payload": json.loads(r["payload_json"]) if r["payload_json"] else {},
                    "created_at": r["created_at"]
                })

            return {
                "dataset_id": dataset_id,
                "total": total,
                "limit": limit,
                "offset": offset,
                "records": records
            }
        finally:
            conn.close()

    @staticmethod
    def get_dashboard_aggregates(dataset_id: str, days: int = 7) -> Dict[str, Any]:
        """Computes summary metrics, compliance percentages, and status breakdown for dashboard charts."""
        conn = get_connection()
        try:
            cursor = conn.cursor()
            since = time.time() - (days * 86400)
            
            # Status breakdown
            cursor.execute(
                """SELECT status, COUNT(*) as count 
                   FROM compliance_dataset_records 
                   WHERE dataset_id = ? AND event_time >= ? 
                   GROUP BY status;""",
                (dataset_id, since)
            )
            status_counts = {r["status"]: r["count"] for r in cursor.fetchall()}
            total_records = sum(status_counts.values())

            # Daily timeline
            cursor.execute(
                """SELECT date(event_time, 'unixepoch') as day, status, COUNT(*) as count
                   FROM compliance_dataset_records
                   WHERE dataset_id = ? AND event_time >= ?
                   GROUP BY day, status
                   ORDER BY day ASC;""",
                (dataset_id, since)
            )
            timeline = []
            for r in cursor.fetchall():
                timeline.append({
                    "day": r["day"],
                    "status": r["status"],
                    "count": r["count"]
                })

            # Calculate compliance rate
            compliant_count = status_counts.get("ON_TIME", 0) + status_counts.get("COMPLIANT", 0)
            compliance_rate = round((compliant_count / total_records * 100), 1) if total_records > 0 else 100.0

            return {
                "dataset_id": dataset_id,
                "period_days": days,
                "total_records": total_records,
                "compliance_rate": compliance_rate,
                "status_breakdown": status_counts,
                "timeline": timeline
            }
        finally:
            conn.close()

"""
VIGINT Compliance System — API Router
Full REST and WebSocket endpoints for Natural Language Rule Compilation,
Visual Rule Studio, Presets Library (1000+ rules), Dynamic Datasets,
Real-Time Dynamic Dashboards, Statutory Evidence, and Triage Actions.
"""

import os
import json
import time
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel, Field
from pathlib import Path
from database import get_connection

from ai_pipeline.dataset_manager import DatasetManager
from ai_pipeline.action_dispatcher import ActionDispatcher
from ai_pipeline.compliance_compiler import RuleCompiler
from ai_pipeline.compliance_evaluator import DeterministicEvaluator
from ai_pipeline.operational_twin import OperationalDigitalTwin
from ai_pipeline.coverage_analyzer import CoverageAnalyzer
from ai_pipeline.incident_correlator import IncidentCorrelator
from ai_pipeline.predictive_engine import PredictiveComplianceEngine
from ai_pipeline.ask_vigint_copilot import AskVigintCopilot

router = APIRouter(prefix="/api/compliance", tags=["Compliance Engine"])

PRESETS_FILE = Path(__file__).parent.parent / "storage" / "preset_rules_library.json"

# In-memory active WebSocket clients
_WS_CLIENTS: List[WebSocket] = []

async def broadcast_ws_event(event_type: str, data: Dict[str, Any]):
    message = json.dumps({"type": event_type, "timestamp": time.time(), "data": data})
    disconnected = []
    for ws in _WS_CLIENTS:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in _WS_CLIENTS:
            _WS_CLIENTS.remove(ws)


# ── Pydantic Request Models ──────────────────────────────────────────────────
class CompileRuleRequest(BaseModel):
    prompt: str = Field(..., description="Natural language compliance rule requirement")
    camera_ids: Optional[List[str]] = Field(default=["GATE-01"], description="Target RTSP camera IDs")

class SaveRuleRequest(BaseModel):
    rule_id: Optional[str] = None
    name: str
    category: str
    domain: str
    severity: str = "High"
    enabled: bool = True
    camera_ids: List[str]
    natural_language_prompt: Optional[str] = None
    trigger_type: str = "event"
    conditions: Dict[str, Any]
    actions: List[Dict[str, Any]]
    dataset_id: Optional[str] = None
    dataset_proposal: Optional[Dict[str, Any]] = None
    dashboard_config: Optional[Dict[str, Any]] = None
    change_summary: Optional[str] = "Updated rule configuration"

class SimulateRuleRequest(BaseModel):
    rule: Dict[str, Any]
    sample_observation: Optional[Dict[str, Any]] = None

class TriageActionRequest(BaseModel):
    action: str = Field(..., description="ACKNOWLEDGE, DISPATCH, or RESOLVE")
    officer: Optional[str] = "Duty Officer"
    notes: Optional[str] = ""

class IngestObservationRequest(BaseModel):
    camera_id: str
    camera_name: Optional[str] = "Camera"
    class_name: str
    confidence: float = 0.95
    entity_id: Optional[str] = None
    bbox_center_x: Optional[float] = None

class BlastRadiusRequest(BaseModel):
    resource_id: str = Field(..., description="ID of the camera or zone going offline")
    resource_type: str = Field(default="camera", description="camera or zone")

class WhatIfSimulateRequest(BaseModel):
    rule_id: str = Field(..., description="Rule ID to simulate")
    modified_schedule: Optional[Dict[str, Any]] = None
    modified_dwell: Optional[float] = None

class AskCopilotRequest(BaseModel):
    question: str = Field(..., description="Natural language operational query")
    bbox_center_y: Optional[float] = None
    dwell_seconds: Optional[float] = 0.0
    dataset_payload: Optional[Dict[str, Any]] = None


# ── Natural Language Rule Compilation & Simulation ────────────────────────────
@router.post("/compile-rule")
async def compile_rule_endpoint(req: CompileRuleRequest):
    """Compiles free-form text using DeepSeek-v4-Flash via AgentRouter into a validated rule."""
    if not req.prompt or len(req.prompt.strip()) < 5:
        raise HTTPException(status_code=400, detail="Prompt must be at least 5 characters long.")
    result = RuleCompiler.compile_rule(req.prompt, req.camera_ids)
    return result


@router.post("/simulate-rule")
async def simulate_rule_endpoint(req: SimulateRuleRequest):
    """Simulates deterministic evaluation of a candidate rule against test observation data."""
    obs = req.sample_observation or {
        "camera_id": "GATE-01",
        "camera_name": "Main Entrance Gate",
        "class_name": req.rule.get("conditions", {}).get("relational", {}).get("subject", "person"),
        "confidence": 0.94,
        "entity_id": "SIM-USER-101",
        "dwell_seconds": 15.0,
        "timestamp": time.time()
    }
    result = DeterministicEvaluator.evaluate_observation(req.rule, obs)
    return {
        "matched": result is not None,
        "evaluation_output": result,
        "simulated_observation": obs
    }


# ── Preset Rules Library (1000+ Categorized Rules) ───────────────────────────
@router.get("/presets")
async def get_presets(
    domain: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Returns categorized presets from the 1000+ rules library with searching and filtering."""
    if not PRESETS_FILE.exists():
        return {"total": 0, "rules": []}

    try:
        data = json.loads(PRESETS_FILE.read_text(encoding="utf-8"))
        rules = data.get("rules", [])

        if domain:
            rules = [r for r in rules if r.get("domain") == domain]
        if category:
            rules = [r for r in rules if category.lower() in r.get("category", "").lower()]
        if search:
            s = search.lower()
            rules = [r for r in rules if s in r.get("title", "").lower() or s in r.get("description", "").lower() or s in r.get("natural_language_prompt", "").lower()]

        total = len(rules)
        paginated = rules[offset:offset + limit]

        return {
            "total": total,
            "domains": data.get("domains", []),
            "limit": limit,
            "offset": offset,
            "rules": paginated
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load presets: {e}")


# ── Compliance Rules Management & Versioning ─────────────────────────────────
@router.get("/rules")
async def list_rules(domain: Optional[str] = None, status: Optional[str] = None):
    """Lists all configured compliance rules."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM compliance_rules WHERE 1=1"
        params = []
        if domain:
            query += " AND domain = ?"
            params.append(domain)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY updated_at DESC;"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        rules = []
        for r in rows:
            rules.append({
                "rule_id": r["rule_id"],
                "name": r["name"],
                "category": r["category"],
                "domain": r["domain"],
                "severity": r["severity"],
                "enabled": bool(r["enabled"]),
                "camera_ids": json.loads(r["camera_ids"]) if r["camera_ids"] else [],
                "natural_language_prompt": r["natural_language_prompt"],
                "trigger_type": r["trigger_type"],
                "conditions": json.loads(r["conditions_json"]) if r["conditions_json"] else {},
                "actions": json.loads(r["actions_json"]) if r["actions_json"] else [],
                "dataset_id": r["dataset_id"],
                "dashboard_config": json.loads(r["dashboard_config"]) if r["dashboard_config"] else None,
                "version": r["version"],
                "status": r["status"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            })
        return {"total": len(rules), "rules": rules}
    finally:
        conn.close()


@router.post("/rules")
async def save_rule(req: SaveRuleRequest):
    """Creates or updates a compliance rule and records an immutable version snapshot."""
    import uuid
    rule_id = req.rule_id or f"RULE-{uuid.uuid4().hex[:8].upper()}"
    now = time.time()

    # Automatically provision target dataset if proposed
    dataset_id = req.dataset_id
    if req.dataset_proposal and req.dataset_proposal.get("dataset_id"):
        ds_prop = req.dataset_proposal
        DatasetManager.register_dataset(
            dataset_id=ds_prop["dataset_id"],
            name=ds_prop.get("name", f"{req.name} Data"),
            domain=req.domain,
            schema=ds_prop.get("fields", []),
            description=f"Auto-synthesized dataset for rule {rule_id}"
        )
        dataset_id = ds_prop["dataset_id"]

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT version FROM compliance_rules WHERE rule_id = ?;", (rule_id,))
        existing = cursor.fetchone()
        version = (existing["version"] + 1) if existing else 1

        cursor.execute(
            """INSERT INTO compliance_rules
               (rule_id, name, category, domain, severity, enabled, camera_ids, natural_language_prompt,
                trigger_type, conditions_json, actions_json, dataset_id, dashboard_config, version, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
               ON CONFLICT(rule_id) DO UPDATE SET
               name = excluded.name,
               category = excluded.category,
               domain = excluded.domain,
               severity = excluded.severity,
               enabled = excluded.enabled,
               camera_ids = excluded.camera_ids,
               natural_language_prompt = excluded.natural_language_prompt,
               trigger_type = excluded.trigger_type,
               conditions_json = excluded.conditions_json,
               actions_json = excluded.actions_json,
               dataset_id = excluded.dataset_id,
               dashboard_config = excluded.dashboard_config,
               version = excluded.version,
               status = excluded.status,
               updated_at = excluded.updated_at;""",
            (
                rule_id, req.name, req.category, req.domain, req.severity, 1 if req.enabled else 0,
                json.dumps(req.camera_ids), req.natural_language_prompt, req.trigger_type,
                json.dumps(req.conditions), json.dumps(req.actions), dataset_id,
                json.dumps(req.dashboard_config) if req.dashboard_config else None,
                version, now, now
            )
        )

        # Record version snapshot
        snapshot = req.model_dump()
        snapshot["version"] = version
        cursor.execute(
            """INSERT INTO compliance_rule_versions
               (rule_id, version, snapshot_json, changed_by, change_summary, created_at)
               VALUES (?, ?, ?, 'admin', ?, ?);""",
            (rule_id, version, json.dumps(snapshot), req.change_summary, now)
        )
        conn.commit()

        return {
            "success": True,
            "rule_id": rule_id,
            "version": version,
            "dataset_id": dataset_id,
            "status": "active"
        }
    finally:
        conn.close()


@router.post("/rules/{rule_id}/activate")
async def toggle_rule_active(rule_id: str, enabled: bool = True):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE compliance_rules SET enabled = ?, updated_at = ? WHERE rule_id = ?;",
            (1 if enabled else 0, time.time(), rule_id)
        )
        conn.commit()
        return {"success": True, "rule_id": rule_id, "enabled": enabled}
    finally:
        conn.close()


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM compliance_rules WHERE rule_id = ?;", (rule_id,))
        conn.commit()
        return {"success": True, "deleted_rule_id": rule_id}
    finally:
        conn.close()


# ── Violations & Incident Triage ─────────────────────────────────────────────
@router.get("/violations")
async def list_violations(
    rule_id: Optional[str] = None,
    camera_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Lists compliance violations with statutory evidence metadata."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM compliance_violations WHERE 1=1"
        params = []
        if rule_id:
            query += " AND rule_id = ?"
            params.append(rule_id)
        if camera_id:
            query += " AND camera_id = ?"
            params.append(camera_id)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?;"
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        violations = []
        for r in rows:
            violations.append({
                "violation_id": r["violation_id"],
                "rule_id": r["rule_id"],
                "camera_id": r["camera_id"],
                "camera_name": r["camera_name"],
                "severity": r["severity"],
                "timestamp": r["timestamp"],
                "relational_triplet": r["relational_triplet"],
                "calibrated_confidence": r["calibrated_confidence"],
                "keyframe_url": r["keyframe_url"],
                "footage_clip_url": r["footage_clip_url"],
                "sha256_hash": r["sha256_hash"],
                "status": r["status"],
                "assigned_officer": r["assigned_officer"],
                "resolution_notes": r["resolution_notes"],
                "created_at": r["created_at"]
            })
        return {"total": len(violations), "violations": violations}
    finally:
        conn.close()


@router.post("/violations/{violation_id}/action")
async def execute_violation_triage(violation_id: str, req: TriageActionRequest):
    """Executes triage actions (ACKNOWLEDGE, DISPATCH, RESOLVE) on a violation."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE compliance_violations
               SET status = ?, assigned_officer = ?, resolution_notes = ?
               WHERE violation_id = ?;""",
            (req.action.upper(), req.officer, req.notes, violation_id)
        )
        conn.commit()

        # Broadcast via WebSocket
        asyncio.create_task(broadcast_ws_event("VIOLATION_TRIAGED", {
            "violation_id": violation_id,
            "status": req.action.upper(),
            "officer": req.officer
        }))

        return {"success": True, "violation_id": violation_id, "status": req.action.upper()}
    finally:
        conn.close()


# ── Metadata Datasets & Dynamic Dashboards ───────────────────────────────────
@router.get("/datasets")
async def list_datasets():
    """Lists all registered datasets."""
    return {"datasets": DatasetManager.list_datasets()}


@router.get("/datasets/{dataset_id}/records")
async def get_dataset_records(
    dataset_id: str,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Queries records from a dataset."""
    return DatasetManager.query_records(dataset_id=dataset_id, status=status, limit=limit, offset=offset)


@router.get("/datasets/{dataset_id}/aggregates")
async def get_dataset_aggregates(dataset_id: str, days: int = 7):
    """Computes real compliance rates, distributions, and timelines for dynamic dashboard rendering."""
    return DatasetManager.get_dashboard_aggregates(dataset_id=dataset_id, days=days)


# ── Manual & Simulated Observation Ingestion ─────────────────────────────────
@router.post("/events/ingest")
async def ingest_observation(obs: IngestObservationRequest):
    """Ingests an observation event, evaluates it against active rules, and triggers consequences."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM compliance_rules WHERE enabled = 1;")
        active_rules = cursor.fetchall()
    finally:
        conn.close()

    triggered = []
    for r in active_rules:
        rule_dict = {
            "rule_id": r["rule_id"],
            "name": r["name"],
            "category": r["category"],
            "domain": r["domain"],
            "severity": r["severity"],
            "conditions": json.loads(r["conditions_json"]) if r["conditions_json"] else {},
            "actions": json.loads(r["actions_json"]) if r["actions_json"] else [],
            "dataset_id": r["dataset_id"]
        }
        res = DeterministicEvaluator.evaluate_observation(rule_dict, obs.model_dump())
        if res:
            triggered.append(res)
            # Broadcast WebSocket alert
            asyncio.create_task(broadcast_ws_event("COMPLIANCE_VIOLATION", res))

    return {
        "status": "PROCESSED",
        "active_rules_evaluated": len(active_rules),
        "violations_triggered": len(triggered),
        "results": triggered
    }


# ── Real-Time WebSocket Channel ──────────────────────────────────────────────
@router.websocket("/ws/stream")
async def compliance_websocket_endpoint(websocket: WebSocket):
    """High-speed WebSocket feed for live incident alerts, camera metrics, and dashboard updates."""
    await websocket.accept()
    _WS_CLIENTS.append(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to VIGINT Compliance Real-Time Stream",
            "active_clients": len(_WS_CLIENTS)
        }))
        while True:
            # Keep-alive heartbeat receiver
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if websocket in _WS_CLIENTS:
            _WS_CLIENTS.remove(websocket)
    except Exception:
        if websocket in _WS_CLIENTS:
            _WS_CLIENTS.remove(websocket)


# ── Operational Intelligence & Digital Twin Endpoints ────────────────────────
@router.get("/twin")
async def get_digital_twin_topology():
    """Returns the live facility digital twin topology with camera health and active rules."""
    return OperationalDigitalTwin.get_topology()


@router.post("/twin/blast-radius")
async def calculate_blast_radius(req: BlastRadiusRequest):
    """Calculates coverage gap risk and dependency blast-radius if a camera or zone goes down."""
    return OperationalDigitalTwin.calculate_blast_radius(req.resource_id, req.resource_type)


@router.post("/twin/simulate")
async def simulate_what_if_policy(req: WhatIfSimulateRequest):
    """Replays historical events against candidate policy parameters without mutating production tables."""
    return OperationalDigitalTwin.simulate_what_if_policy(req.rule_id, req.modified_schedule, req.modified_dwell)


@router.get("/coverage-analysis")
async def run_coverage_analysis():
    """Continuously evaluates unmonitored feeds, impaired rules, policy conflicts, and SLA breaches."""
    return CoverageAnalyzer.run_coverage_audit()


@router.get("/correlations")
async def get_incident_correlations(window_seconds: float = 600.0):
    """Discovers cross-system event clusters, root-cause hypotheses, and relationship graphs."""
    return IncidentCorrelator.get_correlated_incident_clusters(window_seconds)


@router.get("/predictions")
async def get_predictive_risk_assessment():
    """Computes early-warning risk scores, incident recurrence probabilities, and preventive recommendations."""
    return PredictiveComplianceEngine.get_predictive_risk_assessment()


@router.post("/ask-copilot")
async def ask_vigint_copilot(req: AskCopilotRequest):
    """Permission-aware natural language assistant for querying operational compliance data."""
    if not req.question or len(req.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Question must be at least 3 characters long.")
    return AskVigintCopilot.query(req.question)


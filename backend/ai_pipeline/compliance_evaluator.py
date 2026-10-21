"""
VIGINT Compliance System — Deterministic Rule Evaluator
Evaluates live camera detections and observation events against active compliance rules.
Supports Ray-Casting polygonal geofencing, directional tripwires, temporal schedule
calendars, dwell timers, cooldown deduplication, and automated action execution.
"""

import time
import json
import uuid
from typing import Dict, Any, List, Optional, Tuple
from database import get_connection
from ai_pipeline.action_dispatcher import ActionDispatcher
from ai_pipeline.dataset_manager import DatasetManager
from ai_pipeline.compliance_stream_buffer import package_statutory_evidence

class DeterministicEvaluator:
    """Evaluates observation events deterministically without non-deterministic hallucinations."""

    # In-memory cooldown cache: {f"{rule_id}:{entity_id}": last_triggered_timestamp}
    _COOLDOWNS: Dict[str, float] = {}

    @staticmethod
    def is_point_in_polygon(x: float, y: float, polygon: List[List[float]]) -> bool:
        """Ray-Casting algorithm for 2D polygonal containment."""
        if not polygon or len(polygon) < 3:
            return True  # If no polygon defined, whole frame is monitored
        n = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    @staticmethod
    def is_schedule_active(temporal_cfg: Dict[str, Any], current_time: Optional[float] = None) -> Tuple[bool, str]:
        """Checks if current time matches scheduled window, days of week, and grace period."""
        if not temporal_cfg or temporal_cfg.get("schedule_type") == "continuous":
            return True, "CONTINUOUS"

        ts = current_time if current_time is not None else time.time()
        tm = time.localtime(ts)
        current_wday = tm.tm_wday + 1  # 1 = Monday, 7 = Sunday
        active_days = temporal_cfg.get("days_of_week", [1, 2, 3, 4, 5])

        if current_wday not in active_days:
            return False, "OUT_OF_SCHEDULE_DAY"

        start_str = temporal_cfg.get("start_time")
        if start_str:
            sh, sm = map(int, start_str.split(":"))
            current_minute_of_day = tm.tm_hour * 60 + tm.tm_min
            target_minute_of_day = sh * 60 + sm
            grace_min = temporal_cfg.get("grace_period_min", 0)

            # E.g. If class starts at 09:10, and arrival is at 09:16 (after 5 min grace) -> Late
            if current_minute_of_day > (target_minute_of_day + grace_min):
                return True, "LATE_ARRIVAL"
            elif current_minute_of_day >= (target_minute_of_day - 30):
                return True, "ON_TIME"

        return True, "ACTIVE_WINDOW"

    @staticmethod
    def evaluate_observation(
        rule: Dict[str, Any],
        observation: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluates a single observation against a rule.
        Returns violation package if triggered, or None if compliant / non-matching.
        """
        rule_id = rule["rule_id"]
        entity_id = observation.get("entity_id", "anonymous")
        camera_id = observation.get("camera_id", "GATE-01")
        camera_name = observation.get("camera_name", "Monitored Camera")
        now = observation.get("timestamp", time.time())

        # Check cooldown to prevent alert flooding (e.g. 30 seconds default cooldown per entity)
        cooldown_key = f"{rule_id}:{entity_id}"
        last_fired = DeterministicEvaluator._COOLDOWNS.get(cooldown_key, 0)
        cooldown_seconds = 20.0
        if (now - last_fired) < cooldown_seconds:
            return None

        conditions = rule.get("conditions", {})
        if isinstance(conditions, str):
            try:
                conditions = json.loads(conditions)
            except Exception:
                conditions = {}

        # 1. Spatial Check
        spatial = conditions.get("spatial", {})
        points = spatial.get("points", [])
        obs_x = observation.get("bbox_center_x")
        obs_y = observation.get("bbox_center_y")
        if obs_x is not None and obs_y is not None and points:
            if not DeterministicEvaluator.is_point_in_polygon(obs_x, obs_y, points):
                return None

        # 2. Temporal Schedule Check
        temporal = conditions.get("temporal", {})
        in_schedule, schedule_status = DeterministicEvaluator.is_schedule_active(temporal, now)
        if not in_schedule:
            return None

        # 3. Dwell Threshold Check
        dwell_threshold = temporal.get("dwell_threshold_sec", 0)
        observed_dwell = observation.get("dwell_seconds", 0)
        if dwell_threshold > 0 and observed_dwell < dwell_threshold:
            return None

        # 4. Relational & Class Matching
        relational = conditions.get("relational", {})
        obs_class = observation.get("class_name", "").lower()
        rule_subj = relational.get("subject", "").lower()
        if rule_subj and obs_class and rule_subj not in obs_class and obs_class not in rule_subj:
            # Not the targeted entity
            return None

        # Rule Matched! Register cooldown
        DeterministicEvaluator._COOLDOWNS[cooldown_key] = now

        # Package statutory evidence clip & SHA-256 hash
        violation_id = f"VIOL-{uuid.uuid4().hex[:10].upper()}"
        evidence = package_statutory_evidence(
            camera_id=camera_id,
            violation_id=violation_id,
            rule_name=rule["name"],
            triplet_text=f"<{rule_subj}, {relational.get('predicate', 'triggers')}, {relational.get('object', 'condition')}>"
        )

        confidence = observation.get("confidence", 0.95)
        severity = rule.get("severity", "High")

        # Insert violation record into database
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO compliance_violations
                   (violation_id, rule_id, camera_id, camera_name, severity, timestamp, relational_triplet,
                    calibrated_confidence, keyframe_url, footage_clip_url, sha256_hash, status, action_dispatch_status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 'PENDING', ?);""",
                (
                    violation_id, rule_id, camera_id, camera_name, severity, now,
                    f"<{rule_subj}, {relational.get('predicate', 'triggers')}, {relational.get('object', 'condition')}>",
                    confidence, evidence["keyframe_url"], evidence["footage_clip_url"], evidence["sha256_hash"], now
                )
            )
            conn.commit()
        finally:
            conn.close()

        # Execute configured actions
        actions = rule.get("actions", [])
        if isinstance(actions, str):
            try:
                actions = json.loads(actions)
            except Exception:
                actions = []

        dispatched_actions = []
        for act in actions:
            act_type = act.get("action_type")
            act_params = act.get("parameters", {})
            act_params["violation_id"] = violation_id
            act_params["rule_name"] = rule["name"]
            act_params["camera_name"] = camera_name
            act_params["keyframe_url"] = evidence["keyframe_url"]
            act_params["sha256_hash"] = evidence["sha256_hash"]

            res = ActionDispatcher.enqueue_action(
                rule_id=rule_id,
                action_type=act_type,
                payload=act_params,
                violation_id=violation_id
            )
            dispatched_actions.append(res)

        # If a dataset is attached, record structured observation
        ds_id = rule.get("dataset_id")
        if ds_id:
            try:
                record_payload = observation.get("dataset_payload", {
                    "entity_id": entity_id,
                    "zone": spatial.get("zone_name", "Zone 1"),
                    "status": schedule_status,
                    "confidence": confidence
                })
                DatasetManager.insert_record(
                    dataset_id=ds_id,
                    rule_id=rule_id,
                    status=schedule_status,
                    payload=record_payload,
                    entity_id=entity_id,
                    confidence=confidence,
                    keyframe_url=evidence["keyframe_url"],
                    evidence_hash=evidence["sha256_hash"],
                    event_time=now
                )
            except Exception as e:
                # Silently catch schema mismatch to prevent disruption of core alert
                pass

        return {
            "violation_id": violation_id,
            "rule_id": rule_id,
            "rule_name": rule["name"],
            "camera_id": camera_id,
            "camera_name": camera_name,
            "severity": severity,
            "timestamp": now,
            "evidence": evidence,
            "actions_executed": len(dispatched_actions)
        }

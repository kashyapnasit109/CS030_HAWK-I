"""
VIGINT Operational Intelligence — Compliance Coverage Intelligence & Gap Analyzer
Continuously scans organizational requirements, camera health, rule conflicts,
unmonitored zones, and SLA response breaches to report proactive weaknesses.
"""

import time
import json
from typing import Dict, Any, List
from database import get_connection

class CoverageAnalyzer:
    """Detects coverage gaps, policy conflicts, offline dependencies, and SLA breaches."""

    @staticmethod
    def run_coverage_audit() -> Dict[str, Any]:
        conn = get_connection()
        try:
            cursor = conn.cursor()

            # 1. Inspect registered cameras vs active rules
            cursor.execute("SELECT camera_id, name, is_connected FROM cameras;")
            cameras = [dict(c) for c in cursor.fetchall()]

            cursor.execute("SELECT rule_id, name, domain, category, camera_ids, severity, enabled, conditions_json FROM compliance_rules WHERE enabled = 1;")
            active_rules = []
            for r in cursor.fetchall():
                active_rules.append({
                    "rule_id": r["rule_id"],
                    "name": r["name"],
                    "domain": r["domain"],
                    "category": r["category"],
                    "camera_ids": json.loads(r["camera_ids"]) if r["camera_ids"] else [],
                    "severity": r["severity"],
                    "conditions": json.loads(r["conditions_json"]) if r["conditions_json"] else {}
                })

            # Check unmonitored cameras
            monitored_cams = set()
            for r in active_rules:
                for cid in r["camera_ids"]:
                    monitored_cams.add(cid)

            unmonitored_cameras = [c for c in cameras if c["camera_id"] not in monitored_cams]

            # Check rules depending on disconnected cameras
            offline_cam_ids = {c["camera_id"] for c in cameras if not c["is_connected"]}
            impaired_rules = []
            for r in active_rules:
                hit_offline = [cid for cid in r["camera_ids"] if cid in offline_cam_ids]
                if hit_offline:
                    impaired_rules.append({
                        "rule_id": r["rule_id"],
                        "name": r["name"],
                        "offline_cameras": hit_offline,
                        "severity": r["severity"]
                    })

            # 2. Policy Conflict Detection (contradictory rules on same camera/time)
            policy_conflicts = []
            for i in range(len(active_rules)):
                for j in range(i + 1, len(active_rules)):
                    r1 = active_rules[i]
                    r2 = active_rules[j]
                    shared_cams = set(r1["camera_ids"]).intersection(set(r2["camera_ids"]))
                    if shared_cams:
                        # Check temporal overlap
                        t1 = r1["conditions"].get("temporal", {})
                        t2 = r2["conditions"].get("temporal", {})
                        if t1.get("start_time") and t2.get("start_time") and t1.get("start_time") == t2.get("start_time"):
                            if r1["category"] != r2["category"]:
                                policy_conflicts.append({
                                    "conflict_id": f"CONF-{r1['rule_id'][:6]}-{r2['rule_id'][:6]}",
                                    "rule_a": r1["name"],
                                    "rule_b": r2["name"],
                                    "shared_cameras": list(shared_cams),
                                    "conflict_reason": f"Overlapping schedule at {t1.get('start_time')} with disparate categories: '{r1['category']}' vs '{r2['category']}'."
                                })

            # 3. SLA Breaches (Unacknowledged violations > 15 minutes)
            now = time.time()
            sla_threshold = now - (15 * 60)
            cursor.execute(
                """SELECT violation_id, rule_id, camera_name, severity, timestamp 
                   FROM compliance_violations 
                   WHERE status = 'OPEN' AND timestamp < ?;""",
                (sla_threshold,)
            )
            sla_breaches = [dict(v) for v in cursor.fetchall()]

            # 4. Action Outbox Failures
            cursor.execute("SELECT COUNT(*) as failed_count FROM compliance_actions_outbox WHERE status = 'FAILED';")
            failed_actions = cursor.fetchone()["failed_count"]

            # Compute overall health score
            deductions = (len(unmonitored_cameras) * 5) + (len(impaired_rules) * 12) + (len(policy_conflicts) * 8) + (len(sla_breaches) * 6)
            coverage_health_score = max(35, 100 - deductions)

            # Prioritized Remediation Recommendations
            recommendations = []
            if unmonitored_cameras:
                recommendations.append({
                    "priority": "HIGH",
                    "title": f"Deploy Compliance Rules to {len(unmonitored_cameras)} Unmonitored Feeds",
                    "detail": f"Cameras {[c['name'] for c in unmonitored_cameras]} have no active rules attached.",
                    "suggested_action": "Apply standard preset rule from the catalog."
                })
            if impaired_rules:
                recommendations.append({
                    "priority": "CRITICAL",
                    "title": f"Restore Ingress Connectivity for {len(impaired_rules)} Impaired Rules",
                    "detail": "Cameras are currently marked disconnected in the stream registry.",
                    "suggested_action": "Verify RTSP stream credentials and network switch link."
                })
            if sla_breaches:
                recommendations.append({
                    "priority": "MEDIUM",
                    "title": f"Triage {len(sla_breaches)} Overdue Incident Alerts",
                    "detail": "Incidents have remained in OPEN status beyond the 15-minute SLA target.",
                    "suggested_action": "Dispatch duty officers or execute batch incident resolution."
                })

            return {
                "coverage_health_score": coverage_health_score,
                "total_cameras": len(cameras),
                "unmonitored_cameras_count": len(unmonitored_cameras),
                "unmonitored_cameras": unmonitored_cameras,
                "impaired_rules_count": len(impaired_rules),
                "impaired_rules": impaired_rules,
                "policy_conflicts_count": len(policy_conflicts),
                "policy_conflicts": policy_conflicts,
                "sla_breaches_count": len(sla_breaches),
                "sla_breaches": sla_breaches,
                "failed_actions_outbox_count": failed_actions,
                "remediations": recommendations,
                "audited_at": now
            }
        finally:
            conn.close()

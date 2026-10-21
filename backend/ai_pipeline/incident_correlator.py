"""
VIGINT Operational Intelligence — Cross-System Incident Correlator
Groups related events across cameras, time-windows, and entity identifiers.
Builds an incident relationship graph and synthesizes candidate root-cause hypotheses.
"""

import time
import json
from typing import Dict, Any, List
from database import get_connection

class IncidentCorrelator:
    """Discovers relationships across seemingly isolated surveillance and telemetry events."""

    @staticmethod
    def get_correlated_incident_clusters(window_seconds: float = 600.0) -> Dict[str, Any]:
        """
        Groups incidents within sliding temporal windows and shared spatial/entity affinities.
        Outputs clusters with candidate root-cause hypotheses and relationship graph.
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM compliance_violations ORDER BY timestamp DESC LIMIT 60;")
            rows = [dict(r) for r in cursor.fetchall()]

            if not rows:
                return {"clusters": [], "graph": {"nodes": [], "edges": []}, "total_clusters": 0}

            clusters: List[Dict[str, Any]] = []
            visited = set()

            for i in range(len(rows)):
                if rows[i]["violation_id"] in visited:
                    continue

                seed = rows[i]
                current_cluster = [seed]
                visited.add(seed["violation_id"])

                for j in range(i + 1, len(rows)):
                    cand = rows[j]
                    if cand["violation_id"] in visited:
                        continue

                    # Correlation Criteria:
                    # 1. Temporal Proximity (within window_seconds)
                    time_diff = abs(seed["timestamp"] - cand["timestamp"])
                    # 2. Shared Camera or Shared Rule Category
                    same_cam = seed["camera_id"] == cand["camera_id"]
                    same_rule = seed["rule_id"] == cand["rule_id"]

                    if time_diff <= window_seconds and (same_cam or same_rule):
                        current_cluster.append(cand)
                        visited.add(cand["violation_id"])

                # Synthesize root-cause hypothesis for cluster
                cluster_id = f"CLUST-{seed['violation_id'][:6]}"
                cams = list({c["camera_name"] for c in current_cluster})
                rules = list({c["rule_id"] for c in current_cluster})

                if len(current_cluster) > 1:
                    hypothesis = f"Coincident breach pattern detected across {len(cams)} feed(s). High likelihood of coordinated movement or sequential facility policy deviation."
                    conf = min(0.95, 0.65 + (len(current_cluster) * 0.08))
                else:
                    hypothesis = f"Isolated single-incident occurrence at {cams[0]}."
                    conf = 0.50

                clusters.append({
                    "cluster_id": cluster_id,
                    "event_count": len(current_cluster),
                    "primary_camera": cams[0],
                    "involved_cameras": cams,
                    "involved_rules": rules,
                    "correlation_confidence": round(conf, 2),
                    "root_cause_hypothesis": hypothesis,
                    "first_event_time": min(c["timestamp"] for c in current_cluster),
                    "last_event_time": max(c["timestamp"] for c in current_cluster),
                    "events": current_cluster
                })

            # Build Graph Nodes & Edges for Visual Explorer
            nodes = []
            edges = []
            for cl in clusters:
                nodes.append({
                    "id": cl["cluster_id"],
                    "label": f"Incident Cluster ({cl['event_count']} events)",
                    "type": "cluster",
                    "confidence": cl["correlation_confidence"]
                })
                for ev in cl["events"]:
                    ev_node_id = f"EV-{ev['violation_id']}"
                    nodes.append({
                        "id": ev_node_id,
                        "label": f"{ev['camera_name']} ({ev['severity']})",
                        "type": "incident",
                        "violation_id": ev["violation_id"]
                    })
                    edges.append({
                        "source": cl["cluster_id"],
                        "target": ev_node_id,
                        "relationship": "correlates_with",
                        "weight": cl["correlation_confidence"]
                    })

            return {
                "clusters": clusters,
                "total_clusters": len(clusters),
                "graph": {"nodes": nodes, "edges": edges},
                "analyzed_at": time.time()
            }
        finally:
            conn.close()

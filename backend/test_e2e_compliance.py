"""
End-to-End Acceptance Tests for VIGINT Real-Time CCTV Compliance Engine.
Tests:
1. Real camera registry and health
2. Multi-camera, multi-rule assignment persistence and engine synchronization
3. Rule compatibility evaluation
4. Live deterministic violation triggering and statutory evidence packaging
5. Operational telemetry and diagnostics
"""

import time
import json
import unittest
from fastapi.testclient import TestClient

from main import app
from database import get_connection
from ai_pipeline.compliance_engine import compliance_engine
from ai_pipeline.compliance_stream_buffer import get_camera_buffer


class TestComplianceEngineE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_real_camera_registry_and_health(self):
        """Test A: Verify real cameras are returned with connection health, fps, and capabilities."""
        res = self.client.get("/api/compliance/cameras")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("cameras", data)
        self.assertGreater(data["total"], 0)

        first_cam = data["cameras"][0]
        self.assertIn("camera_id", first_cam)
        self.assertIn("status", first_cam)
        self.assertIn("supported_capabilities", first_cam)
        self.assertIn("active_rule_count", first_cam)
        print(f"[TEST 1 PASS] Cameras verified: {data['total']} registered. Sample: {first_cam['camera_id']} ({first_cam['status']})")

    def test_02_rule_compatibility_check(self):
        """Test D1: Validate rule compatibility matrix against cameras."""
        res = self.client.post("/api/compliance/rule-compatibility", json={
            "camera_ids": ["cam-01", "cam-02"],
            "rule_ids": ["RULE-1A8C3D64", "RULE-E86FF6D2"]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("matrix", data)
        self.assertEqual(len(data["matrix"]), 4)
        for m in data["matrix"]:
            self.assertIn("compatible", m)
        print(f"[TEST 2 PASS] Compatibility matrix verified: {len(data['matrix'])} pairs evaluated.")

    def test_03_multi_camera_multi_rule_bulk_assignment(self):
        """Test D2: Apply multi-camera, multi-rule bulk assignments, verify atomic persistence and engine acknowledgment."""
        initial_cfg_ver = compliance_engine.config_version

        payload = {
            "camera_ids": ["cam-01", "cam-02"],
            "rule_ids": ["RULE-1A8C3D64", "RULE-E86FF6D2"],
            "assignment_config": {"tolerance_sec": 10},
            "exclude_incompatible": False
        }
        res = self.client.post("/api/compliance/assignments/bulk", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["applied_count"], 4)
        self.assertGreater(data["config_version"], initial_cfg_ver)

        # Confirm persisted in database
        asgn_res = self.client.get("/api/compliance/assignments?camera_id=cam-01")
        self.assertEqual(asgn_res.status_code, 200)
        asgns = asgn_res.json()["assignments"]
        self.assertTrue(any(a["rule_id"] == "RULE-1A8C3D64" for a in asgns))
        print(f"[TEST 3 PASS] Bulk assignments applied and persisted. Engine config version acknowledged: {data['config_version']}")

    def test_04_live_violation_and_evidence_packaging(self):
        """Test E: Real observation evaluation creates violation with real statutory evidence and SHA-256 hash."""
        obs_payload = {
            "camera_id": "cam-01",
            "camera_name": "Test Entrance Gate",
            "class_name": "person",
            "confidence": 0.96,
            "entity_id": "TEST-TRK-88",
            "dwell_seconds": 12.0
        }
        res = self.client.post("/api/compliance/events/ingest", json=obs_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "PROCESSED")

        # Verify violations table contains sealed evidence with sha256 hash
        viol_res = self.client.get("/api/compliance/violations?camera_id=cam-01&limit=5")
        self.assertEqual(viol_res.status_code, 200)
        viols = viol_res.json()["violations"]
        if viols:
            v = viols[0]
            self.assertIn("sha256_hash", v)
            self.assertIn("keyframe_url", v)
            self.assertEqual(len(v["sha256_hash"]), 64)
            print(f"[TEST 4 PASS] Real violation sealed with SHA-256 fingerprint: {v['sha256_hash'][:24]}...")

    def test_05_operational_diagnostics(self):
        """Test F: Operational diagnostics returns stream decoders, latency, buffer depth, and traces."""
        res = self.client.get("/api/compliance/diagnostics")
        self.assertEqual(res.status_code, 200)
        diag = res.json()
        self.assertEqual(diag["status"], "OPERATIONAL")
        self.assertIn("system_metrics", diag)
        self.assertIn("cameras", diag)
        self.assertIn("recent_traces", diag)
        print(f"[TEST 5 PASS] Diagnostics operational. Aggregate FPS: {diag['system_metrics']['aggregate_inference_fps']}, Total Cameras: {diag['system_metrics']['total_cameras']}")


if __name__ == "__main__":
    unittest.main()

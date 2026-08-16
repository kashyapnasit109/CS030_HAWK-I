"""
Unit tests for EventBuilder factory functions using Python unittest.
"""

import unittest
from services.event_builder import EventBuilder
from models.detection_event import DetectionResult, DetectionEvent


class TestEventBuilder(unittest.TestCase):

    def test_build_anpr_events(self):
        raw_anpr = {
            "plate_text": "KA-01-AB-1234",
            "confidence": 0.952,
            "bounding_box": {"x": 100, "y": 200, "w": 150, "h": 50},
            "vehicle_class": "car",
            "registry_match": True,
            "matched_vehicle": {"owner_name": "John Doe"}
        }

        result = EventBuilder.build_anpr_events(raw_anpr, camera_id=1)
        self.assertIsInstance(result, DetectionResult)
        self.assertEqual(result.source_module, "anpr")
        self.assertEqual(len(result.events), 1)

        event = result.events[0]
        self.assertEqual(event.source_module, "anpr")
        self.assertEqual(event.event_type, "plate_recognized")
        self.assertEqual(event.module, "vehicle")
        self.assertEqual(event.object_type, "car")
        self.assertEqual(event.confidence, 0.952)
        self.assertEqual(event.severity, "info")
        self.assertEqual(event.metadata["plate_text"], "KA-01-AB-1234")
        self.assertIn("License plate KA-01-AB-1234", event.description)

    def test_build_velocity_events(self):
        raw_velocity = {
            "tracked_objects": [
                {
                    "object_id": 4,
                    "object_type": "car",
                    "max_speed_kmh": 45.2,
                    "avg_speed_kmh": 38.0,
                    "path_points": [{"x": 10, "y": 20}, {"x": 30, "y": 40}]
                },
                {
                    "object_id": 7,
                    "object_type": "car",
                    "max_speed_kmh": 8.5,
                    "avg_speed_kmh": 7.0,
                    "path_points": [{"x": 5, "y": 10}]
                }
            ],
            "calibration_used": {"pixels_per_meter": 12.5}
        }

        result = EventBuilder.build_velocity_events(raw_velocity, speed_threshold_kmh=20.0, camera_id=2)
        self.assertEqual(len(result.events), 2)

        # Speed violation object (45.2 km/h > 20 km/h)
        viol_event = result.events[0]
        self.assertEqual(viol_event.event_type, "speed_violation")
        self.assertEqual(viol_event.severity, "danger")
        self.assertEqual(viol_event.metadata["max_speed_kmh"], 45.2)

        # Normal object (8.5 km/h <= 20 km/h)
        norm_event = result.events[1]
        self.assertEqual(norm_event.event_type, "motion_tracked")
        self.assertEqual(norm_event.severity, "info")

    def test_build_misplacement_events(self):
        raw_misplacement = {
            "differences": [
                {
                    "bounding_box": {"x": 50, "y": 50, "w": 40, "h": 40},
                    "change_type": "missing_object",
                    "object_type": "laptop",
                    "confidence": 0.88
                },
                {
                    "bounding_box": {"x": 150, "y": 150, "w": 60, "h": 60},
                    "change_type": "new_object",
                    "object_type": "backpack",
                    "confidence": 0.91
                }
            ]
        }

        result = EventBuilder.build_misplacement_events(raw_misplacement, camera_id=3)
        self.assertEqual(len(result.events), 2)
        self.assertEqual(result.events[0].event_type, "object_missing_object")
        self.assertEqual(result.events[0].severity, "danger")
        self.assertEqual(result.events[1].event_type, "object_new_object")
        self.assertEqual(result.events[1].severity, "warning")

    def test_build_threat_events(self):
        raw_threat = {
            "anomalies": [
                {
                    "object_id": 1,
                    "object_type": "person",
                    "triggered_rules": ["restricted_zone", "loitering"],
                    "anomaly_score": 0.85,
                    "explanation": "Entered restricted zone and loitered 40s."
                }
            ]
        }

        result = EventBuilder.build_threat_events(raw_threat, camera_id=6)
        self.assertEqual(len(result.events), 1)
        self.assertEqual(result.events[0].event_type, "threat_detected")
        self.assertEqual(result.events[0].severity, "danger")
        self.assertIn("restricted_zone", result.events[0].metadata["triggered_rules"])

    def test_build_entry_events(self):
        raw_entry = {
            "flagged_entries": [
                {
                    "interior_timestamp": "2026-08-16T12:00:00",
                    "relative_time_sec": 4.5,
                    "confidence": 0.94,
                    "explanation": "Person in interior without prior entry gate correlation."
                }
            ]
        }

        result = EventBuilder.build_entry_events(raw_entry, camera_id=2)
        self.assertEqual(len(result.events), 1)
        self.assertEqual(result.events[0].event_type, "unauthorized_entry")
        self.assertEqual(result.events[0].severity, "danger")


if __name__ == "__main__":
    unittest.main()

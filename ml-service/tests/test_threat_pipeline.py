"""
Unit tests for Threat & Anomaly Event Builder & Canonical Metadata
"""

from services.event_builder import EventBuilder


def test_build_threat_events_with_primary_bbox_and_clip():
    raw_result = {
        "anomalies": [
            {
                "object_id": 4,
                "object_type": "person",
                "triggered_rules": ["restricted_zone", "loitering"],
                "anomaly_score": 0.94,
                "explanation": "Person #4 entered restricted polygon zone during curfew window.",
                "primary_bbox": {"x": 120, "y": 80, "w": 90, "h": 180},
                "peak_time_sec": 5.2
            }
        ],
        "total_objects_tracked": 1,
        "video_duration_sec": 10.0,
        "clip_info": {
            "file_path": "/media/clips/threat_obj4_5200.mp4",
            "thumbnail_path": "/media/clips/threat_obj4_5200_thumb.jpg",
            "duration_sec": 6.0
        }
    }

    res = EventBuilder.build_threat_events(raw_result, camera_id=3)

    assert res.source_module == "threat"
    assert len(res.events) == 1

    evt = res.events[0]
    assert evt.camera_id == 3
    assert evt.object_type == "person"
    assert evt.severity == "danger"
    assert evt.confidence == 0.94
    assert evt.bounding_box == {"x": 120, "y": 80, "w": 90, "h": 180}
    assert evt.metadata["object_id"] == 4
    assert "restricted_zone" in evt.metadata["triggered_rules"]
    assert evt.metadata["clip_info"]["file_path"] == "/media/clips/threat_obj4_5200.mp4"
    assert res.processing_metadata["clip_info"] is not None

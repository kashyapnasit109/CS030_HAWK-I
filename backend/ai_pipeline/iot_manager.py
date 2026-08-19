"""
VIGINT — IoT Telemetry and Sensor Grid Manager
Handles telemetry streams from campus IoT sensor nodes (ESP32 / MQTT / Simulated).
Monitors MQ-2 (smoke), MQ-7 (CO/LPG), Temperature (°C), Acoustic Decibel (dBA), and PIR Motion.
"""

import time
import random
import threading
from typing import Any

# Campus Sensor Nodes mapped to physical campus locations
CAMPUS_ZONES = [
    {
        "node_id": "IOT-NODE-01",
        "zone_name": "Science & Chemistry Labs",
        "zone_code": "LABS",
        "building": "Science Complex Block B",
        "floor": "2nd Floor",
        "coordinates": {"x": 220, "y": 180},
        "sensors": {"mq2_smoke": 45, "mq7_co": 8, "temperature": 23.5, "sound_dba": 42.0, "pir_motion": 1},
        "status": "normal",
        "linked_cameras": ["CAM-03", "CAM-LAB-01"]
    },
    {
        "node_id": "IOT-NODE-02",
        "zone_name": "Central Server & Power Room",
        "zone_code": "SERVER",
        "building": "Admin & Tech Tower",
        "floor": "Basement 1",
        "coordinates": {"x": 540, "y": 320},
        "sensors": {"mq2_smoke": 25, "mq7_co": 4, "temperature": 21.0, "sound_dba": 68.5, "pir_motion": 0},
        "status": "normal",
        "linked_cameras": ["CAM-SRV-01"]
    },
    {
        "node_id": "IOT-NODE-03",
        "zone_name": "Academic Quad & Main Plaza",
        "zone_code": "QUAD",
        "building": "Central Campus",
        "floor": "Ground Level",
        "coordinates": {"x": 420, "y": 260},
        "sensors": {"mq2_smoke": 30, "mq7_co": 12, "temperature": 27.2, "sound_dba": 62.0, "pir_motion": 1},
        "status": "normal",
        "linked_cameras": ["CAM-01", "CAM-02"]
    },
    {
        "node_id": "IOT-NODE-04",
        "zone_name": "Campus Dining Hall & Kitchen",
        "zone_code": "CAFE",
        "building": "Student Activity Center",
        "floor": "Ground Floor",
        "coordinates": {"x": 310, "y": 410},
        "sensors": {"mq2_smoke": 95, "mq7_co": 15, "temperature": 29.8, "sound_dba": 74.0, "pir_motion": 1},
        "status": "normal",
        "linked_cameras": ["CAM-04"]
    },
    {
        "node_id": "IOT-NODE-05",
        "zone_name": "Central University Library",
        "zone_code": "LIB",
        "building": "Memorial Library",
        "floor": "1st Floor Reading Hall",
        "coordinates": {"x": 610, "y": 190},
        "sensors": {"mq2_smoke": 20, "mq7_co": 5, "temperature": 22.1, "sound_dba": 34.0, "pir_motion": 1},
        "status": "normal",
        "linked_cameras": ["CAM-LIB-01"]
    },
    {
        "node_id": "IOT-NODE-06",
        "zone_name": "East Student Hostels",
        "zone_code": "HOSTEL",
        "building": "Hostel Block C",
        "floor": "Perimeter & Entry",
        "coordinates": {"x": 720, "y": 380},
        "sensors": {"mq2_smoke": 35, "mq7_co": 9, "temperature": 24.5, "sound_dba": 51.0, "pir_motion": 1},
        "status": "normal",
        "linked_cameras": ["CAM-HST-01"]
    }
]

_telemetry_state: dict[str, dict[str, Any]] = {}
_anomaly_triggers: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()
_running = True


def initialize_iot_grid():
    """Seed initial telemetry state for all campus nodes."""
    global _telemetry_state
    with _lock:
        for node in CAMPUS_ZONES:
            _telemetry_state[node["node_id"]] = {
                **node,
                "last_updated": time.time(),
                "history": []
            }


def _background_telemetry_stream():
    """Simulate micro-fluctuations in IoT telemetry, or process MQTT broker payloads."""
    while _running:
        now = time.time()
        with _lock:
            for node_id, data in _telemetry_state.items():
                # If manual anomaly is active on this node, hold high values
                if node_id in _anomaly_triggers:
                    forced = _anomaly_triggers[node_id]
                    for k, v in forced.items():
                        if k in data["sensors"]:
                            data["sensors"][k] = v
                    data["status"] = "warning" if forced.get("temperature", 0) > 45 or forced.get("mq2_smoke", 0) > 300 else "alert"
                else:
                    # Realistic baseline drift
                    s = data["sensors"]
                    s["temperature"] = round(max(15.0, min(45.0, s["temperature"] + random.uniform(-0.15, 0.15))), 1)
                    s["sound_dba"] = round(max(30.0, min(95.0, s["sound_dba"] + random.uniform(-1.2, 1.2))), 1)
                    s["mq2_smoke"] = max(10, min(500, int(s["mq2_smoke"] + random.randint(-2, 2))))
                    s["mq7_co"] = max(2, min(80, int(s["mq7_co"] + random.randint(-1, 1))))
                    data["status"] = "normal"

                # Append history sample
                data["last_updated"] = now
                hist = data.get("history", [])
                hist.append({
                    "timestamp": now,
                    "temperature": data["sensors"]["temperature"],
                    "sound_dba": data["sensors"]["sound_dba"],
                    "mq2_smoke": data["sensors"]["mq2_smoke"],
                    "mq7_co": data["sensors"]["mq7_co"]
                })
                if len(hist) > 30:
                    data["history"] = hist[-30:]

        time.sleep(2.0)


# Start background telemetry generator daemon
initialize_iot_grid()
_telemetry_thread = threading.Thread(target=_background_telemetry_stream, daemon=True)
_telemetry_thread.start()


def get_all_telemetry() -> list[dict[str, Any]]:
    """Return latest telemetry snapshot for all campus nodes."""
    with _lock:
        return list(_telemetry_state.values())


def get_node_telemetry(node_id: str) -> dict[str, Any] | None:
    """Return telemetry for a specific node ID."""
    with _lock:
        return _telemetry_state.get(node_id)


def trigger_sensor_anomaly(node_id: str, overrides: dict[str, Any]):
    """Force an anomaly on a sensor node (e.g. fire drill or high gas spike)."""
    with _lock:
        if node_id in _telemetry_state:
            _anomaly_triggers[node_id] = overrides


def clear_sensor_anomaly(node_id: str):
    """Clear forced anomaly on a sensor node."""
    with _lock:
        if node_id in _anomaly_triggers:
            del _anomaly_triggers[node_id]

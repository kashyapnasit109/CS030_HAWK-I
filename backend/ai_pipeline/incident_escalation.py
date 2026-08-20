"""
VIGINT — Autonomous Incident Escalation Engine (P1 to P4 Matrix)
Coordinates:
- P1 (Critical): Control Room Takeover, Automated PA Announcement, Fire Exit Unlocks, Emergency Webhook Dispatch
- P2 (High): Quick Response Team (QRT) Guard Mobile Dispatch with GPS locus, PTZ Auto-Zoom
- P3 (Medium): Security Desk Ticket, Vehicle Plate Warning Registry
- P4 (Low): Facilities Maintenance Log & Sensor Telemetry Archival
"""

import time
import uuid
from typing import Any

# Active Campus Guards / Quick Response Team (QRT)
CAMPUS_GUARDS = [
    {"guard_id": "QRT-01", "name": "Officer Rajesh Sharma", "callsign": "Eagle-1", "current_zone": "Academic Quad", "coordinates": {"x": 410, "y": 250}, "status": "on_patrol"},
    {"guard_id": "QRT-02", "name": "Officer Priya Nair", "callsign": "Hawk-2", "current_zone": "Science Labs Complex", "coordinates": {"x": 230, "y": 190}, "status": "on_patrol"},
    {"guard_id": "QRT-03", "name": "Officer Vikram Singh", "callsign": "Falcon-3", "current_zone": "Hostel Gate B", "coordinates": {"x": 700, "y": 360}, "status": "standby"},
    {"guard_id": "QRT-04", "name": "Officer Amit Patel", "callsign": "Sentinel-4", "current_zone": "Central Library", "coordinates": {"x": 600, "y": 200}, "status": "on_patrol"}
]

# Real-time In-memory Incident Event Log
_active_incidents: list[dict[str, Any]] = [
    {
        "incident_id": "INC-2026-0819-01",
        "severity": "P1",
        "title": "Active Thermal & Optical Fire Outbreak",
        "zone_name": "Science & Chemistry Labs",
        "zone_code": "LABS",
        "camera_id": "CAM-03",
        "timestamp": time.time() - 140,
        "timestamp_str": time.strftime("%H:%M:%S", time.localtime(time.time() - 140)),
        "consensus_score": 0.94,
        "dempster_shafer": {"belief_E": 0.94, "plausibility_E": 0.98, "conflict": 0.02},
        "iot_telemetry": {"mq2_smoke": 380, "temperature": 49.5, "sound_dba": 78.0},
        "actions_taken": [
            "Full-screen control room takeover initiated",
            "Emergency Building PA Broadcast triggered: 'Attention: Evacuate Science Block B immediately'",
            "Solenoid Fire Exit Doors #1 and #2 auto-unlocked",
            "Campus Chief Warden & Fire Brigade notified via SMS/WhatsApp gateway",
            "QRT-02 (Officer Priya Nair) dispatched to locus"
        ],
        "status": "active",
        "dispatched_guard": "QRT-02 (Officer Priya Nair)",
        "video_url": "/storage/uploads/39feb69f.mp4"
    },
    {
        "incident_id": "INC-2026-0819-02",
        "severity": "P2",
        "title": "Slip & Fall with Immobility Detected",
        "zone_name": "Academic Quad & Main Plaza",
        "zone_code": "QUAD",
        "camera_id": "CAM-01",
        "timestamp": time.time() - 320,
        "timestamp_str": time.strftime("%H:%M:%S", time.localtime(time.time() - 320)),
        "consensus_score": 0.88,
        "dempster_shafer": {"belief_E": 0.88, "plausibility_E": 0.93, "conflict": 0.04},
        "iot_telemetry": {"sound_dba": 64.0, "temperature": 27.0},
        "actions_taken": [
            "QRT-01 (Officer Rajesh Sharma) dispatched with first-aid kit",
            "PTZ Camera CAM-01 auto-locked and zoomed on subject coordinates"
        ],
        "status": "responding",
        "dispatched_guard": "QRT-01 (Officer Rajesh Sharma)",
        "video_url": "/storage/uploads/840b0246.mp4"
    },
    {
        "incident_id": "INC-2026-0819-03",
        "severity": "P3",
        "title": "Unidentified Vehicle in Restricted Corridor",
        "zone_name": "East Student Hostels",
        "zone_code": "HOSTEL",
        "camera_id": "CAM-HST-01",
        "timestamp": time.time() - 650,
        "timestamp_str": time.strftime("%H:%M:%S", time.localtime(time.time() - 650)),
        "consensus_score": 0.82,
        "dempster_shafer": {"belief_E": 0.82, "plausibility_E": 0.90, "conflict": 0.05},
        "iot_telemetry": {"sound_dba": 58.0},
        "actions_taken": [
            "Plate OCR verified: DL-01-AB-1234 (Non-whitelisted)",
            "Security Desk incident ticket #T-8841 generated"
        ],
        "status": "acknowledged",
        "dispatched_guard": None,
        "video_url": "/storage/uploads/subway.mp4"
    }
]


def get_all_incidents() -> list[dict[str, Any]]:
    """Return all active and logged campus safety incidents."""
    return _active_incidents


def get_campus_guards() -> list[dict[str, Any]]:
    """Return list of on-duty Quick Response Team guards."""
    return CAMPUS_GUARDS


def create_incident(
    severity: str,
    title: str,
    zone_name: str,
    zone_code: str,
    camera_id: str,
    consensus_score: float,
    iot_telemetry: dict[str, Any],
    dempster_shafer: dict[str, Any] | None = None,
    video_url: str | None = None
) -> dict[str, Any]:
    """Autonomous Escalation trigger according to P1-P4 Matrix."""
    inc_id = f"INC-{time.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    actions = []
    dispatched_guard = None

    # Automated Escalation Rules
    if severity == "P1":
        actions.append("Full-screen control room takeover initiated")
        actions.append(f"Autonomous PA Broadcast: 'Emergency alert in {zone_name}. Follow evacuation routes.'")
        actions.append("Campus fire doors auto-actuated to unlocked state")
        actions.append("Campus Warden SMS & Emergency Response Webhook triggered")
        dispatched_guard = "QRT-01 (Officer Rajesh Sharma)"

    elif severity == "P2":
        actions.append(f"Nearest QRT Guard dispatched to {zone_name}")
        actions.append(f"PTZ Camera {camera_id} auto-zoomed on incident coordinates")
        dispatched_guard = "QRT-02 (Officer Priya Nair)"

    elif severity == "P3":
        actions.append(f"Security Desk ticket generated for {zone_name}")
        actions.append("Warning logged in security shift journal")

    else:
        actions.append("Telemetry logged to campus facilities maintenance database")

    resolved_video_url = video_url or (
        "/storage/uploads/376bd311.mp4" if "trump" in title.lower() or "quad" in zone_name.lower() or "fire" in title.lower()
        else "/storage/uploads/subway.mp4"
    )

    incident = {
        "incident_id": inc_id,
        "severity": severity,
        "title": title,
        "zone_name": zone_name,
        "zone_code": zone_code,
        "camera_id": camera_id,
        "timestamp": time.time(),
        "timestamp_str": time.strftime("%H:%M:%S"),
        "consensus_score": round(consensus_score, 3),
        "dempster_shafer": dempster_shafer or {"belief_E": consensus_score, "plausibility_E": min(1.0, consensus_score + 0.05)},
        "iot_telemetry": iot_telemetry,
        "actions_taken": actions,
        "status": "active",
        "dispatched_guard": dispatched_guard,
        "video_url": resolved_video_url
    }

    _active_incidents.insert(0, incident)
    return incident


def acknowledge_incident(incident_id: str, operator: str = "Chief Security Officer") -> bool:
    """Mark an incident as acknowledged / resolved."""
    for inc in _active_incidents:
        if inc["incident_id"] == incident_id:
            inc["status"] = "resolved"
            inc["actions_taken"].append(f"Acknowledged and marked resolved by {operator} at {time.strftime('%H:%M:%S')}")
            return True
    return False

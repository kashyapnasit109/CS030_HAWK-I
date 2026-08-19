"""
Camera management router.
Endpoints for adding/removing cameras, discovery, streaming, and live detection.
"""

import asyncio
import json
import time
import uuid
import sqlite3
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from database import get_db

router = APIRouter()


# ─── Request Models ─────────────────────────────────────────────────────

class AddCameraRequest(BaseModel):
    url: str
    name: str = ""
    brand: str = "generic"
    username: str = "admin"
    password: str = "admin"
    channel: int = 1
    is_nvr: bool = False
    channels_count: int = 4


class DiscoverRequest(BaseModel):
    subnet: Optional[str] = None
    timeout: float = 0.5
    credentials: Optional[list[dict]] = None


class StartDetectionRequest(BaseModel):
    detection_type: str = "face"  # face, object, motion
    reference_ids: Optional[list[str]] = None
    target_classes: Optional[list[str]] = None
    interval_seconds: float = 2.0


class ZoneCreateRequest(BaseModel):
    zone_id: Optional[str] = None
    name: str
    zone_type: str = "restricted"
    points: str  # JSON serialized points [[x,y],...]
    active_from: str = "00:00"
    active_to: str = "23:59"


# ─── Camera CRUD ─────────────────────────────────────────────────────────

@router.post("/add")
def api_add_camera(req: AddCameraRequest):
    """Add a new camera or NVR with multiple channels."""
    from ai_pipeline.camera_manager import add_camera  # noqa: PLC0415

    if req.is_nvr:
        added_cameras = []
        # Add each channel as a separate stream
        for ch in range(1, req.channels_count + 1):
            cam_name = f"{req.name or 'NVR'} - Ch {ch}"
            result = add_camera(
                url=req.url,
                name=cam_name,
                brand=req.brand,
                username=req.username,
                password=req.password,
                channel=ch,
            )
            added_cameras.append(result)
        
        # Determine if at least one camera is connected
        any_connected = any(c.get("is_connected") for c in added_cameras)
        return JSONResponse(
            status_code=201 if any_connected else 200,
            content={
                "success": True, 
                "cameras": added_cameras, 
                "message": f"Successfully registered NVR '{req.name}' with {req.channels_count} channels"
            },
        )
    else:
        result = add_camera(
            url=req.url,
            name=req.name,
            brand=req.brand,
            username=req.username,
            password=req.password,
            channel=req.channel,
        )
        return JSONResponse(
            status_code=201 if result.get("is_connected") else 200,
            content={"success": True, "camera": result},
        )


@router.delete("/{camera_id}")
def api_remove_camera(camera_id: str):
    """Remove a camera from the system."""
    from ai_pipeline.camera_manager import remove_camera  # noqa: PLC0415

    if remove_camera(camera_id):
        return {"success": True, "deleted_id": camera_id}
    raise HTTPException(status_code=404, detail="Camera not found")


@router.get("/list")
def api_list_cameras():
    """List all registered cameras with live status."""
    from ai_pipeline.camera_manager import list_cameras  # noqa: PLC0415

    cameras = list_cameras()
    return {"cameras": cameras, "count": len(cameras)}


# ─── Camera Discovery ───────────────────────────────────────────────────

@router.post("/discover")
def api_discover_cameras(req: DiscoverRequest):
    """
    Scan local network for IP cameras.
    This can take 30-60 seconds depending on subnet size.
    """
    from ai_pipeline.camera_manager import discover_cameras  # noqa: PLC0415

    creds = None
    if req.credentials:
        creds = [(c.get("username", "admin"), c.get("password", "admin")) for c in req.credentials]

    discovered = discover_cameras(
        subnet=req.subnet,
        timeout=req.timeout,
        credentials=creds,
    )
    return {"discovered": discovered, "count": len(discovered)}


# ─── Streaming ───────────────────────────────────────────────────────────

@router.get("/{camera_id}/snapshot")
def api_get_snapshot(camera_id: str):
    """Get a JPEG snapshot from a camera."""
    from ai_pipeline.camera_manager import get_snapshot  # noqa: PLC0415

    jpeg = get_snapshot(camera_id)
    if jpeg is None:
        raise HTTPException(status_code=503, detail="Camera not available or not connected")

    return StreamingResponse(
        iter([jpeg]),
        media_type="image/jpeg",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/{camera_id}/stream")
def api_stream_camera(camera_id: str):
    """
    MJPEG live stream endpoint.
    Connect with: <img src="/api/cameras/{id}/stream" />
    """
    from ai_pipeline.camera_manager import get_camera_stream  # noqa: PLC0415

    stream = get_camera_stream(camera_id)
    if stream is None:
        raise HTTPException(status_code=503, detail="Camera not available or not connected")

    return StreamingResponse(
        stream.generate_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ─── Live Detection ─────────────────────────────────────────────────────

@router.post("/{camera_id}/start-detection")
def api_start_detection(camera_id: str, req: StartDetectionRequest):
    """Start live AI detection on a camera feed."""
    from ai_pipeline.camera_manager import start_live_detection  # noqa: PLC0415

    success = start_live_detection(
        camera_id=camera_id,
        detection_type=req.detection_type,
        reference_ids=req.reference_ids,
        target_classes=req.target_classes,
        interval_seconds=req.interval_seconds,
    )
    if not success:
        raise HTTPException(status_code=503, detail="Failed to start detection — camera not connected")
    return {"success": True, "message": f"Live {req.detection_type} detection started on {camera_id}"}


@router.post("/{camera_id}/stop-detection")
def api_stop_detection(camera_id: str):
    """Stop live detection on a camera."""
    from ai_pipeline.camera_manager import stop_live_detection  # noqa: PLC0415

    stop_live_detection(camera_id)
    return {"success": True, "message": f"Detection stopped on {camera_id}"}


@router.get("/{camera_id}/detections")
def api_get_detections(camera_id: str, since: float = 0):
    """Get recent detection alerts for a camera."""
    from ai_pipeline.camera_manager import get_detection_alerts  # noqa: PLC0415

    alerts = get_detection_alerts(camera_id, since=since)
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/alerts/all")
def api_get_all_alerts(since: float = 0):
    """Get all detection alerts across all cameras."""
    from ai_pipeline.camera_manager import get_all_alerts  # noqa: PLC0415

    alerts = get_all_alerts(since=since)
    return {"alerts": alerts, "count": len(alerts)}


# ─── Camera Zones CRUD ──────────────────────────────────────────────────

@router.get("/{camera_id}/zones")
def get_camera_zones(camera_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Retrieve all visual ROI zones configured for this camera."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT zone_id, name, zone_type, points, active_from, active_to FROM zones WHERE camera_id = ?;",
        (camera_id,)
    )
    return {"zones": [dict(row) for row in cursor.fetchall()]}


@router.post("/{camera_id}/zones")
def save_camera_zone(camera_id: str, req: ZoneCreateRequest, db: sqlite3.Connection = Depends(get_db)):
    """Save or update an ROI zone polygon in the database."""
    zone_id = req.zone_id or f"zone_{str(uuid.uuid4())[:8]}"
    cursor = db.cursor()
    try:
        cursor.execute(
            """INSERT INTO zones (zone_id, camera_id, name, zone_type, points, active_from, active_to)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(zone_id) DO UPDATE SET
                 name=excluded.name,
                 zone_type=excluded.zone_type,
                 points=excluded.points,
                 active_from=excluded.active_from,
                 active_to=excluded.active_to;""",
            (zone_id, camera_id, req.name, req.zone_type, req.points, req.active_from, req.active_to)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    return {"success": True, "zone_id": zone_id}


@router.delete("/{camera_id}/zones/{zone_id}")
def delete_camera_zone(camera_id: str, zone_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete a configured ROI zone."""
    cursor = db.cursor()
    cursor.execute("DELETE FROM zones WHERE zone_id = ? AND camera_id = ?;", (zone_id, camera_id))
    db.commit()
    return {"success": True}


# ─── Dynamic Source Switching & Simulation Videos ────────────────────────

class SetSourceRequest(BaseModel):
    source_url: str
    source_name: Optional[str] = None


@router.post("/{camera_id}/set-source")
def set_camera_source(camera_id: str, req: SetSourceRequest):
    """Switch camera source to any uploaded video or RTSP URL."""
    from ai_pipeline.camera_manager import get_camera_stream  # noqa: PLC0415
    stream = get_camera_stream(camera_id)
    if not stream:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    # Resolve local path if filename or storage URL given
    src = req.source_url
    if src.startswith("/storage/uploads/"):
        from pathlib import Path
        from ai_pipeline.camera_manager import STORAGE_DIR
        filename = src.replace("/storage/uploads/", "")
        resolved = STORAGE_DIR / "uploads" / filename
        if resolved.exists():
            src = str(resolved)

    stream.change_source(src, req.source_name or stream.name)
    return {"success": True, "camera_id": camera_id, "new_source": src}


@router.get("/videos/available")
def get_available_simulation_videos():
    """List all uploaded videos available for camera simulation."""
    from ai_pipeline.camera_manager import STORAGE_DIR
    import json
    uploads_dir = STORAGE_DIR / "uploads"
    videos = []
    if uploads_dir.exists():
        for meta_file in uploads_dir.glob("*.meta.json"):
            try:
                data = json.loads(meta_file.read_text())
                videos.append(data)
            except Exception:
                pass
    return {"success": True, "count": len(videos), "videos": videos}


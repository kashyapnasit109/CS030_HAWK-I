"""
Camera management router.
Endpoints for adding/removing cameras, discovery, streaming, and live detection.
"""

import asyncio
import json
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

router = APIRouter()


# ─── Request Models ─────────────────────────────────────────────────────

class AddCameraRequest(BaseModel):
    url: str
    name: str = ""
    brand: str = "generic"
    username: str = "admin"
    password: str = "admin"
    channel: int = 1


class DiscoverRequest(BaseModel):
    subnet: Optional[str] = None
    timeout: float = 0.5
    credentials: Optional[list[dict]] = None


class StartDetectionRequest(BaseModel):
    detection_type: str = "face"  # face, object, motion
    reference_ids: Optional[list[str]] = None
    target_classes: Optional[list[str]] = None
    interval_seconds: float = 2.0


# ─── Camera CRUD ─────────────────────────────────────────────────────────

@router.post("/add")
async def api_add_camera(req: AddCameraRequest):
    """Add a new camera by RTSP/HTTP URL or manufacturer preset."""
    from ai_pipeline.camera_manager import add_camera  # noqa: PLC0415

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
async def api_remove_camera(camera_id: str):
    """Remove a camera from the system."""
    from ai_pipeline.camera_manager import remove_camera  # noqa: PLC0415

    if remove_camera(camera_id):
        return {"success": True, "deleted_id": camera_id}
    raise HTTPException(status_code=404, detail="Camera not found")


@router.get("/list")
async def api_list_cameras():
    """List all registered cameras with live status."""
    from ai_pipeline.camera_manager import list_cameras  # noqa: PLC0415

    cameras = list_cameras()
    return {"cameras": cameras, "count": len(cameras)}


# ─── Camera Discovery ───────────────────────────────────────────────────

@router.post("/discover")
async def api_discover_cameras(req: DiscoverRequest):
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
async def api_get_snapshot(camera_id: str):
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
async def api_stream_camera(camera_id: str):
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
async def api_start_detection(camera_id: str, req: StartDetectionRequest):
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
async def api_stop_detection(camera_id: str):
    """Stop live detection on a camera."""
    from ai_pipeline.camera_manager import stop_live_detection  # noqa: PLC0415

    stop_live_detection(camera_id)
    return {"success": True, "message": f"Detection stopped on {camera_id}"}


@router.get("/{camera_id}/detections")
async def api_get_detections(camera_id: str, since: float = 0):
    """Get recent detection alerts for a camera."""
    from ai_pipeline.camera_manager import get_detection_alerts  # noqa: PLC0415

    alerts = get_detection_alerts(camera_id, since=since)
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/alerts/all")
async def api_get_all_alerts(since: float = 0):
    """Get all detection alerts across all cameras."""
    from ai_pipeline.camera_manager import get_all_alerts  # noqa: PLC0415

    alerts = get_all_alerts(since=since)
    return {"alerts": alerts, "count": len(alerts)}


# ─── SSE Event Stream ───────────────────────────────────────────────────

@router.get("/{camera_id}/detections/stream")
async def api_detection_stream(camera_id: str):
    """
    Server-Sent Events (SSE) stream for real-time detection alerts.
    Connect with: new EventSource('/api/cameras/{id}/detections/stream')
    """
    from ai_pipeline.camera_manager import get_detection_alerts  # noqa: PLC0415

    async def event_generator():
        last_seen = time.time()
        while True:
            alerts = get_detection_alerts(camera_id, since=last_seen)
            for alert in alerts:
                yield f"data: {json.dumps(alert)}\n\n"
                last_seen = max(last_seen, alert["timestamp"])
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

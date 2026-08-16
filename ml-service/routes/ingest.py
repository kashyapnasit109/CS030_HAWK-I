"""
Hawk-I ML Service — Unified Video Ingestion Route

Accepts video files, passes them through the shared VideoIngestor pipeline,
executes the selected detector, and normalizes outputs into canonical
DetectionResult / DetectionEvent models via the EventBuilder.
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from services.video_pipeline import VideoIngestor, VideoIngestionError
from services.event_builder import EventBuilder
from models.detection_event import DetectionResult
from routes.velocity import detect_velocity
from routes.threat import detect_threat
from routes.anpr import detect_anpr

logger = logging.getLogger("hawk-ml.ingest")
router = APIRouter()


@router.post("/video", response_model=DetectionResult)
async def ingest_video(
    file: UploadFile = File(...),
    module_type: str = Form(..., description="Module to execute: velocity, threat, anpr"),
    camera_id: Optional[int] = Form(None),
    processing_fps: Optional[float] = Form(None),
    speed_threshold: Optional[float] = Form(10.0),
    rule_parameters: Optional[str] = Form(None),
    x1: Optional[float] = Form(None),
    y1: Optional[float] = Form(None),
    x2: Optional[float] = Form(None),
    y2: Optional[float] = Form(None),
    distance_meters: Optional[float] = Form(None),
):
    """
    Unified entry point for video ingestion.
    Runs VideoIngestor -> Selected Detector -> EventBuilder -> DetectionResult.
    """
    logger.info(f"Ingesting video for module '{module_type}' (Camera ID: {camera_id})")

    try:
        if module_type == "velocity":
            if x1 is None or y1 is None or x2 is None or y2 is None or not distance_meters:
                # Default fallback calibration for test convenience if omitted
                x1, y1, x2, y2, distance_meters = 0.0, 0.0, 100.0, 0.0, 10.0

            raw_res = await detect_velocity(
                file=file,
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2,
                distance_meters=distance_meters,
            )
            return EventBuilder.build_velocity_events(
                raw_result=raw_res,
                processing_metadata=raw_res.get("calibration_used", {}),
                speed_threshold_kmh=speed_threshold or 10.0,
                camera_id=camera_id,
            )

        elif module_type == "threat":
            rules_str = rule_parameters or json.dumps({
                "loitering_threshold": 15.0,
                "speed_threshold": speed_threshold or 10.0
            })
            raw_res = await detect_threat(file=file, rule_parameters=rules_str)
            return EventBuilder.build_threat_events(
                raw_result=raw_res,
                processing_metadata={"video_duration_sec": raw_res.get("video_duration_sec")},
                camera_id=camera_id,
            )

        elif module_type == "anpr":
            raw_res = await detect_anpr(file=file)
            return EventBuilder.build_anpr_events(
                raw_result=raw_res,
                camera_id=camera_id,
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported module_type '{module_type}' for unified video ingest. Choose 'velocity', 'threat', or 'anpr'."
            )

    except VideoIngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

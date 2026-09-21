"""
Hawk-I ML Service — Video Clip Generation Route

Exposes HTTP endpoint for generating annotated, event-centered video evidence clips.
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from services.video_pipeline import VideoIngestor, VideoIngestionError
from services.clip_generator import ClipGenerator

logger = logging.getLogger("hawk-ml.clip")
router = APIRouter()


@router.post("/generate")
async def generate_clip(
    file: UploadFile = File(...),
    event_timestamp_sec: float = Form(0.0),
    source_module: str = Form("general"),
    event_type: str = Form("detection"),
    label: Optional[str] = Form(None),
    confidence: Optional[float] = Form(None),
    extra_telemetry: Optional[str] = Form(None),
    bounding_box: Optional[str] = Form(None),
    pre_seconds: float = Form(3.0),
    post_seconds: float = Form(3.0),
):
    """
    Accepts video file + event timestamp + detection annotations,
    extracts event window with pre/post-roll, and renders bounding boxes & telemetry.
    """
    parsed_bbox = None
    if bounding_box:
        try:
            parsed_bbox = json.loads(bounding_box)
        except json.JSONDecodeError:
            pass

    try:
        async with VideoIngestor(file) as ingestor:
            temp_path = ingestor.get_video_path()

            clip_result = ClipGenerator.generate_annotated_clip(
                source_video_path=temp_path,
                event_timestamp_sec=event_timestamp_sec,
                source_module=source_module,
                event_type=event_type,
                bounding_box=parsed_bbox,
                label=label or source_module.upper(),
                confidence=confidence,
                extra_telemetry=extra_telemetry,
                pre_seconds=pre_seconds,
                post_seconds=post_seconds,
                clip_filename_prefix=f"{source_module}_{event_type}"
            )
            return clip_result

    except VideoIngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error in /clip/generate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate clip: {str(e)}")

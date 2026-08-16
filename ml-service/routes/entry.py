"""
Hawk-I ML Service — Unauthorized Entry Detection Route

Pipeline:
1. Accepts entry_gate and interior video clips
2. Ingests and processes both clips via VideoIngestor
3. Detects person presences using YOLOv8
4. Flags interior detections that lack an entry gate counterpart within the time window
5. Returns { flagged_entries, entry_gate_detections, interior_detections, disclaimer }
"""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from models.loader import get_yolo
from services.video_pipeline import VideoIngestor, VideoIngestionError

logger = logging.getLogger("hawk-ml")
router = APIRouter()

# We only care about persons for unauthorized entry
PERSON_CLASS_ID = 0


async def process_video_ingest(file: UploadFile, start_time_str: str, yolo):
    """Processes a video file with VideoIngestor and extracts person presence timestamps."""
    start_dt = datetime.now()
    if start_time_str:
        try:
            start_dt = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
        except ValueError:
            pass

    async with VideoIngestor(file, max_duration_sec=30.0) as ingestor:
        temp_path = ingestor.get_video_path()
        fps = ingestor.native_fps

        results = yolo.predict(
            source=temp_path,
            stream=True,
            classes=[PERSON_CLASS_ID],
            verbose=False
        )

        detections = []
        frame_idx = 0
        for result in results:
            boxes = result.boxes
            if boxes is not None and len(boxes) > 0:
                time_sec = frame_idx / fps
                absolute_time = start_dt + timedelta(seconds=time_sec)
                conf = max([float(c) for c in boxes.conf])
                detections.append({
                    "relative_time_sec": round(time_sec, 3),
                    "absolute_time_iso": absolute_time.isoformat(),
                    "confidence": round(conf, 4)
                })
            frame_idx += 1

        return detections


@router.post("/entry")
async def detect_entry(
    entry_gate: UploadFile = File(...),
    interior: UploadFile = File(...),
    time_window_minutes: float = Form(5.0),
    entry_gate_start_time: str = Form(None),
    interior_start_time: str = Form(None)
):
    """
    Accepts entry gate and interior video clips.
    Runs YOLOv8 presence detection (person) on both.
    Flags interior detections that don't have a corresponding entry gate detection
    within `time_window_minutes` prior to the interior detection.
    """
    yolo = get_yolo()
    if yolo is None:
        raise HTTPException(status_code=503, detail="YOLOv8 model is not loaded.")

    try:
        entry_detections = await process_video_ingest(entry_gate, entry_gate_start_time, yolo)
        interior_detections = await process_video_ingest(interior, interior_start_time, yolo)

        flagged_entries = []
        window_seconds = time_window_minutes * 60.0

        # Heuristic correlation
        for i_det in interior_detections:
            i_time = datetime.fromisoformat(i_det["absolute_time_iso"])
            matched = False

            for e_det in entry_detections:
                e_time = datetime.fromisoformat(e_det["absolute_time_iso"])
                dt_seconds = (i_time - e_time).total_seconds()
                
                if 0 <= dt_seconds <= window_seconds:
                    matched = True
                    break
                    
            if not matched:
                flagged_entries.append({
                    "interior_timestamp": i_det["absolute_time_iso"],
                    "relative_time_sec": i_det["relative_time_sec"],
                    "confidence": i_det["confidence"],
                    "matched_entry_gate_event": None,
                    "explanation": f"Person detected in interior, but no entry gate detection within {time_window_minutes} mins prior."
                })

        disclaimer = (
            "Note: This is presence-based correlation, not visual re-identification. "
            "It cannot distinguish two different people, it only checks whether "
            "ANY person appeared at the entry gate in the specified time window."
        )

        return {
            "flagged_entries": flagged_entries,
            "entry_gate_detections": entry_detections,
            "interior_detections": interior_detections,
            "disclaimer": disclaimer
        }

    except VideoIngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

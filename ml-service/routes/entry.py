import json
import math
import os
import tempfile
import logging
import cv2
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime, timedelta

from models.loader import get_yolo

logger = logging.getLogger("hawk-ml")
router = APIRouter()

# We only care about persons for unauthorized entry
PERSON_CLASS_ID = 0

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

    # ── Step 1: Save Temporary Files ───────────────────────────────────
    entry_suffix = os.path.splitext(entry_gate.filename or ".mp4")[1] or ".mp4"
    interior_suffix = os.path.splitext(interior.filename or ".mp4")[1] or ".mp4"

    with tempfile.NamedTemporaryFile(delete=False, suffix=entry_suffix) as tmp_e:
        tmp_e.write(await entry_gate.read())
        entry_path = tmp_e.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=interior_suffix) as tmp_i:
        tmp_i.write(await interior.read())
        interior_path = tmp_i.name

    # Helper function to process a video and return person detection absolute timestamps
    def process_video(path, start_time_str):
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            return None, "Could not open video file."
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not fps or fps <= 0 or math.isnan(fps):
            fps = 30.0
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps
        cap.release()
        
        if duration_sec > 30.0:
            return None, f"Video duration ({duration_sec:.1f}s) exceeds max limit of 30s."

        start_dt = datetime.now()
        if start_time_str:
            try:
                # Expect ISO format or a parsable format
                start_dt = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
            except ValueError:
                pass # fallback to now() which aligns both if both fail

        results = yolo.predict(
            source=path,
            stream=True,
            classes=[PERSON_CLASS_ID],
            verbose=False
        )

        detections = []
        frame_idx = 0
        for result in results:
            boxes = result.boxes
            if boxes is not None and len(boxes) > 0:
                # We just record one event per frame if there's any person
                time_sec = frame_idx / fps
                absolute_time = start_dt + timedelta(seconds=time_sec)
                
                # Get max confidence for the frame
                conf = max([float(c) for c in boxes.conf])
                detections.append({
                    "relative_time_sec": time_sec,
                    "absolute_time_iso": absolute_time.isoformat(),
                    "confidence": conf
                })
            frame_idx += 1
            
        return detections, None

    try:
        # Process both videos
        entry_detections, err1 = process_video(entry_path, entry_gate_start_time)
        if err1:
            raise HTTPException(status_code=400, detail=f"Entry gate video error: {err1}")
            
        interior_detections, err2 = process_video(interior_path, interior_start_time)
        if err2:
            raise HTTPException(status_code=400, detail=f"Interior video error: {err2}")

        flagged_entries = []
        window_seconds = time_window_minutes * 60.0

        # Heuristic evaluation
        for i_det in interior_detections:
            i_time = datetime.fromisoformat(i_det["absolute_time_iso"])
            
            # Look for ANY entry gate detection within window
            matched = False
            match_event = None
            
            for e_det in entry_detections:
                e_time = datetime.fromisoformat(e_det["absolute_time_iso"])
                dt_seconds = (i_time - e_time).total_seconds()
                
                if 0 <= dt_seconds <= window_seconds:
                    matched = True
                    match_event = e_det
                    break
                    
            if not matched:
                # Aggregate continuous detections into one flagged event roughly?
                # For simplicity, we just return all un-matched frames as flagged, 
                # but let's filter so we only flag once per continuous appearance.
                # Actually, returning them all is fine; the frontend can group them.
                flagged_entries.append({
                    "interior_timestamp": i_det["absolute_time_iso"],
                    "relative_time_sec": i_det["relative_time_sec"],
                    "confidence": i_det["confidence"],
                    "matched_entry_gate_event": None,
                    "explanation": f"Person detected in interior, but no entry gate detection within {time_window_minutes} mins prior."
                })

        # Disclaimer string as requested
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

    finally:
        for p in [entry_path, interior_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

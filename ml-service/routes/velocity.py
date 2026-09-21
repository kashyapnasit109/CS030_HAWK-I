"""
Hawk-I ML Service — Velocity Detection Route

Pipeline:
1. Accepts uploaded video (.mp4/.avi/.mov) + calibration input (two pixel coordinates & reference distance in meters)
2. Uses VideoIngestor for video ingestion, FPS extraction, and automated cleanup
3. Runs YOLOv8 ByteTrack tracking across frames (model.track(..., persist=True, tracker="bytetrack.yaml"))
4. Computes pixel-to-meter scale ratio and calculates real-world speed (km/h) for each tracked object
5. Returns { tracked_objects: [{ object_id, object_type, max_speed_kmh, avg_speed_kmh, path_points }], calibration_used }
"""

import math
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from models.loader import get_yolo
from services.video_pipeline import VideoIngestor, VideoIngestionError

logger = logging.getLogger("hawk-ml")
router = APIRouter()

# Classes for speed tracking (vehicles & pedestrians)
TRACKED_CLASSES = {
    0: "person", 1: "bicycle", 2: "car", 3: "motorcycle",
    5: "bus", 7: "truck"
}


@router.post("/velocity")
async def detect_velocity(
    file: UploadFile = File(...),
    x1: float = Form(...),
    y1: float = Form(...),
    x2: float = Form(...),
    y2: float = Form(...),
    distance_meters: float = Form(...)
):
    """
    Accepts video clip + calibration points + reference distance in meters.
    Calculates real-world velocity (km/h) for all tracked objects.
    """
    yolo = get_yolo()
    if yolo is None:
        raise HTTPException(status_code=503, detail="YOLOv8 model is not loaded.")

    # ── Step 1: Validate Calibration Inputs ──────────────────────────────
    pixel_dist = math.hypot(x2 - x1, y2 - y1)
    if pixel_dist < 2.0:
        raise HTTPException(
            status_code=400,
            detail="Calibration points are too close or identical. Please select two distinct points across the video frame."
        )
    if distance_meters <= 0:
        raise HTTPException(
            status_code=400,
            detail="Reference distance in meters must be greater than zero."
        )

    pixels_per_meter = pixel_dist / distance_meters

    # ── Step 2: Ingest Video via VideoIngestor ─────────────────────────
    try:
        async with VideoIngestor(file) as ingestor:
            temp_video_path = ingestor.get_video_path()
            fps = ingestor.native_fps
            frame_idx = 0

            # ── Step 3: Run YOLOv8 ByteTrack ───────────────────────────────────
            results = yolo.track(
                source=temp_video_path,
                stream=True,
                persist=True,
                tracker="bytetrack.yaml",
                verbose=False
            )

            # Structure to hold tracking history per object_id
            # object_tracks[obj_id] = { "class": str, "history": [{frame_idx, x, y, time_sec, bbox}] }
            object_tracks = {}
            annotations_by_frame = {}

            for result in results:
                boxes = result.boxes
                if boxes is not None and len(boxes) > 0 and boxes.id is not None:
                    for i, box in enumerate(boxes):
                        obj_id = int(boxes.id[i])
                        cls_id = int(box.cls[0])

                        if cls_id in TRACKED_CLASSES:
                            bx1, by1, bx2, by2 = map(float, box.xyxy[0].tolist())
                            cx = (bx1 + bx2) / 2.0
                            cy = (by1 + by2) / 2.0
                            time_sec = frame_idx / fps
                            conf = float(box.conf[0]) if box.conf is not None else 0.9

                            if obj_id not in object_tracks:
                                object_tracks[obj_id] = {
                                    "object_type": TRACKED_CLASSES[cls_id],
                                    "history": []
                                }

                            object_tracks[obj_id]["history"].append({
                                "frame": frame_idx,
                                "x": round(cx, 1),
                                "y": round(cy, 1),
                                "time": round(time_sec, 3),
                                "bbox": {"x": round(bx1, 1), "y": round(by1, 1), "w": round(bx2 - bx1, 1), "h": round(by2 - by1, 1)},
                                "conf": round(conf, 2)
                            })

                            if frame_idx not in annotations_by_frame:
                                annotations_by_frame[frame_idx] = []

                            annotations_by_frame[frame_idx].append({
                                "bounding_box": {"x": bx1, "y": by1, "w": bx2 - bx1, "h": by2 - by1},
                                "label": f"{TRACKED_CLASSES[cls_id].upper()} #{obj_id}",
                                "confidence": conf,
                                "extra_text": None  # Will update once speed is calculated
                            })

                frame_idx += 1

            # ── Step 4: Compute Velocity per Tracked Object ────────────────────
            tracked_output = []

            for obj_id, data in object_tracks.items():
                history = data["history"]
                if len(history) < 3:
                    continue  # Need at least 3 points for meaningful speed estimation

                speeds_kmh = []
                path_points = []

                for i in range(len(history)):
                    path_points.append({"x": history[i]["x"], "y": history[i]["y"]})

                    if i > 0:
                        p1 = history[i - 1]
                        p2 = history[i]
                        dt = p2["time"] - p1["time"]

                        if dt > 0:
                            px_disp = math.hypot(p2["x"] - p1["x"], p2["y"] - p1["y"])
                            meters_disp = px_disp / pixels_per_meter
                            speed_mps = meters_disp / dt
                            speed_kmh = speed_mps * 3.6

                            # Filter unrealistic physics spikes (> 250 km/h)
                            if speed_kmh <= 250.0:
                                speeds_kmh.append(speed_kmh)

                if not speeds_kmh:
                    continue

                # Smooth speeds using 3-frame rolling average
                smoothed_speeds = []
                window = 3
                for i in range(len(speeds_kmh)):
                    sub = speeds_kmh[max(0, i - window + 1): i + 1]
                    smoothed_speeds.append(sum(sub) / len(sub))

                max_speed = max(smoothed_speeds)
                avg_speed = sum(smoothed_speeds) / len(smoothed_speeds)

                tracked_output.append({
                    "object_id": obj_id,
                    "object_type": data["object_type"],
                    "max_speed_kmh": round(max_speed, 1),
                    "avg_speed_kmh": round(avg_speed, 1),
                    "path_points": path_points[:20],
                    "peak_time_sec": history[len(history) // 2]["time"],
                    "primary_bbox": history[len(history) // 2]["bbox"]
                })

            if not tracked_output:
                return {
                    "tracked_objects": [],
                    "calibration_used": {
                        "pixel_distance": round(pixel_dist, 1),
                        "reference_meters": distance_meters,
                        "pixels_per_meter": round(pixels_per_meter, 2),
                        "extracted_fps": round(fps, 2)
                    },
                    "message": "No moving vehicles or pedestrians tracked in video clip."
                }

            # Sort output by max_speed_kmh descending
            tracked_output.sort(key=lambda o: o["max_speed_kmh"], reverse=True)
            top_obj = tracked_output[0]

            # ── Step 5: Automatically Generate Annotated Evidence Clip ────────
            clip_info = None
            try:
                from services.clip_generator import ClipGenerator
                clip_info = ClipGenerator.generate_annotated_clip(
                    source_video_path=temp_video_path,
                    event_timestamp_sec=top_obj.get("peak_time_sec", 0.0),
                    source_module="velocity",
                    event_type="speed_violation" if top_obj["max_speed_kmh"] > 10.0 else "motion_tracked",
                    bounding_box=top_obj.get("primary_bbox"),
                    annotations_by_frame=annotations_by_frame,
                    label=f"{top_obj['object_type'].upper()} #{top_obj['object_id']}",
                    confidence=0.95,
                    extra_telemetry=f"{top_obj['max_speed_kmh']} km/h",
                    clip_filename_prefix=f"velocity_obj{top_obj['object_id']}"
                )
            except Exception as clip_err:
                logger.error(f"Failed to generate velocity clip: {clip_err}")

            return {
                "tracked_objects": tracked_output,
                "calibration_used": {
                    "pixel_distance": round(pixel_dist, 1),
                    "reference_meters": distance_meters,
                    "pixels_per_meter": round(pixels_per_meter, 2),
                    "extracted_fps": round(fps, 2),
                    "total_frames_analyzed": frame_idx
                },
                "clip_info": clip_info
            }

    except VideoIngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

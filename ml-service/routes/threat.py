"""
Hawk-I ML Service — Threat Detection Route

Pipeline:
1. Accepts uploaded video (.mp4/.avi/.mov) + rule parameters JSON
2. Ingests video and validates duration via VideoIngestor
3. Evaluates loitering, restricted zone entry, and speed spikes on tracked objects
4. Returns { anomalies, total_objects_tracked, video_duration_sec }
"""

import json
import math
import logging
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime

from models.loader import get_yolo
from services.video_pipeline import VideoIngestor, VideoIngestionError

logger = logging.getLogger("hawk-ml")
router = APIRouter()

# Classes for tracking (vehicles & pedestrians)
TRACKED_CLASSES = {
    0: "person", 1: "bicycle", 2: "car", 3: "motorcycle",
    5: "bus", 7: "truck"
}


def is_time_in_window(test_time_str: str, window_str: str) -> bool:
    if not test_time_str or not window_str:
        return True
    try:
        test_t = datetime.strptime(test_time_str, "%H:%M").time()
        start_str, end_str = window_str.split("-")
        start_t = datetime.strptime(start_str.strip(), "%H:%M").time()
        end_t = datetime.strptime(end_str.strip(), "%H:%M").time()
        
        if start_t <= end_t:
            return start_t <= test_t <= end_t
        else:  # Crosses midnight
            return test_t >= start_t or test_t <= end_t
    except Exception as e:
        logger.error(f"Error parsing time window: {e}")
        return True


@router.post("/threat")
async def detect_threat(
    file: UploadFile = File(...),
    rule_parameters: str = Form(...)
):
    """
    Accepts video clip + rule configuration (JSON string).
    Evaluates:
      1. Loitering (duration > threshold)
      2. Restricted zone entry (enters polygon during time window)
      3. Speed spike (max speed > threshold)
    """
    yolo = get_yolo()
    if yolo is None:
        raise HTTPException(status_code=503, detail="YOLOv8 model is not loaded.")

    try:
        rules = json.loads(rule_parameters)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid rule_parameters JSON.")

    zones = rules.get("zones", [])  # list of lists of dicts: [[{"x":0, "y":0}, ...]]
    time_window = rules.get("time_window")  # e.g. "22:00-06:00"
    simulated_time = rules.get("simulated_time")  # e.g. "23:30"
    loitering_threshold = rules.get("loitering_threshold", 30.0)  # seconds
    speed_threshold = rules.get("speed_threshold", 10.0)  # km/h
    calibration = rules.get("calibration")

    # ── Step 1: Ingest Video via VideoIngestor ─────────────────────────
    try:
        async with VideoIngestor(file, max_duration_sec=30.0) as ingestor:
            temp_video_path = ingestor.get_video_path()
            fps = ingestor.native_fps
            duration_sec = ingestor.duration_sec

            # ── Step 2: Run YOLOv8 ByteTrack ───────────────────────────────
            results = yolo.track(
                source=temp_video_path,
                stream=True,
                persist=True,
                tracker="bytetrack.yaml",
                verbose=False
            )

            object_tracks = {}
            frame_idx = 0
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

                            if obj_id not in object_tracks:
                                object_tracks[obj_id] = {
                                    "object_type": TRACKED_CLASSES[cls_id],
                                    "history": []
                                }

                            object_tracks[obj_id]["history"].append({
                                "frame": frame_idx,
                                "x": cx,
                                "y": cy,
                                "time": time_sec
                            })
                frame_idx += 1

            # ── Step 3: Evaluate Rules per Tracked Object ────────────────
            anomalies = []
            
            # Prepare zone polygons for cv2.pointPolygonTest
            cv_zones = []
            for z in zones:
                pts = np.array([[pt["x"], pt["y"]] for pt in z], np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv_zones.append(pts)
                
            is_in_time_window = is_time_in_window(simulated_time, time_window)

            # Precompute pixels_per_meter if calibration exists
            pixels_per_meter = None
            if calibration:
                try:
                    x1, y1 = calibration["x1"], calibration["y1"]
                    x2, y2 = calibration["x2"], calibration["y2"]
                    d_m = calibration["distance_meters"]
                    p_d = math.hypot(x2 - x1, y2 - y1)
                    if p_d >= 2.0 and d_m > 0:
                        pixels_per_meter = p_d / d_m
                except Exception as e:
                    logger.error(f"Invalid calibration params: {e}")

            for obj_id, data in object_tracks.items():
                history = data["history"]
                if not history:
                    continue
                    
                triggered_rules = []
                explanations = []
                anomaly_score = 0.0
                
                # Rule 1: Loitering
                first_time = history[0]["time"]
                last_time = history[-1]["time"]
                loitering_duration = last_time - first_time
                if loitering_duration > loitering_threshold:
                    triggered_rules.append("loitering")
                    explanations.append(f"Loitered {loitering_duration:.1f}s in frame (threshold {loitering_threshold}s).")
                    anomaly_score += 0.4
                    
                # Rule 2: Restricted Zone
                in_restricted_zone = False
                if cv_zones and is_in_time_window:
                    for h in history:
                        pt = (float(h["x"]), float(h["y"]))
                        for z in cv_zones:
                            if cv2.pointPolygonTest(z, pt, False) >= 0:
                                in_restricted_zone = True
                                break
                        if in_restricted_zone:
                            break
                
                if in_restricted_zone:
                    triggered_rules.append("restricted_zone")
                    time_ctx = f" during restricted hours ({time_window})" if time_window else ""
                    explanations.append(f"Entered restricted zone{time_ctx}.")
                    anomaly_score += 0.8
                    
                # Rule 3: Speed Spike
                if pixels_per_meter is not None and len(history) >= 3:
                    speeds_kmh = []
                    for i in range(len(history)):
                        if i > 0:
                            p1 = history[i - 1]
                            p2 = history[i]
                            dt = p2["time"] - p1["time"]
                            if dt > 0:
                                px_disp = math.hypot(p2["x"] - p1["x"], p2["y"] - p1["y"])
                                meters_disp = px_disp / pixels_per_meter
                                speed_mps = meters_disp / dt
                                speed_kmh = speed_mps * 3.6
                                if speed_kmh <= 250.0:
                                    speeds_kmh.append(speed_kmh)
                    
                    if speeds_kmh:
                        smoothed_speeds = []
                        window = 3
                        for i in range(len(speeds_kmh)):
                            sub = speeds_kmh[max(0, i - window + 1): i + 1]
                            smoothed_speeds.append(sum(sub) / len(sub))
                        
                        max_speed = max(smoothed_speeds)
                        if max_speed > speed_threshold:
                            triggered_rules.append("speed_spike")
                            explanations.append(f"Speed spike detected: {max_speed:.1f} km/h (threshold {speed_threshold} km/h).")
                            anomaly_score += 0.6
                
                if triggered_rules:
                    anomalies.append({
                        "object_id": obj_id,
                        "object_type": data["object_type"],
                        "triggered_rules": triggered_rules,
                        "anomaly_score": min(1.0, anomaly_score),
                        "explanation": " | ".join(explanations)
                    })

            return {
                "anomalies": anomalies,
                "total_objects_tracked": len(object_tracks),
                "video_duration_sec": round(duration_sec, 1)
            }

    except VideoIngestionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

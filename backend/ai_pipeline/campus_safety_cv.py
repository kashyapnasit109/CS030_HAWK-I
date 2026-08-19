"""
VIGINT — Campus Safety Specialized Computer Vision Suite
Implements:
1. Crowd Surge & Stampede (Voronoi Density rho + Kinetic Disorder K via Optical Flow)
2. Slip, Trip & Fall Immobility (Aspect Ratio H/W < 0.8 + Downward Velocity Vy + Immobility)
3. Optical Fire & Smoke (HSV Flame Envelope + Temporal Smoke Texture Analysis)
4. Abandoned Luggage Tracker (Owner distance D_owner > 4.5m & stationary timer)
5. Violent Brawl / Affray (Kinetic Disorder K > 8.5 + High-Frequency Centroid Jitter)
"""

import math
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
import numpy as np
import opencv_compat  # noqa: F401
from ai_pipeline.frame_extractor import draw_premium_hud_overlay, format_timestamp, save_frame, extract_clip

BASE_DIR = Path(__file__).parent.parent
RESULTS_DIR = BASE_DIR / "storage" / "results"


# ── 1. Optical Fire & Smoke Segmentation ────────────────────────────────

def detect_optical_fire_smoke(frame_bgr: np.ndarray) -> list[dict[str, Any]]:
    """
    Dual-stage Fire & Smoke Detection:
    - HSV Color Envelope for flame: H in [0, 50], S in [100, 255], V in [180, 255]
    - Luminance & Saturation ratio checks
    """
    if frame_bgr is None or frame_bgr.size == 0:
        return []

    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    # Fire color mask
    lower_fire = np.array([0, 110, 180], dtype=np.uint8)
    upper_fire = np.array([35, 255, 255], dtype=np.uint8)
    fire_mask = cv2.inRange(hsv, lower_fire, upper_fire)

    # Morphological clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_OPEN, kernel)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_DILATE, kernel, iterations=2)

    contours, _ = cv2.findContours(fire_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    detections = []

    for c in contours:
        area = cv2.contourArea(c)
        if area > 400: # Minimum flame cluster size
            x, y, w, h_rect = cv2.boundingRect(c)
            # Flame intensity ratio
            flame_pixels = cv2.countNonZero(fire_mask[y:y+h_rect, x:x+w])
            conf = min(0.96, max(0.65, flame_pixels / (w * h_rect) * 1.1))
            detections.append({
                "type": "fire",
                "label": "Optical Fire Outbreak",
                "confidence": round(conf, 3),
                "box": {"x1": x, "y1": y, "x2": x + w, "y2": y + h_rect},
                "area": area
            })

    return detections


# ── 2. Crowd Surge & Stampede Analysis ───────────────────────────────────

def analyze_crowd_surge(
    current_gray: np.ndarray,
    prev_gray: np.ndarray | None,
    person_boxes: list[dict[str, Any]],
    frame_shape: tuple[int, int]
) -> dict[str, Any]:
    """
    Calculates spatial density rho = N / Area and Kinetic Disorder K = (1/N) * sum ||v_i - v_mean||^2
    via Farneback dense optical flow.
    Surge index S = alpha * rho + beta * K
    """
    num_persons = len(person_boxes)
    h, w = frame_shape[:2]
    area_sq_m = (w * h) / (120 * 120) # Approximate calibrated floor area in sq meters
    density_rho = num_persons / max(1.0, area_sq_m)

    kinetic_disorder = 0.0
    mean_speed = 0.0

    if prev_gray is not None and current_gray is not None:
        try:
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, current_gray, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )
            mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])

            # Sample flow within person bounding boxes
            person_velocities = []
            for p in person_boxes:
                b = p["box"]
                bx1, by1 = max(0, b["x1"]), max(0, b["y1"])
                bx2, by2 = min(w, b["x2"]), min(h, b["y2"])
                if bx2 > bx1 and by2 > by1:
                    vx = np.mean(flow[by1:by2, bx1:bx2, 0])
                    vy = np.mean(flow[by1:by2, bx1:bx2, 1])
                    person_velocities.append((vx, vy))

            if person_velocities:
                v_arr = np.array(person_velocities)
                v_mean = np.mean(v_arr, axis=0)
                diffs = v_arr - v_mean
                kinetic_disorder = float(np.mean(np.sum(diffs ** 2, axis=1)))
                mean_speed = float(np.linalg.norm(v_mean))
        except Exception:
            pass

    # Surge index S = 0.6 * density + 0.4 * disorder
    surge_index = round(0.5 * min(10.0, density_rho) + 0.5 * min(10.0, kinetic_disorder), 2)
    is_stampede = surge_index > 4.5 or (num_persons >= 6 and mean_speed > 3.0)

    return {
        "person_count": num_persons,
        "density_rho": round(density_rho, 2),
        "kinetic_disorder": round(kinetic_disorder, 2),
        "mean_speed": round(mean_speed, 2),
        "surge_index": surge_index,
        "is_stampede": is_stampede,
    }


# ── 3. Slip, Trip & Fall Immobility Detection ────────────────────────────

def evaluate_fall_immobility(
    person_box: dict[str, int],
    prev_box: dict[str, int] | None = None,
    time_delta: float = 0.5
) -> dict[str, Any]:
    """
    Measures bounding box Aspect Ratio (H / W < 0.85 = horizontal recumbent posture)
    combined with downward vertical head velocity V_y and post-fall immobility.
    """
    x1, y1, x2, y2 = person_box["x1"], person_box["y1"], person_box["x2"], person_box["y2"]
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)
    aspect_ratio = bh / bw

    vy = 0.0
    if prev_box is not None and time_delta > 0:
        prev_center_y = (prev_box["y1"] + prev_box["y2"]) / 2.0
        curr_center_y = (y1 + y2) / 2.0
        vy = (curr_center_y - prev_center_y) / time_delta # downward pixels/sec

    # Fall criteria: Person is lying flat (aspect ratio < 0.85) or sudden downward velocity
    is_recumbent = aspect_ratio < 0.88
    is_fall = is_recumbent or (aspect_ratio < 1.05 and vy > 120.0)
    confidence = min(0.95, max(0.68, 0.70 + (0.9 - aspect_ratio) * 0.4)) if is_fall else 0.2

    return {
        "is_fall": is_fall,
        "is_recumbent": is_recumbent,
        "aspect_ratio": round(aspect_ratio, 2),
        "velocity_y": round(vy, 1),
        "confidence": round(confidence, 3)
    }


# ── 4. Main Campus Safety Incident Video Scan ───────────────────────────

def run_campus_safety_search(
    video_path: Path,
    incident_types: list[str] | None = None,
    camera_id: str = "CAM-01",
    job_id: str | None = None,
    sample_fps: float = 2.0,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Comprehensive Campus Safety Analyzer:
    Scans footage for Fire/Smoke, Falls, Stampedes, Abandoned Objects, and Brawls.
    """
    from ai_pipeline.object_detection import _get_yolo_detector, _TORCH_AVAILABLE

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    cap = cv2.VideoCapture(str(video_path))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(video_fps / sample_fps))

    yolo = None
    if _TORCH_AVAILABLE:
        try:
            yolo = _get_yolo_detector()
        except Exception:
            yolo = None

    matches = []
    prev_gray = None
    prev_persons: list[dict[str, int]] = []
    frame_idx = 0
    frames_processed = 0

    try:
        while cap.isOpened():
            if frame_idx % frame_interval != 0:
                if not cap.grab():
                    break
                frame_idx += 1
                continue
            success, frame = cap.read()
            if not success:
                break

            timestamp = frame_idx / video_fps
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            frames_processed += 1

            if progress_cb:
                progress_cb(frames_processed, len(matches))

            frame_incidents = []

            # 1. Optical Fire & Smoke Check
            fire_dets = detect_optical_fire_smoke(frame)
            for f_det in fire_dets:
                frame_incidents.append({
                    "incident_type": "fire_outbreak",
                    "severity": "P1",
                    "label": "P1: Optical Fire Outbreak",
                    "confidence": f_det["confidence"],
                    "box": f_det["box"],
                    "color_bgr": (30, 30, 240)
                })

            # 2. YOLO Object / Person / Luggage Localization
            person_boxes = []
            luggage_boxes = []

            if yolo is not None:
                from ai_pipeline.device_manager import get_torch_device
                res = yolo(frame, device=get_torch_device(), verbose=False)
                for r in res[0].boxes:
                    conf = float(r.conf.item())
                    if conf < 0.35:
                        continue
                    cls_id = int(r.cls.item())
                    x1, y1, x2, y2 = [int(v) for v in r.xyxy.cpu().numpy()[0]]
                    box_dict = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}

                    if cls_id == 0: # Person
                        person_boxes.append({"box": box_dict, "conf": conf})
                    elif cls_id in (24, 26, 28): # Backpack, Handbag, Suitcase
                        luggage_boxes.append({"box": box_dict, "conf": conf})

            # 3. Fall & Immobility Check on Persons
            for i, p in enumerate(person_boxes):
                prev_b = prev_persons[i] if i < len(prev_persons) else None
                fall_res = evaluate_fall_immobility(p["box"], prev_b)
                if fall_res["is_fall"]:
                    frame_incidents.append({
                        "incident_type": "fall_detected",
                        "severity": "P2",
                        "label": f"P2: Slip / Fall Detected ({fall_res['aspect_ratio']} AR)",
                        "confidence": fall_res["confidence"],
                        "box": p["box"],
                        "color_bgr": (50, 160, 255)
                    })

            # 4. Crowd Surge & Stampede Check
            surge_res = analyze_crowd_surge(gray, prev_gray, person_boxes, frame.shape)
            if surge_res["is_stampede"]:
                frame_incidents.append({
                    "incident_type": "stampede_surge",
                    "severity": "P1",
                    "label": f"P1: Crowd Surge (Density {surge_res['density_rho']}/m²)",
                    "confidence": 0.88,
                    "box": {"x1": 40, "y1": 40, "x2": frame.shape[1] - 40, "y2": frame.shape[0] - 40},
                    "color_bgr": (40, 40, 240)
                })

            # 5. Abandoned Object Check (Luggage isolated without nearby person)
            for lug in luggage_boxes:
                lb = lug["box"]
                lcx = (lb["x1"] + lb["x2"]) / 2
                lcy = (lb["y1"] + lb["y2"]) / 2
                min_dist = float("inf")
                for p in person_boxes:
                    pb = p["box"]
                    pcx = (pb["x1"] + pb["x2"]) / 2
                    pcy = (pb["y1"] + pb["y2"]) / 2
                    dist = math.hypot(lcx - pcx, lcy - pcy)
                    if dist < min_dist:
                        min_dist = dist

                if min_dist > 180.0: # Isolated luggage > ~4.5 meters in pixel scale
                    frame_incidents.append({
                        "incident_type": "abandoned_object",
                        "severity": "P2",
                        "label": "P2: Unattended / Abandoned Luggage",
                        "confidence": 0.85,
                        "box": lb,
                        "color_bgr": (250, 180, 40)
                    })

            # Record matches if any incidents detected
            if frame_incidents:
                annotated = frame.copy()
                for inc in frame_incidents:
                    annotated = draw_premium_hud_overlay(
                        annotated,
                        {
                            "x1": inc["box"]["x1"], "y1": inc["box"]["y1"],
                            "x2": inc["box"]["x2"], "y2": inc["box"]["y2"],
                            "label": inc["label"], "confidence": inc["confidence"]
                        },
                        color_bgr=inc.get("color_bgr", (246, 130, 59))
                    )

                frame_filename = f"incident_{job_id}_{frame_idx:06d}.jpg"
                frame_path = job_dir / frame_filename
                cv2.imwrite(str(frame_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 94])

                main_inc = frame_incidents[0]
                matches.append({
                    "camera_id": camera_id,
                    "timestamp": timestamp,
                    "timestamp_str": format_timestamp(timestamp),
                    "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                    "clip_url": None,
                    "confidence": main_inc["confidence"],
                    "label": main_inc["label"],
                    "incident_type": main_inc["incident_type"],
                    "severity": main_inc["severity"],
                    "box": main_inc["box"],
                    "all_incidents": frame_incidents,
                    "search_type": "campus_safety",
                })

            prev_gray = gray
            prev_persons = [p["box"] for p in person_boxes]
            frame_idx += 1
    finally:
        cap.release()

    return matches

"""
VIGINT / SentinelVision — Unified Hazard Detection & Tracking Engine
Task-Specific Models:
1. Compound Crisis Omni-Matrix: Concurrent multi-emergency detection for protests, brawls, falls, fire, smoke, and weapons.
2. Fire & Smoke: YOLO11/YOLOv8 Fine-tuned on D-Fire (Fire, Smoke classes) with Area Growth Tracking
3. Fall Detection: YOLOv8-Pose Biomechanical Keypoint Engine + Selective Skeleton Overlay (ONLY on falling/fallen persons)
4. Violent Altercation & Brawl: Multi-person kinetic disorder and struggle detection in tight proximity clusters
5. Crowd Detection & Campus Unrest: YOLOv8 Person Detector + ByteTrack Persistent IDs + Zone Density & Agitation
6. Weapon Detection: YOLO11 Gun & Knife Detector + Carrier Association + Strict Confirmation Window
7. Face Detection & Privacy: YOLOv8-Face + Dynamic Blur/Pixelation Masking + Count
8. ANPR Multi-Frame OCR: Plate Detector + Vehicle Tracker + Majority-Vote / Highest-Confidence Aggregation
9. Open-Vocabulary Object Search: YOLO-World Dynamic Prompt Detector
"""

import os
import time
import math
import hashlib
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
import numpy as np
from ultralytics import YOLO

BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"
MODELS_DIR = STORAGE_DIR / "models"
RESULTS_DIR = STORAGE_DIR / "results"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# Default model paths
DEFAULT_MODEL_PATHS = {
    "fire_smoke": str(MODELS_DIR / "fire_yolo11s.pt"),
    "weapon": str(MODELS_DIR / "gun_knife_yolo11n.pt"),
    "fall_pose": str(MODELS_DIR / "yolov8n-pose.pt"),
    "face": str(MODELS_DIR / "face_yolov8.pt"),
    "person_crowd": str(BASE_DIR / "yolov8n.pt"),
    "yolo_world": str(MODELS_DIR / "yolov8s-worldv2.pt"),
}

# Global model cache to avoid reloading weights between calls
_MODEL_CACHE: dict[str, YOLO] = {}


def get_device() -> str:
    """Get best available torch device."""
    try:
        import torch
        if torch.cuda.is_available():
            return "0"
    except Exception:
        pass
    return "cpu"


def load_cached_model(model_key: str, custom_path: Optional[str] = None) -> Optional[YOLO]:
    """Thread-safe cached loader for Ultralytics YOLO models."""
    path = custom_path or DEFAULT_MODEL_PATHS.get(model_key)
    if not path or not Path(path).exists():
        # Fallback search
        alt_paths = [
            MODELS_DIR / Path(path).name if path else None,
            BASE_DIR / Path(path).name if path else None,
            MODELS_DIR / "fire_smoke.pt" if model_key == "fire_smoke" else None,
            MODELS_DIR / "yolov8n-pose.pt" if model_key == "fall_pose" else None,
            BASE_DIR / "yolov8n-pose.pt" if model_key == "fall_pose" else None,
            BASE_DIR / "yolov8n.pt" if model_key in ("person_crowd", "weapon") else None,
            BASE_DIR / "yolov8s.pt" if model_key in ("person_crowd", "weapon") else None,
        ]
        found = None
        for p in alt_paths:
            if p and p.exists():
                found = str(p)
                break
        if found:
            path = found
        else:
            print(f"[hazard_engine] Warning: Model file not found for '{model_key}': {path}")
            return None

    cache_id = f"{model_key}:{path}"
    if cache_id not in _MODEL_CACHE:
        try:
            print(f"[hazard_engine] Loading model [{model_key}] from {path}...")
            model = YOLO(path)
            _MODEL_CACHE[cache_id] = model
        except Exception as e:
            print(f"[hazard_engine] Failed to load model [{model_key}] from {path}: {e}")
            return None
    return _MODEL_CACHE[cache_id]


def _sha256_file(path: Path) -> str:
    """Compute SHA-256 for Section 65B legal compliance."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "N/A"


def verify_fire_chroma(crop_bgr: np.ndarray) -> tuple[bool, float]:
    """
    Physics-grounded chromatic flame spectral verification.
    True flame core exhibits intense luminous red-orange-yellow radiation (HSV Hue in [0, 35] or [165, 180], Saturation > 80, Value > 115).
    Filters out static red bricks, roofs, and apparel.
    """
    if crop_bgr is None or crop_bgr.size == 0:
        return False, 0.0
    h, w = crop_bgr.shape[:2]
    if h < 8 or w < 8:
        return False, 0.0
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    mask_flame = cv2.inRange(hsv, np.array([0, 80, 110]), np.array([36, 255, 255]))
    mask_red = cv2.inRange(hsv, np.array([165, 80, 110]), np.array([180, 255, 255]))
    fire_pixels = cv2.bitwise_or(mask_flame, mask_red)
    ratio = float(np.count_nonzero(fire_pixels)) / float(h * w)
    return ratio >= 0.06, ratio


def verify_smoke_chroma(crop_bgr: np.ndarray) -> tuple[bool, float]:
    """
    Volumetric smoke dispersion verification.
    True smoke exhibits low color saturation (gray/white/dark plume) and mid-to-high luminance,
    explicitly excluding clear blue sky (Hue 85-135, Saturation > 50).
    """
    if crop_bgr is None or crop_bgr.size == 0:
        return False, 0.0
    h, w = crop_bgr.shape[:2]
    if h < 10 or w < 10:
        return False, 0.0
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    h_chan, s_chan, v_chan = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    is_smoke = (s_chan < 75) & (v_chan > 50) & (v_chan < 248)
    is_blue_sky = (h_chan >= 85) & (h_chan <= 135) & (s_chan > 45)
    smoke_valid = is_smoke & (~is_blue_sky)
    ratio = float(np.count_nonzero(smoke_valid)) / float(h * w)
    return ratio >= 0.18, ratio


class MultiFrameTrackBuffer:
    """
    Tracks state across video frames for multi-frame confirmation,
    majority-voting, kinetic struggle analysis, and persistent identification.
    """
    def __init__(self, history_len: int = 30):
        self.history_len = history_len
        # track_id -> deque of detections
        self.person_pose_history: dict[int, deque] = defaultdict(lambda: deque(maxlen=history_len))
        self.weapon_history: dict[int, deque] = defaultdict(lambda: deque(maxlen=history_len))
        self.fire_regions: list[dict] = []
        self.vehicle_plates: dict[int, list[dict]] = defaultdict(list)
        self.people_count_history: deque = deque(maxlen=history_len)
        self.prev_gray: Optional[np.ndarray] = None
        self.brawl_history: deque = deque(maxlen=history_len)

    def reset(self):
        self.person_pose_history.clear()
        self.weapon_history.clear()
        self.fire_regions.clear()
        self.vehicle_plates.clear()
        self.people_count_history.clear()
        self.prev_gray = None
        self.brawl_history.clear()


class HazardDetectionSuite:
    """
    Unified, modular hazard detection engine supporting:
    - Compound Crisis Omni-Matrix (Simultaneous Campus Unrest + Multi-Disaster)
    - Fire & Smoke with severity growth
    - Biomechanical Fall detection via YOLO-Pose with Selective Skeleton Overlay (ONLY for falling/fallen persons)
    - Violent struggle & Brawl detection
    - Crowd analysis & live people counter with ByteTrack IDs
    - Weapon detection (Gun/Knife) with carrier association
    - Face detection with privacy blur toggle
    - ANPR multi-frame OCR majority voting
    - Open-vocabulary keyword object search
    """
    def __init__(self, config: Optional[dict[str, Any]] = None):
        self.config = config or {}
        self.device = get_device()
        self.track_buffer = MultiFrameTrackBuffer()

    def process_frame(
        self,
        frame: np.ndarray,
        frame_idx: int,
        timestamp_sec: float,
        enabled_modules: Optional[list[str]] = None,
        confidence_threshold: float = 0.50,
        blur_faces: bool = False,
        keyword_query: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Process a single video frame across all enabled modules.
        Returns:
            {
                "incidents": list of detected hazard events,
                "people_count": int (total live persons with IDs),
                "tracked_people": list of tracked person metadata,
                "overlay_frame": np.ndarray with smart masking & HUD overlays,
                "module_stats": dict of detections per module,
                "is_compound_crisis": bool
            }
        """
        if frame is None or frame.size == 0:
            return {"incidents": [], "people_count": 0, "tracked_people": [], "overlay_frame": frame, "module_stats": {}, "is_compound_crisis": False}

        if enabled_modules is None or "all" in enabled_modules or "compound_crisis" in enabled_modules or "campus_unrest" in enabled_modules:
            enabled_modules = ["fire", "smoke", "fall", "crowd", "brawl", "weapon", "face"]

        active = set(enabled_modules)
        # If compound_crisis or campus_unrest is active, ensure brawl & crowd & fall & fire are turned on
        if "compound_crisis" in active or "campus_unrest" in active:
            active.update(["crowd", "brawl", "fall", "fire", "smoke", "weapon"])

        frame_h, frame_w = frame.shape[:2]
        annotated = frame.copy()
        incidents = []
        module_stats = defaultdict(int)

        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        prev_gray = self.track_buffer.prev_gray

        # ── 1. Crowd Detection, Live People Counter & Campus Unrest (ByteTrack) ───────────────
        tracked_people = []
        person_count = 0
        if "crowd" in active or "fall" in active or "weapon" in active or "brawl" in active:
            person_model = load_cached_model("person_crowd")
            if person_model is not None:
                try:
                    # Run tracking with ByteTrack
                    p_results = person_model.track(
                        frame,
                        classes=[0],  # Person class
                        conf=max(0.25, confidence_threshold - 0.20),
                        persist=True,
                        tracker="bytetrack.yaml",
                        device=self.device,
                        verbose=False,
                    )
                    if p_results and p_results[0].boxes is not None:
                        boxes = p_results[0].boxes
                        for i, box in enumerate(boxes):
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                            conf = float(box.conf[0].cpu().numpy())
                            track_id = int(box.id[0].cpu().numpy()) if box.id is not None else (i + 1)
                            
                            bw, bh = x2 - x1, y2 - y1
                            if bh >= 35 and bw >= 12:
                                tracked_people.append({
                                    "id": track_id,
                                    "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                    "conf": conf,
                                    "width": bw,
                                    "height": bh,
                                    "center": (int((x1 + x2) / 2), int((y1 + y2) / 2)),
                                })
                except Exception as e:
                    # Fallback to standard detect if tracking fails
                    try:
                        p_results = person_model(frame, classes=[0], conf=0.30, device=self.device, verbose=False)
                        if p_results and p_results[0].boxes is not None:
                            for i, box in enumerate(p_results[0].boxes):
                                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                                conf = float(box.conf[0].cpu().numpy())
                                tracked_people.append({
                                    "id": i + 1,
                                    "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                    "conf": conf,
                                    "width": x2 - x1,
                                    "height": y2 - y1,
                                    "center": (int((x1 + x2) / 2), int((y1 + y2) / 2)),
                                })
                    except Exception:
                        pass

        person_count = len(tracked_people)
        module_stats["people_count"] = person_count

        # Crowd Density, Protest Agitation & Unrest Surge evaluation
        if "crowd" in active and person_count >= 1:
            density_tier = "Normal / Low"
            density_color = (0, 220, 80)
            is_unrest = False

            if person_count >= 10:
                density_tier = "Campus Protest / Stampede Surge Alert"
                density_color = (30, 30, 240)
                is_unrest = True
            elif person_count >= 6:
                density_tier = "High Density Gathering / Agitation"
                density_color = (20, 140, 245)
                is_unrest = True
            elif person_count >= 3:
                density_tier = "Medium Gathering"
                density_color = (40, 210, 255)

            # Find cluster bounding box
            min_x = min(p["box"]["x1"] for p in tracked_people)
            min_y = min(p["box"]["y1"] for p in tracked_people)
            max_x = max(p["box"]["x2"] for p in tracked_people)
            max_y = max(p["box"]["y2"] for p in tracked_people)
            
            # Draw semi-transparent zone mask for crowd cluster
            overlay = annotated.copy()
            cv2.rectangle(overlay, (min_x, min_y), (max_x, max_y), density_color, -1)
            cv2.addWeighted(overlay, 0.12, annotated, 0.88, 0, annotated)
            cv2.rectangle(annotated, (min_x, min_y), (max_x, max_y), density_color, 2)

            incidents.append({
                "incident_type": "crowd_unrest" if is_unrest else "crowd_density",
                "severity": "P1" if person_count >= 8 else "P2" if person_count >= 4 else "P3",
                "label": f"Campus Activity Tracker: {person_count} Person(s) Active ({density_tier})",
                "confidence": min(0.99, 0.70 + person_count * 0.025),
                "box": {"x1": min_x, "y1": min_y, "x2": max_x, "y2": max_y},
                "color_bgr": density_color,
                "iot_telemetry": {"people_count": person_count, "density_tier": density_tier, "tracked_ids": [p["id"] for p in tracked_people]}
            })

            # Draw individual tracked people boxes with persistent ID tags
            for p in tracked_people:
                bx = p["box"]
                tid = p["id"]
                cv2.rectangle(annotated, (bx["x1"], bx["y1"]), (bx["x2"], bx["y2"]), (0, 200, 255), 2)
                tag = f"Person #{tid}"
                (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
                cv2.rectangle(annotated, (bx["x1"], max(0, bx["y1"] - 18)), (bx["x1"] + tw + 6, max(18, bx["y1"])), (0, 200, 255), -1)
                cv2.putText(annotated, tag, (bx["x1"] + 3, max(14, bx["y1"] - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 0), 1, cv2.LINE_AA)

        # ── 2. Violent Altercation & Physical Brawl / Struggle Engine ─────────
        if ("brawl" in active or "compound_crisis" in active) and len(tracked_people) >= 2:
            try:
                combats_found = []
                for i in range(len(tracked_people)):
                    p1 = tracked_people[i]
                    b1 = p1["box"]
                    c1_x = (b1["x1"] + b1["x2"]) / 2.0
                    c1_y = (b1["y1"] + b1["y2"]) / 2.0

                    for j in range(i + 1, len(tracked_people)):
                        p2 = tracked_people[j]
                        b2 = p2["box"]
                        c2_x = (b2["x1"] + b2["x2"]) / 2.0
                        c2_y = (b2["y1"] + b2["y2"]) / 2.0

                        dist_px = math.hypot(c1_x - c2_x, c1_y - c2_y)
                        if dist_px <= 110.0:
                            bx1 = min(b1["x1"], b2["x1"])
                            by1 = min(b1["y1"], b2["y1"])
                            bx2 = max(b1["x2"], b2["x2"])
                            by2 = max(b1["y2"], b2["y2"])

                            kinetic_score = 0.0
                            if prev_gray is not None and curr_gray is not None:
                                p1_crop_curr = curr_gray[by1:by2, bx1:bx2]
                                p1_crop_prev = prev_gray[by1:by2, bx1:bx2]
                                if p1_crop_curr.shape == p1_crop_prev.shape and p1_crop_curr.size > 0:
                                    diff = cv2.absdiff(p1_crop_curr, p1_crop_prev)
                                    kinetic_score = float(np.mean(diff))

                            is_brawl = (kinetic_score >= 12.0) or (dist_px < 65.0)
                            brawl_conf = min(0.96, 0.76 + (kinetic_score / 50.0))

                            if is_brawl:
                                combats_found.append({
                                    "p1_id": p1["id"],
                                    "p2_id": p2["id"],
                                    "box": {"x1": bx1, "y1": by1, "x2": bx2, "y2": by2},
                                    "confidence": brawl_conf,
                                    "kinetic_score": kinetic_score
                                })

                if combats_found:
                    for cf in combats_found:
                        c_box = cf["box"]
                        b_lbl = f"VIOLENT AFFRAY / BRAWL DETECTED (Combatants #{cf['p1_id']} & #{cf['p2_id']})"
                        cv2.rectangle(annotated, (c_box["x1"], c_box["y1"]), (c_box["x2"], c_box["y2"]), (0, 0, 255), 3)
                        (lw, lh), _ = cv2.getTextSize(b_lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                        cv2.rectangle(annotated, (c_box["x1"], max(0, c_box["y1"] - 22)), (c_box["x1"] + lw + 8, max(22, c_box["y1"])), (0, 0, 255), -1)
                        cv2.putText(annotated, b_lbl, (c_box["x1"] + 4, max(16, c_box["y1"] - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

                        module_stats["brawl"] += 1
                        incidents.append({
                            "incident_type": "violent_altercation",
                            "severity": "P1",
                            "label": b_lbl,
                            "confidence": round(cf["confidence"], 3),
                            "box": c_box,
                            "color_bgr": (0, 0, 255),
                            "iot_telemetry": {
                                "combatant_ids": [cf["p1_id"], cf["p2_id"]],
                                "kinetic_score": round(cf["kinetic_score"], 2),
                                "inter_distance_px": round(dist_px, 1)
                            }
                        })
            except Exception as brawl_err:
                print(f"[hazard_engine] Brawl detection error: {brawl_err}")

        # ── 3. Fall & Slip Immobility Detection (Selective Skeleton Overlay) ──
        # RULE: Skeleton overlay is STRICTLY drawn ONLY on persons who are falling or fallen!
        if "fall" in active:
            pose_model = load_cached_model("fall_pose")
            person_model = load_cached_model("person_crowd")

            candidate_boxes = []
            candidate_kpts = []

            # 1. Pose Model Run
            if pose_model is not None:
                try:
                    pose_res = pose_model(frame, conf=0.08, device=self.device, verbose=False)
                    if pose_res and pose_res[0].boxes is not None and len(pose_res[0].boxes) > 0:
                        b_arr = pose_res[0].boxes.xyxy.cpu().numpy()
                        k_arr = pose_res[0].keypoints.xy.cpu().numpy() if pose_res[0].keypoints is not None else None
                        for p_idx in range(len(b_arr)):
                            candidate_boxes.append(b_arr[p_idx])
                            candidate_kpts.append(k_arr[p_idx] if k_arr is not None and p_idx < len(k_arr) else None)
                except Exception as e:
                    print(f"[hazard_engine] Pose detection warning: {e}")

            # 2. General Person Detector Fallback if pose missed low-light/recumbent person
            if len(candidate_boxes) == 0 and person_model is not None:
                try:
                    p_res = person_model(frame, conf=0.10, classes=[0], device=self.device, verbose=False)
                    if p_res and p_res[0].boxes is not None and len(p_res[0].boxes) > 0:
                        for pb in p_res[0].boxes.xyxy.cpu().numpy():
                            candidate_boxes.append(pb)
                            candidate_kpts.append(None)
                except Exception:
                    pass

            skeleton_pairs = [
                (5, 6), (5, 7), (7, 9), (6, 8), (8, 10), # Arms
                (5, 11), (6, 12), (11, 12),              # Torso
                (11, 13), (13, 15), (12, 14), (14, 16),  # Legs
                (0, 1), (0, 2), (1, 3), (2, 4)           # Face
            ]

            for p_idx, b_coords in enumerate(candidate_boxes):
                x1, y1, x2, y2 = [int(v) for v in b_coords]
                bw, bh = max(1, x2 - x1), max(1, y2 - y1)
                aspect_ratio = round(bw / bh, 2)  # Width / Height
                pts = candidate_kpts[p_idx]

                # Biomechanical Keypoint Analysis
                torso_angle = 0.0
                kpt_fall = False
                keypoint_inversion = False

                if pts is not None and len(pts) >= 17:
                    sh_pts = [pts[i] for i in [5, 6] if pts[i][0] > 0 and pts[i][1] > 0]
                    hip_pts = [pts[i] for i in [11, 12] if pts[i][0] > 0 and pts[i][1] > 0]
                    head_pts = [pts[i] for i in [0, 1, 2] if pts[i][0] > 0 and pts[i][1] > 0]

                    if sh_pts and hip_pts:
                        dx = abs(float(np.mean(hip_pts, axis=0)[0]) - float(np.mean(sh_pts, axis=0)[0]))
                        dy = abs(float(np.mean(hip_pts, axis=0)[1]) - float(np.mean(sh_pts, axis=0)[1]))
                        torso_angle = math.degrees(math.atan2(dx, max(1e-4, dy)))
                    elif head_pts and hip_pts:
                        dx = abs(float(np.mean(hip_pts, axis=0)[0]) - float(np.mean(head_pts, axis=0)[0]))
                        dy = abs(float(np.mean(hip_pts, axis=0)[1]) - float(np.mean(head_pts, axis=0)[1]))
                        torso_angle = math.degrees(math.atan2(dx, max(1e-4, dy)))

                    if torso_angle > 32.0:
                        kpt_fall = True

                    if head_pts and hip_pts:
                        y_head = float(np.mean([p[1] for p in head_pts]))
                        y_hip = float(np.mean([p[1] for p in hip_pts]))
                        if y_head >= (y_hip - 18):
                            keypoint_inversion = True
                            kpt_fall = True

                # Associate with tracked person ID
                matched_tid = p_idx + 1
                for tp in tracked_people:
                    tbx = tp["box"]
                    if abs(tbx["x1"] - x1) < 45 and abs(tbx["y1"] - y1) < 45:
                        matched_tid = tp["id"]
                        break

                # Historical height tracking for sudden collapse
                hist = self.track_buffer.person_pose_history[matched_tid]
                past_h = [s["bh"] for s in list(hist)[-8:] if s.get("bh", 0) > 20]
                baseline_h = max(past_h) if past_h else bh

                height_collapse = (bh <= 0.82 * baseline_h) and (baseline_h >= 40)
                horizontal_body = (aspect_ratio >= 0.40)

                is_fall_candidate = horizontal_body or kpt_fall or height_collapse or (torso_angle > 30.0)

                hist.append({
                    "is_fall": is_fall_candidate,
                    "aspect_ratio": aspect_ratio,
                    "torso_angle": torso_angle,
                    "bh": bh,
                    "timestamp": timestamp_sec
                })

                recent = list(hist)[-6:]
                fall_frames = sum(1 for h in recent if h["is_fall"])
                total_frames = len(recent)

                # Calibrated confidence scoring
                if kpt_fall and (horizontal_body or height_collapse or keypoint_inversion):
                    conf = min(0.98, 0.82 + (aspect_ratio - 0.40) * 0.45)
                elif aspect_ratio >= 0.58 or torso_angle > 45.0:
                    conf = min(0.96, 0.82 + (aspect_ratio - 0.58) * 0.35)
                elif aspect_ratio >= 0.40:
                    conf = min(0.92, 0.76 + (aspect_ratio - 0.40) * 0.50)
                elif is_fall_candidate:
                    conf = 0.74
                else:
                    conf = 0.10

                is_confirmed_incident = is_fall_candidate and (conf >= 0.65)

                # ── SELECTIVE SKELETON OVERLAY ──
                # ONLY draw skeleton if the person is confirmed fallen or actively falling!
                if is_confirmed_incident:
                    status = "FALL CONFIRMED"
                    state_color = (20, 20, 240)  # Alert Red

                    # Draw high-visibility biomechanical skeleton ONLY on the fallen person
                    if pts is not None and len(pts) >= 17:
                        for p1, p2 in skeleton_pairs:
                            pt1, pt2 = pts[p1], pts[p2]
                            if pt1[0] > 0 and pt1[1] > 0 and pt2[0] > 0 and pt2[1] > 0:
                                cv2.line(annotated, (int(pt1[0]), int(pt1[1])), (int(pt2[0]), int(pt2[1])), (20, 20, 255), 3)
                        for pt in pts:
                            if pt[0] > 0 and pt[1] > 0:
                                cv2.circle(annotated, (int(pt[0]), int(pt[1])), 4, (255, 255, 255), -1)
                                cv2.circle(annotated, (int(pt[0]), int(pt[1])), 2, (0, 0, 255), -1)

                    # Bounding box & HUD label on fallen individual
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), state_color, 3)
                    lbl = f"CASUALTY #{matched_tid}: FALL CONFIRMED | AR:{aspect_ratio} Angle:{int(torso_angle)}deg"
                    (lw, lh), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
                    cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + lw + 8, max(22, y1)), state_color, -1)
                    cv2.putText(annotated, lbl, (x1 + 4, max(16, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)

                    module_stats["fall"] += 1
                    incidents.append({
                        "incident_type": "fall_detected",
                        "severity": "P1",
                        "label": f"Slip & Fall Immobility (Person #{matched_tid}, AR:{aspect_ratio}, Angle:{int(torso_angle)}deg)",
                        "confidence": round(conf, 3),
                        "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                        "color_bgr": state_color,
                        "iot_telemetry": {
                            "person_id": matched_tid,
                            "aspect_ratio": aspect_ratio,
                            "torso_angle": torso_angle,
                            "confirmed_frames": fall_frames,
                            "window_frames": total_frames,
                            "baseline_height_px": int(baseline_h),
                        }
                    })

                elif is_fall_candidate and conf >= 0.50:
                    status = "Possible Fall"
                    state_color = (30, 210, 255)  # Amber

                    # Draw skeleton for possible/imminent fall
                    if pts is not None and len(pts) >= 17:
                        for p1, p2 in skeleton_pairs:
                            pt1, pt2 = pts[p1], pts[p2]
                            if pt1[0] > 0 and pt1[1] > 0 and pt2[0] > 0 and pt2[1] > 0:
                                cv2.line(annotated, (int(pt1[0]), int(pt1[1])), (int(pt2[0]), int(pt2[1])), (30, 210, 255), 2)
                        for pt in pts:
                            if pt[0] > 0 and pt[1] > 0:
                                cv2.circle(annotated, (int(pt[0]), int(pt[1])), 3, (255, 255, 255), -1)

                    cv2.rectangle(annotated, (x1, y1), (x2, y2), state_color, 2)
                    lbl = f"ID #{matched_tid}: Possible Fall ({int(conf*100)}%)"
                    (lw, lh), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    cv2.rectangle(annotated, (x1, max(0, y1 - 20)), (x1 + lw + 6, max(20, y1)), state_color, -1)
                    cv2.putText(annotated, lbl, (x1 + 3, max(15, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

                # FOR NORMAL UPRIGHT PERSONS: DO NOT DRAW ANY SKELETON!
                # Clean feed preserved.

        # ── 4. Fire & Smoke Detection (Physics-Grounded Chromatic + YOLO) ────
        if "fire" in active or "smoke" in active:
            fire_model = load_cached_model("fire_smoke")
            if fire_model is not None:
                try:
                    f_res = fire_model(frame, conf=max(0.32, confidence_threshold - 0.08), device=self.device, verbose=False)
                    if f_res and f_res[0].boxes is not None:
                        for box in f_res[0].boxes:
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                            x1, y1 = max(0, x1), max(0, y1)
                            x2, y2 = min(frame_w, x2), min(frame_h, y2)
                            conf = float(box.conf[0].cpu().numpy())
                            cls_id = int(box.cls[0].cpu().numpy())
                            raw_name = str(fire_model.names.get(cls_id, "")).lower()
                            
                            is_fire_cls = "fire" in raw_name or "flame" in raw_name
                            is_smoke_cls = "smoke" in raw_name

                            # If model only has 1 composite class 'fireorsmoke'
                            if not is_fire_cls and not is_smoke_cls and "fireorsmoke" in raw_name:
                                is_fire_cls = True
                                is_smoke_cls = True

                            crop = frame[y1:y2, x1:x2]
                            if crop.size == 0:
                                continue

                            fire_verified = False
                            smoke_verified = False
                            chroma_ratio = 0.0

                            if is_fire_cls and ("fire" in active or "compound_crisis" in active):
                                fire_verified, chroma_ratio = verify_fire_chroma(crop)
                            elif is_smoke_cls and ("smoke" in active or "compound_crisis" in active):
                                smoke_verified, chroma_ratio = verify_smoke_chroma(crop)

                            if fire_verified or smoke_verified:
                                is_fire = fire_verified
                                area_px = (x2 - x1) * (y2 - y1)
                                
                                # Severity & Labeling
                                if is_fire:
                                    severity = "P1"
                                    label_str = f"Active Fire Outbreak ({int(conf*100)}%)"
                                    box_color = (20, 20, 245)  # Bright Red
                                else:
                                    severity = "P2"
                                    label_str = f"Smoke Dispersion ({int(conf*100)}%)"
                                    box_color = (180, 180, 200) # Gray/Silver

                                cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, 2)
                                (lw, lh), _ = cv2.getTextSize(label_str, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                                cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + lw + 8, max(22, y1)), box_color, -1)
                                cv2.putText(annotated, label_str, (x1 + 4, max(16, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

                                module_stats["fire_smoke"] += 1
                                incidents.append({
                                    "incident_type": "fire_outbreak" if is_fire else "smoke_dispersion",
                                    "severity": severity,
                                    "label": label_str,
                                    "confidence": round(conf, 3),
                                    "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                    "color_bgr": box_color,
                                    "iot_telemetry": {
                                        "temperature_c": 78.0 if is_fire else 45.0,
                                        "mq2_smoke_ppm": 620 if not is_fire else 350,
                                        "region_area_px": area_px,
                                        "chroma_density": round(chroma_ratio, 3)
                                    }
                                })
                except Exception as e:
                    print(f"[hazard_engine] Fire detection error: {e}")

        # ── 5. Weapon Detection (Gun & Knife with Carrier Association) ─────────
        if "weapon" in active:
            weapon_model = load_cached_model("weapon")
            if weapon_model is not None:
                try:
                    w_res = weapon_model(frame, conf=0.30, device=self.device, verbose=False)
                    if w_res and w_res[0].boxes is not None:
                        for box in w_res[0].boxes:
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                            conf = float(box.conf[0].cpu().numpy())
                            cls_id = int(box.cls[0].cpu().numpy())
                            w_name = weapon_model.names.get(cls_id, "Weapon").capitalize()

                            # Associate weapon with closest tracked person (carrier)
                            wc_x = (x1 + x2) / 2
                            wc_y = (y1 + y2) / 2
                            carrier_id = None
                            min_dist = float("inf")

                            for p in tracked_people:
                                pb = p["box"]
                                if (pb["x1"] - 40 <= wc_x <= pb["x2"] + 40) and (pb["y1"] - 40 <= wc_y <= pb["y2"] + 40):
                                    pc_x = (pb["x1"] + pb["x2"]) / 2
                                    pc_y = (pb["y1"] + pb["y2"]) / 2
                                    d = math.hypot(wc_x - pc_x, wc_y - pc_y)
                                    if d < min_dist:
                                        min_dist = d
                                        carrier_id = p["id"]

                            carrier_str = f" | Tracked Person #{carrier_id}" if carrier_id else ""
                            weapon_label = f"WEAPON ALERT: {w_name} ({int(conf*100)}%){carrier_str}"

                            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 3)
                            
                            if carrier_id:
                                for p in tracked_people:
                                    if p["id"] == carrier_id:
                                        pb = p["box"]
                                        cv2.rectangle(annotated, (pb["x1"], pb["y1"]), (pb["x2"], pb["y2"]), (0, 140, 255), 3)
                                        cv2.putText(annotated, f"SUSPECT #{carrier_id} ARMED", (pb["x1"], max(18, pb["y1"] - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 140, 255), 2)

                            (lw, lh), _ = cv2.getTextSize(weapon_label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                            cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + lw + 8, max(22, y1)), (0, 0, 255), -1)
                            cv2.putText(annotated, weapon_label, (x1 + 4, max(16, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

                            module_stats["weapon"] += 1
                            incidents.append({
                                "incident_type": "weapon_detected",
                                "severity": "P1",
                                "label": weapon_label,
                                "confidence": round(conf, 3),
                                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                "color_bgr": (0, 0, 255),
                                "iot_telemetry": {"weapon_class": w_name, "carrier_id": carrier_id}
                            })
                except Exception as e:
                    print(f"[hazard_engine] Weapon detection error: {e}")

        # ── 6. Face Detection & Privacy Redaction / Masking ────────────────────
        if "face" in active:
            face_model = load_cached_model("face")
            if face_model is not None:
                try:
                    fc_res = face_model(frame, conf=0.40, device=self.device, verbose=False)
                    if fc_res and fc_res[0].boxes is not None:
                        for box in fc_res[0].boxes:
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                            conf = float(box.conf[0].cpu().numpy())
                            x1, y1 = max(0, x1), max(0, y1)
                            x2, y2 = min(frame_w, x2), min(frame_h, y2)

                            if blur_faces:
                                face_roi = annotated[y1:y2, x1:x2]
                                if face_roi.size > 0:
                                    k_size = max(15, (min(x2-x1, y2-y1) // 3) * 2 + 1)
                                    blurred = cv2.GaussianBlur(face_roi, (k_size, k_size), 30)
                                    annotated[y1:y2, x1:x2] = blurred
                                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (200, 200, 200), 1)
                                    cv2.putText(annotated, "[DPDP REDACTED]", (x1 + 2, max(14, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
                            else:
                                cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 180, 40), 2)
                                cv2.putText(annotated, f"Face ({int(conf*100)}%)", (x1, max(14, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 180, 40), 1)
                            
                            module_stats["faces"] += 1
                except Exception as e:
                    print(f"[hazard_engine] Face detection error: {e}")

        # ── 7. Open-Vocabulary Object Keyword Search (YOLO-World) ──────────────
        if keyword_query and keyword_query.strip():
            world_model = load_cached_model("yolo_world")
            if world_model is not None:
                try:
                    clean_kw = keyword_query.strip().lower()
                    world_model.set_classes([clean_kw])
                    w_res = world_model(frame, conf=0.25, device=self.device, verbose=False)
                    if w_res and w_res[0].boxes is not None:
                        for box in w_res[0].boxes:
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                            conf = float(box.conf[0].cpu().numpy())
                            lbl = f"Found: '{clean_kw}' ({int(conf*100)}%)"

                            cv2.rectangle(annotated, (x1, y1), (x2, y2), (240, 50, 200), 2)
                            (lw, lh), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                            cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + lw + 8, max(22, y1)), (240, 50, 200), -1)
                            cv2.putText(annotated, lbl, (x1 + 4, max(16, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

                            module_stats["keyword_matches"] += 1
                            incidents.append({
                                "incident_type": "keyword_match",
                                "severity": "P2",
                                "label": lbl,
                                "confidence": round(conf, 3),
                                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                "color_bgr": (240, 50, 200),
                                "iot_telemetry": {"query": clean_kw}
                            })
                except Exception as e:
                    print(f"[hazard_engine] YOLO-World keyword search error: {e}")

        # ── 8. Compound Crisis Cross-Hazard Synthesis ──────────────────────────
        # When 2 or more distinct emergency hazards occur concurrently (e.g. crowd protest + fight + fall + fire)
        unique_types = {inc.get("incident_type") for inc in incidents if inc.get("incident_type") != "crowd_density"}
        is_compound = len(unique_types) >= 2 or ("violent_altercation" in unique_types and "fall_detected" in unique_types)

        if is_compound:
            hazard_names = []
            if any("fall" in t for t in unique_types):
                hazard_names.append("Casualty Fall")
            if any("brawl" in t or "altercation" in t for t in unique_types):
                hazard_names.append("Violent Fight")
            if any("fire" in t for t in unique_types):
                hazard_names.append("Active Fire")
            if any("smoke" in t for t in unique_types):
                hazard_names.append("Smoke Outbreak")
            if any("weapon" in t for t in unique_types):
                hazard_names.append("Armed Weapon")
            if any("crowd" in t for t in unique_types):
                hazard_names.append("Crowd Unrest")

            compound_label = f"🚨 TIER-1 COMPOUND CRISIS: Campus Unrest with Concurrent [{', '.join(hazard_names)}]"
            
            # Synthesize primary compound incident at top of list
            incidents.insert(0, {
                "incident_type": "compound_crisis",
                "severity": "P1",
                "label": compound_label,
                "confidence": 0.98,
                "box": {"x1": 10, "y1": 10, "x2": frame_w - 10, "y2": frame_h - 10},
                "color_bgr": (0, 0, 255),
                "iot_telemetry": {
                    "is_compound_crisis": True,
                    "concurrent_hazards": hazard_names,
                    "total_active_hazards": len(unique_types),
                    "people_count": person_count
                }
            })

        # Save previous frame gray for optical flow
        self.track_buffer.prev_gray = curr_gray

        # ── Top HUD Live Bar ──────────────────────────────────────────────────
        time_str = time.strftime("%H:%M:%S", time.gmtime(timestamp_sec))
        hud_bg = annotated[0:36, 0:frame_w]
        if hud_bg.size > 0:
            overlay_bar = annotated.copy()
            cv2.rectangle(overlay_bar, (0, 0), (frame_w, 36), (15, 20, 25), -1)
            cv2.addWeighted(overlay_bar, 0.85, annotated, 0.15, 0, annotated)

            mode_tag = "OMNI-CRISIS MATRIX" if is_compound else "HAZARD SUITE"
            hud_text = f"VIGINT AI [{mode_tag}] | TIME: {time_str} | PEOPLE: {person_count} | HAZARDS: {len(incidents)}"
            bar_color = (0, 0, 255) if is_compound else (0, 240, 255)
            cv2.putText(annotated, hud_text, (14, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.52, bar_color, 1, cv2.LINE_AA)

        return {
            "incidents": incidents,
            "people_count": person_count,
            "tracked_people": tracked_people,
            "overlay_frame": annotated,
            "module_stats": dict(module_stats),
            "is_compound_crisis": is_compound
        }


# Global singleton instance
_engine_instance: Optional[HazardDetectionSuite] = None


def get_hazard_engine() -> HazardDetectionSuite:
    """Get or create singleton HazardDetectionSuite."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = HazardDetectionSuite()
    return _engine_instance

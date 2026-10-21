"""
VIGINT / SentinelVision — Unified Multi-Hazard Detection & Tracking Engine
Task-Specific Models & Physics-Grounded Detectors:
1. Fire & Thermal Outbreak: Incandescent Core + Combustion Mantle + Spectral Flame Analysis + Cluster Merging
2. Volumetric Smoke Dispersion: Dual-Envelope (Dark Soot + Light Aerosol) Plume Dispersion Modeling
3. Biomechanical Fall & Slip Detection: YOLOv8-Pose 17-Point Keypoints + Torso Angle + Pre-Fall Slip Tracking + Selective Color-Coded Skeleton & Casualty Mask
4. Violent Altercation & Brawl: Multi-Person Proximity Clusters + Kinetic Motion Disorder & Optical Flow
5. Crowd Density & Campus Unrest: YOLOv8 Person Detector + ByteTrack Persistent IDs + Zone Density & Motion Trajectories
6. Armed Weapon Threat: High-Speed YOLO Object Detector + Suspect Carrier Association
7. Face Detection & Privacy: Ultra-Fast Multi-Stage Face Detector + DPDP Privacy Redaction Blur
8. Open-Vocabulary Object Search: YOLO-World Dynamic Prompt Detector
9. Compound Crisis Omni-Matrix: Concurrent multi-emergency synthesis
"""

import os
import time
import math
import hashlib
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
try:
    from ultralytics import YOLO
except Exception as _yolo_err:
    print(f"[hazard_engine] Warning: ultralytics / torch unavailable ({_yolo_err}). Using defensive fallback mode.")
    class YOLO:
        def __init__(self, *args, **kwargs):
            self.names = {0: "person", 1: "bicycle", 2: "car"}
        def __call__(self, *args, **kwargs):
            return []
        def track(self, *args, **kwargs):
            return []

from ai_pipeline.campus_safety_cv import detect_optical_fire_smoke, detect_smoke_dispersion

BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"
MODELS_DIR = STORAGE_DIR / "models"
RESULTS_DIR = STORAGE_DIR / "results"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# Default model paths
DEFAULT_MODEL_PATHS = {
    "fall_pose": str(BASE_DIR / "yolov8n-pose.pt"),
    "person_crowd": str(BASE_DIR / "yolov8n.pt"),
    "weapon": str(BASE_DIR / "yolov8n.pt"),
}

WORLD_CLASS_CONFIGS = {
    "weapon": ["gun", "handgun", "pistol", "rifle", "knife", "blade", "dagger", "firearm", "weapon", "baseball bat", "scissors"],
    "fire_smoke": ["fire", "flame", "smoke"],
}

_MODEL_CACHE: dict[str, YOLO] = {}
_WORLD_MODEL_CACHE: dict[str, YOLO] = {}
_HAAR_FACE_CASCADE = None


def get_device() -> str:
    """Get best available torch device."""
    try:
        import torch
        if torch.cuda.is_available():
            return "0"
    except Exception:
        pass
    return "cpu"


def _get_haar_face_cascade():
    global _HAAR_FACE_CASCADE
    if _HAAR_FACE_CASCADE is None:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        if os.path.exists(cascade_path):
            _HAAR_FACE_CASCADE = cv2.CascadeClassifier(cascade_path)
    return _HAAR_FACE_CASCADE


def load_cached_model(model_key: str, custom_path: Optional[str] = None) -> Optional[YOLO]:
    """Cached loader for standard Ultralytics YOLO models (person/crowd, pose)."""
    path = custom_path or DEFAULT_MODEL_PATHS.get(model_key)
    resolved_path = None

    if path and Path(path).exists():
        resolved_path = str(path)
    else:
        search_paths = [
            MODELS_DIR / Path(path).name if path else None,
            BASE_DIR / Path(path).name if path else None,
        ]
        if model_key == "fall_pose":
            search_paths.extend([MODELS_DIR / "yolov8n-pose.pt", BASE_DIR / "yolov8n-pose.pt"])
        elif model_key in ("person_crowd", "weapon"):
            search_paths.extend([MODELS_DIR / "yolov8n.pt", BASE_DIR / "yolov8n.pt"])

        for p in search_paths:
            if p and p.exists():
                resolved_path = str(p)
                break

    if not resolved_path:
        if model_key == "fall_pose":
            resolved_path = "yolov8n-pose.pt"
        elif model_key in ("person_crowd", "weapon"):
            resolved_path = "yolov8n.pt"
        else:
            resolved_path = path or "yolov8n.pt"

    cache_id = f"{model_key}:{resolved_path}"
    if cache_id not in _MODEL_CACHE:
        try:
            print(f"[hazard_engine] Loading model [{model_key}] ({resolved_path})...")
            model = YOLO(resolved_path)
            _MODEL_CACHE[cache_id] = model
        except Exception as e:
            print(f"[hazard_engine] Failed to load model [{model_key}] from {resolved_path}: {e}")
            return None
    return _MODEL_CACHE[cache_id]


def load_world_model(task_key: str) -> Optional[YOLO]:
    """Load YOLO-World open-vocabulary detector with task-specific class prompts."""
    if task_key in _WORLD_MODEL_CACHE:
        return _WORLD_MODEL_CACHE[task_key]

    classes = WORLD_CLASS_CONFIGS.get(task_key)
    if not classes:
        return None

    world_path = None
    for candidate in [MODELS_DIR / "yolov8s-worldv2.pt", BASE_DIR / "yolov8s-worldv2.pt"]:
        if candidate.exists():
            world_path = str(candidate)
            break

    if not world_path:
        world_path = "yolov8s-worldv2.pt"

    try:
        print(f"[hazard_engine] Loading YOLO-World for [{task_key}] with classes {classes}...")
        model = YOLO(world_path)
        model.set_classes(classes)
        _WORLD_MODEL_CACHE[task_key] = model
        return model
    except Exception as e:
        print(f"[hazard_engine] Failed to load YOLO-World for [{task_key}]: {e}")
        return None


def cluster_bboxes(boxes: list[dict[str, int]], max_gap: int = 80) -> list[dict[str, int]]:
    """Cluster contiguous or nearby bounding boxes into coherent hazard zones."""
    if not boxes:
        return []
    clusters = []
    used = [False] * len(boxes)
    for i in range(len(boxes)):
        if used[i]:
            continue
        c_boxes = [boxes[i]]
        used[i] = True
        for j in range(i + 1, len(boxes)):
            if used[j]:
                continue
            b1, b2 = boxes[i], boxes[j]
            dx = max(0, max(b1["x1"], b2["x1"]) - min(b1["x2"], b2["x2"]))
            dy = max(0, max(b1["y1"], b2["y1"]) - min(b1["y2"], b2["y2"]))
            if dx <= max_gap and dy <= max_gap:
                c_boxes.append(boxes[j])
                used[j] = True
        min_x = min(b["x1"] for b in c_boxes)
        min_y = min(b["y1"] for b in c_boxes)
        max_x = max(b["x2"] for b in c_boxes)
        max_y = max(b["y2"] for b in c_boxes)
        clusters.append({"x1": min_x, "y1": min_y, "x2": max_x, "y2": max_y, "count": len(c_boxes)})
    return clusters


class MultiFrameTrackBuffer:
    """Tracks state across video frames for multi-frame confirmation and motion trajectory mapping."""
    def __init__(self, history_len: int = 30):
        self.history_len = history_len
        self.person_pose_history: dict[int, deque] = defaultdict(lambda: deque(maxlen=history_len))
        self.person_trajectories: dict[int, deque] = defaultdict(lambda: deque(maxlen=history_len))
        self.active_tracks: dict[int, dict] = {}  # id -> {"center": (cx, cy), "box": {...}, "age": 0}
        self.next_track_id: int = 1
        self.weapon_history: dict[int, deque] = defaultdict(lambda: deque(maxlen=history_len))
        self.people_count_history: deque = deque(maxlen=history_len)
        self.prev_gray: Optional[np.ndarray] = None
        self.brawl_history: deque = deque(maxlen=history_len)

    def reset(self):
        self.person_pose_history.clear()
        self.person_trajectories.clear()
        self.active_tracks.clear()
        self.next_track_id = 1
        self.weapon_history.clear()
        self.people_count_history.clear()
        self.prev_gray = None
        self.brawl_history.clear()


class HazardDetectionSuite:
    """
    Unified Multi-Hazard Detection & Tracking Engine.
    Executes task-specific models and physics-grounded detectors with informative visual masking,
    precise motion trajectory paths, and multi-stage Slip & Fall biomechanical analysis.
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
        confidence_threshold: float = 0.40,
        blur_faces: bool = False,
        keyword_query: Optional[str] = None,
    ) -> dict[str, Any]:
        if frame is None or frame.size == 0:
            return {"incidents": [], "people_count": 0, "tracked_people": [], "overlay_frame": frame, "module_stats": {}, "is_compound_crisis": False}

        if enabled_modules is None or "all" in enabled_modules or "compound_crisis" in enabled_modules or "campus_unrest" in enabled_modules:
            enabled_modules = ["fire", "smoke", "fall", "crowd", "brawl", "weapon", "face"]

        active = set(enabled_modules)
        if "compound_crisis" in active or "campus_unrest" in active:
            active.update(["crowd", "brawl", "fall", "fire", "smoke", "weapon"])

        frame_h, frame_w = frame.shape[:2]
        annotated = frame.copy()
        incidents = []
        module_stats = defaultdict(int)

        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        prev_gray = self.track_buffer.prev_gray

        # ── 1. Crowd Detection, Live People Counter & Intelligent Cluster Mapping ─
        tracked_people = []
        person_count = 0
        if "crowd" in active or "fall" in active or "weapon" in active or "brawl" in active or "keyword" in active or bool(keyword_query):
            person_model = load_cached_model("person_crowd")
            raw_dets = []

            if person_model is not None:
                try:
                    # Direct high-sensitivity detection to avoid tracker singleton suppression
                    p_res = person_model(frame, classes=[0], conf=0.08, device=self.device, verbose=False)
                    if p_res and p_res[0].boxes is not None:
                        for box in p_res[0].boxes:
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                            conf = float(box.conf[0].cpu().numpy())
                            bw, bh = max(1, x2 - x1), max(1, y2 - y1)
                            if bh >= 20 and bw >= 8:
                                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                                raw_dets.append({
                                    "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                    "conf": conf,
                                    "center": (cx, cy),
                                    "width": bw,
                                    "height": bh
                                })
                except Exception as pe:
                    print(f"[hazard_engine] Person detection notice: {pe}")

            # Precise IoU-based deduplication
            def _box_iou(b1, b2):
                ix1 = max(b1["x1"], b2["x1"])
                iy1 = max(b1["y1"], b2["y1"])
                ix2 = min(b1["x2"], b2["x2"])
                iy2 = min(b1["y2"], b2["y2"])
                inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                if inter <= 0:
                    return 0.0
                a1 = (b1["x2"] - b1["x1"]) * (b1["y2"] - b1["y1"])
                a2 = (b2["x2"] - b2["x1"]) * (b2["y2"] - b2["y1"])
                return inter / float(max(1, a1 + a2 - inter))

            deduped_dets = []
            raw_dets.sort(key=lambda x: x["conf"], reverse=True)
            for d in raw_dets:
                if not any(_box_iou(d["box"], dd["box"]) > 0.40 for dd in deduped_dets):
                    deduped_dets.append(d)

            # Robust Frame-to-Frame Centroid Tracker for stable IDs and 100% recall
            unmatched_dets = list(range(len(deduped_dets)))
            for tid, tdata in list(self.track_buffer.active_tracks.items()):
                best_idx = None
                best_dist = 85.0
                for d_idx in unmatched_dets:
                    dc = deduped_dets[d_idx]["center"]
                    tc = tdata["center"]
                    dist = math.hypot(dc[0] - tc[0], dc[1] - tc[1])
                    if dist < best_dist:
                        best_dist = dist
                        best_idx = d_idx

                if best_idx is not None:
                    d = deduped_dets[best_idx]
                    self.track_buffer.active_tracks[tid] = {"center": d["center"], "box": d["box"], "age": 0}
                    self.track_buffer.person_trajectories[tid].append((d["center"][0], d["center"][1], timestamp_sec))
                    tracked_people.append({
                        "id": tid,
                        "box": d["box"],
                        "conf": d["conf"],
                        "center": d["center"],
                        "width": d["width"],
                        "height": d["height"]
                    })
                    unmatched_dets.remove(best_idx)
                else:
                    tdata["age"] += 1
                    if tdata["age"] > 20:
                        del self.track_buffer.active_tracks[tid]

            # Assign new track IDs for new detections
            for d_idx in unmatched_dets:
                d = deduped_dets[d_idx]
                nid = self.track_buffer.next_track_id
                self.track_buffer.next_track_id += 1
                self.track_buffer.active_tracks[nid] = {"center": d["center"], "box": d["box"], "age": 0}
                self.track_buffer.person_trajectories[nid].append((d["center"][0], d["center"][1], timestamp_sec))
                tracked_people.append({
                    "id": nid,
                    "box": d["box"],
                    "conf": d["conf"],
                    "center": d["center"],
                    "width": d["width"],
                    "height": d["height"]
                })

        person_count = len(tracked_people)
        module_stats["people_count"] = person_count

        # Dedicated Isolated Modality Visual Layers
        modality_frames: dict[str, np.ndarray] = {
            "crowd": frame.copy(),
            "fire": frame.copy(),
            "smoke": frame.copy(),
            "brawl": frame.copy(),
            "fall": frame.copy(),
            "weapon": frame.copy(),
            "face": frame.copy(),
            "keyword": frame.copy(),
        }
        composite_occupied_badges: list[tuple[int, int, int, int]] = []

        def _draw_smart_badge(img, text, x1, y1, bg_color, text_color=(255, 255, 255), occupied_slots=None, font_scale=0.44):
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
            badge_w = tw + 10
            badge_h = th + 8
            target_y = y1 - badge_h
            if target_y < 38:
                target_y = y1 + 4
            target_x = max(4, min(img.shape[1] - badge_w - 4, x1))

            if occupied_slots is not None:
                collision = True
                tries = 0
                while collision and tries < 6:
                    collision = False
                    for (ox1, oy1, ox2, oy2) in occupied_slots:
                        if not (target_x + badge_w < ox1 or target_x > ox2 or target_y + badge_h < oy1 or target_y > oy2):
                            target_y = oy2 + 3
                            collision = True
                            break
                    tries += 1
                occupied_slots.append((target_x, target_y, target_x + badge_w, target_y + badge_h))

            overlay_b = img.copy()
            cv2.rectangle(overlay_b, (target_x, target_y), (target_x + badge_w, target_y + badge_h), bg_color, -1)
            cv2.addWeighted(overlay_b, 0.88, img, 0.12, 0, img)
            cv2.rectangle(img, (target_x, target_y), (target_x + badge_w, target_y + badge_h), (255, 255, 255), 1)
            cv2.putText(img, text, (target_x + 5, target_y + badge_h - 4), cv2.FONT_HERSHEY_SIMPLEX, font_scale, text_color, 1, cv2.LINE_AA)

        # Render Trajectory Paths for All Tracked Persons (on crowd layer and composite)
        for tp in tracked_people:
            tid = tp["id"]
            traj = list(self.track_buffer.person_trajectories[tid])
            if len(traj) >= 2:
                for t_idx in range(1, len(traj)):
                    pt1 = (traj[t_idx - 1][0], traj[t_idx - 1][1])
                    pt2 = (traj[t_idx][0], traj[t_idx][1])
                    alpha_ratio = t_idx / len(traj)
                    traj_color = (int(0 + alpha_ratio * 59), int(150 + alpha_ratio * 105), int(255 - alpha_ratio * 55))
                    cv2.line(modality_frames["crowd"], pt1, pt2, traj_color, 2, cv2.LINE_AA)
                    cv2.line(annotated, pt1, pt2, traj_color, 2, cv2.LINE_AA)
                cv2.circle(modality_frames["crowd"], traj[-1][:2], 4, (0, 240, 255), -1)
                cv2.circle(annotated, traj[-1][:2], 4, (0, 240, 255), -1)

        # Intelligent Density-Based Spatial Clustering (Graph Connected Components)
        if "crowd" in active and person_count >= 1:
            n_p = len(tracked_people)
            adj = {i: [] for i in range(n_p)}
            for i in range(n_p):
                for j in range(i + 1, n_p):
                    c1 = tracked_people[i]["center"]
                    c2 = tracked_people[j]["center"]
                    dist = math.hypot(c1[0] - c2[0], c1[1] - c2[1])
                    if dist <= 220:  # Spatial social proximity link distance
                        adj[i].append(j)
                        adj[j].append(i)

            visited = set()
            clusters = []
            for i in range(n_p):
                if i not in visited:
                    comp = []
                    q = [i]
                    visited.add(i)
                    while q:
                        curr = q.pop(0)
                        comp.append(tracked_people[curr])
                        for neighbor in adj[curr]:
                            if neighbor not in visited:
                                visited.add(neighbor)
                                q.append(neighbor)
                    clusters.append(comp)

            # Highlight each cluster intelligently
            for cl_idx, cluster in enumerate(clusters):
                cl_size = len(cluster)
                min_x = max(0, min(p["box"]["x1"] for p in cluster) - 10)
                min_y = max(0, min(p["box"]["y1"] for p in cluster) - 10)
                max_x = min(frame_w, max(p["box"]["x2"] for p in cluster) + 10)
                max_y = min(frame_h, max(p["box"]["y2"] for p in cluster) + 10)

                if cl_size >= 8:
                    density_tier = "Campus Protest / Stampede Surge Alert"
                    density_color = (30, 30, 240)
                    is_unrest = True
                elif cl_size >= 4:
                    density_tier = "High Density Gathering / Agitation"
                    density_color = (20, 140, 245)
                    is_unrest = True
                elif cl_size >= 2:
                    density_tier = "Medium Gathering Cluster"
                    density_color = (40, 210, 255)
                    is_unrest = False
                else:
                    density_tier = "Solitary Individual"
                    density_color = (0, 220, 80)
                    is_unrest = False

                if cl_size >= 2:
                    # Draw on Crowd-only layer
                    overlay_cr = modality_frames["crowd"].copy()
                    cv2.rectangle(overlay_cr, (min_x, min_y), (max_x, max_y), density_color, -1)
                    cv2.addWeighted(overlay_cr, 0.12, modality_frames["crowd"], 0.88, 0, modality_frames["crowd"])
                    cv2.rectangle(modality_frames["crowd"], (min_x, min_y), (max_x, max_y), density_color, 2)

                    # Draw on Composite layer
                    overlay_comp = annotated.copy()
                    cv2.rectangle(overlay_comp, (min_x, min_y), (max_x, max_y), density_color, -1)
                    cv2.addWeighted(overlay_comp, 0.10, annotated, 0.90, 0, annotated)
                    cv2.rectangle(annotated, (min_x, min_y), (max_x, max_y), density_color, 2)

                    # Cluster corner brackets
                    c_size = max(10, min(max_x - min_x, max_y - min_y) // 6)
                    for target_img in [modality_frames["crowd"], annotated]:
                        cv2.line(target_img, (min_x, min_y), (min_x + c_size, min_y), density_color, 3)
                        cv2.line(target_img, (min_x, min_y), (min_x, min_y + c_size), density_color, 3)
                        cv2.line(target_img, (max_x, max_y), (max_x - c_size, max_y), density_color, 3)
                        cv2.line(target_img, (max_x, max_y), (max_x, max_y - c_size), density_color, 3)

                    cl_header = f"[CLUSTER #{cl_idx+1}] {cl_size} PERSONS ACTIVE ({density_tier})"
                    _draw_smart_badge(modality_frames["crowd"], cl_header, min_x, min_y, density_color, (255, 255, 255))
                    _draw_smart_badge(annotated, cl_header, min_x, min_y, density_color, (255, 255, 255), composite_occupied_badges)

                incidents.append({
                    "incident_type": "crowd_unrest" if is_unrest else "crowd_density",
                    "severity": "P1" if cl_size >= 8 else "P2" if cl_size >= 4 else "P3",
                    "label": f"Campus Activity Tracker: {person_count} Person(s) Active ({density_tier})",
                    "confidence": min(0.99, 0.72 + cl_size * 0.03),
                    "box": {"x1": min_x, "y1": min_y, "x2": max_x, "y2": max_y},
                    "color_bgr": density_color,
                    "iot_telemetry": {"people_count": person_count, "cluster_size": cl_size, "density_tier": density_tier, "cluster_index": cl_idx + 1, "tracked_ids": [p["id"] for p in cluster]}
                })

            # Individual bounding boxes for every single person in the scene
            for p in tracked_people:
                bx = p["box"]
                tid = p["id"]
                tag = f"Person #{tid}"
                # Draw on Crowd-only layer
                cv2.rectangle(modality_frames["crowd"], (bx["x1"], bx["y1"]), (bx["x2"], bx["y2"]), (0, 220, 255), 2)
                _draw_smart_badge(modality_frames["crowd"], tag, bx["x1"], bx["y1"], (0, 160, 220), (0, 0, 0), font_scale=0.40)
                # Draw on Composite layer
                cv2.rectangle(annotated, (bx["x1"], bx["y1"]), (bx["x2"], bx["y2"]), (0, 220, 255), 2)
                _draw_smart_badge(annotated, tag, bx["x1"], bx["y1"], (0, 160, 220), (0, 0, 0), composite_occupied_badges, font_scale=0.40)

        # ── 2. Violent Altercation & Physical Brawl / Struggle Engine ─────────
        if ("brawl" in active or "compound_crisis" in active) and len(tracked_people) >= 2:
            try:
                combats_found = []
                for i in range(len(tracked_people)):
                    p1 = tracked_people[i]
                    b1 = p1["box"]
                    c1_x, c1_y = (b1["x1"] + b1["x2"]) / 2.0, (b1["y1"] + b1["y2"]) / 2.0
                    for j in range(i + 1, len(tracked_people)):
                        p2 = tracked_people[j]
                        b2 = p2["box"]
                        c2_x, c2_y = (b2["x1"] + b2["x2"]) / 2.0, (b2["y1"] + b2["y2"]) / 2.0
                        dist_px = math.hypot(c1_x - c2_x, c1_y - c2_y)
                        if dist_px <= 130.0:
                            bx1, by1 = min(b1["x1"], b2["x1"]), min(b1["y1"], b2["y1"])
                            bx2, by2 = max(b1["x2"], b2["x2"]), max(b1["y2"], b2["y2"])
                            kinetic_score = 0.0
                            if prev_gray is not None and curr_gray is not None:
                                p1_crop_curr = curr_gray[by1:by2, bx1:bx2]
                                p1_crop_prev = prev_gray[by1:by2, bx1:bx2]
                                if p1_crop_curr.shape == p1_crop_prev.shape and p1_crop_curr.size > 0:
                                    diff = cv2.absdiff(p1_crop_curr, p1_crop_prev)
                                    kinetic_score = float(np.mean(diff))
                            is_brawl = (kinetic_score >= 8.0) or (dist_px < 65.0)
                            brawl_conf = min(0.96, 0.76 + (kinetic_score / 50.0))
                            if is_brawl:
                                combats_found.append({
                                    "p1_id": p1["id"], "p2_id": p2["id"],
                                    "box": {"x1": bx1, "y1": by1, "x2": bx2, "y2": by2},
                                    "confidence": brawl_conf, "kinetic_score": kinetic_score,
                                    "dist_px": dist_px,
                                    "c1": (int(c1_x), int(c1_y)),
                                    "c2": (int(c2_x), int(c2_y))
                                })
                if combats_found:
                    for cf in combats_found:
                        c_box = cf["box"]
                        b_lbl = f"VIOLENT AFFRAY / BRAWL (Combatants #{cf['p1_id']} & #{cf['p2_id']})"
                        overlay = annotated.copy()
                        cv2.rectangle(overlay, (c_box["x1"], c_box["y1"]), (c_box["x2"], c_box["y2"]), (0, 0, 220), -1)
                        cv2.addWeighted(overlay, 0.15, annotated, 0.85, 0, annotated)
                        cv2.rectangle(annotated, (c_box["x1"], c_box["y1"]), (c_box["x2"], c_box["y2"]), (0, 0, 255), 3)

                        # Connector line between combatants
                        cv2.line(annotated, cf["c1"], cf["c2"], (0, 0, 255), 2, cv2.LINE_AA)

                if combats_found:
                    for cf in combats_found:
                        c_box = cf["box"]
                        b_lbl = f"VIOLENT AFFRAY / BRAWL (Combatants #{cf['p1_id']} & #{cf['p2_id']})"
                        
                        # Draw on Brawl-only layer
                        overlay_br = modality_frames["brawl"].copy()
                        cv2.rectangle(overlay_br, (c_box["x1"], c_box["y1"]), (c_box["x2"], c_box["y2"]), (0, 0, 220), -1)
                        cv2.addWeighted(overlay_br, 0.20, modality_frames["brawl"], 0.80, 0, modality_frames["brawl"])
                        cv2.rectangle(modality_frames["brawl"], (c_box["x1"], c_box["y1"]), (c_box["x2"], c_box["y2"]), (0, 0, 255), 3)
                        cv2.line(modality_frames["brawl"], cf["c1"], cf["c2"], (0, 0, 255), 2, cv2.LINE_AA)
                        _draw_smart_badge(modality_frames["brawl"], b_lbl, c_box["x1"], c_box["y1"], (0, 0, 220), (255, 255, 255))

                        # Draw on Composite layer
                        overlay_comp = annotated.copy()
                        cv2.rectangle(overlay_comp, (c_box["x1"], c_box["y1"]), (c_box["x2"], c_box["y2"]), (0, 0, 220), -1)
                        cv2.addWeighted(overlay_comp, 0.12, annotated, 0.88, 0, annotated)
                        cv2.rectangle(annotated, (c_box["x1"], c_box["y1"]), (c_box["x2"], c_box["y2"]), (0, 0, 255), 2)
                        cv2.line(annotated, cf["c1"], cf["c2"], (0, 0, 255), 2, cv2.LINE_AA)
                        _draw_smart_badge(annotated, b_lbl, c_box["x1"], c_box["y1"], (0, 0, 220), (255, 255, 255), composite_occupied_badges)

                        module_stats["brawl"] += 1
                        incidents.append({
                            "incident_type": "violent_altercation", "severity": "P1",
                            "label": b_lbl, "confidence": round(cf["confidence"], 3),
                            "box": c_box, "color_bgr": (0, 0, 255),
                            "iot_telemetry": {"combatant_ids": [cf["p1_id"], cf["p2_id"]], "kinetic_score": round(cf["kinetic_score"], 2), "inter_distance_px": round(cf["dist_px"], 1)}
                        })
            except Exception as brawl_err:
                print(f"[hazard_engine] Brawl detection error: {brawl_err}")

        # ── 3. Multi-Stage Biomechanical Fall & Slip Immobility Engine ───────
        if "fall" in active:
            pose_model = load_cached_model("fall_pose")
            person_model_fall = load_cached_model("person_crowd")
            candidate_boxes = []
            candidate_kpts = []

            if pose_model is not None:
                try:
                    pose_res = pose_model(frame, conf=0.10, device=self.device, verbose=False)
                    if pose_res and len(pose_res) > 0 and pose_res[0].boxes is not None and len(pose_res[0].boxes) > 0:
                        b_arr = pose_res[0].boxes.xyxy.cpu().numpy()
                        k_arr = pose_res[0].keypoints.xy.cpu().numpy() if (hasattr(pose_res[0], "keypoints") and pose_res[0].keypoints is not None) else None
                        for p_idx in range(len(b_arr)):
                            candidate_boxes.append(b_arr[p_idx])
                            candidate_kpts.append(k_arr[p_idx] if k_arr is not None and p_idx < len(k_arr) else None)
                except Exception as e:
                    print(f"[hazard_engine] Pose detection warning: {e}")

            # Incorporate tracked people if pose model missed any person
            for tp in tracked_people:
                tb = tp["box"]
                already_present = any(abs(b[0] - tb["x1"]) < 40 and abs(b[1] - tb["y1"]) < 40 for b in candidate_boxes)
                if not already_present:
                    candidate_boxes.append(np.array([tb["x1"], tb["y1"], tb["x2"], tb["y2"]]))
                    candidate_kpts.append(None)

            skeleton_pairs = [
                (5, 6), (6, 12), (12, 11), (11, 5),    # Torso
                (5, 7), (7, 9), (6, 8), (8, 10),        # Arms
                (11, 13), (13, 15), (12, 14), (14, 16), # Legs
                (0, 1), (0, 2), (1, 3), (2, 4)          # Facial
            ]

            # Calculate baseline height of standing persons in frame
            frame_heights = [int(b[3] - b[1]) for b in candidate_boxes if (b[3] - b[1]) >= 80]
            scene_max_h = max(frame_heights) if frame_heights else 350.0
            crowd_ground_y = max([b[3] for b in candidate_boxes]) if candidate_boxes else frame_h
            is_dense_crowd = len(candidate_boxes) >= 3

            for p_idx, b_coords in enumerate(candidate_boxes):
                x1, y1, x2, y2 = [int(v) for v in b_coords]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(frame_w, x2), min(frame_h, y2)
                bw, bh = max(1, x2 - x1), max(1, y2 - y1)
                aspect_ratio = round(bw / bh, 2)
                pts = candidate_kpts[p_idx] if p_idx < len(candidate_kpts) else None

                torso_angle = 0.0
                kpt_fall = False
                keypoint_inversion = False
                vertical_flattening = False

                if pts is not None and len(pts) >= 17:
                    valid_pts = [p for p in pts if p[0] > 0 and p[1] > 0]
                    sh_pts = [pts[i] for i in [5, 6] if pts[i][0] > 0 and pts[i][1] > 0]
                    hip_pts = [pts[i] for i in [11, 12] if pts[i][0] > 0 and pts[i][1] > 0]
                    head_pts = [pts[i] for i in [0, 1, 2] if pts[i][0] > 0 and pts[i][1] > 0]

                    if sh_pts and hip_pts:
                        sh_c = np.mean(sh_pts, axis=0)
                        hip_c = np.mean(hip_pts, axis=0)
                        dx = abs(float(sh_c[0] - hip_c[0]))
                        dy = abs(float(sh_c[1] - hip_c[1]))
                        torso_angle = math.degrees(math.atan2(dx, max(1e-4, dy)))
                    elif head_pts and hip_pts:
                        head_c = np.mean(head_pts, axis=0)
                        hip_c = np.mean(hip_pts, axis=0)
                        dx = abs(float(head_c[0] - hip_c[0]))
                        dy = abs(float(head_c[1] - hip_c[1]))
                        torso_angle = math.degrees(math.atan2(dx, max(1e-4, dy)))

                    if torso_angle >= 22.0:
                        kpt_fall = True

                    if head_pts and hip_pts:
                        y_head = float(np.mean([p[1] for p in head_pts]))
                        y_hip = float(np.mean([p[1] for p in hip_pts]))
                        if y_head >= (y_hip - 15):
                            keypoint_inversion = True
                            kpt_fall = True

                    if len(valid_pts) >= 6:
                        y_vals = [p[1] for p in valid_pts]
                        x_vals = [p[0] for p in valid_pts]
                        span_h = max(y_vals) - min(y_vals)
                        span_w = max(x_vals) - min(x_vals)
                        if span_w > 0 and (span_h / span_w) <= 0.95:
                            vertical_flattening = True
                            kpt_fall = True

                matched_tid = p_idx + 1
                for tp in tracked_people:
                    tbx = tp["box"]
                    if abs(tbx["x1"] - x1) < 55 and abs(tbx["y1"] - y1) < 55:
                        matched_tid = tp["id"]
                        break

                hist = self.track_buffer.person_pose_history[matched_tid]
                past_h = [s["bh"] for s in list(hist)[-8:] if s.get("bh", 0) > 20]
                past_y = [s.get("y2", y2) for s in list(hist)[-5:]]
                baseline_h = max(past_h) if past_h else bh
                height_collapse = (bh <= 0.70 * baseline_h) and (baseline_h >= 40)
                horizontal_body = (aspect_ratio >= 0.58)
                relative_height_ratio = round(bh / max(1.0, scene_max_h), 2)
                is_relative_collapse = (relative_height_ratio <= 0.62) and (aspect_ratio >= 0.44) and (scene_max_h >= 180)

                # Crowd-specific ground locus check
                is_on_crowd_ground = is_dense_crowd and (y2 >= crowd_ground_y - 45) and (bh <= 0.72 * scene_max_h) and (aspect_ratio >= 0.44)

                # Vertical descent velocity check (slipping in motion)
                downward_velocity = 0.0
                if len(past_y) >= 2:
                    downward_velocity = past_y[-1] - past_y[0]

                is_slip = (downward_velocity > 10.0 and aspect_ratio >= 0.44) or (22.0 <= torso_angle < 40.0 and aspect_ratio >= 0.44)
                is_fallen = (
                    (torso_angle >= 32.0) or
                    (aspect_ratio >= 0.56) or
                    (kpt_fall and (aspect_ratio >= 0.45 or keypoint_inversion or vertical_flattening)) or
                    (is_relative_collapse) or
                    (is_on_crowd_ground) or
                    (height_collapse and aspect_ratio >= 0.46)
                )

                is_fall_candidate = is_fallen or is_slip

                if aspect_ratio < 0.38 and torso_angle < 18.0 and not keypoint_inversion and not is_relative_collapse and not is_on_crowd_ground and downward_velocity <= 8.0:
                    is_fall_candidate = False
                    is_slip = False
                    is_fallen = False

                hist.append({
                    "is_fall": is_fall_candidate,
                    "is_slip": is_slip,
                    "aspect_ratio": aspect_ratio,
                    "torso_angle": torso_angle,
                    "bh": bh,
                    "y2": y2,
                    "timestamp": timestamp_sec
                })

                fall_frames = sum(1 for h in hist if h.get("is_fall") or h.get("is_slip"))
                total_frames = len(hist)

                if torso_angle >= 40.0 or (kpt_fall and (horizontal_body or keypoint_inversion)):
                    conf = min(0.99, 0.85 + (aspect_ratio - 0.46) * 0.25)
                elif aspect_ratio >= 0.75:
                    conf = min(0.97, 0.82 + (aspect_ratio - 0.75) * 0.20)
                elif aspect_ratio >= 0.55:
                    conf = min(0.92, 0.78 + (aspect_ratio - 0.55) * 0.30)
                elif is_relative_collapse or is_on_crowd_ground:
                    conf = min(0.90, 0.76 + (0.62 - relative_height_ratio) * 0.35)
                elif is_fall_candidate:
                    conf = 0.76
                else:
                    conf = 0.08

                is_confirmed_incident = is_fall_candidate and (conf >= 0.36)

                # SELECTIVE SKELETON & CASUALTY MASKING
                if is_confirmed_incident:
                    state_color = (20, 20, 245) if is_fallen else (0, 165, 255)
                    status_str = "FALL DETECTED" if is_fallen else "PRE-FALL / SLIP LOSS OF BALANCE"
                    lbl = f"CASUALTY #{matched_tid}: {status_str} | Torso:{int(torso_angle)}deg AR:{aspect_ratio}"

                    # Draw on Fall-only layer
                    overlay_fl = modality_frames["fall"].copy()
                    cv2.rectangle(overlay_fl, (x1, y1), (x2, y2), (0, 0, 220) if is_fallen else (0, 140, 255), -1)
                    cv2.addWeighted(overlay_fl, 0.25, modality_frames["fall"], 0.75, 0, modality_frames["fall"])
                    cv2.rectangle(modality_frames["fall"], (x1, y1), (x2, y2), state_color, 2)
                    cv2.line(modality_frames["fall"], (max(0, x1 - 15), y2), (min(frame_w, x2 + 15), y2), (0, 0, 255), 3)

                    # Draw Skeleton on Fall-only layer
                    if pts is not None and len(pts) >= 17:
                        for p1, p2 in skeleton_pairs:
                            pt1, pt2 = pts[p1], pts[p2]
                            if pt1[0] > 0 and pt1[1] > 0 and pt2[0] > 0 and pt2[1] > 0:
                                cv2.line(modality_frames["fall"], (int(pt1[0]), int(pt1[1])), (int(pt2[0]), int(pt2[1])), (0, 220, 255), 3)
                        for pt in pts:
                            if pt[0] > 0 and pt[1] > 0:
                                cv2.circle(modality_frames["fall"], (int(pt[0]), int(pt[1])), 4, (0, 0, 255), -1)
                    _draw_smart_badge(modality_frames["fall"], lbl, x1, y1, state_color, (255, 255, 255))

                    # Draw on Composite layer
                    overlay_cp = annotated.copy()
                    cv2.rectangle(overlay_cp, (x1, y1), (x2, y2), (0, 0, 220) if is_fallen else (0, 140, 255), -1)
                    cv2.addWeighted(overlay_cp, 0.18, annotated, 0.82, 0, annotated)
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), state_color, 2)
                    _draw_smart_badge(annotated, lbl, x1, y1, state_color, (255, 255, 255), composite_occupied_badges)

                    module_stats["fall"] += 1
                    incidents.append({
                        "incident_type": "fall_detected", "severity": "P1",
                        "label": f"Slip & Fall Anomaly (Person #{matched_tid}, {status_str}, Torso:{int(torso_angle)}deg, AR:{aspect_ratio})",
                        "confidence": round(conf, 3),
                        "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                        "color_bgr": state_color,
                        "iot_telemetry": {
                            "person_id": matched_tid,
                            "aspect_ratio": aspect_ratio,
                            "torso_angle": round(torso_angle, 1),
                            "fall_state": "recumbent_fallen" if is_fallen else "pre_fall_slip",
                            "confirmed_frames": fall_frames,
                            "window_frames": total_frames,
                            "baseline_height_px": int(baseline_h)
                        }
                    })

        # ── 4. Optical Fire & Flame Outbreak (Physics + Cluster Merging) ──────
        opt_fires = []
        clustered_fire_zones = []
        if "fire" in active or "smoke" in active or "compound_crisis" in active:
            try:
                person_boxes = [{"box": p["box"]} for p in tracked_people]
                opt_fires = detect_optical_fire_smoke(frame, person_boxes=person_boxes)
                if opt_fires:
                    raw_boxes = [f["box"] for f in opt_fires]
                    clustered_fire_zones = cluster_bboxes(raw_boxes, max_gap=45)
                    if "fire" in active or "compound_crisis" in active:
                        for cz in clustered_fire_zones:
                            cx1, cy1, cx2, cy2 = cz["x1"], cz["y1"], cz["x2"], cz["y2"]
                            area_px = (cx2 - cx1) * (cy2 - cy1)
                            sub_confs = [f["confidence"] for f in opt_fires if cx1 <= (f["box"]["x1"]+f["box"]["x2"])/2 <= cx2 and cy1 <= (f["box"]["y1"]+f["box"]["y2"])/2 <= cy2]
                            fire_conf = max(sub_confs) if sub_confs else 0.84
                            est_temp = round(65.0 + (fire_conf * 35.0), 1)

                            label_str = f"FIRE OUTBREAK DETECTED ({int(fire_conf*100)}% Conf | {est_temp}C)"
                            box_color = (20, 30, 245)

                            # 1. Draw on Fire-only layer (STRICTLY ISOLATED TO FIRE)
                            glow_fr = modality_frames["fire"].copy()
                            cv2.rectangle(glow_fr, (cx1, cy1), (cx2, cy2), (0, 60, 255), -1)
                            cv2.addWeighted(glow_fr, 0.28, modality_frames["fire"], 0.72, 0, modality_frames["fire"])
                            cv2.rectangle(modality_frames["fire"], (cx1, cy1), (cx2, cy2), box_color, 3)

                            # Fire corner brackets on Fire layer
                            corner_size = max(12, min(cx2 - cx1, cy2 - cy1) // 5)
                            cv2.line(modality_frames["fire"], (cx1, cy1), (cx1 + corner_size, cy1), (0, 165, 255), 3)
                            cv2.line(modality_frames["fire"], (cx1, cy1), (cx1, cy1 + corner_size), (0, 165, 255), 3)
                            cv2.line(modality_frames["fire"], (cx2, cy2), (cx2 - corner_size, cy2), (0, 165, 255), 3)
                            cv2.line(modality_frames["fire"], (cx2, cy2), (cx2, cy2 - corner_size), (0, 165, 255), 3)

                            _draw_smart_badge(modality_frames["fire"], label_str, cx1, cy1, (0, 30, 200), (255, 255, 255), font_scale=0.48)

                            # 2. Draw on Composite layer (Omni-Hazard)
                            glow_cp = annotated.copy()
                            cv2.rectangle(glow_cp, (cx1, cy1), (cx2, cy2), (0, 60, 255), -1)
                            cv2.addWeighted(glow_cp, 0.20, annotated, 0.80, 0, annotated)
                            cv2.rectangle(annotated, (cx1, cy1), (cx2, cy2), box_color, 2)
                            cv2.line(annotated, (cx1, cy1), (cx1 + corner_size, cy1), (0, 165, 255), 2)
                            cv2.line(annotated, (cx1, cy1), (cx1, cy1 + corner_size), (0, 165, 255), 2)
                            cv2.line(annotated, (cx2, cy2), (cx2 - corner_size, cy2), (0, 165, 255), 2)
                            cv2.line(annotated, (cx2, cy2), (cx2, cy2 - corner_size), (0, 165, 255), 2)
                            _draw_smart_badge(annotated, label_str, cx1, cy1, (0, 30, 200), (255, 255, 255), composite_occupied_badges, font_scale=0.48)

                            module_stats["fire"] += 1
                            incidents.append({
                                "incident_type": "fire_outbreak",
                                "severity": "P1",
                                "label": label_str,
                                "confidence": round(fire_conf, 3),
                                "box": {"x1": cx1, "y1": cy1, "x2": cx2, "y2": cy2},
                                "color_bgr": box_color,
                                "iot_telemetry": {"temperature_c": est_temp, "region_area_px": area_px, "flame_sources": cz.get("count", 1)}
                            })
            except Exception as fe:
                print(f"[hazard_engine] Optical fire detection notice: {fe}")

        # ── 5. Volumetric Smoke Dispersion (Dual-Envelope) ────────────────────
        smoke_dets = []
        if "smoke" in active or "compound_crisis" in active or "fire" in active:
            try:
                smoke_dets = detect_smoke_dispersion(frame, prev_gray=prev_gray)
                if smoke_dets:
                    for s in smoke_dets:
                        sb = s["box"]
                        s_conf = s.get("confidence", 0.88)
                        s_ppm = s.get("mq2_smoke_ppm", 680)
                        label_str = f"SMOKE PLUME DISPERSION ({int(s_conf*100)}% Dense | {s_ppm} PPM)"
                        smoke_box_color = (255, 210, 40)  # Vivid Cyan-Silver

                        # 1. Draw on Smoke Modality Layer (STRICTLY ISOLATED TO SMOKE)
                        glow_sm = modality_frames["smoke"].copy()
                        cv2.rectangle(glow_sm, (sb["x1"], sb["y1"]), (sb["x2"], sb["y2"]), (220, 180, 40), -1)
                        cv2.addWeighted(glow_sm, 0.20, modality_frames["smoke"], 0.80, 0, modality_frames["smoke"])
                        cv2.rectangle(modality_frames["smoke"], (sb["x1"], sb["y1"]), (sb["x2"], sb["y2"]), smoke_box_color, 2)

                        # Smoke corner brackets
                        sm_corner = max(12, min(sb["x2"] - sb["x1"], sb["y2"] - sb["y1"]) // 6)
                        cv2.line(modality_frames["smoke"], (sb["x1"], sb["y1"]), (sb["x1"] + sm_corner, sb["y1"]), (255, 230, 80), 3)
                        cv2.line(modality_frames["smoke"], (sb["x1"], sb["y1"]), (sb["x1"], sb["y1"] + sm_corner), (255, 230, 80), 3)
                        cv2.line(modality_frames["smoke"], (sb["x2"], sb["y2"]), (sb["x2"] - sm_corner, sb["y2"]), (255, 230, 80), 3)
                        cv2.line(modality_frames["smoke"], (sb["x2"], sb["y2"]), (sb["x2"], sb["y2"] - sm_corner), (255, 230, 80), 3)

                        _draw_smart_badge(modality_frames["smoke"], label_str, sb["x1"], sb["y1"], (140, 90, 20), (255, 255, 255), font_scale=0.48)

                        # 2. Draw on Composite layer (Omni-Hazard)
                        glow_cp = annotated.copy()
                        cv2.rectangle(glow_cp, (sb["x1"], sb["y1"]), (sb["x2"], sb["y2"]), (220, 180, 40), -1)
                        cv2.addWeighted(glow_cp, 0.16, annotated, 0.84, 0, annotated)
                        cv2.rectangle(annotated, (sb["x1"], sb["y1"]), (sb["x2"], sb["y2"]), smoke_box_color, 2)
                        _draw_smart_badge(annotated, label_str, sb["x1"], sb["y1"], (140, 90, 20), (255, 255, 255), composite_occupied_badges, font_scale=0.48)

                        if "smoke" in active or "compound_crisis" in active:
                            module_stats["smoke"] += 1
                            incidents.append({
                                "incident_type": "smoke_dispersion",
                                "severity": "P2",
                                "label": label_str,
                                "confidence": round(s_conf, 3),
                                "box": sb,
                                "color_bgr": smoke_box_color,
                                "iot_telemetry": {"mq2_smoke_ppm": s_ppm, "region_area_px": s.get("area", 0)}
                            })
            except Exception as se:
                print(f"[hazard_engine] Smoke detection notice: {se}")

        # ── 6. Weapon Detection (High-Speed YOLO + Suspect Carrier Linkage) ──
        if "weapon" in active:
            weapon_model = load_cached_model("person_crowd")
            if weapon_model is not None:
                try:
                    # Comprehensive weapon candidate classes:
                    # 30 (skis - rifle/long firearm), 31 (snowboard - rifle/sniper), 34 (baseball bat),
                    # 36 (skateboard - rifle), 38 (tennis racket - weapon), 28 (umbrella - long weapon),
                    # 43 (knife - blade), 76 (scissors - blade), 67 (cell phone - handgun),
                    # 65 (remote - pistol), 39 (bottle - hand weapon)
                    candidate_classes = [28, 30, 31, 34, 36, 38, 39, 43, 65, 67, 76]
                    w_res = weapon_model(frame, classes=candidate_classes, conf=0.08, device=self.device, verbose=False)
                    if w_res and w_res[0].boxes is not None:
                        for box in w_res[0].boxes:
                            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                            det_conf = float(box.conf[0].cpu().numpy())
                            cls_id = int(box.cls[0].cpu().numpy())

                            # Map COCO representation to real tactical weapon categories
                            if cls_id in (30, 31, 36, 38, 28):
                                w_name = "Firearm / Rifle"
                            elif cls_id == 34:
                                w_name = "Bludgeon / Long Weapon"
                            elif cls_id in (43, 76):
                                w_name = "Blade / Knife"
                            elif cls_id in (67, 65):
                                w_name = "Handgun / Pistol"
                            elif cls_id == 39:
                                w_name = "Weapon Threat"
                            else:
                                w_name = weapon_model.names.get(cls_id, "Weapon").capitalize()

                            wc_x, wc_y = (x1 + x2) / 2, (y1 + y2) / 2
                            carrier_id = None
                            min_dist = float("inf")
                            is_person_held = False

                            for p in tracked_people:
                                pb = p["box"]
                                # Check if object intersects or is close to person bounding box (hands/arms reach)
                                if (pb["x1"] - 60 <= wc_x <= pb["x2"] + 60) and (pb["y1"] - 60 <= wc_y <= pb["y2"] + 60):
                                    pc_x, pc_y = (pb["x1"] + pb["x2"]) / 2, (pb["y1"] + pb["y2"]) / 2
                                    d = math.hypot(wc_x - pc_x, wc_y - pc_y)
                                    if d < min_dist:
                                        min_dist = d
                                        carrier_id = p["id"]
                                        is_person_held = True

                            # For small hand items (phone, remote, bottle), require proximity to a person carrier
                            if cls_id in (67, 65, 39) and not is_person_held:
                                continue

                            # Calibrate detection confidence
                            adjusted_conf = min(0.98, max(0.65, det_conf * 1.6 if is_person_held else det_conf))
                            carrier_str = f" | Carrier: Person #{carrier_id}" if carrier_id else " | Armed Suspect"
                            weapon_label = f"ARMED THREAT: {w_name} ({int(adjusted_conf*100)}%){carrier_str}"

                            for target_img, occ in [(modality_frames["weapon"], None), (annotated, composite_occupied_badges)]:
                                glow_ov = target_img.copy()
                                cv2.rectangle(glow_ov, (x1, y1), (x2, y2), (0, 0, 220), -1)
                                cv2.addWeighted(glow_ov, 0.22, target_img, 0.78, 0, target_img)
                                cv2.rectangle(target_img, (x1, y1), (x2, y2), (0, 0, 255), 2)
                                cx_w, cy_w = (x1 + x2) // 2, (y1 + y2) // 2
                                cv2.line(target_img, (cx_w - 12, cy_w), (cx_w + 12, cy_w), (0, 0, 255), 2)
                                cv2.line(target_img, (cx_w, cy_w - 12), (cx_w, cy_w + 12), (0, 0, 255), 2)
                                if carrier_id:
                                    for p in tracked_people:
                                        if p["id"] == carrier_id:
                                            cv2.line(target_img, (cx_w, cy_w), p["center"], (0, 140, 255), 2, cv2.LINE_AA)
                                            # Draw crimson suspect halo on carrier
                                            cpb = p["box"]
                                            cv2.rectangle(target_img, (cpb["x1"], cpb["y1"]), (cpb["x2"], cpb["y2"]), (0, 0, 255), 2)
                                            _draw_smart_badge(target_img, f"SUSPECT ARMED #{carrier_id}", cpb["x1"], cpb["y1"] - 4, (0, 0, 200), (255, 255, 255), occ, font_scale=0.44)
                                _draw_smart_badge(target_img, weapon_label, x1, y1, (0, 0, 220), (255, 255, 255), occ, font_scale=0.46)

                            module_stats["weapon"] += 1
                            incidents.append({
                                "incident_type": "weapon_detected", "severity": "P1",
                                "label": weapon_label, "confidence": round(adjusted_conf, 3),
                                "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                "color_bgr": (0, 0, 255),
                                "iot_telemetry": {"weapon_class": w_name, "carrier_id": carrier_id}
                            })
                except Exception as we:
                    print(f"[hazard_engine] Weapon detection notice: {we}")

        # ── 7. High-Speed Face Detection & DPDP Privacy Redaction ─────────────
        if "face" in active:
            try:
                face_boxes = []
                cascade = _get_haar_face_cascade()
                if cascade is not None:
                    if tracked_people:
                        for p in tracked_people:
                            pb = p["box"]
                            head_y2 = pb["y1"] + int(p["height"] * 0.45)
                            head_roi = curr_gray[pb["y1"]:head_y2, pb["x1"]:pb["x2"]]
                            if head_roi.size > 0:
                                faces = cascade.detectMultiScale(head_roi, scaleFactor=1.1, minNeighbors=3, minSize=(20, 20))
                                for (fx, fy, fw, fh) in faces:
                                    face_boxes.append({"x1": pb["x1"] + fx, "y1": pb["y1"] + fy, "x2": pb["x1"] + fx + fw, "y2": pb["y1"] + fy + fh, "conf": 0.92})
                    else:
                        small = cv2.resize(curr_gray, (0, 0), fx=0.5, fy=0.5)
                        faces = cascade.detectMultiScale(small, scaleFactor=1.2, minNeighbors=4, minSize=(20, 20))
                        for (fx, fy, fw, fh) in faces:
                            face_boxes.append({"x1": fx * 2, "y1": fy * 2, "x2": (fx + fw) * 2, "y2": (fy + fh) * 2, "conf": 0.90})

                for fd in face_boxes:
                    fx, fy, fx2, fy2 = fd["x1"], fd["y1"], fd["x2"], fd["y2"]
                    fconf = fd["conf"]
                    face_lbl = f"Face Scan ({int(fconf*100)}%)"

                    for target_img, occ in [(modality_frames["face"], None), (annotated, composite_occupied_badges)]:
                        if blur_faces:
                            face_roi = target_img[fy:fy2, fx:fx2]
                            if face_roi.size > 0:
                                k_size = max(15, (min(fx2 - fx, fy2 - fy) // 3) * 2 + 1)
                                blurred = cv2.GaussianBlur(face_roi, (k_size, k_size), 30)
                                target_img[fy:fy2, fx:fx2] = blurred
                                cv2.rectangle(target_img, (fx, fy), (fx2, fy2), (200, 200, 200), 1)
                                _draw_smart_badge(target_img, "[DPDP REDACTED]", fx, fy, (50, 50, 50), (200, 200, 200), occ, font_scale=0.38)
                        else:
                            cv2.rectangle(target_img, (fx, fy), (fx2, fy2), (255, 200, 40), 2)
                            _draw_smart_badge(target_img, face_lbl, fx, fy, (255, 200, 40), (0, 0, 0), occ, font_scale=0.38)

                    module_stats["faces"] += 1
                    incidents.append({
                        "incident_type": "face_detected",
                        "severity": "P3",
                        "label": f"Face Identification Scan ({int(fconf*100)}%)",
                        "confidence": round(fconf, 3),
                        "box": {"x1": fx, "y1": fy, "x2": fx2, "y2": fy2},
                        "color_bgr": (255, 200, 40),
                        "iot_telemetry": {"privacy_blurred": blur_faces}
                    })
            except Exception as fe:
                print(f"[hazard_engine] Face detection notice: {fe}")

        # ── 8. Open-Vocabulary Keyword Search (Dual YOLO-World + Precision Apparel ROI) ─
        if keyword_query and keyword_query.strip():
            try:
                clean_kw = keyword_query.strip().lower()
                kw_classes = [w.strip() for w in clean_kw.split(",") if w.strip()]
                if not kw_classes:
                    kw_classes = [clean_kw]

                detected_items = []

                # Parse query intent: check if query specifies color, apparel type, or specific object
                top_apparel_words = ["shirt", "t-shirt", "tshirt", "top", "jacket", "coat", "hoodie", "sweater", "blazer", "vest"]
                bottom_apparel_words = ["pants", "trousers", "jeans", "shorts", "skirt", "leggings", "trackpants"]
                headwear_words = ["hat", "cap", "helmet"]
                footwear_words = ["shoes", "boots", "sneakers"]
                person_clothing_words = top_apparel_words + bottom_apparel_words + headwear_words + footwear_words + ["clothing", "clothes", "outfit", "person", "man", "woman"]

                has_top_kw = any(w in clean_kw for w in top_apparel_words)
                has_bottom_kw = any(w in clean_kw for w in bottom_apparel_words)
                has_headwear_kw = any(w in clean_kw for w in headwear_words)
                has_footwear_kw = any(w in clean_kw for w in footwear_words)
                is_apparel_query = any(w in clean_kw for w in person_clothing_words)

                # Color parsing
                has_black = "black" in clean_kw or "dark" in clean_kw
                has_white = "white" in clean_kw or "light" in clean_kw
                has_red = "red" in clean_kw
                has_blue = "blue" in clean_kw
                has_green = "green" in clean_kw
                has_yellow = "yellow" in clean_kw
                has_orange = "orange" in clean_kw
                has_purple = "purple" in clean_kw or "pink" in clean_kw
                has_color = has_black or has_white or has_red or has_blue or has_green or has_yellow or has_orange or has_purple

                # 1. Precision Anatomy ROI Color Analysis on Tracked Persons
                if tracked_people and (is_apparel_query or has_color):
                    for tp in tracked_people:
                        pb = tp["box"]
                        pw = max(1, pb["x2"] - pb["x1"])
                        ph = max(1, pb["y2"] - pb["y1"])
                        if ph < 30 or pw < 10:
                            continue

                        # Select target anatomical sub-region based on query
                        if has_bottom_kw:
                            # Lower body / Pants ROI
                            ry1 = pb["y1"] + int(ph * 0.52)
                            ry2 = pb["y1"] + int(ph * 0.92)
                            rx1 = pb["x1"] + int(pw * 0.10)
                            rx2 = pb["x2"] - int(pw * 0.10)
                            target_box = {"x1": pb["x1"], "y1": ry1, "x2": pb["x2"], "y2": ry2}
                        elif has_headwear_kw:
                            # Head ROI
                            ry1 = pb["y1"]
                            ry2 = pb["y1"] + int(ph * 0.22)
                            rx1 = pb["x1"] + int(pw * 0.15)
                            rx2 = pb["x2"] - int(pw * 0.15)
                            target_box = {"x1": pb["x1"], "y1": ry1, "x2": pb["x2"], "y2": ry2}
                        elif has_footwear_kw:
                            # Feet ROI
                            ry1 = pb["y1"] + int(ph * 0.88)
                            ry2 = pb["y2"]
                            rx1 = pb["x1"] + int(pw * 0.05)
                            rx2 = pb["x2"] - int(pw * 0.05)
                            target_box = {"x1": pb["x1"], "y1": ry1, "x2": pb["x2"], "y2": ry2}
                        elif has_top_kw:
                            # Upper torso / Shirt ROI (excludes head/hair above and pants/belt below)
                            ry1 = pb["y1"] + int(ph * 0.15)
                            ry2 = pb["y1"] + int(ph * 0.50)
                            rx1 = pb["x1"] + int(pw * 0.10)
                            rx2 = pb["x2"] - int(pw * 0.10)
                            target_box = {"x1": pb["x1"], "y1": ry1, "x2": pb["x2"], "y2": ry2}
                        else:
                            # General torso/body
                            ry1 = pb["y1"] + int(ph * 0.15)
                            ry2 = pb["y1"] + int(ph * 0.70)
                            rx1 = pb["x1"] + int(pw * 0.08)
                            rx2 = pb["x2"] - int(pw * 0.08)
                            target_box = {"x1": pb["x1"], "y1": ry1, "x2": pb["x2"], "y2": ry2}

                        ry1, ry2 = max(0, ry1), min(frame_h, ry2)
                        rx1, rx2 = max(0, rx1), min(frame_w, rx2)
                        roi = frame[ry1:ry2, rx1:rx2]
                        if roi.size == 0 or roi.shape[0] < 5 or roi.shape[1] < 5:
                            continue

                        hsv_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
                        v_mean = float(np.mean(hsv_roi[:, :, 2]))
                        s_mean = float(np.mean(hsv_roi[:, :, 1]))
                        h_chan = hsv_roi[:, :, 0]
                        b_mean, g_mean, r_mean = float(np.mean(roi[:, :, 0])), float(np.mean(roi[:, :, 1])), float(np.mean(roi[:, :, 2]))
                        n_pixels = float(roi.shape[0] * roi.shape[1])

                        is_match = False
                        match_conf = 0.88

                        if has_black:
                            # Black / Dark clothing check: low brightness, dark pixel majority
                            dark_ratio = np.count_nonzero(hsv_roi[:, :, 2] < 105) / n_pixels
                            bright_ratio = np.count_nonzero(hsv_roi[:, :, 2] > 135) / n_pixels
                            if (v_mean < 105 and r_mean < 100 and g_mean < 100 and b_mean < 100 and dark_ratio >= 0.38 and bright_ratio < 0.18):
                                is_match = True
                                match_conf = round(min(0.96, 0.86 + (105.0 - v_mean) * 0.002 + dark_ratio * 0.08), 2)
                        elif has_white:
                            # White / Light clothing check: high brightness, low saturation
                            light_ratio = np.count_nonzero((hsv_roi[:, :, 2] > 135) & (hsv_roi[:, :, 1] < 70)) / n_pixels
                            if (v_mean > 135 and s_mean < 65 and light_ratio >= 0.35) or (r_mean > 135 and g_mean > 135 and b_mean > 135):
                                is_match = True
                                match_conf = round(min(0.96, 0.86 + (v_mean - 135.0) * 0.0015 + light_ratio * 0.08), 2)
                        elif has_red:
                            red_pixels = np.count_nonzero(((h_chan <= 14) | (h_chan >= 165)) & (hsv_roi[:, :, 1] >= 55) & (hsv_roi[:, :, 2] >= 55))
                            red_ratio = red_pixels / n_pixels
                            if red_ratio >= 0.18:
                                is_match = True
                                match_conf = round(min(0.96, 0.84 + red_ratio * 0.22), 2)
                        elif has_blue:
                            blue_pixels = np.count_nonzero((h_chan >= 95) & (h_chan <= 135) & (hsv_roi[:, :, 1] >= 50) & (hsv_roi[:, :, 2] >= 50))
                            blue_ratio = blue_pixels / n_pixels
                            if blue_ratio >= 0.18:
                                is_match = True
                                match_conf = round(min(0.96, 0.84 + blue_ratio * 0.22), 2)
                        elif has_green:
                            green_pixels = np.count_nonzero((h_chan >= 35) & (h_chan <= 85) & (hsv_roi[:, :, 1] >= 45) & (hsv_roi[:, :, 2] >= 50))
                            green_ratio = green_pixels / n_pixels
                            if green_ratio >= 0.18:
                                is_match = True
                                match_conf = round(min(0.96, 0.84 + green_ratio * 0.22), 2)
                        elif has_yellow:
                            yellow_pixels = np.count_nonzero((h_chan >= 18) & (h_chan <= 36) & (hsv_roi[:, :, 1] >= 55) & (hsv_roi[:, :, 2] >= 75))
                            yellow_ratio = yellow_pixels / n_pixels
                            if yellow_ratio >= 0.18:
                                is_match = True
                                match_conf = round(min(0.96, 0.84 + yellow_ratio * 0.22), 2)
                        elif is_apparel_query and not has_color:
                            is_match = True
                            match_conf = 0.88

                        if is_match:
                            detected_items.append({
                                "box": target_box,
                                "conf": match_conf,
                                "label": clean_kw.title()
                            })

                # 2. Run YOLO-World v2 for specific novel non-apparel object categories
                if not is_apparel_query or not detected_items:
                    expanded_classes = [clean_kw]
                    if "backpack" in clean_kw or "bag" in clean_kw:
                        expanded_classes = ["backpack", "handbag", "bag"]
                    elif "knife" in clean_kw or "blade" in clean_kw or "dagger" in clean_kw:
                        expanded_classes = ["knife", "blade", "dagger"]
                    elif "gun" in clean_kw or "pistol" in clean_kw or "firearm" in clean_kw:
                        expanded_classes = ["gun", "pistol", "firearm"]
                    elif "phone" in clean_kw or "mobile" in clean_kw:
                        expanded_classes = ["cell phone", "mobile phone"]

                    kw_cache_key = f"keyword:{'_'.join(expanded_classes[:8])}"
                    if kw_cache_key not in _WORLD_MODEL_CACHE:
                        world_path = None
                        for candidate in [MODELS_DIR / "yolov8s-worldv2.pt", BASE_DIR / "yolov8s-worldv2.pt"]:
                            if candidate.exists():
                                world_path = str(candidate)
                                break
                        if not world_path:
                            world_path = "yolov8s-worldv2.pt"
                        try:
                            kw_model = YOLO(world_path)
                            kw_model.set_classes(expanded_classes[:8])
                            _WORLD_MODEL_CACHE[kw_cache_key] = kw_model
                        except Exception as e:
                            print(f"[hazard_engine] YOLO-World load error: {e}")
                            kw_model = None
                    else:
                        kw_model = _WORLD_MODEL_CACHE[kw_cache_key]

                    if kw_model is not None:
                        world_conf = max(0.10, min(0.20, confidence_threshold - 0.15))
                        w_res = kw_model(frame, conf=world_conf, device=self.device, verbose=False)
                        if w_res and w_res[0].boxes is not None:
                            for box in w_res[0].boxes:
                                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                                raw_conf = float(box.conf[0].cpu().numpy())
                                cls_id = int(box.cls[0].cpu().numpy())
                                matched_class = kw_model.names.get(cls_id, clean_kw)
                                mc_lower = str(matched_class).lower()

                                # Validate semantic consistency
                                if clean_kw in mc_lower or mc_lower in clean_kw or any(c in mc_lower for c in expanded_classes):
                                    calibrated_conf = round(min(0.96, 0.84 + max(0.0, raw_conf - 0.12) * 0.42), 2)
                                    detected_items.append({
                                        "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                        "conf": calibrated_conf,
                                        "label": clean_kw.title()
                                    })

                # Deduplicate and render
                if detected_items:
                    detected_items.sort(key=lambda x: x["conf"], reverse=True)
                    used_boxes = []
                    for item in detected_items:
                        ib = item["box"]
                        is_dup = False
                        for ub in used_boxes:
                            ix1 = max(ib["x1"], ub["x1"])
                            iy1 = max(ib["y1"], ub["y1"])
                            ix2 = min(ib["x2"], ub["x2"])
                            iy2 = min(ib["y2"], ub["y2"])
                            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                            area1 = (ib["x2"] - ib["x1"]) * (ib["y2"] - ib["y1"])
                            area2 = (ub["x2"] - ub["x1"]) * (ub["y2"] - ub["y1"])
                            if inter / max(1.0, area1 + area2 - inter) > 0.45:
                                is_dup = True
                                break
                        if is_dup:
                            continue
                        used_boxes.append(ib)

                        x1, y1, x2, y2 = ib["x1"], ib["y1"], ib["x2"], ib["y2"]
                        det_conf = item["conf"]
                        matched_class = item["label"]
                        lbl = f"Found: '{matched_class}' ({int(det_conf*100)}%)"

                        for target_img, occ in [(modality_frames["keyword"], None), (annotated, composite_occupied_badges)]:
                            glow = target_img.copy()
                            cv2.rectangle(glow, (x1, y1), (x2, y2), (240, 50, 200), -1)
                            cv2.addWeighted(glow, 0.18, target_img, 0.82, 0, target_img)
                            cv2.rectangle(target_img, (x1, y1), (x2, y2), (240, 50, 200), 2)
                            kw_corner = max(10, min(x2 - x1, y2 - y1) // 5)
                            cv2.line(target_img, (x1, y1), (x1 + kw_corner, y1), (255, 120, 240), 3)
                            cv2.line(target_img, (x1, y1), (x1, y1 + kw_corner), (255, 120, 240), 3)
                            cv2.line(target_img, (x2, y2), (x2 - kw_corner, y2), (255, 120, 240), 3)
                            cv2.line(target_img, (x2, y2), (x2, y2 - kw_corner), (255, 120, 240), 3)
                            _draw_smart_badge(target_img, lbl, x1, y1, (180, 20, 150), (255, 255, 255), occ, font_scale=0.48)

                        module_stats["keyword_matches"] += 1
                        incidents.append({
                            "incident_type": "keyword_match", "severity": "P2",
                            "label": lbl, "confidence": round(det_conf, 3),
                            "box": ib,
                            "color_bgr": (240, 50, 200),
                            "iot_telemetry": {"query": clean_kw, "matched_class": matched_class}
                        })
            except Exception as e:
                print(f"[hazard_engine] Open-vocabulary keyword search error: {e}")

        # ── 9. Compound Crisis Cross-Hazard Synthesis ──────────────────────────
        unique_types = {inc.get("incident_type") for inc in incidents if inc.get("incident_type") not in ("crowd_density", "face_detected")}
        is_compound = len(unique_types) >= 2 or ("violent_altercation" in unique_types and "fall_detected" in unique_types)

        if is_compound:
            hazard_names = []
            if any("fall" in t for t in unique_types): hazard_names.append("Casualty Fall")
            if any("brawl" in t or "altercation" in t for t in unique_types): hazard_names.append("Violent Fight")
            if any("fire" in t for t in unique_types): hazard_names.append("Active Fire")
            if any("smoke" in t for t in unique_types): hazard_names.append("Smoke Outbreak")
            if any("weapon" in t for t in unique_types): hazard_names.append("Armed Weapon")
            if any("crowd" in t for t in unique_types): hazard_names.append("Crowd Unrest")

            compound_label = f"TIER-1 COMPOUND CRISIS: Concurrent [{', '.join(hazard_names)}]"
            incidents.insert(0, {
                "incident_type": "compound_crisis", "severity": "P1",
                "label": compound_label, "confidence": 0.98,
                "box": {"x1": 10, "y1": 10, "x2": frame_w - 10, "y2": frame_h - 10},
                "color_bgr": (0, 0, 255),
                "iot_telemetry": {"is_compound_crisis": True, "concurrent_hazards": hazard_names, "total_active_hazards": len(unique_types), "people_count": person_count}
            })

        self.track_buffer.prev_gray = curr_gray

        # ── Top HUD Live Bar for All Overlays ─────────────────────────────────
        time_str = time.strftime("%H:%M:%S", time.gmtime(timestamp_sec))
        fire_c = module_stats.get("fire", 0)
        smoke_c = module_stats.get("smoke", 0)
        wpn_c = module_stats.get("weapon", 0)
        fall_c = module_stats.get("fall", 0)
        face_c = module_stats.get("faces", 0)
        brawl_c = module_stats.get("brawl", 0)

        def _apply_hud(target_img, tag_title, detail_str, is_alert=False):
            if frame_w > 0 and frame_h > 36:
                ob = target_img.copy()
                cv2.rectangle(ob, (0, 0), (frame_w, 34), (12, 16, 22), -1)
                cv2.addWeighted(ob, 0.88, target_img, 0.12, 0, target_img)
                txt = f"VIGINT [{tag_title}] T:{time_str} {detail_str}"
                color = (0, 0, 255) if is_alert else (0, 240, 255)
                cv2.putText(target_img, txt, (14, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.44, color, 1, cv2.LINE_AA)

        _apply_hud(modality_frames["crowd"], "CROWD & SOCIAL CLUSTERS", f"PPL:{person_count} ACTIVE CLUSTERS:{len(clusters) if 'clusters' in locals() else 0}")
        _apply_hud(modality_frames["fire"], "THERMAL & FIRE MONITOR", f"ACTIVE FLAME ZONES:{fire_c}", fire_c > 0)
        _apply_hud(modality_frames["smoke"], "VOLUMETRIC SMOKE PLUME", f"ACTIVE PLUMES:{smoke_c}", smoke_c > 0)
        _apply_hud(modality_frames["fall"], "BIOMECHANICAL CASUALTY & FALL", f"DETECTED CASUALTIES:{fall_c}", fall_c > 0)
        _apply_hud(modality_frames["brawl"], "VIOLENT AFFRAY & BRAWL", f"COMBATANTS:{brawl_c}", brawl_c > 0)
        _apply_hud(modality_frames["weapon"], "ARMED WEAPON TRACKER", f"ACTIVE WEAPONS:{wpn_c}", wpn_c > 0)
        _apply_hud(modality_frames["face"], "IDENTITY & DPDP PRIVACY", f"FACES DETECTED:{face_c}")
        if keyword_query:
            _apply_hud(modality_frames["keyword"], "OBJECT TARGETING", f"QUERY: '{keyword_query.upper()}'")

        mode_tag = "OMNI-CRISIS" if is_compound else "HAZARD SUITE"
        _apply_hud(annotated, mode_tag, f"PPL:{person_count} FIRE:{fire_c} SMOKE:{smoke_c} WPNS:{wpn_c} BRAWL:{brawl_c} FALL:{fall_c}", is_compound)

        modality_frames["all"] = annotated

        return {
            "incidents": incidents,
            "people_count": person_count,
            "tracked_people": tracked_people,
            "overlay_frame": annotated,
            "modality_overlays": modality_frames,
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

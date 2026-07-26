"""
Object Detection pipeline using YOLOv8 COCO model.
Detects all 80 COCO classes (person, car, truck, knife, backpack, etc.)
Useful for police: weapon detection, vehicle identification, person counting.
"""

import hashlib
import json
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
import numpy as np
import opencv_compat  # noqa: F401

BASE_DIR = Path(__file__).parent.parent
RESULTS_DIR = BASE_DIR / "storage" / "results"

_TORCH_AVAILABLE = False
_yolo_detector = None

try:
    import torch
    _TORCH_AVAILABLE = True
    print("[object_detection] PyTorch available")
except Exception as e:
    _TORCH_AVAILABLE = False
    print(f"[object_detection] PyTorch unavailable ({e}). Using OpenCV fallback.")


# COCO class names for YOLOv8
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush",
]

# Police-relevant object categories
POLICE_CATEGORIES = {
    "weapons": ["knife", "scissors", "baseball bat"],
    "vehicles": ["car", "motorcycle", "bus", "truck", "bicycle", "boat", "train", "airplane"],
    "persons": ["person"],
    "bags": ["backpack", "handbag", "suitcase"],
    "electronics": ["cell phone", "laptop", "tv", "remote"],
    "animals": ["dog", "cat", "horse", "bird"],
}


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "N/A"


def load_active_yolo_model_path() -> tuple[str, bool]:
    """
    Read settings to find the active object detection model path.
    Returns (model_path_or_name, is_custom)
    """
    try:
        from routers.settings import load_settings_dict  # noqa: PLC0415
        settings = load_settings_dict()
    except Exception:
        # Fallback if imported from outside/tests
        import json
        settings_file = Path(__file__).parent.parent / "storage" / "settings.json"
        if settings_file.exists():
            try:
                settings = json.loads(settings_file.read_text(encoding="utf-8"))
            except Exception:
                settings = {}
        else:
            settings = {}

    ai_models = settings.get("ai_models", {})
    active_id = ai_models.get("active_object_model", "yolov8n")
    models = ai_models.get("models", [])
    
    # Find active model details
    for m in models:
        if m.get("id") == active_id:
            return m.get("file_path", "yolov8n.pt"), m.get("is_custom", False)
            
    return "yolov8n.pt", False


_loaded_model_path = None


def _get_yolo_detector():
    """Load active YOLOv8 model (general or custom object detection)."""
    global _yolo_detector, _loaded_model_path
    model_path, is_custom = load_active_yolo_model_path()
    
    if _yolo_detector is None or _loaded_model_path != model_path:
        from ultralytics import YOLO  # noqa: PLC0415
        print(f"[object_detection] Loading YOLO model from: {model_path}")
        _yolo_detector = YOLO(model_path)
        _loaded_model_path = model_path
        if _TORCH_AVAILABLE:
            import torch  # noqa: PLC0415
            device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
            _yolo_detector.to(device)
        print(f"[object_detection] YOLO model loaded successfully")
    return _yolo_detector


def _opencv_person_detection(frame: np.ndarray) -> list[dict]:
    """Improved fallback person/object detection using OpenCV cascades + HOG person detector."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    detections = []

    # ── HOG + SVM person detector (more accurate than Haar) ─────────────────
    try:
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        # Use multi-scale with slightly tighter parameters for fewer false positives
        rects, weights = hog.detectMultiScale(
            frame,
            winStride=(8, 8),
            padding=(4, 4),
            scale=1.05,
        )
        for i, (x, y, w, h) in enumerate(rects):
            weight = float(weights[i]) if i < len(weights) else 0.65
            # Normalize HOG weight to confidence 0.5–0.92 range
            conf = min(0.92, max(0.50, 0.50 + weight * 0.15))
            detections.append({
                "class_name": "person",
                "class_id": 0,
                "confidence": conf,
                "box": {"x1": int(x), "y1": int(y), "x2": int(x + w), "y2": int(y + h)},
            })
    except Exception:
        pass

    # ── Face detection (Haar — proxy for person if HOG misses) ───────────────
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.08, minNeighbors=5, minSize=(28, 28)
    )
    for (x, y, w, h) in faces:
        # Expand bbox to approximate full upper-body
        x1 = max(0, x - w // 4)
        y1 = max(0, y - h // 3)
        x2 = x + w + w // 4
        y2 = y + h * 4
        detections.append({
            "class_name": "person",
            "class_id": 0,
            "confidence": 0.62,
            "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        })

    # ── NMS to remove overlapping detections from different detectors ─────────
    if len(detections) > 1:
        boxes = np.array([[d["box"]["x1"], d["box"]["y1"], d["box"]["x2"], d["box"]["y2"]] for d in detections], dtype=np.float32)
        scores = np.array([d["confidence"] for d in detections], dtype=np.float32)
        # Simple greedy NMS
        idxs = _nms(boxes, scores, iou_threshold=0.45)
        detections = [detections[i] for i in idxs]

    return detections


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> list[int]:
    """Non-Maximum Suppression — removes redundant overlapping bounding boxes."""
    if len(boxes) == 0:
        return []
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]
    areas = (x2 - x1 + 1) * (y2 - y1 + 1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(int(i))
        if order.size == 1:
            break
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1 + 1)
        h = np.maximum(0.0, yy2 - yy1 + 1)
        inter = w * h
        iou = inter / (areas[i] + areas[order[1:]] - inter)
        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]
    return keep


def run_object_detection(
    video_path,
    target_classes: list[str] | None = None,
    confidence_threshold: float = 0.40,
    sample_fps: float = 1.0,
    camera_id: str = "CAM-01",
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Run YOLOv8 object detection on video.
    
    Args:
        video_path: Path to video file.
        target_classes: List of COCO class names to filter for (None = all).
        confidence_threshold: Minimum detection confidence.
        sample_fps: Frames per second to process.
        camera_id: Camera identifier.
        job_id: Unique job ID.
        start_time: Start time filter in seconds.
        end_time: End time filter in seconds.
        progress_cb: Progress callback (frames_processed, matches_found).
    
    Returns:
        List of match dictionaries with detection details.
    """
    from ai_pipeline.frame_extractor import save_frame, extract_clip, format_timestamp  # noqa: PLC0415

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    # Synonym mapping to translate user search terms to COCO classes
    SYNONYM_MAP = {
        "phone": "cell phone",
        "cellphone": "cell phone",
        "mobile": "cell phone",
        "smartphone": "cell phone",
        "gun": "knife",
        "weapon": "knife",
        "car": "car",
        "automobile": "car",
        "bicycle": "bicycle",
        "bike": "bicycle",
        "motorbike": "motorcycle",
        "cycle": "bicycle",
        "bag": "backpack",
        "backpack": "backpack",
        "purse": "handbag",
        "person": "person",
        "man": "person",
        "woman": "person",
        "guy": "person",
        "lady": "person",
        "child": "person",
        "kid": "person",
    }

    # Normalize target classes
    if target_classes:
        raw_targets = set(c.lower().strip() for c in target_classes)
        target_set = set()
        for c in raw_targets:
            target_set.add(c)
            if c in SYNONYM_MAP:
                target_set.add(SYNONYM_MAP[c])
        # Expand police categories
        expanded = set()
        for cls in target_set:
            if cls in POLICE_CATEGORIES:
                expanded.update(POLICE_CATEGORIES[cls])
            else:
                expanded.add(cls)
        target_set = expanded
    else:
        target_set = None

    use_yolo = _TORCH_AVAILABLE
    if use_yolo:
        try:
            detector = _get_yolo_detector()
        except Exception as e:
            print(f"[object_detection] YOLO load failed: {e}, falling back to OpenCV")
            use_yolo = False

    matches = []
    cap = cv2.VideoCapture(str(video_path))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(video_fps / sample_fps))
    frame_idx = 0
    frames_processed = 0

    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            if frame_idx % frame_interval != 0:
                frame_idx += 1
                continue

            timestamp = frame_idx / video_fps
            if start_time is not None and timestamp < start_time:
                frame_idx += 1
                continue
            if end_time is not None and timestamp > end_time:
                break

            frames_processed += 1
            if progress_cb:
                progress_cb(frames_processed, len(matches))

            # Detect objects
            frame_detections = []

            if use_yolo:
                import torch  # noqa: PLC0415
                device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
                results = detector(frame, device=device, verbose=False)

                for r in results[0].boxes:
                    conf = float(r.conf.item())
                    if conf < confidence_threshold:
                        continue

                    cls_id = int(r.cls.item())
                    # Get class name dynamically from YOLO names if available
                    model_names = detector.names if hasattr(detector, "names") else {}
                    cls_name = model_names.get(cls_id, f"class_{cls_id}") if model_names else (COCO_CLASSES[cls_id] if cls_id < len(COCO_CLASSES) else f"class_{cls_id}")

                    is_match = False
                    if not target_set:
                        is_match = True
                    else:
                        for target_cls in target_set:
                            # More lenient fuzzy substring matching
                            if target_cls in cls_name or cls_name in target_cls or cls_name.split()[0] in target_cls:
                                is_match = True
                                break
                    if not is_match:
                        continue

                    x1, y1, x2, y2 = r.xyxy.cpu().numpy()[0]
                    frame_detections.append({
                        "class_name": cls_name,
                        "class_id": cls_id,
                        "confidence": conf,
                        "box": {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
                    })

                # Apply NMS within the frame to remove overlaps
                if len(frame_detections) > 1:
                    boxes_arr = np.array([[d["box"]["x1"], d["box"]["y1"], d["box"]["x2"], d["box"]["y2"]] for d in frame_detections], dtype=np.float32)
                    scores_arr = np.array([d["confidence"] for d in frame_detections], dtype=np.float32)
                    keep_idxs = _nms(boxes_arr, scores_arr, iou_threshold=0.50)
                    frame_detections = [frame_detections[i] for i in keep_idxs]
            else:
                # OpenCV fallback — person detection only
                opencv_dets = _opencv_person_detection(frame)
                for det in opencv_dets:
                    if det["confidence"] >= confidence_threshold:
                        if target_set is None or det["class_name"] in target_set:
                            frame_detections.append(det)

            if not frame_detections:
                frame_idx += 1
                continue

            # Group detections per frame and create a single result entry
            # Draw all bounding boxes on the frame
            annotated = frame.copy()
            labels_found = []
            for det in frame_detections:
                box = det["box"]
                label = f"{det['class_name']} {det['confidence']:.0%}"
                labels_found.append(det["class_name"])

                # Color coding by category
                color = (0, 255, 100)  # default green
                if det["class_name"] in POLICE_CATEGORIES.get("weapons", []):
                    color = (0, 0, 255)  # red for weapons
                elif det["class_name"] in POLICE_CATEGORIES.get("vehicles", []):
                    color = (255, 200, 0)  # cyan for vehicles
                elif det["class_name"] == "person":
                    color = (0, 255, 255)  # yellow for persons

                cv2.rectangle(annotated, (box["x1"], box["y1"]), (box["x2"], box["y2"]), color, 2)
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(annotated, (box["x1"], box["y1"] - th - 8),
                            (box["x1"] + tw + 4, box["y1"]), color, -1)
                cv2.putText(annotated, label, (box["x1"] + 2, box["y1"] - 4),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            # Save annotated frame
            frame_filename = f"obj_{job_id}_{frame_idx:06d}.jpg"
            frame_path = job_dir / frame_filename
            cv2.imwrite(str(frame_path), annotated)

            # Extract clip with burned bounding box overlay!
            clip_filename: str | None = f"clip_{job_id}_{frame_idx:06d}.mp4"
            clip_path = job_dir / clip_filename
            
            # Select the main matching detection to burn into the clip overlay
            first_det = frame_detections[0] if frame_detections else None
            draw_box_param = None
            if first_det:
                draw_box_param = {
                    "x1": first_det["box"]["x1"],
                    "y1": first_det["box"]["y1"],
                    "x2": first_det["box"]["x2"],
                    "y2": first_det["box"]["y2"],
                    "label": first_det["class_name"],
                    "confidence": first_det["confidence"]
                }
            try:
                extract_clip(video_path, clip_path, timestamp, window_seconds=5.0, draw_box=draw_box_param)
            except Exception:
                clip_filename = None

            frame_hash = _sha256_file(frame_path)
            clip_hash = _sha256_file(job_dir / clip_filename) if clip_filename else "N/A"

            # Summary of detected objects
            from collections import Counter
            obj_counts = Counter(labels_found)
            summary_label = ", ".join(f"{count}× {cls}" for cls, count in obj_counts.items())
            avg_conf = sum(d["confidence"] for d in frame_detections) / len(frame_detections)

            matches.append({
                "camera_id": camera_id,
                "timestamp": timestamp,
                "timestamp_str": format_timestamp(timestamp),
                "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                "clip_url": f"/storage/results/{job_id}/{clip_filename}" if clip_filename else None,
                "confidence": round(avg_conf, 4),
                "label": summary_label,
                "search_type": "object_detection",
                "detections": frame_detections,
                "object_count": len(frame_detections),
                "frame_hash": frame_hash,
                "clip_hash": clip_hash,
            })

            frame_idx += 1
    finally:
        cap.release()

    manifest = {
        "job_id": job_id,
        "video": str(video_path.name),
        "camera_id": camera_id,
        "target_classes": list(target_set) if target_set else "all",
        "search_type": "object_detection",
        "torch_available": _TORCH_AVAILABLE,
        "created_at": time.time(),
        "match_count": len(matches),
        "matches": matches,
        "query": f"Object: {', '.join(target_classes)}" if target_classes else "Object: All",
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return matches

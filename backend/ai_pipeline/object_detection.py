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


def _get_yolo_detector():
    """Load YOLOv8n COCO model (general object detection)."""
    global _yolo_detector
    if _yolo_detector is None:
        from ultralytics import YOLO  # noqa: PLC0415
        _yolo_detector = YOLO("yolov8n.pt")  # Downloads automatically if not present
        if _TORCH_AVAILABLE:
            import torch  # noqa: PLC0415
            device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
            _yolo_detector.to(device)
        print("[object_detection] YOLOv8n COCO model loaded")
    return _yolo_detector


def _opencv_person_detection(frame: np.ndarray) -> list[dict]:
    """Fallback person/object detection using OpenCV Haar cascades."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    detections = []

    # Face detection (proxy for person)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    for (x, y, w, h) in faces:
        detections.append({
            "class_name": "person",
            "class_id": 0,
            "confidence": 0.6,
            "box": {"x1": int(x), "y1": int(y), "x2": int(x + w), "y2": int(y + h)},
        })

    # Full body detection
    body_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_fullbody.xml"
    )
    bodies = body_cascade.detectMultiScale(gray, 1.1, 3, minSize=(40, 80))
    for (x, y, w, h) in bodies:
        detections.append({
            "class_name": "person",
            "class_id": 0,
            "confidence": 0.5,
            "box": {"x1": int(x), "y1": int(y), "x2": int(x + w), "y2": int(y + h)},
        })

    return detections


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

    # Normalize target classes
    if target_classes:
        target_set = set(c.lower().strip() for c in target_classes)
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
                    cls_name = COCO_CLASSES[cls_id] if cls_id < len(COCO_CLASSES) else f"class_{cls_id}"

                    if target_set and cls_name not in target_set:
                        continue

                    x1, y1, x2, y2 = r.xyxy.cpu().numpy()[0]
                    frame_detections.append({
                        "class_name": cls_name,
                        "class_id": cls_id,
                        "confidence": conf,
                        "box": {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
                    })
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

            # Extract clip
            clip_filename: str | None = f"clip_{job_id}_{frame_idx:06d}.mp4"
            clip_path = job_dir / clip_filename
            try:
                extract_clip(video_path, clip_path, timestamp, window_seconds=5.0)
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
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return matches

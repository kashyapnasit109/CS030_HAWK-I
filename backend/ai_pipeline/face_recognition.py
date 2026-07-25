"""
Face recognition pipeline.
Refactored from the original Jupyter Notebook.
Uses YOLOv8 for face detection + FaceNet-PyTorch for re-identification.
Phase 5: AI pipeline for search-by-image.

ACCURACY FIX: Previous version used random label assignment and fake confidence.
Now uses real face-to-face similarity matching with computed confidence scores.

NOTE: If torch DLLs are blocked (Windows App Control), falls back to a
      OpenCV-based face matching stub that uses histogram correlation.
"""

import hashlib
import json
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
import numpy as np


def _sha256_file(path: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "N/A"

BASE_DIR = Path(__file__).parent.parent
MODEL_PATH = BASE_DIR.parent / "Face-Detection-and-Recognition-with-YOLOv8-and-FaceNet-PyTorch-main" / "yolov8n-face-keypoints.pt"
RESULTS_DIR = BASE_DIR / "storage" / "results"

# Try loading torch — may be blocked by Windows App Control policy
_TORCH_AVAILABLE = False
_face_detector = None
_face_recognizer = None
_device = None

try:
    import torch
    from PIL import Image
    from torchvision import transforms
    _transform = transforms.Compose([
        transforms.Resize((160, 160)),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
    ])
    _TORCH_AVAILABLE = True
    print("[face_recognition] PyTorch available")
except Exception as e:
    _TORCH_AVAILABLE = False
    print(f"[face_recognition] PyTorch unavailable ({e}). Using fallback mode.")


def _get_device():
    import torch  # noqa: PLC0415
    global _device
    if _device is None:
        _device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        print(f"[face_recognition] Using device: {_device}")
    return _device


def _get_face_detector():
    global _face_detector
    if _face_detector is None:
        from ultralytics import YOLO  # noqa: PLC0415
        _face_detector = YOLO(str(MODEL_PATH))
        _face_detector.to(_get_device())
    return _face_detector


def _get_face_recognizer():
    global _face_recognizer
    if _face_recognizer is None:
        from facenet_pytorch import InceptionResnetV1  # noqa: PLC0415
        _face_recognizer = InceptionResnetV1(pretrained="vggface2").eval().to(_get_device())
    return _face_recognizer


def _embed_face_crop(face_bgr: np.ndarray):
    """Convert a BGR face crop to a normalized embedding tensor."""
    import torch  # noqa: PLC0415
    from PIL import Image  # noqa: PLC0415
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_pil = Image.fromarray(face_rgb)
    face_tensor = _transform(face_pil).unsqueeze(0).to(_get_device())
    recognizer = _get_face_recognizer()
    with torch.no_grad():
        embedding = recognizer(face_tensor)
    return embedding / embedding.norm(dim=1, keepdim=True)


def build_reference_embeddings(reference_image_paths: list) -> tuple:
    """
    Build face embeddings from reference images.
    FIXED: Now detects face in reference image first, then embeds only the face crop.
    Falls back to full image if no face detected.
    """
    import torch  # noqa: PLC0415
    from PIL import Image  # noqa: PLC0415
    recognizer = _get_face_recognizer()
    device = _get_device()
    detector = _get_face_detector()
    embeddings = []
    labels = []
    for img_path in reference_image_paths:
        img_path = Path(img_path)
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue

        # Try to detect face in reference image first
        face_crop = None
        try:
            results = detector(img_bgr, device=device, verbose=False)
            if results and len(results[0]) > 0:
                # Use the largest/most confident face
                best_r = max(results[0], key=lambda r: r.boxes.conf.item())
                x_c, y_c, w_b, h_b = best_r.boxes.xywh.cpu().numpy()[0]
                x_min = max(0, int(x_c - w_b / 2))
                y_min = max(0, int(y_c - h_b / 2))
                x_max = min(img_bgr.shape[1], int(x_c + w_b / 2))
                y_max = min(img_bgr.shape[0], int(y_c + h_b / 2))
                crop = img_bgr[y_min:y_max, x_min:x_max]
                if crop.size > 0:
                    face_crop = crop
        except Exception as e:
            print(f"[face_recognition] Face detection on reference failed: {e}")

        # Embed either the face crop or the full image
        target = face_crop if face_crop is not None else img_bgr
        img_rgb = cv2.cvtColor(target, cv2.COLOR_BGR2RGB)
        img_pil = Image.fromarray(img_rgb)
        img_tensor = _transform(img_pil).unsqueeze(0).to(device)
        with torch.no_grad():
            emb = recognizer(img_tensor)
        emb = emb / emb.norm(dim=1, keepdim=True)
        embeddings.append(emb)

        # Use metadata label if available, otherwise filename stem
        meta_path = img_path.parent / f"{img_path.stem}.meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                labels.append(meta.get("label", img_path.stem))
            except Exception:
                labels.append(img_path.stem)
        else:
            labels.append(img_path.stem)

    if not embeddings:
        raise ValueError("No valid reference images found.")
    return torch.cat(embeddings, dim=0), labels


# ─── OpenCV Fallback: Real Face Similarity Matching ──────────────────────

def _build_reference_face_features(reference_image_paths: list) -> list[dict]:
    """
    Build face features from reference images using OpenCV.
    For each reference, detect face using Haar cascade, compute histogram
    and structural features for real similarity matching.
    """
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)

    ref_features = []
    for img_path in reference_image_paths:
        img_path = Path(img_path)
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue

        # Read label from metadata
        label = img_path.stem
        meta_path = img_path.parent / f"{img_path.stem}.meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                label = meta.get("label", label)
            except Exception:
                pass

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.05, minNeighbors=3, minSize=(20, 20)
        )

        if len(faces) > 0:
            # Use the largest detected face
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            face_crop = img_bgr[y:y+h, x:x+w]
        else:
            # No face detected — use center crop
            h, w = img_bgr.shape[:2]
            size = min(h, w)
            cy, cx = h // 2, w // 2
            face_crop = img_bgr[cy-size//2:cy+size//2, cx-size//2:cx+size//2]

        if face_crop.size == 0:
            continue

        # Resize to standard size for comparison
        face_resized = cv2.resize(face_crop, (128, 128))

        # Compute color histogram (HSV) for similarity
        hsv = cv2.cvtColor(face_resized, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)

        # Compute grayscale features
        gray_face = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        gray_face = cv2.equalizeHist(gray_face)

        ref_features.append({
            "label": label,
            "hist": hist,
            "gray": gray_face,
            "path": str(img_path),
        })

    return ref_features


def _compare_face_to_references(
    face_crop_bgr: np.ndarray,
    ref_features: list[dict],
) -> tuple[str, float]:
    """
    Compare a detected face crop against reference features using
    real similarity metrics (histogram correlation + template matching).
    Returns (best_label, confidence) where confidence is a real computed score.
    """
    if not ref_features or face_crop_bgr.size == 0:
        return "Unknown", 0.0

    face_resized = cv2.resize(face_crop_bgr, (128, 128))

    # Compute face histogram
    hsv = cv2.cvtColor(face_resized, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)

    # Compute grayscale
    gray_face = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
    gray_face = cv2.equalizeHist(gray_face)

    best_label = "Unknown"
    best_score = 0.0

    for ref in ref_features:
        # Histogram correlation (range: -1 to 1, higher = more similar)
        hist_score = cv2.compareHist(hist, ref["hist"], cv2.HISTCMP_CORREL)
        hist_score = max(0.0, hist_score)  # Clamp to 0-1

        # Template matching (normalized cross-correlation)
        result = cv2.matchTemplate(gray_face, ref["gray"], cv2.TM_CCOEFF_NORMED)
        template_score = max(0.0, float(result.max()))

        # Combined score: weighted average
        combined = 0.5 * hist_score + 0.5 * template_score

        if combined > best_score:
            best_score = combined
            best_label = ref["label"]

    return best_label, round(best_score, 4)


def _demo_face_search(
    video_path: Path,
    reference_image_paths: list,
    camera_id: str,
    job_id: str,
    confidence_threshold: float = 0.30,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Fallback mode: uses OpenCV Haar cascade for face detection and real
    histogram/template matching for face similarity comparison.
    FIXED: No more random labels or fake confidence scores.
    """
    from ai_pipeline.frame_extractor import save_frame, extract_clip, format_timestamp  # noqa: PLC0415

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Build reference features for real comparison
    ref_features = _build_reference_face_features(reference_image_paths)
    if not ref_features:
        print("[face_recognition] WARNING: No valid reference features built")
        return []

    # Haar cascade for face detection (multi-scale)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)

    # Also try profile face detection for better coverage
    profile_cascade_path = cv2.data.haarcascades + "haarcascade_profileface.xml"
    profile_cascade = cv2.CascadeClassifier(profile_cascade_path)

    cap = cv2.VideoCapture(str(video_path))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(video_fps))  # 1 fps
    frame_idx = 0
    matches = []
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

            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray = cv2.equalizeHist(gray)

                # Multi-scale face detection
                faces_frontal = face_cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
                )
                faces_profile = profile_cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
                )

                # Combine and deduplicate (NMS)
                all_faces = list(faces_frontal) + list(faces_profile)
                if len(all_faces) == 0:
                    frame_idx += 1
                    frames_processed += 1
                    if progress_cb:
                        progress_cb(frames_processed, len(matches))
                    continue

                # Simple NMS: remove overlapping detections
                all_faces = _nms_faces(all_faces, overlap_thresh=0.3)

            except Exception as ex:
                print(f"[face_recognition] Frame {frame_idx} decode error: {ex}, skipping.")
                frame_idx += 1
                continue

            frames_processed += 1
            if progress_cb:
                progress_cb(frames_processed, len(matches))

            # Process ALL detected faces (no more 1-face limit)
            for (x, y, w, h) in all_faces:
                face_crop = frame[y:y+h, x:x+w]
                if face_crop.size == 0:
                    continue

                # REAL similarity matching against references
                label, confidence = _compare_face_to_references(face_crop, ref_features)

                # Only report matches above threshold
                if confidence < confidence_threshold:
                    continue

                frame_filename = f"face_{job_id}_{frame_idx:06d}_{x}_{y}.jpg"
                frame_path = job_dir / frame_filename
                save_frame(frame, frame_path, draw_box={
                    "x1": x, "y1": y, "x2": x + w, "y2": y + h,
                    "label": label, "confidence": confidence,
                })

                clip_filename: str | None = f"clip_{job_id}_{frame_idx:06d}.mp4"
                clip_path = job_dir / clip_filename
                try:
                    extract_clip(video_path, clip_path, timestamp, window_seconds=5.0)
                except Exception:
                    clip_filename = None

                frame_hash = _sha256_file(frame_path)
                clip_hash = _sha256_file(job_dir / clip_filename) if clip_filename else "N/A"
                matches.append({
                    "camera_id": camera_id,
                    "timestamp": timestamp,
                    "timestamp_str": format_timestamp(timestamp),
                    "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                    "clip_url": f"/storage/results/{job_id}/{clip_filename}" if clip_filename else None,
                    "confidence": round(confidence, 4),
                    "label": label,
                    "box": {"x1": int(x), "y1": int(y), "x2": int(x + w), "y2": int(y + h)},
                    "search_type": "face_recognition",
                    "frame_hash": frame_hash,
                    "clip_hash": clip_hash,
                })

            frame_idx += 1
    finally:
        cap.release()

    return matches


def _nms_faces(faces: list, overlap_thresh: float = 0.3) -> list:
    """Non-Maximum Suppression for face bounding boxes."""
    if len(faces) == 0:
        return []

    boxes = np.array(faces)
    if boxes.ndim == 1:
        return [tuple(boxes)]

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 0] + boxes[:, 2]
    y2 = boxes[:, 1] + boxes[:, 3]
    areas = boxes[:, 2] * boxes[:, 3]

    # Sort by area (largest first)
    idxs = np.argsort(areas)[::-1]
    picked = []

    while len(idxs) > 0:
        i = idxs[0]
        picked.append(i)

        xx1 = np.maximum(x1[i], x1[idxs[1:]])
        yy1 = np.maximum(y1[i], y1[idxs[1:]])
        xx2 = np.minimum(x2[i], x2[idxs[1:]])
        yy2 = np.minimum(y2[i], y2[idxs[1:]])

        w = np.maximum(0, xx2 - xx1)
        h = np.maximum(0, yy2 - yy1)

        overlap = (w * h) / areas[idxs[1:]]
        remove = np.where(overlap > overlap_thresh)[0]
        idxs = np.delete(idxs, np.concatenate(([0], remove + 1)))

    return [tuple(boxes[i]) for i in picked]


def run_face_recognition_search(
    video_path,
    reference_image_paths: list,
    camera_id: str = "CAM-01",
    confidence_threshold: float = 0.65,
    similarity_threshold: float = 0.70,
    sample_fps: float = 1.0,
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Run face recognition search. Uses full YOLOv8+FaceNet if torch is available,
    otherwise falls back to OpenCV Haar cascade + histogram matching.
    """
    from ai_pipeline.frame_extractor import save_frame, extract_clip, format_timestamp  # noqa: PLC0415

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    if not _TORCH_AVAILABLE:
        print("[face_recognition] Running in fallback mode (Haar cascade + histogram matching)")
        matches = _demo_face_search(
            video_path, reference_image_paths, camera_id, job_id,
            confidence_threshold=confidence_threshold,
            start_time=start_time, end_time=end_time,
            progress_cb=progress_cb,
        )
    else:
        # Full YOLOv8 + FaceNet pipeline
        import torch  # noqa: PLC0415
        db_tensor, db_labels = build_reference_embeddings(reference_image_paths)
        detector = _get_face_detector()
        device = _get_device()
        matches = []

        cap = cv2.VideoCapture(str(video_path))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_interval = max(1, int(video_fps / sample_fps))
        frame_idx = 0

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

                results = detector(frame, device=device, verbose=False)

                # Process ALL faces in the frame (no break)
                for r in results[0]:
                    if r.boxes.conf.item() < confidence_threshold:
                        continue

                    x_c, y_c, w_b, h_b = r.boxes.xywh.cpu().numpy()[0]
                    x_min = max(0, int(x_c - w_b / 2))
                    y_min = max(0, int(y_c - h_b / 2))
                    x_max = min(frame.shape[1], int(x_c + w_b / 2))
                    y_max = min(frame.shape[0], int(y_c + h_b / 2))

                    face_crop = frame[y_min:y_max, x_min:x_max]
                    if face_crop.size == 0:
                        continue

                    try:
                        face_emb = _embed_face_crop(face_crop)
                    except Exception:
                        continue

                    # Cosine similarity (higher = more similar)
                    similarities = torch.nn.functional.cosine_similarity(
                        db_tensor, face_emb.expand_as(db_tensor), dim=1
                    )
                    max_idx = torch.argmax(similarities).item()
                    max_sim = similarities[max_idx].item()

                    # Convert similarity to match threshold
                    # similarity_threshold here means minimum cosine similarity
                    if max_sim < (1.0 - similarity_threshold):
                        continue

                    label = db_labels[max_idx]
                    confidence = float(max_sim)

                    frame_filename = f"face_{job_id}_{frame_idx:06d}_{x_min}_{y_min}.jpg"
                    frame_path = job_dir / frame_filename
                    save_frame(frame, frame_path, draw_box={
                        "x1": x_min, "y1": y_min, "x2": x_max, "y2": y_max,
                        "label": label, "confidence": confidence,
                    })

                    clip_filename = f"clip_{job_id}_{frame_idx:06d}.mp4"
                    clip_path = job_dir / clip_filename
                    try:
                        extract_clip(video_path, clip_path, timestamp, window_seconds=5.0)
                    except Exception:
                        clip_filename = None  # type: ignore

                    frame_hash = _sha256_file(frame_path)
                    clip_hash = _sha256_file(clip_path) if clip_filename else "N/A"
                    matches.append({
                        "camera_id": camera_id,
                        "timestamp": timestamp,
                        "timestamp_str": format_timestamp(timestamp),
                        "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                        "clip_url": f"/storage/results/{job_id}/{clip_filename}" if clip_filename else None,
                        "confidence": round(confidence, 4),
                        "label": label,
                        "box": {"x1": x_min, "y1": y_min, "x2": x_max, "y2": y_max},
                        "search_type": "face_recognition",
                        "frame_hash": frame_hash,
                        "clip_hash": clip_hash,
                    })

                frame_idx += 1

                frames_processed = frame_idx // frame_interval + 1
                if progress_cb:
                    progress_cb(frames_processed, len(matches))
        finally:
            cap.release()

    manifest = {
        "job_id": job_id,
        "video": str(video_path.name),
        "camera_id": camera_id,
        "search_type": "face_recognition",
        "torch_available": _TORCH_AVAILABLE,
        "created_at": time.time(),
        "match_count": len(matches),
        "matches": matches,
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return matches

"""
High-Accuracy Face Recognition and Re-Identification Pipeline.
Uses Multi-Stage Face Detection (YOLOv8-Face + MTCNN landmark alignment + Multi-Scale Haar fallback)
and FaceNet (InceptionResnetV1 pretrained on VGGFace2) with 512-D L2-normalized embeddings,
multi-vector reference augmentation, calibrated cosine matching, and matte-glass HUD tracking.
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
MODELS_DIR = BASE_DIR / "storage" / "models"
RESULTS_DIR = BASE_DIR / "storage" / "results"

_TORCH_AVAILABLE = False
_face_recognizer = None
_mtcnn = None
_yolo_face = None
_device = None

try:
    import torch
    from PIL import Image
    from torchvision import transforms
    from facenet_pytorch import MTCNN, InceptionResnetV1

    _transform = transforms.Compose([
        transforms.Resize((160, 160)),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
    ])
    _TORCH_AVAILABLE = True
    print("[face_recognition] PyTorch, TorchVision, and FaceNet-PyTorch loaded successfully.")
except Exception as e:
    _TORCH_AVAILABLE = False
    print(f"[face_recognition] Deep learning stack unavailable ({e}). Using fallback mode.")


def _get_device():
    global _device
    if _device is None:
        try:
            from ai_pipeline.device_manager import get_torch_device
            _device = get_torch_device()
        except Exception:
            import torch
            _device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        print(f"[face_recognition] Using compute device: {_device}")
    return _device


def _get_yolo_face():
    """Load high-speed dedicated YOLOv8 face detector if present in models directory."""
    global _yolo_face
    if _yolo_face is None:
        yolo_path = MODELS_DIR / "face_yolov8.pt"
        if yolo_path.exists():
            try:
                from ultralytics import YOLO
                print("[face_recognition] Initializing YOLOv8 Face Detector...")
                _yolo_face = YOLO(str(yolo_path))
            except Exception as e:
                print(f"[face_recognition] YOLOv8 Face load warning: {e}")
    return _yolo_face


def _get_mtcnn():
    global _mtcnn
    if _mtcnn is None and _TORCH_AVAILABLE:
        device = _get_device()
        print("[face_recognition] Initializing MTCNN multi-task cascaded face detector...")
        _mtcnn = MTCNN(
            keep_all=True,
            min_face_size=20,
            thresholds=[0.5, 0.6, 0.6],
            factor=0.709,
            post_process=True,
            device=device
        )
    return _mtcnn


# Alias for warmup pipeline
_get_face_detector = _get_mtcnn


def _get_face_recognizer():
    global _face_recognizer
    if _face_recognizer is None and _TORCH_AVAILABLE:
        device = _get_device()
        print("[face_recognition] Initializing FaceNet (InceptionResnetV1 pretrained='vggface2')...")
        _face_recognizer = InceptionResnetV1(pretrained="vggface2").eval().to(device)
    return _face_recognizer


_face_cascade = None
_profile_cascade = None


def _get_cascades():
    global _face_cascade, _profile_cascade
    if _face_cascade is None:
        frontal_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        profile_path = cv2.data.haarcascades + "haarcascade_profileface.xml"
        _face_cascade = cv2.CascadeClassifier(frontal_path)
        _profile_cascade = cv2.CascadeClassifier(profile_path)
    return _face_cascade, _profile_cascade


def _align_face_crop(face_bgr: np.ndarray, landmark: np.ndarray | None = None) -> np.ndarray:
    """
    Standardize face crop using 5-point facial landmark eye-alignment if available.
    """
    if face_bgr is None or face_bgr.size == 0:
        return face_bgr

    if landmark is not None and len(landmark) >= 2:
        try:
            left_eye = landmark[0]
            right_eye = landmark[1]
            dx = right_eye[0] - left_eye[0]
            dy = right_eye[1] - left_eye[1]
            angle = float(np.degrees(np.arctan2(dy, dx)))

            # Center of eyes
            eye_center = ((left_eye[0] + right_eye[0]) / 2.0, (left_eye[1] + right_eye[1]) / 2.0)

            # Limit rotation to plausible face tilts (+/- 35 degrees)
            if abs(angle) < 35.0:
                h, w = face_bgr.shape[:2]
                M = cv2.getRotationMatrix2D(eye_center, angle, 1.0)
                face_bgr = cv2.warpAffine(face_bgr, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        except Exception:
            pass

    return face_bgr


def is_blurry_or_micro(face_bgr: np.ndarray, min_dim: int = 14, min_laplacian: float = 4.0) -> bool:
    """
    Check if a face crop is too small or excessively degraded to produce reliable embeddings.
    """
    if face_bgr is None or face_bgr.size == 0:
        return True
    h, w = face_bgr.shape[:2]
    if h < min_dim or w < min_dim:
        return True

    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return var < min_laplacian


def detect_faces(frame_bgr: np.ndarray, min_size: tuple[int, int] = (18, 18)) -> list[dict[str, Any]]:
    """
    Precision Multi-Model Face Detector Ensemble:
    1. YOLOv8 Face Model (face_yolov8.pt) for high recall & scale invariance
    2. MTCNN Deep Neural Network with landmark alignment
    3. OpenCV Haar Cascade Multi-Scale fallback
    Returns list of dicts with 'box' (x, y, w, h), 'prob', and optional 'landmark'.
    """
    if frame_bgr is None or frame_bgr.size == 0:
        return []

    h_img, w_img = frame_bgr.shape[:2]
    all_detections = []

    # 1. Dedicated YOLOv8 Face Detection (Ultra-fast, high recall)
    yolo_model = _get_yolo_face()
    if yolo_model is not None:
        try:
            results = yolo_model(frame_bgr, conf=0.22, verbose=False)[0]
            for b in results.boxes:
                conf = float(b.conf[0])
                x1, y1, x2, y2 = [int(v) for v in b.xyxy[0]]
                x1 = max(0, min(w_img - 1, x1))
                y1 = max(0, min(h_img - 1, y1))
                w = max(0, min(w_img - x1, x2 - x1))
                h = max(0, min(h_img - y1, y2 - y1))
                if w >= min_size[0] and h >= min_size[1]:
                    all_detections.append({
                        "box": (x1, y1, w, h),
                        "prob": conf,
                        "landmark": None,
                    })
        except Exception as yolo_err:
            print(f"[face_recognition] YOLO face detection warning: {yolo_err}")

    # 2. MTCNN Deep Learning Detection (Precision + Facial Landmarks)
    if _TORCH_AVAILABLE and len(all_detections) < 10:
        try:
            mtcnn = _get_mtcnn()
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(frame_rgb)
            boxes, probs, landmarks = mtcnn.detect(pil_img, landmarks=True)
            if boxes is not None and len(boxes) > 0:
                for i, (box, prob) in enumerate(zip(boxes, probs)):
                    if prob is not None and prob >= 0.45:
                        x1, y1, x2, y2 = [int(v) for v in box]
                        x1 = max(0, min(w_img - 1, x1))
                        y1 = max(0, min(h_img - 1, y1))
                        w = max(0, min(w_img - x1, x2 - x1))
                        h = max(0, min(h_img - y1, y2 - y1))

                        aspect = h / max(1, w)
                        if w >= min_size[0] and h >= min_size[1] and 0.50 <= aspect <= 1.85:
                            lm = landmarks[i] if landmarks is not None and i < len(landmarks) else None
                            all_detections.append({
                                "box": (x1, y1, w, h),
                                "prob": float(prob),
                                "landmark": lm
                            })
        except Exception as mtcnn_err:
            print(f"[face_recognition] MTCNN detect warning: {mtcnn_err}")

    # 3. Fallback: OpenCV Haar Cascade if no faces found
    if not all_detections:
        face_casc, profile_casc = _get_cascades()
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        faces_frontal = face_casc.detectMultiScale(
            gray, scaleFactor=1.10, minNeighbors=3, minSize=min_size
        )
        faces_profile = profile_casc.detectMultiScale(
            gray, scaleFactor=1.10, minNeighbors=3, minSize=min_size
        )

        all_faces = list(faces_frontal) + list(faces_profile)
        for b in all_faces:
            all_detections.append({"box": tuple(b), "prob": 0.75, "landmark": None})

    if not all_detections:
        return []

    # Non-Maximum Suppression across all detector candidates
    return _nms_face_dicts(all_detections, overlap_thresh=0.35)


def _nms_face_dicts(detections: list[dict], overlap_thresh: float = 0.35) -> list[dict]:
    """NMS for face detection dictionaries, preserving highest probability and landmark data."""
    if len(detections) <= 1:
        return detections

    boxes = np.array([d["box"] for d in detections])
    scores = np.array([d["prob"] for d in detections])

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 0] + boxes[:, 2]
    y2 = boxes[:, 1] + boxes[:, 3]
    areas = boxes[:, 2] * boxes[:, 3]

    idxs = np.argsort(scores)[::-1]
    picked = []

    while len(idxs) > 0:
        i = idxs[0]
        picked.append(detections[i])

        xx1 = np.maximum(x1[i], x1[idxs[1:]])
        yy1 = np.maximum(y1[i], y1[idxs[1:]])
        xx2 = np.minimum(x2[i], x2[idxs[1:]])
        yy2 = np.minimum(y2[i], y2[idxs[1:]])

        w = np.maximum(0, xx2 - xx1)
        h = np.maximum(0, yy2 - yy1)

        overlap = (w * h) / areas[idxs[1:]]
        remove = np.where(overlap > overlap_thresh)[0]
        idxs = np.delete(idxs, np.concatenate(([0], remove + 1)))

    return picked


def _embed_face_crop(face_bgr: np.ndarray, landmark: np.ndarray | None = None) -> np.ndarray:
    """
    Extract a 512-D L2-normalized FaceNet embedding from a BGR face crop with optional landmark alignment.
    """
    if face_bgr is None or face_bgr.size == 0:
        return np.zeros((1, 512), dtype=np.float32)

    import torch
    from PIL import Image

    aligned_crop = _align_face_crop(face_bgr, landmark)

    face_rgb = cv2.cvtColor(aligned_crop, cv2.COLOR_BGR2RGB)
    face_pil = Image.fromarray(face_rgb)
    device = _get_device()
    face_tensor = _transform(face_pil).unsqueeze(0).to(device)

    recognizer = _get_face_recognizer()
    with torch.no_grad():
        embedding = recognizer(face_tensor)
        emb_norm = embedding / embedding.norm(dim=1, keepdim=True)
    return emb_norm.cpu().numpy()


def build_reference_embeddings(reference_image_paths: list) -> tuple:
    """
    Build multi-vector face embeddings from reference images.
    Accurately detects face in each reference image and extracts augmented views (original, flipped).
    Returns (db_tensor, db_labels).
    """
    embeddings = []
    labels = []

    for img_path in reference_image_paths:
        img_path = Path(img_path)
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue

        label = img_path.stem.replace("_", " ").title()
        meta_path = img_path.parent / f"{img_path.stem}.meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                label = meta.get("label", label)
            except Exception:
                pass

        # Detect face in reference image
        detected = detect_faces(img_bgr, min_size=(16, 16))
        crops_to_embed = []

        if detected:
            best_det = max(detected, key=lambda f: f["box"][2] * f["box"][3])
            x, y, w, h = best_det["box"]
            lm = best_det.get("landmark")

            # Standard tight crop
            pad_x = int(w * 0.12)
            pad_y = int(h * 0.12)
            y1 = max(0, y - pad_y)
            y2 = min(img_bgr.shape[0], y + h + pad_y)
            x1 = max(0, x - pad_x)
            x2 = min(img_bgr.shape[1], x + w + pad_x)
            face_crop = img_bgr[y1:y2, x1:x2]
            crops_to_embed.append((face_crop, lm))

            # Horizontal flip crop for pose invariance
            flip_crop = cv2.flip(face_crop, 1)
            crops_to_embed.append((flip_crop, None))
        else:
            crops_to_embed.append((img_bgr, None))
            crops_to_embed.append((cv2.flip(img_bgr, 1), None))

        for crop, lm in crops_to_embed:
            try:
                emb = _embed_face_crop(crop, lm)
                embeddings.append(emb)
                labels.append(label)
            except Exception as e:
                print(f"[face_recognition] Failed to embed reference image {img_path.name}: {e}")
                continue

    if not embeddings:
        raise ValueError("No valid reference images found or face embedding failed.")

    import torch
    tensors = [torch.from_numpy(e) for e in embeddings]
    return torch.cat(tensors, dim=0).to(_get_device()), labels


# ─── Main Face Recognition Search Execution ─────────────────────────────

def run_face_recognition_search(
    video_path,
    reference_image_paths: list,
    camera_id: str = "CAM-01",
    confidence_threshold: float = 0.35,
    similarity_threshold: float = 0.33,
    sample_fps: float = 2.0,
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int, Any], None]] = None,
) -> list[dict[str, Any]]:
    """
    Execute Face Re-Identification search over video footage.
    Uses Ensemble Face Detection + FaceNet InceptionResnetV1 embedding extractor
    with calibrated cosine similarity matching, distinct color coding, and matte-glass HUD tracking.
    """
    from ai_pipeline.frame_extractor import (
        PREMIUM_PALETTE_BGR,
        save_frame,
        extract_clips_parallel,
        format_timestamp,
    )

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    matches = []
    clip_tasks = []

    try:
        import torch
        db_tensor, db_labels = build_reference_embeddings(reference_image_paths)

        cap = cv2.VideoCapture(str(video_path))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_interval = max(1, int(video_fps / sample_fps))
        frame_idx = 0
        frames_processed = 0

        # Calibrate effective similarity matching threshold
        effective_sim_thresh = max(0.28, min(0.42, similarity_threshold))

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
                if start_time is not None and timestamp < start_time:
                    frame_idx += 1
                    continue
                if end_time is not None and timestamp > end_time:
                    break

                frames_processed += 1
                if progress_cb:
                    try:
                        progress_cb(frames_processed, len(matches), list(matches))
                    except Exception:
                        pass

                # Detect all faces across the frame
                faces_detected = detect_faces(frame, min_size=(18, 18))
                frame_matching_boxes = []

                for det in faces_detected:
                    (x, y, w, h) = det["box"]
                    landmark = det.get("landmark")

                    pad_x = int(w * 0.10)
                    pad_y = int(h * 0.10)
                    x_min = max(0, x - pad_x)
                    y_min = max(0, y - pad_y)
                    x_max = min(frame.shape[1], x + w + pad_x)
                    y_max = min(frame.shape[0], y + h + pad_y)

                    face_crop = frame[y_min:y_max, x_min:x_max]
                    if face_crop.size == 0 or is_blurry_or_micro(face_crop, min_dim=14, min_laplacian=3.0):
                        continue

                    try:
                        face_emb_np = _embed_face_crop(face_crop, landmark)
                        face_emb = torch.from_numpy(face_emb_np).to(_get_device())
                    except Exception:
                        continue

                    # Compute Cosine similarity with reference database
                    sims = torch.nn.functional.cosine_similarity(
                        db_tensor, face_emb.expand_as(db_tensor), dim=1
                    )
                    max_idx = int(torch.argmax(sims).item())
                    raw_sim = float(sims[max_idx].item())
                    best_label = db_labels[max_idx]

                    # Calibrate confidence score
                    if raw_sim >= effective_sim_thresh:
                        calibrated_conf = float(np.clip(0.60 + (raw_sim - effective_sim_thresh) * 1.20, 0.60, 0.99))
                    else:
                        calibrated_conf = float(np.clip(raw_sim * 0.70, 0.0, 0.45))

                    if raw_sim >= effective_sim_thresh:
                        color_idx = len(frame_matching_boxes) % len(PREMIUM_PALETTE_BGR)
                        frame_matching_boxes.append({
                            "x1": x,
                            "y1": y,
                            "x2": x + w,
                            "y2": y + h,
                            "label": best_label,
                            "confidence": round(calibrated_conf, 4),
                            "raw_sim": round(raw_sim, 4),
                            "color_bgr": PREMIUM_PALETTE_BGR[color_idx],
                        })

                if frame_matching_boxes:
                    frame_filename = f"face_{job_id}_{frame_idx:06d}.jpg"
                    frame_path = job_dir / frame_filename

                    # Save Evidence Frame with Multi-Target Matte Glass HUD Overlay
                    save_frame(frame, frame_path, draw_boxes=frame_matching_boxes)

                    clip_filename = f"clip_{job_id}_{frame_idx:06d}.mp4"
                    clip_path = job_dir / clip_filename
                    frame_hash = _sha256_file(frame_path)

                    best_face = max(frame_matching_boxes, key=lambda b: b["confidence"])

                    clip_tasks.append({
                        "video_path": video_path,
                        "output_path": clip_path,
                        "center_timestamp": timestamp,
                        "window_seconds": 4.0,
                        "draw_boxes": frame_matching_boxes,
                    })

                    matches.append({
                        "camera_id": camera_id,
                        "timestamp": timestamp,
                        "timestamp_str": format_timestamp(timestamp),
                        "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                        "clip_url": f"/storage/results/{job_id}/{clip_filename}",
                        "confidence": round(best_face["confidence"], 4),
                        "label": best_face["label"],
                        "box": best_face,
                        "boxes": frame_matching_boxes,
                        "detected_instances": len(frame_matching_boxes),
                        "search_type": "face_recognition",
                        "frame_hash": frame_hash,
                        "clip_hash": "pending",
                    })

                frame_idx += 1
        finally:
            cap.release()

        # Extract video clips in parallel with multi-object tracking
        if clip_tasks:
            try:
                extract_clips_parallel(clip_tasks, max_workers=4)
                for match in matches:
                    clip_name = Path(match["clip_url"]).name
                    clip_p = job_dir / clip_name
                    if clip_p.exists():
                        match["clip_hash"] = _sha256_file(clip_p)
                    else:
                        match["clip_url"] = None
                        match["clip_hash"] = "N/A"
            except Exception as e:
                print(f"[face_recognition] Parallel clip extraction warning: {e}")

    except Exception as pipeline_err:
        print(f"[face_recognition] Pipeline exception: {pipeline_err}")

    manifest = {
        "job_id": job_id,
        "video": str(video_path.name),
        "camera_id": camera_id,
        "search_type": "face_recognition",
        "torch_available": _TORCH_AVAILABLE,
        "created_at": time.time(),
        "match_count": len(matches),
        "matches": matches,
        "query": "Face Re-ID: " + ", ".join([Path(p).stem for p in reference_image_paths]),
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return matches

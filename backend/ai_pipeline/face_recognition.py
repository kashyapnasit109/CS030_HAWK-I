"""
Face recognition and Re-Identification pipeline.
Uses OpenCV Haar Multi-Scale Cascades + YOLO person-head detector for robust face localization,
and FaceNet (InceptionResnetV1) for 512-D L2-normalized embedding extraction and cosine similarity matching.
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
    print("[face_recognition] PyTorch and torchvision available.")
except Exception as e:
    _TORCH_AVAILABLE = False
    print(f"[face_recognition] PyTorch unavailable ({e}). Using fallback mode.")


def _get_device():
    global _device
    if _device is None:
        try:
            from ai_pipeline.device_manager import get_torch_device
            _device = get_torch_device()
        except Exception:
            import torch
            _device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        print(f"[face_recognition] Using device: {_device}")
    return _device


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


def detect_faces(frame_bgr: np.ndarray, min_size: tuple[int, int] = (30, 30)) -> list[tuple[int, int, int, int]]:
    """
    Detect all frontal and profile faces in an image using OpenCV Haar cascades.
    Returns list of (x, y, w, h) bounding boxes.
    """
    if frame_bgr is None or frame_bgr.size == 0:
        return []

    face_casc, profile_casc = _get_cascades()
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces_frontal = face_casc.detectMultiScale(
        gray, scaleFactor=1.10, minNeighbors=4, minSize=min_size
    )
    faces_profile = profile_casc.detectMultiScale(
        gray, scaleFactor=1.10, minNeighbors=4, minSize=min_size
    )

    all_faces = list(faces_frontal) + list(faces_profile)
    if not all_faces:
        return []

    # Non-Maximum Suppression to remove duplicates
    return _nms_faces(all_faces, overlap_thresh=0.35)


def _nms_faces(faces: list, overlap_thresh: float = 0.35) -> list[tuple[int, int, int, int]]:
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


def _get_face_recognizer():
    global _face_recognizer
    if _face_recognizer is None:
        from facenet_pytorch import InceptionResnetV1
        print("[face_recognition] Initializing FaceNet (pretrained='vggface2')...")
        device = _get_device()
        _face_recognizer = InceptionResnetV1(pretrained="vggface2").eval().to(device)
    return _face_recognizer


def _embed_face_crop(face_bgr: np.ndarray) -> np.ndarray:
    """
    Extract a 512-D L2-normalized FaceNet embedding from a BGR face crop.
    """
    if face_bgr is None or face_bgr.size == 0:
        return np.zeros((1, 512), dtype=np.float32)

    import torch
    from PIL import Image

    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
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
    Build face embeddings from reference images.
    Accurately detects face in each reference image first.
    Returns (db_tensor, db_labels).
    """
    embeddings = []
    labels = []

    for img_path in reference_image_paths:
        img_path = Path(img_path)
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue

        # Detect face in reference image
        detected = detect_faces(img_bgr, min_size=(20, 20))
        if detected:
            x, y, w, h = max(detected, key=lambda f: f[2] * f[3])
            # Add 10% margin around face
            pad_x = int(w * 0.10)
            pad_y = int(h * 0.10)
            y1 = max(0, y - pad_y)
            y2 = min(img_bgr.shape[0], y + h + pad_y)
            x1 = max(0, x - pad_x)
            x2 = min(img_bgr.shape[1], x + w + pad_x)
            face_crop = img_bgr[y1:y2, x1:x2]
        else:
            # Full image is portrait/headshot
            face_crop = img_bgr

        try:
            emb = _embed_face_crop(face_crop)
            embeddings.append(emb)
        except Exception as e:
            print(f"[face_recognition] Failed to embed reference image {img_path.name}: {e}")
            continue

        # Get human-readable label from metadata
        label = img_path.stem.replace("_", " ").title()
        meta_path = img_path.parent / f"{img_path.stem}.meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                label = meta.get("label", label)
            except Exception:
                pass
        labels.append(label)

    if not embeddings:
        raise ValueError("No valid reference images found or face embedding failed.")

    import torch
    tensors = [torch.from_numpy(e) for e in embeddings]
    return torch.cat(tensors, dim=0).to(_get_device()), labels


# ─── OpenCV Fallback Mode ────────────────────────────────────────────────

def _build_reference_face_features(reference_image_paths: list) -> list[dict]:
    ref_features = []
    for img_path in reference_image_paths:
        img_path = Path(img_path)
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue

        label = img_path.stem.replace("_", " ").title()
        meta_path = img_path.parent / f"{img_path.stem}.meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                label = meta.get("label", label)
            except Exception:
                pass

        detected = detect_faces(img_bgr, min_size=(20, 20))
        if detected:
            x, y, w, h = max(detected, key=lambda f: f[2] * f[3])
            face_crop = img_bgr[y:y+h, x:x+w]
        else:
            face_crop = img_bgr

        face_resized = cv2.resize(face_crop, (128, 128))
        hsv = cv2.cvtColor(face_resized, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)

        gray_face = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        gray_face = cv2.equalizeHist(gray_face)

        ref_features.append({
            "label": label,
            "hist": hist,
            "gray": gray_face,
            "path": str(img_path),
        })

    return ref_features


def _compare_face_to_references(face_crop_bgr: np.ndarray, ref_features: list[dict]) -> tuple[str, float]:
    if not ref_features or face_crop_bgr.size == 0:
        return "Unknown", 0.0

    face_resized = cv2.resize(face_crop_bgr, (128, 128))
    hsv = cv2.cvtColor(face_resized, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)

    gray_face = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
    gray_face = cv2.equalizeHist(gray_face)

    best_label = "Unknown"
    best_score = 0.0

    for ref in ref_features:
        hist_score = max(0.0, cv2.compareHist(hist, ref["hist"], cv2.HISTCMP_CORREL))
        result = cv2.matchTemplate(gray_face, ref["gray"], cv2.TM_CCOEFF_NORMED)
        template_score = max(0.0, float(result.max()))
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
    confidence_threshold: float = 0.35,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    from ai_pipeline.frame_extractor import save_frame, extract_clip, format_timestamp

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    ref_features = _build_reference_face_features(reference_image_paths)
    if not ref_features:
        return []

    cap = cv2.VideoCapture(str(video_path))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(video_fps))
    frame_idx = 0
    matches = []
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
            if start_time is not None and timestamp < start_time:
                frame_idx += 1
                continue
            if end_time is not None and timestamp > end_time:
                break

            all_faces = detect_faces(frame)
            frames_processed += 1
            if progress_cb:
                progress_cb(frames_processed, len(matches))

            for (x, y, w, h) in all_faces:
                face_crop = frame[y:y+h, x:x+w]
                if face_crop.size == 0:
                    continue

                label, confidence = _compare_face_to_references(face_crop, ref_features)
                if confidence < confidence_threshold:
                    continue

                frame_filename = f"face_{job_id}_{frame_idx:06d}_{x}_{y}.jpg"
                frame_path = job_dir / frame_filename
                box_details = {
                    "x1": x, "y1": y, "x2": x + w, "y2": y + h,
                    "label": label, "confidence": confidence,
                }
                save_frame(frame, frame_path, draw_box=box_details)

                clip_filename = f"clip_{job_id}_{frame_idx:06d}.mp4"
                clip_path = job_dir / clip_filename
                try:
                    extract_clip(video_path, clip_path, timestamp, window_seconds=4.0, draw_box=box_details)
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


# ─── Main Face Recognition Search Execution ─────────────────────────────

def run_face_recognition_search(
    video_path,
    reference_image_paths: list,
    camera_id: str = "CAM-01",
    confidence_threshold: float = 0.45,
    similarity_threshold: float = 0.50,
    sample_fps: float = 1.0,
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Execute Face Re-Identification search over video footage.
    Uses FaceNet InceptionResnetV1 with calibrated cosine similarity matching.
    """
    from ai_pipeline.frame_extractor import save_frame, extract_clip, format_timestamp

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    if not _TORCH_AVAILABLE:
        print("[face_recognition] PyTorch unavailable. Running OpenCV fallback search.")
        matches = _demo_face_search(
            video_path, reference_image_paths, camera_id, job_id,
            confidence_threshold=confidence_threshold,
            start_time=start_time, end_time=end_time,
            progress_cb=progress_cb,
        )
    else:
        try:
            import torch
            db_tensor, db_labels = build_reference_embeddings(reference_image_paths)
            matches = []

            cap = cv2.VideoCapture(str(video_path))
            video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            frame_interval = max(1, int(video_fps / sample_fps))
            frame_idx = 0
            frames_processed = 0

            clip_tasks = []
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

                    # Detect all faces in the frame
                    faces = detect_faces(frame, min_size=(25, 25))

                    frames_processed += 1
                    if progress_cb:
                        try:
                            progress_cb(frames_processed, len(matches))
                        except Exception:
                            pass

                    for (x, y, w, h) in faces:
                        # Add a 10% safety margin around the face for better feature embedding
                        pad_x = int(w * 0.10)
                        pad_y = int(h * 0.10)
                        x_min = max(0, x - pad_x)
                        y_min = max(0, y - pad_y)
                        x_max = min(frame.shape[1], x + w + pad_x)
                        y_max = min(frame.shape[0], y + h + pad_y)

                        face_crop = frame[y_min:y_max, x_min:x_max]
                        if face_crop.size == 0:
                            continue

                        try:
                            face_emb_np = _embed_face_crop(face_crop)
                            face_emb = torch.from_numpy(face_emb_np).to(_get_device())
                        except Exception:
                            continue

                        # Cosine similarity between detected face and all reference embeddings
                        sims = torch.nn.functional.cosine_similarity(
                            db_tensor, face_emb.expand_as(db_tensor), dim=1
                        )
                        max_idx = int(torch.argmax(sims).item())
                        max_sim = float(sims[max_idx].item())
                        best_label = db_labels[max_idx]

                        # Check if similarity meets threshold
                        if max_sim >= similarity_threshold:
                            frame_filename = f"face_{job_id}_{frame_idx:06d}_{x}_{y}.jpg"
                            frame_path = job_dir / frame_filename
                            box_details = {
                                "x1": x, "y1": y, "x2": x + w, "y2": y + h,
                                "label": best_label, "confidence": max_sim,
                            }
                            save_frame(frame, frame_path, draw_box=box_details)

                            clip_filename = f"clip_{job_id}_{frame_idx:06d}.mp4"
                            clip_path = job_dir / clip_filename
                            clip_tasks.append({
                                "video_path": video_path,
                                "output_path": clip_path,
                                "center_timestamp": timestamp,
                                "window_seconds": 4.0,
                                "draw_box": box_details,
                            })

                            frame_hash = _sha256_file(frame_path)
                            matches.append({
                                "camera_id": camera_id,
                                "timestamp": timestamp,
                                "timestamp_str": format_timestamp(timestamp),
                                "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                                "clip_url": f"/storage/results/{job_id}/{clip_filename}",
                                "confidence": round(max_sim, 4),
                                "label": best_label,
                                "box": {"x1": int(x), "y1": int(y), "x2": int(x + w), "y2": int(y + h)},
                                "search_type": "face_recognition",
                                "frame_hash": frame_hash,
                                "clip_hash": "N/A",
                            })

                    frame_idx += 1
            finally:
                cap.release()

            # Extract clips in parallel for maximum performance
            if clip_tasks:
                from ai_pipeline.frame_extractor import extract_clips_parallel
                extract_clips_parallel(clip_tasks, max_workers=3)
        except Exception as pipeline_err:
            print(f"[face_recognition] Pipeline exception: {pipeline_err}. Falling back to OpenCV mode...")
            matches = _demo_face_search(
                video_path, reference_image_paths, camera_id, job_id,
                confidence_threshold=confidence_threshold,
                start_time=start_time, end_time=end_time,
                progress_cb=progress_cb,
            )

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


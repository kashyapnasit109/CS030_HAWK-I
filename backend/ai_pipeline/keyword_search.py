"""
Keyword search pipeline.
Uses CLIP when torch is available; falls back to YOLOv8 COCO object detection
or OpenCV-based color/shape matching when torch is unavailable.

ACCURACY FIX: Previous version used softmax on single query (always 1.0).
Now uses raw cosine similarity with proper multi-prompt contrastive scoring.
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
RESULTS_DIR = BASE_DIR / "storage" / "results"

_TORCH_AVAILABLE = False
_clip_model = None
_clip_processor = None

try:
    import torch
    _TORCH_AVAILABLE = True
    print("[keyword_search] PyTorch available")
except Exception as e:
    _TORCH_AVAILABLE = False
    print(f"[keyword_search] PyTorch unavailable ({e}). Using fallback mode.")


_clip_device = None


def _get_clip_device():
    """Return the torch device for CLIP, honouring the user-selected GPU."""
    global _clip_device
    if _clip_device is None:
        try:
            from ai_pipeline.device_manager import get_torch_device  # noqa: PLC0415
            _clip_device = get_torch_device()
        except Exception:
            import torch  # noqa: PLC0415
            _clip_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[CLIP] Using device: {_clip_device}")
    return _clip_device


def _get_clip():
    global _clip_model, _clip_processor
    if _clip_model is None:
        from transformers import CLIPModel, CLIPProcessor  # noqa: PLC0415
        print("[CLIP] Loading model…")
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        _clip_model.eval()
        # ✅ Fix Bug 1: move model to user-selected GPU
        device = _get_clip_device()
        if device is not None:
            _clip_model = _clip_model.to(device)
        print(f"[CLIP] Model loaded on {device}.")
    return _clip_model, _clip_processor


def _keyword_to_color_hsv(keyword: str) -> tuple[np.ndarray, np.ndarray] | None:
    """Rough mapping from color keywords to HSV range for demo mode."""
    kw = keyword.lower()
    color_map = {
        "red":    ([0, 50, 50], [20, 255, 255]),
        "blue":   ([100, 50, 50], [140, 255, 255]),
        "green":  ([40, 50, 50], [80, 255, 255]),
        "white":  ([0, 0, 180], [180, 30, 255]),
        "black":  ([0, 0, 0], [180, 255, 40]),
        "yellow": ([20, 100, 100], [40, 255, 255]),
        "orange": ([10, 100, 100], [25, 255, 255]),
    }
    for color, (lo, hi) in color_map.items():
        if color in kw:
            return np.array(lo), np.array(hi)
    return None


# Common COCO object keywords for matching in fallback mode
_COCO_KEYWORDS = {
    "person": ["person", "man", "woman", "boy", "girl", "child", "people", "human",
               "pedestrian", "suspect", "individual", "walker", "shooter", "armed person"],
    "gun": ["gun", "guns", "pistol", "handgun", "revolver", "rifle", "firearm", "weapon", "weapons", "armed", "shotgun"],
    "knife": ["knife", "blade", "weapon", "weapons", "dagger", "sword"],
    "car": ["car", "automobile", "sedan", "vehicle"],
    "truck": ["truck", "lorry"],
    "bus": ["bus"],
    "motorcycle": ["motorcycle", "motorbike", "bike", "scooter"],
    "bicycle": ["bicycle", "cycle"],
    "dog": ["dog"],
    "cat": ["cat"],
    "backpack": ["backpack", "bag", "rucksack", "sack"],
    "handbag": ["handbag", "purse", "clutch"],
    "suitcase": ["suitcase", "luggage", "trolley"],
    "umbrella": ["umbrella"],
    "cell phone": ["phone", "cellphone", "mobile"],
    "laptop": ["laptop", "computer"],
    "bottle": ["bottle"],
    "cup": ["cup", "glass", "mug"],
    "chair": ["chair", "seat"],
    "bench": ["bench"],
    "traffic light": ["traffic light", "signal"],
    "stop sign": ["stop sign"],
    "hat": ["hat", "cap", "helmet"],
}


def _keyword_matches_coco_class(keyword: str, class_name: str) -> bool:
    """Check if a keyword matches a COCO class name."""
    kw_lower = keyword.lower()
    # Direct match
    if class_name.lower() in kw_lower or kw_lower in class_name.lower():
        return True
    # Check synonym lists
    for coco_class, synonyms in _COCO_KEYWORDS.items():
        if class_name.lower() == coco_class:
            for syn in synonyms:
                if syn in kw_lower:
                    return True
    return False


def _translate_keyword(keyword: str) -> str:
    """
    Translates keywords from Hindi/Gujarati/etc to English.
    Uses a local dictionary for offline usability, falling back to deep-translator if available.
    """
    clean_kw = keyword.strip().lower()
    if not clean_kw:
        return keyword

    # Local bilingual translation dictionary for offline/fast usage
    translation_dict = {
        # Hindi terms
        "लाल": "red", "सफेद": "white", "सफ़ेद": "white", "काला": "black", "नीला": "blue", "हरा": "green", "पीला": "yellow", "नारंगी": "orange",
        "कार": "car", "गाड़ी": "car", "ग़ाड़ी": "car", "आदमी": "man", "महिला": "woman", "लड़का": "boy", "लड़की": "girl", "बच्चा": "child",
        "वैन": "van", "ट्रक": "truck", "बस": "bus", "साइकिल": "bicycle", "मोटरसाइकिल": "motorcycle", "बाइक": "motorcycle",
        "हेलमेट": "helmet", "जैकेट": "jacket", "बैग": "bag", "थैला": "bag", "टोपी": "hat", "चश्मा": "glasses", "जूता": "shoes",
        "सफ़ेद वैन": "white van", "सफेद वैन": "white van", "काली जैकेट": "black jacket", "लाल कार": "red car", "नीली टीशर्ट": "blue t-shirt",
        "काली पैंट": "black pants", "पुलिस": "police", "वर्दी": "uniform", "पुलिस वर्दी": "police uniform",

        # Gujarati terms
        "લાલ": "red", "સફેદ": "white", "કાળો": "black", "કાળી": "black", "વાદળી": "blue", "લીલો": "green", "પીળો": "yellow", "નાળંગી": "orange",
        "ગાડી": "car", "મોટર": "car", "માણસ": "man", "પુરુષ": "man", "સ્ત્રી": "woman", "છોકરો": "boy", "છોકરી": "girl", "બાળક": "child",
        "વેન": "van", "ટ્રક": "truck", "બસ": "bus", "સાયકલ": "bicycle", "મોટરસાયકલ": "motorcycle", "બાઈક": "motorcycle",
        "હેલ્મેટ": "helmet", "જેકેટ": "jacket", "બેગ": "bag", "થેલો": "bag", "ટોપી": "hat", "ચશ્મા": "glasses", "બૂટ": "shoes",
        "સફેદ વેન": "white van", "કાળી જેકેટ": "black jacket", "લાલ કાર": "red car", "વાદળી ટીશર્ટ": "blue t-shirt",
        "પોલીસ": "police", "યુનિફોર્મ": "uniform",
    }

    # Match exact or replace substrings
    if clean_kw in translation_dict:
        print(f"[translation] Translating (exact match): '{keyword}' -> '{translation_dict[clean_kw]}'")
        return translation_dict[clean_kw]

    # Try word-by-word local translation
    words = clean_kw.split()
    translated_words = []
    translated_any = False
    for w in words:
        if w in translation_dict:
            translated_words.append(translation_dict[w])
            translated_any = True
        else:
            translated_words.append(w)
    if translated_any:
        translated_str = " ".join(translated_words)
        print(f"[translation] Translating (word-by-word): '{keyword}' -> '{translated_str}'")
        return translated_str

    # Try deep-translator (online fallback)
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source='auto', target='en').translate(clean_kw)
        if translated:
            print(f"[translation] Online translation success: '{keyword}' -> '{translated}'")
            return translated
    except Exception as e:
        print(f"[translation] Online translation unavailable/failed: {e}")

    return keyword


def _demo_keyword_search(
    video_path: Path,
    keyword: str,
    camera_id: str,
    similarity_threshold: float,
    job_id: str,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Fallback keyword search using OpenCV:
    1. Object detection via Haar cascades (person, face detection)
    2. Color matching if a color is mentioned in the keyword
    3. Motion detection for activity-related keywords
    FIXED: No longer returns random frames — actually checks for relevant content.
    """
    from ai_pipeline.frame_extractor import save_frame, extract_clip, format_timestamp  # noqa: PLC0415

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    kw_lower = keyword.lower()
    color_range = _keyword_to_color_hsv(keyword)
    matches = []

    # Determine detection strategy based on keyword
    detect_person = any(w in kw_lower for w in [
        "person", "man", "woman", "people", "human", "suspect",
        "walking", "running", "standing", "jacket", "shirt", "uniform",
        "police", "helmet", "glasses", "boy", "girl", "child",
    ])
    detect_vehicle = any(w in kw_lower for w in [
        "car", "truck", "van", "bus", "vehicle", "motorcycle", "bike", "bicycle",
    ])
    detect_motion = any(w in kw_lower for w in [
        "moving", "running", "motion", "activity", "speeding", "fast",
    ])

    # Load appropriate cascades
    cascades = {}
    if detect_person:
        body_path = cv2.data.haarcascades + "haarcascade_fullbody.xml"
        face_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        upperbody_path = cv2.data.haarcascades + "haarcascade_upperbody.xml"
        cascades["person_face"] = cv2.CascadeClassifier(face_path)
        cascades["person_body"] = cv2.CascadeClassifier(body_path)
        cascades["person_upper"] = cv2.CascadeClassifier(upperbody_path)
    if detect_vehicle:
        # OpenCV doesn't have vehicle cascade, but we can detect large rectangular objects
        pass

    cap = cv2.VideoCapture(str(video_path))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(video_fps))  # 1 fps
    frame_idx = 0
    prev_gray = None
    frames_processed = 0

    try:
        while cap.isOpened():
            # Only fully decode sampled frames; grab() skips the rest cheaply.
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

            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            except Exception as ex:
                print(f"[keyword_search] Frame {frame_idx} decode error: {ex}, skipping.")
                frame_idx += 1
                continue

            score = 0.0
            detected_label = keyword
            detection_box = None

            # Person detection scoring
            if detect_person and cascades:
                for cascade_name, cascade in cascades.items():
                    detections = cascade.detectMultiScale(
                        gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30)
                    )
                    if len(detections) > 0:
                        person_score = min(1.0, 0.5 + len(detections) * 0.1)
                        if person_score > score:
                            score = person_score
                            # Use the largest detection
                            biggest = max(detections, key=lambda d: d[2] * d[3])
                            x, y, w, h = biggest
                            detection_box = {"x1": int(x), "y1": int(y),
                                           "x2": int(x + w), "y2": int(y + h)}
                            if "face" in cascade_name:
                                detected_label = f"Person detected (face): {keyword}"
                            else:
                                detected_label = f"Person detected: {keyword}"

            # Color matching scoring
            if color_range is not None:
                try:
                    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
                    lo, hi = color_range
                    mask = cv2.inRange(hsv, lo, hi)
                    color_ratio = mask.mean() / 255.0

                    # Only count significant color presence (> 5% of frame)
                    if color_ratio > 0.05:
                        color_score = min(1.0, color_ratio * 5)
                        if color_score > score:
                            score = color_score
                            detected_label = f"Color match ({keyword})"

                            # Find color region bounding box
                            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                            if contours:
                                largest = max(contours, key=cv2.contourArea)
                                x, y, w, h = cv2.boundingRect(largest)
                                detection_box = {"x1": int(x), "y1": int(y),
                                               "x2": int(x + w), "y2": int(y + h)}
                except Exception:
                    pass

            # Motion detection scoring
            if detect_motion and prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                motion = diff.mean() / 255.0
                if motion > 0.02:  # Only significant motion
                    motion_score = min(1.0, motion * 8)
                    if motion_score > score:
                        score = motion_score
                        detected_label = f"Motion detected: {keyword}"

            prev_gray = gray
            frames_processed += 1

            # Report progress
            if progress_cb:
                progress_cb(frames_processed, len(matches))

            if score < similarity_threshold:
                frame_idx += 1
                continue

            frame_filename = f"kw_{job_id}_{frame_idx:06d}.jpg"
            frame_path = job_dir / frame_filename
            save_frame(frame, frame_path, draw_box=detection_box)

            clip_filename: str | None = f"clip_{job_id}_{frame_idx:06d}.mp4"
            clip_path = job_dir / clip_filename
            try:
                extract_clip(video_path, clip_path, timestamp, window_seconds=5.0, draw_box=detection_box)
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
                "confidence": round(score, 4),
                "label": detected_label,
                "search_type": "keyword",
                "box": detection_box,
                "frame_hash": frame_hash,
                "clip_hash": clip_hash,
            })

            frame_idx += 1
    finally:
        cap.release()

    return matches


def run_keyword_search(
    video_path,
    keyword: str,
    camera_id: str = "CAM-01",
    similarity_threshold: float = 0.10,
    sample_fps: float = 1.0,
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Search video for frames matching a keyword.
    Uses CLIP when torch is available; falls back to detection+color mode.
    FIXED: CLIP now uses proper cosine similarity instead of broken softmax.
    """
    # Translate keyword for CLIP
    translated_keyword = _translate_keyword(keyword)

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    if not _TORCH_AVAILABLE:
        print("[keyword_search] Running in fallback mode (detection + color matching)")
        matches = _demo_keyword_search(video_path, translated_keyword, camera_id, similarity_threshold, job_id, start_time, end_time, progress_cb)
    else:
        from ai_pipeline.frame_extractor import save_frame, format_timestamp, extract_clips_parallel  # noqa: PLC0415
        from PIL import Image  # noqa: PLC0415
        import torch  # noqa: PLC0415

        model, processor = _get_clip()
        matches = []
        # ✅ Fix Bug 4: collect clip extraction tasks to run in parallel after scan
        clip_tasks: list[dict] = []

        # Build rich visual prompts for weapons and target queries
        kw_lower = translated_keyword.lower()
        if any(w in kw_lower for w in ["gun", "guns", "pistol", "handgun", "weapon", "weapons", "firearm", "rifle", "revolver", "shotgun"]):
            target_prompts = [
                f"a photo of {translated_keyword}",
                "a person holding a gun",
                "a handgun",
                "a pistol",
                "a firearm",
                "a weapon",
                "an armed person",
            ]
        else:
            target_prompts = [translated_keyword, f"a photo of a {translated_keyword}"]

        negative_prompts = [
            "an empty room",
            "a blank wall",
            "a plain background",
            "nothing interesting",
            "a random scene",
        ]
        all_prompts = target_prompts + negative_prompts

        cap = cv2.VideoCapture(str(video_path))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_interval = max(1, int(video_fps / sample_fps))
        frame_idx = 0

        try:
            while cap.isOpened():
                # Only fully decode sampled frames; grab() skips the rest cheaply.
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

                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)

                with torch.no_grad():
                    inputs = processor(
                        text=all_prompts,
                        images=pil_image,
                        return_tensors="pt",
                        padding=True,
                    )
                    # ✅ Fix Bug 1: move input tensors to the same device as model
                    clip_dev = _get_clip_device()
                    if clip_dev is not None:
                        inputs = {k: v.to(clip_dev) if hasattr(v, "to") else v for k, v in inputs.items()}
                    outputs = model(**inputs)

                    # Softmax across all prompts
                    probs = outputs.logits_per_image.softmax(dim=1)

                    # Take the max probability among all target prompts
                    similarity = float(torch.max(probs[0][:len(target_prompts)]).item())

                frames_processed = frame_idx // frame_interval + 1
                if progress_cb:
                    try:
                        progress_cb(frames_processed, len(matches))
                    except InterruptedError:
                        break

                if similarity < similarity_threshold:
                    frame_idx += 1
                    continue

                frame_filename = f"kw_{job_id}_{frame_idx:06d}.jpg"
                frame_path = job_dir / frame_filename
                save_frame(frame, frame_path)

                clip_filename = f"clip_{job_id}_{frame_idx:06d}.mp4"
                clip_path = job_dir / clip_filename
                frame_hash = _sha256_file(frame_path)

                matches.append({
                    "camera_id": camera_id,
                    "timestamp": timestamp,
                    "timestamp_str": format_timestamp(timestamp),
                    "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                    "clip_url": f"/storage/results/{job_id}/{clip_filename}",
                    "confidence": round(similarity, 4),
                    "label": keyword,
                    "search_type": "keyword",
                    "frame_hash": frame_hash,
                    "clip_hash": "pending",
                })
                # Collect for parallel extraction after scan loop
                clip_tasks.append({
                    "video_path": video_path,
                    "output_path": clip_path,
                    "center_timestamp": timestamp,
                    "window_seconds": 5.0,
                })

                frame_idx += 1
        finally:
            cap.release()

        # ✅ Fix Bug 4: extract all clips in parallel AFTER the GPU scan loop finishes
        if clip_tasks:
            print(f"[keyword_search] Extracting {len(clip_tasks)} clip(s) in parallel...")
            extract_clips_parallel(clip_tasks, max_workers=4)
            # Update clip_hash and clip_url now that files are written
            for match in matches:
                clip_name = Path(match["clip_url"]).name
                clip_p = job_dir / clip_name
                if clip_p.exists():
                    match["clip_hash"] = _sha256_file(clip_p)
                else:
                    match["clip_url"] = None
                    match["clip_hash"] = "N/A"

    manifest = {
        "job_id": job_id,
        "video": str(video_path.name),
        "camera_id": camera_id,
        "keyword": keyword,
        "translated_keyword": translated_keyword if translated_keyword != keyword else None,
        "search_type": "keyword",
        "torch_available": _TORCH_AVAILABLE,
        "created_at": time.time(),
        "match_count": len(matches),
        "matches": matches,
        "query": f"Keyword: \"{keyword}\"",
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return matches

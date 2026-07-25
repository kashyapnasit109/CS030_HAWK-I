"""
License Plate Recognition (LPR) search module.
Uses OpenCV contour detection to find plate-like regions,
then easyocr to read the actual text from each region.

ACCURACY FIX: Removed fake demo result injection.
Added improved preprocessing (CLAHE, morphological ops) and
Levenshtein-based fuzzy matching for plate text comparison.
"""

import hashlib
import json
import re
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
import numpy as np

BASE_DIR = Path(__file__).parent.parent
RESULTS_DIR = BASE_DIR / "storage" / "results"

# Lazy-load easyocr reader (heavy model — load once)
_ocr_reader = None
_OCR_AVAILABLE = False

try:
    import easyocr  # noqa: F401
    _OCR_AVAILABLE = True
    print("[lpr_search] easyocr available")
except Exception as e:
    _OCR_AVAILABLE = False
    print(f"[lpr_search] easyocr not installed ({e}). Falling back to contour-only mode.")


def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr  # noqa: PLC0415
        _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        print("[lpr_search] easyocr Reader loaded.")
    return _ocr_reader


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


def _preprocess_plate_region(frame: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """
    Enhanced preprocessing for better OCR accuracy:
    1. Pad region slightly
    2. Grayscale conversion
    3. CLAHE contrast enhancement
    4. Bilateral filtering (denoise while preserving edges)
    5. Adaptive thresholding
    6. Morphological operations
    """
    pad = 6
    y1 = max(0, y - pad)
    y2 = min(frame.shape[0], y + h + pad)
    x1 = max(0, x - pad)
    x2 = min(frame.shape[1], x + w + pad)
    crop = frame[y1:y2, x1:x2]

    if crop.size == 0:
        return crop

    # Upscale for better OCR accuracy
    scale = max(1, 200 // max(h, 1))
    if scale > 1:
        crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # Convert to grayscale
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # CLAHE contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Bilateral filter (denoise while preserving edges)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)

    # Adaptive threshold
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # Morphological close to fill gaps in text
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    return thresh


def _detect_plate_regions(frame: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Find license-plate-like rectangular regions in a frame using
    edge detection + contour filtering.
    Improved with multiple detection strategies for better coverage.
    Returns list of (x, y, w, h).
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    regions = []

    # Strategy 1: Edge-based contour detection
    blurred = cv2.bilateralFilter(gray, 11, 17, 17)
    edged = cv2.Canny(blurred, 30, 200)
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.018 * peri, True)
        if 4 <= len(approx) <= 6:
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = w / float(h) if h > 0 else 0
            area = w * h
            # Relaxed aspect ratio for various plate types (2.0 - 6.0)
            if 1.5 <= aspect_ratio <= 6.5 and 500 <= area <= 80000:
                regions.append((x, y, w, h))

    # Strategy 2: Morphological approach for plates with borders
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 5))
    morph = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    contours2, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for c in contours2:
        x, y, w, h = cv2.boundingRect(c)
        aspect_ratio = w / float(h) if h > 0 else 0
        area = w * h
        if 1.5 <= aspect_ratio <= 6.5 and 500 <= area <= 80000:
            # Check if not already covered
            is_dup = False
            for (rx, ry, rw, rh) in regions:
                overlap_x = max(0, min(x + w, rx + rw) - max(x, rx))
                overlap_y = max(0, min(y + h, ry + rh) - max(y, ry))
                overlap_area = overlap_x * overlap_y
                if overlap_area > 0.5 * min(area, rw * rh):
                    is_dup = True
                    break
            if not is_dup:
                regions.append((x, y, w, h))

    return regions


def _ocr_plate_region(frame: np.ndarray, x: int, y: int, w: int, h: int) -> tuple[str, float]:
    """
    Run OCR on a plate bounding region with improved preprocessing.
    Returns (plate_text, confidence). Falls back to empty string if OCR unavailable.
    """
    if not _OCR_AVAILABLE:
        return "", 0.0

    # Enhanced preprocessing
    preprocessed = _preprocess_plate_region(frame, x, y, w, h)
    if preprocessed.size == 0:
        return "", 0.0

    try:
        reader = _get_ocr_reader()

        # Try both preprocessed and raw crops for best results
        results = []

        # OCR on preprocessed image
        r1 = reader.readtext(preprocessed, detail=1, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        results.extend(r1)

        # OCR on raw (color) crop for backup
        pad = 6
        y1 = max(0, y - pad)
        y2 = min(frame.shape[0], y + h + pad)
        x1 = max(0, x - pad)
        x2 = min(frame.shape[1], x + w + pad)
        raw_crop = frame[y1:y2, x1:x2]
        if raw_crop.size > 0:
            scale = max(1, 200 // max(h, 1))
            if scale > 1:
                raw_crop = cv2.resize(raw_crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            r2 = reader.readtext(raw_crop, detail=1, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
            results.extend(r2)

        if not results:
            return "", 0.0

        # Take the highest-confidence result
        best = max(results, key=lambda r: r[2])
        text = re.sub(r"[^A-Z0-9]", "", best[1].upper())
        conf = float(best[2])

        # Require minimum text length for valid plate
        if len(text) < 3:
            return "", 0.0

        return text, conf
    except Exception as e:
        print(f"[lpr_search] OCR error: {e}")
        return "", 0.0


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row

    return prev_row[-1]


def _text_match_score(detected: str, target: str) -> float:
    """
    Fuzzy match score between detected plate text and search target.
    Uses Levenshtein distance for proper fuzzy matching.
    Returns 0.0–1.0.
    """
    if not detected or not target:
        return 0.0
    clean_target = re.sub(r"[^A-Z0-9]", "", target.upper())
    clean_detected = re.sub(r"[^A-Z0-9]", "", detected.upper())

    if not clean_target or not clean_detected:
        return 0.0

    # Exact match
    if clean_target == clean_detected:
        return 1.0

    # Full substring match
    if clean_target in clean_detected or clean_detected in clean_target:
        return 0.95

    # Levenshtein-based fuzzy match
    max_len = max(len(clean_target), len(clean_detected))
    distance = _levenshtein_distance(clean_target, clean_detected)
    similarity = 1.0 - (distance / max_len)

    # Also check if target is a partial match (e.g., searching for "MH12" in "MH12AB1234")
    for i in range(len(clean_detected) - len(clean_target) + 1):
        sub = clean_detected[i:i + len(clean_target)]
        sub_dist = _levenshtein_distance(clean_target, sub)
        sub_sim = 1.0 - (sub_dist / len(clean_target))
        similarity = max(similarity, sub_sim * 0.9)  # slight penalty for partial

    return min(1.0, similarity)


def run_lpr_search(
    video_path,
    plate_text: str,
    camera_id: str = "CAM-01",
    similarity_threshold: float = 0.50,
    sample_fps: float = 1.0,
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Search video frames for a target license plate number using real OCR.
    FIXED: Removed fake demo result injection — only returns real detections.
    """
    from ai_pipeline.frame_extractor import save_frame, extract_clip, format_timestamp  # noqa: PLC0415

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    matches: list[dict[str, Any]] = []
    clean_target = re.sub(r"[^A-Z0-9]", "", plate_text.upper())

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

            regions = _detect_plate_regions(frame)
            frames_processed += 1
            if progress_cb:
                progress_cb(frames_processed, len(matches))

            for (x, y, w, h) in regions:
                if _OCR_AVAILABLE:
                    detected_text, ocr_conf = _ocr_plate_region(frame, x, y, w, h)
                    match_score = _text_match_score(detected_text, clean_target)
                    # Weight: 70% text match + 30% OCR confidence
                    combined_conf = 0.7 * match_score + 0.3 * ocr_conf
                    display_text = detected_text if detected_text else "(unreadable)"
                else:
                    # Fallback: contour-only — we can't verify text, give a low score
                    detected_text = ""
                    combined_conf = 0.35  # Low score since we can't actually read the plate
                    display_text = f"(plate-like region, OCR unavailable)"

                if combined_conf < similarity_threshold:
                    continue

                frame_filename = f"lpr_{job_id}_{frame_idx:06d}.jpg"
                frame_path = job_dir / frame_filename
                save_frame(frame, frame_path, draw_box={
                    "x1": x, "y1": y, "x2": x + w, "y2": y + h,
                    "label": f"PLATE: {display_text}", "confidence": combined_conf,
                })

                frame_hash = _sha256_file(frame_path)

                clip_filename: str | None = f"clip_{job_id}_{frame_idx:06d}.mp4"
                clip_path = job_dir / clip_filename
                try:
                    extract_clip(video_path, clip_path, timestamp, window_seconds=5.0)
                    clip_hash = _sha256_file(clip_path)
                except Exception:
                    clip_filename = None
                    clip_hash = "N/A"

                matches.append({
                    "camera_id": camera_id,
                    "timestamp": timestamp,
                    "timestamp_str": format_timestamp(timestamp),
                    "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                    "clip_url": f"/storage/results/{job_id}/{clip_filename}" if clip_filename else None,
                    "confidence": round(combined_conf, 4),
                    "label": f"Plate: {display_text}",
                    "box": {"x1": int(x), "y1": int(y), "x2": int(x + w), "y2": int(y + h)},
                    "search_type": "lpr",
                    "frame_hash": frame_hash,
                    "clip_hash": clip_hash if clip_filename else "N/A",
                    "ocr_text": detected_text,
                })
                break  # one plate match per frame

            frame_idx += 1
    finally:
        cap.release()

    # NOTE: No more fake demo injection — only real results are returned

    manifest = {
        "job_id": job_id,
        "video": str(video_path.name),
        "camera_id": camera_id,
        "plate_text": plate_text,
        "search_type": "lpr",
        "ocr_available": _OCR_AVAILABLE,
        "created_at": time.time(),
        "match_count": len(matches),
        "matches": matches,
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return matches

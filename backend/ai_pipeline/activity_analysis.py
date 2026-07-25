"""
Activity analysis module for police surveillance.
Provides: motion heatmap, crowd density, scene change detection.
Uses only OpenCV — no torch dependency required.
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


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "N/A"


def run_activity_analysis(
    video_path,
    camera_id: str = "CAM-01",
    sample_fps: float = 2.0,
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    crowd_threshold: int = 3,
    motion_threshold: float = 0.03,
    scene_change_threshold: float = 0.35,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> dict[str, Any]:
    """
    Run comprehensive activity analysis on a video.
    
    Returns a dict with:
    - heatmap_url: URL to generated motion heatmap image
    - crowd_events: list of frames where person count > crowd_threshold
    - scene_changes: list of timestamps where scene changed significantly
    - motion_events: list of high-motion events with timestamps
    - summary: overall activity statistics
    """
    from ai_pipeline.frame_extractor import save_frame, format_timestamp  # noqa: PLC0415

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    cap = cv2.VideoCapture(str(video_path))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(video_fps / sample_fps))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Initialize accumulators
    heatmap_accumulator = np.zeros((frame_height, frame_width), dtype=np.float64)
    prev_gray = None
    prev_hist = None

    # Detection cascades for person counting
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    body_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_upperbody.xml"
    )

    # Result collectors
    crowd_events = []
    scene_changes = []
    motion_events = []
    frame_idx = 0
    frames_processed = 0
    total_motion = 0.0
    max_persons = 0
    person_counts = []

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

            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            except Exception:
                frame_idx += 1
                continue

            # ─── Motion Heatmap ──────────────────────────
            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                _, motion_mask = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)

                # Accumulate motion into heatmap
                heatmap_accumulator += motion_mask.astype(np.float64) / 255.0

                # Calculate motion intensity
                motion_intensity = motion_mask.mean() / 255.0
                total_motion += motion_intensity

                # High motion event
                if motion_intensity > motion_threshold:
                    # Save frame for high-motion event
                    event_filename = f"motion_{job_id}_{frame_idx:06d}.jpg"
                    event_path = job_dir / event_filename
                    save_frame(frame, event_path)

                    motion_events.append({
                        "timestamp": timestamp,
                        "timestamp_str": format_timestamp(timestamp),
                        "intensity": round(motion_intensity, 4),
                        "frame_url": f"/storage/results/{job_id}/{event_filename}",
                        "camera_id": camera_id,
                    })

            # ─── Scene Change Detection ──────────────────
            hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
            cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)

            if prev_hist is not None:
                correlation = cv2.compareHist(hist, prev_hist, cv2.HISTCMP_CORREL)
                dissimilarity = 1.0 - max(0.0, correlation)

                if dissimilarity > scene_change_threshold:
                    sc_filename = f"scene_{job_id}_{frame_idx:06d}.jpg"
                    sc_path = job_dir / sc_filename
                    save_frame(frame, sc_path)

                    scene_changes.append({
                        "timestamp": timestamp,
                        "timestamp_str": format_timestamp(timestamp),
                        "dissimilarity": round(dissimilarity, 4),
                        "frame_url": f"/storage/results/{job_id}/{sc_filename}",
                        "camera_id": camera_id,
                    })

            prev_hist = hist

            # ─── Person Counting (Crowd Density) ─────────
            equalized = cv2.equalizeHist(gray)
            faces = face_cascade.detectMultiScale(equalized, 1.1, 5, minSize=(20, 20))
            bodies = body_cascade.detectMultiScale(equalized, 1.1, 3, minSize=(30, 60))

            # Deduplicate: count unique persons (prefer body detection)
            person_count = max(len(faces), len(bodies))
            person_counts.append(person_count)
            max_persons = max(max_persons, person_count)

            if person_count >= crowd_threshold:
                crowd_filename = f"crowd_{job_id}_{frame_idx:06d}.jpg"
                crowd_path = job_dir / crowd_filename

                # Draw detection boxes
                annotated = frame.copy()
                for (x, y, w, h) in faces:
                    cv2.rectangle(annotated, (x, y), (x+w, y+h), (0, 255, 255), 2)
                for (x, y, w, h) in bodies:
                    cv2.rectangle(annotated, (x, y), (x+w, y+h), (255, 200, 0), 2)
                cv2.putText(annotated, f"Persons: {person_count}",
                          (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
                cv2.imwrite(str(crowd_path), annotated)

                crowd_events.append({
                    "timestamp": timestamp,
                    "timestamp_str": format_timestamp(timestamp),
                    "person_count": person_count,
                    "frame_url": f"/storage/results/{job_id}/{crowd_filename}",
                    "camera_id": camera_id,
                })

            prev_gray = gray

            if progress_cb:
                total_events = len(motion_events) + len(crowd_events) + len(scene_changes)
                progress_cb(frames_processed, total_events)

            frame_idx += 1
    finally:
        cap.release()

    # ─── Generate Heatmap Visualization ──────────────
    heatmap_url = None
    if heatmap_accumulator.max() > 0:
        # Normalize to 0-255
        normalized = (heatmap_accumulator / heatmap_accumulator.max() * 255).astype(np.uint8)

        # Apply colormap
        heatmap_colored = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)

        # Blend with first frame for context
        cap2 = cv2.VideoCapture(str(video_path))
        ok, first_frame = cap2.read()
        cap2.release()

        if ok:
            blended = cv2.addWeighted(first_frame, 0.4, heatmap_colored, 0.6, 0)
        else:
            blended = heatmap_colored

        # Add title
        cv2.putText(blended, f"Activity Heatmap — {camera_id}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        heatmap_filename = f"heatmap_{job_id}.jpg"
        heatmap_path = job_dir / heatmap_filename
        cv2.imwrite(str(heatmap_path), blended)
        heatmap_url = f"/storage/results/{job_id}/{heatmap_filename}"

    # ─── Build Summary ───────────────────────────────
    avg_persons = sum(person_counts) / len(person_counts) if person_counts else 0
    avg_motion = total_motion / frames_processed if frames_processed > 0 else 0

    summary = {
        "total_frames_analyzed": frames_processed,
        "average_motion_intensity": round(avg_motion, 4),
        "total_motion_events": len(motion_events),
        "total_scene_changes": len(scene_changes),
        "max_persons_detected": max_persons,
        "average_persons_per_frame": round(avg_persons, 2),
        "total_crowd_events": len(crowd_events),
        "crowd_threshold_used": crowd_threshold,
        "activity_level": (
            "HIGH" if avg_motion > 0.05 else
            "MEDIUM" if avg_motion > 0.02 else
            "LOW"
        ),
    }

    result = {
        "job_id": job_id,
        "video": str(video_path.name),
        "camera_id": camera_id,
        "search_type": "activity_analysis",
        "created_at": time.time(),
        "heatmap_url": heatmap_url,
        "crowd_events": crowd_events,
        "scene_changes": scene_changes,
        "motion_events": motion_events[:50],  # Limit to prevent huge payloads
        "summary": summary,
    }

    # Save manifest
    (job_dir / "manifest.json").write_text(json.dumps(result, indent=2))

    return result

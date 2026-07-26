"""
Frame extraction utility.
Samples video frames at specified intervals and extracts short clips around timestamps.
Phase 4: Core utility used by all AI search pipelines.
"""

import json
from pathlib import Path
from typing import Generator

import cv2
import numpy as np


def sample_frames(
    video_path: str | Path,
    sample_fps: float = 1.0,
) -> Generator[tuple[int, float, np.ndarray], None, None]:
    """
    Generator that yields (frame_index, timestamp_seconds, frame_bgr) at sample_fps.

    Args:
        video_path: Path to video file.
        sample_fps: How many frames per second to sample (default 1.0 = 1 per second).

    Yields:
        (frame_index, timestamp_seconds, frame_bgr)
    """
    cap = cv2.VideoCapture(str(video_path))
    try:
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        if video_fps <= 0:
            video_fps = 25.0  # fallback

        frame_interval = max(1, int(video_fps / sample_fps))
        frame_idx = 0

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            if frame_idx % frame_interval == 0:
                timestamp = frame_idx / video_fps
                yield frame_idx, timestamp, frame

            frame_idx += 1
    finally:
        cap.release()


def save_frame(frame: np.ndarray, output_path: str | Path, draw_box: dict | None = None) -> None:
    """
    Save a frame as JPEG. Optionally draw a bounding box.

    Args:
        frame: BGR frame.
        output_path: Where to save the JPEG.
        draw_box: Optional dict with keys x1, y1, x2, y2, label, confidence.
    """
    annotated = frame.copy()
    if draw_box:
        x1, y1, x2, y2 = int(draw_box["x1"]), int(draw_box["y1"]), int(draw_box["x2"]), int(draw_box["y2"])
        label = draw_box.get("label", "")
        conf = draw_box.get("confidence", 0.0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 100), 2)
        text = f"{label} {conf:.2f}" if label else f"{conf:.2f}"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), (0, 255, 100), -1)
        cv2.putText(annotated, text, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.imwrite(str(output_path), annotated)


def extract_clip(
    video_path: str | Path,
    output_path: str | Path,
    center_timestamp: float,
    window_seconds: float = 5.0,
    draw_box: dict | None = None,
) -> bool:
    """
    Extract a short video clip centered around a timestamp, overlaying bounding boxes and transcoding to H.264.

    Args:
        video_path: Source video.
        output_path: Output clip path (.mp4).
        center_timestamp: Timestamp in seconds to center the clip on.
        window_seconds: Half-window size in seconds (clip = center ± window_seconds).
        draw_box: Optional bounding box dictionary to burn into the matching frames.

    Returns:
        True on success, False on failure.
    """
    cap = cv2.VideoCapture(str(video_path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps

        start_t = max(0.0, center_timestamp - window_seconds)
        end_t = min(duration, center_timestamp + window_seconds)

        start_frame = int(start_t * fps)
        end_frame = int(end_t * fps)

        # Write to a temporary file first
        temp_output_path = Path(output_path).with_name(f"temp_{Path(output_path).name}")

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(str(temp_output_path), fourcc, fps, (width, height))

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        for i in range(end_frame - start_frame):
            success, frame = cap.read()
            if not success:
                break

            frame_t = start_t + (i / fps)
            # Draw bounding box only within a 3-second window centered at center_timestamp
            if draw_box and abs(frame_t - center_timestamp) <= 1.5:
                annotated = frame.copy()
                x1, y1, x2, y2 = int(draw_box["x1"]), int(draw_box["y1"]), int(draw_box["x2"]), int(draw_box["y2"])
                label = draw_box.get("label", "")
                conf = draw_box.get("confidence", 0.0)

                # Overlay box and text
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 100), 2)
                text = f"{label} {conf:.0%}" if label else f"{conf:.0%}"
                (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), (0, 255, 100), -1)
                cv2.putText(annotated, text, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
                out.write(annotated)
            else:
                out.write(frame)

        out.release()

        # Run FFmpeg to convert to H.264 (libx264) with YUV420p pixel format for browser playback compatibility
        import subprocess
        cmd = [
            "ffmpeg", "-y",
            "-i", str(temp_output_path),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "23",
            str(output_path)
        ]
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            if temp_output_path.exists():
                temp_output_path.unlink()
        except Exception as e:
            print(f"[frame_extractor] FFmpeg transcode failed: {e}. Falling back to OpenCV raw clip.")
            if temp_output_path.exists():
                temp_output_path.rename(output_path)

        return True
    except Exception as err:
        print(f"[frame_extractor] Failed to extract clip: {err}")
        return False
    finally:
        cap.release()


def format_timestamp(seconds: float) -> str:
    """Convert seconds to HH:MM:SS.mmm string."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"

"""
Frame extraction utility.
Samples video frames at specified intervals and extracts short clips around timestamps.
Includes high-definition forensic HUD bounding box rendering and dynamic video target tracking.
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
    """
    cap = cv2.VideoCapture(str(video_path))
    try:
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        if video_fps <= 0:
            video_fps = 25.0

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


def draw_premium_hud_overlay(
    image: np.ndarray,
    box_details: dict,
    color_bgr: tuple[int, int, int] = (246, 130, 59),  # Cobalt Blue #3B82F6 in BGR
) -> np.ndarray:
    """
    Render a high-definition, investor-grade forensic HUD overlay on a frame.
    Features:
    - Glowing L-bracket corner targeting reticles
    - Semi-transparent glassmorphic header pill
    - Target label with confidence percentage badge
    - Crisp vector-style anti-aliased lines
    """
    annotated = image.copy()
    h_img, w_img = annotated.shape[:2]

    x1 = max(0, min(w_img - 1, int(box_details.get("x1", 0))))
    y1 = max(0, min(h_img - 1, int(box_details.get("y1", 0))))
    x2 = max(0, min(w_img - 1, int(box_details.get("x2", 0))))
    y2 = max(0, min(h_img - 1, int(box_details.get("y2", 0))))

    if x2 <= x1 or y2 <= y1:
        return annotated

    box_w = x2 - x1
    box_h = y2 - y1
    label = str(box_details.get("label", "Target"))
    conf = float(box_details.get("confidence", 0.85))

    accent_bgr = color_bgr
    corner_len = max(8, min(24, int(min(box_w, box_h) * 0.25)))

    # 1. Outer subtle bounding border
    cv2.rectangle(annotated, (x1, y1), (x2, y2), accent_bgr, 1, cv2.LINE_AA)

    # 2. Bold Corner L-Brackets (Forensic targeting look)
    thick = 2
    # Top-Left
    cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), accent_bgr, thick, cv2.LINE_AA)
    cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), accent_bgr, thick, cv2.LINE_AA)
    # Top-Right
    cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), accent_bgr, thick, cv2.LINE_AA)
    cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), accent_bgr, thick, cv2.LINE_AA)
    # Bottom-Left
    cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), accent_bgr, thick, cv2.LINE_AA)
    cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), accent_bgr, thick, cv2.LINE_AA)
    # Bottom-Right
    cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), accent_bgr, thick, cv2.LINE_AA)
    cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), accent_bgr, thick, cv2.LINE_AA)

    # 3. Target Label & Confidence Header Pill
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.50
    text_thick = 1

    conf_text = f"{conf * 100:.1f}%" if conf <= 1.0 else f"{conf:.1f}%"
    full_text = f" {label.upper()} | {conf_text} "
    (tw, th), baseline = cv2.getTextSize(full_text, font, scale, text_thick)

    badge_w = tw + 16
    badge_h = th + 12
    badge_y1 = max(0, y1 - badge_h - 4)
    badge_y2 = badge_y1 + badge_h
    badge_x1 = max(0, x1)
    badge_x2 = min(w_img, badge_x1 + badge_w)

    # Draw dark translucent glass badge background
    overlay = annotated.copy()
    cv2.rectangle(overlay, (badge_x1, badge_y1), (badge_x2, badge_y2), (10, 15, 25), -1)
    cv2.addWeighted(overlay, 0.88, annotated, 0.12, 0, annotated)

    # Badge glowing accent border
    cv2.rectangle(annotated, (badge_x1, badge_y1), (badge_x2, badge_y2), accent_bgr, 1, cv2.LINE_AA)

    # Status beacon circle
    beacon_x = badge_x1 + 8
    beacon_y = badge_y1 + badge_h // 2
    cv2.circle(annotated, (beacon_x, beacon_y), 3, (96, 220, 100), -1, cv2.LINE_AA)

    # Label text in crisp white
    text_x = beacon_x + 8
    text_y = badge_y1 + th + 5
    cv2.putText(annotated, full_text, (text_x, text_y), font, scale, (255, 255, 255), text_thick, cv2.LINE_AA)

    return annotated


def save_frame(frame: np.ndarray, output_path: str | Path, draw_box: dict | None = None) -> None:
    """
    Save a frame as JPEG with high-definition HUD overlay if draw_box is provided.
    """
    if draw_box:
        annotated = draw_premium_hud_overlay(frame, draw_box)
    else:
        annotated = frame
    cv2.imwrite(str(output_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 95])


def extract_clip(
    video_path: str | Path,
    output_path: str | Path,
    center_timestamp: float,
    window_seconds: float = 4.0,
    draw_box: dict | None = None,
) -> bool:
    """
    Extract a short video clip centered around a timestamp, dynamically tracking
    the detected bounding box across frames, with HUD overlays and H.264 transcoding.
    """
    cap = cv2.VideoCapture(str(video_path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 10.0

        start_t = max(0.0, center_timestamp - window_seconds)
        end_t = min(duration, center_timestamp + window_seconds)

        start_frame = int(start_t * fps)
        end_frame = int(end_t * fps)
        center_frame_idx = int(center_timestamp * fps)

        if end_frame <= start_frame:
            end_frame = start_frame + int(fps * 2)

        temp_output_path = Path(output_path).with_name(f"temp_{Path(output_path).name}")

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(str(temp_output_path), fourcc, fps, (width, height))
        if not out.isOpened():
            fourcc = cv2.VideoWriter_fourcc(*"MJPG")
            out = cv2.VideoWriter(str(temp_output_path), fourcc, fps, (width, height))

        # Read frames into list for dynamic tracking
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        clip_frames = []
        for _ in range(end_frame - start_frame):
            ok, frame = cap.read()
            if not ok:
                break
            clip_frames.append(frame)

        if not clip_frames:
            out.release()
            return False

        # If bounding box is specified, track it across the clip
        box_tracks = {}
        if draw_box:
            init_idx = max(0, min(len(clip_frames) - 1, center_frame_idx - start_frame))
            bx1 = int(draw_box.get("x1", 0))
            by1 = int(draw_box.get("y1", 0))
            bx2 = int(draw_box.get("x2", 0))
            by2 = int(draw_box.get("y2", 0))
            bw = max(10, bx2 - bx1)
            bh = max(10, by2 - by1)

            # Store the initial center frame box
            box_tracks[init_idx] = (bx1, by1, bx2, by2)

            # Track forward from center frame
            try:
                tracker_fwd = cv2.TrackerMIL_create()
                tracker_fwd.init(clip_frames[init_idx], (bx1, by1, bw, bh))
                for i in range(init_idx + 1, len(clip_frames)):
                    ok, bbox = tracker_fwd.update(clip_frames[i])
                    if ok:
                        tx, ty, tw, th = [int(v) for v in bbox]
                        box_tracks[i] = (tx, ty, tx + tw, ty + th)
                    else:
                        break
            except Exception:
                pass

            # Track backward from center frame
            try:
                tracker_bwd = cv2.TrackerMIL_create()
                tracker_bwd.init(clip_frames[init_idx], (bx1, by1, bw, bh))
                for i in range(init_idx - 1, -1, -1):
                    ok, bbox = tracker_bwd.update(clip_frames[i])
                    if ok:
                        tx, ty, tw, th = [int(v) for v in bbox]
                        box_tracks[i] = (tx, ty, tx + tw, ty + th)
                    else:
                        break
            except Exception:
                pass

        # Render clip with dynamic overlays
        for i, frame in enumerate(clip_frames):
            if draw_box and i in box_tracks:
                cur_x1, cur_y1, cur_x2, cur_y2 = box_tracks[i]
                cur_box = {
                    "x1": cur_x1, "y1": cur_y1, "x2": cur_x2, "y2": cur_y2,
                    "label": draw_box.get("label", "Target"),
                    "confidence": draw_box.get("confidence", 0.9),
                }
                annotated = draw_premium_hud_overlay(frame, cur_box)
                out.write(annotated)
            else:
                out.write(frame)

        out.release()
        del out
        time.sleep(0.08)

        # Transcode to web-optimized H.264 MP4 with FFmpeg
        import subprocess, shutil
        cmd = [
            "ffmpeg", "-y",
            "-i", str(temp_output_path),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "veryfast",
            "-crf", "22",
            str(output_path)
        ]
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            if temp_output_path.exists():
                try:
                    temp_output_path.unlink()
                except Exception:
                    pass
        except Exception as e:
            if temp_output_path.exists():
                try:
                    if Path(output_path).exists():
                        Path(output_path).unlink()
                    shutil.move(str(temp_output_path), str(output_path))
                except Exception:
                    pass

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


def extract_clips_parallel(
    tasks: list[dict],
    max_workers: int = 4,
) -> None:
    """
    Extract multiple clips concurrently using a thread pool.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    if not tasks:
        return

    def _do_extract(task: dict) -> None:
        try:
            extract_clip(
                video_path=task["video_path"],
                output_path=task["output_path"],
                center_timestamp=task["center_timestamp"],
                window_seconds=task.get("window_seconds", 4.0),
                draw_box=task.get("draw_box"),
            )
        except Exception as e:
            print(f"[frame_extractor] Parallel clip extraction failed for {task.get('output_path')}: {e}")

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_do_extract, t): t for t in tasks}
        for fut in as_completed(futures):
            exc = fut.exception()
            if exc:
                print(f"[frame_extractor] Clip thread raised: {exc}")

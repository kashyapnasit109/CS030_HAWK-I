"""
Frame extraction utility.
Samples video frames at specified intervals and extracts short clips around timestamps.
Includes high-definition forensic HUD bounding box rendering and dynamic video target tracking.
"""

import json
import time
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


# ── Premium Forensic Tactical Palette (BGR) ──────────────────────────────────
# Curated investor-grade tactical neon color codes for distinct instance tracking
PREMIUM_PALETTE_BGR = [
    (255, 240, 0),    # Neon Aqua / Cyan #00F0FF
    (129, 185, 16),   # Electric Emerald #10B981
    (246, 130, 59),   # Cobalt Sapphire #3B82F6
    (247, 85, 168),   # Cyber Violet / Purple #A855F7
    (11, 158, 245),   # Amber Gold #F59E0B
    (94, 63, 244),    # Coral Rose #F43F5E
    (22, 204, 132),   # Lime Neon #84CC16
    (212, 182, 6),    # Deep Azure #06B6D4
]


def draw_matte_glass_overlay(
    image: np.ndarray,
    boxes: list[dict] | dict | None,
    default_color_bgr: tuple[int, int, int] | None = None,
) -> np.ndarray:
    """
    Render investor-grade, high-definition matte glass overlays with solid outlines
    and glassmorphic header pills on all detected objects in the frame.
    
    Features:
    - Matte glass semi-transparent fill: Frosted glass dispersion tint inside object ROI
    - Solid anti-aliased vector outlines (2px)
    - High-visibility corner targeting L-brackets (3px)
    - Glassmorphic dark badge pill with status beacon and confidence percentage
    - Distinct premium color coding per object instance
    """
    if boxes is None:
        return image

    if isinstance(boxes, dict):
        # Could be a single box dict or a dict containing a 'boxes' list
        if "boxes" in boxes and isinstance(boxes["boxes"], list):
            boxes_list = boxes["boxes"]
        else:
            boxes_list = [boxes]
    elif isinstance(boxes, list):
        boxes_list = boxes
    else:
        return image

    annotated = image.copy()
    h_img, w_img = annotated.shape[:2]

    # Filter valid boxes
    valid_boxes = []
    for b in boxes_list:
        if not isinstance(b, dict):
            continue
        x1 = max(0, min(w_img - 1, int(b.get("x1", 0))))
        y1 = max(0, min(h_img - 1, int(b.get("y1", 0))))
        x2 = max(0, min(w_img - 1, int(b.get("x2", 0))))
        y2 = max(0, min(h_img - 1, int(b.get("y2", 0))))
        if x2 > x1 + 4 and y2 > y1 + 4:
            valid_boxes.append((b, x1, y1, x2, y2))

    total_valid = len(valid_boxes)
    if total_valid == 0:
        return annotated

    for idx, (b_dict, x1, y1, x2, y2) in enumerate(valid_boxes):
        box_w = x2 - x1
        box_h = y2 - y1
        raw_label = str(b_dict.get("label", "Target"))
        conf = float(b_dict.get("confidence", 0.85))

        # Color selection: custom or assigned from palette
        if b_dict.get("color_bgr"):
            color_bgr = tuple(b_dict["color_bgr"])
        elif default_color_bgr is not None:
            color_bgr = default_color_bgr
        else:
            color_bgr = PREMIUM_PALETTE_BGR[idx % len(PREMIUM_PALETTE_BGR)]

        # 1. Matte Glass Semi-Transparent Frosted Fill
        roi = annotated[y1:y2, x1:x2]
        if roi.size > 0:
            # Slight Gaussian blur to simulate frosted glass dispersion
            ksize = max(3, (min(box_w, box_h) // 16) | 1)
            blurred_roi = cv2.GaussianBlur(roi, (ksize, ksize), 0)
            
            # Colored matte tint
            tint = np.full_like(roi, color_bgr, dtype=np.uint8)
            
            # Blend: 65% blurred image + 28% tint + slight illumination boost
            matte_glass_roi = cv2.addWeighted(blurred_roi, 0.65, tint, 0.28, 6)
            annotated[y1:y2, x1:x2] = cv2.addWeighted(roi, 0.25, matte_glass_roi, 0.75, 0)

        # 2. Solid Crisp Outline
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color_bgr, 2, cv2.LINE_AA)

        # 3. Glowing Corner L-Brackets
        corner_len = max(8, min(28, int(min(box_w, box_h) * 0.25)))
        thick = 3
        # Top-Left
        cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), color_bgr, thick, cv2.LINE_AA)
        cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), color_bgr, thick, cv2.LINE_AA)
        # Top-Right
        cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), color_bgr, thick, cv2.LINE_AA)
        cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), color_bgr, thick, cv2.LINE_AA)
        # Bottom-Left
        cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), color_bgr, thick, cv2.LINE_AA)
        cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), color_bgr, thick, cv2.LINE_AA)
        # Bottom-Right
        cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color_bgr, thick, cv2.LINE_AA)
        cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color_bgr, thick, cv2.LINE_AA)

        # 4. Glassmorphic Header Badge Pill
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = 0.44
        text_thick = 1
        conf_text = f"{conf * 100:.1f}%" if conf <= 1.0 else f"{conf:.1f}%"
        instance_tag = f"#{idx+1}" if total_valid > 1 and f"#{idx+1}" not in raw_label else ""
        badge_text = f" {raw_label.upper()} {instance_tag} | {conf_text} "
        (tw, th), _ = cv2.getTextSize(badge_text, font, scale, text_thick)

        badge_w = tw + 20
        badge_h = th + 12
        badge_y1 = max(0, y1 - badge_h - 4)
        badge_y2 = badge_y1 + badge_h
        badge_x1 = max(0, x1)
        badge_x2 = min(w_img, badge_x1 + badge_w)

        # Translucent dark glass badge background
        badge_roi = annotated[badge_y1:badge_y2, badge_x1:badge_x2]
        if badge_roi.size > 0:
            dark_bg = np.full_like(badge_roi, (10, 15, 25), dtype=np.uint8)
            annotated[badge_y1:badge_y2, badge_x1:badge_x2] = cv2.addWeighted(badge_roi, 0.15, dark_bg, 0.85, 0)

        # Solid border matching object color
        cv2.rectangle(annotated, (badge_x1, badge_y1), (badge_x2, badge_y2), color_bgr, 1, cv2.LINE_AA)

        # Glowing status beacon
        beacon_x = badge_x1 + 8
        beacon_y = badge_y1 + badge_h // 2
        cv2.circle(annotated, (beacon_x, beacon_y), 3, color_bgr, -1, cv2.LINE_AA)

        # Label text in crisp white
        text_x = beacon_x + 8
        text_y = badge_y1 + th + 5
        cv2.putText(annotated, badge_text, (text_x, text_y), font, scale, (255, 255, 255), text_thick, cv2.LINE_AA)

    return annotated


# Backwards compatibility alias
draw_premium_hud_overlay = draw_matte_glass_overlay


def save_frame(
    frame: np.ndarray,
    output_path: str | Path,
    draw_box: dict | list[dict] | None = None,
    draw_boxes: list[dict] | None = None,
) -> None:
    """
    Save a frame as JPEG with high-definition matte glass HUD overlay.
    Accepts either single box dict or list of box dicts.
    """
    boxes_to_draw = draw_boxes if draw_boxes is not None else draw_box
    if boxes_to_draw:
        annotated = draw_matte_glass_overlay(frame, boxes_to_draw)
    else:
        annotated = frame
    cv2.imwrite(str(output_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 95])


def _get_ffmpeg_cmd() -> str:
    """Return path to ffmpeg executable (from imageio_ffmpeg or system PATH)."""
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and Path(exe).exists():
            return str(exe)
    except Exception:
        pass
    return "ffmpeg"


def extract_clip(
    video_path: str | Path,
    output_path: str | Path,
    center_timestamp: float,
    window_seconds: float = 4.0,
    draw_box: dict | list[dict] | None = None,
    draw_boxes: list[dict] | None = None,
) -> bool:
    """
    Extract a short video clip centered around a timestamp, dynamically tracking
    ALL detected bounding boxes across frames with matte glass overlays and H.264 transcoding.
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

        # Prepare list of boxes to track
        input_boxes = draw_boxes if draw_boxes is not None else draw_box
        if isinstance(input_boxes, dict):
            if "boxes" in input_boxes and isinstance(input_boxes["boxes"], list):
                box_list = input_boxes["boxes"]
            else:
                box_list = [input_boxes]
        elif isinstance(input_boxes, list):
            box_list = input_boxes
        else:
            box_list = []

        all_boxes = box_list

        # Render clip with dynamic multi-object forensic HUD overlays
        for frame in clip_frames:
            if all_boxes:
                frame_boxes = []
                for b_idx, b_spec in enumerate(all_boxes):
                    frame_boxes.append({
                        "x1": b_spec.get("x1", 0),
                        "y1": b_spec.get("y1", 0),
                        "x2": b_spec.get("x2", frame.shape[1]),
                        "y2": b_spec.get("y2", frame.shape[0]),
                        "label": b_spec.get("label", "Target"),
                        "confidence": b_spec.get("confidence", 0.90),
                        "color_bgr": b_spec.get("color_bgr", PREMIUM_PALETTE_BGR[b_idx % len(PREMIUM_PALETTE_BGR)]),
                    })
                annotated = draw_matte_glass_overlay(frame, frame_boxes)
                out.write(annotated)
            else:
                out.write(frame)

        out.release()
        del out
        time.sleep(0.08)

        # Transcode to web-optimized H.264 MP4 with FFmpeg
        import subprocess, shutil
        ffmpeg_bin = _get_ffmpeg_cmd()
        cmd = [
            ffmpeg_bin, "-y",
            "-i", str(temp_output_path),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "veryfast",
            "-crf", "22",
            "-movflags", "+faststart",
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
            print(f"[frame_extractor] FFmpeg transcode warning: {e}")
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
                draw_boxes=task.get("draw_boxes"),
            )
        except Exception as e:
            print(f"[frame_extractor] Parallel clip extraction failed for {task.get('output_path')}: {e}")

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_do_extract, t): t for t in tasks}
        for fut in as_completed(futures):
            exc = fut.exception()
            if exc:
                print(f"[frame_extractor] Clip thread raised: {exc}")

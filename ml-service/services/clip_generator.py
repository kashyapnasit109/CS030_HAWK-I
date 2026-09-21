"""
Hawk-I ML Service — Central Video Clip Generator & Annotation Service

Extracts event-centered temporal video clips (with pre-roll and post-roll buffers)
and renders bounding boxes, telemetry overlays, tracking trails, and classification
labels directly onto the video frames.
"""

import os
import cv2
import math
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("hawk-ml.clip")

# Module theme colors in BGR format
COLOR_MAP = {
    "velocity": (0, 200, 50),     # Bright Emerald Green
    "anpr": (235, 120, 20),        # Vibrant Sapphire Blue
    "threat": (30, 30, 235),       # Danger Crimson Red
    "misplacement": (180, 50, 200),# Purple Magenta
    "entry": (0, 165, 255),        # Amber Orange
    "default": (255, 180, 0)       # Cyan Azure
}


class ClipGenerator:
    """
    Service for extracting and rendering annotated video evidence clips.
    """

    @staticmethod
    def get_clips_directory() -> str:
        """
        Returns the absolute path to the shared media/clips directory.
        Creates the directory if it does not exist.
        """
        # Relative to ml-service/services/ -> root/media/clips
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/clips"))
        os.makedirs(base_dir, exist_ok=True)
        return base_dir

    @classmethod
    def generate_annotated_clip(
        cls,
        source_video_path: str,
        event_timestamp_sec: float,
        source_module: str = "default",
        event_type: str = "detection",
        bounding_box: Optional[Dict[str, Any]] = None,
        annotations_by_frame: Optional[Dict[int, List[Dict[str, Any]]]] = None,
        label: Optional[str] = None,
        confidence: Optional[float] = None,
        extra_telemetry: Optional[str] = None,
        pre_seconds: float = 3.0,
        post_seconds: float = 3.0,
        clip_filename_prefix: str = "clip"
    ) -> Dict[str, Any]:
        """
        Extracts temporal window [event_timestamp - pre_seconds, event_timestamp + post_seconds]
        from source_video_path and renders detection boundaries and telemetry onto video frames.
        """
        if not os.path.exists(source_video_path):
            raise FileNotFoundError(f"Source video '{source_video_path}' not found.")

        cap = cv2.VideoCapture(source_video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open source video: {source_video_path}")

        native_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
        total_duration = total_frames / native_fps if native_fps > 0 else 0.0

        # Compute temporal boundaries with safe clamping
        event_sec = max(0.0, event_timestamp_sec or 0.0)
        start_sec = max(0.0, event_sec - pre_seconds)
        end_sec = min(total_duration, event_sec + post_seconds) if total_duration > 0 else event_sec + post_seconds

        # Guarantee at least 2.0s duration if video is long enough
        if total_duration > 0 and (end_sec - start_sec) < 2.0:
            start_sec = max(0.0, event_sec - 1.0)
            end_sec = min(total_duration, event_sec + 2.0)

        start_frame = int(start_sec * native_fps)
        end_frame = int(end_sec * native_fps) if total_frames == 0 else min(total_frames - 1, int(end_sec * native_fps))
        actual_duration = max(1.0, (end_frame - start_frame + 1) / native_fps)

        clips_dir = cls.get_clips_directory()
        clip_basename = f"{clip_filename_prefix}_{int(event_sec*1000)}.mp4"
        thumb_basename = f"{clip_filename_prefix}_{int(event_sec*1000)}_thumb.jpg"
        out_clip_path = os.path.join(clips_dir, clip_basename)
        out_thumb_path = os.path.join(clips_dir, thumb_basename)

        # Codec selection: prefer avc1/mp4v for maximum browser HTML5 compatibility
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(out_clip_path, fourcc, native_fps, (frame_width, frame_height))

        theme_color = COLOR_MAP.get(source_module.lower(), COLOR_MAP["default"])
        event_frame_idx = int(event_sec * native_fps)
        best_thumb_frame = None

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        current_frame = start_frame

        while current_frame <= end_frame:
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            # 1. Render frame-specific or global detection annotations
            annotated_frame = frame.copy()

            # Check if there are dynamic annotations for this specific frame
            frame_annots = []
            if annotations_by_frame and current_frame in annotations_by_frame:
                frame_annots = annotations_by_frame[current_frame]
            elif bounding_box:
                # Fallback: render static/event bounding box across the event window
                frame_annots = [{
                    "bounding_box": bounding_box,
                    "label": label or source_module.upper(),
                    "confidence": confidence,
                    "extra_text": extra_telemetry
                }]

            for annot in frame_annots:
                bbox = annot.get("bounding_box", {})
                bx = int(bbox.get("x", 0))
                by = int(bbox.get("y", 0))
                bw = int(bbox.get("w", 0))
                bh = int(bbox.get("h", 0))

                # Also support xyxy [x1, y1, x2, y2]
                if "x1" in bbox and "x2" in bbox:
                    bx = int(bbox["x1"])
                    by = int(bbox["y1"])
                    bw = int(bbox["x2"] - bbox["x1"])
                    bh = int(bbox["y2"] - bbox["y1"])

                if bw > 0 and bh > 0:
                    cls._draw_bounding_box(
                        frame=annotated_frame,
                        x=bx, y=by, w=bw, h=bh,
                        color=theme_color,
                        label=annot.get("label", label or source_module.upper()),
                        conf=annot.get("confidence", confidence),
                        extra=annot.get("extra_text", extra_telemetry)
                    )

            # 2. Render HUD watermark banner on every frame
            rel_t = (current_frame - start_frame) / native_fps
            cls._draw_hud_overlay(annotated_frame, source_module, event_type, rel_t)

            out.write(annotated_frame)

            # Save frame closest to event timestamp as thumbnail
            if best_thumb_frame is None or abs(current_frame - event_frame_idx) < abs(best_thumb_frame[0] - event_frame_idx):
                best_thumb_frame = (current_frame, annotated_frame.copy())

            current_frame += 1

        cap.release()
        out.release()

        # Save thumbnail image
        if best_thumb_frame is not None:
            cv2.imwrite(out_thumb_path, best_thumb_frame[1], [cv2.IMWRITE_JPEG_QUALITY, 90])

        file_size_kb = int(os.path.getsize(out_clip_path) / 1024) if os.path.exists(out_clip_path) else 0

        logger.info(
            f"Generated annotated clip '{clip_basename}' ({actual_duration:.1f}s, {file_size_kb} KB) "
            f"for module '{source_module}' event at {event_sec:.2f}s."
        )

        return {
            "file_path": f"/media/clips/{clip_basename}",
            "thumbnail_path": f"/media/clips/{thumb_basename}",
            "start_time_sec": start_sec,
            "end_time_sec": end_sec,
            "duration_sec": int(math.ceil(actual_duration)),
            "file_size_kb": file_size_kb,
            "absolute_clip_path": out_clip_path,
            "absolute_thumbnail_path": out_thumb_path
        }

    @staticmethod
    def _draw_bounding_box(
        frame, x: int, y: int, w: int, h: int,
        color: Tuple[int, int, int],
        label: str,
        conf: Optional[float] = None,
        extra: Optional[str] = None
    ):
        """Draws polished high-contrast bounding box with top label banner."""
        img_h, img_w = frame.shape[:2]
        x1 = max(0, min(img_w - 1, x))
        y1 = max(0, min(img_h - 1, y))
        x2 = max(0, min(img_w - 1, x + w))
        y2 = max(0, min(img_h - 1, y + h))

        # Main bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

        # Corner brackets for tactile HUD look
        corner_len = min(20, min(w // 4, h // 4))
        if corner_len > 4:
            # Top-left
            cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, 4, cv2.LINE_AA)
            cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, 4, cv2.LINE_AA)
            # Top-right
            cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, 4, cv2.LINE_AA)
            cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, 4, cv2.LINE_AA)
            # Bottom-left
            cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, 4, cv2.LINE_AA)
            cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, 4, cv2.LINE_AA)
            # Bottom-right
            cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, 4, cv2.LINE_AA)
            cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, 4, cv2.LINE_AA)

        # Build label text
        header_text = label.upper()
        if conf is not None:
            header_text += f" [{conf:.2f}]"
        if extra:
            header_text += f" | {extra}"

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.48
        thickness = 1
        (tw, th), baseline = cv2.getTextSize(header_text, font, font_scale, thickness)

        # Banner background
        label_y1 = max(0, y1 - th - 10)
        label_y2 = y1
        label_x1 = x1
        label_x2 = min(img_w - 1, x1 + tw + 14)

        cv2.rectangle(frame, (label_x1, label_y1), (label_x2, label_y2), color, -1)
        cv2.putText(
            frame,
            header_text,
            (label_x1 + 6, label_y2 - 6),
            font,
            font_scale,
            (255, 255, 255),
            thickness,
            cv2.LINE_AA
        )

    @staticmethod
    def _draw_hud_overlay(frame, module: str, event_type: str, time_sec: float):
        """Renders standard HAWK-I CCTV HUD watermark in top corner."""
        font = cv2.FONT_HERSHEY_SIMPLEX
        text = f"HAWK-I AI TELEMETRY | {module.upper()} :: {event_type} | T+{time_sec:04.1f}s"
        cv2.putText(frame, text, (18, 26), font, 0.45, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(frame, text, (18, 26), font, 0.45, (0, 230, 255), 1, cv2.LINE_AA)

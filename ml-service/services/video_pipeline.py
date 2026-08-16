"""
Hawk-I ML Service — Reusable Video Ingestion & Frame Extraction Pipeline

Provides the VideoIngestor abstraction for:
- Safe temporary file lifecycle management (automatic cleanup)
- OpenCV VideoCapture initialization and FPS extraction
- Dynamic video duration calculation and validation
- Configurable controlled frame sampling (default 5 FPS for dev, configurable)
- Frame timestamping and indexing
"""

import math
import os
import tempfile
import logging
from typing import Generator, Tuple, Optional, Union
import cv2
import numpy as np
from fastapi import UploadFile, HTTPException

logger = logging.getLogger("hawk-ml.video")

DEFAULT_DEV_PROCESSING_FPS = 5.0
DEFAULT_MAX_DURATION_SEC = 30.0


class VideoIngestionError(Exception):
    """Raised when video ingestion or validation fails."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class VideoIngestor:
    """
    Reusable video ingestion manager that handles file lifecycle,
    OpenCV capture, duration validation, and frame sampling.
    """

    def __init__(
        self,
        source: Union[UploadFile, bytes, str],
        filename: Optional[str] = None,
        processing_fps: Optional[float] = None,
        max_duration_sec: float = DEFAULT_MAX_DURATION_SEC,
    ):
        self.source = source
        self.filename = filename or (source.filename if isinstance(source, UploadFile) else "video.mp4")
        
        # Determine target processing FPS
        if processing_fps is not None and processing_fps > 0:
            self.processing_fps = float(processing_fps)
        else:
            env_fps = os.getenv("PROCESSING_FPS")
            if env_fps:
                try:
                    self.processing_fps = float(env_fps)
                except ValueError:
                    self.processing_fps = DEFAULT_DEV_PROCESSING_FPS
            else:
                self.processing_fps = DEFAULT_DEV_PROCESSING_FPS

        self.max_duration_sec = max_duration_sec

        self._temp_path: Optional[str] = None
        self._is_temp_file: bool = False
        self._cap: Optional[cv2.VideoCapture] = None

        self.native_fps: float = 30.0
        self.total_frames: int = 0
        self.duration_sec: float = 0.0
        self.width: int = 0
        self.height: int = 0

    async def __aenter__(self):
        await self.open()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def __enter__(self):
        # Sync context manager (only works if source is already bytes or str path)
        if isinstance(self.source, UploadFile):
            raise RuntimeError("Async source (UploadFile) requires 'async with VideoIngestor(...)'")
        self._open_sync()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    async def open(self):
        """Prepare video file on disk, open capture, and validate properties."""
        if isinstance(self.source, UploadFile):
            contents = await self.source.read()
            self._write_temp_file(contents)
        elif isinstance(self.source, bytes):
            self._write_temp_file(self.source)
        elif isinstance(self.source, str):
            if os.path.exists(self.source):
                self._temp_path = self.source
                self._is_temp_file = False
            else:
                raise VideoIngestionError(f"Video file path not found: {self.source}")
        else:
            raise VideoIngestionError("Unsupported video source type.")

        self._initialize_capture()

    def _open_sync(self):
        """Synchronous version of open for bytes or file paths."""
        if isinstance(self.source, bytes):
            self._write_temp_file(self.source)
        elif isinstance(self.source, str):
            if os.path.exists(self.source):
                self._temp_path = self.source
                self._is_temp_file = False
            else:
                raise VideoIngestionError(f"Video file path not found: {self.source}")
        else:
            raise VideoIngestionError("Unsupported video source type for sync open.")

        self._initialize_capture()

    def _write_temp_file(self, data: bytes):
        suffix = os.path.splitext(self.filename)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            self._temp_path = tmp.name
            self._is_temp_file = True

    def _initialize_capture(self):
        if not self._temp_path or not os.path.exists(self._temp_path):
            raise VideoIngestionError("Video file path is invalid.")

        self._cap = cv2.VideoCapture(self._temp_path)
        if not self._cap.isOpened():
            self.close()
            raise VideoIngestionError("Could not open video stream using OpenCV.", status_code=400)

        # Extract native FPS
        fps = self._cap.get(cv2.CAP_PROP_FPS)
        if not fps or fps <= 0 or math.isnan(fps):
            logger.warning("Extracted native FPS is invalid. Falling back to 30.0 FPS.")
            self.native_fps = 30.0
        else:
            self.native_fps = float(fps)

        self.total_frames = int(self._cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.duration_sec = self.total_frames / self.native_fps if self.native_fps > 0 else 0.0

        if self.max_duration_sec > 0 and self.duration_sec > self.max_duration_sec:
            self.close()
            raise VideoIngestionError(
                f"Video duration ({self.duration_sec:.1f}s) exceeds maximum allowed limit of {self.max_duration_sec:.1f}s.",
                status_code=400
            )

        logger.info(
            f"Ingested video '{self.filename}': {self.duration_sec:.2f}s, "
            f"{self.total_frames} frames @ {self.native_fps:.2f} FPS. "
            f"Sampling @ {self.processing_fps:.1f} FPS."
        )

    def get_video_path(self) -> str:
        """Returns the local video file path (useful for trackers that take a file path)."""
        if not self._temp_path:
            raise VideoIngestionError("Video is not opened.")
        return self._temp_path

    def get_metadata(self) -> dict:
        """Returns metadata dictionary describing the ingested video and sampling."""
        return {
            "filename": self.filename,
            "native_fps": round(self.native_fps, 2),
            "processing_fps": round(self.processing_fps, 2),
            "total_frames": self.total_frames,
            "duration_sec": round(self.duration_sec, 2),
            "resolution": {"width": self.width, "height": self.height},
        }

    def iter_frames(self) -> Generator[Tuple[np.ndarray, int, int, float], None, None]:
        """
        Yields sampled frames based on processing_fps.
        Yields tuple: (frame_bgr, sampled_idx, original_frame_idx, timestamp_sec)
        """
        if not self._cap or not self._cap.isOpened():
            raise VideoIngestionError("VideoCapture is not active.")

        # Rewind to start
        self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        # Calculate sampling interval
        # E.g. native 30 fps, processing 5 fps -> step = 6 (frames 0, 6, 12, ...)
        step = max(1, round(self.native_fps / self.processing_fps)) if self.processing_fps > 0 else 1

        sampled_idx = 0
        orig_frame_idx = 0

        while True:
            ret, frame = self._cap.read()
            if not ret or frame is None:
                break

            if orig_frame_idx % step == 0:
                timestamp_sec = orig_frame_idx / self.native_fps if self.native_fps > 0 else 0.0
                yield frame, sampled_idx, orig_frame_idx, round(timestamp_sec, 3)
                sampled_idx += 1

            orig_frame_idx += 1

    def close(self):
        """Release capture and clean up temporary files."""
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None

        if self._is_temp_file and self._temp_path and os.path.exists(self._temp_path):
            try:
                os.remove(self._temp_path)
            except Exception as e:
                logger.warning(f"Failed to remove temp video file '{self._temp_path}': {e}")
            finally:
                self._temp_path = None
                self._is_temp_file = False

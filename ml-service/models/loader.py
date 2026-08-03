"""
Hawk-I ML Service — Model Loading & Caching

Singleton manager that loads YOLOv8 and EasyOCR models once at startup
and keeps them in memory. Gracefully handles load failures so that
individual endpoints can return 503 without crashing the whole process.
"""

import logging
import os

logger = logging.getLogger("hawk-ml")

# Global model references
_yolo_model = None
_ocr_reader = None
_yolo_error = None
_ocr_error = None


def load_models():
    """Called once at FastAPI startup. Loads all models into memory."""
    global _yolo_model, _ocr_reader, _yolo_error, _ocr_error

    device = os.getenv("DEVICE", "cpu")

    # ── Load YOLOv8 ──────────────────────────────────────────────────
    try:
        logger.info("Loading YOLOv8n model...")
        from ultralytics import YOLO
        _yolo_model = YOLO("yolov8n.pt")
        # Force a warm-up inference so the first real request isn't slow
        import numpy as np
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        _yolo_model.predict(dummy, verbose=False, device=device)
        logger.info("✅ YOLOv8n model loaded and warm-up complete.")
    except Exception as e:
        _yolo_error = str(e)
        logger.error(f"❌ Failed to load YOLOv8 model: {e}")

    # ── Load EasyOCR ─────────────────────────────────────────────────
    try:
        logger.info("Loading EasyOCR reader (en)...")
        import easyocr
        _ocr_reader = easyocr.Reader(["en"], gpu=(device != "cpu"))
        logger.info("✅ EasyOCR reader loaded successfully.")
    except Exception as e:
        _ocr_error = str(e)
        logger.error(f"❌ Failed to load EasyOCR reader: {e}")


def get_yolo():
    """Returns the loaded YOLO model, or None if it failed to load."""
    return _yolo_model


def get_ocr():
    """Returns the loaded EasyOCR reader, or None if it failed to load."""
    return _ocr_reader


def get_model_status():
    """Returns a dict describing which models are loaded and ready."""
    return {
        "yolo": {
            "loaded": _yolo_model is not None,
            "error": _yolo_error,
        },
        "easyocr": {
            "loaded": _ocr_reader is not None,
            "error": _ocr_error,
        },
    }

"""
Hawk-I ML Service — Model Loading & Caching

Singleton manager that loads YOLOv8, EasyOCR, and SentenceTransformer models once
at startup and keeps them in memory. Gracefully handles load failures so that
individual endpoints can return 503 without crashing the whole process.
"""

import logging
import os
import torch

logger = logging.getLogger("hawk-ml")

# Ensure PyTorch unpickling works for custom model architectures across PyTorch versions
_orig_torch_load = torch.load

def _safe_torch_load(*args, **kwargs):
    if "weights_only" not in kwargs:
        kwargs["weights_only"] = False
    return _orig_torch_load(*args, **kwargs)

torch.load = _safe_torch_load

# Global model references
_yolo_model = None
_ocr_reader = None
_sentence_transformer = None
_yolo_error = None
_ocr_error = None
_embed_error = None


def load_models():
    """Called once at FastAPI startup. Loads all models into memory."""
    global _yolo_model, _ocr_reader, _sentence_transformer, _yolo_error, _ocr_error, _embed_error

    device = os.getenv("DEVICE", "cpu")

    # ── Load YOLOv8 ──────────────────────────────────────────────────
    try:
        logger.info("Loading YOLOv8n model...")
        from ultralytics import YOLO

        # Resolve checkpoint path relative to this file to prevent CWD dependency
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "yolov8n.pt"))
        if not os.path.exists(model_path):
            model_path = "yolov8n.pt"

        _yolo_model = YOLO(model_path)
        # Force a warm-up inference so the first real request isn't slow
        import numpy as np
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        _yolo_model.predict(dummy, verbose=False, device=device)
        _yolo_error = None
        logger.info(f"✅ YOLOv8n model loaded from '{model_path}' and warm-up complete.")
    except Exception as e:
        _yolo_error = str(e)
        logger.error(f"❌ Failed to load YOLOv8 model: {e}")

    # ── Load EasyOCR ─────────────────────────────────────────────────
    try:
        logger.info("Loading EasyOCR reader (en)...")
        import easyocr
        _ocr_reader = easyocr.Reader(["en"], gpu=(device != "cpu"))
        _ocr_error = None
        logger.info("✅ EasyOCR reader loaded successfully.")
    except Exception as e:
        _ocr_error = str(e)
        logger.error(f"❌ Failed to load EasyOCR reader: {e}")

    # ── Load SentenceTransformer ─────────────────────────────────────
    try:
        logger.info("Loading SentenceTransformer (all-MiniLM-L6-v2)...")
        from sentence_transformers import SentenceTransformer
        _sentence_transformer = SentenceTransformer("all-MiniLM-L6-v2", device=device)
        _embed_error = None
        logger.info("✅ SentenceTransformer loaded successfully.")
    except Exception as e:
        _embed_error = str(e)
        logger.error(f"❌ Failed to load SentenceTransformer: {e}")


def get_yolo():
    """Returns the loaded YOLO model, or None if it failed to load."""
    return _yolo_model


def get_ocr():
    """Returns the loaded EasyOCR reader, or None if it failed to load."""
    return _ocr_reader


def get_embedder():
    """Returns the loaded SentenceTransformer, or None if it failed to load."""
    return _sentence_transformer


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
        "sentence_transformer": {
            "loaded": _sentence_transformer is not None,
            "error": _embed_error,
        }
    }

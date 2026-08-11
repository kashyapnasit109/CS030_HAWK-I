"""
Model warmup — pre-loads the heavy AI models on server startup so the first
search request does not pay the cold-load penalty (weights I/O + CUDA/cuDNN
context init), which can otherwise stall the very first search by 20-40s.

Runs in a background daemon thread (see the startup hook in main.py) so the
API starts serving immediately while the models load in parallel with the
server becoming ready.

Design rules:
  * Every model is warmed inside its own try/except — a missing weight file,
    a blocked torch DLL, or an out-of-memory GPU never blocks the other
    models or crashes startup.
  * Warmup is strictly best-effort. The existing lazy getters still load on
    demand, so if warmup is skipped or fails the app degrades to its normal
    (slower first call) behaviour rather than breaking.
  * A tiny dummy inference is run per model where cheap, because for the
    torch/CUDA models the *first inference* (not the weight load) is what
    actually pays the cuDNN autotune + kernel-compile cost.

The progress is exposed via WARMUP_STATE so a status endpoint / the frontend
can show a "models ready" indicator.
"""

import time

import numpy as np

# Snapshot of warmup progress. Read by the /api/warmup status endpoint.
#   status: "loading" | "ok" | "skipped" | "error"
WARMUP_STATE: dict = {
    "started": False,
    "done": False,
    "started_at": None,
    "finished_at": None,
    "models": {},  # name -> {"status", "seconds", "detail"}
}


def _record(name: str, status: str, t0: float, detail: str = "") -> None:
    dt = round(time.perf_counter() - t0, 2)
    WARMUP_STATE["models"][name] = {"status": status, "seconds": dt, "detail": detail}
    tag = {"ok": "ready", "skipped": "skipped (fallback)", "error": "failed"}.get(status, status)
    suffix = f" — {detail}" if detail else ""
    print(f"[warmup] {name}: {tag} in {dt}s{suffix}")


def _warm_face() -> None:
    """Warm the YOLO face detector + FaceNet recogniser."""
    t0 = time.perf_counter()
    try:
        from ai_pipeline import face_recognition as fr  # noqa: PLC0415

        detector = fr._get_face_detector()
        # Load the active FaceNet recogniser too (honours settings.json).
        try:
            model_path, _ = fr.load_active_face_model_path()
            fr._get_face_recognizer(model_path)
        except Exception as e:
            print(f"[warmup] face recogniser load skipped ({e})")

        if detector is None:
            _record("face", "skipped", t0, "detector in OpenCV fallback mode")
            return
        # Dummy inference triggers CUDA/cuDNN init on the real device.
        try:
            detector(np.zeros((320, 320, 3), dtype=np.uint8), verbose=False)
        except Exception:
            pass
        _record("face", "ok", t0)
    except Exception as e:
        _record("face", "error", t0, str(e))


def _warm_objects() -> None:
    """Warm the YOLOv8 object/weapon detector."""
    t0 = time.perf_counter()
    try:
        from ai_pipeline import object_detection as od  # noqa: PLC0415

        detector = od._get_yolo_detector()
        if detector is None:
            _record("objects", "skipped", t0, "OpenCV fallback mode")
            return
        try:
            detector(np.zeros((640, 640, 3), dtype=np.uint8), verbose=False)
        except Exception:
            pass
        _record("objects", "ok", t0)
    except Exception as e:
        _record("objects", "error", t0, str(e))


def _warm_clip() -> None:
    """Warm the CLIP text/image model used for keyword search."""
    t0 = time.perf_counter()
    try:
        from ai_pipeline import keyword_search as ks  # noqa: PLC0415

        if not getattr(ks, "_TORCH_AVAILABLE", False):
            _record("clip", "skipped", t0, "torch unavailable — OpenCV fallback")
            return
        model, processor = ks._get_clip()
        if model is None:
            _record("clip", "skipped", t0, "model unavailable")
            return
        # Dummy encode to warm the vision + text towers.
        try:
            import torch  # noqa: PLC0415

            device = ks._get_clip_device()
            dummy = np.zeros((64, 64, 3), dtype=np.uint8)
            inputs = processor(
                text=["a photo"],
                images=dummy,
                return_tensors="pt",
                padding=True,
            )
            if device is not None:
                inputs = {k: v.to(device) for k, v in inputs.items()}
            with torch.no_grad():
                model(**inputs)
        except Exception:
            pass
        _record("clip", "ok", t0)
    except Exception as e:
        _record("clip", "error", t0, str(e))


def _warm_lpr() -> None:
    """Warm the EasyOCR reader used for licence-plate recognition."""
    t0 = time.perf_counter()
    try:
        from ai_pipeline import lpr_search as lpr  # noqa: PLC0415

        if not getattr(lpr, "_OCR_AVAILABLE", False):
            _record("lpr", "skipped", t0, "easyocr unavailable — contour fallback")
            return
        reader = lpr._get_ocr_reader()
        if reader is None:
            _record("lpr", "skipped", t0, "reader unavailable")
            return
        try:
            reader.readtext(np.zeros((64, 128, 3), dtype=np.uint8))
        except Exception:
            pass
        _record("lpr", "ok", t0)
    except Exception as e:
        _record("lpr", "error", t0, str(e))


def warm_models() -> None:
    """Warm every heavy model in sequence. Safe to call once at startup."""
    if WARMUP_STATE["started"]:
        return
    WARMUP_STATE["started"] = True
    WARMUP_STATE["started_at"] = time.time()
    t0 = time.perf_counter()
    print("[warmup] pre-loading AI models…")

    # Sequential on purpose: loading several multi-hundred-MB torch models at
    # once spikes RAM/VRAM and can trigger OOM on modest machines. The cost is
    # paid once, in the background, before the user's first search.
    for warm in (_warm_face, _warm_objects, _warm_clip, _warm_lpr):
        warm()

    WARMUP_STATE["done"] = True
    WARMUP_STATE["finished_at"] = time.time()
    total = round(time.perf_counter() - t0, 2)
    ready = sum(1 for m in WARMUP_STATE["models"].values() if m["status"] == "ok")
    print(f"[warmup] complete in {total}s — {ready}/{len(WARMUP_STATE['models'])} models hot")

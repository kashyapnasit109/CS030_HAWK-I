"""
VisionCCTV Backend — FastAPI Application
AI-Powered CCTV Analysis Tool
"""

import os
import sys
import cv2
import opencv_compat  # noqa: F401
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# Ensure storage dirs exist at startup
BASE_DIR = Path(__file__).parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
REFERENCES_DIR = STORAGE_DIR / "references"
RESULTS_DIR = STORAGE_DIR / "results"
THUMBNAILS_DIR = STORAGE_DIR / "thumbnails"
ENHANCED_DIR = STORAGE_DIR / "enhanced"

for d in [UPLOADS_DIR, REFERENCES_DIR, RESULTS_DIR, THUMBNAILS_DIR, ENHANCED_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Initialize SQLite database schema and seed default users/cameras
from init_db import init_database
init_database()

# Seed demo database from the original repo if empty
ORIGINAL_DB = BASE_DIR.parent / "Face-Detection-and-Recognition-with-YOLOv8-and-FaceNet-PyTorch-main" / "database"
if ORIGINAL_DB.exists():
    import shutil, json as _json, time as _time  # noqa: E401
    for img in ORIGINAL_DB.glob("*.jpg"):
        dest = REFERENCES_DIR / img.name
        if not dest.exists():
            shutil.copy2(img, dest)
        # Create meta.json if missing
        stem = img.stem
        meta_f = REFERENCES_DIR / f"{stem}.meta.json"
        if not meta_f.exists():
            meta_f.write_text(_json.dumps({
                "id": stem,
                "original_filename": img.name,
                "stored_filename": img.name,
                "label": stem.replace("_", " ").title(),
                "upload_time": _time.time(),
                "image_url": f"/storage/references/{img.name}",
            }, indent=2))

# Seed demo video if uploads empty
ORIGINAL_VIDEO = BASE_DIR.parent / "Face-Detection-and-Recognition-with-YOLOv8-and-FaceNet-PyTorch-main" / "subway.mp4"
if ORIGINAL_VIDEO.exists() and not any(UPLOADS_DIR.glob("*.meta.json")):
    import shutil, json, time
    shutil.copy2(ORIGINAL_VIDEO, UPLOADS_DIR / "subway.mp4")
    # Compute real duration + thumbnail for seeded demo video
    _cap = cv2.VideoCapture(str(UPLOADS_DIR / "subway.mp4"))
    _fps = _cap.get(cv2.CAP_PROP_FPS) or 25.0
    _frames = _cap.get(cv2.CAP_PROP_FRAME_COUNT)
    _duration = round(_frames / _fps, 2) if _fps > 0 else None
    _thumb_path = THUMBNAILS_DIR / "subway.jpg"
    if not _thumb_path.exists():
        _ok, _frame = _cap.read()
        if _ok:
            cv2.imwrite(str(_thumb_path), _frame)
    _cap.release()
    meta = {
        "id": "subway",
        "original_filename": "subway.mp4",
        "stored_filename": "subway.mp4",
        "camera_id": "CAM-DEMO-01",
        "upload_time": time.time(),
        "size_bytes": ORIGINAL_VIDEO.stat().st_size,
        "duration_seconds": _duration,
        "thumbnail_url": "/storage/thumbnails/subway.jpg" if _thumb_path.exists() else None,
    }
    (UPLOADS_DIR / "subway.meta.json").write_text(json.dumps(meta, indent=2))

# Register routers
from routers import videos, search, export, references, cameras, auth, cases, watchlists, audit, settings, enhance, ai_gateway, iot, campus_safety, feedback, prime_copilot, supervision_studio, compliance  # noqa: E402

app = FastAPI(
    title="VIGINT API",
    description="VIGINT: Intelligent Campus Safety & Emergency Response Platform (SIH Edition)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve stored images/frames statically
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

app.include_router(videos.router, prefix="/api/videos", tags=["Videos"])
app.include_router(references.router, prefix="/api/references", tags=["References"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["Cameras"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["Watchlists"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(enhance.router, prefix="/api/enhance", tags=["Enhance"])
app.include_router(ai_gateway.router, prefix="/api/ai-gateway", tags=["AI Gateway"])
app.include_router(iot.router, tags=["IoT & Sensor Grid"])
app.include_router(campus_safety.router, tags=["Campus Safety & Escalation"])
app.include_router(feedback.router, tags=["Active Learning & Model Feedback"])
app.include_router(prime_copilot.router, tags=["Prime Agent & Continual Harness"])
app.include_router(supervision_studio.router)
app.include_router(compliance.router)



@app.on_event("startup")
def _warmup_models_on_startup():
    """Pre-load the heavy AI models in a background thread so the first search
    is fast. Disable with VISIONCCTV_WARMUP=0 on low-memory machines."""
    if os.environ.get("VISIONCCTV_WARMUP", "1").lower() not in ("1", "true", "yes", "on"):
        print("[warmup] disabled via VISIONCCTV_WARMUP")
        return
    import threading

    def _run():
        try:
            from ai_pipeline.warmup import warm_models
            warm_models()
        except Exception as e:  # never let warmup crash the server
            print(f"[warmup] background warmup aborted: {e}")

    threading.Thread(target=_run, name="model-warmup", daemon=True).start()
    print("[warmup] background model warmup thread started")


@app.get("/api/warmup", tags=["Health"])
def warmup_status():
    """Report AI-model warmup progress so the UI can show a 'models ready' state."""
    try:
        from ai_pipeline.warmup import WARMUP_STATE
        return WARMUP_STATE
    except Exception as e:
        return {"started": False, "done": False, "models": {}, "detail": str(e)}


@app.get("/health", tags=["Health"])
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "VisionCCTV API"}


@app.get("/", tags=["Health"])
def root():
    return {"message": "VisionCCTV API is running. Visit /docs for API documentation."}

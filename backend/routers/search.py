import json
import time
import uuid
import sqlite3
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from database import get_db
import auth_utils

router = APIRouter()

# Max seconds a job is allowed to run before being forcibly marked failed
JOB_TIMEOUT_SECONDS = 600

BASE_DIR = Path(__file__).parent.parent
UPLOADS_DIR = BASE_DIR / "storage" / "uploads"
REFERENCES_DIR = BASE_DIR / "storage" / "references"
RESULTS_DIR = BASE_DIR / "storage" / "results"

# In-memory job tracker (resets on server restart; fine for hackathon)
_jobs: dict[str, dict[str, Any]] = {}


class ImageSearchRequest(BaseModel):
    video_ids: list[str] = Field(..., description="List of uploaded video IDs to search")
    reference_ids: list[str] = Field(..., description="List of reference image IDs")
    confidence_threshold: float = Field(0.65, ge=0.0, le=1.0)
    similarity_threshold: float = Field(0.70, ge=0.0, le=1.0)
    sample_fps: float = Field(1.0, ge=0.1, le=10.0)
    start_time: float | None = Field(None, description="Start time filter in seconds")
    end_time: float | None = Field(None, description="End time filter in seconds")


class KeywordSearchRequest(BaseModel):
    video_ids: list[str] = Field(..., description="List of uploaded video IDs to search")
    keyword: str = Field(..., min_length=1, description="Natural-language search query")
    similarity_threshold: float = Field(0.25, ge=0.0, le=1.0)
    sample_fps: float = Field(1.0, ge=0.1, le=10.0)
    start_time: float | None = Field(None, description="Start time filter in seconds")
    end_time: float | None = Field(None, description="End time filter in seconds")


class LprSearchRequest(BaseModel):
    video_ids: list[str] = Field(..., description="List of uploaded video IDs to search")
    plate_text: str = Field(..., min_length=1, description="License plate characters to match")
    similarity_threshold: float = Field(0.50, ge=0.0, le=1.0)
    sample_fps: float = Field(1.0, ge=0.1, le=10.0)
    start_time: float | None = Field(None, description="Start time filter in seconds")
    end_time: float | None = Field(None, description="End time filter in seconds")


def _resolve_video(video_id: str) -> tuple[Path, dict]:
    meta_file = UPLOADS_DIR / f"{video_id}.meta.json"
    if not meta_file.exists():
        raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found")
    meta = json.loads(meta_file.read_text())
    video_path = UPLOADS_DIR / meta["stored_filename"]
    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video file for '{video_id}' missing from disk")
    return video_path, meta


def _resolve_reference(ref_id: str) -> Path:
    meta_file = REFERENCES_DIR / f"{ref_id}.meta.json"
    if not meta_file.exists():
        raise HTTPException(status_code=404, detail=f"Reference '{ref_id}' not found")
    meta = json.loads(meta_file.read_text())
    ref_path = REFERENCES_DIR / meta["stored_filename"]
    if not ref_path.exists():
        raise HTTPException(status_code=404, detail=f"Reference file for '{ref_id}' missing")
    return ref_path


def _run_face_search_task(job_id: str, request: ImageSearchRequest):
    """Background task for face recognition search."""
    from ai_pipeline.face_recognition import run_face_recognition_search  # noqa: PLC0415

    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["started_at"] = time.time()
    all_matches = []

    try:
        ref_paths = [_resolve_reference(rid) for rid in request.reference_ids]

        for vid_id in request.video_ids:
            # Timeout guard
            if time.time() - _jobs[job_id]["started_at"] > JOB_TIMEOUT_SECONDS:
                raise TimeoutError("Job exceeded maximum allowed runtime")

            video_path, meta = _resolve_video(vid_id)
            sub_job_id = f"{job_id}_{vid_id}"
            matches = run_face_recognition_search(
                video_path=video_path,
                reference_image_paths=ref_paths,
                camera_id=meta.get("camera_id", "CAM-01"),
                confidence_threshold=request.confidence_threshold,
                similarity_threshold=request.similarity_threshold,
                sample_fps=request.sample_fps,
                job_id=sub_job_id,
                start_time=request.start_time,
                end_time=request.end_time,
                progress_cb=lambda p, m: _update_progress(job_id, p, m),
            )
            all_matches.extend(matches)

        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["matches"] = all_matches
        _jobs[job_id]["match_count"] = len(all_matches)
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)


def _update_progress(job_id: str, frames_processed: int, frames_matched: int):
    """Called by AI pipelines to report incremental progress."""
    if job_id in _jobs:
        _jobs[job_id]["frames_processed"] = frames_processed
        _jobs[job_id]["frames_matched"] = frames_matched


def _run_keyword_search_task(job_id: str, request: KeywordSearchRequest):
    """Background task for keyword search."""
    from ai_pipeline.keyword_search import run_keyword_search  # noqa: PLC0415
    from nlp_utils import translate_query_to_english  # noqa: PLC0415

    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["started_at"] = time.time()
    all_matches = []

    # Translate Gujarati/Hindi to English if applicable
    search_keyword, translated = translate_query_to_english(request.keyword)
    if translated:
        print(f"[nlp_translation] Translated '{request.keyword}' -> '{search_keyword}'")
        _jobs[job_id]["translated_query"] = search_keyword

    try:
        for vid_id in request.video_ids:
            # Timeout guard
            if time.time() - _jobs[job_id]["started_at"] > JOB_TIMEOUT_SECONDS:
                raise TimeoutError("Job exceeded maximum allowed runtime")

            video_path, meta = _resolve_video(vid_id)
            sub_job_id = f"{job_id}_{vid_id}"
            matches = run_keyword_search(
                video_path=video_path,
                keyword=search_keyword,
                camera_id=meta.get("camera_id", "CAM-01"),
                similarity_threshold=request.similarity_threshold,
                sample_fps=request.sample_fps,
                job_id=sub_job_id,
                start_time=request.start_time,
                end_time=request.end_time,
                progress_cb=lambda p, m: _update_progress(job_id, p, m),
            )
            all_matches.extend(matches)

        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["matches"] = all_matches
        _jobs[job_id]["match_count"] = len(all_matches)
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)


def _run_lpr_search_task(job_id: str, request: LprSearchRequest):
    """Background task for license plate search."""
    from ai_pipeline.lpr_search import run_lpr_search  # noqa: PLC0415

    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["started_at"] = time.time()
    all_matches = []

    try:
        for vid_id in request.video_ids:
            # Timeout guard
            if time.time() - _jobs[job_id]["started_at"] > JOB_TIMEOUT_SECONDS:
                raise TimeoutError("Job exceeded maximum allowed runtime")

            video_path, meta = _resolve_video(vid_id)
            sub_job_id = f"{job_id}_{vid_id}"
            matches = run_lpr_search(
                video_path=video_path,
                plate_text=request.plate_text,
                camera_id=meta.get("camera_id", "CAM-01"),
                similarity_threshold=request.similarity_threshold,
                sample_fps=request.sample_fps,
                job_id=sub_job_id,
                start_time=request.start_time,
                end_time=request.end_time,
                progress_cb=lambda p, m: _update_progress(job_id, p, m),
            )
            all_matches.extend(matches)

        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["matches"] = all_matches
        _jobs[job_id]["match_count"] = len(all_matches)
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)


@router.post("/by-image")
def search_by_image(
    request: ImageSearchRequest,
    background_tasks: BackgroundTasks,
    _ = Depends(auth_utils.check_rate_limit)
):
    """Start a face recognition search job. Returns a job_id to poll for status."""
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "queued", "type": "face_recognition", "matches": [], "match_count": 0,
                     "frames_processed": 0, "frames_matched": 0}
    background_tasks.add_task(_run_face_search_task, job_id, request)
    return {"job_id": job_id, "status": "queued"}


@router.post("/by-keyword")
def search_by_keyword(
    request: KeywordSearchRequest,
    background_tasks: BackgroundTasks,
    _ = Depends(auth_utils.check_rate_limit)
):
    """Start a keyword search job. Returns a job_id to poll for status."""
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "queued", "type": "keyword", "matches": [], "match_count": 0,
                     "frames_processed": 0, "frames_matched": 0}
    background_tasks.add_task(_run_keyword_search_task, job_id, request)
    return {"job_id": job_id, "status": "queued"}


@router.post("/by-lpr")
def search_by_lpr(
    request: LprSearchRequest,
    background_tasks: BackgroundTasks,
    _ = Depends(auth_utils.check_rate_limit)
):
    """Start a license plate recognition search job. Returns a job_id to poll for status."""
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "queued", "type": "lpr", "matches": [], "match_count": 0,
                     "frames_processed": 0, "frames_matched": 0}
    background_tasks.add_task(_run_lpr_search_task, job_id, request)
    return {"job_id": job_id, "status": "queued"}


class AttributeSearchRequest(BaseModel):
    video_ids: list[str] = Field(..., description="List of uploaded video IDs to search")
    top_color: str | None = None
    bottom_color: str | None = None
    headgear: str | None = None
    bag_present: bool | None = None
    pose_state: str | None = None
    start_time: float | None = None
    end_time: float | None = None

@router.post("/by-attributes")
def search_by_attributes(
    request: AttributeSearchRequest,
    db: sqlite3.Connection = Depends(get_db),
    _ = Depends(auth_utils.check_rate_limit)
):
    """Search for matching events and persons based on visual attributes from the SQLite database."""
    cursor = db.cursor()
    
    query = """
        SELECT e.event_id, e.camera_id, e.module, e.object_label, e.severity, e.summary, e.detected_at, e.frame_path,
               a.top_color, a.bottom_color, a.headgear, a.bag_present, a.pose_state
        FROM detection_events e
        JOIN person_attributes a ON e.event_id = a.event_id
        WHERE 1=1
    """
    params = []
    
    if request.top_color and request.top_color != "all":
        query += " AND a.top_color = ?"
        params.append(request.top_color)
        
    if request.bottom_color and request.bottom_color != "all":
        query += " AND a.bottom_color = ?"
        params.append(request.bottom_color)
        
    if request.headgear and request.headgear != "all":
        query += " AND a.headgear = ?"
        params.append(request.headgear)
        
    if request.bag_present is not None:
        query += " AND a.bag_present = ?"
        params.append(1 if request.bag_present else 0)
        
    if request.pose_state and request.pose_state != "all":
        query += " AND a.pose_state = ?"
        params.append(request.pose_state)
        
    query += " ORDER BY e.detected_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    matches = []
    for r in rows:
        matches.append({
            "camera_id": r["camera_id"],
            "timestamp": r["detected_at"],
            "timestamp_str": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(r["detected_at"])),
            "frame_url": r["frame_path"],
            "confidence": 0.85,
            "label": r["object_label"],
            "search_type": "attributes",
            "box": {"x1": 100, "y1": 50, "x2": 300, "y2": 450},
            "ocr_text": None,
            "attributes": {
                "top_color": r["top_color"],
                "bottom_color": r["bottom_color"],
                "headgear": r["headgear"],
                "bag_present": bool(r["bag_present"]),
                "pose_state": r["pose_state"]
            }
        })
        
    job_id = f"attr_{str(uuid.uuid4())[:8]}"
    _jobs[job_id] = {
        "status": "completed",
        "type": "attributes",
        "matches": matches,
        "match_count": len(matches)
    }
    
    return {"job_id": job_id, "status": "completed"}


class ObjectSearchRequest(BaseModel):
    video_ids: list[str] = Field(..., description="List of uploaded video IDs to search")
    target_classes: list[str] = Field(default=[], description="COCO classes to detect (empty = all)")
    confidence_threshold: float = Field(0.40, ge=0.0, le=1.0)
    sample_fps: float = Field(1.0, ge=0.1, le=10.0)
    start_time: float | None = Field(None, description="Start time filter in seconds")
    end_time: float | None = Field(None, description="End time filter in seconds")


class ActivityAnalysisRequest(BaseModel):
    video_ids: list[str] = Field(..., description="List of uploaded video IDs to analyze")
    sample_fps: float = Field(2.0, ge=0.1, le=10.0)
    crowd_threshold: int = Field(3, ge=1, le=50, description="Min persons to flag as crowd")
    motion_threshold: float = Field(0.03, ge=0.0, le=1.0)
    scene_change_threshold: float = Field(0.35, ge=0.0, le=1.0)
    start_time: float | None = Field(None, description="Start time filter in seconds")
    end_time: float | None = Field(None, description="End time filter in seconds")


def _run_object_search_task(job_id: str, request: ObjectSearchRequest):
    """Background task for object detection search."""
    from ai_pipeline.object_detection import run_object_detection  # noqa: PLC0415

    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["started_at"] = time.time()
    all_matches = []

    try:
        for vid_id in request.video_ids:
            if time.time() - _jobs[job_id]["started_at"] > JOB_TIMEOUT_SECONDS:
                raise TimeoutError("Job exceeded maximum allowed runtime")

            video_path, meta = _resolve_video(vid_id)
            sub_job_id = f"{job_id}_{vid_id}"
            matches = run_object_detection(
                video_path=video_path,
                target_classes=request.target_classes or None,
                confidence_threshold=request.confidence_threshold,
                sample_fps=request.sample_fps,
                camera_id=meta.get("camera_id", "CAM-01"),
                job_id=sub_job_id,
                start_time=request.start_time,
                end_time=request.end_time,
                progress_cb=lambda p, m: _update_progress(job_id, p, m),
            )
            all_matches.extend(matches)

        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["matches"] = all_matches
        _jobs[job_id]["match_count"] = len(all_matches)
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)


def _run_activity_analysis_task(job_id: str, request: ActivityAnalysisRequest):
    """Background task for activity analysis."""
    from ai_pipeline.activity_analysis import run_activity_analysis  # noqa: PLC0415

    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["started_at"] = time.time()

    try:
        all_results = []
        for vid_id in request.video_ids:
            if time.time() - _jobs[job_id]["started_at"] > JOB_TIMEOUT_SECONDS:
                raise TimeoutError("Job exceeded maximum allowed runtime")

            video_path, meta = _resolve_video(vid_id)
            sub_job_id = f"{job_id}_{vid_id}"
            result = run_activity_analysis(
                video_path=video_path,
                camera_id=meta.get("camera_id", "CAM-01"),
                sample_fps=request.sample_fps,
                job_id=sub_job_id,
                start_time=request.start_time,
                end_time=request.end_time,
                crowd_threshold=request.crowd_threshold,
                motion_threshold=request.motion_threshold,
                scene_change_threshold=request.scene_change_threshold,
                progress_cb=lambda p, m: _update_progress(job_id, p, m),
            )
            all_results.append(result)

        # Aggregate results into matches format for consistency
        all_matches = []
        activity_data = {}
        for r in all_results:
            # Add crowd events as matches
            for event in r.get("crowd_events", []):
                all_matches.append({
                    "camera_id": event.get("camera_id", "CAM-01"),
                    "timestamp": event["timestamp"],
                    "timestamp_str": event["timestamp_str"],
                    "frame_url": event["frame_url"],
                    "confidence": min(1.0, event["person_count"] / max(request.crowd_threshold * 2, 1)),
                    "label": f"Crowd: {event['person_count']} persons",
                    "search_type": "activity_analysis",
                })
            # Add motion events as matches
            for event in r.get("motion_events", [])[:20]:
                all_matches.append({
                    "camera_id": event.get("camera_id", "CAM-01"),
                    "timestamp": event["timestamp"],
                    "timestamp_str": event["timestamp_str"],
                    "frame_url": event["frame_url"],
                    "confidence": event["intensity"],
                    "label": f"High motion ({event['intensity']:.0%})",
                    "search_type": "activity_analysis",
                })
            # Add scene changes as matches
            for event in r.get("scene_changes", []):
                all_matches.append({
                    "camera_id": event.get("camera_id", "CAM-01"),
                    "timestamp": event["timestamp"],
                    "timestamp_str": event["timestamp_str"],
                    "frame_url": event["frame_url"],
                    "confidence": event["dissimilarity"],
                    "label": f"Scene change ({event['dissimilarity']:.0%})",
                    "search_type": "activity_analysis",
                })
            activity_data = r.get("summary", {})
            activity_data["heatmap_url"] = r.get("heatmap_url")

        _jobs[job_id]["status"] = "completed"
        _jobs[job_id]["matches"] = all_matches
        _jobs[job_id]["match_count"] = len(all_matches)
        _jobs[job_id]["activity_data"] = activity_data
    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)


@router.post("/by-object")
def search_by_object(request: ObjectSearchRequest, background_tasks: BackgroundTasks):
    """Start an object detection search job. Returns a job_id to poll for status."""
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "queued", "type": "object_detection", "matches": [], "match_count": 0,
                     "frames_processed": 0, "frames_matched": 0}
    background_tasks.add_task(_run_object_search_task, job_id, request)
    return {"job_id": job_id, "status": "queued"}


@router.post("/activity-analysis")
def search_activity(request: ActivityAnalysisRequest, background_tasks: BackgroundTasks):
    """Start an activity analysis job. Returns a job_id to poll for status."""
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "queued", "type": "activity_analysis", "matches": [], "match_count": 0,
                     "frames_processed": 0, "frames_matched": 0}
    background_tasks.add_task(_run_activity_analysis_task, job_id, request)
    return {"job_id": job_id, "status": "queued"}


@router.get("/job/{job_id}")
def get_job_status(job_id: str):
    """Poll job status and retrieve results when complete."""
    if job_id not in _jobs:
        # Check subdirectories of RESULTS_DIR for manifest.json files that match this job ID
        all_matches = []
        search_type = "unknown"
        has_manifest = False
        
        # Check single-video folder
        manifest_file = RESULTS_DIR / job_id / "manifest.json"
        if manifest_file.exists():
            try:
                manifest = json.loads(manifest_file.read_text())
                all_matches.extend(manifest.get("matches", []))
                search_type = manifest.get("search_type", "unknown")
                has_manifest = True
            except Exception:
                pass
        else:
            # Check multi-video folder prefixes (e.g. jobid_cam01, jobid_cam02)
            for sub_dir in RESULTS_DIR.iterdir():
                if sub_dir.is_dir() and sub_dir.name.startswith(job_id):
                    sub_manifest = sub_dir / "manifest.json"
                    if sub_manifest.exists():
                        try:
                            manifest = json.loads(sub_manifest.read_text())
                            all_matches.extend(manifest.get("matches", []))
                            search_type = manifest.get("search_type", "unknown")
                            has_manifest = True
                        except Exception:
                            pass
                            
        if has_manifest:
            _jobs[job_id] = {
                "status": "completed",
                "type": search_type,
                "matches": all_matches,
                "match_count": len(all_matches),
            }

    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return _jobs[job_id]


@router.get("/jobs")
def list_jobs():
    """List all search jobs in this session."""
    return {"jobs": {k: {kk: vv for kk, vv in v.items() if kk != "matches"} for k, v in _jobs.items()}}

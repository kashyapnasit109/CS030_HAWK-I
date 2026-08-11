import sqlite3
import time
import hashlib
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import cv2
from database import get_db
import auth_utils
from chain_of_custody import log_chain_of_custody

router = APIRouter()

BASE_DIR = Path(__file__).parent.parent
UPLOADS_DIR = BASE_DIR / "storage" / "uploads"
THUMBNAILS_DIR = BASE_DIR / "storage" / "thumbnails"

# Ensure directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".wmv"}

class CaseCreateRequest(BaseModel):
    case_number: str
    title: str
    description: str | None = None

class EvidenceCreateRequest(BaseModel):
    kind: str = "manual"                 # face, keyword, lpr, object, manual
    label: str
    summary: str | None = None
    video_id: str | None = None
    source_label: str | None = None
    timestamp_seconds: float | None = None
    confidence: float | None = None
    thumb_url: str | None = None
    frame_hash: str | None = None
    meta_json: str | None = None

def _sha256_file(path: Path) -> str:
    """Compute SHA-256 hex digest of a file for forensic integrity."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "N/A"

def _extract_thumbnail(video_path: Path, thumb_path: Path) -> float | None:
    """Extract first frame as JPEG thumbnail and return video duration."""
    cap = cv2.VideoCapture(str(video_path))
    duration = None
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        if fps and fps > 0:
            duration = total_frames / fps

        success, frame = cap.read()
        if success:
            cv2.imwrite(str(thumb_path), frame)
    finally:
        cap.release()
    return duration

@router.get("/list")
def list_cases(db: sqlite3.Connection = Depends(get_db), user = Depends(auth_utils.get_current_user)):
    cursor = db.cursor()
    cursor.execute(
        """SELECT c.case_id, c.case_number, c.title, c.description, c.status, c.created_at, u.name as officer_name 
           FROM cases c 
           LEFT JOIN users u ON c.investigating_officer_id = u.user_id 
           ORDER BY c.created_at DESC;"""
    )
    cases = [dict(row) for row in cursor.fetchall()]
    return {"cases": cases, "count": len(cases)}

@router.post("/create")
def create_case(req: CaseCreateRequest, db: sqlite3.Connection = Depends(get_db), user = Depends(auth_utils.get_current_user)):
    cursor = db.cursor()
    cursor.execute("SELECT case_id FROM cases WHERE case_number = ?;", (req.case_number,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Case number already exists")
        
    cursor.execute(
        "INSERT INTO cases (case_number, title, description, investigating_officer_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?);",
        (req.case_number, req.title, req.description, user["user_id"], "open", time.time())
    )
    db.commit()
    case_id = cursor.lastrowid
    return {"success": True, "case_id": case_id}

@router.get("/{case_id}")
def get_case_detail(case_id: int, db: sqlite3.Connection = Depends(get_db), user = Depends(auth_utils.get_current_user)):
    cursor = db.cursor()
    cursor.execute(
        """SELECT c.case_id, c.case_number, c.title, c.description, c.status, c.created_at, u.name as officer_name 
           FROM cases c 
           LEFT JOIN users u ON c.investigating_officer_id = u.user_id 
           WHERE c.case_id = ?;""",
        (case_id,)
    )
    case = cursor.fetchone()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    cursor.execute(
        "SELECT media_id, source_label, original_filename, file_path, sha256_hash, duration_seconds, resolution, processing_status, uploaded_at FROM case_media WHERE case_id = ?;",
        (case_id,)
    )
    media = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute(
        "SELECT event_id, camera_id, module, object_label, severity, summary, detected_at FROM detection_events WHERE case_id = ? ORDER BY detected_at DESC;",
        (case_id,)
    )
    events = [dict(row) for row in cursor.fetchall()]
    
    return {
        "case": dict(case),
        "media": media,
        "events": events
    }

@router.post("/{case_id}/upload_media")
async def upload_case_media(
    case_id: int,
    file: UploadFile = File(...),
    source_label: str = Form("Shop CCTV"),
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    """Upload a video file attached to a specific case, hash it, and log custody."""
    # Check if case exists
    cursor = db.cursor()
    cursor.execute("SELECT case_id FROM cases WHERE case_id = ?;", (case_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Case not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    media_uuid = str(uuid.uuid4())[:8]
    safe_name = f"case_{case_id}_{media_uuid}{ext}"
    video_path = UPLOADS_DIR / safe_name
    thumb_path = THUMBNAILS_DIR / f"case_{case_id}_{media_uuid}.jpg"

    # Save video file
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Extract info
    duration = _extract_thumbnail(video_path, thumb_path)
    sha_hash = _sha256_file(video_path)

    # Insert into database
    cursor.execute(
        """INSERT INTO case_media 
           (case_id, source_label, original_filename, file_path, sha256_hash, duration_seconds, resolution, uploaded_by, uploaded_at, processing_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
        (case_id, source_label, file.filename, f"/storage/uploads/{safe_name}", sha_hash, duration, "1920x1080", user["user_id"], time.time(), "done")
    )
    db.commit()
    media_id = cursor.lastrowid

    # Log chain of custody
    log_chain_of_custody(
        action="ingested",
        user_id=user["user_id"],
        media_id=media_id,
        hash_value=sha_hash,
        notes=f"Ingested case video: {file.filename}. Assigned ID: {media_id}."
    )

    return {
        "success": True,
        "media_id": media_id,
        "sha256": sha_hash,
        "filename": file.filename,
        "thumbnail_url": f"/storage/thumbnails/case_{case_id}_{media_uuid}.jpg"
    }


def _ensure_case_evidence_table(cursor: sqlite3.Cursor) -> None:
    """Create case_evidence on demand so the feature works even on a DB that
    was initialised before this table existed (defensive; schema.sql also
    creates it on next boot)."""
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS case_evidence (
             evidence_id INTEGER PRIMARY KEY AUTOINCREMENT,
             case_id INTEGER NOT NULL,
             kind TEXT NOT NULL,
             label TEXT NOT NULL,
             summary TEXT NULL,
             video_id TEXT NULL,
             source_label TEXT NULL,
             timestamp_seconds REAL NULL,
             confidence REAL NULL,
             thumb_url TEXT NULL,
             frame_hash TEXT NULL,
             meta_json TEXT NULL,
             added_by INTEGER NULL,
             added_at REAL NOT NULL,
             FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
             FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE SET NULL
           );"""
    )


@router.post("/{case_id}/evidence")
def add_case_evidence(
    case_id: int,
    req: EvidenceCreateRequest,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(auth_utils.get_current_user),
):
    """Pin a search hit / crop from any AI module to a case as evidence."""
    cursor = db.cursor()
    cursor.execute("SELECT case_id FROM cases WHERE case_id = ?;", (case_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Case not found")

    _ensure_case_evidence_table(cursor)

    ts = time.time()
    cursor.execute(
        """INSERT INTO case_evidence
           (case_id, kind, label, summary, video_id, source_label,
            timestamp_seconds, confidence, thumb_url, frame_hash, meta_json,
            added_by, added_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
        (
            case_id, req.kind, req.label, req.summary, req.video_id,
            req.source_label, req.timestamp_seconds, req.confidence,
            req.thumb_url, req.frame_hash, req.meta_json, user["user_id"], ts,
        ),
    )
    db.commit()
    evidence_id = cursor.lastrowid

    # Tamper-evident custody trail for the pinned evidence.
    try:
        log_chain_of_custody(
            action="annotated",
            user_id=user["user_id"],
            hash_value=req.frame_hash,
            notes=f"Pinned {req.kind} evidence to case {case_id}: {req.label}",
        )
    except Exception as e:
        print(f"[cases] custody log failed for evidence {evidence_id}: {e}")

    return {"success": True, "evidence_id": evidence_id}


@router.get("/{case_id}/evidence")
def list_case_evidence(
    case_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(auth_utils.get_current_user),
):
    """List all evidence pinned to a case, newest first."""
    cursor = db.cursor()
    _ensure_case_evidence_table(cursor)
    cursor.execute(
        """SELECT evidence_id, case_id, kind, label, summary, video_id,
                  source_label, timestamp_seconds, confidence, thumb_url,
                  frame_hash, meta_json, added_by, added_at
           FROM case_evidence WHERE case_id = ? ORDER BY added_at DESC;""",
        (case_id,),
    )
    evidence = [dict(row) for row in cursor.fetchall()]
    return {"evidence": evidence, "count": len(evidence)}


@router.delete("/{case_id}/evidence/{evidence_id}")
def delete_case_evidence(
    case_id: int,
    evidence_id: int,
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(auth_utils.get_current_user),
):
    """Remove a pinned evidence item from a case."""
    cursor = db.cursor()
    _ensure_case_evidence_table(cursor)
    cursor.execute(
        "DELETE FROM case_evidence WHERE evidence_id = ? AND case_id = ?;",
        (evidence_id, case_id),
    )
    db.commit()
    return {"success": True}

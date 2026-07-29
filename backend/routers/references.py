"""
Reference image upload and listing router.
Phase 3: Upload suspect/vehicle photos for face re-ID.
"""

import json
import shutil
import time
import uuid
import sqlite3
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends
from fastapi.responses import JSONResponse
from database import get_db

router = APIRouter()

BASE_DIR = Path(__file__).parent.parent
REFERENCES_DIR = BASE_DIR / "storage" / "references"

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@router.post("/upload")
async def upload_reference(
    file: UploadFile = File(...),
    label: str = Form(default="Unknown"),
    db: sqlite3.Connection = Depends(get_db)
):
    """Upload a reference image (suspect photo) for face re-ID."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{ext}'. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    ref_id = str(uuid.uuid4())[:8]
    safe_name = f"{ref_id}{ext}"
    ref_path = REFERENCES_DIR / safe_name

    with open(ref_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    meta = {
        "id": ref_id,
        "original_filename": file.filename,
        "stored_filename": safe_name,
        "label": label,
        "upload_time": time.time(),
        "image_url": f"/storage/references/{safe_name}",
    }
    (REFERENCES_DIR / f"{ref_id}.meta.json").write_text(json.dumps(meta, indent=2))

    # Insert into SQLite database table
    try:
        cursor = db.cursor()
        cursor.execute(
            """INSERT INTO reference_images (ref_id, case_id, uploaded_by, image_path, subject_type, label, embedding, created_at)
               VALUES (?, NULL, NULL, ?, 'person', ?, NULL, ?);""",
            (ref_id, safe_name, label, time.time())
        )
        db.commit()
    except Exception as e:
        print(f"Failed to insert reference image to database: {e}")

    return JSONResponse(status_code=201, content={"success": True, "reference": meta})


@router.get("/list")
def list_references(db: sqlite3.Connection = Depends(get_db)):
    """List all uploaded reference images."""
    cursor = db.cursor()
    cursor.execute("SELECT ref_id, image_path, label, created_at FROM reference_images ORDER BY created_at DESC;")
    rows = cursor.fetchall()
    refs = []
    for row in rows:
        refs.append({
            "id": row["ref_id"],
            "original_filename": row["image_path"],
            "stored_filename": row["image_path"],
            "label": row["label"],
            "upload_time": row["created_at"],
            "image_url": f"/storage/references/{row['image_path']}",
        })
    return {"references": refs, "count": len(refs)}


@router.delete("/{ref_id}")
def delete_reference(ref_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete a reference image."""
    meta_file = REFERENCES_DIR / f"{ref_id}.meta.json"
    if not meta_file.exists():
        raise HTTPException(status_code=404, detail="Reference not found")

    meta = json.loads(meta_file.read_text())
    ref_path = REFERENCES_DIR / meta["stored_filename"]
    if ref_path.exists():
        ref_path.unlink()
    meta_file.unlink()

    # Delete from SQLite database table
    try:
        cursor = db.cursor()
        cursor.execute("DELETE FROM reference_images WHERE ref_id = ?;", (ref_id,))
        db.commit()
    except Exception as e:
        print(f"Failed to delete reference image from database: {e}")

    return {"success": True, "deleted_id": ref_id}


from pydantic import BaseModel
import base64
import urllib.request

class ReferenceFromUrlRequest(BaseModel):
    image_url: str
    label: str = "Suspect"
    subject_type: str = "person"

@router.post("/from-url")
def upload_reference_from_url(
    req: ReferenceFromUrlRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    """Save an existing image URL or screenshot as a labeled suspect reference image."""
    image_bytes = None
    cleaned = req.image_url.strip()

    if cleaned.startswith("data:image"):
        _, b64_data = cleaned.split(",", 1)
        image_bytes = base64.b64decode(b64_data)
    elif cleaned.startswith("http://") or cleaned.startswith("https://"):
        try:
            with urllib.request.urlopen(cleaned, timeout=10) as resp:
                image_bytes = resp.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image URL: {e}")
    else:
        # Local storage path
        rel_path = cleaned.replace("/storage/", "")
        local_path = BASE_DIR / "storage" / rel_path
        if not local_path.exists():
            raise HTTPException(status_code=404, detail=f"Source image '{cleaned}' not found")
        image_bytes = local_path.read_bytes()

    ref_id = str(uuid.uuid4())[:8]
    safe_name = f"{ref_id}.jpg"
    ref_path = REFERENCES_DIR / safe_name
    ref_path.write_bytes(image_bytes)

    label_text = req.label.strip() or "Suspect"
    meta = {
        "id": ref_id,
        "original_filename": safe_name,
        "stored_filename": safe_name,
        "label": label_text,
        "subject_type": req.subject_type,
        "upload_time": time.time(),
        "image_url": f"/storage/references/{safe_name}",
    }
    (REFERENCES_DIR / f"{ref_id}.meta.json").write_text(json.dumps(meta, indent=2))

    try:
        cursor = db.cursor()
        cursor.execute(
            """INSERT INTO reference_images (ref_id, case_id, uploaded_by, image_path, subject_type, label, embedding, created_at)
               VALUES (?, NULL, NULL, ?, ?, ?, NULL, ?);""",
            (ref_id, safe_name, req.subject_type, label_text, time.time())
        )
        db.commit()
    except Exception as e:
        print(f"Failed to insert reference image to database: {e}")

    return {"success": True, "reference": meta}

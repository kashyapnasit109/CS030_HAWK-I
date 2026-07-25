import sqlite3
import time
from fastapi import APIRouter, Depends, HTTPException, Form
from pydantic import BaseModel
from database import get_db
import auth_utils

router = APIRouter()

class WatchlistCreateRequest(BaseModel):
    name: str
    type: str  # face, plate

class PlateEntryRequest(BaseModel):
    plate_number: str
    alert_severity: str = "high"

@router.get("/list")
def list_watchlists(db: sqlite3.Connection = Depends(get_db), user = Depends(auth_utils.get_current_user)):
    cursor = db.cursor()
    cursor.execute("SELECT watchlist_id, name, type, created_at FROM watchlists;")
    lists = [dict(row) for row in cursor.fetchall()]
    
    # Enrich with entries
    for l in lists:
        cursor.execute(
            """SELECT entry_id, reference_image_id, plate_number, alert_severity, added_at 
               FROM watchlist_entries WHERE watchlist_id = ?;""",
            (l["watchlist_id"],)
        )
        l["entries"] = [dict(row) for row in cursor.fetchall()]
        
    return {"watchlists": lists, "count": len(lists)}

@router.post("/create")
def create_watchlist(req: WatchlistCreateRequest, db: sqlite3.Connection = Depends(get_db), user = Depends(auth_utils.get_current_user)):
    if req.type not in ["face", "plate"]:
        raise HTTPException(status_code=400, detail="Invalid watchlist type")
        
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO watchlists (name, type, created_by, created_at) VALUES (?, ?, ?, ?);",
        (req.name, req.type, user["user_id"], time.time())
    )
    db.commit()
    watchlist_id = cursor.lastrowid
    return {"success": True, "watchlist_id": watchlist_id}

@router.post("/{watchlist_id}/add_plate")
def add_plate_entry(
    watchlist_id: int, 
    req: PlateEntryRequest, 
    db: sqlite3.Connection = Depends(get_db), 
    user = Depends(auth_utils.get_current_user)
):
    cursor = db.cursor()
    # Confirm watchlist exists and is of plate type
    cursor.execute("SELECT type FROM watchlists WHERE watchlist_id = ?;", (watchlist_id,))
    wl = cursor.fetchone()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    if wl["type"] != "plate":
        raise HTTPException(status_code=400, detail="Watchlist is not a plate watchlist")
        
    cursor.execute(
        "INSERT INTO watchlist_entries (watchlist_id, reference_image_id, plate_number, alert_severity, added_at) VALUES (?, ?, ?, ?, ?);",
        (watchlist_id, None, req.plate_number.strip().upper(), req.alert_severity, time.time())
    )
    db.commit()
    return {"success": True, "entry_id": cursor.lastrowid}

@router.post("/{watchlist_id}/add_face")
def add_face_entry(
    watchlist_id: int,
    reference_image_id: int,
    alert_severity: str = "high",
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    cursor = db.cursor()
    # Confirm watchlist exists and is of face type
    cursor.execute("SELECT type FROM watchlists WHERE watchlist_id = ?;", (watchlist_id,))
    wl = cursor.fetchone()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    if wl["type"] != "face":
        raise HTTPException(status_code=400, detail="Watchlist is not a face watchlist")

    # Confirm reference image exists
    cursor.execute("SELECT ref_id FROM reference_images WHERE ref_id = ?;", (reference_image_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Reference image not found")
        
    cursor.execute(
        "INSERT INTO watchlist_entries (watchlist_id, reference_image_id, plate_number, alert_severity, added_at) VALUES (?, ?, ?, ?, ?);",
        (watchlist_id, reference_image_id, None, alert_severity, time.time())
    )
    db.commit()
    return {"success": True, "entry_id": cursor.lastrowid}

@router.delete("/{watchlist_id}/entries/{entry_id}")
def delete_entry(
    watchlist_id: int, 
    entry_id: int, 
    db: sqlite3.Connection = Depends(get_db), 
    user = Depends(auth_utils.get_current_user)
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM watchlist_entries WHERE entry_id = ? AND watchlist_id = ?;", (entry_id, watchlist_id))
    db.commit()
    return {"success": True}

@router.delete("/{watchlist_id}")
def delete_watchlist(
    watchlist_id: int, 
    db: sqlite3.Connection = Depends(get_db), 
    user = Depends(auth_utils.get_current_user)
):
    cursor = db.cursor()
    cursor.execute("DELETE FROM watchlists WHERE watchlist_id = ?;", (watchlist_id,))
    db.commit()
    return {"success": True}

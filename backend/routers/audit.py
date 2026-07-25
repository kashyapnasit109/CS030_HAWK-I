import sqlite3
import time
from fastapi import APIRouter, Depends
from database import get_db
import auth_utils

router = APIRouter()

def log_system_audit(db: sqlite3.Connection, username: str, action: str, detail: str):
    """Log system actions to the tamper-evident audit table."""
    try:
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO audit_log (ts, user, action, detail) VALUES (?, ?, ?, ?);",
            (time.time(), username, action, detail)
        )
        db.commit()
    except Exception as e:
        print(f"[audit_log] Fail logging audit: {e}")

@router.get("/list")
def list_audit_trail(
    db: sqlite3.Connection = Depends(get_db),
    user = Depends(auth_utils.check_role(["admin", "auditor"]))
):
    """Retrieve VMS audit operations logs."""
    cursor = db.cursor()
    cursor.execute("SELECT audit_id, ts, user, action, detail FROM audit_log ORDER BY ts DESC LIMIT 200;")
    logs = [dict(row) for row in cursor.fetchall()]
    return {"logs": logs, "count": len(logs)}

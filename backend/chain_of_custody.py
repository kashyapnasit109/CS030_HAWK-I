import time
import sqlite3
from database import db_session

def log_chain_of_custody(
    action: str,
    user_id: int,
    media_id: int = None,
    event_id: int = None,
    hash_value: str = None,
    notes: str = None
):
    """Log an action to the append-only chain of custody database table."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO chain_of_custody 
               (media_id, event_id, action, user_id, hash_value, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?);""",
            (media_id, event_id, action, user_id, hash_value, notes, time.time())
        )
        print(f"Logged custody event: user={user_id} action={action} media={media_id} event={event_id}")

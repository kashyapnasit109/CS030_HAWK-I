import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "storage" / "visioncctv.db"

# Ensure storage directory exists
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def get_connection():
    """Create a thread-safe connection to the SQLite database with dictionary rows."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys in SQLite
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def db_session():
    """Context manager for DB transactions. Auto-commits and auto-closes."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_db():
    """Dependency generator for FastAPI routers to yield a DB connection."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

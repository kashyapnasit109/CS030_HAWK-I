import sqlite3
import hashlib
import time
from pathlib import Path
from database import get_connection

BASE_DIR = Path(__file__).parent
SCHEMA_PATH = BASE_DIR / "storage" / "schema.sql"

from auth_utils import hash_password

def init_database():
    conn = get_connection()
    try:
        # Read and execute schema script
        print("Creating tables from schema.sql...")
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        conn.executescript(schema_sql)
        
        # Check if users already exist
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM users;")
        user_count = cursor.fetchone()["cnt"]
        
        if user_count == 0:
            print("Seeding users...")
            users = [
                ("admin", hash_password("hawki"), "System Administrator", "admin"),
                ("supervisor", hash_password("hawki"), "Duty Supervisor", "supervisor"),
                ("investigator", hash_password("hawki"), "Cyber Cell Investigator", "investigator"),
                ("operator", hash_password("hawki"), "Control Room Operator", "operator"),
                ("auditor", hash_password("hawki"), "Forensic Auditor", "auditor")
            ]
            cursor.executemany(
                "INSERT INTO users (username, password_hash, name, role_ext) VALUES (?, ?, ?, ?);",
                users
            )
            
        # Check if cameras exist
        cursor.execute("SELECT COUNT(*) as cnt FROM cameras;")
        camera_count = cursor.fetchone()["cnt"]
        
        if camera_count == 0:
            print("Seeding cameras...")
            cameras = [
                ("GATE-01", "Main Gate CCTV", "demo", "Hikvision", 1, 1, 1, 1920, 1080, 25.0, None, time.time(), 1, 1),
                ("LOBBY-02", "Reception Lobby", "demo", "Hikvision", 1, 1, 1, 1920, 1080, 25.0, None, time.time(), 0, 0),
                ("PERIM-03", "Rear Perimeter Fence", "demo", "Dahua", 1, 1, 1, 1920, 1080, 25.0, None, time.time(), 1, 0),
                ("PARK-04", "Parking Zone Bay", "demo", "generic", 1, 1, 1, 1920, 1080, 25.0, None, time.time(), 0, 1)
            ]
            cursor.executemany(
                """INSERT INTO cameras 
                   (camera_id, name, url, brand, is_connected, is_running, detection_active, width, height, fps, error, added_at, continuous_recording, ptz_capable) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                cameras
            )
            
        # Check if zones exist
        cursor.execute("SELECT COUNT(*) as cnt FROM zones;")
        zone_count = cursor.fetchone()["cnt"]
        
        if zone_count == 0:
            print("Seeding zones...")
            zones = [
                ("restricted-gate", "GATE-01", "Gate Restricted", "restricted", "[[60,60],[340,60],[340,160],[60,160]]", "20:00", "06:00"),
                ("restricted-perim", "PERIM-03", "Perimeter Line", "restricted", "[[40,120],[360,120],[360,220],[40,220]]", "00:00", "23:59"),
                ("crowd-park", "PARK-04", "Bay Crowd Zone", "general", "[[20,20],[380,20],[380,240],[20,240]]", "00:00", "23:59")
            ]
            cursor.executemany(
                "INSERT INTO zones (zone_id, camera_id, name, zone_type, points, active_from, active_to) VALUES (?, ?, ?, ?, ?, ?, ?);",
                zones
            )

        # Check if cases exist
        cursor.execute("SELECT COUNT(*) as cnt FROM cases;")
        case_count = cursor.fetchone()["cnt"]
        
        if case_count == 0:
            print("Seeding default cases...")
            cursor.execute(
                "INSERT INTO cases (case_number, title, description, investigating_officer_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?);",
                ("FIR/2026/012", "Main Gate Unauthorized Entry", "Investigating intrusion report from Main Gate perimeter on MG Road.", 3, "open", time.time())
            )

        conn.commit()
        print("Database initialization and seeding completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Error initializing database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_database()

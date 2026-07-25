import sqlite3
import random
import string
import base64
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_db
import auth_utils

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    role: str = "operator"

class MfaVerifyRequest(BaseModel):
    username: str
    code: str

# Temp store for MFA verification pending (username -> timestamp)
mfa_pending = {}

VALID_ROLES = {"admin", "supervisor", "investigator", "operator", "auditor"}

@router.post("/login")
def login(
    req: LoginRequest,
    db: sqlite3.Connection = Depends(get_db),
    _ = Depends(auth_utils.check_rate_limit)
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT user_id, username, password_hash, name, role_ext, mfa_enabled, totp_secret FROM users WHERE username = ?;",
        (req.username.strip(),)
    )
    user = cursor.fetchone()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if not auth_utils.verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if user["mfa_enabled"] == 1:
        # User has MFA enabled, require verification code next
        mfa_pending[user["username"]] = user["totp_secret"]
        return {
            "mfa_required": True,
            "username": user["username"],
            "message": "Multi-Factor Authentication code required"
        }
        
    # Standard login, issue token
    token = auth_utils.create_session(user["user_id"], user["username"], user["role_ext"])
    from routers.audit import log_system_audit
    log_system_audit(db, user["username"], "login", "Successfully logged in via portal")
    return {
        "success": True,
        "token": token,
        "user": {
            "username": user["username"],
            "name": user["name"],
            "role": user["role_ext"],
            "mfa_enabled": False
        }
    }

@router.post("/register")
@router.post("/signup")
def register(
    req: RegisterRequest,
    db: sqlite3.Connection = Depends(get_db),
    _ = Depends(auth_utils.check_rate_limit)
):
    username = req.username.strip()
    name = req.name.strip()
    password = req.password
    role = req.role.strip().lower()

    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
    if not password or len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")
    if not name:
        raise HTTPException(status_code=400, detail="Full name is required")
    if role not in VALID_ROLES:
        role = "operator"

    cursor = db.cursor()
    cursor.execute("SELECT user_id FROM users WHERE LOWER(username) = LOWER(?);", (username,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username is already taken. Please choose another.")

    hashed_pw = auth_utils.hash_password(password)
    cursor.execute(
        "INSERT INTO users (username, password_hash, name, role_ext) VALUES (?, ?, ?, ?);",
        (username, hashed_pw, name, role)
    )
    db.commit()
    user_id = cursor.lastrowid

    token = auth_utils.create_session(user_id, username, role)
    from routers.audit import log_system_audit
    log_system_audit(db, username, "register", f"User registered account with role: {role}")

    return {
        "success": True,
        "token": token,
        "user": {
            "username": username,
            "name": name,
            "role": role,
            "mfa_enabled": False
        },
        "message": "Account created successfully"
    }

@router.get("/me")
def get_me(user = Depends(auth_utils.get_current_user), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "SELECT user_id, username, name, role_ext, mfa_enabled FROM users WHERE username = ?;",
        (user["username"],)
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user": {
            "username": row["username"],
            "name": row["name"],
            "role": row["role_ext"],
            "mfa_enabled": bool(row["mfa_enabled"])
        }
    }

@router.post("/mfa-verify")
def mfa_verify(
    req: MfaVerifyRequest,
    db: sqlite3.Connection = Depends(get_db),
    _ = Depends(auth_utils.check_rate_limit)
):
    secret = mfa_pending.get(req.username)
    if not secret:
        raise HTTPException(status_code=400, detail="MFA login session not found or expired")
        
    if not auth_utils.verify_totp(secret, req.code):
        raise HTTPException(status_code=401, detail="Invalid verification code")
        
    # Clean up pending
    del mfa_pending[req.username]
    
    cursor = db.cursor()
    cursor.execute(
        "SELECT user_id, username, name, role_ext FROM users WHERE username = ?;",
        (req.username,)
    )
    user = cursor.fetchone()
    
    token = auth_utils.create_session(user["user_id"], user["username"], user["role_ext"])
    from routers.audit import log_system_audit
    log_system_audit(db, user["username"], "mfa_login", "Successfully logged in with TOTP MFA verification")
    return {
        "success": True,
        "token": token,
        "user": {
            "username": user["username"],
            "name": user["name"],
            "role": user["role_ext"],
            "mfa_enabled": True
        }
    }

@router.post("/mfa/enroll")
def mfa_enroll(user = Depends(auth_utils.get_current_user), db: sqlite3.Connection = Depends(get_db)):
    """Generate a base32 TOTP secret and enroll the user in MFA."""
    # Generate 16 base32 character secret (A-Z, 2-7)
    chars = string.ascii_uppercase + "234567"
    secret = "".join(random.choice(chars) for _ in range(16))
    
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET mfa_enabled = 1, totp_secret = ? WHERE username = ?;",
        (secret, user["username"])
    )
    db.commit()
    from routers.audit import log_system_audit
    log_system_audit(db, user["username"], "mfa_enroll", "Enrolled user in Multi-Factor Authentication (TOTP)")
    
    return {
        "success": True,
        "secret": secret,
        "otpauth_url": f"otpauth://totp/SentinelVision:{user['username']}?secret={secret}&issuer=SentinelVision"
    }

@router.post("/logout")
def logout(
    user = Depends(auth_utils.get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    # Look up token and delete
    # Find the active token for this user to revoke
    target_token = None
    for token, session in auth_utils.active_sessions.items():
        if session["username"] == user["username"]:
            target_token = token
            break
            
    if target_token:
        auth_utils.delete_session(target_token)
        
    from routers.audit import log_system_audit
    log_system_audit(db, user["username"], "logout", "Logged out of SentinelVision portal")
        
    return {"success": True, "message": "Successfully logged out"}


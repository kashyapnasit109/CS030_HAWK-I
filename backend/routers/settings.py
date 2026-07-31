import os
import json
import time
import urllib.request
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel

router = APIRouter()

# Path to settings storage file
BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"
SETTINGS_FILE = STORAGE_DIR / "settings.json"

# Default settings values
DEFAULT_SETTINGS = {
    "general": {
        "node_id": "SV-EDGE-NODE-01",
        "node_name": "SentinelVision Main Controller",
        "disk_usage_limit_gb": 100,
        "auto_pruning": True,
        "log_retention_days": 30
    },
    "network": {
        "discovery_subnet": "192.168.1",
        "discovery_timeout_seconds": 1.5,
        "multicast_discovery": True,
        "ports_to_scan": [554, 8554, 8080, 80],
        "default_username": "admin",
        "default_password": "admin"
    },
    "ai": {
        "yolo_conf_threshold": 0.40,
        "facenet_similarity_threshold": 0.65,
        "lpr_levenshtein_distance": 2,
        "frame_sample_fps": 1.0,
        "max_concurrent_jobs": 2,
        "device_provider": "CPU",
        "cuda_device_index": 0
    },
    "ai_models": {
        "active_object_model": "yolov8n",
        "active_face_model": "facenet",
        "models": [
            {
                "id": "yolov8n",
                "name": "YOLOv8 Nano (Default COCO)",
                "type": "object_detection",
                "file_path": "yolov8n.pt",
                "download_url": "",
                "is_custom": False
            },
            {
                "id": "facenet",
                "name": "FaceNet ONNX (Default Face)",
                "type": "face_recognition",
                "file_path": "facenet.onnx",
                "download_url": "",
                "is_custom": False
            }
        ]
    },
    "forensic": {
        "pdf_hash_algorithm": "SHA-256",
        "default_investigator": "System Admin",
        "default_department": "Cyber Forensics Unit",
        "sign_reports": True,
        "nvr_sync_logging": True
    },
    "security": {
        "session_timeout_minutes": 60,
        "enforce_mfa_all_admins": False,
        "password_complexity": "medium"
    }
}

class GeneralSettings(BaseModel):
    node_id: str
    node_name: str
    disk_usage_limit_gb: int
    auto_pruning: bool
    log_retention_days: int

class NetworkSettings(BaseModel):
    discovery_subnet: str
    discovery_timeout_seconds: float
    multicast_discovery: bool
    ports_to_scan: list[int]
    default_username: str
    default_password: str

class AiSettings(BaseModel):
    yolo_conf_threshold: float
    facenet_similarity_threshold: float
    lpr_levenshtein_distance: int
    frame_sample_fps: float
    max_concurrent_jobs: int
    device_provider: str
    cuda_device_index: int = 0

class ForensicSettings(BaseModel):
    pdf_hash_algorithm: str
    default_investigator: str
    default_department: str
    sign_reports: bool
    nvr_sync_logging: bool

class SecuritySettings(BaseModel):
    session_timeout_minutes: int
    enforce_mfa_all_admins: bool
    password_complexity: str

class SettingsPayload(BaseModel):
    general: GeneralSettings
    network: NetworkSettings
    ai: AiSettings
    forensic: ForensicSettings
    security: SecuritySettings

def load_settings_dict() -> dict:
    """Helper to load settings dict directly from JSON or return defaults."""
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
            
            # Merge loaded settings with defaults to ensure all keys exist
            merged = DEFAULT_SETTINGS.copy()
            for section, subkeys in DEFAULT_SETTINGS.items():
                if section in saved:
                    if isinstance(saved[section], dict) and isinstance(subkeys, dict):
                        merged[section] = {**subkeys, **saved[section]}
                    else:
                        merged[section] = saved[section]
            return merged
        except Exception:
            return DEFAULT_SETTINGS
    return DEFAULT_SETTINGS

@router.get("")
def get_settings():
    """Retrieve the current system configuration settings."""
    return load_settings_dict()

@router.post("")
def save_settings(payload: SettingsPayload):
    """Save the updated admin system settings."""
    try:
        settings_dict = payload.model_dump()
        current = load_settings_dict()
        
        # Merge key sections that might not be in payload (like ai_models)
        for k, v in current.items():
            if k not in settings_dict:
                settings_dict[k] = v
                
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings_dict, f, indent=2)

        # Invalidate device cache so next inference picks up the new GPU choice
        try:
            from ai_pipeline.device_manager import invalidate_device_cache  # noqa: PLC0415
            invalidate_device_cache()
        except Exception:
            pass

        return {"success": True, "message": "Settings updated successfully", "settings": settings_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")


@router.get("/gpu-info")
def get_gpu_info():
    """Return a list of available GPU/CPU compute devices detected on this machine."""
    try:
        from ai_pipeline.device_manager import list_gpus  # noqa: PLC0415
        return {"devices": list_gpus()}
    except Exception as e:
        # Always return at least a CPU entry even if torch is missing
        return {
            "devices": [
                {
                    "index": -1,
                    "name": "CPU (no GPU acceleration)",
                    "vram_total_mb": 0,
                    "vram_free_mb": 0,
                    "is_cuda": False,
                }
            ]
        }


class DownloadModelRequest(BaseModel):
    url: str
    name: str
    type: str  # object_detection, face_recognition, etc.

@router.post("/models/download")
def download_custom_model(payload: DownloadModelRequest):
    """Download a custom model weights file from a URL and register it."""
    url = payload.url.strip()
    name = payload.name.strip()
    m_type = payload.type.strip()
    
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid model download URL")
        
    filename = url.split("/")[-1]
    if not filename.endswith((".pt", ".onnx", ".bin", ".weights")):
        filename = f"model_{int(time.time())}.pt"
        
    MODELS_DIR = STORAGE_DIR / "models"
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    local_path = MODELS_DIR / filename
    
    try:
        print(f"[settings] Downloading model from {url} to {local_path}...")
        
        # Stream download file with User-Agent header
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req) as response, open(local_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
            
        print("[settings] Download complete.")
        
        # Extract class names if YOLO object detection
        classes = []
        if m_type == "object_detection":
            try:
                from ultralytics import YOLO
                temp_model = YOLO(str(local_path))
                if hasattr(temp_model, "names") and temp_model.names:
                    classes = list(temp_model.names.values())
            except Exception as e:
                print(f"[settings] Failed to load classes for YOLO model: {e}")
                
        # Load and update settings registry
        settings = load_settings_dict()
        if "ai_models" not in settings:
            settings["ai_models"] = {
                "active_object_model": "yolov8n",
                "active_face_model": "facenet",
                "models": DEFAULT_SETTINGS["ai_models"]["models"].copy()
            }
            
        model_id = f"custom_{int(time.time())}"
        new_model = {
            "id": model_id,
            "name": name,
            "type": m_type,
            "file_path": str(local_path),
            "download_url": url,
            "is_custom": True,
            "classes": classes
        }
        settings["ai_models"]["models"].append(new_model)
        
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
            
        return {"success": True, "message": f"Model '{name}' registered successfully", "model": new_model}
    except Exception as e:
        print(f"[settings] Model download failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download model: {str(e)}")


@router.post("/models/upload")
def upload_custom_model(
    name: str = Form(...),
    type: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload a custom model weights file from local computer and register it."""
    name = name.strip()
    m_type = type.strip()
    filename = file.filename
    
    if not filename.endswith((".pt", ".onnx", ".bin", ".weights")):
        filename = f"model_{int(time.time())}.pt"
        
    MODELS_DIR = STORAGE_DIR / "models"
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    local_path = MODELS_DIR / filename
    
    try:
        print(f"[settings] Uploading model to {local_path}...")
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print("[settings] Upload complete.")
        
        # Load model to extract class names if YOLO object detection
        classes = []
        if m_type == "object_detection":
            try:
                from ultralytics import YOLO
                temp_model = YOLO(str(local_path))
                if hasattr(temp_model, "names") and temp_model.names:
                    classes = list(temp_model.names.values())
            except Exception as e:
                print(f"[settings] Failed to load classes for uploaded YOLO model: {e}")
                
        # Load and update settings registry
        settings = load_settings_dict()
        if "ai_models" not in settings:
            settings["ai_models"] = {
                "active_object_model": "yolov8n",
                "active_face_model": "facenet",
                "models": DEFAULT_SETTINGS["ai_models"]["models"].copy()
            }
            
        model_id = f"custom_{int(time.time())}"
        new_model = {
            "id": model_id,
            "name": name,
            "type": m_type,
            "file_path": str(local_path),
            "download_url": "uploaded",
            "is_custom": True,
            "classes": classes
        }
        settings["ai_models"]["models"].append(new_model)
        
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
            
        return {"success": True, "message": f"Model '{name}' uploaded and registered successfully", "model": new_model}
    except Exception as e:
        print(f"[settings] Model upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload model: {str(e)}")


@router.delete("/models/{model_id}")
def delete_custom_model(model_id: str):
    """Delete a custom model registry and its downloaded weights file from disk."""
    settings = load_settings_dict()
    if "ai_models" not in settings:
        settings["ai_models"] = DEFAULT_SETTINGS["ai_models"].copy()
        
    models = settings["ai_models"].get("models", [])
    target_model = next((m for m in models if m["id"] == model_id), None)
    
    if not target_model:
        raise HTTPException(status_code=404, detail=f"Model with ID '{model_id}' not found")
        
    if not target_model.get("is_custom", False):
        raise HTTPException(status_code=400, detail="Cannot delete default system models")
        
    # Delete the model file from disk if it exists
    file_path_str = target_model.get("file_path", "")
    if file_path_str:
        file_path = Path(file_path_str)
        try:
            if file_path.exists():
                file_path.unlink()
                print(f"[settings] Deleted local custom model file {file_path}")
        except Exception as e:
            print(f"[settings] Error deleting file {file_path}: {e}")
            
    # Remove from model registry list
    settings["ai_models"]["models"] = [m for m in models if m["id"] != model_id]
    
    # If this model was active, reset active model to default
    m_type = target_model["type"]
    if m_type == "object_detection" and settings["ai_models"].get("active_object_model") == model_id:
        settings["ai_models"]["active_object_model"] = "yolov8n"
    elif m_type == "face_recognition" and settings["ai_models"].get("active_face_model") == model_id:
        settings["ai_models"]["active_face_model"] = "facenet"
        
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)
        
    return {"success": True, "message": f"Model '{target_model['name']}' deleted successfully"}


@router.post("/models/activate/{model_id}")
def activate_model(model_id: str):
    """Set a specific model ID as the active model for its type."""
    settings = load_settings_dict()
    if "ai_models" not in settings:
        settings["ai_models"] = DEFAULT_SETTINGS["ai_models"].copy()
        
    models = settings["ai_models"].get("models", [])
    
    # Check default cases
    if model_id == "yolov8n":
        settings["ai_models"]["active_object_model"] = "yolov8n"
    elif model_id == "facenet":
        settings["ai_models"]["active_face_model"] = "facenet"
    else:
        target_model = next((m for m in models if m["id"] == model_id), None)
        if not target_model:
            raise HTTPException(status_code=404, detail=f"Model with ID '{model_id}' not found")
        
        m_type = target_model["type"]
        if m_type == "object_detection":
            settings["ai_models"]["active_object_model"] = model_id
        elif m_type == "face_recognition":
            settings["ai_models"]["active_face_model"] = model_id
            
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)
        
    return {"success": True, "message": f"Model '{model_id}' activated successfully"}

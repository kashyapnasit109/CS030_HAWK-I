"""
VisionCCTV — AI Image Enhancer Router
Endpoint for forensic image clarity boost, face/LPR restoration, and super-resolution.
"""

import json
import time
import base64
import urllib.request
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel, Field

from ai_pipeline.image_enhancer import enhance_local, enhance_cloud_replicate, save_enhanced_image
import auth_utils

router = APIRouter()

BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"


class EnhanceRequest(BaseModel):
    image_url: str = Field(..., description="Relative or absolute URL of the image to enhance")
    mode: Literal["general", "face", "lpr", "super_res"] = Field("general", description="Enhancement focus mode")
    scale_factor: float = Field(2.0, ge=1.0, le=8.0, description="Upscale factor (1.0x to 8.0x)")
    sharpness_boost: float = Field(1.5, ge=0.5, le=3.0, description="Sharpness enhancement multiplier")
    contrast_boost: float = Field(1.2, ge=0.5, le=2.0, description="Contrast enhancement multiplier")
    denoise_level: Literal["low", "medium", "high"] = Field("medium", description="Noise reduction level")
    engine: Literal["local_ai", "cloud_api"] = Field("local_ai", description="Enhancement engine to use")
    api_key: str | None = Field(None, description="Optional Cloud API key (for Replicate / HuggingFace)")


def _resolve_image_bytes(image_url: str) -> bytes:
    """Resolve image bytes from storage disk or remote URL."""
    cleaned = image_url.strip()
    
    # Base64 string
    if cleaned.startswith("data:image"):
        _, b64_data = cleaned.split(",", 1)
        return base64.b64decode(b64_data)

    # Remote URL
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        try:
            with urllib.request.urlopen(cleaned, timeout=10) as resp:
                return resp.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image from URL: {str(e)}")

    # Local storage path
    if cleaned.startswith("/storage/"):
        rel_path = cleaned.replace("/storage/", "")
        local_path = STORAGE_DIR / rel_path
    else:
        local_path = Path(cleaned)

    if not local_path.exists():
        raise HTTPException(status_code=404, detail=f"Source image '{cleaned}' not found on disk")

    return local_path.read_bytes()


@router.post("/image")
def enhance_image(
    req: EnhanceRequest,
    _ = Depends(auth_utils.check_rate_limit)
):
    """
    Enhance an image using Local AI Super-Resolution & Forensic Clarity Filters,
    or an optional Cloud API key.
    """
    image_bytes = _resolve_image_bytes(req.image_url)

    try:
        if req.engine == "cloud_api" and req.api_key:
            enhanced_bytes, meta = enhance_cloud_replicate(image_bytes, api_key=req.api_key)
        else:
            enhanced_bytes, meta = enhance_local(
                image_bytes,
                mode=req.mode,
                scale_factor=req.scale_factor,
                sharpness_boost=req.sharpness_boost,
                contrast_boost=req.contrast_boost,
                denoise_level=req.denoise_level,
            )

        filename, enhanced_url, sha256_hash = save_enhanced_image(enhanced_bytes)

        return {
            "success": True,
            "enhanced_image_url": enhanced_url,
            "filename": filename,
            "sha256_hash": sha256_hash,
            "metadata": meta,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(err)}")

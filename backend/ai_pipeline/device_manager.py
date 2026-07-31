"""
Centralised device manager for all AI pipeline modules.

Reads `settings.json` → ai.device_provider + ai.cuda_device_index so that
every pipeline (face recognition, object detection, keyword search, LPR, camera
manager) uses the same user-selected GPU without each file having to re-read
settings itself.

GPU enumeration is also exposed here so the /api/settings/gpu-info endpoint
can return the list of available CUDA devices with VRAM and names.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

# ── Settings helpers ─────────────────────────────────────────────────────────

_SETTINGS_FILE = Path(__file__).parent.parent / "storage" / "settings.json"

_DEFAULT_PROVIDER = "CPU"
_DEFAULT_CUDA_IDX = 0


def _read_ai_settings() -> dict:
    """Read ai settings block from settings.json without importing the router."""
    try:
        from routers.settings import load_settings_dict  # noqa: PLC0415
        return load_settings_dict().get("ai", {})
    except Exception:
        pass
    # Fallback: read file directly
    try:
        if _SETTINGS_FILE.exists():
            data = json.loads(_SETTINGS_FILE.read_text(encoding="utf-8"))
            return data.get("ai", {})
    except Exception:
        pass
    return {}


# ── GPU enumeration ──────────────────────────────────────────────────────────

def list_gpus() -> list[dict]:
    """
    Return a list of available GPU devices.

    Each entry:
        {
            "index": int,          # torch cuda device index
            "name": str,           # e.g. "NVIDIA GeForce RTX 4060"
            "vram_total_mb": int,  # total VRAM in MB
            "vram_free_mb": int,   # free VRAM in MB
            "is_cuda": bool,       # always True here
        }

    Always prepends a CPU pseudo-entry at index -1.
    """
    devices: list[dict] = [
        {
            "index": -1,
            "name": "CPU (no GPU acceleration)",
            "vram_total_mb": 0,
            "vram_free_mb": 0,
            "is_cuda": False,
        }
    ]
    try:
        import torch  # noqa: PLC0415

        if not torch.cuda.is_available():
            return devices

        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            try:
                # Query free VRAM – requires the device to be initialised
                torch.cuda.set_device(i)
                free_bytes, total_bytes = torch.cuda.mem_get_info(i)
                vram_free_mb = int(free_bytes / 1024 / 1024)
                vram_total_mb = int(total_bytes / 1024 / 1024)
            except Exception:
                vram_total_mb = int(props.total_memory / 1024 / 1024)
                vram_free_mb = vram_total_mb  # unknown – assume all free

            devices.append(
                {
                    "index": i,
                    "name": props.name,
                    "vram_total_mb": vram_total_mb,
                    "vram_free_mb": vram_free_mb,
                    "is_cuda": True,
                }
            )
    except Exception as e:
        print(f"[device_manager] GPU enumeration failed: {e}")

    return devices


# ── Resolved torch.device ────────────────────────────────────────────────────

# Cache so repeated calls within one request don't re-read settings.json.
# Call invalidate_device_cache() after settings are saved.
_cached_device: Optional["torch.device"] = None  # type: ignore[name-defined]


def invalidate_device_cache() -> None:
    """Call this whenever AI settings are saved so the next inference picks
    up the new device immediately."""
    global _cached_device
    _cached_device = None
    print("[device_manager] Device cache invalidated.")


def get_torch_device():
    """
    Return the torch.device to use for inference, honouring the user's
    current settings (device_provider + cuda_device_index).

    Falls back gracefully:
        CUDA  → if CUDA unavailable, uses CPU
        CPU   → always works
    """
    global _cached_device
    if _cached_device is not None:
        return _cached_device

    try:
        import torch  # noqa: PLC0415
    except ImportError:
        return None  # Torch not installed – callers handle None

    ai = _read_ai_settings()
    provider = ai.get("device_provider", _DEFAULT_PROVIDER)
    cuda_idx = int(ai.get("cuda_device_index", _DEFAULT_CUDA_IDX))

    if provider == "CUDA":
        if torch.cuda.is_available() and cuda_idx < torch.cuda.device_count():
            device = torch.device(f"cuda:{cuda_idx}")
            print(
                f"[device_manager] Using CUDA device {cuda_idx}: "
                f"{torch.cuda.get_device_name(cuda_idx)}"
            )
        else:
            device = torch.device("cpu")
            if not torch.cuda.is_available():
                print("[device_manager] CUDA requested but not available – falling back to CPU.")
            else:
                print(
                    f"[device_manager] CUDA index {cuda_idx} out of range "
                    f"(only {torch.cuda.device_count()} device(s)) – falling back to CPU."
                )
    else:
        device = torch.device("cpu")
        print(f"[device_manager] Using CPU (provider={provider}).")

    _cached_device = device
    return device

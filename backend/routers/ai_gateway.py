"""
AI Gateway API
==============

Endpoints for connecting and using a custom OpenAI-compatible AI router gateway.
Mirrors the (unauthenticated, edge-appliance) convention of routers/settings.py.

    GET  /api/ai-gateway/config          -> masked config (never returns raw api_key)
    POST /api/ai-gateway/config          -> save base_url / api_key / toggles
    POST /api/ai-gateway/test            -> probe reachability
    POST /api/ai-gateway/sync-models     -> fetch + score + recommend, cache result
    POST /api/ai-gateway/select-model    -> choose the active model
    POST /api/ai-gateway/chat            -> one-shot chat (used by the in-app assistant / test)
    GET  /api/ai-gateway/requirements    -> SentinelVision's model requirements (for the UI)
    GET  /api/ai-gateway/models          -> last-synced scored model list
    GET  /api/ai-gateway/status          -> quick enabled/ready summary
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import ai_gateway

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Payloads
# ─────────────────────────────────────────────────────────────────────────────
class ConfigPayload(BaseModel):
    base_url: str | None = None
    api_key: str | None = None
    enabled: bool | None = None
    selected_model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    timeout_seconds: int | None = None
    use_for_query: bool | None = None
    use_for_translation: bool | None = None
    use_for_reports: bool | None = None


class CredsPayload(BaseModel):
    base_url: str | None = None
    api_key: str | None = None


class SelectPayload(BaseModel):
    model: str


class ChatPayload(BaseModel):
    message: str
    system: str | None = None
    model: str | None = None


_MASK = "…"


def _is_placeholder_key(key: str | None) -> bool:
    """True when the client sent back a masked/empty key we must NOT persist."""
    if key is None:
        return True
    k = key.strip()
    if not k:
        return True
    if _MASK in k or all(c == "•" for c in k):
        return True
    return False


def _resolve_creds(body: CredsPayload | None) -> tuple[str, str]:
    """Merge request creds over saved config (masked/blank key -> use saved)."""
    cfg = ai_gateway.load_config()
    base_url = cfg.get("base_url", "")
    api_key = cfg.get("api_key", "")
    if body is not None:
        if body.base_url is not None and body.base_url.strip():
            base_url = body.base_url.strip()
        if not _is_placeholder_key(body.api_key):
            api_key = body.api_key.strip()
    return base_url, api_key


# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/config")
def get_config():
    """Return the gateway config with the API key masked."""
    return ai_gateway.public_config()


@router.post("/config")
def post_config(payload: ConfigPayload):
    """Save gateway configuration. A blank/masked api_key preserves the existing key."""
    changes: dict = {}
    for field in (
        "base_url", "enabled", "selected_model", "temperature",
        "max_tokens", "timeout_seconds",
        "use_for_query", "use_for_translation", "use_for_reports",
    ):
        val = getattr(payload, field)
        if val is not None:
            changes[field] = val
    # Only overwrite the key if the user actually typed a fresh one.
    if not _is_placeholder_key(payload.api_key):
        changes["api_key"] = payload.api_key.strip()
    if "base_url" in changes:
        changes["base_url"] = changes["base_url"].strip()
    try:
        ai_gateway.save_config(**changes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save gateway config: {e}")
    return {"success": True, "config": ai_gateway.public_config()}


@router.get("/requirements")
def get_requirements():
    """Expose SentinelVision's model requirements so the UI can explain recommendations."""
    return ai_gateway.REQUIREMENTS


@router.get("/models")
def get_models():
    """Return the last-synced, scored model list."""
    cfg = ai_gateway.load_config()
    return {
        "models": cfg.get("models", []),
        "recommended_model": cfg.get("recommended_model", ""),
        "selected_model": cfg.get("selected_model", ""),
        "last_synced": cfg.get("last_synced", 0),
    }


@router.get("/status")
def get_status():
    cfg = ai_gateway.load_config()
    return {
        "enabled": ai_gateway.is_enabled(),
        "configured": bool(cfg.get("base_url")),
        "has_api_key": bool(cfg.get("api_key")),
        "selected_model": cfg.get("selected_model", ""),
        "recommended_model": cfg.get("recommended_model", ""),
        "model_count": len(cfg.get("models", [])),
        "last_status": cfg.get("last_status", ""),
        "last_synced": cfg.get("last_synced", 0),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Connectivity + model sync
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/test")
def test(body: CredsPayload | None = None):
    """Probe the gateway's reachability without saving anything."""
    base_url, api_key = _resolve_creds(body)
    if not base_url:
        raise HTTPException(status_code=400, detail="Provide a gateway base URL first.")
    result = ai_gateway.test_connection(base_url, api_key)
    return result


@router.post("/sync-models")
def sync_models(body: CredsPayload | None = None):
    """Fetch, score and recommend models; cache the scored list in config."""
    base_url, api_key = _resolve_creds(body)
    if not base_url:
        raise HTTPException(status_code=400, detail="Provide a gateway base URL first.")
    try:
        result = ai_gateway.sync_and_analyze(base_url, api_key)
    except Exception as e:
        ai_gateway.save_config(last_status=f"error: {e}")
        raise HTTPException(status_code=502, detail=f"Sync failed: {e}")

    # Persist creds (if freshly supplied) + the scored catalogue + recommendation.
    changes = {
        "models": result["models"],
        "recommended_model": result["recommended_model"],
        "last_synced": time.time(),
        "last_status": "ok",
    }
    if body is not None:
        if body.base_url is not None and body.base_url.strip():
            changes["base_url"] = body.base_url.strip()
        if not _is_placeholder_key(body.api_key):
            changes["api_key"] = body.api_key.strip()

    # Auto-select the recommended model if nothing is selected yet.
    cfg = ai_gateway.load_config()
    if not cfg.get("selected_model") and result["recommended_model"]:
        changes["selected_model"] = result["recommended_model"]

    ai_gateway.save_config(**changes)
    return {
        "success": True,
        "models": result["models"],
        "recommended_model": result["recommended_model"],
        "compatible_count": result["compatible_count"],
        "total_count": result["total_count"],
        "selected_model": ai_gateway.load_config().get("selected_model", ""),
    }


@router.post("/select-model")
def select_model(payload: SelectPayload):
    """Set the active model for AI tasks."""
    model = (payload.model or "").strip()
    if not model:
        raise HTTPException(status_code=400, detail="Model id is required.")
    cfg = ai_gateway.save_config(selected_model=model, enabled=True)
    return {"success": True, "selected_model": cfg.get("selected_model", "")}


@router.post("/chat")
def chat(payload: ChatPayload):
    """One-shot chat against the selected model (in-app assistant / connection test)."""
    if not ai_gateway.is_enabled():
        raise HTTPException(status_code=400, detail="Gateway is not enabled or no model selected.")
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")
    messages = []
    if payload.system:
        messages.append({"role": "system", "content": payload.system})
    messages.append({"role": "user", "content": payload.message.strip()})
    try:
        reply = ai_gateway.chat(messages, model=payload.model or None)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat failed: {e}")
    return {"success": True, "reply": reply, "model": payload.model or ai_gateway.load_config().get("selected_model", "")}

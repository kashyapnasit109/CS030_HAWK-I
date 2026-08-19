"""
Custom AI Router Gateway
========================

Lets an operator connect *any* OpenAI-compatible LLM gateway (OpenAI, OpenRouter,
LM Studio, Ollama, vLLM, LiteLLM, Groq, Together, Azure-compatible proxies, …) by
supplying a base URL + API key. We then:

  1. Sync the available models  (GET  {base}/v1/models)
  2. Score every model against SentinelVision's real AI-task requirements and
     recommend the single best all-rounder.
  3. Use the selected model for language-aware query understanding and
     forensic report narratives  (POST {base}/v1/chat/completions).

Design goals:
  * Zero new dependencies — pure stdlib ``urllib`` (same precedent as
    ``routers/settings.py`` and ``routers/references.py``).
  * Never crash a caller. Every public call is defensive and degrades to a
    safe offline fallback so the edge appliance keeps working with no gateway.
  * Config lives in ``storage/settings.json`` under an ``ai_gateway`` key,
    written directly (the strict ``SettingsPayload`` in settings.py ignores it,
    and ``save_settings`` is patched to preserve raw sections).
"""

from __future__ import annotations

import io
import re
import json
import time
import ssl
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).parent
SETTINGS_FILE = BASE_DIR / "storage" / "settings.json"

# ─────────────────────────────────────────────────────────────────────────────
# What SentinelVision actually needs from a gateway model. Surfaced to the UI so
# operators understand *why* a model is recommended, and used by the scorer.
# ─────────────────────────────────────────────────────────────────────────────
REQUIREMENTS: dict[str, Any] = {
    "summary": (
        "SentinelVision uses the gateway model as a lightweight reasoning layer on top "
        "of the local vision pipeline (YOLOv8, FaceNet, CLIP, OCR). The model never sees "
        "raw video — it turns messy human queries into clean visual search terms and "
        "writes courtroom-ready report narratives."
    ),
    "tasks": [
        {
            "key": "query_understanding",
            "title": "Natural-language query understanding",
            "detail": "Turn 'aadmi red shirt near white car' into clean English CLIP prompts + object classes.",
            "needs": ["chat", "instruct", "multilingual", "fast"],
        },
        {
            "key": "translation",
            "title": "Multi-language translation",
            "detail": "Translate Hindi / Gujarati / mixed queries to English for the vision models.",
            "needs": ["chat", "multilingual"],
        },
        {
            "key": "report_narrative",
            "title": "Forensic report narratives",
            "detail": "Summarise dozens of timestamped matches into a professional evidence summary.",
            "needs": ["chat", "instruct", "long_context"],
        },
        {
            "key": "frame_captioning",
            "title": "Frame captioning (optional)",
            "detail": "Describe an evidence frame in words — a bonus when the model is multimodal.",
            "needs": ["vision"],
        },
    ],
    # Capability weights (how much each capability matters for our workload).
    "priorities": {
        "chat": "required",
        "instruct": "high",
        "multilingual": "high",
        "long_context": "medium",
        "vision": "bonus",
        "fast": "medium",
    },
}

DEFAULT_CONFIG: dict[str, Any] = {
    "enabled": False,
    "base_url": "",
    "api_key": "",
    "selected_model": "",
    "recommended_model": "",
    "temperature": 0.2,
    "max_tokens": 700,
    "timeout_seconds": 45,
    "models": [],          # cached, scored model list from the last sync
    "last_synced": 0,
    "last_status": "",     # "" | "ok" | "error: ..."
    # Feature toggles — which AI tasks may use the gateway.
    "use_for_query": True,
    "use_for_translation": True,
    "use_for_reports": True,
}


# ─────────────────────────────────────────────────────────────────────────────
# Config persistence (raw settings.json, ai_gateway section)
# ─────────────────────────────────────────────────────────────────────────────
def _read_settings_raw() -> dict:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f) or {}
        except Exception:
            return {}
    return {}


def _write_settings_raw(data: dict) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_config() -> dict:
    """Return the full ai_gateway config merged over defaults."""
    saved = _read_settings_raw().get("ai_gateway", {}) or {}
    cfg = {**DEFAULT_CONFIG, **saved}
    return cfg


def save_config(**changes: Any) -> dict:
    """Merge ``changes`` into the ai_gateway section and persist. Returns new config."""
    data = _read_settings_raw()
    current = {**DEFAULT_CONFIG, **(data.get("ai_gateway", {}) or {})}
    current.update(changes)
    data["ai_gateway"] = current
    _write_settings_raw(data)
    return current


def mask_key(key: str | None) -> str:
    """Redact an API key for display: keep a small hint of head+tail."""
    if not key:
        return ""
    k = str(key)
    if len(k) <= 8:
        return "•" * len(k)
    return f"{k[:4]}…{k[-4:]}"


def public_config() -> dict:
    """Config safe to send to the browser (api_key masked, never raw)."""
    cfg = load_config()
    has_key = bool(cfg.get("api_key"))
    out = {k: v for k, v in cfg.items() if k != "api_key"}
    out["api_key_masked"] = mask_key(cfg.get("api_key"))
    out["has_api_key"] = has_key
    return out


def is_enabled() -> bool:
    cfg = load_config()
    return bool(cfg.get("enabled") and cfg.get("base_url") and cfg.get("selected_model"))


# ─────────────────────────────────────────────────────────────────────────────
# HTTP (stdlib only)
# ─────────────────────────────────────────────────────────────────────────────
def _api_prefix(base_url: str) -> str:
    """Normalise a base URL to an OpenAI-style API prefix.

    - ``http://host:1234``            -> ``http://host:1234/v1``
    - ``http://host:1234/v1``         -> unchanged (already versioned)
    - ``https://x/openai/v1``         -> unchanged
    """
    b = (base_url or "").strip().rstrip("/")
    if not b:
        return ""
    if not b.lower().startswith(("http://", "https://")):
        b = "http://" + b
    # Already carries a version segment (/v1, /v1beta, /openai/v1, …)? keep it.
    if re.search(r"/v\d", b.lower()):
        return b
    return b + "/v1"


def _http_json(
    url: str,
    api_key: str | None = None,
    method: str = "GET",
    body: dict | None = None,
    timeout: float = 45.0,
) -> tuple[int, Any]:
    """Perform an HTTP JSON request with stdlib. Returns (status_code, parsed_or_text)."""
    headers = {
        "Accept": "application/json",
        "User-Agent": "SentinelVision-Gateway/1.0",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    data_bytes = None
    if body is not None:
        data_bytes = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    # Be permissive with self-signed local gateways (LM Studio / vLLM over https).
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(raw)
            except Exception:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = ""
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        parsed: Any = raw
        try:
            parsed = json.loads(raw)
        except Exception:
            pass
        return e.code, parsed
    except urllib.error.URLError as e:
        raise ConnectionError(f"Cannot reach gateway: {getattr(e, 'reason', e)}") from e
    except (TimeoutError, ssl.SSLError) as e:
        raise ConnectionError(f"Gateway request failed: {e}") from e


def _extract_error(payload: Any) -> str:
    if isinstance(payload, dict):
        err = payload.get("error")
        if isinstance(err, dict):
            return str(err.get("message") or err.get("code") or err)
        if err:
            return str(err)
        if payload.get("message"):
            return str(payload["message"])
    if isinstance(payload, str) and payload.strip():
        return payload.strip()[:300]
    return "Unknown gateway error"


# ─────────────────────────────────────────────────────────────────────────────
# Model discovery + intelligent recommendation
# ─────────────────────────────────────────────────────────────────────────────
# Substrings that mark a model as NOT usable for chat/completions.
_INCOMPATIBLE = (
    "embed", "embedding", "rerank", "reranker", "whisper", "tts", "text-to-speech",
    "speech", "audio", "dall-e", "dalle", "stable-diffusion", "sdxl", "flux",
    "image-generation", "imagegen", "img2img", "moderation", "-guard", "guard-",
    "clip", "vae", "upscal", "bge-", "gte-", "e5-", "nomic-embed", "jina-embed",
    "voice", "transcrib", "diffusion",
)
_INSTRUCT = ("instruct", "chat", "-it", "-it-", "turbo", "sonnet", "opus", "haiku",
             "hermes", "openchat", "zephyr", "dolphin", "vicuna", "wizardlm")
_KNOWN_FAMILIES = ("gpt-4", "gpt-3.5", "gpt-5", "o1", "o3", "o4", "claude", "gemini",
                   "gemma", "qwen", "llama", "mistral", "mixtral", "deepseek",
                   "command", "phi", "yi-", "glm", "internlm", "solar", "aya",
                   "nous", "granite", "grok", "kimi", "minimax")
_MULTILINGUAL = ("multilingual", "aya", "qwen", "gemini", "gpt-4o", "gpt-4.1", "gpt-5",
                 "command-r", "bloom", "llama-3", "llama3", "glm", "internlm", "yi-",
                 "m2m", "nllb", "madlad", "indictrans", "mistral-large", "gemma-2",
                 "deepseek-v3", "gpt-4-turbo")
_VISION = ("vision", "-vl", "vl-", "-vl-", "llava", "gpt-4o", "gpt-4.1", "gpt-5",
           "pixtral", "phi-3-vision", "phi-3.5-vision", "internvl", "cogvlm",
           "moondream", "minicpm-v", "llama-3.2", "gemini", "qwen2-vl", "qwen2.5-vl",
           "molmo", "idefics")
_LONG_CTX = ("128k", "200k", "256k", "1m", "1048k", "32k", "65k", "100k", "-long", "128000")
_LONG_CTX_FAMILIES = ("gemini-1.5", "gemini-2", "claude-3", "claude-4", "gpt-4o",
                      "gpt-4-turbo", "gpt-4.1", "qwen2.5", "command-r", "deepseek",
                      "llama-3.1", "yi-", "phi-3")
_FLAGSHIP = ("gpt-4o", "gpt-4.1", "gpt-5", "o1", "o3", "opus", "3-5-sonnet",
             "3.5-sonnet", "3-7-sonnet", "3.7-sonnet", "sonnet-4", "gemini-1.5-pro",
             "gemini-2", "llama-3.1-70b", "llama-3.1-405b", "llama-3.3-70b",
             "qwen2.5-72b", "deepseek-v3", "deepseek-r1", "mistral-large",
             "command-r-plus", "grok")
_FAST = ("mini", "nano", "small", "lite", "flash", "haiku", "tiny", "edge",
         "1b", "1.5b", "2b", "3b", "7b", "8b", "gemma-2b", "phi-3-mini")


def _is_fast(low: str) -> bool:
    """Token-aware speed detection so family names (e.g. 'ge*mini*') don't
    false-match short size/speed tokens like 'mini' or '8b'."""
    tokens = set(re.split(r"[-_/:.\s]+", low))
    fast_tokens = {"mini", "nano", "small", "lite", "flash", "haiku", "tiny",
                   "edge", "1b", "2b", "3b", "7b", "8b"}
    if tokens & fast_tokens:
        return True
    # Fractional sizes survive as split fragments, so check the raw string.
    return any(sz in low for sz in ("1.5b", "-3.8b", "phi-3-mini", "gemma-2b"))


def _ctx_from_meta(model: dict) -> int:
    for k in ("context_length", "max_context_length", "context_window", "max_tokens"):
        v = model.get(k)
        if isinstance(v, (int, float)) and v > 0:
            return int(v)
    arch = model.get("architecture")
    if isinstance(arch, dict):
        v = arch.get("context_length")
        if isinstance(v, (int, float)) and v > 0:
            return int(v)
    top = model.get("top_provider")
    if isinstance(top, dict):
        v = top.get("context_length")
        if isinstance(v, (int, float)) and v > 0:
            return int(v)
    return 0


def _meta_is_multimodal(model: dict) -> bool:
    arch = model.get("architecture")
    if isinstance(arch, dict):
        modality = str(arch.get("modality", "")) + str(arch.get("input_modalities", ""))
        if "image" in modality.lower():
            return True
    for k in ("modality", "input_modalities", "capabilities"):
        v = model.get(k)
        if v and "image" in str(v).lower():
            return True
    return False


def score_model(model: dict) -> dict:
    """Score one model against SentinelVision's needs. Returns an annotated dict."""
    mid = str(model.get("id") or model.get("name") or "").strip()
    low = mid.lower()
    caps: list[str] = []
    reasons: list[str] = []

    if not mid:
        return {"id": "", "score": 0, "compatible": False, "capabilities": [],
                "reason": "Missing model id", "recommended": False}

    # Hard filter: non-conversational endpoints can't run our tasks.
    if any(tok in low for tok in _INCOMPATIBLE) and "instruct" not in low and "chat" not in low:
        return {
            "id": mid, "score": 6, "compatible": False, "capabilities": ["specialized"],
            "reason": "Not a chat/completions model (embedding, audio, or image tool) — cannot run SentinelVision tasks.",
            "recommended": False, "context_length": _ctx_from_meta(model),
        }

    score = 45  # baseline for a usable chat model
    caps.append("chat")

    is_instruct = any(tok in low for tok in _INSTRUCT)
    if is_instruct:
        score += 12
        caps.append("instruct")
        reasons.append("instruction-tuned")

    is_multi = any(tok in low for tok in _MULTILINGUAL)
    if is_multi:
        score += 14
        caps.append("multilingual")
        reasons.append("multilingual (Hindi/Gujarati)")

    is_vision = any(tok in low for tok in _VISION) or _meta_is_multimodal(model)
    if is_vision:
        score += 10
        caps.append("vision")
        reasons.append("multimodal — can caption evidence frames")

    ctx = _ctx_from_meta(model)
    is_long = (ctx >= 32000) or any(tok in low for tok in _LONG_CTX) or any(f in low for f in _LONG_CTX_FAMILIES)
    if is_long:
        score += 8
        caps.append("long_context")
        reasons.append(f"long context{f' (~{ctx:,} tok)' if ctx else ''}")

    if any(tok in low for tok in _FLAGSHIP):
        score += 12
        caps.append("flagship")
        reasons.append("flagship-tier reasoning")

    if _is_fast(low):
        score += 6
        caps.append("fast")
        reasons.append("fast/low-latency")

    if any(fam in low for fam in _KNOWN_FAMILIES):
        score += 6
        if "chat" not in [c for c in caps if c in ("flagship",)]:
            reasons.append("proven model family")

    score = max(0, min(100, score))
    reason = "Compatible chat model"
    if reasons:
        reason = "; ".join(dict.fromkeys(reasons))  # dedupe, keep order
        reason = reason[0].upper() + reason[1:]

    return {
        "id": mid,
        "score": score,
        "compatible": True,
        "capabilities": caps,
        "reason": reason,
        "recommended": False,
        "context_length": ctx,
        "owned_by": model.get("owned_by") or model.get("owner") or "",
    }


def _recommend_key(m: dict):
    """Sort key for picking the best all-rounder among compatible models."""
    caps = set(m.get("capabilities", []))
    return (
        m.get("score", 0),
        1 if "multilingual" in caps else 0,   # our workload is Hindi/Gujarati heavy
        1 if "instruct" in caps else 0,
        1 if "vision" in caps else 0,
        1 if "fast" in caps else 0,
    )


def analyze_models(raw_models: list[dict]) -> dict:
    """Score all models and pick the single recommended all-rounder."""
    scored = [score_model(m) for m in raw_models if (m.get("id") or m.get("name"))]
    # De-duplicate ids, keep highest score.
    by_id: dict[str, dict] = {}
    for s in scored:
        if not s["id"]:
            continue
        if s["id"] not in by_id or s["score"] > by_id[s["id"]]["score"]:
            by_id[s["id"]] = s
    scored = list(by_id.values())

    compatible = [s for s in scored if s["compatible"]]
    recommended_id = ""
    if compatible:
        best = max(compatible, key=_recommend_key)
        best["recommended"] = True
        recommended_id = best["id"]
        best["reason"] = "Recommended all-rounder — " + best["reason"] + \
            ". Best fit for query understanding, translation and report narratives."

    # Sort: recommended first, then compatible by score, then specialized.
    scored.sort(key=lambda s: (s.get("recommended", False), s["compatible"], s["score"]), reverse=True)
    return {
        "models": scored,
        "recommended_model": recommended_id,
        "compatible_count": len(compatible),
        "total_count": len(scored),
    }


def fetch_models(base_url: str, api_key: str | None) -> list[dict]:
    """GET {base}/v1/models and return the raw model dicts."""
    prefix = _api_prefix(base_url)
    if not prefix:
        raise ValueError("Gateway base URL is empty")
    status, payload = _http_json(f"{prefix}/models", api_key=api_key, method="GET", timeout=30)
    if status >= 400:
        raise RuntimeError(f"HTTP {status}: {_extract_error(payload)}")
    # OpenAI: {"data": [ {...} ]}. Some gateways return a bare list.
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, list):
            return data
        if isinstance(payload.get("models"), list):
            return payload["models"]
    if isinstance(payload, list):
        return payload
    raise RuntimeError("Gateway returned an unexpected /models response shape")


def sync_and_analyze(base_url: str, api_key: str | None) -> dict:
    """Fetch + score + recommend in one shot."""
    raw = fetch_models(base_url, api_key)
    result = analyze_models(raw)
    result["synced_at"] = time.time()
    return result


def test_connection(base_url: str, api_key: str | None) -> dict:
    """Lightweight reachability probe against /models."""
    try:
        raw = fetch_models(base_url, api_key)
        return {"ok": True, "model_count": len(raw), "prefix": _api_prefix(base_url)}
    except Exception as e:
        return {"ok": False, "error": str(e), "prefix": _api_prefix(base_url)}


# ─────────────────────────────────────────────────────────────────────────────
# Chat completion — the actual "use the model" path
# ─────────────────────────────────────────────────────────────────────────────
def chat(
    messages: list[dict],
    *,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout: float | None = None,
    base_url: str | None = None,
    api_key: str | None = None,
) -> str:
    """POST {base}/v1/chat/completions and return the assistant text.

    Raises on failure — callers that want graceful degradation must wrap this.
    """
    cfg = load_config()
    base_url = base_url if base_url is not None else cfg.get("base_url", "")
    api_key = api_key if api_key is not None else cfg.get("api_key", "")
    model = model or cfg.get("selected_model", "")
    if not base_url:
        raise ValueError("Gateway not configured (no base URL)")
    if not model:
        raise ValueError("No model selected")

    prefix = _api_prefix(base_url)
    body = {
        "model": model,
        "messages": messages,
        "temperature": cfg.get("temperature", 0.2) if temperature is None else temperature,
        "max_tokens": cfg.get("max_tokens", 700) if max_tokens is None else max_tokens,
        "stream": False,
    }
    status, payload = _http_json(
        f"{prefix}/chat/completions",
        api_key=api_key, method="POST", body=body,
        timeout=timeout or cfg.get("timeout_seconds", 45),
    )
    if status >= 400:
        raise RuntimeError(f"HTTP {status}: {_extract_error(payload)}")
    if not isinstance(payload, dict):
        raise RuntimeError("Unexpected chat response shape")
    choices = payload.get("choices") or []
    if not choices:
        raise RuntimeError(_extract_error(payload) or "Gateway returned no choices")
    msg = choices[0].get("message") or {}
    content = msg.get("content")
    if content is None:  # legacy /completions style
        content = choices[0].get("text", "")
    return (content or "").strip()


# ─────────────────────────────────────────────────────────────────────────────
# High-level helpers used by the AI pipeline (all fail-safe)
# ─────────────────────────────────────────────────────────────────────────────
def understand_query(query: str) -> dict | None:
    """Use the gateway to turn a raw (possibly non-English) query into a clean
    English visual-search phrase + object hints. Returns None if unavailable.
    """
    cfg = load_config()
    if not is_enabled() or not cfg.get("use_for_query", True):
        return None
    if not query or not query.strip():
        return None

    system = (
        "You are a computer-vision search assistant for CCTV footage. "
        "The user gives a description of a person, vehicle or object to find, possibly "
        "in Hindi, Gujarati or mixed language. Respond with STRICT JSON only, no prose:\n"
        '{"english": "<concise English visual phrase for a CLIP image search>", '
        '"objects": ["<coco object class>", ...], '
        '"attributes": ["<color/clothing/etc>", ...]}\n'
        "Keep 'english' under 12 words. 'objects' must be COCO classes like person, car, "
        "truck, bicycle, motorcycle, backpack, handbag, or [] if none."
    )
    try:
        raw = chat(
            [{"role": "system", "content": system},
             {"role": "user", "content": query.strip()}],
            temperature=0.0, max_tokens=200, timeout=min(cfg.get("timeout_seconds", 45), 25),
        )
    except Exception as e:
        print(f"[ai_gateway] understand_query failed: {e}")
        return None

    parsed = _loads_lenient(raw)
    if not isinstance(parsed, dict):
        return None
    english = str(parsed.get("english") or "").strip()
    if not english:
        return None
    objects = [str(o).strip().lower() for o in (parsed.get("objects") or []) if str(o).strip()]
    attributes = [str(a).strip().lower() for a in (parsed.get("attributes") or []) if str(a).strip()]
    return {"english": english, "objects": objects[:8], "attributes": attributes[:8], "model": cfg.get("selected_model")}


def translate_query(query: str) -> tuple[str, bool]:
    """Gateway-backed translation to English. Returns (text, used_gateway)."""
    cfg = load_config()
    if not is_enabled() or not cfg.get("use_for_translation", True):
        return query, False
    if not query or not query.strip():
        return query, False
    try:
        raw = chat(
            [{"role": "system", "content": (
                "Translate the user's CCTV search query to concise English. "
                "If it is already English, return it unchanged. Reply with ONLY the translated text, no quotes.")},
             {"role": "user", "content": query.strip()}],
            temperature=0.0, max_tokens=120, timeout=min(cfg.get("timeout_seconds", 45), 20),
        )
    except Exception as e:
        print(f"[ai_gateway] translate_query failed: {e}")
        return query, False
    out = (raw or "").strip().strip('"').strip()
    if not out:
        return query, False
    return out, True


def _deterministic_narrative(matches: list[dict], title: str, case_number: str) -> str:
    """Offline fallback executive summary — always available, no gateway needed."""
    n = len(matches)
    if n == 0:
        return "No evidence matches were extracted for this job."
    cams: dict[str, int] = {}
    types: dict[str, int] = {}
    confs: list[float] = []
    tmin = None
    tmax = None
    for m in matches:
        cams[m.get("camera_id", "N/A")] = cams.get(m.get("camera_id", "N/A"), 0) + 1
        st = (m.get("search_type") or "detection").replace("_", " ")
        types[st] = types.get(st, 0) + 1
        c = m.get("confidence")
        if isinstance(c, (int, float)):
            confs.append(float(c))
        ts = m.get("timestamp")
        if isinstance(ts, (int, float)):
            tmin = ts if tmin is None else min(tmin, ts)
            tmax = ts if tmax is None else max(tmax, ts)
    avg = (sum(confs) / len(confs)) if confs else 0.0
    top_type = max(types, key=types.get) if types else "detection"
    cam_list = ", ".join(f"{k} ({v})" for k, v in sorted(cams.items(), key=lambda x: -x[1])[:6])
    span = ""
    if tmin is not None and tmax is not None and tmax > tmin:
        span = f" spanning {time.strftime('%H:%M:%S', time.gmtime(tmin))}–{time.strftime('%H:%M:%S', time.gmtime(tmax))}"
    return (
        f"This report documents {n} evidence match{'es' if n != 1 else ''} for case {case_number}, "
        f"produced primarily by {top_type} analysis{span}. Detections were recorded across "
        f"{len(cams)} camera source{'s' if len(cams) != 1 else ''}: {cam_list}. "
        f"Mean match confidence is {avg:.0%}. Each frame below carries dual SHA-256/MD5 signatures "
        f"and an append-only chain-of-custody trail for courtroom admissibility."
    )


def generate_report_narrative(matches: list[dict], title: str, case_number: str,
                              investigator: str = "N/A") -> tuple[str, bool]:
    """Executive summary for the PDF. Uses the gateway when enabled, else a
    deterministic summary. Returns (narrative, used_gateway)."""
    cfg = load_config()
    fallback = _deterministic_narrative(matches, title, case_number)
    if not is_enabled() or not cfg.get("use_for_reports", True) or not matches:
        return fallback, False

    # Compact the matches so we don't blow the context window.
    compact = []
    for m in matches[:60]:
        compact.append({
            "camera": m.get("camera_id"),
            "time": m.get("timestamp_str"),
            "label": m.get("label"),
            "type": m.get("search_type"),
            "confidence": round(float(m.get("confidence", 0)), 3),
        })
    system = (
        "You are a forensic analyst writing the executive summary of a CCTV investigation "
        "report for law enforcement. Write ONE professional, factual paragraph (90–140 words). "
        "State the number of matches, the cameras and time window involved, the dominant "
        "detection type, and the confidence profile. Do not invent identities or facts not in "
        "the data. Neutral, courtroom-appropriate tone. Plain text only."
    )
    user = json.dumps({
        "title": title, "case_number": case_number, "investigator": investigator,
        "total_matches": len(matches), "matches_sample": compact,
    })
    try:
        text = chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3, max_tokens=320,
        )
    except Exception as e:
        print(f"[ai_gateway] report narrative failed, using fallback: {e}")
        return fallback, False
    text = (text or "").strip()
    if len(text) < 40:
        return fallback, False
    return text, True


def _loads_lenient(text: str) -> Any:
    """Parse JSON that may be wrapped in ```json fences or surrounded by prose."""
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        pass
    # Strip code fences.
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None

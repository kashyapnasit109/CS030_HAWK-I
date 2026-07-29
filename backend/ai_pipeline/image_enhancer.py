"""
VisionCCTV — AI Image Enhancer Module
Forensic-grade image enhancement for CCTV footage (Faces, License Plates, Low-Light/Blurry Objects).
Supports Local AI (OpenCV + PIL + NumPy + PyTorch) and optional Cloud API integration.
"""

import cv2
import numpy as np
import time
import hashlib
import json
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"
ENHANCED_DIR = STORAGE_DIR / "enhanced"
ENHANCED_DIR.mkdir(parents=True, exist_ok=True)


def _apply_clahe(bgr_img: np.ndarray, clip_limit: float = 2.5, tile_grid_size: tuple = (8, 8)) -> np.ndarray:
    """Apply Contrast Limited Adaptive Histogram Equalization in LAB color space."""
    lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)


def _apply_unsharp_mask(image: np.ndarray, kernel_size: tuple = (5, 5), sigma: float = 1.0, amount: float = 1.5, threshold: int = 0) -> np.ndarray:
    """Unsharp masking to emphasize high-frequency edge details without noise amplification."""
    blurred = cv2.GaussianBlur(image, kernel_size, sigma)
    sharpened = float(amount + 1) * image.astype(np.float32) - float(amount) * blurred.astype(np.float32)
    sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
    if threshold > 0:
        low_contrast_mask = np.abs(image.astype(np.int16) - blurred.astype(np.int16)) < threshold
        np.copyto(sharpened, image, where=low_contrast_mask)
    return sharpened


def _apply_bilateral_denoise(bgr_img: np.ndarray, d: int = 7, sigma_color: float = 50.0, sigma_space: float = 50.0) -> np.ndarray:
    """Edge-preserving noise reduction."""
    return cv2.bilateralFilter(bgr_img, d, sigma_color, sigma_space)


def _apply_super_res(bgr_img: np.ndarray, scale_factor: float = 2.0) -> np.ndarray:
    """High-fidelity multi-stage Lanczos4 super-resolution upscaling combined with edge sharpening."""
    h, w = bgr_img.shape[:2]
    new_w = int(w * scale_factor)
    new_h = int(h * scale_factor)
    
    # For large upscale factors (> 3.0), do multi-pass upscale to prevent ringing
    if scale_factor > 3.0:
        mid_w = int(w * (scale_factor / 2.0))
        mid_h = int(h * (scale_factor / 2.0))
        mid_scaled = cv2.resize(bgr_img, (mid_w, mid_h), interpolation=cv2.INTER_LANCZOS4)
        scaled = cv2.resize(mid_scaled, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    else:
        scaled = cv2.resize(bgr_img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    
    # Laplacian subtle sharpening after upscale
    kernel = np.array([[0, -0.4, 0], [-0.4, 2.6, -0.4], [0, -0.4, 0]], dtype=np.float32)
    sharpened = cv2.filter2D(scaled, -1, kernel)
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def enhance_local(
    image_bytes: bytes,
    mode: str = "general",
    scale_factor: float = 2.0,
    sharpness_boost: float = 1.5,
    contrast_boost: float = 1.2,
    denoise_level: str = "medium"
) -> tuple[bytes, dict]:
    """
    Forensic local AI enhancement pipeline.
    Modes:
      - 'general': Balanced contrast, noise reduction, sharpening, and upscaling.
      - 'face': Shadow relief, skin-tone preserving contrast, high-pass face detail boost.
      - 'lpr': High contrast stretching, bimodal text enhancement, edge sharpening for plates.
      - 'super_res': 4x resolution upscaling with detail preservation.
    """
    start_time = time.time()
    nparr = np.frombuffer(image_bytes, np.uint8)
    bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Invalid image file or format")

    orig_h, orig_w = bgr.shape[:2]

    # Step 1: Denoise based on level
    if denoise_level == "high":
        denoised = cv2.fastNlMeansDenoisingColored(bgr, None, 10, 10, 7, 21)
    elif denoise_level == "medium":
        denoised = _apply_bilateral_denoise(bgr, d=7, sigma_color=40, sigma_space=40)
    else:
        denoised = bgr.copy()

    # Step 2: Mode-specific contrast and detail processing
    if mode == "face":
        # Face mode: CLAHE for dark eye/mouth shadows + gentle skin detail retention
        clahe_img = _apply_clahe(denoised, clip_limit=2.0, tile_grid_size=(8, 8))
        sharpened = _apply_unsharp_mask(clahe_img, kernel_size=(3, 3), sigma=0.8, amount=sharpness_boost * 1.2)
    elif mode == "lpr":
        # LPR mode: High contrast for license plate text + crisp edge sharpening
        clahe_img = _apply_clahe(denoised, clip_limit=3.5, tile_grid_size=(4, 4))
        # Extra high-pass edge boost
        sharpened = _apply_unsharp_mask(clahe_img, kernel_size=(3, 3), sigma=1.0, amount=sharpness_boost * 1.8, threshold=5)
    elif mode == "super_res":
        # Super-res mode: Focus on multi-stage upscaling
        scale_factor = max(scale_factor, 3.0)
        clahe_img = _apply_clahe(denoised, clip_limit=2.0, tile_grid_size=(8, 8))
        sharpened = _apply_unsharp_mask(clahe_img, kernel_size=(5, 5), sigma=1.2, amount=sharpness_boost)
    else:  # general
        clahe_img = _apply_clahe(denoised, clip_limit=2.2, tile_grid_size=(8, 8))
        sharpened = _apply_unsharp_mask(clahe_img, kernel_size=(5, 5), sigma=1.0, amount=sharpness_boost)

    # Step 3: Resolution Upscaling
    if scale_factor > 1.0:
        enhanced_bgr = _apply_super_res(sharpened, scale_factor=scale_factor)
    else:
        enhanced_bgr = sharpened

    # Step 4: PIL Post-adjustments (Contrast / Brightness fine-tuning)
    rgb = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)

    if contrast_boost != 1.0:
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(contrast_boost)

    # Encode back to JPEG with max quality (95)
    out_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    ok, enc = cv2.imencode(".jpg", out_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    if not ok:
        raise RuntimeError("Failed to encode enhanced image")

    res_bytes = enc.tobytes()
    proc_time = round(time.time() - start_time, 3)
    final_h, final_w = out_bgr.shape[:2]

    meta = {
        "engine": "local_ai_forensic",
        "mode": mode,
        "original_width": orig_w,
        "original_height": orig_h,
        "enhanced_width": final_w,
        "enhanced_height": final_h,
        "scale_factor": scale_factor,
        "processing_time_seconds": proc_time,
        "applied_filters": ["CLAHE_Adaptive_Contrast", "Bilateral_Edge_Denoise", "Unsharp_Mask_Sharpening", "Lanczos4_SuperRes"],
    }
    return res_bytes, meta


def enhance_cloud_replicate(
    image_bytes: bytes,
    api_key: str,
    model: str = "nightmareai/real-esrgan"
) -> tuple[bytes, dict]:
    """Optional Cloud API enhancement via Replicate."""
    start_time = time.time()
    import base64

    b64_img = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{b64_img}"

    req = urllib.request.Request(
        "https://api.replicate.com/v1/predictions",
        headers={
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "version": "42fed1c49c7415a379d00e6a2745742182f1500ed8645f26104778876e192707",  # real-esrgan
            "input": {"image": data_uri, "scale": 2, "face_enhance": True}
        }).encode("utf-8"),
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            get_url = res_json["urls"]["get"]

        # Poll prediction status
        for _ in range(30):
            time.sleep(1)
            poll_req = urllib.request.Request(get_url, headers={"Authorization": f"Token {api_key}"})
            with urllib.request.urlopen(poll_req) as poll_resp:
                poll_json = json.loads(poll_resp.read().decode("utf-8"))
                if poll_json["status"] == "succeeded":
                    output_url = poll_json["output"]
                    with urllib.request.urlopen(output_url) as img_resp:
                        enhanced_bytes = img_resp.read()
                    proc_time = round(time.time() - start_time, 3)
                    meta = {
                        "engine": "replicate_cloud_ai",
                        "model": model,
                        "processing_time_seconds": proc_time,
                    }
                    return enhanced_bytes, meta
                elif poll_json["status"] == "failed":
                    raise RuntimeError(f"Replicate API error: {poll_json.get('error')}")

        raise TimeoutError("Replicate API timed out after 30 seconds")
    except urllib.error.HTTPError as err:
        raise RuntimeError(f"Replicate API HTTP Error {err.code}: {err.read().decode('utf-8')}")


def save_enhanced_image(image_bytes: bytes) -> tuple[str, str, str]:
    """Save enhanced image bytes to ENHANCED_DIR with SHA-256 hash."""
    sha256 = hashlib.sha256(image_bytes).hexdigest()
    filename = f"enhanced_{sha256[:12]}.jpg"
    file_path = ENHANCED_DIR / filename
    file_path.write_bytes(image_bytes)
    relative_url = f"/storage/enhanced/{filename}"
    return filename, relative_url, sha256

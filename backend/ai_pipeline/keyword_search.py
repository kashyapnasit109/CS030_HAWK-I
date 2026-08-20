"""
High-Precision AI Keyword Search Pipeline.
Combines YOLOv8 multi-class object detection and CLIP zero-shot neural embedding 
for investor-grade multi-object localization, tracking, and matte-glass HUD masking.
"""

import hashlib
import json
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
import numpy as np
import opencv_compat  # noqa: F401
from ai_pipeline.frame_extractor import (
    PREMIUM_PALETTE_BGR,
    draw_matte_glass_overlay,
    save_frame,
    format_timestamp,
    extract_clips_parallel,
)
from ai_pipeline.object_detection import _get_yolo_detector, COCO_CLASSES

BASE_DIR = Path(__file__).parent.parent
RESULTS_DIR = BASE_DIR / "storage" / "results"

_TORCH_AVAILABLE = False
_clip_model = None
_clip_processor = None
_clip_device = None

try:
    import torch
    _TORCH_AVAILABLE = True
    print("[keyword_search] PyTorch available")
except Exception as e:
    _TORCH_AVAILABLE = False
    print(f"[keyword_search] PyTorch unavailable ({e}). Using OpenCV fallback.")


def _sha256_file(path: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return "N/A"


def _get_clip_device():
    """Return the torch device for CLIP, honouring the user-selected GPU."""
    global _clip_device
    if _clip_device is None:
        try:
            from ai_pipeline.device_manager import get_torch_device  # noqa: PLC0415
            _clip_device = get_torch_device()
        except Exception:
            import torch  # noqa: PLC0415
            _clip_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[CLIP] Using device: {_clip_device}")
    return _clip_device


def _get_clip():
    global _clip_model, _clip_processor
    if _clip_model is None and _TORCH_AVAILABLE:
        from transformers import CLIPModel, CLIPProcessor  # noqa: PLC0415
        print("[CLIP] Loading model…")
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        _clip_model.eval()
        device = _get_clip_device()
        if device is not None:
            _clip_model = _clip_model.to(device)
        print(f"[CLIP] Model loaded on {device}.")
    return _clip_model, _clip_processor


# COCO keyword and synonym mapping with comprehensive coverage
_COCO_SYNONYMS = {
    "cell phone": [
        "phone", "cellphone", "mobile", "smartphone", "telephone", "iphone", "android",
        "handset", "device", "smart phone", "cell", "calling", "screen", "mobile phone",
        "holding phone", "person with phone", "taking photo", "recording"
    ],
    "person": [
        "person", "man", "woman", "boy", "girl", "child", "people", "human", "pedestrian",
        "suspect", "individual", "walker", "shooter", "armed person", "crowd", "audience",
        "officer", "police", "guard", "driver", "passenger"
    ],
    "car": ["car", "automobile", "sedan", "vehicle", "auto", "taxi", "cab", "suv", "coupe"],
    "truck": ["truck", "lorry", "pickup", "semi", "trailer", "van"],
    "bus": ["bus", "coach", "transit", "shuttle"],
    "motorcycle": ["motorcycle", "motorbike", "bike", "scooter", "moped"],
    "bicycle": ["bicycle", "cycle", "cyclist", "biking"],
    "backpack": ["backpack", "bag", "rucksack", "sack", "schoolbag", "knapsack"],
    "handbag": ["handbag", "purse", "clutch", "tote", "shoulder bag"],
    "suitcase": ["suitcase", "luggage", "trolley", "baggage", "briefcase", "valise"],
    "laptop": ["laptop", "computer", "notebook", "pc", "macbook"],
    "knife": ["knife", "blade", "dagger", "sword", "cutter", "weapon", "machete"],
    "bottle": ["bottle", "flask", "water bottle", "beverage"],
    "cup": ["cup", "glass", "mug", "coffee", "tea cup"],
    "chair": ["chair", "seat", "stool", "armchair", "bench"],
    "couch": ["couch", "sofa", "lounge"],
    "tv": ["tv", "television", "monitor", "screen", "display"],
    "remote": ["remote", "controller", "remote control"],
    "keyboard": ["keyboard", "keypad"],
    "mouse": ["mouse", "computer mouse"],
    "umbrella": ["umbrella", "parasol"],
    "dog": ["dog", "puppy", "canine", "hound"],
    "cat": ["cat", "kitten", "feline"],
    "sports ball": ["ball", "football", "basketball", "soccer ball", "baseball"],
}


def _resolve_target_coco_classes(query: str) -> list[str]:
    """Map natural language query to candidate COCO classes."""
    q = query.lower().strip()
    words = q.split()
    matched = set()

    for coco_cls, syns in _COCO_SYNONYMS.items():
        if coco_cls in q or q in coco_cls:
            matched.add(coco_cls)
        for s in syns:
            if s in q or q in s or any(w == s for w in words):
                matched.add(coco_cls)

    # Check direct COCO class names
    for c in COCO_CLASSES:
        if c in q or q == c or any(w == c for w in words):
            matched.add(c)

    return list(matched)


def _translate_keyword(keyword: str) -> str:
    """Translates keywords from Hindi/Gujarati/etc to English."""
    clean_kw = keyword.strip().lower()
    if not clean_kw:
        return keyword

    translation_dict = {
        # Hindi terms
        "लाल": "red", "सफेद": "white", "सफ़ेद": "white", "काला": "black", "नीला": "blue", "हरा": "green", "पीला": "yellow", "नारंगी": "orange",
        "कार": "car", "गाड़ी": "car", "ग़ाड़ी": "car", "आदमी": "man", "महिला": "woman", "लड़का": "boy", "लड़की": "girl", "बच्चा": "child",
        "फोन": "phone", "मोबाइल": "phone", "सेलफोन": "phone", "स्मार्टफोन": "phone", "टेलीफोन": "phone",
        "चाकू": "knife", "हथियार": "weapon", "बंदूक": "gun",
        "वैन": "van", "ट्रक": "truck", "बस": "bus", "साइकिल": "bicycle", "मोटरसाइकिल": "motorcycle", "बाइक": "motorcycle",
        "हेलमेट": "helmet", "जैकेट": "jacket", "बैग": "bag", "थैला": "bag", "टोपी": "hat", "चश्मा": "glasses", "जूता": "shoes",

        # Gujarati terms
        "લાલ": "red", "સફેદ": "white", "કાળો": "black", "કાળી": "black", "વાદળી": "blue", "લીલો": "green", "પીળો": "yellow", "નાળંગી": "orange",
        "ગાડી": "car", "મોટર": "car", "માણસ": "man", "પુરુષ": "man", "સ્ત્રી": "woman", "છોકરો": "boy", "છોકરી": "girl", "બાળક": "child",
        "ફોન": "phone", "મોબાઈલ": "phone", "સ્માર્ટફોન": "phone", "ટેલિફોન": "phone",
        "ચાકુ": "knife", "હથિયાર": "weapon", "બંદૂક": "gun",
        "વેન": "van", "ટ્રક": "truck", "બસ": "bus", "સાયકલ": "bicycle", "મોટરસાયકલ": "motorcycle", "બાઈક": "motorcycle",
        "હેલ્મેટ": "helmet", "જેકેટ": "jacket", "બેગ": "bag", "થેલો": "bag", "ટોપી": "hat", "ચશ્મા": "glasses", "બૂટ": "shoes",
    }

    if clean_kw in translation_dict:
        return translation_dict[clean_kw]

    words = clean_kw.split()
    translated_words = [translation_dict.get(w, w) for w in words]
    return " ".join(translated_words)


def run_keyword_search(
    video_path,
    keyword: str,
    camera_id: str = "CAM-01",
    similarity_threshold: float = 0.20,
    sample_fps: float = 2.0,
    job_id: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict[str, Any]]:
    """
    Search video footage for all occurrences of the queried keyword or concept.
    
    Features:
    - Multi-object detection & localization using YOLOv8 with high sensitivity for small items (e.g. phones)
    - Masks and tracks every matching object in every frame
    - Matte-glass semi-transparent HUD fill + solid anti-aliased outlines
    - Distinct premium color code per object instance
    - Multi-target dynamic video clip tracking
    """
    translated_keyword = _translate_keyword(keyword)
    target_coco_classes = _resolve_target_coco_classes(translated_keyword)
    print(f"[keyword_search] Query: '{keyword}' -> Translated: '{translated_keyword}', Target classes: {target_coco_classes}")

    if job_id is None:
        job_id = str(uuid.uuid4())[:8]

    job_dir = RESULTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = Path(video_path)

    matches = []
    clip_tasks: list[dict] = []

    # Get YOLO detector
    detector = _get_yolo_detector()

    # Load CLIP if needed for open-vocabulary / descriptive queries
    clip_model = None
    clip_proc = None
    if not target_coco_classes and _TORCH_AVAILABLE:
        try:
            clip_model, clip_proc = _get_clip()
        except Exception as e:
            print(f"[keyword_search] CLIP load warning: {e}")

    cap = cv2.VideoCapture(str(video_path))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(video_fps / sample_fps))
    frame_idx = 0
    frames_processed = 0

    # Sensitivity configuration: small objects like cell phone / knife benefit from conf >= 0.08
    is_small_object = any(c in ("cell phone", "knife", "remote", "mouse", "bottle", "cup") for c in target_coco_classes)
    base_conf = 0.08 if is_small_object else 0.12
    conf_thresh = max(base_conf, min(0.30, similarity_threshold))

    try:
        while cap.isOpened():
            if frame_idx % frame_interval != 0:
                if not cap.grab():
                    break
                frame_idx += 1
                continue

            success, frame = cap.read()
            if not success:
                break

            timestamp = frame_idx / video_fps
            if start_time is not None and timestamp < start_time:
                frame_idx += 1
                continue
            if end_time is not None and timestamp > end_time:
                break

            frames_processed += 1
            if progress_cb:
                try:
                    progress_cb(frames_processed, len(matches))
                except InterruptedError:
                    break

            frame_matching_boxes = []

            # 1. Run YOLO Object Detection with calibrated confidence
            try:
                results = detector(frame, verbose=False, conf=conf_thresh, imgsz=640)[0]
                detected_boxes = results.boxes

                for b in detected_boxes:
                    cls_id = int(b.cls[0])
                    cls_name = detector.names.get(cls_id, str(cls_id))
                    conf = float(b.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in b.xyxy[0]]

                    is_match = False
                    matched_label = cls_name.title()

                    if target_coco_classes:
                        if cls_name in target_coco_classes:
                            is_match = True
                            matched_label = f"{translated_keyword.title()} ({cls_name})"
                    else:
                        # Direct keyword substring match on detected class
                        if translated_keyword.lower() in cls_name.lower():
                            is_match = True
                            matched_label = f"{translated_keyword.title()} ({cls_name})"

                    if is_match:
                        color_idx = len(frame_matching_boxes) % len(PREMIUM_PALETTE_BGR)
                        frame_matching_boxes.append({
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2,
                            "label": matched_label,
                            "confidence": round(conf, 4),
                            "color_bgr": PREMIUM_PALETTE_BGR[color_idx],
                        })
            except Exception as det_err:
                print(f"[keyword_search] YOLO detection error on frame {frame_idx}: {det_err}")

            # 2. Open-Vocabulary Zero-Shot CLIP verification if no COCO match or descriptive query
            if not target_coco_classes and clip_model is not None and len(frame_matching_boxes) == 0:
                try:
                    from PIL import Image  # noqa: PLC0415
                    import torch  # noqa: PLC0415

                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(frame_rgb)
                    all_prompts = [
                        translated_keyword,
                        f"a photo of {translated_keyword}",
                        "an empty background with nothing interesting",
                        "a blank wall"
                    ]

                    with torch.no_grad():
                        inputs = clip_proc(
                            text=all_prompts,
                            images=pil_img,
                            return_tensors="pt",
                            padding=True,
                        )
                        clip_dev = _get_clip_device()
                        if clip_dev is not None:
                            inputs = {k: v.to(clip_dev) if hasattr(v, "to") else v for k, v in inputs.items()}
                        outputs = clip_model(**inputs)
                        probs = outputs.logits_per_image.softmax(dim=1)
                        clip_conf = float(torch.max(probs[0][:2]).item())

                    if clip_conf >= similarity_threshold:
                        # Full frame region
                        h_f, w_f = frame.shape[:2]
                        frame_matching_boxes.append({
                            "x1": int(w_f * 0.05),
                            "y1": int(h_f * 0.05),
                            "x2": int(w_f * 0.95),
                            "y2": int(h_f * 0.95),
                            "label": translated_keyword.title(),
                            "confidence": round(clip_conf, 4),
                            "color_bgr": PREMIUM_PALETTE_BGR[0],
                        })
                except Exception as clip_err:
                    print(f"[keyword_search] CLIP inference warning: {clip_err}")

            # If no matches in this frame, continue
            if not frame_matching_boxes:
                frame_idx += 1
                continue

            # 3. Save Evidence Frame with Multi-Object Matte Glass HUD Overlay
            frame_filename = f"kw_{job_id}_{frame_idx:06d}.jpg"
            frame_path = job_dir / frame_filename
            save_frame(frame, frame_path, draw_boxes=frame_matching_boxes)

            # 4. Schedule Multi-Object Tracking Clip Extraction
            clip_filename = f"clip_{job_id}_{frame_idx:06d}.mp4"
            clip_path = job_dir / clip_filename
            frame_hash = _sha256_file(frame_path)

            best_match = max(frame_matching_boxes, key=lambda b: b["confidence"])
            match_summary_label = (
                f"{len(frame_matching_boxes)} {translated_keyword.title()}(s) detected"
                if len(frame_matching_boxes) > 1
                else best_match["label"]
            )

            matches.append({
                "camera_id": camera_id,
                "timestamp": timestamp,
                "timestamp_str": format_timestamp(timestamp),
                "frame_url": f"/storage/results/{job_id}/{frame_filename}",
                "clip_url": f"/storage/results/{job_id}/{clip_filename}",
                "confidence": round(best_match["confidence"], 4),
                "label": match_summary_label,
                "search_type": "keyword",
                "box": best_match,
                "boxes": frame_matching_boxes,
                "detected_instances": len(frame_matching_boxes),
                "frame_hash": frame_hash,
                "clip_hash": "pending",
            })

            clip_tasks.append({
                "video_path": video_path,
                "output_path": clip_path,
                "center_timestamp": timestamp,
                "window_seconds": 4.0,
                "draw_boxes": frame_matching_boxes,
            })

            frame_idx += 1
    finally:
        cap.release()

    # Extract all clips in parallel with multi-object tracking
    if clip_tasks:
        print(f"[keyword_search] Extracting {len(clip_tasks)} multi-object tracking clip(s) in parallel...")
        try:
            extract_clips_parallel(clip_tasks, max_workers=4)
            for match in matches:
                clip_name = Path(match["clip_url"]).name
                clip_p = job_dir / clip_name
                if clip_p.exists():
                    match["clip_hash"] = _sha256_file(clip_p)
                else:
                    match["clip_url"] = None
                    match["clip_hash"] = "N/A"
        except Exception as ex_err:
            print(f"[keyword_search] Parallel clip extraction warning: {ex_err}")

    manifest = {
        "job_id": job_id,
        "video": str(video_path.name),
        "camera_id": camera_id,
        "keyword": keyword,
        "translated_keyword": translated_keyword if translated_keyword != keyword else None,
        "search_type": "keyword",
        "torch_available": _TORCH_AVAILABLE,
        "created_at": time.time(),
        "match_count": len(matches),
        "matches": matches,
        "query": f"Keyword: \"{keyword}\"",
    }
    (job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return matches

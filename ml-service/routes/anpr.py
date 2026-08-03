"""
Hawk-I ML Service — ANPR (Automatic Number Plate Recognition) Route

Pipeline:
1. YOLOv8 detects vehicles in the uploaded image (COCO classes: car, truck, bus, motorcycle)
2. Crop the lower ~40% of the largest detected vehicle bounding box (plate heuristic)
3. EasyOCR extracts text from the cropped region
4. Returns { plate_text, confidence, bounding_box } or { detection: "no_detection" }

NOTE: This uses a generic vehicle detection + crop heuristic, NOT a plate-specific
fine-tuned model. Accuracy is reasonable for front/rear-facing surveillance angles
but will degrade on angled views or distant captures.
"""

import io
import re
import logging
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException

from models.loader import get_yolo, get_ocr

logger = logging.getLogger("hawk-ml")
router = APIRouter()

# COCO class IDs for vehicles
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def clean_plate_text(raw_text: str) -> str:
    """Clean OCR output to keep only alphanumeric characters and hyphens."""
    cleaned = re.sub(r"[^A-Za-z0-9\-]", "", raw_text).upper()
    return cleaned


@router.post("/anpr")
async def detect_anpr(file: UploadFile = File(...)):
    """
    Accept an uploaded image, run vehicle detection + OCR plate extraction.
    Returns plate_text, confidence, bounding_box or a no_detection result.
    """
    yolo = get_yolo()
    ocr = get_ocr()

    if yolo is None:
        raise HTTPException(
            status_code=503,
            detail="YOLOv8 model is not loaded. Check /health for details.",
        )
    if ocr is None:
        raise HTTPException(
            status_code=503,
            detail="EasyOCR reader is not loaded. Check /health for details.",
        )

    # Read the uploaded image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    img_h, img_w = img.shape[:2]

    # ── Step 1: Detect vehicles with YOLOv8 ──────────────────────────
    results = yolo.predict(img, verbose=False, conf=0.3)

    vehicle_detections = []
    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            if cls_id in VEHICLE_CLASSES:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                area = (x2 - x1) * (y2 - y1)
                vehicle_detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "class": VEHICLE_CLASSES[cls_id],
                    "area": area,
                })

    if not vehicle_detections:
        # Fallback: try OCR on the entire image (maybe it's already a plate crop)
        logger.info("No vehicle detected. Trying OCR on full image as fallback.")
        ocr_results = ocr.readtext(img)
        if ocr_results:
            best = max(ocr_results, key=lambda r: r[2])
            plate_text = clean_plate_text(best[1])
            if len(plate_text) >= 4:
                return {
                    "plate_text": plate_text,
                    "confidence": round(float(best[2]), 4),
                    "bounding_box": {
                        "x": 0, "y": 0, "w": img_w, "h": img_h
                    },
                    "method": "full_image_ocr_fallback",
                }
        return {"detection": "no_detection", "message": "No vehicle or plate text detected in the image."}

    # ── Step 2: Crop the plate region from the largest vehicle ────────
    # Sort by area descending — use the largest vehicle
    vehicle_detections.sort(key=lambda d: d["area"], reverse=True)
    best_vehicle = vehicle_detections[0]
    x1, y1, x2, y2 = best_vehicle["bbox"]

    # Plate heuristic: crop the lower 40% of the vehicle bounding box
    veh_h = y2 - y1
    plate_y1 = y1 + int(veh_h * 0.55)
    plate_crop = img[plate_y1:y2, x1:x2]

    if plate_crop.size == 0:
        return {"detection": "no_detection", "message": "Vehicle detected but plate crop region was empty."}

    # ── Step 3: Run OCR on the cropped plate region ──────────────────
    ocr_results = ocr.readtext(plate_crop)

    if not ocr_results:
        # Second attempt: try a wider crop (lower 60%)
        plate_y1_wide = y1 + int(veh_h * 0.35)
        plate_crop_wide = img[plate_y1_wide:y2, x1:x2]
        ocr_results = ocr.readtext(plate_crop_wide)

    if not ocr_results:
        return {"detection": "no_detection", "message": "Vehicle detected but no text found in plate region."}

    # Combine all OCR text fragments and pick the best candidate
    all_texts = []
    for bbox_coords, text, conf in ocr_results:
        cleaned = clean_plate_text(text)
        if len(cleaned) >= 3:
            all_texts.append({"text": cleaned, "confidence": float(conf)})

    if not all_texts:
        return {"detection": "no_detection", "message": "OCR ran but no plausible plate text extracted."}

    # Pick the result with highest confidence
    best_text = max(all_texts, key=lambda t: t["confidence"])

    return {
        "plate_text": best_text["text"],
        "confidence": round(best_text["confidence"], 4),
        "bounding_box": {
            "x": x1,
            "y": y1,
            "w": x2 - x1,
            "h": y2 - y1,
        },
        "vehicle_class": best_vehicle["class"],
        "method": "vehicle_detection_crop_heuristic",
    }

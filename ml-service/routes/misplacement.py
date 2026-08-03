"""
Hawk-I ML Service — Object Misplacement Detection Route

Pipeline:
1. Accepts TWO images: reference_file (expected state) and current_file (scene to inspect)
2. Runs OpenCV background subtraction (absdiff + thresholding) to find difference contours
3. Classification Logic (User Fixed):
   - For missing_object regions: runs YOLOv8 classification on the REFERENCE frame crop
   - For new_object regions: runs YOLOv8 classification on the CURRENT frame crop
4. Returns JSON: { differences: [{ bounding_box, change_type: "new_object" | "missing_object", object_type, confidence }] }
"""

import logging
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException

from models.loader import get_yolo

logger = logging.getLogger("hawk-ml")
router = APIRouter()


@router.post("/misplacement")
async def detect_misplacement(
  reference_file: UploadFile = File(...),
  current_file: UploadFile = File(...)
):
  """
  Accepts reference image and current image.
  Detects added objects (new_object) or removed objects (missing_object).
  """
  yolo = get_yolo()
  if yolo is None:
    raise HTTPException(status_code=503, detail="YOLOv8 model is not loaded.")

  # ── Step 1: Decode both images ─────────────────────────────────────
  ref_bytes = await reference_file.read()
  curr_bytes = await current_file.read()

  ref_arr = np.frombuffer(ref_bytes, np.uint8)
  curr_arr = np.frombuffer(curr_bytes, np.uint8)

  ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)
  curr_img = cv2.imdecode(curr_arr, cv2.IMREAD_COLOR)

  if ref_img is None or curr_img is None:
    raise HTTPException(status_code=400, detail="Invalid image file(s) provided.")

  # Resize current image to match reference image if dimensions differ
  h, w = ref_img.shape[:2]
  if curr_img.shape[:2] != (h, w):
    curr_img = cv2.resize(curr_img, (w, h))

  # ── Step 2: OpenCV Background Differencing ─────────────────────────
  ref_gray = cv2.cvtColor(ref_img, cv2.COLOR_BGR2GRAY)
  curr_gray = cv2.cvtColor(curr_img, cv2.COLOR_BGR2GRAY)

  ref_blur = cv2.GaussianBlur(ref_gray, (5, 5), 0)
  curr_blur = cv2.GaussianBlur(curr_gray, (5, 5), 0)

  diff = cv2.absdiff(ref_blur, curr_blur)
  _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
  kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
  dilated = cv2.dilate(thresh, kernel, iterations=2)

  contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

  differences = []
  min_area = int((w * h) * 0.003)  # Filter out tiny noise (0.3% of image area)

  # ── Step 3: Classify Each Difference Region ────────────────────────
  for cnt in contours:
    area = cv2.contourArea(cnt)
    if area < min_area:
      continue

    bx, by, bw, bh = cv2.boundingRect(cnt)

    # Pad bounding box slightly
    pad = 10
    crop_x1 = max(0, bx - pad)
    crop_y1 = max(0, by - pad)
    crop_x2 = min(w, bx + bw + pad)
    crop_y2 = min(h, by + bh + pad)

    ref_crop = ref_img[crop_y1:crop_y2, crop_x1:crop_x2]
    curr_crop = curr_img[crop_y1:crop_y2, crop_x1:crop_x2]

    if ref_crop.size == 0 or curr_crop.size == 0:
      continue

    # Run YOLOv8 on Current Frame Crop (testing for new_object)
    curr_results = yolo.predict(curr_crop, verbose=False, conf=0.25)
    best_curr = None
    if curr_results and len(curr_results[0].boxes) > 0:
      top_box = curr_results[0].boxes[0]
      cls_name = yolo.names[int(top_box.cls[0])]
      conf = float(top_box.conf[0])
      best_curr = {"label": cls_name, "conf": conf}

    # Run YOLOv8 on Reference Frame Crop (testing for missing_object)
    ref_results = yolo.predict(ref_crop, verbose=False, conf=0.25)
    best_ref = None
    if ref_results and len(ref_results[0].boxes) > 0:
      top_box = ref_results[0].boxes[0]
      cls_name = yolo.names[int(top_box.cls[0])]
      conf = float(top_box.conf[0])
      best_ref = {"label": cls_name, "conf": conf}

    # Decide change_type and object_type based on YOLO detections
    if best_curr and not best_ref:
      change_type = "new_object"
      obj_type = best_curr["label"]
      confidence = round(best_curr["conf"], 2)
    elif best_ref and not best_curr:
      change_type = "missing_object"
      obj_type = best_ref["label"]
      confidence = round(best_ref["conf"], 2)
    elif best_curr and best_ref:
      # Compare confidence scores
      if best_curr["conf"] >= best_ref["conf"]:
        change_type = "new_object"
        obj_type = best_curr["label"]
        confidence = round(best_curr["conf"], 2)
      else:
        change_type = "missing_object"
        obj_type = best_ref["label"]
        confidence = round(best_ref["conf"], 2)
    else:
      # Fallback when YOLO didn't classify a standard COCO object
      ref_std = float(np.std(ref_crop))
      curr_std = float(np.std(curr_crop))

      if curr_std > ref_std:
        change_type = "new_object"
      else:
        change_type = "missing_object"

      obj_type = "object"
      # Surface confidence reflecting differencing intensity variance
      diff_intensity = float(np.mean(diff[crop_y1:crop_y2, crop_x1:crop_x2]))
      confidence = round(min(0.85, max(0.50, diff_intensity / 100.0)), 2)

    differences.append({
      "bounding_box": {
        "x": bx,
        "y": by,
        "w": bw,
        "h": bh
      },
      "change_type": change_type,
      "object_type": obj_type,
      "confidence": confidence
    })

  return {
    "differences": differences,
    "total_differences": len(differences),
    "reference_dimensions": {"width": w, "height": h}
  }

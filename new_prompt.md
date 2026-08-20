Hazard Detection Module Fix & Rebuild (Fire, Smoke, Fall, Crowd, Weapon, ANPR, Face)

## 0. Root cause of the current "0 incidents found" bug
Whatever model is currently wired into these modules is almost certainly a
generic COCO-pretrained YOLO checkpoint (e.g. stock `yolov8n.pt` /
`yolo11n.pt`). COCO's 80 classes contain **no fire, smoke, or fall class** —
so a stock model returns 0 detections by construction, regardless of
confidence threshold. This is a missing task-specific model problem, not a
tuning problem. Confirm this before anything else: check which `.pt` file
each module actually loads.

## 1. Objective
Replace the stubbed/placeholder detection logic in the ANPR-sibling modules
(fire, smoke, fall, crowd, face) with real, task-specific Ultralytics models,
each independently toggleable in the pipeline, each with visual
highlighting/masking suited to its hazard type, and each backtested against
held-out video before being called "final."

## 2. Model plan per module (research-backed choices)

| Module | Base architecture | Training data | Notes |
|---|---|---|---|
| Fire + Smoke | YOLO11s or YOLO26s (Ultralytics) fine-tuned for 2-class detection (fire, smoke) | **D-Fire dataset** (~21k images, fire+smoke labeled) as the primary base; optionally merge with a Roboflow Universe fire/smoke set for more indoor/CCTV-angle coverage | Published YOLOv8 fine-tunes on this class of data hit ~92% mAP@50 / ~84% precision / ~95% recall — treat that as the floor to beat with YOLO11/26 |
| Fall detection | YOLO11-pose / YOLOv8-pose (keypoints) + rule engine, NOT a raw bbox classifier | COCO-pretrained pose weights (transfer learning is not required for skeleton extraction) + a labeled fall/no-fall clip set to tune thresholds | Trigger logic: torso-angle-from-vertical + bbox aspect-ratio flip + centroid vertical velocity, confirmed over N consecutive frames (e.g. 8-10 frames at your pipeline FPS) before firing — this is what suppresses false positives from bending/sitting/lying-down-on-purpose |
| Crowd detection | YOLO11 / YOLO26 person detector + ByteTrack for persistent IDs | COCO-pretrained (person class is already well covered) | Density = tracked person count per region-of-interest area; bucket into Low/Medium/High/Very High; region masks let you flag one group (e.g. by an exit) as high-density while the rest of frame is fine |
| Face detection | YOLOv8n-face / YOLO11-face variant | Widerface-style pretrained face weights | Used for masking/blurring + count, not identity — keep it that way unless recognition is an explicit separate requirement |
| Weapon detection (gun/knife) | YOLOv8m or YOLO11m fine-tuned, 2-class (firearm, knife) | Custom weapon dataset in the 5,000-10,000 image range (Roboflow "Weapon Detection" / "Yolo Weapon Detection" style sets are the common public base); published YOLOv8m fine-tunes on this class of data report ~0.85 mAP@0.5, ~0.89 precision, ~0.80 recall, with knife mAP typically higher than gun mAP | This module is where false positives are least tolerable — a phone or a dark umbrella silhouette should not fire a weapon alert. Treat this module's threshold and confirmation-frame count as stricter than the others by default, and keep human-verification-friendly evidence (best frame + box crop) attached to every alert |
| Object detection by keyword search | Open-vocabulary detector (e.g. YOLO-World or Grounding DINO) layered on top of / alongside the closed-set YOLO modules | Pretrained open-vocabulary weights (no fine-tuning needed to start) | This is the module that answers "find me any frames with a red backpack" or "show me a ladder" — a fixed-class YOLO can't do this. Keep it as a separate opt-in module since open-vocabulary detectors are slower and noisier than closed-set ones; don't use it for safety-critical alerts (fire/weapon/fall), only for ad hoc search |
| ANPR (number plate) | Already working: YOLOv8 plate detector + EasyOCR | Existing pipeline | Two concrete upgrades worth making: (1) run plate OCR across multiple frames per vehicle via tracking (below) and take a majority-vote / highest-confidence read instead of trusting a single frame's OCR — this alone fixes most of ANPR's real-world error rate; (2) consider PaddleOCR as an EasyOCR alternative/fallback for low-light or angled plates if EasyOCR's read rate is a known weak point on your test footage |

## 3. Tracking layer (applies across modules, not just crowd)
Detection alone gives you boxes per frame with no memory. Tracking gives every
box a persistent ID across frames, which is what makes confirmation logic,
counting, and "smart" masking possible instead of frame-by-frame noise.
Ultralytics ships trackers built in (`model.track()`), so this isn't a new
dependency — just enable it per module:

| Tracker | When to use it here |
|---|---|
| **ByteTrack** | Lightweight, fastest, no appearance model. Good default for a static CCTV camera — use it for crowd person-tracking and general throughput-sensitive modules. |
| **BoT-SORT** (Ultralytics default) | Adds camera-motion compensation + optional ReID (re-identification). Use for ANPR vehicle tracking (vehicles move, plates need to stay attached to the same ID across frames for the multi-frame OCR vote) and for weapon tracking (attach a tracked ID to a person carrying a weapon so the alert follows the right individual, not just a box that happens to overlap). Turn on `with_reid: True` if your footage has visually similar people/vehicles causing ID swaps. |

Practical mapping for this project:
- **Crowd** → ByteTrack, person class, persistent IDs feed the per-region density count.
- **ANPR** → BoT-SORT, vehicle class, ID persistence enables the multi-frame OCR majority-vote fix described above.
- **Weapon** → BoT-SORT with ReID on, so a detected weapon stays associated with the same tracked person as they move through frame, rather than re-triggering as a "new" detection every few frames.
- **Fall** → tracking optional but useful: track the person ID so the multi-frame confirmation window is evaluated per-person, not per-box (important once more than one person is in frame).
- **Fire/smoke** → no tracking needed (regions, not discrete moving objects) — track only if you want to follow a growing fire region's bounding box growth over time as an extra severity signal.

## 4. Pipeline requirements
- Every module (fire/smoke, fall, crowd, weapon, keyword-search object
  detection, ANPR, face) must be **independently toggleable** at the pipeline
  config level — a module that's off should not load its weights, its
  tracker, or consume GPU/CPU cycles.
- Each module runs as its own inference stage in the FastAPI ML service,
  consistent with the existing ANPR module's structure (real weights, not a
  stub function returning a hardcoded response).
- Central config should let a user swap the underlying `.pt`/`.onnx` weight
  file per module without code changes (e.g. env var or config JSON per
  module: `FIRE_MODEL_PATH`, `FALL_MODEL_PATH`, `WEAPON_MODEL_PATH`, etc.) —
  this is what "use the best model per module" resolves to technically:
  swappable weights per module, not one hardcoded global model.
- Tracker choice (ByteTrack vs BoT-SORT, ReID on/off) should also be
  per-module config, per the mapping in section 3, not hardcoded globally.

## 5. Visualization / smart masking spec (per module)
"Smart masking" here means the mask/overlay is driven by tracked state and
severity, not just a static box drawn per raw detection — it should change
color/shape as confidence, severity, or density change over tracked frames.

- **Fire/smoke**: bounding box around the detected region, colored by
  severity tier derived from box area + confidence (e.g. green outline =
  smoke only/low confidence, orange = fire small-region, red = fire
  large-region/high-confidence). Label shows class + confidence %. If region
  tracking is enabled, severity color should escalate as the region's
  bounding-box area grows across frames.
- **Fall**: skeleton overlay (pose keypoints/limbs) on the person, box
  colored by state (green = upright/normal, yellow = "possible fall,
  confirming," red = "fall confirmed"), label shows live confidence % and
  frame-count-since-trigger, keyed to the person's tracked ID.
- **Crowd**: semi-transparent region mask per zone/group (not one mask for
  the whole frame), colored by density bucket (green→red gradient), with a
  live tracked-person count label per masked region — this is the "different
  crowd groups" requirement: each zone/group gets its own mask and count.
- **Weapon**: bounding box on the weapon itself plus a highlighted box/outline
  on the tracked person ID carrying it, label shows weapon class + confidence
  + "tracked person #N" so an operator can follow the right individual.
- **Object detection by keyword search**: bounding box + label showing the
  matched keyword/phrase and confidence, since results here are ad hoc
  (whatever the operator searched for) rather than a fixed severity scale.
- **ANPR**: box around plate + the OCR-read text overlaid, plus a small
  indicator of how many tracked frames contributed to the majority-vote read
  (e.g. "read from 6/8 frames") so low-confidence reads are visibly flagged.
- **Face**: bounding box + blur/pixelation mask option (toggle: box-only vs
  blurred), confidence % shown when box-only mode is active.

## 6. Confidence & alerting
- Every module surfaces raw model confidence per detection.
- Fall, fire/smoke, and weapon additionally surface a **derived confirmation
  score** (e.g. "confirmed over 8/10 frames," not just single-frame
  confidence) before an alert/incident is logged — this is what makes them
  low-false-positive rather than reactive to a single noisy frame. Weapon
  should use the strictest confirmation window of the three, per section 2.
- Log the confidence, timestamp, tracked ID (where applicable), and frame
  reference for every logged incident so false positives can be audited
  later.

## 7. Validation protocol before calling any model "final"
1. Pull each candidate pretrained/fine-tuned weight set (D-Fire-based
   fire/smoke model, pose model, person/crowd model, weapon model, face
   model) and confirm the ANPR OCR upgrade separately since it's not a new
   model, just a new voting layer on the existing one.
2. Run each against a held-out clip set that includes: your actual failing
   clips (the flame/smoke/fall footage that returned 0 incidents), plus at
   least a few unrelated clips with no hazard (to check false-positive rate),
   plus at least one clip per module with a benign look-alike (phone/umbrella
   for weapon, bending-down for fall, steam/fog for smoke) to explicitly
   stress-test false positives.
3. Record precision/recall/mAP@50 and false-positive count per module.
4. Only after this comparison, pick the weight file that gets wired into the
   pipeline as default — document why, so it's not a black-box choice.

## 8. Deliverable
A working prototype where:
- Fire, smoke, and fall are actually detected on the footage that currently
  returns 0 incidents.
- Weapon detection, keyword-search object detection, and the ANPR
  multi-frame OCR upgrade are wired in and testable.
- Every module can be toggled on/off independently.
- Every module has its own smart-masking overlay style as specified above,
  driven by tracked state where applicable.
- Confidence + confirmation logic is visible in the UI, not just a
  pass/fail flag.
- A short backtest report (per module: precision/recall/false-positive count
  on your test clips, including the look-alike stress tests) is included
  alongside the code.




  also fix the ai search is not working, also when i searched for phone in keyword search, its not properly working at all, there are multiple phone accross multiple frames, but it shows very less and what i want is, each and every object which is searched should be masked and tracked, like if we searched for phone, there every phone that is apearing in the frame should be mapped and masked with an overlay of the object with premium looking overlay, which is like semi transparent, but outlines are solid, so something like matt glass type effect on the detected objects and each detected object should have their own premium colour code given so we can differenciate, like if there are multiple phones in the frame then each phone is tracked and masked and will have this overlay with unique but premium colour which would suit. just make everything perfect, critically think and make everything work properly, and also when im searching any face in face re-id, its not working properly, for example i searched for trump with his image, in a video of 82 seconds where he apears literally many times, too many times, but result just came back with 1 result, only one was found, so please fix that and it should be able to detect properly and mask and track the person properly and put overlay as same like in object, make everything work properly and use different ai model if needed but just make everything work properly, the detections should be accurate, and better, and correct, and also i want you to push all the changes to new branch named main6, run the project too
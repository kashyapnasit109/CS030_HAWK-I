# Implementation Plan: Roboflow Supervision Vision Studio Integration

Integrate **Roboflow Supervision** into VIGINT by creating a premier **Supervision Vision AI Studio** with full backend support for unified model inferences (YOLOv8, YOLO-World zero-shot, YOLOv8-Pose, EasyOCR), ByteTrack multi-object tracking, interactive Polygon Zone & Line Tripwire spatial analytics, comprehensive annotator suite, SAHI sliced inference, and telemetry exports.

---

## Proposed Changes

### Backend Architecture

#### [NEW] [backend/routers/supervision_studio.py](file:///c:/Users/DC/Downloads/vigint/backend/routers/supervision_studio.py)
Create a comprehensive FastAPI router `routers/supervision_studio.py` providing:
- **`GET /api/supervision/info`**: Returns available models, supported annotators, color palettes, and default zones.
- **`POST /api/supervision/detect-image`**: Single image / frame analysis supporting:
  - Model selection (`yolov8n`, `yolov8s-worldv2` with custom text classes, `yolov8n-pose`, `easyocr`).
  - Chained Supervision annotators (Box, Corner, RoundBox, Halo, Label, Dot, Triangle, Blur, PercentageBar, Mask).
  - Configurable NMS and NMM thresholds.
  - Sliced inference (SAHI mode) with configurable slice dimensions and overlaps.
  - Returns annotated base64/URL image, detections metadata (`xyxy`, confidence, `class_name`, area, aspect ratio).
- **`POST /api/supervision/process-video`**: Full video analytics job supporting:
  - `sv.ByteTrack` multi-object tracking across frames.
  - `sv.PolygonZone` and `sv.PolygonZoneAnnotator` for occupancy, entry/exit count, and loitering.
  - `sv.LineZone` and `sv.LineZoneAnnotator` for bidirectional in/out flow counts with visual arrows.
  - `sv.TraceAnnotator` for movement history trajectories.
  - `sv.HeatMapAnnotator` for spatial density heatmaps.
  - Generation and storage of processed video and JSON/CSV tracking telemetry.
- **`GET /api/supervision/stream`**: Real-time MJPEG live stream processing with dynamic runtime parameters (custom zones, line tripwires, active annotator toggles, zero-shot prompts).
- **`POST /api/supervision/benchmark`**: Model performance evaluator (mAP@50, mAP@50:95, Confusion Matrix, FPS latency).

#### [MODIFY] [backend/main.py](file:///c:/Users/DC/Downloads/vigint/backend/main.py)
- Register and mount `supervision_studio` router under `/api/supervision`.

#### [MODIFY] [backend/requirements.txt](file:///c:/Users/DC/Downloads/vigint/backend/requirements.txt)
- Add `supervision>=0.28.0` to requirements file.

---

### Frontend Architecture

#### [NEW] [frontend/app/supervision/page.tsx](file:///c:/Users/DC/Downloads/vigint/frontend/app/supervision/page.tsx)
Build a state-of-the-art, high-aesthetic **Supervision Vision AI Studio** page featuring:
1. **Source & Mode Hub**:
   - Live CCTV camera feed selector, recorded case video selector, demo video, or direct file drag & drop.
   - Dual Mode: **Live / Real-Time Stream Mode** & **Deep Video / Frame Analysis Mode**.
2. **Interactive Spatial ROI Drawing Canvas**:
   - Real-time interactive canvas allowing users to click and draw arbitrary **Polygon Zones** (Restricted Area, Loitering Zone) and **Line Tripwires** (Entry/Exit turnstiles).
   - Zone presets (Perimeter Fence, Lobby Turnstile, Queue Zone, Loading Dock).
3. **Model & Zero-Shot Open-Vocabulary Engine**:
   - Model Switcher: YOLOv8 Standard, YOLO-World Open Vocabulary (with dynamic tag chips e.g. "person, backpack, helmet, suitcase, weapon, vehicle"), YOLOv8 Pose, EasyOCR text.
   - Confidence slider, IoU threshold slider, SAHI Slicing toggle.
4. **Modular Visual Annotators Sandbox**:
   - Interactive toggle pills for all 12+ annotators: Bounding Box, Corner Brackets, Round Box, Neon Halo, Tactical Triangle, Centroid Dot, Trace Trajectories, Heatmap Density, GDPR Blur/Pixelate, Confidence Bars, and Smart Badges.
   - Live color palette chooser and opacity sliders.
5. **Real-Time Spatial Telemetry & Analytics Dashboard**:
   - Bidirectional Line Crossing Counter (`IN` vs `OUT` with net flow).
   - Polygon Zone Occupancy Gauge with alert thresholds.
   - Active Tracker Table: Persistent Tracker IDs, class, confidence, dwell time, and velocity.
6. **Forensic Export & Reporting**:
   - 1-click export of detection telemetry to CSV / JSON, processed video download, and PDF Incident summary report.

#### [MODIFY] [frontend/components/AppLayout.tsx](file:///c:/Users/DC/Downloads/vigint/frontend/components/AppLayout.tsx)
- Add **Vision AI Studio (Supervision)** to the top-level navigation menu with a dedicated icon under the Monitor & AI section.

---

## Verification Plan

### Automated & Backend Tests
- Run Python verification script verifying:
  - Supervision import and version.
  - Conversion from Ultralytics YOLOv8 and YOLO-World models to `sv.Detections`.
  - ByteTrack tracker initialization and update.
  - PolygonZone and LineZone triggers with mock and real frames.
  - Annotator chaining and rendering to image buffer.
- Query `/api/supervision/info` and test `/api/supervision/detect-image` endpoint with demo image/frame.

### Manual Verification
- Access `http://localhost:3000/supervision` in the browser.
- Verify live model switching (YOLOv8 vs YOLO-World zero-shot prompts).
- Draw a custom polygon zone and line tripwire on the canvas and verify in/out count and zone occupancy trigger.
- Toggle different annotators (Halo, Trace, RoundBox, HeatMap, Blur) and confirm real-time visual updates.
- Test export functionality (CSV/JSON and annotated clip).

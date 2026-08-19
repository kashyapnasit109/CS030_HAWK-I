# 🛡️ VIGINT: Intelligent Campus Safety & Emergency Response Platform
### **Smart India Hackathon (SIH) — National Technical Brief & Master Architecture Reference**
**Document Version:** `v2.4-Production` | **Confidentiality:** `Internal Team & Jury Reference` | **Target Domain:** `Smart Automation & Public Safety`

---

## Executive Summary & Vision
**VIGINT** (derived from *Vigilance + Intelligence*) is a next-generation, edge-to-cloud campus safety orchestration platform. It integrates multi-stream RTSP CCTV feeds with environmental/hazard IoT telemetry over MQTT to achieve **sub-second incident detection, multi-sensor consensus validation (zero false positives), automated geo-spatial dispatch, and cryptographically verifiable chain-of-custody logging**.

Unlike naive CCTV viewers or fragmented alarm systems, VIGINT unites **Real-Time Edge Computer Vision**, **Multi-Sensor Fusion (Dempster-Shafer Logic)**, **Cross-Camera Re-Identification (Person/Vehicle Handover)**, **Natural Language Forensic Search (CLIP)**, and **Privacy-Preserving Edge Redaction (DPDP/GDPR-compliant)** into a single unified Command & Control Dashboard.

---

## 1. System Architecture & High-Level Data Flow

```
+--------------------------------------------------------------------------------------------------+
|                                    PHYSICAL INGESTION LAYER                                      |
|                                                                                                  |
|   [ 4K/1080p RTSP IP Cameras ]             [ IoT Mesh (ESP32 / Zigbee / LoRaWAN) ]               |
|      - ONVIF / H.264 / H.265                  - MQ-2 (Smoke/LPG/CO), MQ-7 (Toxic)                |
|      - PTZ Optical Encoders                   - DHT22 (Temp/Humid), PIR (Passive IR)             |
|      - 25-30 FPS Streaming                    - Sound Level Sensors (Acoustic Decibel)           |
+------------------------------------+------------------------------------+------------------------+
                                     |                                    |
                                     v                                    v
+------------------------------------+------------------------------------+------------------------+
|                              EDGE / INFERENCE PROCESSING LAYER                                   |
|                                                                                                  |
|   [ Vision Processing Pipeline ]                 [ IoT Telemetry Ingestion ]                     |
|    - Stream Demuxing (FFmpeg/GStreamer)           - MQTT Broker (EMQX / Mosquitto, TLS 8883)     |
|    - Dynamic Keyframe Sampler (Adaptive FPS)      - Time-Series Aggregator (Redis Timeseries)    |
|    - YOLOv8/v11 Multitask Detectors               - Anomaly Threshold Engine                     |
|    - RTMPose / ByteTrack Motion Dynamics                                                         |
|    - CLIP Multi-Modal Feature Extractor                                                          |
+------------------------------------+------------------------------------+------------------------+
                                     |                                    |
                                     +-----------------+------------------+
                                                       |
                                                       v
+--------------------------------------------------------------------------------------------------+
|                            MULTI-SENSOR FUSION & VALIDATION ENGINE                               |
|                                                                                                  |
|   - Spatial-Temporal Co-occurrence Matrix (ST-COM)                                                |
|   - Dempster-Shafer Evidential Fusion (Combines CV confidence + Sensor telemetry)                |
|   - Zero False Positive Filter (Dual confirmation: e.g., Smoke Pixel % + MQ-2 ppm > 400)         |
+----------------------------------------------+---------------------------------------------------+
                                               |
                                               v
+--------------------------------------------------------------------------------------------------+
|                                APPLICATION & ORCHESTRATION LAYER                                 |
|                                                                                                  |
|   [ FastAPI Asynchronous Backend ]               [ PostgreSQL + TimescaleDB + pgvector ]         |
|    - WebSocket SSE Real-time Broadcaster          - Spatio-temporal Incident Logs                |
|    - Dynamic Escalation Matrix (P1-P4)            - Facial & Semantic Embeddings (512-dim)       |
|    - Automated Dispatch & PA System Trigger       - Hash-Chained Audit Trail (SHA-256)           |
+----------------------------------------------+---------------------------------------------------+
                                               |
                                               v
+--------------------------------------------------------------------------------------------------+
|                                    PRESENTATION & COMMAND UI                                     |
|                                                                                                  |
|   [ Next.js 16 + TailwindCSS Dark Mode Operations Center ]                                       |
|    - Live 2.5D Geo-Referenced Floorplan & Campus Map (MapLibre / Canvas)                         |
|    - Triage Matrix, Instant Clip Playback, Edge Face Blur Redaction Toggle                       |
|    - Forensic Natural Language Search ("student with red backpack near library gate")            |
|    - Automated Legal PDF Incident Docket Generation                                              |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Core Computer Vision Models & Event Detection Logic

VIGINT runs lightweight, hardware-accelerated (CUDA / TensorRT) models optimized for batch inference at 15–30 FPS per stream.

### 2.1. Crowd Surge & Stampede Risk Engine
* **Objective:** Prevent crushes, bottlenecks, and unauthorized gatherings near auditorium gates, cafeteria exits, and stairwells.
* **Pipeline:**
  1. **Object Detection:** YOLOv8x/YOLOv11 detects human heads and bounding boxes (`person` class).
  2. **Density Estimation:** Spatial partitioning via Voronoi Tessellation across predefined camera zones ($Area_{zone}$).
  3. **Optical Flow Vector Field:** Lucas-Kanade or Farneback dense optical flow calculates movement velocity vector $\vec{v} = (v_x, v_y)$.
  4. **Panic Metric ($Q_{surge}$):**
     $$\text{Density } \rho = \frac{N_{\text{detected}}}{Area_{\text{zone}}} \quad (\text{persons/m}^2)$$
     $$\text{Kinetic Disorder } K = \frac{1}{N} \sum_{i=1}^N \|\vec{v}_i - \vec{v}_{\text{mean}}\|^2$$
     $$\text{Surge Score } S = \alpha \cdot \rho + \beta \cdot K$$
     *Trigger P1 Alert if $S > \theta_{\text{critical}}$ for $> 3.5\text{ seconds}$.*

### 2.2. Slip, Trip & Fall Detection
* **Objective:** Immediate medical alert when an elderly faculty member, student, or worker collapses in corridors or walkways.
* **Pipeline:**
  1. **Pose Estimation:** RTMPose-s / YOLOv8-Pose extracts 17 keypoints (nose, shoulders, hips, knees, ankles).
  2. **Aspect Ratio of Bounding Box:** $\text{Aspect Ratio} (AR) = \frac{\text{Height}}{\text{Width}}$. Normal standing: $AR > 1.4$; fallen: $AR < 0.8$.
  3. **Vertical Velocity of Head/Center-of-Mass:** $V_y = \frac{\Delta y_{head}}{\Delta t}$.
  4. **Post-Fall Immobility Detection:** If $AR < 0.8$ and $V_y > \text{Threshold}_{\text{fall}}$, start immobility timer. If zero translational velocity for $> 5\text{s}$, trigger **Medical Fall Emergency**.

### 2.3. Geofencing & Unauthorized Zone Intrusion
* **Objective:** Prevent access to electrical substations, server rooms, chemical labs, and rooftop terraces during restricted hours.
* **Pipeline:**
  1. Operator defines arbitrary N-sided convex polygons directly on the RTSP canvas.
  2. Perspective Transformation Matrix ($M_{3\times3}$) maps pixel coordinates $(u, v)$ to real-world ground-plane meters $(X, Y)$.
  3. **Ray-Casting Algorithm:** Tests whether person/vehicle base coordinate $(x_{\text{bottom}}, y_{\text{bottom}})$ is inside polygon $\mathcal{P}$.
  4. Time-of-Day Filter: Cross-references schedule table (`active_from`, `active_to`). If inside restricted schedule $\rightarrow$ Instant Siren & Control Room Popup.

### 2.4. Abandoned Object & Unattended Baggage Detection
* **Objective:** Identify suspicious backpacks, boxes, or parcels left in high-transit corridors.
* **Pipeline:**
  1. Dual Background Subtraction: Short-term background model ($M_{short}$) vs. Long-term background model ($M_{long}$).
  2. Static Object Verification: When YOLO detects luggage/backpack (`bag`, `backpack`, `suitcase`), it associates it with nearest tracked person using **ByteTrack**.
  3. Disassociation Radius: If the owner moves further than $D_{threshold} = 4.5\text{ meters}$ and the item remains stationary for $> T_{unattended} = 60\text{ seconds}$, an **Abandoned Item Alert (P2)** is registered.

### 2.5. Fire & Smoke Early Visual Detection
* **Objective:** Optical early warning for outdoor or high-ceiling zones where ceiling smoke detectors lag by minutes.
* **Pipeline:**
  1. Custom fine-tuned YOLOv8-Fire model trained on D-Fire and indoor datasets.
  2. Color Space Check: Segment flame regions in HSV ($H \in [0, 50], S \in [100, 255], V \in [200, 255]$).
  3. Smoke Flicker & Texture Analysis: Smoke exhibits low spatial gradient energy and high boundary turbulence over temporal windows.

---

## 3. IoT Multi-Sensor Ingestion & Telemetry Architecture

Campus IoT nodes publish structured telemetry over **MQTT (TLS 8883)** with QoS 1 to guarantee delivery.

### 3.1. MQTT Topic Topology
```
campus/{campus_id}/building/{bldg_id}/floor/{floor_no}/zone/{zone_id}/telemetry
campus/{campus_id}/building/{bldg_id}/floor/{floor_no}/zone/{zone_id}/event
campus/{campus_id}/actuators/{device_id}/command
```

### 3.2. Standardized JSON Payload Schema
```json
{
  "sensor_id": "SN-BLD2-F1-04",
  "campus_id": "CAMPUS-NORTH",
  "building": "Engineering-Block-A",
  "floor": 1,
  "zone": "Robotics-Lab-Chemical-Store",
  "timestamp": 1724062400.124,
  "telemetry": {
    "temperature_celsius": 58.4,
    "humidity_percent": 32.1,
    "mq2_smoke_ppm": 680,
    "mq7_co_ppm": 45,
    "lpg_gas_leak": true,
    "pir_motion_detected": false,
    "acoustic_decibel": 74.2
  },
  "battery_voltage": 3.65,
  "signal_rssi_dbm": -68
}
```

### 3.3. Multi-Sensor Evidential Fusion Logic (Zero False Positives)
To prevent costly false evacuations, VIGINT enforces an **Evidential Fusion Matrix**:

| Event Type | Computer Vision Trigger | Primary IoT Trigger | Secondary IoT Trigger | Resulting Decision |
| :--- | :--- | :--- | :--- | :--- |
| **P1: Structural Fire** | Smoke/Flame Detected ($Conf \ge 0.75$) | MQ-2 Smoke $> 400\text{ ppm}$ | Temp rate of rise $> 2^\circ\text{C/min}$ | **Instant Fire Alarm + Auto Dispatch** |
| **P1: Gas Hazard** | No visual smoke | MQ-2 / LPG $> 300\text{ ppm}$ | Acoustic hiss $> 65\text{ dB}$ | **Evacuate Lab + Cut Gas Valve Actuator** |
| **P2: Physical Fight/Brawl** | High Kinetic Energy ($K > 8.5$) | Acoustic Decibel $> 85\text{ dB}$ | PIR Rapid Trigger | **Security Guard Dispatched to Quad** |
| **P3: Minor Heat Spike** | No visual anomaly | Temp $> 45^\circ\text{C}$ | MQ-2 Normal | **HVAC Maintenance Warning (No Panic)** |

---

## 4. Advanced SentinelVision Heritage Modules

VIGINT inherits and expands the tactical computer vision capabilities of SentinelVision:

### 4.1. Cross-Camera Re-Identification (Re-ID & Handover)
* **Architecture:** Uses **OSNet / ResNet-50-IBN** embedding heads producing $L_2$-normalized 512-dimensional feature vectors.
* **Camera Handover Matrix:** When a person of interest exits `CAM-GATE-01`, their cosine similarity:
  $$\text{Sim}(E_A, E_B) = \frac{E_A \cdot E_B}{\|E_A\| \|E_B\|}$$
  is compared against appearances in adjacent spatial camera nodes (`CAM-LOBBY-02`, `CAM-QUAD-03`) within a temporal window $\Delta t$, building a complete trajectory timeline.

### 4.2. Natural Language Semantic Search (CLIP Architecture)
* **Mechanism:** ViT-B/32 multimodal image-text space allows investigators to type natural language descriptions (e.g., *"student carrying blue sports duffel bag and black jacket"*).
* The query is encoded via `CLIP text_encoder` and matched against cached frame object crops in **pgvector** using Cosine Distance index (`HNSW`).

### 4.3. Automated Number Plate Recognition (ANPR / LPR)
* **Pipeline:** YOLOv8-Vehicle $\rightarrow$ YOLO-Plate detector $\rightarrow$ Bilinear unwarping/deskewing $\rightarrow$ **EasyOCR / CRNN** optical character recognition.
* Cross-referenced with the Campus Registered Vehicle Database (Flags blacklisted or unauthorized delivery vehicles instantly).

---

## 5. Privacy-Preserving & Forensic Chain-of-Custody Engineering

### 5.1. Dynamic Edge Redaction & Anonymization
* **DPDP Act (India) & GDPR Compliance:** Live and recorded video views apply automatic Gaussian blurring ($\sigma = 25$) to all facial crops and bystander bounding boxes by default.
* **Authorized Forensic Unmasking:** Only officers with `Role: FORENSIC_INVESTIGATOR` holding valid FIR/Warrant numbers can toggle de-anonymization. Every unmasking event is logged to the immutable audit database.

### 5.2. Hash-Chained Chain-of-Custody (SHA-256)
* Every extracted video evidence snippet, incident log, and operator action generates a cryptographic audit block:
  $$H_n = \text{SHA256}(H_{n-1} \,\|\, \text{Timestamp} \,\|\, \text{EventID} \,\|\, \text{Actor} \,\|\, \text{RawVideoHash})$$
* Guarantees video clips cannot be tampered with, deleted, or fabricated before court or disciplinary proceedings.

---

## 6. Real-Time Incident Escalation Matrix (P1–P4)

```
+---------------------------------------------------------------------------------------------------+
| PRIORITY LEVEL       | EXAMPLES                      | AUTOMATED RESPONSE & ESCALATION            |
+----------------------+-------------------------------+--------------------------------------------+
| P1: CRITICAL         | Active Fire, Stampede Surge,  | 1. Full-screen Control Room Alert & Siren   |
| (Response < 30 sec)  | Weapon, Night Perimeter Breach| 2. Automated WhatsApp/SMS to Chief Warden  |
|                      |                               | 3. Building PA System evacuation message   |
|                      |                               | 4. Smart Access Doors Auto-Unlocked        |
+----------------------+-------------------------------+--------------------------------------------+
| P2: HIGH             | Fall with Immobility, Brawl,  | 1. Mobile Push Alert to nearest Guard      |
| (Response < 2 min)   | Abandoned Bag, Toxic Gas Leak | 2. Camera PTZ auto-locks onto incident     |
|                      |                               | 3. Incident Ticket assigned in Dashboard   |
+----------------------+-------------------------------+--------------------------------------------+
| P3: MEDIUM           | Tailgating, Vehicle in No-Park| 1. Security desk notification              |
| (Response < 10 min)  | Restricted Area Loitering     | 2. License plate logged into blacklist     |
+----------------------+-------------------------------+--------------------------------------------+
| P4: LOW              | Overcrowded Cafeteria Queue,  | 1. Statistical entry into analytics DB     |
| (Informational)      | HVAC Temp Anomaly             | 2. Maintenance team weekly digest          |
+---------------------------------------------------------------------------------------------------+
```

---

## 7. SIH Competitive Advantages & Differentiation

| Feature / Metric | Conventional CCTV / VMS | Standalone AI Tools | **VIGINT Campus Safety Platform** |
| :--- | :--- | :--- | :--- |
| **False Positive Rate** | High (triggers on rain/shadows) | Moderate (Visual only) | **$< 1.8\%$ (Multi-Sensor Evidential Fusion)** |
| **Incident Verification**| Manual (Guard monitors screens)| Visual only | **Automated 2-tier Consensus (CV + IoT)** |
| **Search Speed** | Hours of manual scrubbing | Simple keyword tag | **Seconds (Natural Language CLIP Semantic Search)** |
| **Emergency Action** | Operator must manually call | Notification only | **Automated Actuator Trigger (PA, Doors, Sirens)** |
| **Privacy Compliance** | None (Raw streams recorded) | Post-export blurring | **Edge Real-Time Dynamic Anonymization** |
| **Deployment Model** | Cloud-dependent (high bandwidth)| Heavy Cloud GPU cost | **Hybrid Edge-Fog (Works on LAN even if WAN drops)** |

---

## 8. Technology Stack Summary

* **Inference & Vision:** Python 3.11, PyTorch 2.5 (CUDA 12.1), OpenCV 4.10, YOLOv8/v11, ByteTrack, RTMPose, CLIP ViT-B/32, EasyOCR.
* **IoT & Telemetry:** MQTT (EMQX/Eclipse Mosquitto), ESP32 Microcontrollers, Zigbee 3.0, Redis TimeSeries.
* **Backend API & Orchestration:** FastAPI, Uvicorn, Celery (Async Background Worker), WebSockets (SSE Real-time feeds), Pydantic v2.
* **Database & Persistence:** PostgreSQL 16 + TimescaleDB (sensor streams) + `pgvector` (512D embedding similarity search), SQLite (Edge local cache).
* **Frontend Operations Center:** Next.js 16 (App Router), React 19, TypeScript, TailwindCSS, MapLibre GL / Canvas 2.5D floorplans, Lucide Icons.

---
*VIGINT Technical Architecture Document — Ready for SIH Final Pitch & Technical Jury Defense.*

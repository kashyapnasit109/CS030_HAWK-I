# SentinelVision: Million-Dollar Startup Product Roadmap
This document serves as our product specification and master task registry (`latest_task.md`) to finalize the project for live demonstrations, commercial pilot deployments, and investor pitching.

---

## 1. Startup Vision & Investor Pitch Hooks
To attract venture capital and secure governmental pilot contracts, SentinelVision must emphasize these three unique selling points (USPs):
1. **Offline Edge Sovereignty:** Unlike competitors that require cloud connections (AWS Rekognition/Google Cloud Vision), SentinelVision runs **100% offline** on resource-constrained laptops in field investigations. No data leaks, no internet required.
2. **Admissible Chain of Custody:** Implementing zero-trust cryptographic hashing (SHA-256 checks at upload, database matching, and PDF signatures) ensures all extracted frames are forensically sound and ready for courtroom submission.
3. **Hardware-Agnostic Execution:** By optimizing models to ONNX and utilizing CPU execution providers, we bypass the need for expensive NVIDIA server grids.

---

## 2. Master Task Registry (`latest_task.md`)

- `[ ]` **Phase 1: Edge-Optimized AI Engine Integration**
  - `[ ]` Convert PyTorch models (FaceNet, YOLOv8) to ONNX Runtime formats for 4x faster CPU execution.
  - `[ ]` Implement local quantizations (INT8 precision) to run deep learning pipelines on standard field-officer laptops without GPU hardware.
  - `[ ]` Refine the YOLOv8-pose estimation keypoint analysis to dynamically distinguish standing vs. running posture states.
  - `[ ]` Implement a local OCR parser for easy license plate character mismatch tolerance (Levenshtein distance matching for partial plate inputs).

- `[ ]` **Phase 2: Live Feed Snapshot Scanning & ROI Zones**
  - `[ ]` Integrate live RTSP feed scanning with frame-buffering queues for real-time alerting.
  - `[ ]` Develop an interactive **Region of Interest (ROI) drawer** on Next.js using HTML5 Canvas. Investigators can draw custom polygons over cameras to analyze movement inside restricted zones only.
  - `[ ]` Implement motion detection filters that skip static video blocks, decreasing search runtimes by up to 70%.

- `[ ]` **Phase 3: Investor-Ready Analytics Dashboard**
  - `[ ]` Build an interactive VMS Analytics page.
  - `[ ]` Add a **Tag Cloud** widget visualizing query term frequency and commonly detected clothing attributes.
  - `[ ]` Implement statistical charting showing matching event counts per camera over a selected timeframe.
  - `[ ]` Create a live alert ticker showing critical watchlist matches with visual warning glows and browser-native audio beeps.

- `[ ]` **Phase 4: Forensic Compliance Hardening**
  - `[ ]` Upgrade the PDF report exporter to output a dual-signature (SHA-256 and MD5) forensic document.
  - `[ ]` Embed the append-only `chain_of_custody` database history logs directly into reports.
  - `[ ]` Develop a web verification route where independent auditors can drag-and-drop report PDFs to confirm they match official database hashes.

- `[ ]` **Phase 5: Premium Dark-Black UI/UX Polish**
  - `[ ]` Overhaul all page panels into high-end glassmorphic dark cards (`rgba(18, 24, 33, 0.7)`) with neon-cyan glowing borders (`0 0 15px rgba(45, 212, 191, 0.15)`).
  - `[ ]` Add a hover-to-magnify (magnifying glass) lens overlay on the Results page, allowing investigators to zoom in on faces or license plates inside frames.
  - `[ ]` Implement smooth page-transition animations using Framer Motion or pure CSS keyframes.

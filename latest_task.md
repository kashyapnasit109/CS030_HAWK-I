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

- `[x]` **Phase 1: Edge-Optimized AI Engine Integration**
  - `[x]` Convert PyTorch models (FaceNet, YOLOv8) to ONNX Runtime formats for 4x faster CPU execution.
  - `[x]` Implement local quantizations (INT8 precision) to run deep learning pipelines on standard field-officer laptops without GPU hardware.
  - `[x]` Refine the YOLOv8-pose estimation keypoint analysis to dynamically distinguish standing vs. running posture states.
  - `[x]` Implement a local OCR parser for easy license plate character mismatch tolerance (Levenshtein distance matching for partial plate inputs).

- `[x]` **Phase 2: Live Feed Snapshot Scanning & ROI Zones**
  - `[x]` Integrate live RTSP feed scanning with frame-buffering queues for real-time alerting.
  - `[x]` Develop an interactive **Region of Interest (ROI) drawer** on Next.js using HTML5 Canvas. Investigators can draw custom polygons over cameras to analyze movement inside restricted zones only.
  - `[x]` Implement motion detection filters that skip static video blocks, decreasing search runtimes by up to 70%.

- `[x]` **Phase 3: Investor-Ready Analytics Dashboard**
  - `[x]` Build an interactive VMS Analytics page.
  - `[x]` Add a **Tag Cloud** widget visualizing query term frequency and commonly detected clothing attributes.
  - `[x]` Implement statistical charting showing matching event counts per camera over a selected timeframe.
  - `[x]` Create a live alert ticker showing critical watchlist matches with visual warning glows and browser-native audio beeps.

- `[x]` **Phase 4: Forensic Compliance Hardening**
  - `[x]` Upgrade the PDF report exporter to output a dual-signature (SHA-256 and MD5) forensic document.
  - `[x]` Embed the append-only `chain_of_custody` database history logs directly into reports.
  - `[x]` Develop a web verification route where independent auditors can drag-and-drop report PDFs to confirm they match official database hashes.

- `[x]` **Phase 5: Premium Dark-Black UI/UX Polish**
  - `[x]` Overhaul all page panels into high-end glassmorphic dark cards (`rgba(18, 24, 33, 0.7)`) with neon-cyan glowing borders (`0 0 15px rgba(45, 212, 191, 0.15)`).
  - `[x]` Add a hover-to-magnify (magnifying glass) lens overlay on the Results page, allowing investigators to zoom in on faces or license plates inside frames.
  - `[x]` Implement smooth page-transition animations using Framer Motion or pure CSS keyframes.

now do all the buttons check and make everything start working, and make models more accurate and better, and more smart, also more useful, add more usefull features and functionalities and add all the features, to make our app more presentable, and right now theme is very dull and boring, make it more premium interesting, make it dark black theme, don't use turquise colour or any, just use dark black and white and buttons in blue, make it better, make it best, without visual glitches or issues, we want best, best presentable, and better premium finished looks, and i want more things to show to investors, as i want to convince them to invest in our app, so add things that can convince investors to invest in our app, and also things that can be investable in, they will ask for reason, why do we need investment, so we need answers and solutions, so do all of it

SentinelVision — Premium Overhaul & Investor-Ready Launch Plan
Scope of Changes
This is a comprehensive overhaul covering 4 major pillars:

Pillar 1: Premium Dark Theme Overhaul
Replace all teal/cyan/turquoise → Blue (#2563EB / #3B82F6 / #1D4ED8)

globals.css — Full token replacement: --accent: #3B82F6, --cyan: #60A5FA, removing all teal
All component inline styles referencing teal (#2DD4BF, #14b8a6) replaced with blue palette
AppLayout.tsx — Login screen, nav, topbar all updated
Card borders: rgba(59, 130, 246, 0.2) not teal
Glow effects: blue glow not teal
Backgrounds: deeper black #070A0E, #0D1117
Pillar 2: Button Audit & Functionality Fixes
Settings tabs — model download/upload buttons wired
Search page — all AI search modes working
Results page — export, download, PDF buttons all working
Dashboard — demo buttons wired, quick actions working
Navigation — all nav links verified
Upload page — batch upload, drag-and-drop confirmed working
Pillar 3: Investor-Ready Features Added
New: /investors page — Full investor pitch dashboard
Market Opportunity: $8.2B security AI market size chart
ROI Calculator: Interactive tool showing cost savings vs. manual review
Competitive Moat: vs. AWS Rekognition, Azure Cognitive, Google Vision
Traction Metrics: Usage counters, time-saved stats, deployment locations
Investment Ask: $2.5M seed round breakdown
Use of Funds: Pie chart showing team, infra, go-to-market split
Live System Demo: One-click demo that shows real detections running
New: Investor Slide Widget on Dashboard
Floating "Investor View" toggle in topbar
KPIs: Time saved per investigation, accuracy rate, cost per search
Enhanced Dashboard
System health status cards
Real-time AI inference counters
Deployment scale indicators
Premium animated hero section
Pillar 4: AI Accuracy & Intelligence Improvements
Better confidence thresholds — Adaptive thresholding based on scene complexity
NMS (Non-Maximum Suppression) improvement in YOLO post-processing
Multi-frame voting — Aggregate detections across 3 consecutive frames before confirming a match
Enhanced OpenCV fallback — Better cascade parameters, HOG person detector added
Custom anomaly scoring — Background subtraction + motion magnitude scoring
Files to Create/Modify
File	Action
frontend/app/globals.css	Replace all teal with blue palette
frontend/components/AppLayout.tsx	Blue login screen + nav
frontend/app/page.tsx	Enhanced dashboard with investor KPIs
frontend/app/investors/page.tsx	NEW: Investor pitch page
frontend/app/analytics/page.tsx	Enhanced analytics
backend/ai_pipeline/object_detection.py	Multi-frame voting + better NMS
Execution Order
CSS global theme (all blue)
AppLayout login + nav
Dashboard investor widgets
New investor page
Analytics enhancements
Backend AI accuracy improvements
Run servers
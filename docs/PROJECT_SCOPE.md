# Project Scope

## In Scope
- **Web Dashboard:** Unified React portal displaying system logs, alerts, health charts, and KPI stats.
- **Authentication & RBAC:** User session login with JWT and role permissions enforcing operator hierarchies.
- **Video Ingestion:** Upload mechanism (multipart files) allowing test benches to parse short MP4 video files.
- **Six Detection Modules:** Visual processing benches for automatic license plate reading (ANPR), object misplacement tracking, semantic query embeddings, vehicular velocity estimation, unauthorized entry logs, and complex threat analysis.
- **Structured Detection Events:** Schema-compliant log entry generation containing coordinates, classifications, confidence scores, and custom metadata.
- **Alert System:** Automated alert triggers withLow, Medium, or High severity categorization based on rule evaluations.
- **Analytics Charts:** Graphs showcasing active feeds, daily detection stats, and hardware health metrics (latency, memory index).
- **Camera and Zone Management:** Interface to configure connected cameras and log logs.

## Out of Scope
- **Physical CCTV Installation:** The project does not include setting up physical cameras, cables, or physical hardware network infrastructure.
- **Police / Emergency Integration:** The platform will not automatically dial emergency services or contact police dispatch.
- **Autonomous Physical Intervention:** The platform cannot close gates, lock doors, or sound physical sirens.
- **Large-scale Commercial Deployment:** The system is built for a localized prototype scale and will not be optimized for city-wide or large enterprise environments.
- **Legal/Compliance Certification:** The platform is not certified for industrial safety compliance, legal evidence validation, or GDPR-compliant facial recognition protocols.
- **Unapproved Features:** Any feature not documented in the requirements is out of scope.

## Limitations
- **Camera Quality & Resolution:** Vision models (YOLOv8, EasyOCR) rely on clear inputs; low-resolution, out-of-focus, or shaking cameras will degrade detection metrics.
- **Lighting Conditions:** Night-time operations, heavy rain, or glare will cause a significant drop in OCR and tracking accuracy.
- **Detection Accuracy Ceilings:** Object tracking and text parsing models are subject to standard machine learning error rates and false positives.
- **Processing Hardware Constraints:** Real-time multi-stream inference requires high-end GPU acceleration; local CPU deployments will experience low frame-processing rates.
- **Calibration Requirements:** Velocity detection requires manual perspective and camera parameter inputs to correlate pixel shifts with real-world km/h speeds.
- **Limited Academic Dataset:** Testing is conducted on a small sample of videos, meaning edge-case behaviors (e.g., occluded plates or overlapping targets) might yield uncalibrated results.

## Future Scope
- **Multi-Camera Tracking:** Implement re-identification algorithms to track targets across different camera views seamlessly.
- **Edge Deployment Optimization:** Package vision models to run on lightweight hardware (e.g., NVIDIA Jetson Nano) directly on-site.
- **Dedicated Mobile Application:** Build mobile apps for security operators to receive real-time push alerts and review incidents remotely.
- **Improved Anomaly Detection:** Incorporate deep learning-based temporal anomaly detection (e.g., Autoencoders) to identify unusual activities without relying on manually configured rules.
- **Larger-Scale Database Scaling:** Optimize indexing using distributed databases or vector search indices (e.g., Milvus, pgvector) to scale beyond 100k events.
- **Advanced Natural Language Search:** Enhance the semantic search model to support complex multi-modal queries (text-to-image or video segment searches).

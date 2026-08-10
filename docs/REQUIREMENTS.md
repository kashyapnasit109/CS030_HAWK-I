# Software Requirements Specification (SRS)

## Functional Requirements

### FR-01 User Authentication
The system must authenticate users (Administrators, Operators, Supervisors, Viewers) via username and password. Valid sessions will generate a secure JSON Web Token (JWT) stored client-side.

### FR-02 Role-Based Access Control
The system must enforce permissions based on roles. Administrators can manage cameras and users; Operators and Supervisors can view, search, and manage alerts; Viewers have read-only access.

### FR-03 Dashboard
The system must display a unified dashboard showing active cameras, system health logs, pending security alerts, and a summary breakdown of today's detection activities.

### FR-04 Camera Management
The system must allow Administrators to add, update, and remove cameras from the platform. Each camera configuration includes a name, location, and zone type.

### FR-05 Video Ingestion
The system must accept video files (e.g., MP4 format) via multipart forms in test benches and extract frames sequentially for computer vision processing.

### FR-06 Detection Event Generation
The system must convert vision analysis results into structured detection events. Each event payload must include camera ID, timestamp, module type, object type, confidence score, and optional metadata.

### FR-07 ANPR (Automatic Number Plate Recognition)
The system must locate license plates in video frames using YOLOv8, read alphanumeric characters using EasyOCR, and verify matches against a vehicle registry database.

### FR-08 Object Misplacement Detection
The system must compare a current video frame against a reference frame to detect appeared or disappeared objects. Detected anomalies must trigger a visual highlight and record the changes.

### FR-09 Velocity Detection
The system must track vehicles across frames in a video clip, calculate their real-time speed in km/h based on coordinates and video FPS, and log speed violations.

### FR-10 Unauthorized Entry Detection
The system must correlate individuals detected in interior zones against gate access logs. If a person appears inside without a corresponding entry gate authorization, the system logs an intrusion event.

### FR-11 Threat/Anomaly Detection
The system must evaluate detected objects and trajectories against configured threat rules (e.g., weapon presence or restricted area intrusion). The system logs a threat event containing a detailed explanation of the breach.

### FR-12 Semantic Search
The system must allow users to search historical events using natural language. The backend will embed the text query and compute cosine similarities against stored event description embeddings.

### FR-13 Alert Generation
The system must automatically generate alert logs when detection events exceed configured thresholds or violate security rules. Alerts must be classified into Low, Medium, or High severity levels.

### FR-14 Alert Management
The system must allow Operators and Supervisors to view a list of active alerts, inspect associated event details, and mark alerts as acknowledged or resolved.

### FR-15 Analytics
The system must aggregate detection stats and display active camera health trends. It must present numerical metrics of operational parameters (e.g., memory usage, inference latency).

### FR-16 Event Review
The system must allow users to view detailed historical logs of all generated detection events, including raw JSON metadata payloads and camera context.

---

## Non-Functional Requirements

### NFR-01 Performance
The ML service must perform local computer vision inference (YOLOv8, EasyOCR) with a low latency ceiling to support efficient frame processing. The frontend must render state updates smoothly.

### NFR-02 Security
All API endpoints must be protected by JWT middleware except the login routes. Passwords stored in the database must be hashed using bcrypt.

### NFR-03 Reliability
The backend must handle database connection failures gracefully and continue serving simulated or cached information using fallback data structures without crashing.

### NFR-04 Scalability
The database schema and search API must support storing and searching up to 50,000 detection events and embeddings without significant latency degradation in the brute-force cosine similarity engine.

### NFR-05 Maintainability
The application code must follow a clear separation of concerns, separating ML computer vision scripts (FastAPI), backend routes and services (Node.js/Express), and the user interface (React).

### NFR-06 Usability
The user interface must follow a consistent design system (Chakra Petch and Outfit typography, premium glassmorphism layouts) that is responsive and readable on both desktop and mobile screens.

### NFR-07 Privacy
Stored detection metadata and vehicle registry details must reside locally within the operator's self-contained database, with no external telemetry or data leaks.

### NFR-08 Compatibility
The frontend must compile and build cleanly using standard Vite configurations and run seamlessly on modern Chromium and WebKit-based desktop and mobile browsers.

### NFR-09 Testability
All core computer vision functions must expose dedicated, authenticated Test Bench API routes (`/api/modules/*/test`) that allow developers to upload clips and receive structured json results without database insertion.

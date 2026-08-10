# Team Responsibilities & Ownership Model

The HAWK-I CCTV Intelligence Platform is designed and maintained by a three-person team. Each member owns specific layers of the system architecture, backend integration, machine learning components, and user interfaces.

---

## Kashyap
*Role: Architect & Integration Lead*

### Ownership Area
- **Core Platform Architecture:** Designing the modular system integration boundaries connecting the frontend portal, node API controller gateway, and python machine learning servers.
- **Semantic Search Engine (Module 3):** Implementing the text embedding pipeline (`all-MiniLM-L6-v2`), designing the `event_embeddings` relational database schema, and developing the application-level cosine similarity search query.
- **Backend & Database Integration:** Configuring the Express API gateway, managing JSON Web Token (JWT) session generation, enforcing role middleware constraints, and writing the database migrations.
- **Alert Engine:** Creating the automated alert generation and management pipeline, mapping severity metrics, and handling status updates.
- **Threat/Anomaly Logic:** Formulating and maintaining the rule configurations and explanation-generation heuristics inside the threat analysis pipeline.

---

## Hitansh
*Role: Machine Learning (Tracking) & UI Developer*

### Ownership Area
- **ANPR Module (Module 1):** Deploying the license plate detection models (YOLOv8) and configuring character extraction scripts (EasyOCR).
- **Velocity Detection Module (Module 4):** Building the object tracking pipeline (ByteTrack), calibrating physical speed conversion heuristics, and mapping frame-by-frame velocity matrices.
- **Frontend Visualization:** Designing and building the core user interfaces, charts, and detection widgets on the dashboard.
- **Detection UI Integration:** Wiring the visual test benches (ANPR Bench, Velocity Bench) so operators can upload video clips and review plotted coordinates, extracted plates, and speed values.

---

## Meet
*Role: Machine Learning (Spatial) & Verification Engineer*

### Ownership Area
- **Object Misplacement Module (Module 2):** Creating the frame comparison and alignment pipeline, detecting appeared/disappeared pixel coordinates, and classifying reference-frame items.
- **Unauthorized Entry Module (Module 5):** Designing the spatial-relation boundary check logic, configuring interior zone coordinates, and mapping access control logs correlation scripts.
- **Testing & Verification:** Writing unit tests for endpoint routes, verifying fallback mock data, simulating live camera data streams, and running integration performance builds.

---

> [!NOTE]
> The items listed above represent architectural ownership and responsibilities. Some features are currently under active development and will be committed iteratively as progress continues.

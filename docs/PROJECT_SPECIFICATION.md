# Project Specification

## Project Title
HAWK-I — Unified AI-Powered CCTV Intelligence Platform

## Problem Statement
Traditional Closed-Circuit Television (CCTV) systems are primarily passive recording devices. They capture and store vast amounts of video footage but depend heavily on human operators for real-time monitoring and post-incident investigation. This manual approach introduces several key challenges:
- **Continuous Manual Monitoring:** Operators must watch multiple screens simultaneously, leading to fatigue, distraction, and missed events.
- **Large Volumes of Footage:** Searching through hours or days of recorded video to locate a specific event is labor-intensive and time-consuming.
- **Delayed Incident Identification:** Security breaches or operational anomalies are often discovered hours or days after they occur.
- **Difficulty Finding Specific Events:** Locating specific objects, actions, or vehicle plates requires scrolling through timelines without structured search parameters.
- **Limited Automated Alerts:** Most traditional systems lack the ability to automatically identify threats and notify personnel in real time.

## Proposed Solution
HAWK-I is designed as an intelligent, automated software layer that sits on top of existing CCTV infrastructure. By processing video feeds and extracting structured metadata, HAWK-I converts raw video into searchable, actionable, and monitorable detection events. The platform automates threat identification, provides semantic search capabilities, and generates immediate alerts, turning passive video recorders into proactive intelligence hubs.

## Objectives
1. **Automate Real-time Threat Detection:** Automatically identify security anomalies (e.g., unauthorized entry, loitering) as they happen.
2. **Reduce Post-Event Investigation Time:** Provide structured metadata and semantic search to allow operators to find events in seconds instead of hours.
3. **Enhance Traffic & Access Monitoring:** Automate vehicle identification and speed logging at access control points.
4. **Minimize Human Fatigue:** Reduce the need for continuous manual surveillance by generating automated alerts for critical events.
5. **Optimize Storage Retrieval:** Store compact structured event logs and metadata in a relational database, linking to video clips only when necessary.
6. **Provide Actionable Analytics:** Aggregate detection counts and alerts to give administrators insights into security trends and camera performance.
7. **Ensure Low-Latency processing:** Enable rapid local inference for computer vision tasks using lightweight models.

## Target Users
- **Security Administrator:** Manages system configuration, user access roles, and general platform settings.
- **Security Operator:** Monitors live streams, receives alerts, and manages detection events.
- **Security Supervisor:** Reviews accumulated alerts, generates incident reports, and overrides system configurations when necessary.
- **Viewer:** Accesses live feeds and historical reports with read-only permissions.

## Major Features
- **CCTV/Video Ingestion:** Ingests video streams or local files (e.g., test benches) for frames processing.
- **Detection Modules:** Implements specialized rules and computer vision tasks for ANPR, velocity, misplacement, intrusion, loitering, and threat detection.
- **Event Storage:** Saves structured event JSON payloads, camera IDs, timestamps, and confidence scores to a persistent database.
- **Alert Generation & Management:** Automatically creates categorized security alerts (Low, Medium, High severity) when specific detection rules are triggered.
- **Semantic Search:** Allows operators to use natural language queries to search through historical event descriptions using text embeddings.
- **Unified Dashboard:** Provides a command center containing live KPI cards, alerts, and system health status.
- **Analytics Visualization:** Displays active camera feeds, detection counts per module, and platform performance.
- **Camera & Zone Management:** Enables adding cameras, defining virtual monitoring zones, and logging status updates.

## Real-World Applications
- **Educational Campuses:** Monitoring perimeter fences for intrusion and checking vehicles entering/exiting campus.
- **Gated Communities:** Tracking visitor counts, unauthorized entry, and vehicular traffic speed.
- **Corporate Facilities:** Securing restricted areas (e.g., server rooms) and identifying loitering.
- **Industrial Sites:** Flagging abandoned items or misplaced machinery in high-risk zones.
- **Parking Facilities:** Logging license plates at entry/exit checkpoints and monitoring traffic flow.
- **Commercial Premises:** Enhancing store security through automated anomaly detection.

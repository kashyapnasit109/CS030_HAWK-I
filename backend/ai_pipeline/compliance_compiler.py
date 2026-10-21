"""
VIGINT Compliance System — Universal Rule & Condition Compiler
Leverages DeepSeek-v4-Flash via AgentRouter to compile natural language requirements into
validated, versioned JSON execution manifests with condition ASTs, action workflows,
dataset schemas, and dynamic dashboard widget configurations.
Includes deterministic offline fallback parser.
"""

import re
import json
import time
import uuid
from typing import Dict, Any, List, Optional, Tuple

class RuleCompiler:
    """Translates free-form operational requirements into executable compliance rules."""

    SYSTEM_PROMPT = """You are the VIGINT Universal Compliance & Rule Compiler.
Convert the user's natural language compliance instruction into a typed, versioned JSON configuration.

Return a SINGLE, valid JSON object with EXACTLY this structure:
{
  "name": "<Short descriptive title>",
  "category": "<Category e.g. Attendance, PPE, Perimeter, Hazard, Hygiene, Tailgating>",
  "domain": "<One of: education, healthcare, industrial, corporate, retail, transportation, smart_city, critical_infrastructure>",
  "severity": "<Low, Medium, High, Critical>",
  "trigger_type": "<schedule, event, spatial, threshold>",
  "conditions": {
    "temporal": {
      "schedule_type": "<time_window, continuous, weekly, none>",
      "start_time": "<HH:MM or null>",
      "end_time": "<HH:MM or null>",
      "days_of_week": [1, 2, 3, 4, 5],
      "grace_period_min": <number>,
      "dwell_threshold_sec": <number>
    },
    "spatial": {
      "type": "<polygon, tripwire, whole_frame>",
      "zone_name": "<e.g. Classroom 402, High Voltage Bay, ICU Entry>",
      "points": []
    },
    "relational": {
      "subject": "<person, worker, vehicle, bag, fire>",
      "predicate": "<inside, missing, scaling, loitering, operates, tailgates>",
      "object": "<zone, helmet, barrier, dispenser, person>"
    },
    "threshold": {
      "metric": "<count, dwell, speed, density>",
      "operator": "<gt, lt, eq, gte, lte>",
      "value": <number>
    }
  },
  "actions": [
    {
      "action_type": "<email_notification, siren_strobe, webhook, in_app_notification, dataset_record>",
      "target": "<email address, url, or channel>",
      "parameters": {}
    }
  ],
  "dataset_proposal": {
    "dataset_id": "<e.g. ds_attendance_records, ds_hazard_incidents>",
    "name": "<Human readable dataset name>",
    "fields": [
      {"name": "field_name", "type": "string|integer|float|boolean", "label": "Label", "required": true}
    ]
  },
  "dashboard_spec": {
    "dashboard_type": "<attendance_roster_matrix, safety_hazard_heatmap, ppe_occupational_monitor, healthcare_fall_response_console, access_tailgating_stream, general_compliance_overview>",
    "title": "<Dashboard Title>",
    "widgets": [
      {"type": "kpi_card", "title": "Total Events", "metric": "count(*)"},
      {"type": "kpi_card", "title": "Compliance Rate", "metric": "rate"},
      {"type": "time_series", "title": "Incident Timeline"},
      {"type": "data_table", "title": "Detailed Activity Roster"}
    ]
  },
  "unresolved_fields": []
}

CRITICAL RULES:
- Never hallucinate recipient emails or unknown parameters. If the user mentions "send mail to specific mail" without giving an address, place that in 'unresolved_fields'.
- Do not output markdown code fences or conversational text. Return ONLY pure JSON."""

    @staticmethod
    def compile_rule(prompt: str, user_camera_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Compiles natural language prompt via DeepSeek-v4-Flash with fallback parser."""
        camera_ids = user_camera_ids or ["GATE-01"]
        raw_result = None

        # Try AI Gateway with AgentRouter (deepseek-v4-flash)
        try:
            from ai_gateway import chat
            messages = [
                {"role": "system", "content": RuleCompiler.SYSTEM_PROMPT},
                {"role": "user", "content": f"Compile this operational rule:\n\"{prompt}\""}
            ]
            response_text = chat(messages, temperature=0.1, max_tokens=1400)
            if response_text:
                # Strip markdown code blocks if model wrapped output
                cleaned = re.sub(r"^```json\s*", "", response_text.strip(), flags=re.MULTILINE)
                cleaned = re.sub(r"^```\s*", "", cleaned.strip(), flags=re.MULTILINE)
                cleaned = cleaned.rstrip("`").strip()
                raw_result = json.loads(cleaned)
        except Exception as e:
            # Fallback will handle parsing
            pass

        # If gateway failed, or returned empty, use the deterministic fallback parser
        if not raw_result or not isinstance(raw_result, dict):
            raw_result = RuleCompiler._deterministic_fallback_compile(prompt)

        # Ensure valid rule ID and base fields
        rule_id = f"RULE-{uuid.uuid4().hex[:8].upper()}"
        raw_result["rule_id"] = rule_id
        raw_result["camera_ids"] = camera_ids
        raw_result["natural_language_prompt"] = prompt
        raw_result["version"] = 1
        raw_result["status"] = "draft" if raw_result.get("unresolved_fields") else "active"
        raw_result["created_at"] = time.time()
        raw_result["updated_at"] = time.time()

        return raw_result

    @staticmethod
    def _deterministic_fallback_compile(prompt: str) -> Dict[str, Any]:
        """
        High-precision deterministic parser for standard institutional and enterprise patterns.
        Handles attendance, smoke/fire, PPE, tailgating, loitering, and perimeter security.
        """
        text = prompt.lower()
        unresolved = []

        # Domain & Category Detection
        if any(w in text for w in ("attendance", "student", "class", "lecture", "hod", "faculty", "school", "college", "professor")):
            domain = "education"
            category = "Classroom & Workplace Attendance"
            dashboard_type = "attendance_roster_matrix"
            ds_id = "ds_attendance_records"
            subject = "student"
            predicate = "enters_classroom"
            obj = "desk_zone"
            fields = [
                {"name": "person_id", "type": "string", "label": "Student ID", "required": True},
                {"name": "person_name", "type": "string", "label": "Student Name", "required": True},
                {"name": "arrival_time_str", "type": "string", "label": "Arrival Time", "required": True},
                {"name": "status", "type": "string", "label": "Status", "required": True},
                {"name": "zone", "type": "string", "label": "Classroom", "required": True}
            ]
        elif any(w in text for w in ("fire", "smoke", "flame", "burn", "hazard", "thermal")):
            domain = "safety"
            category = "Optical Fire & Smoke Hazards"
            dashboard_type = "safety_hazard_heatmap"
            ds_id = "ds_hazard_incidents"
            subject = "fire_plume"
            predicate = "expanding_in"
            obj = "monitored_zone"
            fields = [
                {"name": "hazard_type", "type": "string", "label": "Hazard Type", "required": True},
                {"name": "intensity_score", "type": "float", "label": "Severity", "required": True},
                {"name": "sector", "type": "string", "label": "Sector", "required": True},
                {"name": "recipient_alerted", "type": "string", "label": "Alerted Contact", "required": True},
                {"name": "audio_siren_fired", "type": "boolean", "label": "Siren Fired", "required": True}
            ]
        elif any(w in text for w in ("ppe", "helmet", "hard hat", "vest", "goggle", "safety gear")):
            domain = "industrial"
            category = "Mandatory PPE Compliance"
            dashboard_type = "ppe_occupational_monitor"
            ds_id = "ds_ppe_violations"
            subject = "worker"
            predicate = "missing"
            obj = "helmet_or_vest"
            fields = [
                {"name": "worker_track_id", "type": "string", "label": "Worker Track", "required": True},
                {"name": "missing_gear", "type": "string", "label": "Missing Equipment", "required": True},
                {"name": "danger_zone", "type": "string", "label": "Danger Zone", "required": True}
            ]
        elif any(w in text for w in ("tailgat", "piggyback", "turnstile", "badge")):
            domain = "corporate"
            category = "Turnstile Anti-Tailgating"
            dashboard_type = "access_tailgating_stream"
            ds_id = "ds_access_tailgating"
            subject = "person_2"
            predicate = "tailgates"
            obj = "person_1"
            fields = [
                {"name": "turnstile_id", "type": "string", "label": "Turnstile ID", "required": True},
                {"name": "time_delta_sec", "type": "float", "label": "Time Gap", "required": True},
                {"name": "tailgater_detected", "type": "boolean", "label": "Tailgater Detected", "required": True}
            ]
        elif any(w in text for w in ("hygiene", "sanitiz", "hospital", "patient", "icu", "nurse", "doctor")):
            domain = "healthcare"
            category = "Hospital Sanitization Compliance"
            dashboard_type = "healthcare_fall_response_console"
            ds_id = "ds_hygiene_audits"
            subject = "healthcare_worker"
            predicate = "operates"
            obj = "sanitizer_dispenser"
            fields = [
                {"name": "staff_id", "type": "string", "label": "Staff ID", "required": False},
                {"name": "dispenser_id", "type": "string", "label": "Dispenser", "required": True},
                {"name": "scrub_dwell_sec", "type": "float", "label": "Scrub Dwell", "required": True},
                {"name": "compliant", "type": "boolean", "label": "Compliant", "required": True}
            ]
        else:
            domain = "corporate"
            category = "General Operational Compliance"
            dashboard_type = "general_compliance_overview"
            ds_id = "ds_general_compliance"
            subject = "individual"
            predicate = "loiters_in"
            obj = "monitored_zone"
            fields = [
                {"name": "entity_id", "type": "string", "label": "Track ID", "required": True},
                {"name": "dwell_duration", "type": "float", "label": "Dwell Sec", "required": True}
            ]

        # Extract Time (e.g. 9:10 AM, 09:10)
        start_time = None
        time_match = re.search(r"(\d{1,2}:\d{2})\s*(am|pm)?", text)
        if time_match:
            raw_t = time_match.group(1)
            am_pm = time_match.group(2)
            parts = raw_t.split(":")
            h = int(parts[0])
            m = int(parts[1])
            if am_pm == "pm" and h < 12:
                h += 12
            start_time = f"{h:02d}:{m:02d}"

        # Extract Email Recipient if present
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
        recipients = [email_match.group(0)] if email_match else []
        if "mail" in text or "email" in text:
            if not recipients:
                unresolved.append("Recipient email address was requested but not specified in prompt.")
                recipients = ["security-officer@vigint.local"]

        # Actions Construction
        actions = [
            {"action_type": "websocket_broadcast", "target": "/ws/compliance", "parameters": {}},
            {"action_type": "dataset_record", "target": ds_id, "parameters": {"dataset_id": ds_id}}
        ]
        if "mail" in text or "email" in text or "alert" in text:
            actions.append({
                "action_type": "email_notification",
                "target": recipients[0] if recipients else "admin@vigint.local",
                "parameters": {"recipients": recipients, "subject": f"VIGINT Compliance Alert: {category}"}
            })
        if "siren" in text or "alarm" in text or "fire" in text or "smoke" in text:
            actions.append({
                "action_type": "siren_strobe",
                "target": "hardware_siren",
                "parameters": {"intensity": "high", "duration_sec": 15}
            })

        return {
            "name": f"{category} Rule",
            "category": category,
            "domain": domain,
            "severity": "Critical" if "fire" in text or "smoke" in text or "breach" in text else "High",
            "trigger_type": "schedule" if start_time else "event",
            "conditions": {
                "temporal": {
                    "schedule_type": "time_window" if start_time else "continuous",
                    "start_time": start_time or "09:00",
                    "end_time": "18:00",
                    "days_of_week": [1, 2, 3, 4, 5],
                    "grace_period_min": 5,
                    "dwell_threshold_sec": 10
                },
                "spatial": {
                    "type": "polygon",
                    "zone_name": "Monitored Zone",
                    "points": []
                },
                "relational": {
                    "subject": subject,
                    "predicate": predicate,
                    "object": obj
                },
                "threshold": {
                    "metric": "count",
                    "operator": "gte",
                    "value": 1
                }
            },
            "actions": actions,
            "dataset_proposal": {
                "dataset_id": ds_id,
                "name": f"{category} Datatable",
                "fields": fields
            },
            "dashboard_spec": {
                "dashboard_type": dashboard_type,
                "title": f"{category} Live Operational Console",
                "widgets": [
                    {"type": "kpi_card", "title": "Total Records", "metric": "count(*)"},
                    {"type": "kpi_card", "title": "Compliance Rate", "metric": "rate"},
                    {"type": "time_series", "title": "Incident Timeline"},
                    {"type": "data_table", "title": "Activity Roster"}
                ]
            },
            "unresolved_fields": unresolved
        }

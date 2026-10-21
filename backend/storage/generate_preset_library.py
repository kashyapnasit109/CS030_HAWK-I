"""
Generator for VIGINT 1000+ Categorized Preset Rules Library
Spans 8 Institutional & Enterprise Domains with complete CV primitives,
Relational Triplets, Dynamic DB Table Schemas, Action Triggers, and Dashboard Layouts.
"""

import json
from pathlib import Path

DOMAINS = {
    "education": {
        "name": "Universities, Colleges & Campus Safety",
        "description": "Academic institutions, lecture halls, campus gates, dormitories, research laboratories, and sports complexes.",
        "categories": [
            "Classroom & Lecture Hall Attendance",
            "Faculty & Staff Timetable Verification",
            "Campus Perimeter & Boundary Security",
            "Dormitory Curfew & Night-Time Loitering",
            "Laboratory Hazardous Chemical & Flame Safety",
            "Hostel Anti-Ragging & Corridor Crowd Monitoring",
            "Library & Study Zone Quiet Hours Enforcement",
            "Parking Lot Vehicle Speed & Zone Control",
            "Emergency Fire Exit Clear Pathway Auditing",
            "Restricted Server & Exam Vault Access"
        ]
    },
    "healthcare": {
        "name": "Healthcare, Hospitals & Medical Centers",
        "description": "Inpatient wards, ICUs, operating theatres, emergency rooms, hospital pharmacies, and medical waste zones.",
        "categories": [
            "Hand Hygiene & Sanitizer Station Adherence",
            "Surgical Scrub & Sterile PPE Verification",
            "Inpatient Fall & Bed Exit Detection",
            "Pharmacy & Narcotics Vault Dual-Custody",
            "Emergency Room Patient Triage & Queue Overflow",
            "Stretcher & Crash Cart Corridor Obstruction",
            "Infant Abduction & Maternity Ward Security",
            "Bio-Medical Waste Zone Unauthorized Entry",
            "Radiation Therapy Oncology Shielding Compliance",
            "Aggressive Patient / Visitor De-escalation"
        ]
    },
    "industrial": {
        "name": "Industrial, Manufacturing & Construction",
        "description": "Assembly lines, heavy machinery bays, petrochemical plants, construction sites, and distribution warehouses.",
        "categories": [
            "Mandatory PPE Compliance (Helmet, Vest, Harness)",
            "Forklift-Pedestrian Exclusion Geofencing",
            "Machine Safeguard Interlock Breach",
            "Hot Work & Arc Welding Fire Watch",
            "Confined Space Entry Man-Count & Dwell",
            "Chemical Spill & Hazardous Gas Dispersion",
            "Conveyor Belt Jam & Operator Entanglement",
            "Overhead Crane Suspended Load Zone Violation",
            "Scaffolding & Elevated Platform Fall Arrest",
            "Lockout / Tagout (LOTO) Zone Loitering"
        ]
    },
    "corporate": {
        "name": "Corporate Campuses, Tech Parks & FinTech",
        "description": "Enterprise headquarters, R&D labs, data centers, trading floors, and corporate auditoriums.",
        "categories": [
            "Turnstile Anti-Tailgating & Badge Piggybacking",
            "Data Center Server Cage Dual-Person Integrity",
            "Financial Trading Floor Phone/Screen Photography",
            "Executive Floor Unauthorized Visitor Escort",
            "Clean Desk & Document Exposure Violation",
            "After-Hours Office Occupancy & Energy Curfew",
            "Loading Bay Courier Escort Compliance",
            "Rooftop & Mechanical Penthouse Intrusion",
            "Meeting Room Capacity & Social Distancing",
            "Sensitive Hardware Asset Egress Tracking"
        ]
    },
    "retail": {
        "name": "Retail, Supermarkets & Shopping Centers",
        "description": "Department stores, hypermarkets, luxury boutiques, food courts, and shopping mall concourses.",
        "categories": [
            "Cashier Counter Queue Length & Wait Time Alert",
            "High-Value Merchandise Showcase Dwell & Loitering",
            "Customer Slip, Trip & Liquid Spill Detection",
            "Unattended Bag & Shoplifting Blind-Spot Alert",
            "Staff-Only Stockroom Door Intrusion",
            "Emergency Exit Door Propped Open",
            "Cart Return Bay Overflow & Obstruction",
            "Closing Time Customer Clear-Out Verification",
            "Flash Robbery / Shoplifting Swarm Surge",
            "Display Shelf Out-of-Stock Visual Anomaly"
        ]
    },
    "transportation": {
        "name": "Transportation & Logistics Hubs",
        "description": "Airports, railway stations, metro systems, bus terminals, and freight logistics yards.",
        "categories": [
            "Platform Yellow Safety Line Crossing",
            "Track Trespass & Unauthorized Rail Access",
            "Luggage Carousel Abandoned Baggage (>60s)",
            "Automated Turnstile Fare Evaders & Vaulting",
            "Tarmac Baggage Cart Speed & Lane Discipline",
            "Flight Gate Boarding Queue Bottleneck",
            "Restricted Cargo Apron Perimeter Scaling",
            "Bus Terminal Pedestrian Crosswalk Breach",
            "Wrong-Way Vehicle Ramp Ingress",
            "Security Checkpoint Unattended Checkpoint Lane"
        ]
    },
    "smart_city": {
        "name": "Smart City & Public Urban Spaces",
        "description": "Public parks, civic plazas, pedestrian promenades, municipal transit corridors, and tourist zones.",
        "categories": [
            "Illegal Garbage & Construction Debris Dumping",
            "Public Footpath & Bike Lane Motor Encroachment",
            "Violent Physical Altercation & Street Brawl",
            "Civic Monument Vandalism & Graffiti Spraying",
            "Public Park After-Dark Curfew Violation",
            "Water Reservoir & Canal Drowning Risk Fence Crossing",
            "Bus Rapid Transit (BRT) Lane Unauthorized Vehicle",
            "Pedestrian Stampede & Sudden Density Shockwave",
            "Street Vendor Unauthorized Zone Encroachment",
            "Emergency Siren Acoustic-Optical Corroboration"
        ]
    },
    "critical_infrastructure": {
        "name": "Critical Infrastructure & Energy Grids",
        "description": "Electrical substations, water treatment reservoirs, telecommunications towers, and oil pipelines.",
        "categories": [
            "Substation High-Voltage Perimeter Fence Scaling",
            "Unmanned Aerial Drone Intrusion Spotting",
            "Transformer Oil Leak & Bushing Thermal Hazard",
            "Security Patrol Guard Tour Verification (Dwell & Checkpoint)",
            "Water Reservoir Chemical Intake Enclosure Breach",
            "Telecom Tower Climber Safety Harness Check",
            "Solar Farm Inverter Station Vandalism",
            "Pipeline Right-of-Way Heavy Equipment Intrusion",
            "Emergency Diesel Generator Fuel Siphon Theft",
            "Control Room Single-Operator Incapacitation / Fall"
        ]
    }
}

def generate_rules_dataset():
    all_rules = []
    rule_counter = 1

    # Base rule templates generator to expand into 1000+ granular, real-world operational variations
    for domain_key, domain_info in DOMAINS.items():
        domain_name = domain_info["name"]
        categories = domain_info["categories"]

        for cat_idx, category in enumerate(categories, 1):
            # Create 12 to 15 distinct, richly specified variations per category (8 * 10 * 13 = 1040+ rules)
            variations = [
                ("Standard Operational Rule", "Strict Real-Time Enforcement", "High", 30),
                ("After-Hours Enforcement", "Curfew & Off-Peak Schedule", "Critical", 10),
                ("Weekend / Holiday Variant", "Reduced Staffing Protocol", "Medium", 60),
                ("High-Density Peak Shift", "Congestion Surge Threshold", "High", 15),
                ("Zero-Tolerance Safety Protocol", "Immediate Multi-Channel Alarm", "Critical", 5),
                ("Auditing & Statutory Log Mode", "Periodic Forensic Evidence Packaging", "Low", 120),
                ("Zone-Specific Tripwire Trigger", "Directional Ingress/Egress Monitoring", "High", 20),
                ("Multi-Camera Cross-Correlation", "Spatial Proximity Across Adjacent Feeds", "Critical", 10),
                ("Dwell Time Loitering Threshold", "Exceeding Prescribed Temporal Quota", "Medium", 45),
                ("Equipment / Asset Proximity Check", "Relational Distance to Critical Asset", "High", 25),
                ("Environmental / Smoke Escalation", "Dual Sensor Optical & Thermal Match", "Critical", 5),
                ("Supervisory Discretion Trigger", "Silent Dispatch to Duty Officer", "Medium", 40),
                ("VIP / Escorted Access Exemption", "Whitelist Exemption with Biometric Verification", "Low", 60)
            ]

            for var_idx, (var_title, var_desc_suffix, severity, dwell) in enumerate(variations, 1):
                rule_id = f"RULE-{domain_key[:3].upper()}-{cat_idx:02d}-{var_idx:02d}"
                
                # Determine CV primitives based on domain and category
                cv_primitives = ["person"]
                if "Attendance" in category or "Face" in category or "Identity" in category:
                    cv_primitives = ["person", "face_recognition", "head_pose"]
                    dynamic_table = "compliance_attendance_records"
                    dashboard_type = "attendance_roster_matrix"
                    relational = "<student_or_faculty, enters_classroom, desk_zone>"
                elif "PPE" in category or "Scrub" in category or "Helmet" in category:
                    cv_primitives = ["person", "ppe_helmet", "ppe_vest", "ppe_gloves"]
                    dynamic_table = "compliance_ppe_violations"
                    dashboard_type = "ppe_occupational_monitor"
                    relational = "<worker, missing_gear, hard_hat_or_vest>"
                elif "Fire" in category or "Flame" in category or "Smoke" in category or "Thermal" in category:
                    cv_primitives = ["smoke_plume", "plasma_fire", "thermal_anomaly"]
                    dynamic_table = "compliance_hazard_incidents"
                    dashboard_type = "safety_hazard_heatmap"
                    relational = "<fire_source, expanding_in, operational_sector>"
                elif "Fall" in category or "Incapacitation" in category:
                    cv_primitives = ["person", "yolo_pose_keypoints", "ground_plane_alignment"]
                    dynamic_table = "compliance_medical_falls"
                    dashboard_type = "healthcare_fall_response_console"
                    relational = "<individual, lying_prone, floor_plane>"
                elif "Tailgating" in category or "Turnstile" in category or "Vaulting" in category:
                    cv_primitives = ["person", "tripwire_spatial", "centroid_tracker"]
                    dynamic_table = "compliance_access_violations"
                    dashboard_type = "access_tailgating_stream"
                    relational = "<person_2, closely_tailgates, person_1>"
                elif "Vehicle" in category or "Forklift" in category or "Speed" in category:
                    cv_primitives = ["vehicle", "forklift", "anpr_plate", "speed_vector"]
                    dynamic_table = "compliance_fleet_violations"
                    dashboard_type = "logistics_speed_geofence_console"
                    relational = "<vehicle, breaches_speed_or_zone, pedestrian_pathway>"
                elif "Perimeter" in category or "Fence" in category or "Intrusion" in category:
                    cv_primitives = ["person", "yolo_pose_climb", "raycast_polygon"]
                    dynamic_table = "compliance_perimeter_breaches"
                    dashboard_type = "perimeter_intrusion_tracker"
                    relational = "<intruder, scaling_barrier, secure_boundary>"
                elif "Hygiene" in category or "Sanitizer" in category:
                    cv_primitives = ["person", "hand_tracking", "dispenser_zone"]
                    dynamic_table = "compliance_hygiene_audits"
                    dashboard_type = "hygiene_compliance_matrix"
                    relational = "<healthcare_worker, operates, sanitizer_dispenser>"
                else:
                    cv_primitives = ["person", "object", "bounding_box_dwell"]
                    dynamic_table = "compliance_general_events"
                    dashboard_type = "general_compliance_overview"
                    relational = "<subject, loitering_in, monitored_zone>"

                # Dynamic Actions mapping
                actions = ["websocket_push", "audit_log_entry", "sha256_evidence_package"]
                if severity == "Critical":
                    actions.extend(["smtp_email_emergency_dispatch", "audible_siren_strobe", "sms_officer_alert"])
                elif severity == "High":
                    actions.extend(["smtp_email_summary", "toast_notification_soc"])
                else:
                    actions.extend(["periodic_digest_report"])

                title = f"{category}: {var_title}"
                nl_prompt = (
                    f"In {domain_name}, continuously monitor active RTSP streams for {category.lower()}. "
                    f"When {var_desc_suffix.lower()} condition is met with dwell time >= {dwell}s, "
                    f"evaluate relational triplet '{relational}', flag violation with {severity.upper()} severity, "
                    f"store structured forensic records in table '{dynamic_table}', execute actions {actions}, "
                    f"and render live metrics on the '{dashboard_type}' dashboard."
                )

                rule_obj = {
                    "rule_id": rule_id,
                    "index": rule_counter,
                    "domain": domain_key,
                    "domain_name": domain_name,
                    "category": category,
                    "title": title,
                    "description": f"{title} - {var_desc_suffix}. Enforces operational safety and compliance.",
                    "severity": severity,
                    "dwell_threshold_seconds": dwell,
                    "natural_language_prompt": nl_prompt,
                    "cv_primitives": cv_primitives,
                    "relational_triplet": relational,
                    "spatial_logic": "ray_casting_polygon_geofence",
                    "temporal_logic": "schedule_calendar_and_dwell_timer",
                    "actions": actions,
                    "dynamic_table": dynamic_table,
                    "dynamic_table_schema": {
                        "primary_key": "event_id TEXT PRIMARY KEY",
                        "columns": [
                            {"name": "timestamp", "type": "REAL", "desc": "Unix epoch event timestamp"},
                            {"name": "camera_id", "type": "TEXT", "desc": "Originating camera identifier"},
                            {"name": "camera_name", "type": "TEXT", "desc": "Descriptive camera location"},
                            {"name": "subject_id", "type": "TEXT", "desc": "Recognized person/entity identifier"},
                            {"name": "relational_triplet", "type": "TEXT", "desc": "RAM extracted relationship"},
                            {"name": "calibrated_confidence", "type": "REAL", "desc": "RLCD calibrated probability"},
                            {"name": "dwell_duration", "type": "REAL", "desc": "Observed duration in seconds"},
                            {"name": "keyframe_url", "type": "TEXT", "desc": "Highlighted evidence frame path"},
                            {"name": "clip_url", "type": "TEXT", "desc": "10s pre/post concatenated MP4 clip"},
                            {"name": "sha256_hash", "type": "TEXT", "desc": "Statutory cryptographically sealed hash"},
                            {"name": "action_dispatch_status", "type": "TEXT", "desc": "Status of automated consequences"}
                        ]
                    },
                    "recommended_dashboard": {
                        "dashboard_id": dashboard_type,
                        "title": f"{category} Operational Console",
                        "widgets": [
                            {"type": "kpi_card", "title": "Total Violations", "metric": "count(*)"},
                            {"type": "kpi_card", "title": "Avg Response Time", "metric": "avg(response_latency_ms)"},
                            {"type": "kpi_card", "title": "Compliance Rate", "metric": "percentage_compliant"},
                            {"type": "time_series", "title": "Incident Frequency Timeline", "x": "timestamp", "y": "count"},
                            {"type": "camera_grid", "title": "Active Polygonal RTSP Live Feeds"},
                            {"type": "incident_drawer", "title": "Forensic Inspection & Section 65B Export"}
                        ]
                    }
                }
                all_rules.append(rule_obj)
                rule_counter += 1

    return all_rules

if __name__ == "__main__":
    rules = generate_rules_dataset()
    output_path = Path(r"c:\Users\DC\Downloads\vigint\backend\storage\preset_rules_library.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"total_rules": len(rules), "domains": list(DOMAINS.keys()), "rules": rules}, f, indent=2)
    
    # Also write a root copy for easy accessibility
    root_path = Path(r"c:\Users\DC\Downloads\vigint\preset_rules_library.json")
    with open(root_path, "w", encoding="utf-8") as f:
        json.dump({"total_rules": len(rules), "domains": list(DOMAINS.keys()), "rules": rules}, f, indent=2)

    print(f"Successfully generated {len(rules)} categorized preset compliance rules across 8 domains.")

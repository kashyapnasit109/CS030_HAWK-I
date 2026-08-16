"""
Hawk-I ML Service — Event Builder

Normalization and factory layer that converts detector-specific raw JSON outputs
into canonical DetectionEvent and DetectionResult representations without
running model inference or altering core detection logic.
"""

from typing import Dict, Any, Optional, List
from models.detection_event import DetectionEvent, DetectionResult


class EventBuilder:
    """
    Constructs standardized DetectionResult and DetectionEvent objects
    from module-specific raw ML results.
    """

    @staticmethod
    def build_anpr_events(
        raw_result: Dict[str, Any],
        processing_metadata: Optional[Dict[str, Any]] = None,
        camera_id: Optional[int] = None,
    ) -> DetectionResult:
        events: List[DetectionEvent] = []
        is_detection = raw_result.get("detection") != "no_detection"

        if is_detection and "plate_text" in raw_result:
            plate_text = raw_result["plate_text"]
            confidence = float(raw_result.get("confidence", 0.9))
            bbox = raw_result.get("bounding_box")
            vehicle_class = raw_result.get("vehicle_class", "car")
            registry_match = raw_result.get("registry_match", False)

            severity = "info" if registry_match else "warning"
            desc = (
                f"License plate {plate_text} recognized on {vehicle_class}. "
                f"Registry status: {'Registered' if registry_match else 'Unregistered'}."
            )

            event = DetectionEvent(
                camera_id=camera_id,
                source_module="anpr",
                event_type="plate_recognized",
                module="vehicle",
                object_type=vehicle_class,
                confidence=min(1.0, max(0.0, confidence)),
                bounding_box=bbox,
                severity=severity,
                metadata={
                    "plate_text": plate_text,
                    "registry_match": registry_match,
                    "method": raw_result.get("method", "anpr"),
                    "matched_vehicle": raw_result.get("matched_vehicle"),
                },
                description=desc,
            )
            events.append(event)

        return DetectionResult(
            events=events,
            source_module="anpr",
            processing_metadata=processing_metadata or {},
            raw_result=raw_result,
        )

    @staticmethod
    def build_velocity_events(
        raw_result: Dict[str, Any],
        processing_metadata: Optional[Dict[str, Any]] = None,
        speed_threshold_kmh: float = 10.0,
        camera_id: Optional[int] = None,
    ) -> DetectionResult:
        events: List[DetectionEvent] = []
        tracked_objects = raw_result.get("tracked_objects", [])

        for obj in tracked_objects:
            obj_id = obj.get("object_id")
            obj_type = obj.get("object_type", "vehicle")
            max_speed = float(obj.get("max_speed_kmh", 0.0))
            avg_speed = float(obj.get("avg_speed_kmh", 0.0))
            path_points = obj.get("path_points", [])

            is_violation = max_speed > speed_threshold_kmh
            event_type = "speed_violation" if is_violation else "motion_tracked"
            
            if max_speed > speed_threshold_kmh * 1.5:
                severity = "danger"
            elif is_violation:
                severity = "warning"
            else:
                severity = "info"

            desc = (
                f"{obj_type.capitalize()} (ID #{obj_id}) tracked moving at peak speed {max_speed:.1f} km/h "
                f"(average {avg_speed:.1f} km/h, threshold: {speed_threshold_kmh:.1f} km/h)."
            )

            # Use first path point as bounding/point reference
            bbox = None
            if path_points:
                bbox = {"x": path_points[0].get("x", 0), "y": path_points[0].get("y", 0), "w": 0, "h": 0}

            event = DetectionEvent(
                camera_id=camera_id,
                source_module="velocity",
                event_type=event_type,
                module="vehicle" if obj_type != "person" else "loitering",
                object_type=obj_type,
                confidence=0.95,
                bounding_box=bbox,
                severity=severity,
                metadata={
                    "object_id": obj_id,
                    "max_speed_kmh": max_speed,
                    "avg_speed_kmh": avg_speed,
                    "speed_threshold_kmh": speed_threshold_kmh,
                    "path_points": path_points,
                    "calibration_used": raw_result.get("calibration_used", {}),
                },
                description=desc,
            )
            events.append(event)

        return DetectionResult(
            events=events,
            source_module="velocity",
            processing_metadata=processing_metadata or {},
            raw_result=raw_result,
        )

    @staticmethod
    def build_misplacement_events(
        raw_result: Dict[str, Any],
        processing_metadata: Optional[Dict[str, Any]] = None,
        camera_id: Optional[int] = None,
    ) -> DetectionResult:
        events: List[DetectionEvent] = []
        differences = raw_result.get("differences", [])

        for diff in differences:
            change_type = diff.get("change_type", "new_object")  # "new_object" | "missing_object"
            obj_type = diff.get("object_type", "object")
            confidence = float(diff.get("confidence", 0.75))
            bbox = diff.get("bounding_box")

            severity = "danger" if change_type == "missing_object" else "warning"
            action_desc = "was removed or went missing from the scene" if change_type == "missing_object" else "was deposited or placed in the scene"
            desc = f"Object misplacement: A {obj_type} {action_desc}."

            event = DetectionEvent(
                camera_id=camera_id,
                source_module="misplacement",
                event_type=f"object_{change_type}",
                module="object",
                object_type=obj_type,
                confidence=min(1.0, max(0.0, confidence)),
                bounding_box=bbox,
                severity=severity,
                metadata={
                    "change_type": change_type,
                    "reference_dimensions": raw_result.get("reference_dimensions", {}),
                },
                description=desc,
            )
            events.append(event)

        return DetectionResult(
            events=events,
            source_module="misplacement",
            processing_metadata=processing_metadata or {},
            raw_result=raw_result,
        )

    @staticmethod
    def build_threat_events(
        raw_result: Dict[str, Any],
        processing_metadata: Optional[Dict[str, Any]] = None,
        camera_id: Optional[int] = None,
    ) -> DetectionResult:
        events: List[DetectionEvent] = []
        anomalies = raw_result.get("anomalies", [])

        for anomaly in anomalies:
            obj_id = anomaly.get("object_id")
            obj_type = anomaly.get("object_type", "person")
            rules = anomaly.get("triggered_rules", [])
            anomaly_score = float(anomaly.get("anomaly_score", 0.8))
            explanation = anomaly.get("explanation", "Threat behavior detected.")

            severity = "danger" if len(rules) >= 2 or anomaly_score > 0.7 else "warning"
            desc = f"Threat anomaly: {obj_type.capitalize()} (ID #{obj_id}) triggered rules [{', '.join(rules)}]. {explanation}"

            event = DetectionEvent(
                camera_id=camera_id,
                source_module="threat",
                event_type="threat_detected",
                module="loitering" if "loitering" in rules else "intrusion",
                object_type=obj_type,
                confidence=min(1.0, max(0.0, anomaly_score)),
                severity=severity,
                metadata={
                    "object_id": obj_id,
                    "triggered_rules": rules,
                    "anomaly_score": anomaly_score,
                    "explanation": explanation,
                },
                description=desc,
            )
            events.append(event)

        return DetectionResult(
            events=events,
            source_module="threat",
            processing_metadata=processing_metadata or {},
            raw_result=raw_result,
        )

    @staticmethod
    def build_entry_events(
        raw_result: Dict[str, Any],
        processing_metadata: Optional[Dict[str, Any]] = None,
        camera_id: Optional[int] = None,
    ) -> DetectionResult:
        events: List[DetectionEvent] = []
        flagged = raw_result.get("flagged_entries", [])

        for flag in flagged:
            confidence = float(flag.get("confidence", 0.9))
            rel_time = flag.get("relative_time_sec")
            abs_time = flag.get("interior_timestamp")
            explanation = flag.get("explanation", "Unauthorized presence detected in interior zone.")

            desc = f"Unauthorized entry flagged: {explanation}"

            event = DetectionEvent(
                camera_id=camera_id,
                source_module="entry",
                event_type="unauthorized_entry",
                module="intrusion",
                object_type="person",
                confidence=min(1.0, max(0.0, confidence)),
                timestamp_sec=rel_time,
                detected_at=abs_time,
                severity="danger",
                metadata={
                    "interior_timestamp": abs_time,
                    "relative_time_sec": rel_time,
                    "explanation": explanation,
                    "disclaimer": raw_result.get("disclaimer", ""),
                },
                description=desc,
            )
            events.append(event)

        return DetectionResult(
            events=events,
            source_module="entry",
            processing_metadata=processing_metadata or {},
            raw_result=raw_result,
        )

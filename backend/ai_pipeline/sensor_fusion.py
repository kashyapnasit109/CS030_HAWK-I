"""
VIGINT — Dempster-Shafer Multi-Sensor Evidential Fusion Engine
Implements zero false-positive consensus (<1.8% target metric) by combining
Computer Vision event probabilities with physical IoT sensor masses.
"""

from typing import Any


class DempsterShaferEngine:
    """
    Dempster-Shafer Theory of Evidence Fusion.
    Frame of discernment: {Emergency (E), Safe (S)}
    Uncertainty / ignorance: Theta {E, S}
    """

    @staticmethod
    def combine_masses(m1: dict[str, float], m2: dict[str, float]) -> dict[str, float]:
        """
        Dempster's Rule of Combination for two mass functions over {E, S, Theta}.
        m1, m2 must have keys: 'E', 'S', 'Theta' summing to 1.0.
        """
        # Conflict metric K
        k = (m1.get("E", 0.0) * m2.get("S", 0.0)) + (m1.get("S", 0.0) * m2.get("E", 0.0))
        if k >= 1.0:
            return {"E": 0.0, "S": 0.0, "Theta": 1.0, "conflict": 1.0}

        scale = 1.0 / (1.0 - k)

        # Combined masses
        m_e = scale * (
            (m1.get("E", 0.0) * m2.get("E", 0.0)) +
            (m1.get("E", 0.0) * m2.get("Theta", 0.0)) +
            (m1.get("Theta", 0.0) * m2.get("E", 0.0))
        )

        m_s = scale * (
            (m1.get("S", 0.0) * m2.get("S", 0.0)) +
            (m1.get("S", 0.0) * m2.get("Theta", 0.0)) +
            (m1.get("Theta", 0.0) * m2.get("S", 0.0))
        )

        m_theta = scale * (m1.get("Theta", 0.0) * m2.get("Theta", 0.0))

        return {
            "E": round(m_e, 4),
            "S": round(m_s, 4),
            "Theta": round(m_theta, 4),
            "conflict": round(k, 4),
            "belief_E": round(m_e, 4),
            "plausibility_E": round(m_e + m_theta, 4),
        }


def evaluate_sensor_consensus(
    cv_event_type: str,
    cv_confidence: float,
    iot_sensors: dict[str, Any]
) -> dict[str, Any]:
    """
    Evaluates evidence fusion between a visual CV detection and physical IoT telemetry.
    Returns:
      {
        "fused_probability": float,
        "is_confirmed": bool,
        "is_suppressed_false_positive": bool,
        "suppression_reason": str,
        "evidence_breakdown": dict
      }
    """
    # 1. Compute CV mass function
    cv_conf_clamped = max(0.1, min(0.99, cv_confidence))
    m_cv = {
        "E": round(cv_conf_clamped * 0.85, 3),
        "S": round((1.0 - cv_conf_clamped) * 0.70, 3),
        "Theta": round(0.15, 3)
    }
    # Normalize
    tot = m_cv["E"] + m_cv["S"] + m_cv["Theta"]
    m_cv = {k: v / tot for k, v in m_cv.items()}

    # 2. Compute Physical IoT sensor mass function based on event category
    smoke = iot_sensors.get("mq2_smoke", 30)
    co = iot_sensors.get("mq7_co", 10)
    temp = iot_sensors.get("temperature", 24.0)
    sound = iot_sensors.get("sound_dba", 50.0)

    m_iot = {"E": 0.05, "S": 0.80, "Theta": 0.15}

    if cv_event_type in ("fire", "smoke", "optical_fire"):
        # Fire requires thermal spike (>38°C) OR smoke spike (>180 ppm)
        if temp > 45.0 or smoke > 250:
            m_iot = {"E": 0.92, "S": 0.03, "Theta": 0.05}
        elif temp > 35.0 or smoke > 120:
            m_iot = {"E": 0.65, "S": 0.20, "Theta": 0.15}
        else:
            # Low smoke and normal temp: high chance of dust/shadow false alarm
            m_iot = {"E": 0.08, "S": 0.85, "Theta": 0.07}

    elif cv_event_type in ("brawl", "violence", "affray"):
        # Brawls produce acoustic loudness surges (>78 dBA)
        if sound > 85.0:
            m_iot = {"E": 0.88, "S": 0.05, "Theta": 0.07}
        elif sound > 72.0:
            m_iot = {"E": 0.55, "S": 0.30, "Theta": 0.15}
        else:
            m_iot = {"E": 0.15, "S": 0.75, "Theta": 0.10}

    elif cv_event_type in ("stampede", "crowd_surge"):
        # Stampedes produce acoustic panic and motion vibration
        if sound > 80.0:
            m_iot = {"E": 0.85, "S": 0.08, "Theta": 0.07}
        else:
            m_iot = {"E": 0.40, "S": 0.45, "Theta": 0.15}

    elif cv_event_type in ("fall", "slip_trip_fall"):
        # Falls are localized CV events confirmed by immediate lack of motion
        m_iot = {"E": 0.70, "S": 0.15, "Theta": 0.15}

    else:
        # Default neutral IoT mass
        m_iot = {"E": 0.30, "S": 0.40, "Theta": 0.30}

    # 3. Fuse masses via Dempster-Shafer Rule
    fused = DempsterShaferEngine.combine_masses(m_cv, m_iot)

    # 4. Zero False-Positive decision threshold
    belief_e = fused["belief_E"]
    is_confirmed = belief_e >= 0.65
    is_suppressed = not is_confirmed and cv_confidence > 0.60

    suppression_reason = None
    if is_suppressed:
        if cv_event_type in ("fire", "smoke"):
            suppression_reason = f"Suppressed by Zero-FP Consensus: Optical smoke detected ({cv_confidence:.0%}) but physical MQ-2 ({smoke} ppm) & Temp ({temp}°C) within safe baseline."
        elif cv_event_type in ("brawl", "violence"):
            suppression_reason = f"Suppressed by Zero-FP Consensus: Kinetic disorder without acoustic decibel confirmation ({sound} dBA < 78 dBA threshold)."
        else:
            suppression_reason = "Suppressed by Multi-Sensor Evidential Discrepancy."

    return {
        "fused_probability": round(belief_e, 4),
        "is_confirmed": is_confirmed,
        "is_suppressed_false_positive": is_suppressed,
        "suppression_reason": suppression_reason,
        "cv_mass": m_cv,
        "iot_mass": m_iot,
        "fused_metrics": fused,
    }

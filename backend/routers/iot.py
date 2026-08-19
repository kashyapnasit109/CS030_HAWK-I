"""
VIGINT — IoT Multi-Sensor Telemetry & Consensus API Router
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from ai_pipeline.iot_manager import (
    get_all_telemetry,
    get_node_telemetry,
    trigger_sensor_anomaly,
    clear_sensor_anomaly,
)
from ai_pipeline.sensor_fusion import evaluate_sensor_consensus

router = APIRouter(prefix="/api/iot", tags=["IoT & Sensor Grid"])


class AnomalyTriggerRequest(BaseModel):
    node_id: str
    overrides: dict[str, Any] = Field(..., description="Sensor values to override (e.g. {'mq2_smoke': 420, 'temperature': 52})")


class ConsensusEvaluationRequest(BaseModel):
    cv_event_type: str
    cv_confidence: float = Field(0.85, ge=0.0, le=1.0)
    node_id: str


@router.get("/telemetry")
def list_telemetry():
    """Get real-time telemetry stream from all campus IoT sensor nodes."""
    nodes = get_all_telemetry()
    return {"success": True, "count": len(nodes), "nodes": nodes}


@router.get("/telemetry/{node_id}")
def get_node(node_id: str):
    """Get telemetry details for a specific sensor node."""
    node = get_node_telemetry(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Sensor node '{node_id}' not found")
    return {"success": True, "node": node}


@router.post("/trigger-anomaly")
def trigger_anomaly(req: AnomalyTriggerRequest):
    """Simulate an emergency environmental anomaly on a campus sensor node."""
    trigger_sensor_anomaly(req.node_id, req.overrides)
    return {"success": True, "message": f"Anomaly simulated on {req.node_id}", "overrides": req.overrides}


@router.post("/clear-anomaly/{node_id}")
def clear_anomaly(node_id: str):
    """Clear simulated anomaly on a sensor node and restore normal baseline."""
    clear_sensor_anomaly(node_id)
    return {"success": True, "message": f"Normal baseline restored on {node_id}"}


@router.post("/evaluate-consensus")
def evaluate_consensus(req: ConsensusEvaluationRequest):
    """
    Run Dempster-Shafer Multi-Sensor Evidential Fusion between
    a computer vision event and physical IoT node telemetry.
    """
    node = get_node_telemetry(req.node_id)
    sensors = node["sensors"] if node else {}
    result = evaluate_sensor_consensus(req.cv_event_type, req.cv_confidence, sensors)
    return {"success": True, "node_id": req.node_id, **result}

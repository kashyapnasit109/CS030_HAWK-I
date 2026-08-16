"""
Hawk-I ML Service — Canonical Detection Event Models

Standardized event models connecting computer vision outputs with
database persistence, alert severity evaluation, and semantic search.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class DetectionEvent(BaseModel):
    """
    Canonical detection event representation for the Hawk-I platform.
    Used across all computer vision modules.
    """
    event_id: Optional[int] = None
    camera_id: Optional[int] = None
    source_module: str = Field(..., description="Originating module: anpr, velocity, misplacement, threat, entry")
    event_type: str = Field(..., description="Granular event type: plate_recognized, speed_violation, object_misplaced, etc.")
    module: Optional[str] = Field(None, description="Database ENUM mapping: vehicle, object, loitering, intrusion, etc.")
    object_type: str = Field("unknown", description="Detected entity: car, person, backpack, etc.")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Detection confidence score [0.0 - 1.0]")
    bounding_box: Optional[Dict[str, Any]] = Field(None, description="Bounding box coords {x, y, w, h}")
    timestamp_sec: Optional[float] = Field(None, description="Relative timestamp inside video clip in seconds")
    detected_at: Optional[str] = Field(None, description="ISO-8601 absolute timestamp string")
    severity: Optional[str] = Field(None, description="Alert severity: info, warning, danger")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Module-specific structured payload")
    description: Optional[str] = Field(None, description="Human-readable natural language summary")


class DetectionResult(BaseModel):
    """
    Standardized container returned by all detection and ingestion pipelines.
    Preserves raw detector outputs for backward compatibility.
    """
    events: List[DetectionEvent] = Field(default_factory=list)
    source_module: str
    processing_metadata: Dict[str, Any] = Field(default_factory=dict)
    raw_result: Dict[str, Any] = Field(default_factory=dict)

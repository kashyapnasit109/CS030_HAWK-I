"""
Active Learning and Human-in-the-Loop Feedback API Router.
Enables operators to rate detections (Good / Bad), submit identity corrections,
view suggestion activity history in Settings, and dynamically calibrate Face Re-ID.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ai_pipeline.active_learning import (
    submit_feedback,
    list_feedback,
    update_feedback,
    delete_feedback,
    clear_all_feedback,
    get_feedback_stats,
    load_feedback_cache,
    invalidate_feedback_cache,
)

router = APIRouter(prefix="/api/feedback", tags=["Active Learning & Model Feedback"])


class FeedbackSubmitRequest(BaseModel):
    reference_label: str
    predicted_label: str
    rating: str = Field(..., description="'good' for true positive, 'bad' for false positive")
    job_id: Optional[str] = None
    search_type: str = "face_recognition"
    correction_label: Optional[str] = None
    frame_url: Optional[str] = None
    frame_hash: Optional[str] = None
    camera_id: Optional[str] = None
    timestamp_val: Optional[float] = None
    timestamp_str: Optional[str] = None
    box: Optional[Dict[str, Any]] = None
    embedding: Optional[List[float]] = None
    notes: Optional[str] = None


class FeedbackUpdateRequest(BaseModel):
    rating: Optional[str] = None
    correction_label: Optional[str] = None
    notes: Optional[str] = None


@router.post("/submit")
def submit_model_feedback(payload: FeedbackSubmitRequest):
    """
    Submit human feedback / rating for an AI detection match.
    Automatically extracts and indexes 512-D neural embeddings into positive
    exemplars or hard negative rejection banks.
    """
    try:
        res = submit_feedback(
            reference_label=payload.reference_label,
            predicted_label=payload.predicted_label,
            rating=payload.rating,
            job_id=payload.job_id,
            search_type=payload.search_type,
            correction_label=payload.correction_label,
            frame_url=payload.frame_url,
            frame_hash=payload.frame_hash,
            camera_id=payload.camera_id,
            timestamp_val=payload.timestamp_val,
            timestamp_str=payload.timestamp_str,
            box=payload.box,
            embedding=payload.embedding,
            notes=payload.notes,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record model feedback: {str(e)}")


@router.get("/list")
def get_feedback_list(
    search_type: Optional[str] = Query("all"),
    rating: Optional[str] = Query("all"),
    reference_label: Optional[str] = Query("all"),
    query: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Retrieve all historical suggestions, ratings, and corrections.
    """
    try:
        return list_feedback(
            search_type=search_type,
            rating=rating,
            reference_label=reference_label,
            query=query,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query feedback records: {str(e)}")


@router.get("/stats")
def get_active_learning_stats():
    """
    Retrieve active learning telemetry: total human ratings, hard negative rules,
    positive prototype anchors, and estimated model accuracy gain percentage.
    """
    try:
        return get_feedback_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load telemetry stats: {str(e)}")


@router.put("/{feedback_id}")
def update_model_feedback(feedback_id: int, payload: FeedbackUpdateRequest):
    """
    Edit an existing feedback entry (e.g. switch rating, change corrected label, update notes).
    """
    try:
        res = update_feedback(
            feedback_id=feedback_id,
            rating=payload.rating,
            correction_label=payload.correction_label,
            notes=payload.notes,
        )
        if not res.get("success"):
            raise HTTPException(status_code=404, detail=res.get("error", "Feedback not found"))
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update feedback: {str(e)}")


@router.delete("/{feedback_id}")
def delete_model_feedback(feedback_id: int):
    """
    Delete a specific feedback rule from the active learning manifold.
    """
    try:
        res = delete_feedback(feedback_id=feedback_id)
        if not res.get("success"):
            raise HTTPException(status_code=404, detail=res.get("error", "Feedback not found"))
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete feedback: {str(e)}")


@router.post("/clear")
def clear_feedback_history(reference_label: Optional[str] = Query(None)):
    """
    Clear all feedback entries or entries for a specific suspect/target.
    """
    try:
        return clear_all_feedback(reference_label=reference_label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear feedback history: {str(e)}")


@router.post("/recalibrate")
def recalibrate_active_learning():
    """
    Force reload and rebuild of all active learning embedding tensors in memory.
    """
    try:
        invalidate_feedback_cache()
        load_feedback_cache()
        stats = get_feedback_stats()
        return {
            "success": True,
            "message": "Active Learning engine successfully recalibrated with all human exemplars.",
            "stats": stats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recalibrate model: {str(e)}")

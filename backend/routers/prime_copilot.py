"""
Prime Agent & Continual Cognitive Engine API Router
===================================================

Exposes RESTful endpoints for:
  - Recursive Language Model (RLM) Multi-Camera Forensic Investigation
  - Continual Harness H = (ρ, G, K, M) Management and /refine loop
  - Autonomous Goal Execution & Verifiable Gating (--autonomous)
  - Prime Intellect Gateway Presets & Training Benchmarks
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field

from ai_pipeline.continual_harness import continual_harness
from ai_pipeline.rlm_investigator import rlm_investigator
from ai_pipeline.autonomous_verifier import autonomous_engine
from ai_gateway import GATEWAY_PRESETS, public_config, save_config

router = APIRouter(prefix="/api/prime", tags=["Prime Agent & Continual Harness"])


# --- Pydantic Schemas ---
class InvestigationRequest(BaseModel):
    query: str = Field(..., description="Target search query description")
    reference_label: Optional[str] = None
    camera_ids: Optional[List[str]] = None
    min_confidence: float = Field(0.50, ge=0.0, le=1.0)


class PromptNoteCreate(BaseModel):
    camera_id: str = "ALL"
    rule: str = Field(..., description="Operational directive or environmental note")
    category: str = "general"


class MemoryCreate(BaseModel):
    topic: str = Field(..., description="Topic or incident category")
    insight: str = Field(..., description="Lesson learned or mitigation rule")
    source_incident_id: Optional[str] = None


class SkillCreate(BaseModel):
    name: str
    description: str
    code: str


class RefineRequest(BaseModel):
    trigger: str
    reference_label: str
    predicted_label: str
    rating: str
    notes: Optional[str] = None
    camera_id: Optional[str] = None
    correction_label: Optional[str] = None


class AutonomousGoalRequest(BaseModel):
    goal_description: str
    target_reference: Optional[str] = None
    camera_ids: Optional[List[str]] = None
    max_turns: int = Field(8, ge=1, le=25)


# ─────────────────────────────────────────────────────────────────────────────
# 1. RLM Multi-Camera Forensic Investigation
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/investigate")
async def run_rlm_investigation(payload: InvestigationRequest):
    """
    Executes a parallel fan-out multi-agent investigation across the camera grid
    using the Recursive Language Model (RLM) paradigm.
    """
    try:
        res = await rlm_investigator.execute_investigation(
            query=payload.query,
            reference_label=payload.reference_label,
            camera_ids=payload.camera_ids,
            min_confidence=payload.min_confidence
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(e)}")


@router.get("/investigations")
def list_past_investigations(limit: int = Query(25, ge=1, le=100)):
    """Retrieve history of completed RLM investigations."""
    return rlm_investigator.list_investigations(limit=limit)


@router.get("/investigations/{inv_id}")
def get_investigation_details(inv_id: str):
    inv = rlm_investigator.get_investigation(inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv


# ─────────────────────────────────────────────────────────────────────────────
# 2. Continual Harness H = (ρ, G, K, M) Management & CRUD
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/harness")
def get_harness_state():
    """Retrieve current state of H = (ρ, G, K, M) and rendered system prompt."""
    continual_harness.load()
    return {
        "state": continual_harness.state,
        "rendered_system_prompt": continual_harness.build_system_prompt_context(),
        "stats": {
            "prompt_rules_count": len(continual_harness.state.get("prompts", [])),
            "subagents_count": len(continual_harness.state.get("subagents", [])),
            "skills_count": len(continual_harness.state.get("skills", {})),
            "memories_count": len(continual_harness.state.get("memory", [])),
            "refinement_events_count": len(continual_harness.refinement_history)
        }
    }


@router.post("/harness/prompt")
def create_harness_prompt_rule(payload: PromptNoteCreate):
    """Add a new camera-specific operational rule (ρ)."""
    return continual_harness.create_prompt_note(
        camera_id=payload.camera_id,
        rule=payload.rule,
        category=payload.category
    )


@router.delete("/harness/prompt/{rule_id}")
def delete_harness_prompt_rule(rule_id: str):
    """Delete a prompt directive."""
    ok = continual_harness.delete_prompt_note(rule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Rule ID not found")
    return {"status": "deleted", "id": rule_id}


@router.post("/harness/memory")
def create_harness_memory_entry(payload: MemoryCreate):
    """Create a persistent lesson learned / false alarm mitigation memory (M)."""
    return continual_harness.create_memory(
        topic=payload.topic,
        insight=payload.insight,
        source_incident_id=payload.source_incident_id
    )


@router.delete("/harness/memory/{memory_id}")
def delete_harness_memory_entry(memory_id: str):
    """Delete a memory item."""
    ok = continual_harness.delete_memory(memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory ID not found")
    return {"status": "deleted", "id": memory_id}


@router.post("/harness/skill")
def create_harness_skill_entry(payload: SkillCreate):
    """Author a Python-backed analytical skill (K)."""
    return continual_harness.create_skill(
        name=payload.name,
        code=payload.code,
        description=payload.description
    )


@router.delete("/harness/skill/{skill_name}")
def delete_harness_skill_entry(skill_name: str):
    """Delete a skill."""
    ok = continual_harness.delete_skill(skill_name)
    if not ok:
        raise HTTPException(status_code=404, detail="Skill name not found")
    return {"status": "deleted", "name": skill_name}


@router.post("/harness/refine")
async def trigger_harness_refine(payload: RefineRequest):
    """
    Directly trigger the /refine pipeline to optimize the harness
    based on an observation or incident review.
    """
    res = await continual_harness.refine_from_operator_feedback(
        reference_label=payload.reference_label,
        predicted_label=payload.predicted_label,
        rating=payload.rating,
        notes=payload.notes,
        camera_id=payload.camera_id,
        correction_label=payload.correction_label
    )
    return res


@router.get("/harness/refinements")
def get_refinement_history():
    """Retrieve immutable log of all /refine modifications."""
    continual_harness.load()
    return continual_harness.refinement_history


# ─────────────────────────────────────────────────────────────────────────────
# 3. Autonomous Investigation Engine (--autonomous)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/autonomous/start")
async def start_autonomous_investigation(payload: AutonomousGoalRequest):
    """
    Starts an autonomous goal-directed investigation session with
    iterative verification gates.
    """
    try:
        job = await autonomous_engine.run_autonomous_goal(
            goal_description=payload.goal_description,
            target_reference=payload.target_reference,
            camera_ids=payload.camera_ids,
            max_turns=payload.max_turns
        )
        return job
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Autonomous solver error: {str(e)}")


@router.get("/autonomous/jobs")
def list_autonomous_jobs():
    """List all autonomous goal sessions."""
    return autonomous_engine.list_jobs()


@router.get("/autonomous/jobs/{job_id}")
def get_autonomous_job(job_id: str):
    job = autonomous_engine.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ─────────────────────────────────────────────────────────────────────────────
# 4. Presets & Gateway Helpers
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/presets")
def get_ai_presets():
    """Return all available AI Gateway presets including Prime Intellect."""
    return {
        "presets": GATEWAY_PRESETS,
        "current_config": public_config()
    }

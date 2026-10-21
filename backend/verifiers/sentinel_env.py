"""
Prime Intellect Verifiers v1 Environment: SentinelVision Forensic Environment
=============================================================================

Defines the dataset, tool interfaces, and reward rubrics for post-training
vision-language models on multi-camera CCTV spatial-temporal reasoning via GRPO / Prime-RL.

Compatible with:
  - Prime Intellect Hosted Training (`prime train run`)
  - Standalone evaluation (`prime eval run`)
  - Local `prime-rl` orchestration
"""

from typing import Any, Dict, List, Optional
import json
import math

try:
    import verifiers as vf
except ImportError:
    # Graceful stub if running in an environment without verifiers installed locally
    class vf:
        class Environment: pass
        class ToolEnv(Environment):
            def __init__(self, dataset, tools, rubric, max_turns=5):
                self.dataset = dataset
                self.tools = tools
                self.rubric = rubric
                self.max_turns = max_turns
        class Rubric:
            def __init__(self, funcs, weights=None):
                self.funcs = funcs
                self.weights = weights or [1.0] * len(funcs)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Environment Tools (Stateless & Idempotent)
# ─────────────────────────────────────────────────────────────────────────────

async def query_camera_detections(camera_id: str, start_time_sec: float, end_time_sec: float) -> str:
    """
    Retrieve detection logs and object bounding boxes for a specific camera in a time range.

    Args:
        camera_id: Identifier of the camera (e.g. 'CAM-01', 'CAM-02')
        start_time_sec: Start offset in seconds (e.g. 100.0)
        end_time_sec: End offset in seconds (e.g. 400.0)
    """
    return json.dumps({
        "camera_id": camera_id,
        "window": [start_time_sec, end_time_sec],
        "detections": [
            {"label": "person", "timestamp": start_time_sec + 15.0, "confidence": 0.91, "box": [100, 150, 240, 400]},
            {"label": "backpack", "timestamp": start_time_sec + 15.0, "confidence": 0.88, "box": [130, 180, 180, 250]}
        ]
    })


async def compute_reid_similarity(embedding_a_id: str, embedding_b_id: str) -> str:
    """
    Compute cosine similarity between two neural face or body embeddings.

    Args:
        embedding_a_id: ID or reference name of the suspect exemplar
        embedding_b_id: ID of the candidate detection crop
    """
    # Deterministic similarity scoring for evaluation
    return json.dumps({
        "exemplar": embedding_a_id,
        "candidate": embedding_b_id,
        "cosine_similarity": 0.89,
        "verdict": "MATCH_CONFIRMED"
    })


async def verify_spatial_path(camera_sequence: List[str], timestamps: List[float]) -> str:
    """
    Check if a sequence of camera sightings represents a physically plausible human trajectory.

    Args:
        camera_sequence: List of camera IDs in chronological order (e.g. ['CAM-01', 'CAM-02', 'CAM-03'])
        timestamps: Chronological timestamps in seconds corresponding to each camera sighting
    """
    if len(camera_sequence) != len(timestamps):
        return json.dumps({"valid": False, "error": "Length mismatch between cameras and timestamps"})

    for i in range(len(timestamps) - 1):
        if timestamps[i] >= timestamps[i+1]:
            return json.dumps({"valid": False, "reason": "Causality violation: timestamp did not advance"})

    return json.dumps({
        "valid": True,
        "route_length": len(camera_sequence),
        "physical_velocity_m_per_s": 1.35,
        "status": "PLAUSIBLE"
    })


# ─────────────────────────────────────────────────────────────────────────────
# 2. Reward Rubric Scoring Functions
# ─────────────────────────────────────────────────────────────────────────────

async def trajectory_accuracy_reward(completion: List[Dict[str, str]], ground_truth_route: str) -> float:
    """Scores whether the model successfully reconstructed the ground-truth path."""
    if not completion:
        return 0.0
    final_turn = completion[-1].get("content", "")
    # Check if ground truth camera sequence appears in output
    if ground_truth_route.lower() in final_turn.lower():
        return 1.0
    # Partial credit for identifying individual cameras
    cams = [c.strip() for c in ground_truth_route.split("->")]
    found = sum(1 for c in cams if c.lower() in final_turn.lower())
    return (found / max(len(cams), 1)) * 0.7


async def tool_efficiency_reward(completion: List[Dict[str, str]], max_allowed_calls: int = 4) -> float:
    """Encourages concise, efficient tool calling without redundant queries."""
    tool_calls_count = 0
    for msg in completion:
        if msg.get("role") == "assistant" and "tool_calls" in msg:
            tool_calls_count += len(msg["tool_calls"])
    if tool_calls_count == 0:
        return 0.0
    if tool_calls_count <= max_allowed_calls:
        return 1.0
    # Penalty for excessive calls
    return max(0.0, 1.0 - (tool_calls_count - max_allowed_calls) * 0.2)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Environment Loader Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def load_environment(split: str = "train") -> Any:
    """
    Entry point called by Prime Intellect Hosted Training or `prime-rl`.
    """
    # Sample synthetic CCTV evaluation dataset
    dataset = [
        {
            "prompt": "Investigate sightings of suspect wearing a red hoodie from 10:00 to 10:30 across cameras CAM-01, CAM-02, and CAM-03. Reconstruct their exact movement route.",
            "ground_truth_route": "CAM-01 -> CAM-02 -> CAM-03",
            "max_allowed_calls": 4
        },
        {
            "prompt": "Verify if the person detected at CAM-04 at 14:15 is the same individual sighted at CAM-01 at 14:02.",
            "ground_truth_route": "CAM-01 -> CAM-04",
            "max_allowed_calls": 3
        }
    ]

    rubric = vf.Rubric(
        funcs=[trajectory_accuracy_reward, tool_efficiency_reward],
        weights=[0.75, 0.25]
    )

    return vf.ToolEnv(
        dataset=dataset,
        tools=[query_camera_detections, compute_reid_similarity, verify_spatial_path],
        rubric=rubric,
        max_turns=6
    )

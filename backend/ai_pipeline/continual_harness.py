"""
Continual Surveillance Harness: H = (ρ, G, K, M)
=================================================

Implements Prime Agent's Continual Harness abstraction tailored for real-time
video surveillance and forensic operations.

Formal definition:
  H = (ρ, G, K, M)
    ρ (rho):   Prompt Directives & Camera-specific Operational Rules
    G (gamma): Subagent Configurations & Topologies
    K (kappa): Executable Python Analytical Skills
    M (mu):    Persistent Operational Memory & False Alarm Mitigation Precedents

Includes the /refine loop for zero-restart online updates from operator feedback.
"""

from __future__ import annotations

import json
import os
import time
import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"
HARNESS_STATE_FILE = STORAGE_DIR / "harness_state.json"
REFINEMENT_LOG_FILE = STORAGE_DIR / "refinement_history.json"


class ContinualSurveillanceHarness:
    """
    Manages the persistent harness state H = (ρ, G, K, M) and provides
    a uniform CRUD interface along with the /refine pipeline.
    """

    def __init__(self, state_file: Path = HARNESS_STATE_FILE):
        self.state_file = state_file
        self.state: Dict[str, Any] = {
            "prompts": [],     # ρ: Operational directives & camera rules
            "subagents": [],   # G: Specialized subagent configurations
            "skills": {},      # K: Python-backed analytical functions
            "memory": []       # M: Lessons learned & resolved edge cases
        }
        self.refinement_history: List[Dict[str, Any]] = []
        self._init_defaults_if_empty()
        self.load()

    def _init_defaults_if_empty(self):
        """Seed default baseline directives, subagents, and skills if new."""
        if not self.state_file.exists():
            self.state = {
                "prompts": [
                    {
                        "id": "rule_1",
                        "camera_id": "ALL",
                        "rule": "Prioritize high-confidence face matches (>0.85) when tracking suspect across perimeter gates.",
                        "category": "perimeter",
                        "created_at": datetime.utcnow().isoformat()
                    },
                    {
                        "id": "rule_2",
                        "camera_id": "CAM-04",
                        "rule": "Camera 04 has sunset glare between 17:00-18:30. Require multi-frame verification before flagging fire/smoke.",
                        "category": "environmental",
                        "created_at": datetime.utcnow().isoformat()
                    }
                ],
                "subagents": [
                    {
                        "id": "agent_perimeter_sentry",
                        "name": "Perimeter Sentry",
                        "role": "perimeter_monitoring",
                        "system_prompt": "Monitor external boundary cameras for tailgating, unauthorized perimeter crossings, and anomalous vehicle stops.",
                        "tools": ["query_camera_detections", "verify_spatial_path"]
                    },
                    {
                        "id": "agent_reid_tracer",
                        "name": "Cross-Camera Re-ID Tracer",
                        "role": "suspect_tracking",
                        "system_prompt": "Programmatically query adjacent camera timestamps and compute cosine distance on face/body embeddings.",
                        "tools": ["compute_reid_similarity", "query_camera_detections"]
                    },
                    {
                        "id": "agent_forensic_auditor",
                        "name": "Forensic Evidence Auditor",
                        "role": "audit_and_compliance",
                        "system_prompt": "Verify chain-of-custody Merkle roots and construct court-admissible incident timelines.",
                        "tools": ["verify_merkle_custody", "generate_incident_triage"]
                    }
                ],
                "skills": {
                    "compute_temporal_velocity": {
                        "name": "compute_temporal_velocity",
                        "description": "Calculates physical walking velocity across adjacent cameras to verify human physical plausibility.",
                        "code": "def compute_temporal_velocity(cam_a_pos, cam_b_pos, delta_sec):\n    dist_m = ((cam_a_pos[0]-cam_b_pos[0])**2 + (cam_a_pos[1]-cam_b_pos[1])**2)**0.5\n    return round(dist_m / max(delta_sec, 0.1), 2)",
                        "created_at": datetime.utcnow().isoformat()
                    },
                    "filter_aspect_ratio_anomaly": {
                        "name": "filter_aspect_ratio_anomaly",
                        "description": "Filters bounding boxes that deviate from typical human aspect ratios (0.3 to 0.7) to suppress reflections.",
                        "code": "def filter_aspect_ratio_anomaly(box):\n    w = box.get('x2', 0) - box.get('x1', 0)\n    h = box.get('y2', 0) - box.get('y1', 0)\n    if h <= 0: return False\n    aspect = w / h\n    return 0.2 <= aspect <= 0.85",
                        "created_at": datetime.utcnow().isoformat()
                    }
                },
                "memory": [
                    {
                        "id": "mem_1",
                        "topic": "Maintenance Uniform Baseline",
                        "insight": "Facilities personnel wearing high-visibility orange vests are authorized in utility corridors 24/7.",
                        "source_incident_id": None,
                        "created_at": datetime.utcnow().isoformat()
                    },
                    {
                        "id": "mem_2",
                        "topic": "Forklift Loading Bay False Alarms",
                        "insight": "Pallet delivery movements at Loading Bay 2 regularly trigger low-confidence fight bounding boxes; suppress if forklift motion is concurrent.",
                        "source_incident_id": None,
                        "created_at": datetime.utcnow().isoformat()
                    }
                ]
            }
            self.save()

    def load(self):
        """Load state and refinement logs from disk."""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        self.state = {
                            "prompts": data.get("prompts", []),
                            "subagents": data.get("subagents", []),
                            "skills": data.get("skills", {}),
                            "memory": data.get("memory", [])
                        }
            except Exception as e:
                print(f"[ContinualHarness] Error reading {self.state_file}: {e}")

        if REFINEMENT_LOG_FILE.exists():
            try:
                with open(REFINEMENT_LOG_FILE, "r", encoding="utf-8") as f:
                    self.refinement_history = json.load(f) or []
            except Exception:
                self.refinement_history = []

    def save(self):
        """Persist current state to JSON."""
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(self.state, f, indent=2)

    def _log_refinement(self, trigger: str, change_type: str, details: Dict[str, Any]):
        """Record an immutable refinement event for rollback and audit."""
        entry = {
            "refinement_id": f"ref_{int(time.time() * 1000)}",
            "timestamp": datetime.utcnow().isoformat(),
            "trigger": trigger,
            "change_type": change_type,
            "details": details
        }
        self.refinement_history.append(entry)
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        with open(REFINEMENT_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.refinement_history[-100:], f, indent=2)

    # ─────────────────────────────────────────────────────────────────────────
    # CRUD Operations for H = (ρ, G, K, M)
    # ─────────────────────────────────────────────────────────────────────────

    # --- ρ: Prompt Notes & Rules ---
    def create_prompt_note(self, camera_id: str, rule: str, category: str = "general") -> Dict[str, Any]:
        entry = {
            "id": f"rule_{int(time.time()*1000)}",
            "camera_id": camera_id or "ALL",
            "rule": rule,
            "category": category,
            "created_at": datetime.utcnow().isoformat()
        }
        self.state["prompts"].append(entry)
        self.save()
        self._log_refinement(f"Manual prompt creation for {camera_id}", "create_prompt", entry)
        return entry

    def update_prompt_note(self, rule_id: str, new_rule: str, camera_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        for p in self.state["prompts"]:
            if p["id"] == rule_id:
                p["rule"] = new_rule
                if camera_id:
                    p["camera_id"] = camera_id
                p["updated_at"] = datetime.utcnow().isoformat()
                self.save()
                self._log_refinement(f"Updated rule {rule_id}", "update_prompt", p)
                return p
        return None

    def delete_prompt_note(self, rule_id: str) -> bool:
        initial_len = len(self.state["prompts"])
        self.state["prompts"] = [p for p in self.state["prompts"] if p["id"] != rule_id]
        if len(self.state["prompts"]) < initial_len:
            self.save()
            self._log_refinement(f"Deleted rule {rule_id}", "delete_prompt", {"id": rule_id})
            return True
        return False

    # --- M: Memory & Lessons Learned ---
    def create_memory(self, topic: str, insight: str, source_incident_id: Optional[str] = None) -> Dict[str, Any]:
        entry = {
            "id": f"mem_{int(time.time()*1000)}",
            "topic": topic,
            "insight": insight,
            "source_incident_id": source_incident_id,
            "created_at": datetime.utcnow().isoformat()
        }
        self.state["memory"].append(entry)
        self.save()
        self._log_refinement(f"Created memory on '{topic}'", "create_memory", entry)
        return entry

    def delete_memory(self, memory_id: str) -> bool:
        initial_len = len(self.state["memory"])
        self.state["memory"] = [m for m in self.state["memory"] if m["id"] != memory_id]
        if len(self.state["memory"]) < initial_len:
            self.save()
            self._log_refinement(f"Deleted memory {memory_id}", "delete_memory", {"id": memory_id})
            return True
        return False

    # --- K: Skills ---
    def create_skill(self, name: str, code: str, description: str) -> Dict[str, Any]:
        entry = {
            "name": name,
            "description": description,
            "code": code,
            "created_at": datetime.utcnow().isoformat()
        }
        self.state["skills"][name] = entry
        self.save()
        self._log_refinement(f"Authored skill '{name}'", "create_skill", entry)
        return entry

    def delete_skill(self, name: str) -> bool:
        if name in self.state["skills"]:
            del self.state["skills"][name]
            self.save()
            self._log_refinement(f"Deleted skill '{name}'", "delete_skill", {"name": name})
            return True
        return False

    # --- G: Subagents ---
    def create_subagent(self, name: str, role: str, system_prompt: str, tools: List[str]) -> Dict[str, Any]:
        agent_id = f"agent_{name.lower().replace(' ', '_')}"
        entry = {
            "id": agent_id,
            "name": name,
            "role": role,
            "system_prompt": system_prompt,
            "tools": tools,
            "created_at": datetime.utcnow().isoformat()
        }
        self.state["subagents"].append(entry)
        self.save()
        self._log_refinement(f"Registered subagent '{name}'", "create_subagent", entry)
        return entry

    # ─────────────────────────────────────────────────────────────────────────
    # /refine Online Self-Improvement Pipeline
    # ─────────────────────────────────────────────────────────────────────────
    async def refine_from_operator_feedback(
        self,
        reference_label: str,
        predicted_label: str,
        rating: str,
        notes: Optional[str] = None,
        camera_id: Optional[str] = None,
        correction_label: Optional[str] = None,
        incident_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a targeted refinement step based on human-in-the-loop operator action.
        Analyzes the error pattern and applies the minimal CRUD modification to H = (ρ, G, K, M).
        """
        is_bad = rating.lower() in ("bad", "fp", "false_positive", "incorrect")
        action_taken = "none"
        result_payload = {}

        if is_bad:
            # Construct a high-value operational memory
            topic = f"Misclassification: {predicted_label} vs {correction_label or reference_label}"
            insight = (
                f"Operator flagged {predicted_label} as false match on Camera {camera_id or 'General'}. "
                f"Correction: '{correction_label or reference_label}'. "
                f"Notes: {notes or 'No specific operator notes.'}."
            )
            mem = self.create_memory(topic=topic, insight=insight, source_incident_id=incident_id)
            action_taken = "created_memory"
            result_payload = mem

            # If camera-specific environmental note provided, author a prompt rule (ρ)
            if notes and any(w in notes.lower() for w in ["glare", "shadow", "reflection", "lighting", "weather", "sun"]):
                rule_text = f"Be vigilant on {camera_id or 'this feed'} for lighting/shadow anomalies: {notes}"
                prompt_note = self.create_prompt_note(camera_id=camera_id or "ALL", rule=rule_text, category="environmental")
                action_taken = "created_memory_and_prompt_rule"
                result_payload = {"memory": mem, "prompt_note": prompt_note}

        else:
            # Positive confirmation reinforces identity or incident confidence
            topic = f"Confirmed Positive: {reference_label}"
            insight = f"Confirmed accurate match on Camera {camera_id or 'General'}. Reinforce exemplar embedding."
            mem = self.create_memory(topic=topic, insight=insight, source_incident_id=incident_id)
            action_taken = "confirmed_exemplar_memory"
            result_payload = mem

        return {
            "status": "refined",
            "action": action_taken,
            "payload": result_payload,
            "timestamp": datetime.utcnow().isoformat()
        }

    def build_system_prompt_context(self) -> str:
        """
        Synthesizes the current active state of H = (ρ, G, K, M)
        into a concise, highly-structured context block for LLM prompts.
        """
        self.load()
        prompts = self.state.get("prompts", [])
        memory = self.state.get("memory", [])
        skills = self.state.get("skills", {})
        subagents = self.state.get("subagents", [])

        rules_formatted = "\n".join([f"- [Camera {p.get('camera_id', 'ALL')}]: {p.get('rule', '')}" for p in prompts])
        memory_formatted = "\n".join([f"- [{m.get('topic', 'General')}]: {m.get('insight', '')}" for m in memory[-10:]])
        skills_formatted = ", ".join([s for s in skills.keys()])
        agents_formatted = ", ".join([f"{a.get('name')} ({a.get('role')})" for a in subagents])

        return (
            f"=== CONTINUAL HARNESS STATE H=(ρ,G,K,M) ===\n"
            f"Active Operational Rules (ρ):\n{rules_formatted or 'Standard operating guidelines.'}\n\n"
            f"Learned Operational Memory (M):\n{memory_formatted or 'No prior false alarm corrections recorded.'}\n\n"
            f"Available Subagents (G): {agents_formatted or 'General Investigator'}\n"
            f"Available Analytical Skills (K): {skills_formatted or 'Standard Vision CV Tools'}\n"
            f"==========================================="
        )


# Global singleton instance
continual_harness = ContinualSurveillanceHarness()

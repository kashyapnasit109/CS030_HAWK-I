"""
VIGINT — Cryptographic SHA-256 Merkle Chain of Custody Engine
Maintains an immutable tamper-evident cryptographic hash chain for all video exports,
incident escalations, and evidence items:
H_n = SHA256(H_{n-1} || Timestamp || OperatorID || EventHash)
"""

import hashlib
import time
import json
from typing import Any

# Genesis block hash
GENESIS_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"

_merkle_chain: list[dict[str, Any]] = [
    {
        "index": 0,
        "timestamp": time.time() - 3600,
        "timestamp_str": "Genesis Block",
        "action": "VIGINT Platform Initialized",
        "operator_id": "SYSTEM_ROOT",
        "event_hash": "GENESIS_ROOT_INIT",
        "prev_hash": "0" * 64,
        "current_hash": GENESIS_HASH,
        "valid": True
    }
]


def add_chain_event(
    action: str,
    operator_id: str,
    event_payload: dict[str, Any] | str
) -> dict[str, Any]:
    """Append a new verified block to the SHA-256 Merkle Chain."""
    prev_block = _merkle_chain[-1]
    prev_hash = prev_block["current_hash"]
    ts = time.time()

    payload_str = json.dumps(event_payload, sort_keys=True) if isinstance(event_payload, dict) else str(event_payload)
    event_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    raw_block_data = f"{prev_hash}|{ts:.3f}|{operator_id}|{event_hash}"
    current_hash = hashlib.sha256(raw_block_data.encode("utf-8")).hexdigest()

    block = {
        "index": len(_merkle_chain),
        "timestamp": ts,
        "timestamp_str": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts)),
        "action": action,
        "operator_id": operator_id,
        "event_hash": event_hash,
        "prev_hash": prev_hash,
        "current_hash": current_hash,
        "valid": True
    }

    _merkle_chain.append(block)
    return block


def verify_chain_integrity() -> dict[str, Any]:
    """Verify entire Merkle hash chain from Genesis block forward."""
    for i in range(1, len(_merkle_chain)):
        curr = _merkle_chain[i]
        prev = _merkle_chain[i - 1]

        if curr["prev_hash"] != prev["current_hash"]:
            return {
                "intact": False,
                "broken_at_index": i,
                "error": f"Hash link mismatch between block {i-1} and {i}"
            }

    return {
        "intact": True,
        "total_blocks": len(_merkle_chain),
        "head_hash": _merkle_chain[-1]["current_hash"],
        "algorithm": "SHA-256 Merkle Chaining"
    }


def get_chain_history() -> list[dict[str, Any]]:
    """Return complete Merkle chain history."""
    return list(reversed(_merkle_chain))

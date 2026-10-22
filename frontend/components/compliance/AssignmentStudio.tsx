"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TargetIcon,
  CheckIcon,
  AlertIcon,
  CloseIcon,
  RefreshIcon,
  ShieldIcon,
  CameraIcon,
  FilterIcon,
  SearchIcon,
  SlidersIcon,
  WarningIcon,
} from "@/components/Icons";
import { showToast } from "@/components/ToastProvider";

interface CameraItem {
  camera_id: string;
  name: string;
  brand: string;
  status: string;
  is_connected: boolean;
  supported_capabilities: string[];
  active_rule_count: number;
}

interface RuleItem {
  rule_id: string;
  name: string;
  category: string;
  domain: string;
  severity: string;
  enabled: boolean;
  conditions: any;
  actions: any[];
}

interface AssignmentItem {
  assignment_id: string;
  camera_id: string;
  camera_name: string;
  camera_connected: boolean;
  rule_id: string;
  rule_name: string;
  rule_category: string;
  rule_domain: string;
  rule_severity: string;
  enabled: boolean;
  status: string;
  status_reason?: string;
  created_at: number;
  synced_at?: number;
  config_version: number;
}

interface CompatibilityMatrixItem {
  camera_id: string;
  camera_name: string;
  rule_id: string;
  rule_name: string;
  compatible: boolean;
  reasons: string[];
  warnings: string[];
}

export default function AssignmentStudio({ apiBase }: { apiBase: string }) {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Workflow Selection States
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [excludeIncompatible, setExcludeIncompatible] = useState(false);

  // Compatibility validation state
  const [compatMatrix, setCompatMatrix] = useState<CompatibilityMatrixItem[]>([]);
  const [validatingCompat, setValidatingCompat] = useState(false);

  // Bulk commit state
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);

  // Filters
  const [cameraSearch, setCameraSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleDomainFilter, setRuleDomainFilter] = useState("all");

  // ── Load Data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [camRes, ruleRes, asgnRes] = await Promise.all([
        fetch(`${apiBase}/cameras`),
        fetch(`${apiBase}/rules`),
        fetch(`${apiBase}/assignments`),
      ]);

      if (camRes.ok) {
        const cData = await camRes.json();
        setCameras(cData.cameras || []);
      }
      if (ruleRes.ok) {
        const rData = await ruleRes.json();
        setRules(rData.rules || []);
      }
      if (asgnRes.ok) {
        const aData = await asgnRes.json();
        setAssignments(aData.assignments || []);
      }
    } catch (err) {
      console.error("Failed to load assignment studio data:", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Compatibility Matrix Evaluation ────────────────────────────────────────
  useEffect(() => {
    if (selectedCameras.length === 0 || selectedRules.length === 0) {
      setCompatMatrix([]);
      return;
    }

    const checkCompatibility = async () => {
      try {
        setValidatingCompat(true);
        const res = await fetch(`${apiBase}/rule-compatibility`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            camera_ids: selectedCameras,
            rule_ids: selectedRules,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCompatMatrix(data.matrix || []);
        }
      } catch (err) {
        console.error("Compatibility check failed:", err);
      } finally {
        setValidatingCompat(false);
      }
    };

    const timer = setTimeout(checkCompatibility, 300);
    return () => clearTimeout(timer);
  }, [apiBase, selectedCameras, selectedRules]);

  // ── Execute Bulk Assignment ────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    if (selectedCameras.length === 0 || selectedRules.length === 0) {
      showToast("Please select at least one camera and one rule.", "error");
      return;
    }

    try {
      setCommitting(true);
      const res = await fetch(`${apiBase}/assignments/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_ids: selectedCameras,
          rule_ids: selectedRules,
          exclude_incompatible: excludeIncompatible,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCommitResult(data);
        showToast(
          `✅ Successfully applied ${data.applied_count} assignments! Config version: ${data.config_version}`,
          "success"
        );
        // Refresh table
        fetchData();
        // Reset selections
        setSelectedCameras([]);
        setSelectedRules([]);
      } else {
        const err = await res.json();
        showToast(`Failed to apply assignments: ${err.detail || "Server error"}`, "error");
      }
    } catch (e: any) {
      showToast(`Network error applying assignments: ${e.message}`, "error");
    } finally {
      setCommitting(false);
    }
  };

  // ── Toggle Single Assignment ───────────────────────────────────────────────
  const handleToggleAssignment = async (assignmentId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`${apiBase}/assignments/${assignmentId}/toggle?enabled=${!currentEnabled}`, {
        method: "POST",
      });
      if (res.ok) {
        showToast(`Assignment ${!currentEnabled ? "enabled" : "disabled"}.`, "success");
        fetchData();
      }
    } catch {
      showToast("Failed to toggle assignment.", "error");
    }
  };

  // ── Remove Single Assignment ───────────────────────────────────────────────
  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(`${apiBase}/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Assignment removed successfully (rule preserved).", "success");
        fetchData();
      }
    } catch {
      showToast("Failed to remove assignment.", "error");
    }
  };

  // Select all helpers
  const handleSelectAllCameras = () => {
    if (selectedCameras.length === cameras.length) setSelectedCameras([]);
    else setSelectedCameras(cameras.map((c) => c.camera_id));
  };

  const handleSelectAllRules = () => {
    if (selectedRules.length === rules.length) setSelectedRules([]);
    else setSelectedRules(rules.map((r) => r.rule_id));
  };

  // Filters
  const filteredCameras = cameras.filter((c) =>
    c.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
    c.camera_id.toLowerCase().includes(cameraSearch.toLowerCase())
  );

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.rule_id.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.category.toLowerCase().includes(ruleSearch.toLowerCase());
    const matchesDomain = ruleDomainFilter === "all" || r.domain === ruleDomainFilter;
    return matchesSearch && matchesDomain;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Workflow Header ── */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          padding: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px 0" }}>
            Many-to-Many Camera-to-Rule Assignment Studio
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
            Select multiple registered cameras and compliance rules to evaluate compatibility and apply policies in a single workflow.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={fetchData}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <RefreshIcon size={14} />
            Refresh
          </button>

          <button
            onClick={handleBulkAssign}
            disabled={committing || selectedCameras.length === 0 || selectedRules.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 18px",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor:
                selectedCameras.length > 0 && selectedRules.length > 0
                  ? "var(--accent)"
                  : "var(--border)",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: "700",
              cursor:
                selectedCameras.length > 0 && selectedRules.length > 0
                  ? "pointer"
                  : "not-allowed",
              boxShadow: "0 2px 10px rgba(59, 130, 246, 0.25)",
            }}
          >
            <TargetIcon size={16} />
            {committing
              ? "Persisting & Syncing Engine..."
              : `Apply Assignments (${selectedCameras.length * selectedRules.length})`}
          </button>
        </div>
      </div>

      {/* ── Selection Matrix Columns (Cameras vs Rules) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Column 1: Select Cameras */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CameraIcon size={16} color="var(--accent)" />
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                1. Select Cameras ({selectedCameras.length}/{cameras.length})
              </h4>
            </div>

            <button
              onClick={handleSelectAllCameras}
              style={{
                fontSize: "11px",
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {selectedCameras.length === cameras.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Camera Search */}
          <input
            type="text"
            placeholder="Filter cameras..."
            value={cameraSearch}
            onChange={(e) => setCameraSearch(e.target.value)}
            style={{
              padding: "7px 12px",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: "12px",
              outline: "none",
            }}
          />

          {/* Camera Items */}
          <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {filteredCameras.map((cam) => {
              const checked = selectedCameras.includes(cam.camera_id);
              return (
                <div
                  key={cam.camera_id}
                  onClick={() =>
                    setSelectedCameras((prev) =>
                      checked ? prev.filter((id) => id !== cam.camera_id) : [...prev, cam.camera_id]
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: checked ? "rgba(59, 130, 246, 0.08)" : "var(--bg-surface)",
                    border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // handled by parent onClick
                      style={{ cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {cam.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        <code>{cam.camera_id}</code> | {cam.brand}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      backgroundColor: cam.is_connected
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                      color: cam.is_connected ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {cam.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Select Rules */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldIcon size={16} color="var(--accent)" />
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                2. Select Compliance Rules ({selectedRules.length}/{rules.length})
              </h4>
            </div>

            <button
              onClick={handleSelectAllRules}
              style={{
                fontSize: "11px",
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {selectedRules.length === rules.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Rule Search & Domain Filter */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Filter rules by name or category..."
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              style={{
                flex: 1,
                padding: "7px 12px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "12px",
                outline: "none",
              }}
            />

            <select
              value={ruleDomainFilter}
              onChange={(e) => setRuleDomainFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "11px",
                outline: "none",
              }}
            >
              <option value="all">All Domains</option>
              <option value="education">Education</option>
              <option value="safety">Safety</option>
              <option value="industrial">Industrial</option>
              <option value="healthcare">Healthcare</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>

          {/* Rule Items */}
          <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {filteredRules.map((r) => {
              const checked = selectedRules.includes(r.rule_id);
              return (
                <div
                  key={r.rule_id}
                  onClick={() =>
                    setSelectedRules((prev) =>
                      checked ? prev.filter((id) => id !== r.rule_id) : [...prev, r.rule_id]
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: checked ? "rgba(59, 130, 246, 0.08)" : "var(--bg-surface)",
                    border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      style={{ cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {r.category} · <code>{r.rule_id}</code>
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      backgroundColor:
                        r.severity === "Critical"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(245, 158, 11, 0.15)",
                      color: r.severity === "Critical" ? "var(--red)" : "var(--amber)",
                    }}
                  >
                    {r.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Step 3: Compatibility Assessment Matrix ── */}
      {compatMatrix.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
              Compatibility Pre-Validation Analysis ({compatMatrix.length} proposed pairs)
            </h4>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={excludeIncompatible}
                onChange={(e) => setExcludeIncompatible(e.target.checked)}
              />
              Exclude incompatible pairs from bulk apply
            </label>
          </div>

          <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {compatMatrix.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface)",
                  border: `1px solid ${item.compatible ? "var(--border)" : "rgba(239, 68, 68, 0.3)"}`,
                }}
              >
                <div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {item.camera_name}
                  </span>{" "}
                  →{" "}
                  <span style={{ fontSize: "12px", color: "var(--accent)" }}>{item.rule_name}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.warnings.map((w, wIdx) => (
                    <span key={wIdx} style={{ fontSize: "10px", color: "var(--amber)" }}>
                      ⚠️ {w}
                    </span>
                  ))}
                  {item.reasons.map((r, rIdx) => (
                    <span key={rIdx} style={{ fontSize: "10px", color: "var(--red)" }}>
                      ❌ {r}
                    </span>
                  ))}
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      backgroundColor: item.compatible
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                      color: item.compatible ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {item.compatible ? "COMPATIBLE" : "INCOMPATIBLE"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Persistent Assignments Table ── */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 2px 0" }}>
              Active Persistent Camera-Rule Assignments ({assignments.length})
            </h4>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Changes immediately notify and reconfigure backend AI inference workers.
            </span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "8px 10px" }}>Camera</th>
                <th style={{ padding: "8px 10px" }}>Assigned Rule</th>
                <th style={{ padding: "8px 10px" }}>Category</th>
                <th style={{ padding: "8px 10px" }}>Severity</th>
                <th style={{ padding: "8px 10px" }}>Runtime Status</th>
                <th style={{ padding: "8px 10px" }}>Config Version</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((asgn) => (
                <tr
                  key={asgn.assignment_id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: asgn.enabled ? "transparent" : "rgba(0,0,0,0.15)",
                  }}
                >
                  <td style={{ padding: "10px" }}>
                    <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{asgn.camera_name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}><code>{asgn.camera_id}</code></div>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ fontWeight: "600", color: "var(--accent)" }}>{asgn.rule_name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}><code>{asgn.rule_id}</code></div>
                  </td>
                  <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{asgn.rule_category}</td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "700",
                        backgroundColor:
                          asgn.rule_severity === "Critical"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                        color: asgn.rule_severity === "Critical" ? "var(--red)" : "var(--amber)",
                      }}
                    >
                      {asgn.rule_severity}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "10px",
                        fontWeight: "700",
                        backgroundColor:
                          asgn.status === "ACTIVE"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                        color: asgn.status === "ACTIVE" ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {asgn.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>
                    v{asgn.config_version || 1}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <button
                      onClick={() => handleToggleAssignment(asgn.assignment_id, asgn.enabled)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        borderRadius: "4px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-surface)",
                        color: asgn.enabled ? "var(--amber)" : "var(--green)",
                        cursor: "pointer",
                        marginRight: "6px",
                      }}
                    >
                      {asgn.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(asgn.assignment_id)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        borderRadius: "4px",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                        color: "var(--red)",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

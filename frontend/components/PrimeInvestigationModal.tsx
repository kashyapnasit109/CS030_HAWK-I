"use client";

import React, { useState } from "react";
import {
  RLMInvestigationResult,
  runPrimeInvestigation,
  startAutonomousGoal,
  AutonomousJobResult,
} from "@/lib/api";
import { CloseIcon, SparklesIcon, ZapIcon, SearchIcon, CheckIcon, AlertIcon } from "@/components/Icons";

interface PrimeInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialReferenceLabel?: string;
  initialCameraId?: string;
}

export default function PrimeInvestigationModal({
  isOpen,
  onClose,
  initialQuery = "",
  initialReferenceLabel = "",
  initialCameraId,
}: PrimeInvestigationModalProps) {
  const [query, setQuery] = useState(initialQuery || initialReferenceLabel || "Suspect in dark jacket");
  const [targetRef, setTargetRef] = useState(initialReferenceLabel || "");
  const [minConf, setMinConf] = useState(0.50);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"rlm" | "autonomous">("rlm");
  const [investigationResult, setInvestigationResult] = useState<RLMInvestigationResult | null>(null);
  const [autonomousResult, setAutonomousResult] = useState<AutonomousJobResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      if (mode === "rlm") {
        const res = await runPrimeInvestigation({
          query,
          reference_label: targetRef || undefined,
          min_confidence: minConf,
          camera_ids: ["CAM-01-MAIN", "CAM-02-GATE", "CAM-03-CORRIDOR", "CAM-04-PERIMETER", "CAM-05-LOADING"],
        });
        setInvestigationResult(res);
      } else {
        const autoRes = await startAutonomousGoal({
          goal_description: query,
          target_reference: targetRef || undefined,
          max_turns: 6,
        });
        setAutonomousResult(autoRes);
        if (autoRes.final_report?.investigation) {
          setInvestigationResult(autoRes.final_report.investigation);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to execute investigation");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
        willChange: "transform, opacity",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0C0F1A",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          borderRadius: "16px",
          maxWidth: "880px",
          width: "100%",
          maxHeight: "90vh",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(59, 130, 246, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#E2E8F0",
          fontFamily: "'Inter', system-ui, sans-serif",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            background: "rgba(15, 23, 42, 0.85)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "#000",
                fontSize: "1.1rem",
                boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)",
              }}
            >
              Ψ
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                  Prime RLM Forensic Investigator
                </h3>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background: "rgba(6, 182, 212, 0.15)",
                    border: "1px solid rgba(6, 182, 212, 0.35)",
                    color: "#38BDF8",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  Recursive Multi-Agent
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "2px 0 0 0" }}>
                Parallel camera subagent fan-out &amp; autonomous spatial-temporal timeline reconstruction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94A3B8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: "22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            flex: 1,
          }}
        >
          {/* Controls Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "14px",
              background: "rgba(15, 23, 42, 0.6)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.07)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Target / Forensic Objective
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Track individual wearing black hoodie with red backpack"
                style={{
                  width: "100%",
                  background: "#080B14",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                  color: "#FFFFFF",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Known Label / Person ID
              </label>
              <input
                type="text"
                value={targetRef}
                onChange={(e) => setTargetRef(e.target.value)}
                placeholder="e.g., John Doe / Suspect-A"
                style={{
                  width: "100%",
                  background: "#080B14",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                  color: "#FFFFFF",
                  outline: "none",
                }}
              />
            </div>

            {/* Sub Controls row */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>
                  Min Re-ID Conf: <strong style={{ color: "#38BDF8" }}>{Math.round(minConf * 100)}%</strong>
                </span>
                <input
                  type="range"
                  min="0.30"
                  max="0.90"
                  step="0.05"
                  value={minConf}
                  onChange={(e) => setMinConf(parseFloat(e.target.value))}
                  style={{ width: "120px", accentColor: "#06B6D4" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>Mode:</span>
                <button
                  type="button"
                  onClick={() => setMode("rlm")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: mode === "rlm" ? "#06B6D4" : "rgba(255, 255, 255, 0.05)",
                    color: mode === "rlm" ? "#000" : "#94A3B8",
                    border: "none",
                    transition: "all 0.15s",
                  }}
                >
                  RLM Fan-Out
                </button>
                <button
                  type="button"
                  onClick={() => setMode("autonomous")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: mode === "autonomous" ? "#3B82F6" : "rgba(255, 255, 255, 0.05)",
                    color: mode === "autonomous" ? "#FFF" : "#94A3B8",
                    border: "none",
                    transition: "all 0.15s",
                  }}
                >
                  Autonomous Gates
                </button>
              </div>

              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning || !query.trim()}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: isRunning ? "rgba(6, 182, 212, 0.4)" : "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  cursor: isRunning || !query.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 0 15px rgba(6, 182, 212, 0.3)",
                  border: "none",
                  transition: "all 0.15s",
                }}
              >
                <SparklesIcon size={15} />
                {isRunning ? "Fanning Out Subagents..." : "Run Prime Investigation"}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#F87171",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertIcon size={16} /> {error}
            </div>
          )}

          {/* Autonomous Gate Status */}
          {autonomousResult && (
            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background: "rgba(30, 27, 75, 0.4)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#818CF8", textTransform: "uppercase" }}>
                  Autonomous Gate Solver ({autonomousResult.status}) • Turn {autonomousResult.current_turn} of {autonomousResult.max_turns}
                </span>
                <span style={{ fontSize: "0.72rem", color: "#94A3B8", fontFamily: "monospace" }}>{autonomousResult.job_id}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                {autonomousResult.gate_results.map((gate, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: gate.passed ? "rgba(6, 78, 59, 0.3)" : "rgba(120, 53, 15, 0.3)",
                      border: `1px solid ${gate.passed ? "rgba(52, 211, 153, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                      fontSize: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: gate.passed ? "#34D399" : "#FBBF24" }}>{gate.gate_name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: "2px" }}>{gate.message}</div>
                    </div>
                    <span>{gate.passed ? "✅" : "⏳"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subagent Fan-Out Status Grid */}
          {investigationResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", margin: 0 }}>
                  Subagent Reports ({investigationResult.subagents_fanned_out} Cameras in {investigationResult.duration_ms}ms)
                </h4>
                <span style={{ fontSize: "0.75rem", color: "#38BDF8", fontFamily: "monospace", fontWeight: 700 }}>
                  Avg Conf: {Math.round(investigationResult.average_confidence * 100)}%
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                {investigationResult.subagent_reports.map((sub, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      background: sub.matches > 0 ? "rgba(6, 182, 212, 0.1)" : "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${sub.matches > 0 ? "rgba(6, 182, 212, 0.35)" : "rgba(255, 255, 255, 0.06)"}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: sub.matches > 0 ? "#38BDF8" : "#64748B" }}>
                      {sub.camera_id}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
                      <span style={{ color: "#94A3B8" }}>Sightings:</span>
                      <strong style={{ color: "#FFFFFF" }}>{sub.matches}</strong>
                    </div>
                    {sub.matches > 0 && (
                      <div style={{ fontSize: "0.68rem", color: "#34D399", fontWeight: 700 }}>
                        Peak: {Math.round(sub.peak_conf * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reconstructed Trajectory Route */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: "10px",
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <span style={{ fontWeight: 800, color: "#38BDF8", textTransform: "uppercase" }}>
                    Reconstructed Trajectory Route (RLM Synthesis)
                  </span>
                  <span style={{ color: "#94A3B8" }}>{investigationResult.movement_trail.length} Sightings Confirmed</span>
                </div>
                <div
                  style={{
                    background: "#080B14",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    overflowX: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  {investigationResult.reconstructed_path}
                </div>
                <p style={{ fontSize: "0.78rem", color: "#CBD5E1", margin: "2px 0 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
                  "{investigationResult.narrative}"
                </p>
              </div>

              {/* Chronological Evidence Trail */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <h5 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", margin: 0 }}>
                  Chronological Evidence Trail
                </h5>
                <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}>
                  {investigationResult.timeline_events.map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.78rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(6, 182, 212, 0.15)",
                            color: "#38BDF8",
                            fontWeight: 800,
                            fontFamily: "monospace",
                            fontSize: "0.72rem",
                          }}
                        >
                          {ev.camera_id}
                        </span>
                        <span style={{ color: "#94A3B8", fontFamily: "monospace" }}>{ev.timestamp_str}</span>
                        <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{ev.label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: "#34D399", fontWeight: 700 }}>
                          {Math.round(ev.confidence * 100)}% Conf
                        </span>
                        {ev.frame_url && (
                          <a
                            href={ev.frame_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#38BDF8", textDecoration: "none", fontSize: "0.72rem" }}
                          >
                            Frame ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!investigationResult && !isRunning && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "2rem" }}>🔍</div>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>
                Click "Run Prime Investigation" to fan out recursive camera subagents across your camera network.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            background: "rgba(15, 23, 42, 0.85)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "0.75rem",
            color: "#64748B",
          }}
        >
          <span>Prime Agent RLM Runtime • Continual Harness H=(ρ,G,K,M)</span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#FFFFFF",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIcon,
  RefreshIcon,
  CheckIcon,
  AlertIcon,
  ShieldIcon,
  CameraIcon,
  CpuIcon,
  ClockIcon,
  SignalIcon,
} from "@/components/Icons";
import { showToast } from "@/components/ToastProvider";

interface DiagnosticData {
  status: string;
  timestamp: number;
  config_version: number;
  last_assignment_sync: number;
  system_metrics: {
    total_cameras: number;
    online_cameras: number;
    aggregate_inference_fps: number;
    active_workers: number;
    installed_models: Array<{ id: string; role: string; status: string }>;
    deterministic_engine: Record<string, string>;
  };
  cameras: Array<{
    camera_id: string;
    name: string;
    brand: string;
    is_connected: boolean;
    fps: number;
    resolution: string;
    inference_ms: number;
    eval_ms: number;
    last_frame_age?: number;
    buffer_capacity: number;
    buffered_frames: number;
    active_rules_count: number;
    tracked_entities: number;
    status: string;
    error?: string | null;
  }>;
  recent_traces: Array<{
    trace_id: string;
    violation_id: string;
    rule_id: string;
    rule_name: string;
    camera_id: string;
    frame_timestamp: number;
    infer_ms: number;
    eval_ms: number;
    sha256: string;
    status: string;
  }>;
}

export default function OperationalDiagnostics({ apiBase }: { apiBase: string }) {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/diagnostics`);
      if (res.ok) {
        const diag = await res.json();
        setData(diag);
      }
    } catch (err) {
      console.error("Failed to load diagnostics:", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 4000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Diagnostic Header ── */}
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
            Operational Diagnostics & Runtime Telemetry
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
            Live hardware decoders, model latency metrics, buffer capacity, and millisecond incident execution traces.
          </p>
        </div>

        <button
          onClick={fetchDiagnostics}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
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
          Refresh Metrics
        </button>
      </div>

      {/* ── System Overview Cards ── */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>System Status</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--green)", marginTop: "4px" }}>{data.status}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Config Version: v{data.config_version}</div>
          </div>

          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Connected Streams</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent)", marginTop: "4px" }}>
              {data.system_metrics.online_cameras} / {data.system_metrics.total_cameras}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
              {data.system_metrics.active_workers} Active Workers
            </div>
          </div>

          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Aggregate AI Rate</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--amber)", marginTop: "4px" }}>
              {data.system_metrics.aggregate_inference_fps} FPS
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Sub-35ms stream reflex</div>
          </div>

          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Ring Buffer Health</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent)", marginTop: "4px" }}>
              300 Frames / Stream
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Zero disk I/O in-memory</div>
          </div>
        </div>
      )}

      {/* ── Active Stream Decoders Table ── */}
      {data && (
        <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "20px" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 14px 0" }}>
            Hardware Stream Decoders & Ingestion Latencies
          </h4>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "8px 10px" }}>Camera ID</th>
                  <th style={{ padding: "8px 10px" }}>Stream Source</th>
                  <th style={{ padding: "8px 10px" }}>Status</th>
                  <th style={{ padding: "8px 10px" }}>Resolution</th>
                  <th style={{ padding: "8px 10px" }}>Measured FPS</th>
                  <th style={{ padding: "8px 10px" }}>Inference Latency</th>
                  <th style={{ padding: "8px 10px" }}>Frame Freshness</th>
                  <th style={{ padding: "8px 10px" }}>Ring Buffer</th>
                </tr>
              </thead>
              <tbody>
                {data.cameras.map((c) => (
                  <tr key={c.camera_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)" }}>
                      {c.name} (<code>{c.camera_id}</code>)
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.brand}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "10px",
                          fontWeight: "700",
                          backgroundColor: c.is_connected
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                          color: c.is_connected ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{c.resolution}</td>
                    <td style={{ padding: "10px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {c.fps.toFixed(1)} FPS
                    </td>
                    <td style={{ padding: "10px", color: "var(--amber)" }}>
                      {c.inference_ms}ms
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                      {c.last_frame_age !== null && c.last_frame_age !== undefined ? `${c.last_frame_age}s ago` : "N/A"}
                    </td>
                    <td style={{ padding: "10px", color: "var(--accent)" }}>
                      {c.buffered_frames} / {c.buffer_capacity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Active AI Models & Deterministic Engine ── */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Installed Models */}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "18px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 12px 0" }}>
              Active AI Vision & Pose Detectors
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.system_metrics.installed_models.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>
                      <code>{m.id}</code>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.role}</div>
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--green)" }}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deterministic Engine */}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "18px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 12px 0" }}>
              Deterministic Rule Engine Subsystems
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(data.system_metrics.deterministic_engine).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                    {k.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent)" }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── End-to-End Incident Trace Log ── */}
      {data && (
        <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "20px" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px 0" }}>
            End-to-End Incident Execution Traces
          </h4>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 14px 0" }}>
            Complete latency trace from video frame arrival to model inference, deterministic rule check, Section 65B SHA-256 evidence sealing, and WebSocket dispatch.
          </p>

          {data.recent_traces.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px", backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-md)" }}>
              No recent violation incidents triggered. System is compliant.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.recent_traces.map((trace) => (
                <div
                  key={trace.trace_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {trace.violation_id} · {trace.rule_name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Camera: <strong>{trace.camera_id}</strong> | SHA-256: <code>{trace.sha256.slice(0, 24)}...</code>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px" }}>
                    <span style={{ color: "var(--amber)" }}>
                      Inference: <strong>{trace.infer_ms}ms</strong>
                    </span>
                    <span style={{ color: "var(--accent)" }}>
                      Evaluation: <strong>{trace.eval_ms}ms</strong>
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "10px",
                        fontWeight: "700",
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        color: "var(--green)",
                      }}
                    >
                      {trace.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

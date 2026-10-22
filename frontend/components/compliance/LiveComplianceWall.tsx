"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CameraIcon,
  PlayIcon,
  PauseIcon,
  RefreshIcon,
  CheckIcon,
  AlertIcon,
  SlidersIcon,
  GridIcon,
  MaximizeIcon,
  DownloadIcon,
  ActivityIcon,
  EyeIcon,
  SignalIcon,
  FilterIcon,
  SearchIcon,
  TargetIcon,
  UsersIcon,
  FlameIcon,
  CloseIcon,
} from "@/components/Icons";
import { showToast } from "@/components/ToastProvider";

interface CameraItem {
  camera_id: string;
  id: string;
  name: string;
  brand: string;
  url: string;
  status: "ONLINE" | "CONNECTING" | "OFFLINE" | "STALE" | "ERROR";
  is_connected: boolean;
  fps: number;
  width: number;
  height: number;
  last_frame_age?: number;
  supported_capabilities: string[];
  active_rules: Array<{ rule_id: string; name: string; severity: string }>;
  active_rule_count: number;
  inference_status: string;
  inference_ms: number;
  tracked_count: number;
  error?: string | null;
}

interface DetectionEntity {
  track_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
  norm_bbox: [number, number, number, number];
  center: [number, number];
  dwell_seconds: number;
  trajectory: Array<[number, number, number]>;
  keypoints?: Array<[number, number, number]>;
}

interface FrameDetectionData {
  camera_id: string;
  camera_name: string;
  frame_sequence: number;
  frame_timestamp: number;
  processing_timestamp: number;
  dimensions: { width: number; height: number };
  telemetry: {
    fps: number;
    inference_ms: number;
    eval_ms: number;
    tracked_entities: number;
  };
  detections: DetectionEntity[];
  rule_states: Record<
    string,
    { name: string; category: string; severity: string; status: string }
  >;
}

interface OverlaySettings {
  boxes: boolean;
  labels: boolean;
  trackIds: boolean;
  trajectories: boolean;
  pose: boolean;
  masks: boolean;
  zones: boolean;
  tripwires: boolean;
  relations: boolean;
  ruleStatus: boolean;
  violations: boolean;
  timestamps: boolean;
}

const DEFAULT_OVERLAYS: OverlaySettings = {
  boxes: true,
  labels: true,
  trackIds: true,
  trajectories: true,
  pose: true,
  masks: false,
  zones: true,
  tripwires: true,
  relations: true,
  ruleStatus: true,
  violations: true,
  timestamps: true,
};

// 17-Keypoint COCO skeleton connections
const SKELETON_PAIRS: Array<[number, number]> = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Head
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
  [5, 11], [6, 12], [11, 12], // Torso
  [11, 13], [13, 15], [12, 14], [14, 16] // Legs
];

export default function LiveComplianceWall({
  apiBase,
  wsBase,
  onNavigateToAssignments,
}: {
  apiBase: string;
  wsBase: string;
  onNavigateToAssignments?: () => void;
}) {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");
  const [selectedCamIds, setSelectedCamIds] = useState<string[]>([]);
  const [activeSlotIds, setActiveSlotIds] = useState<string[]>([]);
  const [gridLayout, setGridLayout] = useState<"1x1" | "2x2" | "3x3">("2x2");
  const [overlays, setOverlays] = useState<OverlaySettings>(DEFAULT_OVERLAYS);
  const [showOverlayMenu, setShowOverlayMenu] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeViolations, setActiveViolations] = useState<any[]>([]);

  // Live frame detections per camera ID
  const [liveDetections, setLiveDetections] = useState<
    Record<string, FrameDetectionData>
  >({});

  // Canvas refs per camera ID
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const videoRefs = useRef<Record<string, HTMLImageElement | null>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // ── Fetch Real Camera Registry ─────────────────────────────────────────────
  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/cameras`);
      if (res.ok) {
        const data = await res.json();
        const camList: CameraItem[] = data.cameras || [];
        setCameras(camList);

        // Default active slots to first 4 cameras
        if (camList.length > 0 && activeSlotIds.length === 0) {
          const initial = camList.slice(0, 4).map((c) => c.camera_id);
          setActiveSlotIds(initial);
          setSelectedCamIds(initial);
        }
      }
    } catch (e) {
      console.error("Failed to load cameras:", e);
    } finally {
      setLoading(false);
    }
  }, [apiBase, activeSlotIds.length]);

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 8000);
    return () => clearInterval(interval);
  }, [fetchCameras]);

  // ── Real-Time WebSocket Connection ─────────────────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsBase);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          console.log("[ComplianceWall] WebSocket connection established.");
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "DETECTION_FRAME") {
              const frameData: FrameDetectionData = msg.data;
              setLiveDetections((prev) => ({
                ...prev,
                [frameData.camera_id]: frameData,
              }));
            } else if (msg.type === "COMPLIANCE_VIOLATION") {
              const v = msg.data;
              setActiveViolations((prev) => [v, ...prev.slice(0, 9)]);
              showToast(
                `🚨 VIOLATION: ${v.rule_name} on ${v.camera_name || v.camera_id}`,
                "error"
              );
            } else if (msg.type === "ASSIGNMENT_SYNC") {
              fetchCameras();
            }
          } catch (err) {
            console.error("WebSocket message parse error:", err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [wsBase, fetchCameras]);

  // ── Canvas Overlay Rendering ───────────────────────────────────────────────
  const renderOverlay = useCallback(
    (cameraId: string) => {
      const canvas = canvasRefs.current[cameraId];
      const video = videoRefs.current[cameraId];
      const detData = liveDetections[cameraId];

      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Match canvas dimensions to display container
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!detData) return;

      const cw = canvas.width;
      const ch = canvas.height;

      const hasViolations = Object.values(detData.rule_states || {}).some(
        (s) => s.status === "VIOLATION"
      );

      // 1. Violation Flash Boundary Highlight
      if (overlays.violations && hasViolations) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, cw - 4, ch - 4);
      }

      // 2. Render Detections
      (detData.detections || []).forEach((entity) => {
        const [nx1, ny1, nx2, ny2] = entity.norm_bbox;
        const x1 = nx1 * cw;
        const y1 = ny1 * ch;
        const x2 = nx2 * cw;
        const y2 = ny2 * ch;
        const bw = x2 - x1;
        const bh = y2 - y1;

        const isPerson = entity.class_name === "person";
        const isHazard = entity.class_name === "fire" || entity.class_name === "smoke";
        const primaryColor = isHazard
          ? "rgba(239, 68, 68, 0.95)"
          : hasViolations
          ? "rgba(245, 158, 11, 0.95)"
          : "rgba(16, 185, 129, 0.95)";

        // A. Trajectory Path Trails
        if (overlays.trajectories && entity.trajectory && entity.trajectory.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
          ctx.lineWidth = 2;
          entity.trajectory.forEach((pt, idx) => {
            const px = (pt[0] / detData.dimensions.width) * cw;
            const py = (pt[1] / detData.dimensions.height) * ch;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }

        // B. Bounding Box Corners
        if (overlays.boxes) {
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 2;
          const cornerLen = Math.min(18, bw / 3, bh / 3);

          // Top-left
          ctx.beginPath();
          ctx.moveTo(x1, y1 + cornerLen);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x1 + cornerLen, y1);
          // Top-right
          ctx.moveTo(x2 - cornerLen, y1);
          ctx.lineTo(x2, y1);
          ctx.lineTo(x2, y1 + cornerLen);
          // Bottom-left
          ctx.moveTo(x1, y2 - cornerLen);
          ctx.lineTo(x1, y2);
          ctx.lineTo(x1 + cornerLen, y2);
          // Bottom-right
          ctx.moveTo(x2 - cornerLen, y2);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x2, y2 - cornerLen);
          ctx.stroke();
        }

        // C. Smart Badges: Class Label & Confidence
        if (overlays.labels) {
          const labelText = `${entity.class_name.toUpperCase()} ${(
            entity.confidence * 100
          ).toFixed(0)}%`;
          ctx.font = "bold 10px monospace";
          const tw = ctx.measureText(labelText).width;

          ctx.fillStyle = primaryColor;
          ctx.fillRect(x1, Math.max(0, y1 - 16), tw + 8, 16);

          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(labelText, x1 + 4, Math.max(12, y1 - 4));
        }

        // D. Persistent Tracking ID Badge & Dwell
        if (overlays.trackIds) {
          const trackText = `#${entity.track_id} (${entity.dwell_seconds}s)`;
          ctx.font = "9px monospace";
          const tw2 = ctx.measureText(trackText).width;

          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(x1, y2 + 2, tw2 + 6, 14);

          ctx.fillStyle = "var(--accent)";
          ctx.fillText(trackText, x1 + 3, y2 + 12);
        }

        // E. 17-Point Pose Skeleton
        if (overlays.pose && entity.keypoints && entity.keypoints.length === 17) {
          ctx.strokeStyle = "rgba(59, 130, 246, 0.85)";
          ctx.lineWidth = 2;

          SKELETON_PAIRS.forEach(([p1, p2]) => {
            const kp1 = entity.keypoints![p1];
            const kp2 = entity.keypoints![p2];
            if (kp1 && kp2 && kp1[2] > 0.25 && kp2[2] > 0.25) {
              const xA = (kp1[0] / detData.dimensions.width) * cw;
              const yA = (kp1[1] / detData.dimensions.height) * ch;
              const xB = (kp2[0] / detData.dimensions.width) * cw;
              const yB = (kp2[1] / detData.dimensions.height) * ch;

              ctx.beginPath();
              ctx.moveTo(xA, yA);
              ctx.lineTo(xB, yB);
              ctx.stroke();
            }
          });

          // Draw keypoint dots
          entity.keypoints.forEach((kp) => {
            if (kp[2] > 0.25) {
              const kx = (kp[0] / detData.dimensions.width) * cw;
              const ky = (kp[1] / detData.dimensions.height) * ch;
              ctx.beginPath();
              ctx.arc(kx, ky, 3, 0, Math.PI * 2);
              ctx.fillStyle = "#38BDF8";
              ctx.fill();
            }
          });
        }
      });

      // 3. Timestamps & Frame Freshness
      if (overlays.timestamps) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(cw - 145, 6, 140, 20);

        ctx.fillStyle = "#A1A1AA";
        ctx.font = "9px monospace";
        const tsStr = new Date(detData.frame_timestamp * 1000).toLocaleTimeString();
        ctx.fillText(`FR #${detData.frame_sequence} | ${tsStr}`, cw - 140, 19);
      }
    },
    [liveDetections, overlays]
  );

  useEffect(() => {
    activeSlotIds.forEach((cid) => {
      renderOverlay(cid);
    });
  }, [liveDetections, activeSlotIds, renderOverlay]);

  // Filtered cameras for sidebar
  const filteredCameras = cameras.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.camera_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ONLINE"
        ? c.is_connected
        : !c.is_connected;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectCamera = (cid: string) => {
    setSelectedCamIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const toggleOverlay = (key: keyof OverlaySettings) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getSlotCount = () => {
    if (gridLayout === "1x1") return 1;
    if (gridLayout === "2x2") return 4;
    return 9;
  };

  const activeCameras = activeSlotIds
    .slice(0, getSlotCount())
    .map((id) => cameras.find((c) => c.camera_id === id) || {
      camera_id: id,
      id,
      name: `Feed ${id}`,
      brand: "generic",
      url: "",
      status: "CONNECTING" as const,
      is_connected: false,
      fps: 0,
      width: 1280,
      height: 720,
      supported_capabilities: ["person", "object"],
      active_rules: [],
      active_rule_count: 0,
      inference_status: "IDLE",
      inference_ms: 0,
      tracked_count: 0,
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ── Top Tactical Toolbar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "14px 20px",
          backgroundColor: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: wsConnected ? "var(--green)" : "var(--red)",
                display: "inline-block",
                boxShadow: wsConnected ? "0 0 8px var(--green)" : "none",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
              {wsConnected ? "REAL-TIME WEBSOCKET ACTIVE" : "CONNECTING TO FEED"}
            </span>
          </div>

          <div style={{ height: "16px", width: "1px", backgroundColor: "var(--border)" }} />

          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Showing <strong>{activeCameras.length}</strong> active streams (
            {cameras.filter((c) => c.is_connected).length} online)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Grid Layout Selector */}
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              padding: "2px",
            }}
          >
            {(["1x1", "2x2", "3x3"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGridLayout(g)}
                style={{
                  padding: "5px 10px",
                  fontSize: "11px",
                  fontWeight: "700",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: gridLayout === g ? "var(--accent)" : "transparent",
                  color: gridLayout === g ? "#FFFFFF" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Overlay Controls Toggle Button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowOverlayMenu((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                backgroundColor: showOverlayMenu ? "var(--accent)" : "var(--bg-surface)",
                color: showOverlayMenu ? "#FFFFFF" : "var(--text-primary)",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <SlidersIcon size={14} />
              Overlay Controls (12)
            </button>

            {/* Overlay Dropdown */}
            {showOverlayMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "38px",
                  width: "280px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  padding: "16px",
                  zIndex: 100,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    paddingBottom: "6px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Real Detection Overlays</span>
                  <button
                    onClick={() => setShowOverlayMenu(false)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>

                {[
                  { key: "boxes", label: "Object Boxes" },
                  { key: "labels", label: "Class & Conf" },
                  { key: "trackIds", label: "Track IDs & Dwell" },
                  { key: "trajectories", label: "Trajectories" },
                  { key: "pose", label: "17-Pt Skeletons" },
                  { key: "violations", label: "Violations Glow" },
                  { key: "zones", label: "Spatial Zones" },
                  { key: "tripwires", label: "Tripwires" },
                  { key: "relations", label: "Relations" },
                  { key: "ruleStatus", label: "Rule Status" },
                  { key: "timestamps", label: "Timestamps" },
                  { key: "masks", label: "Segment Masks" },
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={overlays[item.key as keyof OverlaySettings]}
                      onChange={() => toggleOverlay(item.key as keyof OverlaySettings)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Quick Rule Assignment Button */}
          {onNavigateToAssignments && (
            <button
              onClick={onNavigateToAssignments}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <TargetIcon size={14} />
              Assign Rules
            </button>
          )}
        </div>
      </div>

      {/* ── Main Monitoring Workspace Layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* Left: Registered Camera Explorer Sidebar */}
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
              Registered Cameras ({cameras.length})
            </h4>
            <button
              onClick={fetchCameras}
              title="Refresh Camera Registry"
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <RefreshIcon size={14} />
            </button>
          </div>

          {/* Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          >
            <SearchIcon size={13} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search camera or zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "12px",
                outline: "none",
                width: "100%",
              }}
            />
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: "flex", gap: "6px" }}>
            {(["ALL", "ONLINE", "OFFLINE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: "700",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: statusFilter === s ? "var(--border)" : "transparent",
                  color: statusFilter === s ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Camera List */}
          <div
            style={{
              maxHeight: "560px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {filteredCameras.map((cam) => {
              const isSelected = activeSlotIds.includes(cam.camera_id);
              const det = liveDetections[cam.camera_id];
              const isViolating = Object.values(det?.rule_states || {}).some(
                (r) => r.status === "VIOLATION"
              );

              return (
                <div
                  key={cam.camera_id}
                  onClick={() => {
                    if (activeSlotIds.includes(cam.camera_id)) {
                      setActiveSlotIds((prev) => prev.filter((id) => id !== cam.camera_id));
                    } else {
                      setActiveSlotIds((prev) => [...prev, cam.camera_id]);
                    }
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : "var(--bg-surface)",
                    border: `1px solid ${
                      isViolating
                        ? "var(--red)"
                        : isSelected
                        ? "var(--accent)"
                        : "var(--border)"
                    }`,
                    cursor: "pointer",
                    transition: "var(--transition)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor:
                            cam.status === "ONLINE"
                              ? "var(--green)"
                              : cam.status === "STALE"
                              ? "var(--amber)"
                              : "var(--red)",
                        }}
                      />
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {cam.name}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: "700",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        backgroundColor:
                          cam.status === "ONLINE"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                        color: cam.status === "ONLINE" ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {cam.status}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      marginTop: "6px",
                    }}
                  >
                    <span>ID: <code>{cam.camera_id}</code></span>
                    <span>{cam.fps?.toFixed(0) || 25} FPS</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        padding: "2px 5px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        color: "var(--accent)",
                      }}
                    >
                      {cam.active_rule_count} Rules Active
                    </span>

                    {det?.telemetry && (
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "2px 5px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(245, 158, 11, 0.12)",
                          color: "var(--amber)",
                        }}
                      >
                        {det.telemetry.inference_ms}ms AI
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Video & Synchronized AI Canvas Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              gridLayout === "1x1"
                ? "1fr"
                : gridLayout === "2x2"
                ? "1fr 1fr"
                : "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {activeCameras.map((cam) => {
            const det = liveDetections[cam.camera_id];
            const hasViolations = Object.values(det?.rule_states || {}).some(
              (r) => r.status === "VIOLATION"
            );

            // Stream URL pointing to backend MJPEG streaming gateway
            const streamUrl = `${apiBase.replace(
              "/api/compliance",
              ""
            )}/api/cameras/${cam.camera_id}/stream`;

            return (
              <div
                key={cam.camera_id}
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderRadius: "var(--radius-lg)",
                  border: `1px solid ${
                    hasViolations ? "var(--red)" : "var(--border)"
                  }`,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: hasViolations ? "0 0 16px rgba(239, 68, 68, 0.3)" : "none",
                }}
              >
                {/* Tile Header */}
                <div
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: hasViolations
                      ? "rgba(239, 68, 68, 0.1)"
                      : "var(--bg-surface)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: cam.is_connected ? "var(--green)" : "var(--red)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "var(--text-primary)",
                      }}
                    >
                      {cam.name}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {hasViolations && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "var(--red)",
                          color: "#FFF",
                          animation: "pulse 1.5s infinite",
                        }}
                      >
                        VIOLATION DETECTED
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                      }}
                    >
                      {det?.telemetry?.fps || cam.fps || 25} FPS
                    </span>
                  </div>
                </div>

                {/* Video Container with Overlaid Canvas */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: gridLayout === "1x1" ? "540px" : "280px",
                    backgroundColor: "#050505",
                    overflow: "hidden",
                  }}
                >
                  {/* Live Stream MJPEG Element */}
                  <img
                    ref={(el) => {
                      videoRefs.current[cam.camera_id] = el;
                    }}
                    src={streamUrl}
                    alt={cam.name}
                    onError={(e) => {
                      // Fallback to snapshot if stream reconnecting
                      const target = e.target as HTMLImageElement;
                      target.src = `${apiBase.replace(
                        "/api/compliance",
                        ""
                      )}/api/cameras/${cam.camera_id}/snapshot?t=${Date.now()}`;
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />

                  {/* High-Precision Synchronized Canvas Layer */}
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[cam.camera_id] = el;
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                {/* Tile Footer: Live Telemetry & Rules Summary */}
                <div
                  style={{
                    padding: "8px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "var(--bg-surface)",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  <div>
                    Active Rules:{" "}
                    <strong style={{ color: "var(--text-primary)" }}>
                      {cam.active_rule_count}
                    </strong>{" "}
                    | Tracked Entities:{" "}
                    <strong style={{ color: "var(--accent)" }}>
                      {det?.telemetry?.tracked_entities || 0}
                    </strong>
                  </div>

                  <div>
                    Inference:{" "}
                    <strong style={{ color: "var(--text-secondary)" }}>
                      {det?.telemetry?.inference_ms || 0}ms
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

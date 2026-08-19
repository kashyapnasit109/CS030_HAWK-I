"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import {
  listReferences, ReferenceMeta, resolveStorageUrl,
  listCameras, startCameraDetection, stopCameraDetection,
  getCameraStreamUrl, getCameraSnapshotUrl, CameraInfo,
  addCaseEvidence, getActiveCase, apiFetch
} from "@/lib/api";
import {
  SignalIcon,
  AlertIcon,
  UserIcon,
  LiveIcon,
  FolderIcon,
  ClockIcon,
  CameraIcon,
  CheckIcon,
  ShieldIcon,
  ActivityIcon,
  CloseIcon,
  SearchIcon,
  UploadIcon,
  VideoIcon,
  FilmIcon,
} from "@/components/Icons";

interface AlertItem {
  id: string;
  cameraId: string;
  cameraName: string;
  time: string;
  label: string;
  confidence: number;
  frameUrl?: string;
  tsSec?: number;
  type?: string;
}

interface AvailVideo {
  id: string;
  original_filename: string;
  stored_filename: string;
  duration?: number;
  video_url: string;
  thumbnail_url?: string;
}

export default function LiveTacticalWallPage() {
  const router = useRouter();
  const [refs, setRefs] = useState<ReferenceMeta[]>([]);
  const [selectedRef, setSelectedRef] = useState<ReferenceMeta | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [detectionMode, setDetectionMode] = useState<"face" | "object" | "weapon" | "crowd" | "motion" | "fall" | "blood">("face");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [availableVideos, setAvailableVideos] = useState<AvailVideo[]>([]);
  const [selectedCamSlot, setSelectedCamSlot] = useState<string | null>(null);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [activeCamId, setActiveCamId] = useState<string>("");
  const [pinnedAlerts, setPinnedAlerts] = useState<Set<string>>(new Set());
  const [uploadingModalVideo, setUploadingModalVideo] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Reference Profiles (Suspects)
  const loadRefs = async () => {
    try {
      const r = await listReferences();
      const refList = Array.isArray(r?.references) ? r.references : [];
      setRefs(refList);
      if (refList.length > 0 && !selectedRef) {
        const trump = refList.find((x) => x.label.toLowerCase().includes("trump") || x.id.includes("trump"));
        setSelectedRef(trump || refList[0]);
      }
    } catch {
      setRefs([]);
    }
  };

  // 2. Load Cameras and Available Simulation Videos
  const loadCamerasAndVideos = async () => {
    try {
      const camRes = await listCameras();
      if (camRes?.cameras) {
        setCameras(camRes.cameras);
        if (camRes.cameras.length > 0 && !activeCamId) {
          setActiveCamId(camRes.cameras[0].id || (camRes.cameras[0] as any).camera_id);
        }
      }

      const vRes = await fetch("http://localhost:8001/api/videos/list").then((r) => r.json());
      if (vRes?.videos) {
        const vList = vRes.videos.map((v: any) => ({
          id: v.id,
          original_filename: v.original_filename || v.stored_filename || "Video File",
          stored_filename: v.stored_filename || `${v.id}.mp4`,
          duration: Math.round(v.duration_seconds || 60),
          video_url: v.stored_filename ? `/storage/uploads/${v.stored_filename}` : `/storage/uploads/${v.id}.mp4`,
          thumbnail_url: v.thumbnail_url || null,
        }));
        setAvailableVideos(vList);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRefs();
    loadCamerasAndVideos();
  }, []);

  // 3. Start Live AI Detection across active cameras
  const triggerLiveDetection = useCallback(async (mode: string, refId?: string) => {
    if (cameras.length === 0) return;
    try {
      for (const cam of cameras) {
        await fetch(`http://localhost:8001/api/cameras/${cam.camera_id}/start-detection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            detection_type: mode,
            reference_ids: refId ? [refId] : selectedRef ? [selectedRef.id] : [],
            interval_seconds: 0.8,
          }),
        });
      }
      setIsScanning(true);
      showToast(`LIVE ${mode.toUpperCase()} SCAN ACTIVE. Optical AI HUD rendering directly in streams.`, "success");
    } catch {
      showToast("Error starting detection on camera feeds", "error");
    }
  }, [cameras, selectedRef]);

  // Restart detection when mode or suspect changes
  useEffect(() => {
    if (cameras.length > 0 && isScanning) {
      triggerLiveDetection(detectionMode, selectedRef?.id);
    }
  }, [detectionMode, selectedRef, cameras.length]);

  // 4. Poll Live Alerts
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("http://localhost:8001/api/cameras/alerts/all?since=0").then((r) => r.json());
        if (res?.alerts && res.alerts.length > 0) {
          const formatted = res.alerts.slice(-30).reverse().map((a: any) => ({
            id: a.id,
            cameraId: a.camera_id,
            cameraName: a.camera_name || a.camera_id,
            time: a.timestamp_str || "Now",
            label: a.detections?.[0]?.label || "Live Target Sighting",
            confidence: a.detections?.[0]?.confidence || 0.85,
            frameUrl: a.snapshot_url,
            type: a.detections?.[0]?.type || "detection",
          }));
          setAlerts(formatted);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  // 5. Change Video Source / Simulate Video on a Camera Channel
  const handleSetCameraSource = async (cameraId: string, videoUrl: string, videoName: string) => {
    try {
      await fetch(`http://localhost:8001/api/cameras/${cameraId}/set-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: videoUrl, source_name: videoName }),
      });
      showToast(`Camera ${cameraId} source switched to: ${videoName}`, "success");
      setSourceModalOpen(false);
      loadCamerasAndVideos();
      triggerLiveDetection(detectionMode, selectedRef?.id);
    } catch {
      showToast("Failed to switch video source", "error");
    }
  };

  const handleModalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCamSlot) return;

    setUploadingModalVideo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("camera_id", selectedCamSlot);

      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch("http://localhost:8001/api/videos/upload", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      showToast(`Video '${file.name}' uploaded successfully!`, "success");

      const newUrl = data.stored_filename ? `/storage/uploads/${data.stored_filename}` : `/storage/uploads/${data.id}.mp4`;
      handleSetCameraSource(selectedCamSlot, newUrl, file.name);
    } catch (err: any) {
      showToast(err.message || "Failed to upload video", "error");
    } finally {
      setUploadingModalVideo(false);
      if (modalFileInputRef.current) modalFileInputRef.current.value = "";
    }
  };

  const handleStopDetection = async () => {
    for (const cam of cameras) {
      try {
        await fetch(`http://localhost:8001/api/cameras/${cam.camera_id}/stop-detection`, { method: "POST" });
      } catch {}
    }
    setIsScanning(false);
    showToast("Live detection paused across all channels", "info");
  };

  return (
    <ToastProvider>
      <AppLayout>
        {/* PALANTIR GOTHAM TOP TACTICAL CONTROL BAR */}
        <div
          style={{
            background: "linear-gradient(90deg, #0A0F1D 0%, #05080E 100%)",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: "10px",
            padding: "12px 20px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(59,130,246,0.06)",
          }}
        >
          {/* Mode Selector Pill Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#60A5FA", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", marginRight: 6 }}>
              AI SCAN MODE:
            </span>

            {[
              { id: "face", label: "Face Re-ID" },
              { id: "object", label: "Object & Vehicle" },
              { id: "weapon", label: "Weapon & Threat" },
              { id: "crowd", label: "Crowd Counter" },
              { id: "motion", label: "Motion Tracking" },
              { id: "fall", label: "Fall Detection" },
              { id: "blood", label: "Hazard / Blood" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setDetectionMode(m.id as any);
                  triggerLiveDetection(m.id, selectedRef?.id);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono, monospace",
                  cursor: "pointer",
                  background: detectionMode === m.id ? "var(--accent)" : "rgba(255,255,255,0.04)",
                  color: detectionMode === m.id ? "#FFFFFF" : "var(--text-muted)",
                  border: `1px solid ${detectionMode === m.id ? "#3B82F6" : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.15s ease",
                  boxShadow: detectionMode === m.id ? "0 2px 12px rgba(59,130,246,0.4)" : "none",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isScanning ? (
              <button
                onClick={handleStopDetection}
                className="btn btn-secondary btn-sm"
                style={{ background: "rgba(239,68,68,0.15)", borderColor: "#EF4444", color: "#EF4444", fontWeight: 800 }}
              >
                <AlertIcon size={14} /> Pause Live AI Scan
              </button>
            ) : (
              <button
                onClick={() => triggerLiveDetection(detectionMode, selectedRef?.id)}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800 }}
              >
                <LiveIcon size={14} /> Resume Live AI Scan
              </button>
            )}
          </div>
        </div>

        {/* MAIN LAYOUT: 4-CAMERA GRID + RIGHT TACTICAL SIDEBAR */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "16px", alignItems: "start" }}>
          {/* CAMERA STREAMS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
            {cameras.map((cam, idx) => {
              const camId = cam.id || (cam as any).camera_id || `cam-${idx}`;
              const streamUrl = `http://localhost:8001/api/cameras/${camId}/stream`;
              const isSelected = activeCamId === camId;

              return (
                <div
                  key={`${camId}-${idx}`}
                  onClick={() => setActiveCamId(camId)}
                  style={{
                    background: "#080C16",
                    border: `1px solid ${isSelected ? "#3B82F6" : "rgba(59,130,246,0.18)"}`,
                    borderRadius: "10px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: isSelected ? "0 8px 30px rgba(59,130,246,0.18)" : "0 4px 20px rgba(0,0,0,0.6)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Camera Header Bar */}
                  <div
                    style={{
                      padding: "8px 14px",
                      background: "rgba(10,15,29,0.9)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", animation: "pulse 1.5s infinite" }} />
                      <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#FFFFFF" }}>{cam.name}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Video Simulation Switcher Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCamSlot(camId);
                          setSourceModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "0.68rem", padding: "2px 8px", color: "#60A5FA" }}
                        title="Simulate video or switch RTSP source"
                      >
                        Source: {cam.url.includes("trump") ? "Trump Speech" : cam.url.includes("subway") ? "Subway Feed" : "CCTV Feed"} ▾
                      </button>
                      <span className="badge badge-green" style={{ fontSize: "0.6rem" }}>LIVE</span>
                    </div>
                  </div>

                  {/* Video Stream Container */}
                  <div style={{ position: "relative", width: "100%", height: 260, background: "#000000" }}>
                    <img
                      src={streamUrl}
                      alt={cam.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `http://localhost:8001/api/cameras/${cam.camera_id}/snapshot`;
                      }}
                    />

                    {/* HUD Tactical Watermark */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 10,
                        fontSize: "0.65rem",
                        fontFamily: "JetBrains Mono, monospace",
                        color: "rgba(255,255,255,0.7)",
                        background: "rgba(0,0,0,0.6)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      OPTICAL AI ENGINE · {detectionMode.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT TACTICAL SIDEBAR: SUSPECT TARGET SELECTOR & REAL-TIME ALERTS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 1. SUSPECT TARGET SELECTOR CARD */}
            <div className="card" style={{ padding: 16, background: "#080C16" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#60A5FA", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Target Suspect Dossier (Face Re-ID)
              </div>

              {/* Suspect Dropdown */}
              <div style={{ marginBottom: 12 }}>
                <select
                  value={selectedRef?.id || ""}
                  onChange={(e) => {
                    const r = refs.find((x) => x.id === e.target.value);
                    if (r) {
                      setSelectedRef(r);
                      triggerLiveDetection(detectionMode, r.id);
                      showToast(`Active Target switched to: ${r.label}`, "info");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-elevated)",
                    color: "#FFFFFF",
                    border: "1px solid rgba(59,130,246,0.3)",
                    borderRadius: 6,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    outline: "none",
                  }}
                >
                  {refs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Suspect Photo & Vector Info */}
              {selectedRef && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", background: "rgba(0,0,0,0.4)", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ position: "relative", width: 68, height: 68, borderRadius: 6, overflow: "hidden", border: "1px solid #3B82F6", flexShrink: 0 }}>
                    <img
                      src={resolveStorageUrl(selectedRef.image_url || "")}
                      alt={selectedRef.label}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#FFFFFF" }}>{selectedRef.label}</div>
                    <div style={{ fontSize: "0.68rem", color: "#94A3B8", marginTop: 2 }}>512-D FaceNet Embedding Active</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--green)", marginTop: 4, fontWeight: 700 }}>● MATCH THRESHOLD: 0.45</div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. REAL-TIME TACTICAL ALERTS FEED */}
            <div className="card" style={{ padding: 16, background: "#080C16", display: "flex", flexDirection: "column", gap: 10, maxHeight: 440, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#60A5FA", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Live Sightings & Alert Feed ({alerts.length})
                </span>
                <span className="badge badge-red" style={{ fontSize: "0.6rem" }}>STREAMING</span>
              </div>

              {alerts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  Scanning live feeds. Sightings will appear here instantly.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.map((al, aIdx) => (
                    <div
                      key={`${al.id || 'alert'}-${aIdx}`}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 6,
                        padding: "8px 10px",
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      {al.frameUrl && (
                        <img
                          src={al.frameUrl}
                          alt="alert snapshot"
                          style={{ width: 44, height: 44, borderRadius: 4, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {al.label}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          {al.cameraName} · {al.time}
                        </div>
                      </div>
                      <span className="badge badge-green" style={{ fontSize: "0.65rem", fontWeight: 800 }}>
                        {(al.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIMULATE VIDEO SOURCE SELECTOR MODAL */}
        {sourceModalOpen && selectedCamSlot && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                background: "#0A0F1D",
                border: "1px solid #3B82F6",
                borderRadius: 12,
                maxWidth: 580,
                width: "100%",
                padding: 24,
                boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                  <VideoIcon size={18} style={{ color: "#3B82F6" }} />
                  Select or Upload Simulation Video for Channel {selectedCamSlot}
                </h3>
                <button onClick={() => setSourceModalOpen(false)} className="btn btn-ghost btn-sm">
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Direct Video Upload Dropzone */}
              <div
                style={{
                  border: "1px dashed rgba(59,130,246,0.5)",
                  borderRadius: 8,
                  padding: 14,
                  textAlign: "center",
                  background: "rgba(59,130,246,0.04)",
                  marginBottom: 16,
                }}
              >
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleModalUpload}
                  style={{ display: "none" }}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <UploadIcon size={20} style={{ color: "#3B82F6" }} />
                  <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#FFFFFF" }}>
                    {uploadingModalVideo ? "Uploading Video..." : "Upload New Video File (.mp4, .avi, .mov)"}
                  </span>
                  <button
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={uploadingModalVideo}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 4, fontWeight: 800, color: "#60A5FA" }}
                  >
                    {uploadingModalVideo ? "Uploading..." : "Browse Local Video"}
                  </button>
                </div>
              </div>

              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                OR SELECT INGESTED VIDEO ARCHIVE ({availableVideos.length} Available)
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto", marginBottom: 18 }}>
                {availableVideos.map((v, vIdx) => (
                  <div
                    key={`${v.id || 'video'}-${vIdx}`}
                    onClick={() => handleSetCameraSource(selectedCamSlot, v.video_url, v.original_filename)}
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 6,
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)")}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#FFFFFF" }}>{v.original_filename}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Duration: {v.duration}s · File: {v.video_url}</div>
                    </div>
                    <span className="badge badge-blue">SELECT</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setSourceModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ToastProvider>
  );
}

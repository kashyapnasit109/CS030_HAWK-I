"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import {
  listReferences, ReferenceMeta, resolveStorageUrl,
  listCameras, startCameraDetection, stopCameraDetection,
  CameraInfo, addCaseEvidence, getActiveCase
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
  SlidersIcon,
  SparklesIcon,
  PlayIcon,
  GridIcon,
  TargetIcon,
  ShieldCheckIcon,
  MaximizeIcon,
  DownloadIcon,
} from "@/components/Icons";

const BASE_URL = "http://localhost:8000";

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

type GridLayout = "2x2" | "3x3" | "1x1" | "1+5";

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
  const [addCameraModalOpen, setAddCameraModalOpen] = useState(false);
  const [activeCamId, setActiveCamId] = useState<string>("");
  const [gridLayout, setGridLayout] = useState<GridLayout>("2x2");
  const [pinnedAlerts, setPinnedAlerts] = useState<Set<string>>(new Set());
  const [uploadingModalVideo, setUploadingModalVideo] = useState(false);
  const [streamErrorMap, setStreamErrorMap] = useState<Record<string, boolean>>({});
  const [activeCase, setActiveCase] = useState<{ id: string | null; number: string | null }>({ id: null, number: null });
  const [sourceModalTab, setSourceModalTab] = useState<"uploaded" | "rtsp" | "upload">("uploaded");
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // New Camera Form State
  const [newCamName, setNewCamName] = useState("");
  const [newCamUrl, setNewCamUrl] = useState("");
  const [newCamBrand, setNewCamBrand] = useState("generic");
  const [newCamUser, setNewCamUser] = useState("admin");
  const [newCamPass, setNewCamPass] = useState("admin");

  // RTSP Manual URL State for Source Switcher
  const [manualRtspUrl, setManualRtspUrl] = useState("");

  // Sync active case
  useEffect(() => {
    const sync = () => setActiveCase(getActiveCase());
    sync();
    window.addEventListener("activeCaseChanged", sync);
    return () => window.removeEventListener("activeCaseChanged", sync);
  }, []);

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

  // 2. Load Cameras and Available Uploaded Videos
  const loadCamerasAndVideos = async () => {
    try {
      const camRes = await listCameras();
      if (camRes?.cameras && camRes.cameras.length > 0) {
        setCameras(camRes.cameras);
        if (!activeCamId) {
          setActiveCamId(camRes.cameras[0].id || (camRes.cameras[0] as any).camera_id);
        }
      } else {
        // Trigger default seeding if empty
        const resetRes = await fetch(`${BASE_URL}/api/cameras/reset-defaults`, { method: "POST" }).then((r) => r.json());
        if (resetRes?.cameras) {
          setCameras(resetRes.cameras);
          if (!activeCamId && resetRes.cameras.length > 0) {
            setActiveCamId(resetRes.cameras[0].id);
          }
        }
      }

      // Load uploaded videos
      const vRes = await fetch(`${BASE_URL}/api/cameras/videos/available`).then((r) => r.json());
      if (vRes?.videos) {
        const vList = vRes.videos.map((v: any) => ({
          id: v.id || v.stored_filename?.replace(".mp4", ""),
          original_filename: v.original_filename || v.stored_filename || "CCTV Ingested Video",
          stored_filename: v.stored_filename || `${v.id}.mp4`,
          duration: Math.round(v.duration_seconds || 60),
          video_url: v.video_url || (v.stored_filename ? `/storage/uploads/${v.stored_filename}` : `/storage/uploads/${v.id}.mp4`),
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
        const cId = cam.id || (cam as any).camera_id;
        await fetch(`${BASE_URL}/api/cameras/${cId}/start-detection`, {
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
    } catch {
      console.warn("Could not start detection on some feeds");
    }
  }, [cameras, selectedRef]);

  // Restart detection when mode or suspect changes
  useEffect(() => {
    if (cameras.length > 0 && isScanning) {
      triggerLiveDetection(detectionMode, selectedRef?.id);
    }
  }, [detectionMode, selectedRef, cameras.length, isScanning, triggerLiveDetection]);

  // 4. Poll Live Alerts
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/cameras/alerts/all?since=0`).then((r) => r.json());
        if (res?.alerts && res.alerts.length > 0) {
          const formatted = res.alerts.slice(-30).reverse().map((a: any) => ({
            id: a.id,
            cameraId: a.camera_id,
            cameraName: a.camera_name || a.camera_id,
            time: a.timestamp_str || "Live",
            label: a.detections?.[0]?.label || "Live Target Sighting",
            confidence: a.detections?.[0]?.confidence || 0.85,
            frameUrl: a.snapshot_url ? resolveStorageUrl(a.snapshot_url) : undefined,
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
      await fetch(`${BASE_URL}/api/cameras/${cameraId}/set-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: videoUrl, source_name: videoName }),
      });
      showToast(`Channel ${cameraId} source switched to: ${videoName} (Looping Active)`, "success");
      setSourceModalOpen(false);
      // Clear error state for this camera
      setStreamErrorMap((prev) => ({ ...prev, [cameraId]: false }));
      await loadCamerasAndVideos();
      triggerLiveDetection(detectionMode, selectedRef?.id);
    } catch {
      showToast("Failed to switch video source", "error");
    }
  };

  // 6. Direct Video Upload to Channel
  const handleModalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCamSlot) return;

    setUploadingModalVideo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("camera_id", selectedCamSlot);

      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch(`${BASE_URL}/api/videos/upload`, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      showToast(`Video '${file.name}' uploaded and assigned to ${selectedCamSlot} on continuous loop!`, "success");

      const newUrl = data.stored_filename ? `/storage/uploads/${data.stored_filename}` : `/storage/uploads/${data.id}.mp4`;
      handleSetCameraSource(selectedCamSlot, newUrl, file.name);
    } catch (err: any) {
      showToast(err.message || "Failed to upload video", "error");
    } finally {
      setUploadingModalVideo(false);
      if (modalFileInputRef.current) modalFileInputRef.current.value = "";
    }
  };

  // 7. Reset Default CCTV Channels
  const handleResetDefaults = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/cameras/reset-defaults`, { method: "POST" }).then((r) => r.json());
      if (res?.cameras) {
        setCameras(res.cameras);
        setStreamErrorMap({});
        showToast("Reset 4 default CCTV feeds with continuous multi-channel loop", "success");
        triggerLiveDetection(detectionMode, selectedRef?.id);
      }
    } catch {
      showToast("Failed to reset default feeds", "error");
    }
  };

  // 8. Add New IP Camera / Channel
  const handleAddNewCamera = async () => {
    if (!newCamUrl.trim()) {
      showToast("Please enter an RTSP / HTTP URL or local video path", "error");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/cameras/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newCamUrl.trim(),
          name: newCamName.trim() || `CCTV Channel ${cameras.length + 1}`,
          brand: newCamBrand,
          username: newCamUser,
          password: newCamPass,
        }),
      }).then((r) => r.json());

      if (res?.camera) {
        showToast(`Added camera: ${res.camera.name}`, "success");
        setAddCameraModalOpen(false);
        setNewCamName("");
        setNewCamUrl("");
        loadCamerasAndVideos();
      }
    } catch {
      showToast("Failed to add camera feed", "error");
    }
  };

  const handleStopDetection = async () => {
    for (const cam of cameras) {
      const cId = cam.id || (cam as any).camera_id;
      try {
        await fetch(`${BASE_URL}/api/cameras/${cId}/stop-detection`, { method: "POST" });
      } catch {}
    }
    setIsScanning(false);
    showToast("Live detection paused across all channels", "info");
  };

  // 9. Pin alert to active case
  const handlePinAlert = async (alert: AlertItem) => {
    if (!activeCase.id) {
      showToast("Select an active case from the top bar first to pin evidence", "error");
      return;
    }
    try {
      await addCaseEvidence(activeCase.id, {
        kind: "face",
        label: alert.label,
        summary: `Live AI Sighting: ${alert.label} on ${alert.cameraName} at ${alert.time}`,
        source_label: alert.cameraName,
        timestamp_seconds: Date.now() / 1000,
        confidence: alert.confidence,
        thumb_url: alert.frameUrl,
        meta_json: JSON.stringify({ live_alert_id: alert.id, detection_mode: detectionMode }),
      });
      setPinnedAlerts((prev) => new Set(prev).add(alert.id));
      showToast(`Pinned evidence to Case ${activeCase.number || activeCase.id}`, "success");
    } catch (err: any) {
      showToast("Failed to pin evidence to case", "error");
    }
  };

  // Helper to get camera video URL fallback for direct HTML5 video loop
  const getCameraVideoSrc = (cam: CameraInfo): string => {
    const u = cam.url || "";
    if (u.startsWith("/storage/uploads/")) return resolveStorageUrl(u);
    if (u.includes("storage/uploads/")) {
      const fn = u.split("storage/uploads/").pop();
      return resolveStorageUrl(`/storage/uploads/${fn}`);
    }
    if (u.includes("uploads\\")) {
      const fn = u.split("uploads\\").pop();
      return resolveStorageUrl(`/storage/uploads/${fn}`);
    }
    return resolveStorageUrl("/storage/uploads/subway.mp4");
  };

  return (
    <ToastProvider>
      <AppLayout>
        {/* TOP TACTICAL CONTROL BAR */}
        <div
          style={{
            background: "linear-gradient(90deg, #0A0F1D 0%, #05080E 100%)",
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: "10px",
            padding: "12px 18px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(59,130,246,0.06)",
          }}
        >
          {/* Mode Selector Pill Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#60A5FA", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", marginRight: 4 }}>
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
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
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

          {/* Grid Layout Switcher & Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Grid Layout Buttons */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", padding: 2, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["2x2", "3x3", "1+5", "1x1"] as const).map((gl) => (
                <button
                  key={gl}
                  onClick={() => setGridLayout(gl)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: gridLayout === gl ? "var(--accent)" : "transparent",
                    color: gridLayout === gl ? "#FFFFFF" : "var(--text-muted)",
                    border: "none",
                  }}
                  title={`Switch to ${gl} layout`}
                >
                  {gl}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAddCameraModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
            >
              <CameraIcon size={12} /> + Add Feed
            </button>

            <button
              onClick={handleResetDefaults}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "0.72rem", fontWeight: 700, color: "#60A5FA" }}
              title="Reset to 4 default CCTV loop feeds"
            >
              Reset Feeds
            </button>

            {isScanning ? (
              <button
                onClick={handleStopDetection}
                className="btn btn-secondary btn-sm"
                style={{ background: "rgba(239,68,68,0.15)", borderColor: "#EF4444", color: "#EF4444", fontWeight: 800, fontSize: "0.72rem" }}
              >
                <AlertIcon size={12} /> Pause AI Scan
              </button>
            ) : (
              <button
                onClick={() => triggerLiveDetection(detectionMode, selectedRef?.id)}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800, fontSize: "0.72rem" }}
              >
                <LiveIcon size={12} /> Resume AI Scan
              </button>
            )}
          </div>
        </div>

        {/* MAIN LAYOUT: MULTI-CAMERA GRID + RIGHT TACTICAL SIDEBAR */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px", alignItems: "start" }}>
          {/* CAMERA STREAMS GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                gridLayout === "1x1"
                  ? "1fr"
                  : gridLayout === "3x3"
                  ? "repeat(3, 1fr)"
                  : gridLayout === "1+5"
                  ? "repeat(3, 1fr)"
                  : "repeat(2, 1fr)",
              gap: "14px",
            }}
          >
            {cameras.map((cam, idx) => {
              const camId = cam.id || (cam as any).camera_id || `cam-${idx + 1}`;
              const isSelected = activeCamId === camId;
              const streamUrl = `${BASE_URL}/api/cameras/${camId}/stream?t=${Date.now()}`;
              const videoSrc = getCameraVideoSrc(cam);
              const isErrored = streamErrorMap[camId] || false;

              // 1+5 primary feature cell style
              const isHeroCell = gridLayout === "1+5" && idx === 0;

              return (
                <div
                  key={`${camId}-${idx}`}
                  onClick={() => setActiveCamId(camId)}
                  style={{
                    gridColumn: isHeroCell ? "span 2" : "span 1",
                    gridRow: isHeroCell ? "span 2" : "span 1",
                    background: "#080C16",
                    border: `1px solid ${isSelected ? "#3B82F6" : "rgba(59,130,246,0.18)"}`,
                    borderRadius: "10px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: isSelected ? "0 8px 30px rgba(59,130,246,0.22)" : "0 4px 20px rgba(0,0,0,0.6)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Camera Header Bar */}
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(10,15,29,0.95)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
                      <span style={{ fontWeight: 800, fontSize: "0.80rem", color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cam.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {/* Video Source Switcher Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCamSlot(camId);
                          setSourceModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 8px",
                          color: "#60A5FA",
                          background: "rgba(59,130,246,0.12)",
                          border: "1px solid rgba(59,130,246,0.3)",
                          fontWeight: 700,
                        }}
                        title="Choose uploaded video to loop, or enter real IP camera stream"
                      >
                        Source ▾
                      </button>

                      <span
                        className="badge badge-green"
                        style={{ fontSize: "0.58rem", padding: "1px 5px", display: "flex", alignItems: "center", gap: 3 }}
                        title="Continuous Seamless Video Looping Active"
                      >
                        <span style={{ color: "#34D399" }}>♾️</span> LOOP
                      </span>
                    </div>
                  </div>

                  {/* Video Stream Container with Dual Engine (MJPEG Stream + HTML5 Loop Video Fallback) */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: isHeroCell ? 480 : gridLayout === "1x1" ? 540 : 250,
                      background: "#000000",
                      overflow: "hidden",
                    }}
                  >
                    {!isErrored ? (
                      <img
                        src={streamUrl}
                        alt={cam.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={() => {
                          // Switch to HTML5 looped video playback fallback
                          setStreamErrorMap((prev) => ({ ...prev, [camId]: true }));
                        }}
                      />
                    ) : (
                      <video
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    )}

                    {/* Top Right Quick Source Pill */}
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(0,0,0,0.75)",
                        backdropFilter: "blur(4px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontSize: "0.60rem",
                        fontFamily: "JetBrains Mono, monospace",
                        color: "#93C5FD",
                      }}
                    >
                      {cam.url.includes("subway")
                        ? "Subway Concourse"
                        : cam.url.includes("5638efce")
                        ? "Main Lobby"
                        : cam.url.includes("f724299b")
                        ? "Campus Quad"
                        : cam.url.includes("00289bcb")
                        ? "Perimeter Threat"
                        : cam.url.startsWith("rtsp://")
                        ? "RTSP IP Camera"
                        : cam.url === "0"
                        ? "Local Webcam"
                        : "Uploaded CCTV Video"}
                    </div>

                    {/* HUD Tactical Watermark */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        fontSize: "0.62rem",
                        fontFamily: "JetBrains Mono, monospace",
                        color: "rgba(255,255,255,0.85)",
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60A5FA" }} />
                      OPTICAL AI HUD · {detectionMode.toUpperCase()} · 25 FPS
                    </div>

                    {/* Top Left Sighting Badge if Alert Matches Camera */}
                    {alerts.find((a) => a.cameraId === camId) && (
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          background: "rgba(239,68,68,0.9)",
                          border: "1px solid #EF4444",
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: "0.65rem",
                          fontWeight: 900,
                          color: "#FFFFFF",
                          boxShadow: "0 0 12px rgba(239,68,68,0.8)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <TargetIcon size={12} /> SIGHTING ACTIVE
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT TACTICAL SIDEBAR: SUSPECT TARGET SELECTOR & REAL-TIME ALERTS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 1. SUSPECT TARGET SELECTOR CARD */}
            <div className="card" style={{ padding: 16, background: "#080C16", border: "1px solid rgba(59,130,246,0.2)" }}>
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
                  <div style={{ position: "relative", width: 64, height: 64, borderRadius: 6, overflow: "hidden", border: "1px solid #3B82F6", flexShrink: 0 }}>
                    <img
                      src={resolveStorageUrl(selectedRef.image_url || "")}
                      alt={selectedRef.label}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#FFFFFF" }}>{selectedRef.label}</div>
                    <div style={{ fontSize: "0.68rem", color: "#94A3B8", marginTop: 2 }}>512-D FaceNet Vector Model</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--green)", marginTop: 4, fontWeight: 700 }}>● MATCH THRESHOLD: 0.45</div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. REAL-TIME TACTICAL ALERTS FEED */}
            <div className="card" style={{ padding: 16, background: "#080C16", border: "1px solid rgba(59,130,246,0.2)", display: "flex", flexDirection: "column", gap: 10, maxHeight: 460, overflowY: "auto" }}>
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
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span className="badge badge-green" style={{ fontSize: "0.62rem", fontWeight: 800 }}>
                          {(al.confidence * 100).toFixed(0)}%
                        </span>
                        <button
                          onClick={() => handlePinAlert(al)}
                          disabled={pinnedAlerts.has(al.id)}
                          style={{
                            fontSize: "0.60rem",
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: pinnedAlerts.has(al.id) ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.15)",
                            color: pinnedAlerts.has(al.id) ? "#4ADE80" : "#60A5FA",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {pinnedAlerts.has(al.id) ? "✓ Pinned" : "+ Pin Case"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SOURCE SWITCHER & LOOP VIDEO SELECTOR MODAL ── */}
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
            onClick={() => setSourceModalOpen(false)}
          >
            <div
              style={{
                background: "#0A0F1D",
                border: "1px solid #3B82F6",
                borderRadius: 14,
                maxWidth: 620,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 24px 80px rgba(0,0,0,0.95), 0 0 40px rgba(59,130,246,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(15,23,42,0.9) 100%)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 900, margin: 0, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                    <VideoIcon size={18} style={{ color: "#3B82F6" }} />
                    Configure Feed for Channel {selectedCamSlot}
                  </h3>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Choose an uploaded video to put on continuous loop, or connect a real RTSP / IP camera feed.
                  </div>
                </div>
                <button onClick={() => setSourceModalOpen(false)} className="btn btn-ghost btn-sm" style={{ color: "var(--text-muted)" }}>
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Source Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.4)" }}>
                {[
                  { id: "uploaded", label: `🎬 Uploaded Video Library (${availableVideos.length})` },
                  { id: "rtsp", label: "📹 Real RTSP / IP Camera / Webcam" },
                  { id: "upload", label: "📤 Upload New Video File" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSourceModalTab(t.id as any)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      fontSize: "0.76rem",
                      fontWeight: sourceModalTab === t.id ? 800 : 500,
                      background: sourceModalTab === t.id ? "rgba(59,130,246,0.15)" : "transparent",
                      borderBottom: `2px solid ${sourceModalTab === t.id ? "#3B82F6" : "transparent"}`,
                      color: sourceModalTab === t.id ? "#60A5FA" : "var(--text-muted)",
                      borderTop: "none",
                      borderLeft: "none",
                      borderRight: "none",
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Uploaded Video Library */}
              {sourceModalTab === "uploaded" && (
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      Select video to stream on continuous infinite loop:
                    </span>
                    <span className="badge badge-green" style={{ fontSize: "0.62rem" }}>
                      ♾️ INFINITE LOOP ACTIVE
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                    {availableVideos.map((v, vIdx) => (
                      <div
                        key={`${v.id || 'video'}-${vIdx}`}
                        onClick={() => handleSetCameraSource(selectedCamSlot, v.video_url, v.original_filename)}
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid rgba(59,130,246,0.2)",
                          borderRadius: 8,
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
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
                            <FilmIcon size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#FFFFFF" }}>{v.original_filename}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                              Duration: ~{v.duration}s · File: {v.stored_filename}
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: "0.72rem", fontWeight: 800 }}
                        >
                          Play on Loop ♾️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Real RTSP / IP Camera / Webcam */}
              {sourceModalTab === "rtsp" && (
                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                      RTSP / HTTP Stream URL or Webcam Device Index:
                    </label>
                    <input
                      className="input-field"
                      placeholder="rtsp://admin:password@192.168.1.100:554/stream1 or 0 (Webcam)"
                      value={manualRtspUrl}
                      onChange={(e) => setManualRtspUrl(e.target.value)}
                      style={{ width: "100%", fontSize: "0.8rem" }}
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div>
                    <div style={{ fontSize: "0.70rem", color: "var(--text-muted)", marginBottom: 6 }}>
                      Quick Brand Presets:
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[
                        { label: "Local Webcam (0)", val: "0" },
                        { label: "Hikvision Preset", val: "rtsp://admin:admin@192.168.1.64:554/Streaming/Channels/101" },
                        { label: "Dahua Preset", val: "rtsp://admin:admin@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0" },
                        { label: "Reolink Preset", val: "rtsp://admin:admin@192.168.1.50:554/h264Preview_01_main" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setManualRtspUrl(preset.val)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: "0.68rem",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#93C5FD",
                            cursor: "pointer",
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button
                      onClick={() => handleSetCameraSource(selectedCamSlot, manualRtspUrl, `IP Camera (${manualRtspUrl})`)}
                      disabled={!manualRtspUrl.trim()}
                      className="btn btn-primary btn-sm"
                      style={{ fontWeight: 800 }}
                    >
                      Connect Stream
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Direct Video Upload */}
              {sourceModalTab === "upload" && (
                <div style={{ padding: "18px 20px" }}>
                  <div
                    style={{
                      border: "2px dashed rgba(59,130,246,0.4)",
                      borderRadius: 10,
                      padding: 24,
                      textAlign: "center",
                      background: "rgba(59,130,246,0.04)",
                    }}
                  >
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleModalUpload}
                      style={{ display: "none" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
                        <UploadIcon size={24} />
                      </div>
                      <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#FFFFFF" }}>
                        {uploadingModalVideo ? "Uploading & Ingesting Video..." : "Upload New CCTV Video File"}
                      </span>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 8px" }}>
                        MP4, AVI, or MOV format · Automatically transcoded and put on continuous loop
                      </p>
                      <button
                        onClick={() => modalFileInputRef.current?.click()}
                        disabled={uploadingModalVideo}
                        className="btn btn-primary btn-sm"
                        style={{ fontWeight: 800 }}
                      >
                        {uploadingModalVideo ? "Processing..." : "Browse Video File"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setSourceModalOpen(false)} className="btn btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD NEW CAMERA / CHANNEL MODAL ── */}
        {addCameraModalOpen && (
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
            onClick={() => setAddCameraModalOpen(false)}
          >
            <div
              style={{
                background: "#0A0F1D",
                border: "1px solid #3B82F6",
                borderRadius: 14,
                maxWidth: 500,
                width: "100%",
                padding: 24,
                boxShadow: "0 24px 80px rgba(0,0,0,0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 900, margin: 0, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                  <CameraIcon size={18} style={{ color: "#3B82F6" }} />
                  Add New CCTV Channel / Stream
                </h3>
                <button onClick={() => setAddCameraModalOpen(false)} className="btn btn-ghost btn-sm">
                  <CloseIcon size={16} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Channel / Camera Name:</span>
                  <input
                    className="input-field"
                    placeholder="e.g. CAM-05 · Server Room Corridor"
                    value={newCamName}
                    onChange={(e) => setNewCamName(e.target.value)}
                    style={{ width: "100%", fontSize: "0.78rem" }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Stream URL or Video File:</span>
                  <input
                    className="input-field"
                    placeholder="rtsp://... or /storage/uploads/subway.mp4 or 0"
                    value={newCamUrl}
                    onChange={(e) => setNewCamUrl(e.target.value)}
                    style={{ width: "100%", fontSize: "0.78rem" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Manufacturer Brand:</span>
                    <select
                      className="input-field"
                      value={newCamBrand}
                      onChange={(e) => setNewCamBrand(e.target.value)}
                      style={{ width: "100%", fontSize: "0.78rem" }}
                    >
                      <option value="generic">Generic RTSP / HTTP</option>
                      <option value="hikvision">Hikvision</option>
                      <option value="dahua">Dahua</option>
                      <option value="reolink">Reolink</option>
                      <option value="axis">Axis</option>
                      <option value="uniview">Uniview</option>
                      <option value="webcam">Local USB Webcam</option>
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Auth Username:</span>
                    <input
                      className="input-field"
                      value={newCamUser}
                      onChange={(e) => setNewCamUser(e.target.value)}
                      style={{ width: "100%", fontSize: "0.78rem" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                  <button onClick={() => setAddCameraModalOpen(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button onClick={handleAddNewCamera} className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    Register & Start Stream
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ToastProvider>
  );
}

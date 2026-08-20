"use client";

import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { VideoIcon, PlayIcon, PauseIcon, ClockIcon, CameraIcon, FolderIcon, ShieldIcon, CheckIcon, SearchIcon } from "@/components/Icons";

const videoSegments = [
  { id: "seg1", label: "Trump Remarks Archive (Village)", url: "http://localhost:8000/storage/uploads/trump_speech.mp4" },
  { id: "seg2", label: "Subway Concourse 1080p Stream", url: "http://localhost:8000/storage/uploads/subway.mp4" },
];

export default function PlaybackTacticalPage() {
  const [selectedCamera, setSelectedCamera] = useState("CAM-01");
  const [selectedDate, setSelectedDate] = useState("2026-08-19");
  const [currentTimeSec, setCurrentTimeSec] = useState(32400); // 09:00:00 AM
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [syncMultiCam, setSyncMultiCam] = useState(false);
  const [magnifierActive, setMagnifierActive] = useState(false);
  const [clipInSec, setClipInSec] = useState<number | null>(null);
  const [clipOutSec, setClipOutSec] = useState<number | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(videoSegments[0].url);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeSec((prev) => {
        const next = prev + playbackSpeed;
        return next >= 86400 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newSec = Math.floor(percentage * 86400);
    setCurrentTimeSec(newSec);
    if (videoRef.current) {
      videoRef.current.currentTime = (newSec % (videoRef.current.duration || 60));
    }
  };

  const handleStepFrame = (forward = true) => {
    setIsPlaying(false);
    setCurrentTimeSec((prev) => Math.max(0, Math.min(86400, prev + (forward ? 1 : -1))));
  };

  const handleSaveClipToCase = () => {
    if (clipInSec === null || clipOutSec === null) {
      showToast("Please set both Mark In and Mark Out points first", "error");
      return;
    }
    showToast(`Forensic Clip [${formatTime(clipInSec)} -> ${formatTime(clipOutSec)}] sealed & pinned to Active Case FIR/2026/012`, "success");
    setClipInSec(null);
    setClipOutSec(null);
  };

  return (
    <ToastProvider>
      <AppLayout>
        {/* PALANTIR FORENSIC PLAYBACK COMMAND BAR */}
        <div
          style={{
            background: "linear-gradient(90deg, #0A0F1D 0%, #05080E 100%)",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: "10px",
            padding: "14px 20px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 900, margin: 0, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 10 }}>
              <VideoIcon size={22} style={{ color: "#3B82F6" }} />
              VIGINT Multi-Channel Forensic Timeline & Clip Studio
              <span className="badge badge-blue" style={{ fontSize: "0.65rem" }}>24H ARCHIVE BUFFER</span>
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
              SYNCHRONIZED TIMELINE RECONSTRUCTION · 65B FORENSIC CLIPPER · FRAME JOG-SHUTTLE
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setSyncMultiCam(!syncMultiCam)}
              className="btn btn-secondary btn-sm"
              style={{ background: syncMultiCam ? "rgba(59,130,246,0.2)" : "transparent", borderColor: syncMultiCam ? "#3B82F6" : "var(--border)", color: syncMultiCam ? "#60A5FA" : "var(--text-muted)", fontWeight: 800 }}
            >
              {syncMultiCam ? "Sync Multi-Cam: ON" : "Sync Multi-Cam: OFF"}
            </button>
            <button
              onClick={() => setMagnifierActive(!magnifierActive)}
              className="btn btn-secondary btn-sm"
              style={{ color: magnifierActive ? "var(--green)" : "var(--text-muted)", fontWeight: 800 }}
            >
              Magnifier Loupe {magnifierActive ? "ACTIVE" : ""}
            </button>
          </div>
        </div>

        {/* MAIN VIDEO & TIMELINE DISPLAY */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* LEFT: VIDEO PLAYER + JOG SHUTTLE CONTROLS */}
          <div className="card" style={{ padding: 18, background: "#080C16", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Player Container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 420,
                background: "#000000",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(59,130,246,0.3)",
              }}
            >
              <video
                ref={videoRef}
                src={selectedVideoUrl}
                autoPlay
                muted
                loop
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: magnifierActive ? "scale(1.4)" : "scale(1.0)",
                  transition: "transform 0.2s ease",
                }}
              />

              {/* HUD Timestamp Watermark */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: 14,
                  background: "rgba(0,0,0,0.75)",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.82rem",
                  color: "#60A5FA",
                  fontWeight: 900,
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                {selectedDate} · {formatTime(currentTimeSec)} IST
              </div>

              {clipInSec !== null && clipOutSec !== null && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "rgba(239,68,68,0.85)",
                    padding: "4px 10px",
                    borderRadius: 4,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "0.75rem",
                    color: "white",
                    fontWeight: 900,
                  }}
                >
                  CLIP: {formatTime(clipInSec)} → {formatTime(clipOutSec)}
                </div>
              )}
            </div>

            {/* Playback Controls & Jog Shuttle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.4)", padding: "10px 14px", borderRadius: 8 }}>
              {/* Play / Step Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => handleStepFrame(false)} className="btn btn-secondary btn-sm" title="Step -1 frame">
                  ◀◀ Frame
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="btn btn-primary btn-sm"
                  style={{ padding: "6px 16px", fontWeight: 900 }}
                >
                  {isPlaying ? "PAUSE" : "PLAY"}
                </button>
                <button onClick={() => handleStepFrame(true)} className="btn btn-secondary btn-sm" title="Step +1 frame">
                  Frame ▶▶
                </button>
              </div>

              {/* Speed Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginRight: 4 }}>SPEED:</span>
                {[0.5, 1, 2, 4, 8].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    style={{
                      background: playbackSpeed === s ? "var(--accent)" : "transparent",
                      color: playbackSpeed === s ? "#FFFFFF" : "var(--text-muted)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Clip IN / OUT Markers */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    setClipInSec(currentTimeSec);
                    showToast(`Mark IN set at ${formatTime(currentTimeSec)}`, "info");
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.72rem", fontWeight: 800 }}
                >
                  Mark IN
                </button>
                <button
                  onClick={() => {
                    setClipOutSec(currentTimeSec);
                    showToast(`Mark OUT set at ${formatTime(currentTimeSec)}`, "info");
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.72rem", fontWeight: 800 }}
                >
                  Mark OUT
                </button>
                <button
                  onClick={handleSaveClipToCase}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: "0.72rem", background: "var(--green)", borderColor: "var(--green)", fontWeight: 900 }}
                >
                  Seal Clip to Case
                </button>
              </div>
            </div>

            {/* 24-HOUR INTERACTIVE TIMELINE HEATMAP BAR */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 6, fontFamily: "JetBrains Mono, monospace" }}>
                <span>00:00:00</span>
                <span>06:00:00</span>
                <span style={{ color: "#60A5FA", fontWeight: 800 }}>CURRENT: {formatTime(currentTimeSec)}</span>
                <span>18:00:00</span>
                <span>23:59:59</span>
              </div>

              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                style={{
                  position: "relative",
                  width: "100%",
                  height: 36,
                  background: "#05080E",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: 6,
                  cursor: "crosshair",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {/* Event Activity Markers */}
                <div style={{ position: "absolute", left: "37.5%", width: "8%", height: "100%", background: "rgba(59,130,246,0.4)", borderLeft: "2px solid #3B82F6" }} title="Face Sighting Cluster" />
                <div style={{ position: "absolute", left: "62%", width: "4%", height: "100%", background: "rgba(239,68,68,0.5)", borderLeft: "2px solid #EF4444" }} title="P1 Fall Event" />
                <div style={{ position: "absolute", left: "80%", width: "6%", height: "100%", background: "rgba(16,185,129,0.3)", borderLeft: "2px solid #10B981" }} title="Object Tracking" />

                {/* Scrubber Playhead */}
                <div
                  style={{
                    position: "absolute",
                    left: `${(currentTimeSec / 86400) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "#EF4444",
                    boxShadow: "0 0 8px #EF4444",
                  }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: ARCHIVE SELECTOR & FORENSIC DOSSIER */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 16, background: "#080C16" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#60A5FA", textTransform: "uppercase", marginBottom: 10 }}>
                Archive Video Segments
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {videoSegments.map((seg) => (
                  <div
                    key={seg.id}
                    onClick={() => {
                      setSelectedVideoUrl(seg.url);
                      showToast(`Switched playback to: ${seg.label}`, "info");
                    }}
                    style={{
                      background: selectedVideoUrl === seg.url ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${selectedVideoUrl === seg.url ? "#3B82F6" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#FFFFFF" }}>{seg.label}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>Status: Indexed · 1080p H.264</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16, background: "#080C16", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#60A5FA", textTransform: "uppercase" }}>
                Active Case Evidence Dossier
              </div>

              <div style={{ background: "rgba(0,0,0,0.4)", padding: 12, borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#FFFFFF" }}>FIR/2026/012: Campus Security Incident</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>Assigned Investigator: Chief Vance</div>
                <div style={{ fontSize: "0.72rem", color: "var(--green)", marginTop: 6, fontWeight: 700 }}>● SHA-256 Chain of Custody Protected</div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ToastProvider>
  );
}


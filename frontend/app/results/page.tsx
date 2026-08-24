"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import EnhanceModal from "@/components/EnhanceModal";
import AddSuspectModal from "@/components/AddSuspectModal";
import { getJobStatus, cancelSearchJob, cancelAllSearchJobs, exportReport, resolveStorageUrl, downloadFramesZip, MatchResult, SearchJob, apiFetch, addCaseEvidence, getActiveCase } from "@/lib/api";
import {
  TargetIcon,
  SearchIcon,
  BarChartIcon,
  MapIcon,
  UserIcon,
  CarIcon,
  MessageIcon,
  ActivityIcon,
  FileTextIcon,
  PackageIcon,
  HourglassIcon,
  ImageIcon,
  FilmIcon,
  VideoIcon,
  CloseIcon,
  GridIcon,
  ListIcon,
  PlayIcon,
  DownloadIcon,
  SparklesIcon,
  MaximizeIcon,
  TagIcon,
  FolderIcon,
  ClockIcon,
  FlameIcon,
  SmokeIcon,
  FallIcon,
  UsersIcon,
  WeaponIcon,
  FaceScanIcon,
  ShieldCheckIcon,
  AlertIcon,
} from "@/components/Icons";

const BASE_URL = "http://localhost:8000";

// ── Magnifying Glass Hover Zoom Component ───────────────────────────────────────
function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: "none" });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const { left, top, width, height } = container.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    if (x < 0 || y < 0 || x > width || y > height) {
      setZoomStyle({ display: "none" });
      return;
    }

    const pctX = (x / width) * 100;
    const pctY = (y / height) * 100;

    const lensRadius = 80; // 160px diameter
    setZoomStyle({
      display: "block",
      position: "absolute",
      left: `${x - lensRadius}px`,
      top: `${y - lensRadius}px`,
      width: `${lensRadius * 2}px`,
      height: `${lensRadius * 2}px`,
      borderRadius: "50%",
      border: "2.5px solid #60A5FA",
      boxShadow: "0 0 24px rgba(59,130,246,0.65), inset 0 0 16px rgba(0,0,0,0.6)",
      pointerEvents: "none",
      backgroundImage: `url(${src})`,
      backgroundPosition: `${pctX}% ${pctY}%`,
      backgroundSize: `${width * 3.4}px ${height * 3.4}px`,
      backgroundRepeat: "no-repeat",
      zIndex: 20,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none" });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ position: "relative", overflow: "hidden", cursor: "crosshair", borderRadius: "8px 8px 0 0" }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
      />
      <div style={zoomStyle}>
        {/* Tactical Crosshair Overlay */}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(96,165,250,0.4)" }} />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(96,165,250,0.4)" }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 8, height: 8, borderRadius: "50%", border: "1px solid #60A5FA"
        }} />
      </div>
    </div>
  );
}

// ── Export Evidence PDF Modal Component ───────────────────────────────
function ExportEvidenceModal({
  isOpen,
  onClose,
  jobId,
  jobType,
  matches,
  defaultCaseNumber = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobType?: string;
  matches: MatchResult[];
  defaultCaseNumber?: string;
}) {
  const [title, setTitle] = useState("Forensic Investigation & Evidence Report");
  const [investigator, setInvestigator] = useState("Investigating Officer");
  const [caseNumber, setCaseNumber] = useState(defaultCaseNumber || "CASE-2026-085");
  const [department, setDepartment] = useState("Cyber Cell & Forensic CCTV Analysis Unit");
  const [notes, setNotes] = useState("Automated multi-modal forensic search report with cryptographically verified Section 65B audit trail.");
  const [filterType, setFilterType] = useState<string>("all");
  const [minConfidence, setMinConfidence] = useState<number>(0.0);
  const [groupBySections, setGroupBySections] = useState<boolean>(true);
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({
    executive_summary: true,
    metrics_overview: true,
    evidence_matches: true,
    telemetry_analysis: true,
    chain_of_custody: true,
    legal_signoff: true,
  });
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  // Extract unique cameras from matches
  const uniqueCameras = Array.from(new Set(matches.map((m) => m.camera_id).filter(Boolean)));

  const handleRunExport = async () => {
    if (!jobId) {
      showToast("No active job selected for export", "error");
      return;
    }
    setExporting(true);
    try {
      const activeSecList = Object.entries(selectedSections)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const blob = await exportReport(
        jobId,
        title,
        investigator,
        caseNumber,
        department,
        notes,
        filterType,
        minConfidence,
        groupBySections,
        activeSecList,
        selectedCamera
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secure_evidence_report_${jobId}_${filterType}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Secure Evidence PDF exported successfully!", "success");
      onClose();
    } catch (err: any) {
      showToast(`Export failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 350,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: "var(--radius-xl)",
          maxWidth: 680, width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85), 0 0 50px rgba(59,130,246,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: "16px 22px",
          background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(15,23,42,0.9) 100%)",
          borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: "1.05rem", color: "#FFFFFF" }}>
              <ShieldCheckIcon size={20} style={{ color: "var(--accent)" }} />
              Export Secure Evidence PDF Report
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
              Indian Evidence Act §65B Compliant · Tamper-Evident SHA-256 / MD5 Hash Registration
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: "var(--text-muted)" }}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filter Modality Selector */}
          <div>
            <label style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              1. Filter Evidence by Modality / Category:
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All Detected Evidence", color: "var(--accent)" },
                { id: "fire", label: "Fire & Thermal", color: "#EF4444" },
                { id: "smoke", label: "Smoke Plumes", color: "#94A3B8" },
                { id: "fall", label: "Slip & Fall", color: "#F59E0B" },
                { id: "crowd", label: "Crowd Surge", color: "#3B82F6" },
                { id: "brawl", label: "Violent Affray", color: "#EC4899" },
                { id: "weapon", label: "Weapons", color: "#DC2626" },
                { id: "face", label: "Face Re-ID", color: "#06B6D4" },
                { id: "lpr", label: "License Plate (LPR)", color: "#10B981" },
                { id: "object", label: "Object Detection", color: "#8B5CF6" },
                { id: "activity", label: "Activity Dynamics", color: "#F97316" },
              ].map((cat) => {
                const isSel = filterType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFilterType(cat.id)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      fontSize: "0.72rem",
                      fontWeight: isSel ? 800 : 500,
                      background: isSel ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isSel ? cat.color : "rgba(255,255,255,0.08)"}`,
                      color: isSel ? "#FFFFFF" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-Section Grouping Toggle */}
          <div style={{
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#FFFFFF" }}>
                Generate Multi-Section Separated Chapters
              </div>
              <div style={{ fontSize: "0.70rem", color: "var(--text-muted)", marginTop: 2 }}>
                Structures the PDF into dedicated numbered sections with category headers and individual telemetry tables
              </div>
            </div>
            <input
              type="checkbox"
              checked={groupBySections}
              onChange={(e) => setGroupBySections(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#3B82F6", cursor: "pointer" }}
            />
          </div>

          {/* Sensitivity & Camera Filter Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4 }}>
                <span>Min. Confidence Threshold:</span>
                <strong style={{ color: "#60A5FA" }}>{(minConfidence * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.90"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#3B82F6" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Camera Source Filter:
              </label>
              <select
                className="input-field"
                style={{ width: "100%", fontSize: "0.75rem", padding: "6px 8px" }}
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
              >
                <option value="all">All Cameras ({uniqueCameras.length || "All"})</option>
                {uniqueCameras.map((cam) => (
                  <option key={cam} value={cam}>{cam}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section Inclusion Checkboxes */}
          <div>
            <label style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              2. Report Modules & Sections to Include:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { id: "executive_summary", label: "Executive AI Summary & Narrative" },
                { id: "metrics_overview", label: "Category Breakdown & Metrics Table" },
                { id: "evidence_matches", label: "Detailed Evidence Frames & Hashes" },
                { id: "telemetry_analysis", label: "Forensic IoT Telemetry (Angles/Temp)" },
                { id: "chain_of_custody", label: "Chain of Custody Audit Log (CoC)" },
                { id: "legal_signoff", label: "Courtroom §65B Sign-Off & Official Seal" },
              ].map((sec) => (
                <label key={sec.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.74rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedSections[sec.id] || false}
                    onChange={(e) => setSelectedSections({ ...selectedSections, [sec.id]: e.target.checked })}
                    style={{ accentColor: "#3B82F6" }}
                  />
                  <span>{sec.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Case & Investigator Details */}
          <div>
            <label style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              3. Case & Legal Metadata:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Report Title:</span>
                <input
                  className="input-field"
                  style={{ width: "100%", fontSize: "0.76rem" }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Case Reference Number:</span>
                <input
                  className="input-field"
                  style={{ width: "100%", fontSize: "0.76rem" }}
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Lead Investigator:</span>
                <input
                  className="input-field"
                  style={{ width: "100%", fontSize: "0.76rem" }}
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Department / Agency:</span>
                <input
                  className="input-field"
                  style={{ width: "100%", fontSize: "0.76rem" }}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Forensic Notes:</span>
              <textarea
                className="input-field"
                rows={2}
                style={{ width: "100%", fontSize: "0.74rem", resize: "none" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "14px 22px",
          background: "var(--bg-elevated)",
          borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={exporting}>
            Cancel
          </button>
          <button
            onClick={handleRunExport}
            disabled={exporting}
            className="btn btn-primary btn-sm"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              fontWeight: 800,
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 0 15px rgba(37,99,235,0.4)",
            }}
          >
            <FileTextIcon size={14} />
            {exporting ? "Generating PDF..." : "Generate & Download PDF Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline Video Player Modal ─────────────────────────────────────────
function VideoPlayerModal({
  match,
  onClose,
}: {
  match: MatchResult;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const hasClip = Boolean(match.clip_url && !match.clip_url.endsWith(".jpg") && !match.clip_url.endsWith(".png"));
  const [activeTab, setActiveTab] = useState<"video" | "frame">(hasClip ? "video" : "frame");
  const router = useRouter();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleError = () => setVideoError(true);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("error", handleError);
    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("error", handleError);
    };
  }, [activeTab]);

  const downloadClip = () => {
    if (match.clip_url) {
      window.open(`${BASE_URL}/api/export/clip?clip_path=${encodeURIComponent(match.clip_url)}`, "_blank");
    }
  };

  const downloadFrame = () => {
    const a = document.createElement("a");
    a.href = resolveStorageUrl(match.frame_url);
    a.download = `evidence_${match.label}_${match.timestamp_str.replace(/:/g, "-")}.jpg`;
    a.target = "_blank";
    a.click();
  };

  const jumpToTimeline = () => {
    const t = Math.max(0, Math.floor(match.timestamp || 0));
    router.push(`/playback?camera=${encodeURIComponent(match.camera_id || "")}&t=${t}`);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)", overflow: "hidden",
          maxWidth: 840, width: "100%",
          boxShadow: "0 32px 80px rgba(0,0,0,0.85), 0 0 60px rgba(96,165,250,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: playing ? "var(--green)" : "var(--accent)", animation: playing ? "pulse 1s infinite" : "none" }} />
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
            Evidence Detection Preview — {match.timestamp_str}
          </span>
          <span className="badge badge-blue" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <VideoIcon size={11} /> {match.camera_id}
          </span>
          <span className="badge" style={{
            background: "var(--accent-dim)", color: "var(--accent)",
            border: "1px solid rgba(59,130,246,0.3)",
          }}>
            {(match.confidence * 100).toFixed(1)}% Match
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}
          ><CloseIcon size={14} /></button>
        </div>

        {/* View Mode Switcher */}
        <div style={{
          display: "flex", background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid var(--border)", padding: "6px 16px", gap: 8
        }}>
          <button
            onClick={() => setActiveTab("frame")}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
              background: activeTab === "frame" ? "var(--accent-dim)" : "transparent",
              border: `1px solid ${activeTab === "frame" ? "var(--accent)" : "transparent"}`,
              color: activeTab === "frame" ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6
            }}
          >
            <ImageIcon size={14} /> Detection Overlay Frame
          </button>
          {hasClip ? (
            <button
              onClick={() => { setActiveTab("video"); setVideoError(false); }}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
                background: activeTab === "video" ? "var(--accent-dim)" : "transparent",
                border: `1px solid ${activeTab === "video" ? "var(--accent)" : "transparent"}`,
                color: activeTab === "video" ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6
              }}
            >
              <FilmIcon size={14} /> Video Clip Playback
            </button>
          ) : (
            <button
              onClick={jumpToTimeline}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#60A5FA",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6
              }}
            >
              <ClockIcon size={14} /> Play Footage on Camera Timeline →
            </button>
          )}
        </div>

        {/* Media Content */}
        <div style={{ background: "#000", position: "relative", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {activeTab === "video" && hasClip && !videoError ? (
            <video
              ref={videoRef}
              src={resolveStorageUrl(match.clip_url!)}
              controls
              autoPlay
              onError={() => setVideoError(true)}
              style={{ width: "100%", maxHeight: 460, display: "block", objectFit: "contain" }}
            />
          ) : (
            <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <img
                src={resolveStorageUrl(match.frame_url)}
                alt="Evidence frame with overlay"
                style={{ width: "100%", maxHeight: 460, objectFit: "contain", display: "block" }}
              />
              {/* Detection Overlay Badge */}
              <div style={{
                position: "absolute", top: 12, left: 12,
                background: "rgba(0,0,0,0.85)",
                border: "1px solid var(--green)", borderRadius: 6,
                padding: "6px 12px", display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "white" }}>
                  {match.label}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--green)", fontWeight: 700 }}>
                  {(match.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              ["Detection Target", match.label],
              ["Camera ID", match.camera_id],
              ["Frame Timestamp", match.timestamp_str],
              ["AI Match Score", `${(match.confidence * 100).toFixed(1)}%`],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "var(--bg-elevated)", padding: "10px 12px", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{k}</div>
                <div style={{ fontWeight: 600, fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", color: "var(--text-primary)" }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary btn-sm" onClick={downloadFrame} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon size={14} /> Download Frame
            </button>
            {hasClip && (
              <button className="btn btn-secondary btn-sm" onClick={downloadClip} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FilmIcon size={14} /> Download Clip (MP4)
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={jumpToTimeline} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ClockIcon size={14} /> Open Timeline Playback
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginLeft: "auto" }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSearchTypeIcon(type: string | undefined, query?: string) {
  const t = (type || "").toLowerCase();
  const q = (query || "").toLowerCase();
  if (t === "face_recognition" || t === "face" || q.includes("face") || q.includes("suspect")) return <FaceScanIcon size={14} />;
  if (t === "lpr" || q.includes("plate") || q.includes("license")) return <CarIcon size={14} />;
  if (t === "keyword" || q.includes("shirt") || q.includes("pants") || q.includes("person") || q.includes("target")) return <SearchIcon size={14} />;
  if (t === "object_detection" || t === "object") return <PackageIcon size={14} />;
  if (t === "attributes") return <UserIcon size={14} />;
  if (q.includes("fire")) return <FlameIcon size={14} />;
  if (q.includes("smoke")) return <SmokeIcon size={14} />;
  if (q.includes("fall")) return <FallIcon size={14} />;
  if (q.includes("crowd")) return <UsersIcon size={14} />;
  if (q.includes("weapon")) return <WeaponIcon size={14} />;
  if (q.includes("brawl")) return <AlertIcon size={14} />;
  if (t === "emergency_hazard" || t.includes("hazard")) return <ShieldCheckIcon size={14} />;
  return <ActivityIcon size={14} />;
}

function getSearchTypeLabel(type: string | undefined, query?: string) {
  const t = (type || "").toLowerCase();
  const q = (query || "").toLowerCase();
  if (t === "face_recognition" || t === "face") return "Face Re-ID / Facial Recognition";
  if (t === "lpr") return "License Plate Recognition (LPR)";
  if (t === "keyword") return "Open-Vocab Target Search";
  if (t === "object_detection" || t === "object") return "Object Detection";
  if (t === "attributes") return "Person Attributes Analytics";
  if (t === "activity") return "Activity & Crowd Dynamics";
  if (t === "emergency_hazard" || t.includes("hazard")) {
    if (q.includes("compound")) return "Compound Crisis Matrix";
    if (q.includes("fire") && q.includes("smoke")) return "Fire & Smoke Outbreak";
    if (q.includes("fire")) return "Optical Fire Detection";
    if (q.includes("smoke")) return "Volumetric Smoke Plume";
    if (q.includes("fall")) return "Slip & Fall Biomechanics";
    if (q.includes("crowd")) return "Crowd Density & Surge";
    if (q.includes("brawl")) return "Violent Affray / Brawl";
    if (q.includes("weapon")) return "Armed Weapon Threat";
    return "Campus Safety Emergency Suite";
  }
  return "AI Forensic Analysis";
}

// ── Main Results Page ─────────────────────────────────────────────────
export default function ResultsPage() {
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<SearchJob | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [pastJobs, setPastJobs] = useState<Record<string, any>>({});
  const [loadingPastJobs, setLoadingPastJobs] = useState(false);
  const [batchTab, setBatchTab] = useState<string>("all");
  const [batchSearch, setBatchSearch] = useState<string>("");

  const loadPastJobs = useCallback(async () => {
    setLoadingPastJobs(true);
    try {
      const data = await apiFetch<any>("/api/search/jobs");
      setPastJobs(data.jobs || {});
    } catch (err) {
      console.error("Failed to load past search jobs:", err);
    } finally {
      setLoadingPastJobs(false);
    }
  }, []);

  useEffect(() => {
    loadPastJobs();
  }, [loadPastJobs]);

  const [videoPlayer, setVideoPlayer] = useState<MatchResult | null>(null);
  const [enhanceMatch, setEnhanceMatch] = useState<{ match: MatchResult; mode?: "general" | "face" | "lpr" | "super_res"; scale?: number } | null>(null);
  const [addSuspectMatch, setAddSuspectMatch] = useState<MatchResult | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<MatchResult | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalJobId, setExportModalJobId] = useState("");
  const [exportModalJobType, setExportModalJobType] = useState<string | undefined>(undefined);
  const [exportModalMatches, setExportModalMatches] = useState<MatchResult[]>([]);
  const [zipping, setZipping] = useState(false);
  const [filterLabel, setFilterLabel] = useState("");
  const [sortBy, setSortBy] = useState<"timestamp" | "confidence">("timestamp");
  const [view, setView] = useState<"grid" | "list">("grid");
  const router = useRouter();

  // Track the globally-selected active case so per-result "Add to Case" knows
  // where to pin evidence. Kept in sync via the shared activeCaseChanged event.
  const [activeCase, setActiveCase] = useState<{ id: string | null; number: string | null }>({ id: null, number: null });
  const [pinningKey, setPinningKey] = useState<string | null>(null);
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => setActiveCase(getActiveCase());
    sync();
    window.addEventListener("activeCaseChanged", sync);
    return () => window.removeEventListener("activeCaseChanged", sync);
  }, []);

  const kindForType = (t: MatchResult["search_type"]): string => {
    if (t === "face_recognition") return "face";
    if (t === "lpr") return "lpr";
    if (t === "object_detection") return "object";
    return "keyword";
  };

  // Cross-feature: pin a search hit to the active case as forensic evidence.
  const handleAddToCase = useCallback(async (match: MatchResult, key: string) => {
    const ac = getActiveCase();
    if (!ac.id) {
      showToast("Select an active case first (top bar) to pin evidence", "error");
      return;
    }
    setPinningKey(key);
    try {
      const kind = kindForType(match.search_type);
      const pct = Math.round((match.confidence || 0) * 100);
      const summary = `${kind.toUpperCase()} match ${pct}% @ ${match.timestamp_str || match.timestamp + "s"} on ${match.camera_id}`;
      await addCaseEvidence(ac.id, {
        kind,
        label: match.label || "Unlabeled",
        summary,
        source_label: match.camera_id,
        timestamp_seconds: match.timestamp,
        confidence: match.confidence,
        thumb_url: match.frame_url,
        frame_hash: match.frame_hash || null,
        meta_json: JSON.stringify({
          search_type: match.search_type,
          box: match.box || null,
          ocr_text: match.ocr_text || null,
          job_id: jobId || null,
        }),
      });
      setPinnedKeys((prev) => new Set(prev).add(key));
      showToast(`Pinned to case ${ac.number || ac.id}`, "success");
    } catch (err: any) {
      showToast(err?.status === 404 ? "Active case no longer exists" : "Failed to pin evidence", "error");
    } finally {
      setPinningKey(null);
    }
  }, [jobId]);

  // Cross-feature: jump to the playback timeline at this camera + timestamp.
  const handleJumpToPlayback = useCallback((match: MatchResult) => {
    const t = Math.max(0, Math.floor(match.timestamp || 0));
    router.push(`/playback?camera=${encodeURIComponent(match.camera_id || "")}&t=${t}`);
  }, [router]);

  const loadJob = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoadingJob(true);
    try {
      const j = await getJobStatus(id.trim());
      setJob(j);
      setJobId(id.trim());
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `/results?job_id=${encodeURIComponent(id.trim())}`);
      }
    } catch {
      showToast("Job not found", "error");
      setJob(null);
    } finally {
      setLoadingJob(false);
    }
  }, []);

  // Explicit URL query param or hash loader
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const qJobId = params.get("job_id") || hash;
    if (qJobId) {
      setJobId(qJobId);
      loadJob(qJobId);
    }
  }, [loadJob]);

  const handleReturnToLibrary = () => {
    setJobId("");
    setJob(null);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/results");
    }
    loadPastJobs();
  };

  // Live Auto-polling for active running/queued search jobs
  useEffect(() => {
    if (!jobId || !job) return;
    if (job.status !== "running" && job.status !== "queued") return;

    const interval = setInterval(async () => {
      try {
        const j = await getJobStatus(jobId);
        setJob(j);
        if (j.status === "completed" || j.status === "failed" || j.status === "cancelled") {
          clearInterval(interval);
          loadPastJobs();
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, job?.status, loadPastJobs]);

  const handleStopJob = async (targetJobId?: string) => {
    const idToStop = targetJobId || jobId;
    if (!idToStop) return;
    try {
      await cancelSearchJob(idToStop);
      showToast(`Search job #${idToStop} stopped`, "info");
      loadJob(idToStop);
      loadPastJobs();
    } catch {
      showToast("Failed to stop search job", "error");
    }
  };

  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all");

  const getEventCategory = (m: MatchResult): string => {
    const incType = (m.incident_type || "").toLowerCase();
    const label = (m.label || "").toLowerCase();
    const sType = (m.search_type || "").toLowerCase();

    if (incType === "fire" || label.includes("fire") || label.includes("flame")) return "fire";
    if (incType === "smoke" || label.includes("smoke")) return "smoke";
    if (incType === "fall" || label.includes("fall") || label.includes("slip") || label.includes("casualty") || label.includes("immobility")) return "fall";
    if (incType === "crowd" || label.includes("crowd") || label.includes("gathering") || label.includes("unrest") || label.includes("density") || label.includes("people")) return "crowd";
    if (incType === "brawl" || label.includes("brawl") || label.includes("affray") || label.includes("altercation") || label.includes("combatant")) return "brawl";
    if (incType === "weapon" || label.includes("weapon") || label.includes("gun") || label.includes("knife") || label.includes("blade") || label.includes("armed")) return "weapon";
    if (incType === "face" || sType === "face_recognition" || label.includes("face") || label.includes("suspect")) return "face";
    return "other";
  };

  const rawMatches: MatchResult[] = (job?.matches || [])
    .filter((m) => !filterLabel || m.label.toLowerCase().includes(filterLabel.toLowerCase()))
    .sort((a, b) => sortBy === "timestamp" ? a.timestamp - b.timestamp : b.confidence - a.confidence);

  const eventCounts = {
    all: rawMatches.length,
    fire: rawMatches.filter((m) => getEventCategory(m) === "fire").length,
    smoke: rawMatches.filter((m) => getEventCategory(m) === "smoke").length,
    crowd: rawMatches.filter((m) => getEventCategory(m) === "crowd").length,
    fall: rawMatches.filter((m) => getEventCategory(m) === "fall").length,
    brawl: rawMatches.filter((m) => getEventCategory(m) === "brawl").length,
    weapon: rawMatches.filter((m) => getEventCategory(m) === "weapon").length,
    face: rawMatches.filter((m) => getEventCategory(m) === "face").length,
  };

  const matches = rawMatches.filter((m) => {
    if (selectedEventFilter === "all") return true;
    return getEventCategory(m) === selectedEventFilter;
  });

  const totalDuration = matches.length > 0 ? matches[matches.length - 1].timestamp + 10 : 60;

  const handleExportZip = async () => {
    if (!jobId) return;
    setZipping(true);
    try {
      const blob = await downloadFramesZip(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visioncctv_frames_${jobId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Evidence frames ZIP downloaded", "success");
    } catch {
      showToast("ZIP export failed — ensure search completed", "error");
    } finally {
      setZipping(false);
    }
  };

  const handleExport = async () => {
    if (!jobId) return;
    setExporting(true);
    try {
      const blob = await exportReport(
        jobId,
        exportTitle,
        exportInvestigator || "N/A",
        caseNumber || "N/A",
        department || "N/A",
        notes || "Automated multi-modal forensic search report."
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forensic_report_${jobId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Forensic report PDF exported", "success");
    } catch {
      showToast("PDF export failed — ensure search completed", "error");
    } finally {
      setExporting(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    showToast("Hash copied to clipboard", "success");
  };

  const confidenceColor = (c: number) =>
    c >= 0.8 ? "var(--green)" : c >= 0.6 ? "var(--yellow)" : "var(--accent)";

  const batchCounts = {
    all: Object.keys(pastJobs).length,
    ai_search: Object.values(pastJobs).filter((j: any) => j.source_module === "ai_search" || ["face_recognition", "lpr", "keyword", "object_detection", "attributes", "activity"].includes(j.type)).length,
    campus_emergency: Object.values(pastJobs).filter((j: any) => j.source_module === "campus_emergency" || (j.job_id && j.job_id.startsWith("hz_")) || (j.type && j.type.includes("hazard"))).length,
    face_recognition: Object.values(pastJobs).filter((j: any) => j.type === "face_recognition" || j.type === "face" || (j.query && j.query.toLowerCase().includes("face"))).length,
    lpr: Object.values(pastJobs).filter((j: any) => j.type === "lpr" || (j.query && j.query.toLowerCase().includes("plate"))).length,
    keyword: Object.values(pastJobs).filter((j: any) => j.type === "keyword" || j.type === "open_vocab").length,
    object_detection: Object.values(pastJobs).filter((j: any) => j.type === "object_detection" || j.type === "object" || j.type === "attributes").length,
    activity: Object.values(pastJobs).filter((j: any) => j.type === "activity").length,
  };

  const filteredPastJobs = Object.entries(pastJobs)
    .filter(([id, details]: [string, any]) => {
      const sMod = (details.source_module || "").toLowerCase();
      const sType = (details.type || "").toLowerCase();
      const query = (details.query || details.query_details || "").toLowerCase();
      const idStr = id.toLowerCase();
      const searchMatch =
        !batchSearch ||
        idStr.includes(batchSearch.toLowerCase()) ||
        query.includes(batchSearch.toLowerCase()) ||
        sType.includes(batchSearch.toLowerCase());

      if (!searchMatch) return false;

      if (batchTab === "all") return true;
      if (batchTab === "ai_search") {
        return sMod === "ai_search" || ["face_recognition", "lpr", "keyword", "object_detection", "attributes", "activity"].includes(sType);
      }
      if (batchTab === "campus_emergency") {
        return sMod === "campus_emergency" || idStr.startsWith("hz_") || sType.includes("hazard");
      }
      if (batchTab === "face_recognition") return sType === "face_recognition" || sType === "face" || query.includes("face");
      if (batchTab === "lpr") return sType === "lpr" || query.includes("plate");
      if (batchTab === "keyword") return sType === "keyword" || sType === "open_vocab";
      if (batchTab === "object_detection") return sType === "object_detection" || sType === "object" || sType === "attributes";
      if (batchTab === "activity") return sType === "activity";
      return true;
    })
    .sort(([, a], [, b]) => (b.created_at || 0) - (a.created_at || 0));

  return (
    <ToastProvider>
      <AppLayout>
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TargetIcon size={24} style={{ color: "var(--accent)" }} />
                {job ? `Batch Results: ${getSearchTypeLabel(job.type, job.query)}` : "Forensic Investigation Batch Library"}
              </h1>
              <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
                {job
                  ? `Evidence frames, video streams, camera movement trails, and §65B report for Job #${jobId}.`
                  : "Organized folder records of all processed AI Search modules (Face Re-ID, LPR, Keyword, Object, Attributes, Activity) and Campus Emergency modules."}
              </p>
            </div>
            {job && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setExportModalJobId(jobId);
                    setExportModalJobType(job.type);
                    setExportModalMatches(job.matches || []);
                    setIsExportModalOpen(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{
                    display: "flex", alignItems: "center", gap: 6, fontWeight: 800,
                    background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                    boxShadow: "0 0 14px rgba(37,99,235,0.4)"
                  }}
                >
                  <FileTextIcon size={14} /> Export Secure Evidence PDF
                </button>
                <button
                  onClick={handleExportZip}
                  disabled={zipping}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                >
                  <DownloadIcon size={14} /> {zipping ? "Zipping..." : "Export ZIP"}
                </button>
                <button
                  onClick={handleReturnToLibrary}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, background: "rgba(59,130,246,0.12)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.3)" }}
                >
                  ← Back to All Batches
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── MODE 1: DETAIL VIEW WHEN A BATCH JOB IS ACTIVE ── */}
        {job && (
          <>
            {/* Quick Switcher for Past / Recent Jobs */}
            {Object.keys(pastJobs).length > 0 && (
              <div
                style={{
                  background: "var(--bg-card)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  overflowX: "auto",
                }}
              >
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                  Switch Batch:
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {Object.entries(pastJobs)
                    .sort(([, a], [, b]) => (b.created_at || 0) - (a.created_at || 0))
                    .slice(0, 10)
                    .map(([pId, pVal]: [string, any]) => {
                      const isSelected = jobId === pId;
                      return (
                        <button
                          key={pId}
                          onClick={() => {
                            setJobId(pId);
                            loadJob(pId);
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: isSelected ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${isSelected ? "var(--accent)" : "rgba(255,255,255,0.06)"}`,
                            color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                            fontSize: "0.72rem",
                            fontWeight: isSelected ? 800 : 500,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: pVal.status === "completed" ? "var(--green)" : pVal.status === "running" ? "#60A5FA" : "var(--yellow)" }} />
                          <span style={{ fontFamily: "JetBrains Mono, monospace" }}>#{pId}</span>
                          <span style={{ color: isSelected ? "#93C5FD" : "var(--text-muted)", fontSize: "0.65rem" }}>
                            ({pVal.match_count ?? pVal.frames_matched ?? 0})
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Active Running/Queued Search Banner */}
            {(job.status === "running" || job.status === "queued") && (
              <div className="card" style={{ marginBottom: 20, borderColor: "rgba(59, 130, 246, 0.4)", background: "rgba(59, 130, 246, 0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#60A5FA", animation: "pulse 1.2s infinite" }} />
                    <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      AI Search In Progress ({jobId ? `#${jobId}` : "Scanning"})
                    </strong>
                    <span className={`status-pill status-${job.status}`}>{job.status}</span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleStopJob()}
                    style={{ background: "rgba(233,69,96,0.18)", color: "var(--accent)", border: "1px solid rgba(233,69,96,0.4)", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <CloseIcon size={14} /> Stop Search
                  </button>
                </div>
                <div className="progress-bar" style={{ height: 6, marginBottom: 8 }}>
                  <div className="progress-bar-fill" style={{ width: "100%", animation: "pulse 1.5s infinite" }} />
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  <span><strong style={{ color: "#60A5FA" }}>{(job as any).frames_processed ?? 0}</strong> frames parsed</span>
                  <span><strong style={{ color: "var(--green)" }}>{job.match_count ?? (job as any).frames_matched ?? 0}</strong> target matches identified</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.72rem" }}>Auto-refreshing results every 2s</span>
                </div>
              </div>
            )}

            {job.status === "cancelled" && (
              <div style={{
                marginBottom: 20, padding: "12px 18px", borderRadius: "10px",
                background: "rgba(233,69,96,0.08)", border: "1px solid rgba(233,69,96,0.3)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", fontWeight: 700, fontSize: "0.88rem" }}>
                  <CloseIcon size={16} /> Search Job #{jobId} was stopped by operator. Displaying matches collected prior to cancellation.
                </div>
                <span className="status-pill status-failed">Cancelled</span>
              </div>
            )}

            {/* Status + Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <span className={`status-pill status-${job.status}`}>{job.status}</span>
              {job.status === "completed" && (
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--green)" }}>
                  {job.match_count} match{job.match_count !== 1 ? "es" : ""} found
                </span>
              )}

              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  className="input-field"
                  style={{ width: 150 }}
                  placeholder="Filter label…"
                  value={filterLabel}
                  onChange={(e) => setFilterLabel(e.target.value)}
                />
                <select className="input-field" style={{ width: 160 }} value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "timestamp" | "confidence")}>
                  <option value="timestamp">Sort: Time ↑</option>
                  <option value="confidence">Sort: Confidence ↓</option>
                </select>
                {/* View toggle */}
                <div style={{ display: "flex", background: "var(--bg-elevated)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
                  {(["grid", "list"] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)} style={{
                      padding: "6px 12px", border: "none", cursor: "pointer",
                      background: view === v ? "var(--bg-card)" : "transparent",
                      color: view === v ? "var(--text-primary)" : "var(--text-muted)",
                      fontSize: "0.75rem", fontWeight: 600, fontFamily: "Inter, sans-serif",
                      transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      {v === "grid" ? <><GridIcon size={13} /> Grid</> : <><ListIcon size={13} /> List</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Suspect Camera Trail Map */}
            {job.status === "completed" && matches.length > 0 && (
              <>
                {/* Search Context Banner */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
                  padding: "10px 16px", borderRadius: "var(--radius-md)",
                  background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)",
                  fontSize: "0.78rem", flexWrap: "wrap",
                }}>
                  <span style={{ color: "var(--text-muted)" }}>Search type:</span>
                  <span style={{ fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", gap: 5 }}>
                    {getSearchTypeIcon(job.type, job.query)} {getSearchTypeLabel(job.type, job.query)}
                  </span>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <span style={{ color: "var(--text-muted)" }}>Job ID:</span>
                  <span className="mono" style={{ color: "var(--text-secondary)", fontSize: "0.72rem" }}>{jobId}</span>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <span style={{ color: "var(--text-muted)" }}>Matches:</span>
                  <span style={{ fontWeight: 800, color: "var(--green)" }}>{job.match_count}</span>
                  {/* Confidence Legend */}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Confidence:</span>
                    {[
                      { color: "var(--green)", label: "≥80% High" },
                      { color: "var(--yellow)", label: "60–79% Medium" },
                      { color: "var(--accent)", label: "<60% Review" },
                    ].map((b) => (
                      <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Interactive Event-Specific Highlighted Footages Filter Bar ── */}
                <div style={{
                  background: "var(--bg-card)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px 20px",
                  marginBottom: 20,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8 }}>
                        <ShieldCheckIcon size={18} style={{ color: "var(--accent)" }} />
                        Detected Hazard Events & Highlighted Footage Filters
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        Click on any event category to isolate and inspect its specific highlighted CCTV footages and forensic detections
                      </div>
                    </div>
                    {selectedEventFilter !== "all" && (
                      <button
                        onClick={() => setSelectedEventFilter("all")}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: "0.72rem", color: "var(--accent)" }}
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { id: "all", label: "All Evidence Frames", count: eventCounts.all, icon: ActivityIcon, color: "var(--accent)" },
                      { id: "fire", label: "Optical Fire Outbreak", count: eventCounts.fire, icon: FlameIcon, color: "#EF4444" },
                      { id: "smoke", label: "Volumetric Smoke", count: eventCounts.smoke, icon: SmokeIcon, color: "#94A3B8" },
                      { id: "crowd", label: "Live Crowd & Headcount", count: eventCounts.crowd, icon: UsersIcon, color: "#3B82F6" },
                      { id: "fall", label: "Slip & Fall Pose", count: eventCounts.fall, icon: FallIcon, color: "#F59E0B" },
                      { id: "brawl", label: "Violent Affray / Brawl", count: eventCounts.brawl, icon: AlertIcon, color: "#EC4899" },
                      { id: "weapon", label: "Armed Threat & Weapon", count: eventCounts.weapon, icon: WeaponIcon, color: "#DC2626" },
                      { id: "face", label: "Face Identification", count: eventCounts.face, icon: FaceScanIcon, color: "#06B6D4" },
                    ].map((btn) => {
                      const isActive = selectedEventFilter === btn.id;
                      const IconComp = btn.icon;
                      const count = btn.count;
                      return (
                        <button
                          key={btn.id}
                          onClick={() => setSelectedEventFilter(btn.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: isActive ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isActive ? btn.color : "rgba(255,255,255,0.08)"}`,
                            color: isActive ? "#FFFFFF" : count > 0 ? "var(--text-primary)" : "var(--text-muted)",
                            fontSize: "0.74rem",
                            fontWeight: isActive ? 800 : 500,
                            cursor: count > 0 || btn.id === "all" ? "pointer" : "default",
                            opacity: count > 0 || btn.id === "all" ? 1 : 0.45,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <IconComp size={13} style={{ color: isActive ? btn.color : "inherit" }} />
                          <span>{btn.label}</span>
                          <span
                            style={{
                              background: isActive ? btn.color : "rgba(255,255,255,0.08)",
                              color: isActive ? "#000000" : "inherit",
                              fontWeight: 800,
                              fontSize: "0.65rem",
                              padding: "1px 5px",
                              borderRadius: 4,
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Suspect Camera Trail Map */}
                <div style={{ marginBottom: 20 }}>
                  <CameraTrailMap matches={matches} />
                </div>

                {/* Timeline Scrubber */}
                <div style={{ marginBottom: 20 }}>
                  <TimelineScrubber
                    matches={matches}
                    totalDuration={totalDuration}
                    onSelect={(m) => { setSelectedTimeline(m); setVideoPlayer(m); }}
                    selected={selectedTimeline}
                  />
                </div>
              </>
            )}

            {/* Results Grid / List */}
            {view === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {matches.map((match, i) => (
                  <div
                    key={i}
                    className="result-card"
                    style={{
                      background: "var(--bg-card)",
                      border: `1px solid ${selectedTimeline === match ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                      transition: "all 0.2s",
                      boxShadow: selectedTimeline === match ? "0 0 16px rgba(96,165,250,0.3)" : "none",
                    }}
                  >
                    {/* Frame image + hover zoom */}
                    <div style={{ position: "relative", height: 160, background: "var(--bg-elevated)", overflow: "hidden" }}>
                      {match.frame_url ? (
                        <ZoomImage src={resolveStorageUrl(match.frame_url)} alt={match.label} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                          <ImageIcon size={32} />
                        </div>
                      )}
                      {/* Play overlay button */}
                      <button
                        className="play-icon"
                        onClick={() => { setVideoPlayer(match); setSelectedTimeline(match); }}
                        style={{
                          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                          width: 44, height: 44, borderRadius: "50%",
                          background: "rgba(0,0,0,0.75)", border: "2px solid var(--accent)",
                          color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", opacity: 0, transition: "opacity 0.2s", zIndex: 5,
                        }}
                      >
                        <PlayIcon size={18} />
                      </button>
                      {/* Timestamp badge */}
                      <span style={{
                        position: "absolute", bottom: 6, left: 6,
                        background: "rgba(0,0,0,0.8)", color: "var(--text-primary)",
                        padding: "2px 6px", borderRadius: 4, fontSize: "0.68rem",
                        fontFamily: "JetBrains Mono, monospace", zIndex: 4,
                      }}>
                        {match.timestamp_str}
                      </span>
                      {/* Confidence badge */}
                      <span style={{
                        position: "absolute", top: 6, right: 6,
                        background: match.confidence >= 0.8 ? "rgba(34,197,94,0.9)" : match.confidence >= 0.6 ? "rgba(245,158,11,0.9)" : "rgba(239,68,68,0.9)",
                        color: "white", padding: "2px 7px", borderRadius: 12,
                        fontSize: "0.68rem", fontWeight: 800, zIndex: 4,
                      }}>
                        {(match.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span className="badge badge-blue" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <VideoIcon size={10} /> {match.camera_id}
                        </span>
                        <span className="badge badge-accent" style={{ fontSize: "0.68rem" }}>{match.label}</span>
                      </div>

                      {/* Frame SHA-256 Hash */}
                      {match.frame_hash && (
                        <div
                          onClick={() => copyHash(match.frame_hash!)}
                          title="Click to copy SHA-256 integrity hash"
                          style={{
                            fontSize: "0.62rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            background: "var(--bg-elevated)", padding: "3px 6px", borderRadius: 4,
                            cursor: "pointer", marginBottom: 8, border: "1px solid var(--border)",
                          }}
                        >
                          SHA: {match.frame_hash.slice(0, 16)}…
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAddSuspectMatch(match)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "0.7rem", background: "rgba(34,197,94,0.1)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.3)" }}
                          title="Save as suspect reference"
                        >
                          <TagIcon size={11} /> Suspect
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEnhanceMatch({ match, mode: "face", scale: 2.0 })}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "0.7rem", background: "rgba(96,165,250,0.1)", color: "var(--accent)", border: "1px solid rgba(96,165,250,0.3)" }}
                        >
                          <SparklesIcon size={11} /> Enhance
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleJumpToPlayback(match)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "0.7rem" }}
                          title="Open playback timeline"
                        >
                          <ClockIcon size={11} /> Playback
                        </button>
                        {(() => {
                          const key = `grid|${match.camera_id}|${match.timestamp}|${i}`;
                          const pinned = pinnedKeys.has(key);
                          return (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={pinningKey === key || pinned}
                              onClick={() => handleAddToCase(match, key)}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "0.7rem",
                                background: pinned ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
                                color: pinned ? "var(--green)" : "var(--accent)",
                                border: `1px solid ${pinned ? "rgba(34,197,94,0.4)" : "rgba(59,130,246,0.4)"}`,
                              }}
                            >
                              <FolderIcon size={11} /> {pinned ? "Pinned" : "Pin Case"}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {matches.map((match, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px",
                      background: "var(--bg-card)", border: `1px solid ${selectedTimeline === match ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-md)", cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onClick={() => { setVideoPlayer(match); setSelectedTimeline(match); }}
                  >
                    <div style={{ width: 80, height: 52, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "var(--bg-elevated)" }}>
                      {match.frame_url && (
                        <img src={resolveStorageUrl(match.frame_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>{match.timestamp_str}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span className="badge badge-blue" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <VideoIcon size={11} /> {match.camera_id}
                        </span>
                        <span className="badge badge-accent">{match.label}</span>
                      </div>
                    </div>
                    <div style={{ color: confidenceColor(match.confidence), fontWeight: 800, fontSize: "1rem", flexShrink: 0 }}>
                      {(match.confidence * 100).toFixed(0)}%
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); setAddSuspectMatch(match); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(34,197,94,0.12)", color: "var(--green)",
                        border: "1px solid rgba(34,197,94,0.3)"
                      }}
                      title="Save as labeled suspect reference"
                    >
                      <TagIcon size={12} /> Label Suspect
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); setEnhanceMatch({ match, mode: "face", scale: 2.0 }); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(96,165,250,0.12)", color: "var(--accent)",
                        border: "1px solid rgba(96,165,250,0.3)"
                      }}
                    >
                      <SparklesIcon size={12} /> Enhance
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setVideoPlayer(match); }} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <PlayIcon size={12} /> Play
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleJumpToPlayback(match); }}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                      title="Open the playback timeline at this camera and timestamp"
                    >
                      <ClockIcon size={12} /> Playback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MODE 2: COMPREHENSIVE BATCH & FOLDER STRUCTURE LIBRARY (WHEN NO JOB IS LOADED) ── */}
        {!job && !loadingJob && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Toolbar: Category Tabs + Search Input */}
            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 280 }}>
                  <input
                    className="input-field"
                    style={{ flex: 1 }}
                    placeholder="Search past batches by Job ID, keyword, license plate, or camera…"
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                  />
                  {batchSearch && (
                    <button onClick={() => setBatchSearch("")} className="btn btn-ghost btn-sm">
                      Clear
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={loadPastJobs} disabled={loadingPastJobs}>
                    {loadingPastJobs ? "Refreshing..." : "Refresh Batches"}
                  </button>
                  <a href="/search" className="btn btn-primary btn-sm">
                    New AI Search →
                  </a>
                  <a href="/incidents" className="btn btn-secondary btn-sm">
                    Campus Safety →
                  </a>
                </div>
              </div>

              {/* Module Filter Tabs */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {[
                  { id: "all", label: "All Processed Batches", count: batchCounts.all, color: "var(--accent)" },
                  { id: "ai_search", label: "AI Search Page Modules", count: batchCounts.ai_search, color: "#3B82F6" },
                  { id: "campus_emergency", label: "Campus Emergency Modules", count: batchCounts.campus_emergency, color: "#EF4444" },
                  { id: "face_recognition", label: "Face Re-ID", count: batchCounts.face_recognition, color: "#06B6D4" },
                  { id: "lpr", label: "License Plate (LPR)", count: batchCounts.lpr, color: "#10B981" },
                  { id: "keyword", label: "Open-Vocab Target", count: batchCounts.keyword, color: "#A855F7" },
                  { id: "object_detection", label: "Object & Attributes", count: batchCounts.object_detection, color: "#F59E0B" },
                  { id: "activity", label: "Activity Analysis", count: batchCounts.activity, color: "#EC4899" },
                ].map((tab) => {
                  const isSelected = batchTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setBatchTab(tab.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        background: isSelected ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? tab.color : "rgba(255,255,255,0.08)"}`,
                        color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                        fontSize: "0.75rem",
                        fontWeight: isSelected ? 800 : 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{tab.label}</span>
                      <span
                        style={{
                          background: isSelected ? tab.color : "rgba(255,255,255,0.08)",
                          color: isSelected ? "#000000" : "var(--text-muted)",
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          padding: "1px 6px",
                          borderRadius: "10px",
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Batch Cards Grid */}
            {filteredPastJobs.length === 0 ? (
              <div className="card empty-state" style={{ padding: "40px 20px" }}>
                <div className="empty-state-icon" style={{ display: "flex", justifyContent: "center" }}>
                  <FolderIcon size={40} style={{ color: "var(--text-muted)" }} />
                </div>
                <div className="empty-state-title" style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                  No investigation batches found
                </div>
                <div className="empty-state-sub" style={{ fontSize: "0.82rem" }}>
                  Try adjusting your filter or run a new search from the <a href="/search" style={{ color: "var(--accent)" }}>AI Search page</a> or <a href="/incidents" style={{ color: "var(--accent)" }}>Campus Safety page</a>.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "18px" }}>
                {filteredPastJobs.map(([id, details]: [string, any]) => {
                  const isEmergency = details.source_module === "campus_emergency" || id.startsWith("hz_") || (details.type && details.type.includes("hazard"));
                  const matchCount = details.match_count || details.frames_matched || 0;
                  const thumb = details.thumbnail_url;
                  return (
                    <div
                      key={id}
                      style={{
                        background: "var(--bg-elevated)",
                        border: `1px solid ${isEmergency ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`,
                        borderRadius: "12px",
                        padding: "18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Card Header: Origin Badge + Type Label + Status */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span
                              style={{
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: isEmergency ? "rgba(239,68,68,0.18)" : "rgba(59,130,246,0.18)",
                                color: isEmergency ? "#F87171" : "#60A5FA",
                                border: `1px solid ${isEmergency ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)"}`,
                              }}
                            >
                              {isEmergency ? "Campus Emergency" : "AI Search Module"}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                              #{id}
                            </span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 6 }}>
                            {getSearchTypeIcon(details.type, details.query)}
                            {getSearchTypeLabel(details.type, details.query)}
                          </h4>
                        </div>
                        <span className={`status-pill status-${details.status}`} style={{ fontSize: "0.65rem" }}>
                          {details.status}
                        </span>
                      </div>

                      {/* Middle: Query Details & Thumbnail Preview */}
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {thumb ? (
                          <div style={{ width: 84, height: 56, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <img src={resolveStorageUrl(thumb)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ) : (
                          <div style={{ width: 84, height: 56, borderRadius: 6, flexShrink: 0, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                            <FolderIcon size={22} />
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 2 }}>Target / Query:</div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {details.query || details.query_details || "Standard Detection Pipeline"}
                          </div>
                        </div>
                      </div>

                      {/* Metadata row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.74rem", color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: matchCount > 0 ? "var(--green)" : "var(--text-muted)", fontWeight: 700 }}>
                          <ShieldCheckIcon size={13} /> {matchCount} Evidence Hit{matchCount !== 1 ? "s" : ""}
                        </span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.68rem" }}>
                          {details.camera_id || "CAM-01"}
                        </span>
                      </div>

                        {/* Action Button Footer */}
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        {(details.status === "running" || details.status === "queued") && (
                          <button
                            onClick={() => handleStopJob(id)}
                            className="btn btn-secondary btn-sm"
                            style={{ background: "rgba(233,69,96,0.15)", color: "var(--accent)", border: "1px solid rgba(233,69,96,0.3)", fontSize: "0.72rem" }}
                          >
                            <CloseIcon size={12} /> Stop
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExportModalJobId(id);
                            setExportModalJobType(details.type);
                            setExportModalMatches(details.matches || []);
                            setIsExportModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: "rgba(59,130,246,0.12)",
                            color: "#60A5FA",
                            border: "1px solid rgba(59,130,246,0.3)",
                          }}
                        >
                          <FileTextIcon size={12} /> Export PDF
                        </button>
                        <button
                          onClick={() => {
                            setJobId(id);
                            loadJob(id);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontWeight: 800,
                            fontSize: "0.76rem",
                            background: isEmergency ? "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)" : "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                          }}
                        >
                          Open Batch Records →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Secure Evidence PDF Export Modal */}
        <ExportEvidenceModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          jobId={exportModalJobId || jobId}
          jobType={exportModalJobType || job?.type}
          matches={exportModalMatches.length > 0 ? exportModalMatches : (job?.matches || [])}
          defaultCaseNumber={activeCase.number || ""}
        />

        {/* Inline Video Player Modal */}
        {videoPlayer && (
          <VideoPlayerModal
            match={videoPlayer}
            onClose={() => setVideoPlayer(null)}
          />
        )}

        {/* AI Image Enhancer & Upscaler Modal */}
        {enhanceMatch && (
          <EnhanceModal
            match={enhanceMatch.match}
            initialMode={enhanceMatch.mode}
            initialScale={enhanceMatch.scale}
            onClose={() => setEnhanceMatch(null)}
          />
        )}

        {/* Add Suspect Image Modal */}
        {addSuspectMatch && (
          <AddSuspectModal
            initialImageUrl={addSuspectMatch.frame_url}
            initialLabel={addSuspectMatch.label}
            onClose={() => setAddSuspectMatch(null)}
          />
        )}

        <style>{`
          .result-card:hover .play-icon { opacity: 1 !important; }
        `}</style>
      </AppLayout>
    </ToastProvider>
  );
}



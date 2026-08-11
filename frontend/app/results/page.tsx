"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import EnhanceModal from "@/components/EnhanceModal";
import AddSuspectModal from "@/components/AddSuspectModal";
import { getJobStatus, exportReport, resolveStorageUrl, downloadFramesZip, MatchResult, SearchJob, apiFetch, addCaseEvidence, getActiveCase } from "@/lib/api";
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

    setZoomStyle({
      display: "block",
      position: "absolute",
      left: `${x - 45}px`,
      top: `${y - 45}px`,
      width: "90px",
      height: "90px",
      borderRadius: "50%",
      border: "2px solid var(--accent)",
      boxShadow: "0 0 10px rgba(59,130,246,0.5), inset 0 0 8px rgba(0,0,0,0.5)",
      pointerEvents: "none",
      backgroundImage: `url(${src})`,
      backgroundPosition: `${pctX}% ${pctY}%`,
      backgroundSize: `${width * 2.5}px ${height * 2.5}px`,
      backgroundRepeat: "no-repeat",
      zIndex: 10,
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
      <div style={zoomStyle} />
    </div>
  );
}

// ── Timeline Scrubber Component ───────────────────────────────────────
function TimelineScrubber({
  matches,
  totalDuration,
  onSelect,
  selected,
}: {
  matches: MatchResult[];
  totalDuration: number;
  onSelect: (m: MatchResult) => void;
  selected: MatchResult | null;
}) {
  const duration = totalDuration || (matches.length > 0 ? matches[matches.length - 1].timestamp + 10 : 60);

  return (
    <div style={{
      background: "var(--bg-elevated)", borderRadius: "var(--radius-md)",
      padding: "16px 20px", marginBottom: 24,
      border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <BarChartIcon size={16} style={{ color: "var(--accent)" }} />
          Evidence Timeline — {matches.length} match{matches.length !== 1 ? "es" : ""}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
          0s — {duration.toFixed(0)}s
        </div>
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 40, cursor: "pointer" }}>
        {/* Base track */}
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: 4, background: "rgba(255,255,255,0.06)",
          borderRadius: 2, transform: "translateY(-50%)",
        }} />

        {/* Filled region */}
        {matches.length > 0 && (
          <div style={{
            position: "absolute", top: "50%", left: 0,
            width: `${(matches[matches.length - 1].timestamp / duration) * 100}%`,
            height: 4, background: "var(--accent)",
            borderRadius: 2, transform: "translateY(-50%)",
          }} />
        )}

        {/* Match markers */}
        {matches.map((m, i) => {
          const pct = (m.timestamp / duration) * 100;
          const isSelected = selected === m;
          return (
            <div
              key={i}
              onClick={() => onSelect(m)}
              title={`${m.timestamp_str} — ${m.label} (${(m.confidence * 100).toFixed(0)}%)`}
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: isSelected ? 14 : 10,
                height: isSelected ? 14 : 10,
                borderRadius: "50%",
                background: isSelected ? "var(--accent)" : "var(--accent)",
                border: `2px solid ${isSelected ? "white" : "rgba(59,130,246,0.5)"}`,
                boxShadow: isSelected ? "0 0 12px var(--accent)" : "0 0 6px rgba(59,130,246,0.6)",
                cursor: "pointer",
                zIndex: isSelected ? 2 : 1,
                transition: "all 0.15s ease",
              }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {matches.map((m, i) => (
          <div
            key={i}
            onClick={() => onSelect(m)}
            style={{
              padding: "3px 8px", borderRadius: 100, cursor: "pointer",
              background: selected === m ? "rgba(96,165,250,0.15)" : "rgba(59,130,246,0.08)",
              border: `1px solid ${selected === m ? "rgba(96,165,250,0.4)" : "rgba(59,130,246,0.2)"}`,
              fontSize: "0.68rem", fontFamily: "JetBrains Mono, monospace",
              color: selected === m ? "var(--accent)" : "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            {m.timestamp_str}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Camera Trail Map Component ───────────────────────────────────────────
function CameraTrailMap({ matches }: { matches: MatchResult[] }) {
  if (matches.length === 0) return null;

  const byLabel: Record<string, MatchResult[]> = {};
  matches.forEach((m) => {
    if (!byLabel[m.label]) byLabel[m.label] = [];
    byLabel[m.label].push(m);
  });

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid rgba(96,165,250,0.2)",
      borderRadius: "var(--radius-lg)", padding: "20px 24px", marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <MapIcon size={20} style={{ color: "var(--accent)" }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>Suspect Camera Trail Map</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Tracking chronological sightings across cameras to map path of movement
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 10 }}>
        {matches.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              minWidth: 100
            }}>
              {/* Camera Node */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--accent-dim)", border: "1.5px solid var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "0.68rem", color: "var(--accent)"
              }}>
                {m.camera_id.split("-").pop() || m.camera_id}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700 }}>{m.camera_id}</div>
                <div style={{ fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)", marginTop: 2 }}>
                  {m.timestamp_str}
                </div>
                <div style={{ fontSize: "0.62rem", color: "var(--accent)", fontWeight: 700, marginTop: 2 }}>
                  {m.label}
                </div>
              </div>
            </div>
            {/* Connection line */}
            {i < matches.length - 1 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px" }}>
                <div style={{ width: 36, height: 2, background: "var(--accent)" }} />
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 3 }}>→</div>
              </div>
            )}
          </div>
        ))}
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
  const [activeTab, setActiveTab] = useState<"video" | "frame">(match.clip_url ? "video" : "frame");

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
          maxWidth: 820, width: "100%",
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
          {match.clip_url && (
            <button
              onClick={() => setActiveTab("video")}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
                background: activeTab === "video" ? "var(--accent-dim)" : "transparent",
                border: `1px solid ${activeTab === "video" ? "var(--accent)" : "transparent"}`,
                color: activeTab === "video" ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6
              }}
            >
              <FilmIcon size={14} /> Video Stream Playback
            </button>
          )}
        </div>

        {/* Media Content */}
        <div style={{ background: "#000", position: "relative", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {activeTab === "video" && match.clip_url && !videoError ? (
            <video
              ref={videoRef}
              src={resolveStorageUrl(match.clip_url)}
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

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={downloadFrame} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon size={14} /> Download Evidence Frame
            </button>
            {match.clip_url && (
              <button className="btn btn-secondary" onClick={downloadClip} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FilmIcon size={14} /> Download Evidence Clip
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: "auto" }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSearchTypeIcon(type: string | undefined) {
  switch (type) {
    case "face_recognition": return <UserIcon size={12} />;
    case "lpr": return <CarIcon size={12} />;
    case "keyword": return <MessageIcon size={12} />;
    case "object_detection": return <TargetIcon size={12} />;
    default: return <ActivityIcon size={12} />;
  }
}

function getSearchTypeLabel(type: string | undefined) {
  switch (type) {
    case "face_recognition": return "Face Re-ID";
    case "lpr": return "License Plate (LPR)";
    case "keyword": return "Keyword";
    case "object_detection": return "Object Detection";
    default: return "Activity Analysis";
  }
}

// ── Main Results Page ─────────────────────────────────────────────────
export default function ResultsPage() {
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<SearchJob | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [pastJobs, setPastJobs] = useState<Record<string, any>>({});
  const [loadingPastJobs, setLoadingPastJobs] = useState(false);

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
  const [exporting, setExporting] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [exportTitle, setExportTitle] = useState("VisionCCTV Investigation Report");
  const [exportInvestigator, setExportInvestigator] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
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
    } catch {
      showToast("Job not found", "error");
      setJob(null);
    } finally {
      setLoadingJob(false);
    }
  }, []);

  // Auto-load from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) { setJobId(hash); loadJob(hash); }
  }, [loadJob]);

  const matches: MatchResult[] = (job?.matches || [])
    .filter((m) => !filterLabel || m.label.toLowerCase().includes(filterLabel.toLowerCase()))
    .sort((a, b) => sortBy === "timestamp" ? a.timestamp - b.timestamp : b.confidence - a.confidence);

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
        notes
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visioncctv_report_${jobId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Forensic PDF report generated & downloaded", "success");
    } catch {
      showToast("Export failed — ensure the search completed", "error");
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

  return (
    <ToastProvider>
      <AppLayout>
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TargetIcon size={24} style={{ color: "var(--accent)" }} /> Investigation Results
          </h1>
          <p className="page-subtitle">
            Timestamped evidence frames, video clips, suspect movement trail, and forensic export block.
          </p>
        </div>

        {/* Job Loader */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title">Load Search Job</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input-field"
              style={{ width: "350px" }}
              placeholder="Enter Job ID from the Search page…"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadJob(jobId)}
            />
            <button className="btn btn-secondary" onClick={() => loadJob(jobId)} disabled={loadingJob} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {loadingJob ? <><HourglassIcon size={14} /> Loading...</> : "Load Job"}
            </button>
            <a href="/search" className="btn btn-ghost" style={{ marginLeft: "auto" }}>New Search →</a>
          </div>
        </div>

        {job && (
          <>
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
                    {getSearchTypeIcon(job.type)} {getSearchTypeLabel(job.type)}
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

                {job.activity_data && (
                  <div className="card" style={{ marginBottom: 24, padding: 20 }}>
                    <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <BarChartIcon size={16} style={{ color: "var(--accent)" }} /> Activity Analysis Summary
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                      <div>
                        {job.activity_data.heatmap_url && (
                          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                            <img src={resolveStorageUrl(job.activity_data.heatmap_url)} alt="Activity Heatmap" style={{ width: "100%", maxHeight: 300, objectFit: "contain" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {[
                            ["Total Frames Analyzed", job.activity_data.total_frames_analyzed],
                            ["Max Persons Detected", job.activity_data.max_persons_detected],
                            ["Average Persons/Frame", job.activity_data.average_persons_per_frame],
                            ["Total Crowd Events", job.activity_data.total_crowd_events],
                            ["Average Motion Intensity", `${((job.activity_data.average_motion_intensity ?? 0) * 100).toFixed(1)}%`],
                            ["Scene Changes Detected", job.activity_data.total_scene_changes],
                          ].map(([k, v]) => (
                            <div key={k as string} style={{ background: "var(--bg-elevated)", padding: 12, borderRadius: 8 }}>
                              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{k as string}</div>
                              <div style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>{v as any}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ background: "var(--bg-elevated)", padding: "12px 16px", borderRadius: 8, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>OVERALL ACTIVITY LEVEL</span>
                          <span className={`status-pill ${job.activity_data.activity_level === "HIGH" ? "status-failed" : job.activity_data.activity_level === "MEDIUM" ? "status-queued" : "status-completed"}`} style={{ fontWeight: 800 }}>
                            {job.activity_data.activity_level}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <CameraTrailMap matches={matches} />
              </>
            )}

            {/* Timeline Scrubber */}
            {job.status === "completed" && matches.length > 0 && (
              <TimelineScrubber
                matches={matches}
                totalDuration={totalDuration}
                onSelect={(m) => { setSelectedTimeline(m); setVideoPlayer(m); }}
                selected={selectedTimeline}
              />
            )}

            {/* Forensic Export Configuration Panel */}
            {job.status === "completed" && job.match_count > 0 && (
              <div className="card" style={{
                marginBottom: 24,
                background: "var(--bg-card)",
                borderColor: "rgba(96,165,250,0.2)",
              }}>
                <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileTextIcon size={16} style={{ color: "var(--accent)" }} /> Export Forensic Case Report
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                      <label className="input-label">Report Title</label>
                      <input className="input-field" value={exportTitle} onChange={(e) => setExportTitle(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="input-label">Investigator Name</label>
                      <input className="input-field" placeholder="Rank / Name" value={exportInvestigator} onChange={(e) => setExportInvestigator(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="input-label">Case File Number</label>
                      <input className="input-field" placeholder="e.g. CR-2026-904" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="input-label">Department / Agency</label>
                      <input className="input-field" placeholder="e.g. Cyber Crime Unit" value={department} onChange={(e) => setDepartment(e.target.value)} />
                    </div>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Forensic Notes / Case Observations</label>
                    <textarea
                      className="input-field"
                      placeholder="Add summary notes regarding the Chain of Custody or observations here..."
                      style={{ minHeight: 60, resize: "vertical" }}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-primary" style={{ width: "fit-content", alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6 }} onClick={handleExport} disabled={exporting}>
                      <FileTextIcon size={14} /> {exporting ? "Compiling PDF Report..." : "Export Certified Forensic PDF"}
                    </button>
                    <button className="btn btn-secondary" style={{ width: "fit-content", alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6 }} onClick={handleExportZip} disabled={zipping}>
                      <PackageIcon size={14} /> {zipping ? "Packaging..." : "Download All Frames (ZIP)"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Grid View */}
            {matches.length === 0 && job.status === "completed" ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ display: "flex", justifyContent: "center" }}>
                  <SearchIcon size={36} style={{ color: "var(--text-muted)" }} />
                </div>
                <div className="empty-state-title">No matches found</div>
                <div className="empty-state-sub">Try adjusting similarity thresholds or checking video files.</div>
              </div>
            ) : view === "grid" ? (
              <div className="results-grid" style={{ animationName: "fadeIn" }}>
                {matches.map((match, i) => (
                  <div
                    key={i}
                    className="result-card"
                    onClick={() => { setVideoPlayer(match); setSelectedTimeline(match); }}
                    style={{
                      borderColor: selectedTimeline === match ? "var(--accent)" : "var(--border)",
                      boxShadow: selectedTimeline === match ? "0 0 20px rgba(96,165,250,0.15)" : "",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      {match.frame_url ? (
                        <ZoomImage
                          src={resolveStorageUrl(match.frame_url)}
                          alt={`Match at ${match.timestamp_str}`}
                        />
                      ) : (
                        <div style={{ width: "100%", height: 160, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <FilmIcon size={36} style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0)",
                        transition: "background 0.2s",
                      }}
                        className="play-overlay"
                      >
                        <div style={{
                          width: 44, height: 44, borderRadius: "50%",
                          background: "rgba(59,130,246,0.9)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          opacity: 0, transition: "opacity 0.2s",
                        }}
                          className="play-icon"
                        ><PlayIcon size={16} style={{ color: "white" }} /></div>
                      </div>
                      <div style={{
                        position: "absolute", top: 8, right: 8,
                        padding: "3px 8px", borderRadius: 100,
                        background: "rgba(0,0,0,0.75)",
                        fontSize: "0.7rem", fontWeight: 700,
                        color: confidenceColor(match.confidence),
                        border: `1px solid ${confidenceColor(match.confidence)}44`,
                      }}>
                        {(match.confidence * 100).toFixed(0)}%
                      </div>
                      <div style={{
                        position: "absolute", top: 8, left: 8,
                        padding: "3px 8px", borderRadius: 100,
                        background: "rgba(0,0,0,0.75)",
                        display: "flex", alignItems: "center",
                        color: "var(--text-secondary)",
                      }}>
                        {getSearchTypeIcon(match.search_type)}
                      </div>
                    </div>

                    <div className="result-card-body">
                      <div className="result-card-ts">{match.timestamp_str}</div>
                      <div className="result-card-meta">
                        <span className="badge badge-blue" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <VideoIcon size={11} /> {match.camera_id}
                        </span>
                        {match.label && <span className="badge badge-accent">{match.label}</span>}
                      </div>

                      {/* SHA-256 display — real hash from backend */}
                      {match.frame_url && match.frame_hash && (
                        <div style={{ margin: "10px 0 12px", background: "var(--bg-elevated)", padding: 6, borderRadius: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            <span>Frame SHA-256</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyHash(match.frame_hash || "");
                              }}
                              style={{ border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: "0.55rem" }}
                            >Copy</button>
                          </div>
                          <div className="mono" style={{ fontSize: "0.6rem", wordBreak: "break-all", color: "var(--text-secondary)", marginTop: 2 }}>
                            {match.frame_hash}
                          </div>
                        </div>
                      )}

                      <div className="result-card-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => { e.stopPropagation(); setVideoPlayer(match); setSelectedTimeline(match); }}
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                        ><PlayIcon size={12} /> Play</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnhanceMatch({ match, mode: "face", scale: 2.0 });
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: "rgba(96,165,250,0.12)", color: "var(--accent)",
                            border: "1px solid rgba(96,165,250,0.3)"
                          }}
                        ><SparklesIcon size={12} /> Enhance</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnhanceMatch({ match, mode: "super_res", scale: 4.0 });
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: "rgba(59,130,246,0.12)", color: "var(--accent)",
                            border: "1px solid rgba(59,130,246,0.3)"
                          }}
                        ><MaximizeIcon size={12} /> Upscale</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddSuspectMatch(match);
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: "rgba(34,197,94,0.12)", color: "var(--green)",
                            border: "1px solid rgba(34,197,94,0.3)"
                          }}
                          title="Save this extracted frame as a labeled suspect reference photo"
                        ><TagIcon size={12} /> Label Suspect</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const a = document.createElement("a");
                            a.href = resolveStorageUrl(match.frame_url);
                            a.download = `frame_${match.label}_${i}.jpg`;
                            a.target = "_blank"; a.click();
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                        ><ImageIcon size={12} /> Frame</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleJumpToPlayback(match); }}
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                          title="Open the playback timeline at this camera and timestamp"
                        ><ClockIcon size={12} /> Playback</button>
                        {(() => {
                          const key = `${match.camera_id}|${match.timestamp}|${i}`;
                          const pinned = pinnedKeys.has(key);
                          return (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={pinningKey === key || pinned}
                              onClick={(e) => { e.stopPropagation(); handleAddToCase(match, key); }}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                background: pinned ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)",
                                color: pinned ? "var(--green)" : "var(--accent)",
                                border: `1px solid ${pinned ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
                                opacity: pinningKey === key ? 0.6 : 1,
                              }}
                              title={activeCase.id ? `Pin this hit as evidence to case ${activeCase.number || activeCase.id}` : "Select an active case in the top bar first"}
                            ><FolderIcon size={12} /> {pinned ? "Pinned" : pinningKey === key ? "Pinning…" : "Add to Case"}</button>
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
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); setEnhanceMatch({ match, mode: "super_res", scale: 4.0 }); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(59,130,246,0.12)", color: "var(--accent)",
                        border: "1px solid rgba(59,130,246,0.3)"
                      }}
                    >
                      <MaximizeIcon size={12} /> Upscale
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
                    {(() => {
                      const key = `list|${match.camera_id}|${match.timestamp}|${i}`;
                      const pinned = pinnedKeys.has(key);
                      return (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={pinningKey === key || pinned}
                          onClick={(e) => { e.stopPropagation(); handleAddToCase(match, key); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: pinned ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)",
                            color: pinned ? "var(--green)" : "var(--accent)",
                            border: `1px solid ${pinned ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
                            opacity: pinningKey === key ? 0.6 : 1,
                          }}
                          title={activeCase.id ? `Pin as evidence to case ${activeCase.number || activeCase.id}` : "Select an active case in the top bar first"}
                        >
                          <FolderIcon size={12} /> {pinned ? "Pinned" : pinningKey === key ? "Pinning…" : "Add to Case"}
                        </button>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!job && !loadingJob && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div className="section-title" style={{ margin: 0 }}>Past Search Results</div>
                <button className="btn btn-secondary btn-sm" onClick={loadPastJobs} disabled={loadingPastJobs}>
                  {loadingPastJobs ? "Refreshing..." : "Refresh List"}
                </button>
              </div>

              {Object.keys(pastJobs).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ display: "flex", justifyContent: "center" }}>
                    <TargetIcon size={36} style={{ color: "var(--text-muted)" }} />
                  </div>
                  <div className="empty-state-title">No search jobs found</div>
                  <div className="empty-state-sub">
                    Run an <a href="/search" style={{ color: "var(--accent)" }}>AI search</a> first, or enter a Job ID manually above.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {Object.entries(pastJobs).map(([id, details]: [string, any]) => (
                    <div 
                      key={id}
                      style={{
                        background: "var(--bg-elevated)", border: "1px solid var(--border)",
                        borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 800, color: "var(--accent)" }}>
                            {getSearchTypeLabel(details.type)}
                          </span>
                          <h4 style={{ margin: "4px 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            Job ID: #{id}
                          </h4>
                        </div>
                        <span className={`status-pill status-${details.status}`} style={{ fontSize: "0.65rem" }}>
                          {details.status}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Query: <strong style={{ color: "var(--text-primary)" }}>{details.query || details.query_details || "N/A"}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {details.match_count || details.frames_matched || 0} matches found
                        </span>
                        <button 
                          onClick={() => {
                            setJobId(id);
                            loadJob(id);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          View Results →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

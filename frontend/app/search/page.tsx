"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import AddSuspectModal from "@/components/AddSuspectModal";
import {
  listVideos, listReferences, uploadReference,
  startImageSearch, startKeywordSearch, startLprSearch, startObjectSearch, startActivityAnalysis, getJobStatus,
  cancelSearchJob, cancelAllSearchJobs,
  VideoMeta, ReferenceMeta, SearchJob
} from "@/lib/api";
import {
  SearchIcon,
  UserIcon,
  FilterIcon,
  TagIcon,
  TargetIcon,
  ActivityIcon,
  ClockIcon,
  CheckIcon,
  CloseIcon,
  FilmIcon,
  VideoIcon,
  ImageIcon,
  HourglassIcon,
  WarningIcon,
  SparklesIcon,
  PlusIcon,
  UploadIcon
} from "@/components/Icons";

type SearchMode = "image" | "keyword" | "lpr" | "object" | "activity" | "attributes";

interface HistoryItem {
  jobId: string;
  timestamp: string;
  type: string;
  query: string;
  videosCount: number;
}

const colorOptions = [
  { value: "all", label: "Any Color" },
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "gray", label: "Gray" },
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "orange", label: "Orange" },
  { value: "purple", label: "Purple" },
  { value: "pink", label: "Pink" },
  { value: "brown", label: "Brown" }
];

export default function SearchPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("image");
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [refs, setRefs] = useState<ReferenceMeta[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [addSuspectOpen, setAddSuspectOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [plateText, setPlateText] = useState("");
  const [targetClassesStr, setTargetClassesStr] = useState("");
  const [crowdThreshold, setCrowdThreshold] = useState(3);
  const [motionThreshold, setMotionThreshold] = useState(0.03);
  const [sceneChangeThreshold, setSceneChangeThreshold] = useState(0.35);
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [sampleFps, setSampleFps] = useState(1.0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.40);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.45);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SearchJob | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [framesMatched, setFramesMatched] = useState(0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Attribute Search states
  const [topColor, setTopColor] = useState("all");
  const [bottomColor, setBottomColor] = useState("all");
  const [headgear, setHeadgear] = useState("all");
  const [bagPresent, setBagPresent] = useState("all"); // all, yes, no
  const [poseState, setPoseState] = useState("all"); // all, standing, running, crouching

  // Add Suspect Reference Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalPreview, setModalPreview] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState("");
  const [modalUploading, setModalUploading] = useState(false);

  const handleModalFilePick = (file: File) => {
    setModalFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setModalPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    if (!modalLabel) {
      setModalLabel(file.name.replace(/\.[^.]+$/, "").replace(/_/g, " "));
    }
  };

  const handleModalUpload = async () => {
    if (!modalFile) {
      showToast("Please select an image file first", "error");
      return;
    }
    if (!modalLabel.trim()) {
      showToast("Please enter a suspect name / label", "error");
      return;
    }
    setModalUploading(true);
    try {
      const res = await uploadReference(modalFile, modalLabel.trim());
      showToast(`Suspect reference "${modalLabel}" added successfully`, "success");
      setModalFile(null);
      setModalPreview(null);
      setModalLabel("");
      setAddModalOpen(false);

      // Refresh references list & auto select newly added reference
      const data = await listReferences();
      setRefs(data.references);
      if (res && res.reference && res.reference.id) {
        setSelectedRefs((prev) => new Set([...prev, res.reference.id]));
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload reference image", "error");
    } finally {
      setModalUploading(false);
    }
  };

  // Update similarity/confidence threshold default based on mode
  useEffect(() => {
    if (mode === "image") {
      setSimilarityThreshold(0.58);
      setConfidenceThreshold(0.60);
    } else if (mode === "keyword") {
      setSimilarityThreshold(0.25);
    } else if (mode === "lpr") {
      setSimilarityThreshold(0.50);
    } else if (mode === "object") {
      setConfidenceThreshold(0.40);
      setSimilarityThreshold(0.40);
    } else if (mode === "activity") {
      setSampleFps(2.0);
    }
  }, [mode]);

  // Load history & assets on mount
  const loadData = useCallback(async () => {
    try {
      const [v, r] = await Promise.all([listVideos(), listReferences()]);
      setVideos(v.videos);
      setRefs(r.references);
      setSelectedVideos(new Set(v.videos.map((vv) => vv.id)));
      setSelectedRefs(new Set(r.references.map((rr) => rr.id)));

      // Load search history
      const saved = localStorage.getItem("visioncctv_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      showToast("Failed to load assets", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll job status
  const pollJob = useCallback((id: string) => {
    setPolling(true);
    setPollError(null);
    setFramesProcessed(0);
    setFramesMatched(0);
    let consecutiveErrors = 0;
    const startTime = Date.now();
    const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min hard frontend timeout

    const interval = setInterval(async () => {
      if (Date.now() - startTime > POLL_TIMEOUT_MS) {
        clearInterval(interval);
        setPolling(false);
        setPollError("Search timed out after 5 minutes. The backend may still be running — check /results manually.");
        showToast("Search timed out on frontend. Check Results page.", "error");
        return;
      }

      try {
        const status = await getJobStatus(id);
        consecutiveErrors = 0; // reset on success
        setJob(status);
        setFramesProcessed((status as any).frames_processed ?? 0);
        setFramesMatched((status as any).frames_matched ?? 0);

        if (status.status === "completed" || status.status === "failed") {
          clearInterval(interval);
          setPolling(false);
          if (status.status === "completed") {
            showToast(`Search complete! Found ${status.match_count} match(es).`, "success");
            setTimeout(() => router.push(`/results#${id}`), 1200);
          } else {
            setPollError(status.error || "Pipeline failed");
            showToast(`Search failed: ${status.error}`, "error");
          }
        }
      } catch (err: any) {
        // 404 means the job no longer exists (e.g. server restarted) — stop immediately
        if (err?.status === 404) {
          clearInterval(interval);
          setPolling(false);
          setPollError("Job not found — the server may have restarted. Please run a new search.");
          showToast("Job not found — please run a new search", "error");
          return;
        }
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          clearInterval(interval);
          setPolling(false);
          const msg = err instanceof Error ? err.message : "Network error";
          setPollError(`Lost connection after ${consecutiveErrors} retries: ${msg}`);
          showToast("Lost connection to backend", "error");
        }
      }
    }, 2000);
  }, [router]);

  const handleSearch = async () => {
    if (selectedVideos.size === 0) { showToast("Select at least one video to analyze", "error"); return; }
    if (mode === "image" && selectedRefs.size === 0) { showToast("Select at least one suspect reference photo", "error"); return; }
    if (mode === "keyword" && !keyword.trim()) { showToast("Enter a search keyword", "error"); return; }
    if (mode === "lpr" && !plateText.trim()) { showToast("Enter a target license plate number", "error"); return; }

    const startVal = startTimeStr.trim() ? parseFloat(startTimeStr) : null;
    const endVal = endTimeStr.trim() ? parseFloat(endTimeStr) : null;

    try {
      let result: { job_id: string; status: string };
      let queryStr = "";

      if (mode === "image") {
        result = await startImageSearch(
          Array.from(selectedVideos),
          Array.from(selectedRefs),
          confidenceThreshold,
          similarityThreshold,
          sampleFps,
          startVal,
          endVal
        );
        const selectedNames = refs
          .filter(r => selectedRefs.has(r.id))
          .map(r => r.label);
        queryStr = `Face Re-ID: ${selectedNames.join(", ")}`;
      } else if (mode === "keyword") {
        result = await startKeywordSearch(
          Array.from(selectedVideos),
          keyword.trim(),
          similarityThreshold,
          sampleFps,
          startVal,
          endVal
        );
        queryStr = `Keyword: "${keyword.trim()}"`;
      } else if (mode === "lpr") {
        result = await startLprSearch(
          Array.from(selectedVideos),
          plateText.trim(),
          similarityThreshold,
          sampleFps,
          startVal,
          endVal
        );
        queryStr = `Plate: "${plateText.trim().toUpperCase()}"`;
      } else if (mode === "object") {
        const classes = targetClassesStr.trim() ? targetClassesStr.split(",").map(c => c.trim().toLowerCase()).filter(Boolean) : [];
        result = await startObjectSearch(
          Array.from(selectedVideos),
          classes,
          confidenceThreshold,
          sampleFps,
          startVal,
          endVal
        );
        queryStr = `Object: "${classes.join(", ") || "All objects"}"`;
      } else if (mode === "attributes") {
        const token = localStorage.getItem("visioncctv_token");
        const bagVal = bagPresent === "yes" ? true : bagPresent === "no" ? false : null;
        
        const res = await fetch("http://localhost:8001/api/search/by-attributes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            video_ids: Array.from(selectedVideos),
            top_color: topColor,
            bottom_color: bottomColor,
            headgear: headgear,
            bag_present: bagVal,
            pose_state: poseState,
            start_time: startVal,
            end_time: endVal
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Attribute search failed");
        }

        result = await res.json();
        queryStr = `Top: ${topColor}, Bottom: ${bottomColor}, Head: ${headgear}, Pose: ${poseState}`;
      } else {
        result = await startActivityAnalysis(
          Array.from(selectedVideos),
          sampleFps,
          crowdThreshold,
          motionThreshold,
          sceneChangeThreshold,
          startVal,
          endVal
        );
        queryStr = `Activity: Crowd ≥ ${crowdThreshold}`;
      }

      // Save search in local history
      const newHistoryItem: HistoryItem = {
        jobId: result.job_id,
        timestamp: new Date().toLocaleString(),
        type: mode,
        query: queryStr,
        videosCount: selectedVideos.size
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem("visioncctv_history", JSON.stringify(updatedHistory));

      // Save search in background jobs list
      const savedBgJobsRaw = localStorage.getItem("visioncctv_background_jobs");
      let savedBgJobs = [];
      if (savedBgJobsRaw) {
        try {
          savedBgJobs = JSON.parse(savedBgJobsRaw);
        } catch {}
      }
      const newBgJob = {
        id: result.job_id,
        type: mode,
        query: queryStr,
        timestamp: new Date().toLocaleString(),
        videosCount: selectedVideos.size,
        status: result.status || "queued",
        match_count: 0
      };
      savedBgJobs = [newBgJob, ...savedBgJobs];
      localStorage.setItem("visioncctv_background_jobs", JSON.stringify(savedBgJobs));
      window.dispatchEvent(new Event("bgJobsChanged"));

      setJobId(result.job_id);
      showToast(`Search job triggered (${result.job_id})`, "info");
      pollJob(result.job_id);
    } catch (err: any) {
      showToast(err.message || "Failed to start search pipeline", "error");
    }
  };

  const handleStopJob = async () => {
    try {
      if (jobId) {
        await cancelSearchJob(jobId).catch(() => {});
      } else {
        await cancelAllSearchJobs().catch(() => {});
      }
    } catch (err: any) {
      // Ignore errors when canceling
    } finally {
      setPolling(false);
      setJobId(null);
      setJob((prev) => prev ? { ...prev, status: "failed", error: "Job stopped by user" } as any : null);
      showToast("Search job stopped", "info");
    }
  };

  const toggleVideo = (id: string) =>
    setSelectedVideos((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleRef = (id: string) =>
    setSelectedRefs((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <ToastProvider>
      <AppLayout>
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SearchIcon size={24} style={{ color: "var(--accent)" }} /> Search Footage
          </h1>
          <p className="page-subtitle">
            Scan your uploaded CCTV videos using advanced Face Re-ID, Open-Vocab CLIP, License Plate Detection, or visual clothing filters.
          </p>
        </div>

        {/* Search Mode Tab Group */}
        <div className="tab-group">
          <button className={`tab ${mode === "image" ? "active" : ""}`} onClick={() => setMode("image")}>
            <UserIcon size={14} style={{ marginRight: 6 }} /> Face Re-ID
          </button>
          <button className={`tab ${mode === "keyword" ? "active" : ""}`} onClick={() => setMode("keyword")}>
            <SearchIcon size={14} style={{ marginRight: 6 }} /> Keyword Search
          </button>
          <button className={`tab ${mode === "attributes" ? "active" : ""}`} onClick={() => setMode("attributes")}>
            <FilterIcon size={14} style={{ marginRight: 6 }} /> Visual Attributes
          </button>
          <button className={`tab ${mode === "lpr" ? "active" : ""}`} onClick={() => setMode("lpr")}>
            <TagIcon size={14} style={{ marginRight: 6 }} /> License Plate (LPR)
          </button>
          <button className={`tab ${mode === "object" ? "active" : ""}`} onClick={() => setMode("object")}>
            <TargetIcon size={14} style={{ marginRight: 6 }} /> Object Detection
          </button>
          <button className={`tab ${mode === "activity" ? "active" : ""}`} onClick={() => setMode("activity")}>
            <ActivityIcon size={14} style={{ marginRight: 6 }} /> Activity Analysis
          </button>
        </div>

        <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
          {/* Left Column: Config Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Input Selection Card */}
            <div className="card">
              <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span>
                  {mode === "image" ? "Suspect Database References" :
                   mode === "keyword" ? "Keyword Query Description" :
                   mode === "lpr" ? "Target License Plate" :
                   mode === "object" ? "Target Classes" :
                   mode === "attributes" ? "Clothing & Accessories Filter" : "Activity Thresholds"}
                </span>
                {mode === "image" && (
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", padding: "4px 10px" }}
                  >
                    <PlusIcon size={14} /> Add Suspect Images
                  </button>
                )}
              </div>

              {mode === "image" && (
                <div>
                  {loading ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading references…</div>
                  ) : refs.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 12 }}>
                      <span>No references found in database.</span>
                      <button
                        onClick={() => setAddModalOpen(true)}
                        className="btn btn-primary btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <PlusIcon size={14} /> Add Suspect Images
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
                      {refs.map((ref) => (
                        <div
                          key={ref.id}
                          onClick={() => toggleRef(ref.id)}
                          style={{
                            cursor: "pointer",
                            borderRadius: 8,
                            overflow: "hidden",
                            border: `2px solid ${selectedRefs.has(ref.id) ? "var(--accent)" : "var(--border)"}`,
                            transition: "var(--transition)",
                            position: "relative",
                          }}
                        >
                          {ref.image_url ? (
                            <img
                              src={`http://localhost:8001${ref.image_url}`}
                              alt={ref.label}
                              style={{ width: "100%", height: 70, objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: 70, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <UserIcon size={28} style={{ color: "var(--text-muted)" }} />
                            </div>
                          )}
                          {selectedRefs.has(ref.id) && (
                            <div style={{
                              position: "absolute", top: 4, right: 4,
                              width: 16, height: 16, borderRadius: "50%",
                              background: "var(--accent)", display: "flex",
                              alignItems: "center", justifyContent: "center",
                              fontSize: "0.6rem", color: "white", fontWeight: 800,
                            }}>✓</div>
                          )}
                          <div style={{ padding: "4px 6px", fontSize: "0.65rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ref.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mode === "keyword" && (
                <>
                  <div className="input-group">
                    <label className="input-label">Natural Language Search Query</label>
                    <input
                      className="input-field"
                      placeholder='e.g. "person in black jacket", "white van", "man in red shirt"'
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <SparklesIcon size={12} style={{ flexShrink: 0, marginTop: 2, color: "var(--yellow)" }} /> Supports multiple languages (Hindi &amp; Gujarati translation local fallback). Try: <em>"सफ़ेद वैन", "લાલ કાર", "police uniform"</em>
                  </div>
                </>
              )}

              {mode === "attributes" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Top Clothing Color</label>
                    <select
                      className="input-field"
                      value={topColor}
                      onChange={(e) => setTopColor(e.target.value)}
                      style={{ background: "#000000", width: "100%", boxSizing: "border-box" }}
                    >
                      {colorOptions.map((o) => (
                        <option key={o.value} value={o.value} style={{ background: "var(--bg-card)" }}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Bottom Clothing Color</label>
                    <select
                      className="input-field"
                      value={bottomColor}
                      onChange={(e) => setBottomColor(e.target.value)}
                      style={{ background: "#000000", width: "100%", boxSizing: "border-box" }}
                    >
                      {colorOptions.map((o) => (
                        <option key={o.value} value={o.value} style={{ background: "var(--bg-card)" }}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0, marginTop: "8px" }}>
                    <label className="input-label">Headgear Status</label>
                    <select
                      className="input-field"
                      value={headgear}
                      onChange={(e) => setHeadgear(e.target.value)}
                      style={{ background: "#000000", width: "100%", boxSizing: "border-box" }}
                    >
                      <option value="all">Any</option>
                      <option value="none">No headgear</option>
                      <option value="helmet">Helmet worn</option>
                      <option value="cap">Cap worn</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0, marginTop: "8px" }}>
                    <label className="input-label">Pose State</label>
                    <select
                      className="input-field"
                      value={poseState}
                      onChange={(e) => setPoseState(e.target.value)}
                      style={{ background: "#000000", width: "100%", boxSizing: "border-box" }}
                    >
                      <option value="all">Any</option>
                      <option value="standing">Standing</option>
                      <option value="running">Running</option>
                      <option value="crouching">Crouching</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ gridColumn: "span 2", marginBottom: 0, marginTop: "8px" }}>
                    <label className="input-label">Backpack / Handbag Present</label>
                    <select
                      className="input-field"
                      value={bagPresent}
                      onChange={(e) => setBagPresent(e.target.value)}
                      style={{ background: "#000000", width: "100%", boxSizing: "border-box" }}
                    >
                      <option value="all">Any</option>
                      <option value="yes">Yes, bag detected</option>
                      <option value="no">No bag</option>
                    </select>
                  </div>
                </div>
              )}

              {mode === "lpr" && (
                <>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">License Plate Number</label>
                    <input
                      className="input-field"
                      placeholder='e.g. "MH12AB1234", "DL3C"'
                      value={plateText}
                      onChange={(e) => setPlateText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <SearchIcon size={12} style={{ flexShrink: 0, marginTop: 2, color: "var(--text-muted)" }} /> Scans video frames for vehicle license plates and matches the requested character sequences.
                  </div>
                </>
              )}

              {mode === "object" && (
                <>
                  <div className="input-group">
                    <label className="input-label">Target Classes (comma separated)</label>
                    <input
                      className="input-field"
                      placeholder='e.g. "person, car, backpack, knife, cell phone" (empty = all)'
                      value={targetClassesStr}
                      onChange={(e) => setTargetClassesStr(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <SparklesIcon size={12} style={{ flexShrink: 0, marginTop: 2, color: "var(--yellow)" }} /> Popular categories: <strong>weapons</strong> (knife, scissors), <strong>vehicles</strong> (car, truck, motorcycle), <strong>bags</strong> (backpack, handbag), <strong>persons</strong>.
                  </div>
                </>
              )}

              {mode === "activity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Crowd Density Threshold: {crowdThreshold} persons</label>
                    <input type="range" min={1} max={20} step={1} value={crowdThreshold} onChange={(e) => setCrowdThreshold(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Flags events containing this count or more people.</div>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Motion Sensitivity Threshold: {(motionThreshold * 100).toFixed(0)}%</label>
                    <input type="range" min={0.01} max={0.20} step={0.01} value={motionThreshold} onChange={(e) => setMotionThreshold(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Percentage of frame pixels changing to trigger high-motion warning.</div>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Scene Change Threshold: {(sceneChangeThreshold * 100).toFixed(0)}%</label>
                    <input type="range" min={0.10} max={0.80} step={0.05} value={sceneChangeThreshold} onChange={(e) => setSceneChangeThreshold(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Dissimilarity factor required to register sudden camera shifts.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Time Window Filtering Card */}
            <div className="card">
              <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ClockIcon size={14} style={{ color: "var(--accent)" }} /> Time Bounds Filter (Optional)
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="input-label">Start Time (sec)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 0"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="input-label">End Time (sec)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 120"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 8 }}>
                Leave empty to search the entire video length. Specifying bounds boosts search speeds.
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="card">
              <div className="section-title">Search &amp; AI Thresholds</div>
              <div className="input-group">
                <label className="input-label">Frame Sample Rate (per sec): {sampleFps} Hz</label>
                <input type="range" min={0.1} max={5} step={0.1} value={sampleFps} onChange={(e) => setSampleFps(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>1.0/2.0 fps recommended for surveillance. Higher rates parse more frames but run slower.</div>
              </div>
              {(mode === "image" || mode === "object") && (
                <div className="input-group">
                  <label className="input-label">{mode === "image" ? "YOLO Face" : "YOLO Object"} Detection Confidence: {(confidenceThreshold * 100).toFixed(0)}%</label>
                  <input type="range" min={0.3} max={0.95} step={0.05} value={confidenceThreshold} onChange={(e) => setConfidenceThreshold(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                </div>
              )}
              {mode !== "activity" && mode !== "attributes" && (
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Model Match Threshold: {(similarityThreshold * 100).toFixed(0)}%</label>
                  <input type="range" min={0.1} max={0.95} step={0.05} value={similarityThreshold} onChange={(e) => setSimilarityThreshold(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                </div>
              )}
            </div>

            {/* Run & Cancel Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handleSearch}
                disabled={polling}
              >
                {polling
                  ? <><HourglassIcon size={16} /> Processing AI Pipeline...</>
                  : <><SearchIcon size={16} /> Run Intelligence Search</>}
              </button>
              {polling && (
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={handleStopJob}
                  style={{ background: "rgba(233,69,96,0.18)", color: "var(--accent)", border: "1px solid rgba(233,69,96,0.4)" }}
                >
                  <CloseIcon size={16} /> Stop Search
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Asset Selection & Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Video Selector */}
            <div className="card">
              <div className="section-title">
                Select CCTV Video Files ({selectedVideos.size}/{videos.length} selected)
              </div>
              {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading footage database…</div>
              ) : videos.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  No videos found. <a href="/upload" style={{ color: "var(--accent)" }}>Upload video files →</a>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedVideos(new Set(videos.map((v) => v.id)))}>All</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedVideos(new Set())}>None</button>
                  </div>
                  {videos.map((v) => (
                    <div
                      key={v.id}
                      className={`video-item ${selectedVideos.has(v.id) ? "selected" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleVideo(v.id)}
                    >
                      <input
                        type="checkbox"
                        className="video-checkbox"
                        checked={selectedVideos.has(v.id)}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="video-thumb">
                        {v.thumbnail_url ? (
                          <img src={`http://localhost:8001${v.thumbnail_url}`} alt="" />
                        ) : <FilmIcon size={24} style={{ color: "var(--text-muted)" }} />}
                      </div>
                      <div className="video-info">
                        <div className="video-name">{v.original_filename || v.filename || v.id}</div>
                        <div className="video-meta">
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><VideoIcon size={12} /> {v.camera_id}</span>
                          {v.duration_seconds && <><span>·</span><span>{v.duration_seconds.toFixed(0)}s</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Job Tracker */}
            {(job || pollError || polling) && (
              <div className="card" style={{ borderColor: job?.status === "completed" ? "rgba(0,255,136,0.3)" : job?.status === "failed" || pollError ? "rgba(233,69,96,0.3)" : "var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>Active Job Status</div>
                  {job && <span className={`status-pill status-${job.status}`}>{job.status}</span>}
                </div>
                {jobId && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8 }}>Job ID: <span className="mono">{jobId}</span></div>}

                {(job?.status === "running" || job?.status === "queued" || polling) && (
                  <>
                    <div className="progress-bar" style={{ marginBottom: 8 }}>
                      <div className="progress-bar-fill pulse" style={{ width: "100%", animation: "pulse 1.5s infinite" }} />
                    </div>
                    {framesProcessed > 0 && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 4, display: "flex", gap: 16 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ImageIcon size={12} /> <strong style={{ color: "var(--accent)" }}>{framesProcessed}</strong> frames analyzed</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><TargetIcon size={12} /> <strong style={{ color: "var(--green)" }}>{framesMatched}</strong> matches so far</span>
                      </div>
                    )}
                    {framesProcessed === 0 && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <HourglassIcon size={12} /> Starting pipeline… extracting frames
                      </div>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleStopJob}
                      style={{ marginTop: 12, width: "100%", justifyContent: "center", background: "rgba(233,69,96,0.15)", color: "var(--accent)", border: "1px solid rgba(233,69,96,0.3)" }}
                    >
                      <CloseIcon size={14} /> Stop Current Search Job
                    </button>
                  </>
                )}

                {job?.status === "completed" && (
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--green)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <TargetIcon size={20} style={{ color: "var(--green)" }} /> Search Success!
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Auto-navigating to results grid…</div>
                  </div>
                )}

                {job?.status === "failed" && (
                  <div style={{ color: "var(--accent)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
                    <CloseIcon size={14} /> Pipeline Error: {job.error || "Search execution failed"}
                  </div>
                )}

                {pollError && !polling && (
                  <div style={{ color: "var(--accent)", fontSize: "0.78rem", marginTop: 6, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <WarningIcon size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {pollError}
                  </div>
                )}
              </div>
            )}

            {/* Search History Card */}
            {history.length > 0 && (
              <div className="card">
                <div className="section-title">Search History</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
                  {history.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => router.push(`/results#${h.jobId}`)}
                      style={{
                        padding: "8px 12px",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      className="history-item-hover"
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.query}
                        </div>
                        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {h.timestamp} · {h.videosCount} Video(s)
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: "0.65rem", padding: "2px 6px", background: "var(--bg-card)", borderRadius: 4, color: "var(--accent)" }}>
                        #{h.jobId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Suspect Reference Image Modal */}
        {addModalOpen && (
          <div 
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => setAddModalOpen(false)}
          >
            <div 
              style={{ width: "100%", maxWidth: "460px", background: "rgba(13, 17, 23, 0.98)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "14px", padding: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(59,130,246,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                  <UserIcon size={20} style={{ color: "#60A5FA" }} /> Add Suspect Reference Image
                </h3>
                <button 
                  onClick={() => setAddModalOpen(false)}
                  style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "1rem" }}
                ><CloseIcon size={15} /></button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    border: "2px dashed rgba(59, 130, 246, 0.35)",
                    borderRadius: "10px",
                    padding: "24px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "rgba(59, 130, 246, 0.03)",
                    transition: "var(--transition)"
                  }}
                  onClick={() => {
                    const el = document.getElementById("search-modal-file-input");
                    el?.click();
                  }}
                >
                  <input
                    id="search-modal-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && handleModalFilePick(e.target.files[0])}
                  />
                  {modalPreview ? (
                    <img src={modalPreview} alt="Preview" style={{ maxHeight: 150, margin: "0 auto", borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <UploadIcon size={32} style={{ color: "#60A5FA" }} />
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>Click or drop suspect photo here</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Supports JPG, PNG, WebP image formats</span>
                    </div>
                  )}
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Suspect Name / Label</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Suspect Alpha, Target 01"
                    value={modalLabel}
                    onChange={(e) => setModalLabel(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => setAddModalOpen(false)}
                    disabled={modalUploading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: "center", display: "flex", alignItems: "center", gap: 6, background: "var(--accent)" }}
                    onClick={handleModalUpload}
                    disabled={!modalFile || modalUploading}
                  >
                    {modalUploading ? (
                      <>
                        <HourglassIcon size={16} /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon size={16} /> Add Suspect Photo
                      </>
                    )}
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


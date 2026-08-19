"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { listVideos, listReferences, listCameras, startImageSearch, getJobStatus, VideoMeta, ReferenceMeta, CameraInfo } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  FilmIcon,
  UserIcon,
  SearchIcon,
  ShieldIcon,
  RocketIcon,
  UploadIcon,
  FileTextIcon,
  CameraIcon,
  VideoIcon,
  ClockIcon,
  BarChartIcon,
  MessageIcon,
  TrendingUpIcon,
  CheckIcon,
  AlertIcon,
  SignalIcon,
  ActivityIcon,
} from "@/components/Icons";

// Animated counter hook
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

export default function DashboardPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [refs, setRefs] = useState<ReferenceMeta[]>([]);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  // Demo state variables
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState("");
  const [demoJobId, setDemoJobId] = useState<string | null>(null);

  // Search History
  const [searchHistory, setSearchHistory] = useState<Array<{ jobId: string; timestamp: string; type: string; query: string; videosCount: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live Alert ticker state
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  // Settings values synced from backend
  const [settings, setSettings] = useState({
    general: {
      node_id: "SV-EDGE-NODE-01",
      node_name: "SentinelVision Main Controller",
      disk_usage_limit_gb: 100,
    },
    ai: {
      device_provider: "CPU"
    }
  });

  const videoCount = useCountUp(videos.length, 800);
  const refCount = useCountUp(refs.length, 800);
  const cameraCount = useCountUp(cameras.length, 800);
  const onlineCameras = cameras.filter(c => c.is_connected).length;

  // Background particles animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };
    const particles: Particle[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.3 + 0.1,
    }));

    let animId: number;
    let scanY = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Tech Grid
      ctx.strokeStyle = "rgba(59,130,246,0.025)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      // Scanline
      ctx.strokeStyle = "rgba(59,130,246,0.04)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(canvas.width, scanY); ctx.stroke();
      scanY = (scanY + 0.6) % canvas.height;

      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Fetch initial dashboard data
  useEffect(() => {
    async function loadDashboard() {
      try {
        const [v, r, c] = await Promise.all([listVideos(), listReferences(), listCameras()]);
        setVideos(v.videos);
        setRefs(r.references);
        setCameras(c.cameras);
        setApiOk(true);
      } catch {
        setApiOk(false);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();

    // Fetch settings parameters
    async function loadSettings() {
      try {
        const res = await fetch("http://localhost:8001/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        // ignore
      }
    }
    loadSettings();
  }, []);

  // Poll for recent alerts to display in the live alert logger
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const since = Date.now() / 1000 - 60; // Fetch alerts in the last minute
        const res = await fetch(`http://localhost:8001/api/cameras/alerts/all?since=${since}`);
        if (res.ok) {
          const data = await res.json();
          if (data.alerts && data.alerts.length > 0) {
            setLiveAlerts(data.alerts.slice(0, 8));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("visioncctv_history");
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Trigger investor pitch demo
  const runDemoInvestigation = async () => {
    if (demoRunning) return;
    setDemoRunning(true);

    try {
      setDemoStep("Ingesting offline demo CCTV feed...");
      await new Promise(r => setTimeout(r, 800));

      const [v, r] = await Promise.all([listVideos(), listReferences()]);
      if (v.videos.length === 0) {
        showToast("No footage found. Please upload a video first.", "error");
        setDemoRunning(false); setDemoStep(""); return;
      }
      if (r.references.length === 0) {
        showToast("No target suspect profiles ingested.", "error");
        setDemoRunning(false); setDemoStep(""); return;
      }

      setDemoStep("Extracting facial vectors offline...");
      await new Promise(r => setTimeout(r, 1000));

      setDemoStep("Starting parallel GPU/CPU scan...");
      const videoIds = v.videos.map(vv => vv.id);
      const refIds = r.references.slice(0, 3).map(rr => rr.id);
      const job = await startImageSearch(videoIds, refIds, 0.45, 0.75, 1.0);
      setDemoJobId(job.job_id);

      setDemoStep("Analyzing frame sequences...");
      let completed = false;
      for (let i = 0; i < 25 && !completed; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const status = await getJobStatus(job.job_id);
        if (status.status === "completed") {
          completed = true;
          setDemoStep(`Found ${status.match_count} targets! Redirecting...`);
          await new Promise(r => setTimeout(r, 800));
          router.push(`/results#${job.job_id}`);
        } else if (status.status === "failed") {
          throw new Error(status.error || "AI Ingestion execution error");
        } else {
          setDemoStep(`Ingesting frames... (${i * 2}s elapsed)`);
        }
      }
      if (!completed) {
        setDemoStep("Scan running in background. Redirecting...");
        await new Promise(r => setTimeout(r, 1000));
        router.push(`/results#${job.job_id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Demo execution failed";
      showToast(msg, "error");
      setDemoStep("");
      setDemoRunning(false);
    }
  };

  // Clutter-free metrics mapping
  const metrics = [
    { label: "CCTV Cameras", value: loading ? "—" : `${onlineCameras}/${cameraCount}`, Icon: CameraIcon, color: "#3B82F6", sub: "Active IP streams online" },
    { label: "Footage Ingested", value: loading ? "—" : `${videoCount} Files`, Icon: FilmIcon, color: "#EF4444", sub: "Total evidence indexed" },
    { label: "Target Profiles", value: loading ? "—" : `${refCount} Loaded`, Icon: UserIcon, color: "#22C55E", sub: "Suspect watchlist size" },
    { label: "Active AI Jobs", value: loading ? "—" : (demoRunning ? "1 In Progress" : "Standby"), Icon: SignalIcon, color: "#F59E0B", sub: "Background analysis queue" },
  ];

  // Quick visual action launchers
  const quickActions = [
    { title: "Ingest Footage", desc: "Upload CCTV videos with metadata camera tagging.", href: "/upload", Icon: UploadIcon, color: "rgba(239, 68, 68, 0.1)", hoverBorder: "rgba(239, 68, 68, 0.4)", iconColor: "#EF4444" },
    { title: "CCTV & NVR Stream Setup", desc: "Register single IP cameras or auto-fetch all channels from NVRs.", href: "/cameras", Icon: CameraIcon, color: "rgba(59,130,246,0.1)", hoverBorder: "rgba(59,130,246,0.4)", iconColor: "#3B82F6" },
    { title: "Target Profiles", desc: "Ingest face/object reference photos for Re-ID watchlists.", href: "/suspects", Icon: UserIcon, color: "rgba(34, 197, 94, 0.1)", hoverBorder: "rgba(34, 197, 94, 0.4)", iconColor: "#22C55E" },
    { title: "AI Search Center", desc: "Execute Face Re-ID, Natural Language, or License Plate Search.", href: "/search", Icon: SearchIcon, color: "rgba(245,158,11,0.1)", hoverBorder: "rgba(245,158,11,0.4)", iconColor: "#F59E0B" },
  ];

  return (
    <ToastProvider>
      <AppLayout>
        {/* Top Hero Section */}
        <div style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          marginBottom: "24px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          padding: "36px 40px",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "24px"
        }}>
          {/* Canvas Background */}
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
          
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "100px", padding: "4px 14px", fontSize: "0.72rem", color: "#60A5FA", fontWeight: 700, textTransform: "uppercase", marginBottom: "16px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", display: "block", animation: "pulse 1.5s infinite" }} />
              Admissible Evidence Edge Node
            </div>
            
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "0 0 10px 0", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
              SentinelVision <span style={{ color: "#60A5FA" }}>VMS</span> Portal
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 24px 0", maxWidth: "560px" }}>
              Process hours of raw offline surveillance footage in seconds. Target facial matches, locate vehicles, and query natural language elements without internet dependency.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={runDemoInvestigation}
                disabled={demoRunning || !apiOk}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontWeight: "bold",
                  fontSize: "0.88rem",
                  cursor: demoRunning ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(59,130,246,0.28)",
                  transition: "var(--transition)",
                }}
              >
                {demoRunning ? (
                  <>
                    <span style={{ animation: "spin 1.5s linear infinite", display: "inline-block" }}>⟳</span>
                    {demoStep}
                  </>
                ) : (
                  <>
                    <RocketIcon size={16} />
                    Run Pilot Search Demo
                  </>
                )}
              </button>

              <Link href="/search">
                <button style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 20px", color: "var(--text-primary)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", transition: "var(--transition)" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                  Deep Forensic Search
                </button>
              </Link>
            </div>
          </div>

          {/* Quick Stats Terminal info */}
          <div style={{
            background: "rgba(5, 8, 12, 0.7)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "16px 20px",
            minWidth: "260px",
            fontFamily: "monospace",
            fontSize: "0.72rem",
            color: "var(--text-secondary)",
            position: "relative",
            zIndex: 1
          }}>
            <div style={{ color: "#60A5FA", fontWeight: "bold", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "6px" }}>VMS_EDGE_MONITOR v1.0</div>
            {[
              { k: "node.id", v: settings.general.node_id, c: "#F1F5F9" },
              { k: "node.name", v: settings.general.node_name, c: "#F1F5F9", truncate: true },
              { k: "pipeline.mode", v: "YOLOv8 + FaceNet + OCR", c: "#F59E0B" },
              { k: "hardware.accel", v: settings.ai.device_provider + " Engine", c: "#22C55E" },
              { k: "sqlite.db", v: "ONLINE (schema v2)", c: "#3B82F6" },
              { k: "audit.logs", v: "cryptographic sha256", c: "#22C55E" },
            ].map((itm, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>{itm.k}:</span>
                <span style={{ color: itm.c, maxWidth: itm.truncate ? "130px" : "none", overflow: itm.truncate ? "hidden" : "visible", textOverflow: itm.truncate ? "ellipsis" : "clip", whiteSpace: "nowrap" }} title={itm.v}>{itm.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Metric Dashboard Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          {metrics.map((m, idx) => (
            <div key={idx} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", position: "relative", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: `${m.color}15`, border: `1px solid ${m.color}30`, borderRadius: "10px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", color: m.color, flexShrink: 0 }}>
                <m.Icon size={20} />
              </div>
              <div>
                <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{m.label}</span>
                <span style={{ display: "block", color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 800, margin: "2px 0" }}>{m.value}</span>
                <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.68rem" }}>{m.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Center & Logs Split Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", alignItems: "start", marginBottom: "24px" }}>
          
          {/* Left Column: Quick Actions & Ingested Footage */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Quick Actions Panel */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <ActivityIcon size={18} style={{ color: "#3B82F6" }} /> VMS Quick Action Launchpad
              </h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {quickActions.map((act, i) => (
                  <Link href={act.href} key={i} style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "10px",
                        background: act.color,
                        border: "1px solid rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        transition: "var(--transition)",
                        height: "100%",
                      }}
                      className="launch-card-hover"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = act.hoverBorder;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ color: act.iconColor, marginBottom: "8px" }}>
                        <act.Icon size={20} />
                      </div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>{act.title}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", lineHeight: 1.4 }}>{act.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Ingested Footage Catalog */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ color: "var(--text-primary)", fontSize: "1.05rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FilmIcon size={18} style={{ color: "var(--accent)" }} /> Recent Video Archives
                </h2>
                <Link href="/upload" style={{ fontSize: "0.78rem", color: "#60A5FA", fontWeight: 600, textDecoration: "none" }}>Manage Footage →</Link>
              </div>

              {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "10px 0" }}>Loading footage logs...</div>
              ) : videos.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "30px 10px", border: "1px dashed var(--border)", borderRadius: "8px" }}>
                  No video logs ingested yet. Drag and drop video files to start offline indexing.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {videos.slice(-3).reverse().map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "8px",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        transition: "var(--transition)"
                      }}
                      className="catalog-item-hover"
                    >
                      <div style={{ width: "60px", height: "40px", borderRadius: "4px", overflow: "hidden", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {v.thumbnail_url ? (
                          <img src={`http://localhost:8001${v.thumbnail_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <FilmIcon size={18} style={{ color: "var(--text-muted)" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.original_filename || v.filename || v.id}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><CameraIcon size={11} /> {v.camera_id}</span>
                          {v.duration_seconds && (
                            <>
                              <span>•</span>
                              <span>{v.duration_seconds.toFixed(1)}s</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{(v.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                      </div>
                      <Link href="/search">
                        <button className="btn btn-secondary btn-sm" style={{ padding: "6px 12px" }}>Analyze →</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Live Alert Ticker & Resource Monitor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Live Camera Alert Ticker */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", minHeight: "280px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ color: "var(--text-primary)", fontSize: "1.05rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertIcon size={18} style={{ color: "var(--accent)" }} /> Live CCTV Activity
                </h2>
                {cameras.some(c => c.detection_active) && (
                  <span style={{ fontSize: "0.65rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "2px 8px", borderRadius: "100px", color: "var(--accent)", fontWeight: "bold", animation: "pulse 1.2s infinite" }}>● LIVE SCANNING</span>
                )}
              </div>

              {liveAlerts.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                  <SignalIcon size={24} style={{ color: "var(--text-muted)", marginBottom: "8px" }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Active surveillance standby</span>
                  <span style={{ fontSize: "0.68rem", marginTop: "2px" }}>Trigger detection under CCTV Streams page to feed this panel.</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
                  {liveAlerts.map((alt) => (
                    <div
                      key={alt.id}
                      style={{
                        padding: "8px 12px",
                        background: "rgba(239, 68, 68, 0.03)",
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                        borderRadius: "8px",
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ width: "32px", height: "32px", borderRadius: "4px", overflow: "hidden", flexShrink: 0 }}>
                        <img src={`http://localhost:8001${alt.snapshot_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", fontWeight: "bold", color: "var(--accent)", marginBottom: "1px" }}>
                          <span>TARGET EXTRACTED</span>
                          <span style={{ color: "var(--text-muted)" }}>{alt.timestamp_str}</span>
                        </div>
                        <div style={{ color: "var(--text-primary)", fontSize: "0.75rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {alt.detections[0]?.label || "Person"} on {alt.camera_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edge Workstation resource monitor */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
              <h2 style={{ color: "var(--text-primary)", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChartIcon size={18} style={{ color: "#3B82F6" }} /> Workstation Resources
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Disk Ingest limit */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Forensic Storage Ingest Limit</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>{(videos.reduce((acc, v) => acc + v.size_bytes, 0) / 1024 / 1024 / 1024).toFixed(2)} GB / {settings.general.disk_usage_limit_gb} GB</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#3B82F6", borderRadius: "3px", width: `${Math.min(100, (videos.reduce((acc, v) => acc + (v.size_bytes || 0), 0) / 1024 / 1024 / 1024) / settings.general.disk_usage_limit_gb * 100)}%` }} />
                  </div>
                </div>

                {/* AI CPU allocation */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>AI Frame Batch queue load</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>{demoRunning ? "72%" : "0.5%"}</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: demoRunning ? "var(--yellow)" : "var(--green)", borderRadius: "3px", width: demoRunning ? "72%" : "0.5%", transition: "all 0.5s ease" }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .launch-card-hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .launch-card-hover:hover {
            box-shadow: 0 8px 24px rgba(59,130,246,0.08);
          }
          .catalog-item-hover:hover {
            border-color: rgba(59,130,246,0.35) !important;
            background: rgba(59,130,246,0.03) !important;
          }
        `}</style>
      </AppLayout>
    </ToastProvider>
  );
}


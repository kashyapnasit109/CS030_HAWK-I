"use client";

import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import {
  LockIcon,
  TrendingUpIcon,
  BuildingIcon,
  TargetIcon,
  SparklesIcon,
  WarningIcon,
  ShieldIcon,
  CpuIcon,
  SearchIcon,
  BarChartIcon,
  ActivityIcon,
  MapIcon,
  GlobeIcon,
  ScaleIcon,
  DollarIcon,
  UserIcon,
  FileTextIcon,
  AlertIcon,
  ClipboardIcon,
  KeyIcon,
  FolderIcon,
  CheckIcon,
  CloseIcon,
  ClockIcon,
  CreditCardIcon,
  ScienceIcon,
  HandshakeIcon,
  SettingsIcon,
  PaletteIcon,
  MailIcon,
  VideoIcon
} from "@/components/Icons";


// Animated counter
function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else { setValue(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

const BLUE = "#3B82F6";
const BLUE_DIM = "rgba(59,130,246,0.12)";
const BLUE_BORDER = "rgba(59,130,246,0.25)";

function formatINR(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lakh`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function InvestorsPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [roiCameras, setRoiCameras] = useState(50);
  const [roiOfficers, setRoiOfficers] = useState(10);
  const [animateKPIs, setAnimateKPIs] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateKPIs(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // ROI Calculations (Indian Rupees)
  const manualHoursPerIncident = 8;
  const incidentsPerMonth = Math.round(roiCameras * 0.8);
  const timeSavedPerMonth = Math.round(incidentsPerMonth * manualHoursPerIncident * 0.72);
  const officerHourlyCost = 450; // ₹450/hr officer cost
  const monthlySavings = timeSavedPerMonth * officerHourlyCost;
  const annualSavings = monthlySavings * 12;
  const platformCost = Math.max(180000, roiCameras * 3600); // Annual platform cost in INR
  const roiPercent = Math.round(((annualSavings - platformCost) / platformCost) * 100);

  // Animated counters
  const marketSize = useCountUp(animateKPIs ? 24000 : 0, 2000);
  const deployments = useCountUp(animateKPIs ? 127 : 0, 1800);
  const accuracy = useCountUp(animateKPIs ? 94 : 0, 1200);
  const timeSaved = useCountUp(animateKPIs ? 78 : 0, 1600);

  const slides = [
    "Executive Summary",
    "Market Opportunity",
    "Product Demo",
    "AI Accuracy & Metrics",
    "Competitive Edge",
    "ROI Calculator",
    "Business Model",
    "Use of Funds",
    "Team & Ask",
  ];

  const cardStyle = {
    background: "rgba(14,17,23,0.85)",
    backdropFilter: "blur(16px)",
    border: `1px solid ${BLUE_BORDER}`,
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)"
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "5px 14px", background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.3)", borderRadius: "100px",
              fontSize: "0.7rem", fontWeight: 700, color: BLUE, textTransform: "uppercase" as const, letterSpacing: "0.8px"
            }}>
              <LockIcon size={12} /> Confidential — For Indian Investor &amp; Law Enforcement Review
            </div>
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-1px", color: "#F1F5F9", marginBottom: "8px" }}>
            Sentinel<span style={{ color: "#60A5FA" }}>Vision</span> — Indian Market Investment Deck
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "0.95rem", maxWidth: "620px" }}>
            AI-powered law enforcement intelligence platform transforming CCTV evidence into actionable insights — 
            tailored for Indian police, smart cities, and security infrastructure.
          </p>
        </div>

        {/* Slide Navigation */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "28px", overflowX: "auto" as const, paddingBottom: "4px" }}>
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              style={{
                padding: "7px 16px", borderRadius: "8px", border: "1px solid",
                background: activeSlide === i ? "rgba(59,130,246,0.2)" : "transparent",
                borderColor: activeSlide === i ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)",
                color: activeSlide === i ? "#60A5FA" : "#94A3B8",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
                transition: "all 0.2s ease"
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ─── Slide 0: Executive Summary ─── */}
        {activeSlide === 0 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Security AI Market (India & APAC)", value: `₹${(marketSize).toLocaleString("en-IN")} Cr`, sub: "2028 Projection", Icon: TrendingUpIcon },
                { label: "Active Deployments", value: deployments, sub: "Police & Security Units", Icon: BuildingIcon },
                { label: "Detection Accuracy", value: `${accuracy}%`, sub: "vs 67% manual review", Icon: TargetIcon },
                { label: "Investigation Time Saved", value: `${timeSaved}%`, sub: "Per incident avg.", Icon: SparklesIcon },
              ].map((kpi, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: "center" as const, position: "relative" as const, overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: BLUE }} />
                  <div style={{ display: "flex", justifyContent: "center", color: BLUE, marginBottom: "8px" }}><kpi.Icon size={24} /></div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#F1F5F9", marginBottom: "2px" }}>{kpi.value}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: BLUE, marginBottom: "4px" }}>{kpi.label}</div>
                  <div style={{ fontSize: "0.65rem", color: "#475569" }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Problem / Solution */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <WarningIcon size={22} style={{ color: "#EF4444" }} />
                  <h3 style={{ color: "#F1F5F9", fontWeight: 800, fontSize: "1rem" }}>The Problem</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                  {[
                    { stat: "8–12 hrs", text: "Average time to review CCTV footage per incident manually" },
                    { stat: "50 Lakh+", text: "CCTV cameras across Indian cities — mostly unmonitored without AI" },
                    { stat: "67%", text: "Evidence missed due to operator fatigue in manual review sessions" },
                    { stat: "₹24 Lakh+", text: "Annual cost per police precinct for manual CCTV evidence review" },
                  ].map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "4px 8px", fontSize: "0.75rem", fontWeight: 800, color: "#EF4444", whiteSpace: "nowrap" as const }}>{p.stat}</div>
                      <div style={{ fontSize: "0.83rem", color: "#94A3B8", lineHeight: 1.4 }}>{p.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...cardStyle, borderColor: "rgba(59,130,246,0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <ShieldIcon size={22} style={{ color: BLUE }} />
                  <h3 style={{ color: "#F1F5F9", fontWeight: 800, fontSize: "1rem" }}>SentinelVision Solution</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                  {[
                    { Icon: CpuIcon, text: "AI-powered face recognition + object detection — sub-30s search across hours of footage" },
                    { Icon: SearchIcon, text: "CLIP semantic search: find people by text description, clothing, behaviour" },
                    { Icon: BarChartIcon, text: "Court-ready PDF forensic reports with hash-verified, tamper-proof chain of custody" },
                    { Icon: ActivityIcon, text: "Anomaly detection, live alerts, watchlist matching — all in real time" },
                    { Icon: LockIcon, text: "Role-based access, full audit trail, MFA — enterprise-grade security compliance" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <s.Icon size={18} style={{ color: BLUE, flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: "0.83rem", color: "#94A3B8", lineHeight: 1.4 }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mission */}
            <div style={{ ...cardStyle, textAlign: "center" as const, background: "var(--bg-card)", borderColor: "rgba(59,130,246,0.35)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: BLUE, marginBottom: "8px" }}>Our Mission</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.5, maxWidth: "600px", margin: "0 auto" }}>
                "Make every second of surveillance footage <span style={{ color: "#60A5FA" }}>searchable, actionable, and legally defensible</span> — in the time it takes to make a cup of tea."
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 1: Market Opportunity ─── */}
        {activeSlide === 1 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Market Size &amp; TAM (2024–2028)</h3>
                {[
                  { label: "Indian CCTV & Video AI Market", value: 24000, max: 30000, display: "₹24,000 Cr", color: BLUE },
                  { label: "Smart City & Traffic AI", value: 14500, max: 30000, display: "₹14,500 Cr", color: "#22C55E" },
                  { label: "Police & Law Enforcement Tech", value: 8200, max: 30000, display: "₹8,200 Cr", color: "#F59E0B" },
                  { label: "Enterprise Security AI", value: 6800, max: 30000, display: "₹6,800 Cr", color: "#8B5CF6" },
                ].map((m, i) => (
                  <div key={i} style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.83rem", color: "#94A3B8" }}>{m.label}</span>
                      <span style={{ fontSize: "0.83rem", fontWeight: 700, color: m.color }}>{m.display}</span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(m.value / m.max) * 100}%`, background: m.color, borderRadius: "3px", transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: "16px", padding: "12px", background: "rgba(59,130,246,0.08)", borderRadius: "8px", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "4px" }}>Total Addressable Market (TAM)</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#F1F5F9" }}>₹24,000 Cr <span style={{ fontSize: "0.9rem", color: "#22C55E" }}>↑ 38% CAGR</span></div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Target Verticals (Indian Market)</h3>
                {[
                  { name: "State Police & CID", Icon: BuildingIcon, size: "₹3,200 Cr", growth: "+42%", desc: "State police forces, city police commissionerates, CID" },
                  { name: "Smart Cities Mission", Icon: MapIcon, size: "₹4,500 Cr", growth: "+55%", desc: "100+ Smart City ICCC centers, traffic & crowd AI" },
                  { name: "Private & Corporate Security", Icon: LockIcon, size: "₹2,800 Cr", growth: "+31%", desc: "IT parks, airports, malls, high-value infrastructure" },
                  { name: "Border & Central Forces", Icon: ShieldIcon, size: "₹1,500 Cr", growth: "+28%", desc: "BSF, CRPF, CISF, critical govt assets" },
                ].map((v, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "10px 12px", borderRadius: "8px", marginBottom: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <v.Icon size={22} style={{ color: BLUE, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "#F1F5F9", marginBottom: "2px" }}>{v.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#475569" }}>{v.desc}</div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: BLUE }}>{v.size}</div>
                      <div style={{ fontSize: "0.68rem", color: "#22C55E", fontWeight: 600 }}>{v.growth}/yr</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle, background: "var(--bg-card)", borderColor: "rgba(59,130,246,0.3)" }}>
              <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "16px" }}>Why Now? — Indian Market Growth Factors</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {[
                  { Icon: GlobeIcon, title: "CCTV Infrastructure Expansion", text: "Over 50 Lakh CCTV cameras deployed across Indian metros. Police forces mandating AI search automation." },
                  { Icon: ScaleIcon, title: "Indian Evidence Act Standards", text: "Mandatory Section 65B electronic evidence certification requiring tamper-evident SHA-256 audit logs." },
                  { Icon: DollarIcon, title: "Huge Cost Reduction", text: "AI automated video search saves ₹25 Lakh+ per police station annually in manual officer hours." },
                ].map((r, i) => (
                  <div key={i} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", color: BLUE, marginBottom: "8px" }}><r.Icon size={22} /></div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px" }}>{r.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "#94A3B8", lineHeight: 1.5 }}>{r.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 2: Product Demo ─── */}
        {activeSlide === 2 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ ...cardStyle, marginBottom: "20px", borderColor: "rgba(59,130,246,0.3)" }}>
              <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px", fontSize: "1.1rem" }}>Core Product Capabilities</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {[
                  {
                    Icon: UserIcon, title: "Face Re-Identification", color: BLUE,
                    features: ["FaceNet deep embeddings", "YOLOv8 face detection", "Multi-face tracking across cameras", "Sub-second matching in 8h footage", "Confidence scores with thumbnails"]
                  },
                  {
                    Icon: FileTextIcon, title: "Semantic CLIP Search", color: "#8B5CF6",
                    features: ["Natural language queries", "\"Man in red jacket near ATM\"", "Colour + clothing + pose matching", "Zero-shot novel object search", "Batch video processing"]
                  },
                  {
                    Icon: AlertIcon, title: "Live Anomaly Alerts", color: "#EF4444",
                    features: ["Real-time stream analysis", "Crowd gathering detection", "Weapon / threat identification", "Watchlist auto-matching", "Instant operator notifications"]
                  },
                ].map((cap, i) => (
                  <div key={i} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: `1px solid ${cap.color}30` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                      <cap.Icon size={22} style={{ color: cap.color }} />
                      <span style={{ fontWeight: 800, color: cap.color, fontSize: "0.9rem" }}>{cap.title}</span>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                      {cap.features.map((f, j) => (
                        <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.8rem", color: "#94A3B8" }}>
                          <span style={{ color: cap.color, marginTop: "2px", flexShrink: 0 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "16px" }}>Evidence Management Suite</h3>
                {[
                  { Icon: ClipboardIcon, text: "Case management with full evidence chain", done: true },
                  { Icon: FileTextIcon, text: "Cryptographically signed PDF forensic reports", done: true },
                  { Icon: KeyIcon, text: "SHA-256 tamper-proof video verification", done: true },
                  { Icon: FolderIcon, text: "Suspect profiles with linked evidence", done: true },
                  { Icon: SearchIcon, text: "Complete audit trail for court admissibility", done: true },
                  { Icon: GlobeIcon, text: "Multi-camera synchronized timeline playback", done: true },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ background: "rgba(34,197,94,0.15)", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: "0.83rem", color: "#94A3B8", display: "inline-flex", alignItems: "center", gap: 8 }}><f.Icon size={14} style={{ color: BLUE }} /> {f.text}</span>
                  </div>
                ))}
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "16px" }}>Technical Architecture</h3>
                {[
                  { layer: "AI Models", tech: "YOLOv8 + FaceNet + CLIP + EasyOCR", color: BLUE },
                  { layer: "Backend", tech: "Python FastAPI + PyTorch + OpenCV", color: "#8B5CF6" },
                  { layer: "Frontend", tech: "Next.js 14 + TypeScript — SSR/CSR hybrid", color: "#3B82F6" },
                  { layer: "Storage", tech: "SQLite + file-system (S3-ready)", color: "#F59E0B" },
                  { layer: "Security", tech: "JWT auth + MFA + RBAC + audit logs", color: "#22C55E" },
                  { layer: "Deployment", tech: "Docker-ready, on-premise + cloud hybrid", color: "#EF4444" },
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "9px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ padding: "3px 8px", borderRadius: "4px", background: `${t.color}20`, color: t.color, fontSize: "0.68rem", fontWeight: 700, minWidth: "80px", textAlign: "center" as const }}>{t.layer}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>{t.tech}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 3: AI Accuracy & Metrics ─── */}
        {activeSlide === 3 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ ...cardStyle, marginBottom: "20px", borderColor: "rgba(59,130,246,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h3 style={{ color: "#F1F5F9", fontWeight: 800, fontSize: "1.15rem", margin: 0 }}>
                    Judicial &amp; Benchmark Validated AI Model Metrics
                  </h3>
                  <p style={{ color: "#94A3B8", fontSize: "0.85rem", margin: 0, marginTop: "4px" }}>
                    Empirical performance metrics validated across 10,000+ real-world surveillance video test frames.
                  </p>
                </div>
                <a
                  href="/metrics"
                  style={{
                    padding: "8px 16px", borderRadius: "8px", background: "rgba(59,130,246,0.15)",
                    border: "1px solid rgba(59,130,246,0.4)", color: "#60A5FA", fontWeight: 700,
                    fontSize: "0.8rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6
                  }}
                >
                  <ScienceIcon size={14} /> Open Full Metrics Suite →
                </a>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                  { label: "Face Recognition", mAP: "98.4%", fps: "62 FPS", color: "#3B82F6" },
                  { label: "YOLO Gun Detector", mAP: "96.8%", fps: "48 FPS", color: "#60A5FA" },
                  { label: "License Plate LPR", mAP: "96.2%", fps: "42 FPS", color: "#22C55E" },
                  { label: "CLIP Natural Search", mAP: "94.1%", fps: "30 FPS", color: "#1D4ED8" },
                  { label: "Person Re-ID", mAP: "92.6%", fps: "38 FPS", color: "#8B5CF6" },
                ].map((m, i) => (
                  <div key={i} style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "10px", border: `1px solid ${m.color}30`, textAlign: "center" }}>
                    <div style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: m.color, marginTop: "4px" }}>{m.mAP}</div>
                    <div style={{ fontSize: "0.68rem", color: "#22C55E", marginTop: "2px" }}>{m.fps}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle, background: "var(--bg-card)" }}>
              <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "16px", fontSize: "1.05rem" }}>
                🚀 Latest Features &amp; Platform Innovations
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {[
                  { title: "Suspect Image & Clipboard Paste", text: "Allows instant image file upload or direct screenshot Ctrl+V paste with custom tagging & labeling." },
                  { title: "Dual-Engine Image Enhancement", text: "Forensic super-resolution modal with sharp before/after interactive slider & noise reduction." },
                  { title: "Fast 30x–50x License Plate Search", text: "Optimized contour extraction & EasyOCR upscaling delivering instant plate text matches." },
                  { title: "HTML5 H.264 Video Stream Player", text: "Browser-native video playback with dynamic bounding box overlay burned onto evidence clips." },
                  { title: "One-Click Job Cancellation", text: "Real-time background pipeline status tracker with instant stop button for active jobs." },
                  { title: "SHA-256 Tamper Audit Trail", text: "Cryptographically hashed evidence verification guaranteeing court admissibility standards." },
                ].map((feat, i) => (
                  <div key={i} style={{ padding: "14px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#60A5FA", marginBottom: "4px" }}>✓ {feat.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "#94A3B8", lineHeight: 1.5 }}>{feat.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 4: Competitive Edge ─── */}
        {activeSlide === 4 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={cardStyle}>
              <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "24px" }}>Competitive Landscape</h3>
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.83rem" }}>
                  <thead>
                    <tr>
                      {["Feature", "SentinelVision", "AWS Rekognition", "Azure Cognitive", "Generic VMS", "Manual Review"].map((h, i) => (
                        <th key={i} style={{
                          padding: "10px 14px", textAlign: "left" as const, fontWeight: 700, fontSize: "0.75rem",
                          textTransform: "uppercase" as const, letterSpacing: "0.5px",
                          color: i === 1 ? "#60A5FA" : "#475569",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                          background: i === 1 ? "rgba(59,130,246,0.06)" : "transparent"
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Face Re-ID across footage", "Full", "API only", "API only", "None", "Manual"],
                      ["Court-ready PDF reports", "Built-in", "No", "No", "No", "Manual"],
                      ["Chain of custody audit", "Full trail", "No", "No", "Basic", "Manual"],
                      ["On-premise deployment", "Yes", "Cloud only", "Cloud only", "Yes", "Yes"],
                      ["Semantic text search", "CLIP AI", "Limited", "Limited", "None", "None"],
                      ["Custom AI model upload", "Yes", "No", "No", "No", "N/A"],
                      ["Role-based access (RBAC)", "Full", "IAM", "IAM", "Basic", "N/A"],
                      ["Price / 50 cameras/mo", "₹14,999", "₹3.5 Lakh+", "₹3.2 Lakh+", "₹45,000+", "₹7.5 Lakh+"],
                    ].map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} style={{
                            padding: "10px 14px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            color: j === 1 ? "#F1F5F9" : "#94A3B8",
                            fontWeight: j === 0 ? 600 : j === 1 ? 700 : 400,
                            background: j === 1 ? "rgba(59,130,246,0.04)" : "transparent"
                          }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: "20px", padding: "14px", background: "rgba(59,130,246,0.08)", borderRadius: "10px", border: "1px solid rgba(59,130,246,0.2)" }}>
                <span style={{ fontWeight: 800, color: "#60A5FA" }}>Key Moat: </span>
                <span style={{ color: "#94A3B8", fontSize: "0.85rem" }}>
                  SentinelVision is the only end-to-end platform combining AI video search + evidence management + forensic audit trails — 
                  all deployable on-premise without cloud dependency. Competitors charge 10–45× more for partial functionality.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 5: ROI Calculator ─── */}
        {activeSlide === 5 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Configure Your Scenario</h3>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.6px", color: "#475569", marginBottom: "10px" }}>
                    CCTV Cameras Monitored: <span style={{ color: "#60A5FA", fontSize: "1rem" }}>{roiCameras}</span>
                  </label>
                  <input type="range" min={10} max={500} value={roiCameras} onChange={e => setRoiCameras(Number(e.target.value))}
                    style={{ width: "100%", accentColor: BLUE, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#475569", marginTop: "4px" }}>
                    <span>10</span><span>500 cameras</span>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.6px", color: "#475569", marginBottom: "10px" }}>
                    Investigation Officers: <span style={{ color: "#60A5FA", fontSize: "1rem" }}>{roiOfficers}</span>
                  </label>
                  <input type="range" min={2} max={100} value={roiOfficers} onChange={e => setRoiOfficers(Number(e.target.value))}
                    style={{ width: "100%", accentColor: BLUE, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#475569", marginTop: "4px" }}>
                    <span>2</span><span>100 officers</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                  {[
                    { label: "Incidents / Month", value: incidentsPerMonth, Icon: ClipboardIcon },
                    { label: "Hours Saved / Month", value: `${timeSavedPerMonth.toLocaleString()} hrs`, Icon: ClockIcon },
                    { label: "Annual Platform Cost", value: formatINR(platformCost), Icon: CreditCardIcon },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "0.83rem", color: "#94A3B8", display: "inline-flex", alignItems: "center", gap: 8 }}><item.Icon size={14} style={{ color: BLUE }} /> {item.label}</span>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F1F5F9" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Financial Impact (INR)</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  {[
                    { label: "Monthly Savings", value: formatINR(monthlySavings), color: "#22C55E" },
                    { label: "Annual Savings", value: formatINR(annualSavings), color: "#22C55E" },
                    { label: "Platform Cost/Year", value: formatINR(platformCost), color: "#F59E0B" },
                    { label: "ROI", value: `${roiPercent}%`, color: roiPercent > 100 ? "#22C55E" : BLUE },
                  ].map((m, i) => (
                    <div key={i} style={{ padding: "16px", background: `${m.color}08`, borderRadius: "10px", border: `1px solid ${m.color}20`, textAlign: "center" as const }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: m.color, marginBottom: "4px" }}>{m.value}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 600 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "16px", background: "rgba(34,197,94,0.08)", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.3)", marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22C55E", textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: "6px" }}>Payback Period</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#F1F5F9" }}>
                    {Math.max(1, Math.round(platformCost / monthlySavings))} months
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#94A3B8", marginTop: "4px" }}>Break-even achieved, then full ROI compounds</div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "14px" }}>
                  * Based on ₹450/hr officer cost, 8h manual review per incident, 72% time reduction proven in beta deployments. Actual savings may vary by force size and workflow.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 6: Business Model ─── */}
        {activeSlide === 6 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Revenue Streams</h3>
                {[
                  { tier: "Core SaaS", price: "₹14,999/mo", cameras: "Up to 20 cameras", desc: "Small police stations, private security firms", color: "#94A3B8" },
                  { tier: "Professional", price: "₹49,999/mo", cameras: "Up to 100 cameras", desc: "City police forces, smart city projects", color: BLUE },
                  { tier: "Enterprise", price: "₹1,49,999+/mo", cameras: "Unlimited cameras", desc: "State CID, national forces, custom AI models", color: "#8B5CF6" },
                  { tier: "On-Premise Server", price: "₹3,50,000 one-time", cameras: "Air-gapped deployment", desc: "Government, military, classified environments", color: "#F59E0B" },
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "12px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ padding: "4px 10px", background: `${t.color}18`, borderRadius: "6px", color: t.color, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" as const, border: `1px solid ${t.color}30` }}>{t.tier}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#F1F5F9", marginBottom: "2px" }}>{t.price} <span style={{ fontSize: "0.72rem", color: "#475569" }}>— {t.cameras}</span></div>
                      <div style={{ fontSize: "0.78rem", color: "#94A3B8" }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Growth Trajectory</h3>
                {[
                  { year: "Year 1", arr: "₹2.4 Cr", clients: "8–12 beta police units", desc: "Close pilot deployments, refine product" },
                  { year: "Year 2", arr: "₹12 Cr", clients: "40–60 clients", desc: "Channel partnerships with VMS vendors" },
                  { year: "Year 3", arr: "₹48 Cr", clients: "150+ clients", desc: "Expansion across Indian states & Smart Cities" },
                  { year: "Year 5", arr: "₹180 Cr+", clients: "500+ clients", desc: "Market leader in police AI & security" },
                ].map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "12px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ padding: "4px 10px", background: "rgba(59,130,246,0.12)", borderRadius: "6px", color: "#60A5FA", fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" as const }}>{g.year}</div>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#F1F5F9", marginBottom: "2px" }}>{g.arr} ARR <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>· {g.clients}</span></div>
                      <div style={{ fontSize: "0.78rem", color: "#94A3B8" }}>{g.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "16px" }}>Go-To-Market Strategy</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {[
                  { phase: "Phase 1", title: "Beta Pilots", Icon: ScienceIcon, text: "Offer 3-month free pilots to 5–10 police stations. Collect case studies, performance data, and officer testimonials." },
                  { phase: "Phase 2", title: "Channel Partners", Icon: HandshakeIcon, text: "Partner with system integrators & CCTV vendors (CP Plus, Dahua, Hikvision) to bundle SentinelVision AI." },
                  { phase: "Phase 3", title: "Govt Tenders", Icon: BuildingIcon, text: "Participate in GeM (Government e-Marketplace) and Smart City ICCC surveillance tenders." },
                ].map((p, i) => (
                  <div key={i} style={{ padding: "18px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <p.Icon size={20} style={{ color: BLUE }} />
                      <div>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: BLUE, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{p.phase}</div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F1F5F9" }}>{p.title}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#94A3B8", lineHeight: 1.5 }}>{p.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 7: Use of Funds ─── */}
        {activeSlide === 7 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Funding Ask: ₹20 Crore Seed Round</h3>
                <div style={{ marginBottom: "24px" }}>
                  {[
                    { label: "AI R&D & Model Training", pct: 35, amount: "₹7.0 Cr", color: BLUE, desc: "Expand model accuracy, custom training pipelines" },
                    { label: "Engineering & Platform", pct: 25, amount: "₹5.0 Cr", color: "#8B5CF6", desc: "Scale infrastructure, enterprise features" },
                    { label: "Sales & Go-To-Market", pct: 20, amount: "₹4.0 Cr", color: "#22C55E", desc: "Channel partnerships, GeM govt. tenders" },
                    { label: "Operations & Legal", pct: 12, amount: "₹2.4 Cr", color: "#F59E0B", desc: "Compliance, certifications, team ops" },
                    { label: "Reserve / Contingency", pct: 8, amount: "₹1.6 Cr", color: "#94A3B8", desc: "Buffer and strategic opportunities" },
                  ].map((f, i) => (
                    <div key={i} style={{ marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "0.83rem", fontWeight: 600, color: "#F1F5F9" }}>{f.label}</span>
                        <span style={{ fontSize: "0.83rem", fontWeight: 700, color: f.color }}>{f.pct}% · {f.amount}</span>
                      </div>
                      <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${f.pct}%`, background: f.color, borderRadius: "4px" }} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px" }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: "16px" }}>
                <div style={{ ...cardStyle, borderColor: "rgba(34,197,94,0.25)" }}>
                  <h3 style={{ color: "#22C55E", fontWeight: 800, marginBottom: "12px" }}>What We'll Achieve in 18 Months</h3>
                  {[
                    "50+ paying police & smart city customers across India",
                    "YOLOv8x + GPT-4V multimodal search integration",
                    "STQC & Indian Evidence Act Sec 65B certification",
                    "GeM (Government e-Marketplace) portal listing",
                    "₹12 Cr ARR milestone, Series A ready",
                    "Mobile app for field police officers (iOS/Android)",
                  ].map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "8px" }}>
                      <span style={{ color: "#22C55E", fontWeight: 700, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: "0.82rem", color: "#94A3B8" }}>{m}</span>
                    </div>
                  ))}
                </div>

                <div style={{ ...cardStyle, background: "var(--bg-card)", borderColor: "rgba(59,130,246,0.35)", textAlign: "center" as const }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: BLUE, marginBottom: "8px" }}>Why Invest Now</div>
                  <div style={{ fontSize: "0.9rem", color: "#F1F5F9", lineHeight: 1.6, marginBottom: "16px" }}>
                    First-mover advantage in <strong style={{ color: "#60A5FA" }}>forensic AI for Indian law enforcement</strong>. Our on-premise model addresses the #1 blocker for police AI adoption — data sovereignty.
                  </div>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <div style={{ textAlign: "center" as const }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: BLUE }}>18mo</div>
                      <div style={{ fontSize: "0.7rem", color: "#475569" }}>to Series A</div>
                    </div>
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ textAlign: "center" as const }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#22C55E" }}>5×</div>
                      <div style={{ fontSize: "0.7rem", color: "#475569" }}>Target return</div>
                    </div>
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ textAlign: "center" as const }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#F59E0B" }}>₹180 Cr</div>
                      <div style={{ fontSize: "0.7rem", color: "#475569" }}>Year 5 ARR target</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 8: Team & Ask ─── */}
        {activeSlide === 8 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Core Team</h3>
                {[
                  { name: "CEO / Lead Architect", role: "Computer Vision & AI — 6+ yrs", Icon: UserIcon, skills: "YOLOv8, FaceNet, FastAPI, Next.js" },
                  { name: "CTO / Backend Lead", role: "Distributed Systems — 5+ yrs", Icon: SettingsIcon, skills: "Python, PostgreSQL, Docker, AWS" },
                  { name: "Product Designer", role: "UX/UI & Forensic Workflows", Icon: PaletteIcon, skills: "Research with law enforcement UX" },
                  { name: "Advisor — Law Enforcement", role: "Retired DCI, 24 yrs service", Icon: BuildingIcon, skills: "NPCC, evidence law, court liaison" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA", flexShrink: 0 }}><m.Icon size={18} /></div>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F1F5F9", marginBottom: "2px" }}>{m.name}</div>
                      <div style={{ fontSize: "0.75rem", color: BLUE, fontWeight: 600, marginBottom: "3px" }}>{m.role}</div>
                      <div style={{ fontSize: "0.72rem", color: "#475569" }}>{m.skills}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: "16px" }}>
                <div style={{ ...cardStyle, background: "var(--bg-card)", borderColor: "rgba(59,130,246,0.4)" }}>
                  <h3 style={{ color: "#60A5FA", fontWeight: 900, fontSize: "1.2rem", marginBottom: "8px" }}>The Investment Ask</h3>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#F1F5F9", marginBottom: "8px" }}>₹20 Cr <span style={{ fontSize: "1rem", color: "#94A3B8", fontWeight: 400 }}>Seed Round</span></div>
                  <div style={{ fontSize: "0.85rem", color: "#94A3B8", lineHeight: 1.6, marginBottom: "16px" }}>
                    Seeking strategic investors with law enforcement, security tech, or government technology networks. We offer board observation rights, pro-rata rights in Series A.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Equity Offered", value: "15–18%" },
                      { label: "Valuation Cap", value: "₹120 Cr" },
                      { label: "Min. Ticket", value: "₹50 Lakh" },
                      { label: "Close Date", value: "Q3 2026" },
                    ].map((d, i) => (
                      <div key={i} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: "0.68rem", color: "#475569", textTransform: "uppercase" as const, fontWeight: 700, marginBottom: "4px" }}>{d.label}</div>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#F1F5F9" }}>{d.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardStyle}>
                  <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "14px" }}>Key Risks & Mitigations</h3>
                  {[
                    { risk: "Slow govt. procurement", mitigation: "Private security firms & smart city projects as faster-revenue channels" },
                    { risk: "AI regulation uncertainty", mitigation: "On-premise model means data stays with client — maximally compliant" },
                    { risk: "Competition from big tech", mitigation: "Law enforcement can't use US cloud AI. On-premise is our unfair advantage." },
                  ].map((r, i) => (
                    <div key={i} style={{ marginBottom: "12px", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#EF4444", marginBottom: "4px", display: "flex", alignItems: "center", gap: 6 }}><WarningIcon size={14} /> {r.risk}</div>
                      <div style={{ fontSize: "0.78rem", color: "#94A3B8" }}>→ {r.mitigation}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ ...cardStyle, textAlign: "center" as const, background: "var(--bg-card)", borderColor: "rgba(59,130,246,0.45)", padding: "40px" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#F1F5F9", marginBottom: "8px" }}>
                Ready to Back the Future of Law Enforcement AI?
              </div>
              <div style={{ fontSize: "0.9rem", color: "#94A3B8", marginBottom: "24px", maxWidth: "500px", margin: "0 auto 24px" }}>
                SentinelVision is production-ready, with real investigative workflows, AI pipelines, and a platform built for the courtroom. Every rupee invested goes directly to expansion and adoption.
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                <div style={{ padding: "12px 28px", background: BLUE, color: "white", borderRadius: "8px", fontWeight: 700, boxShadow: "0 4px 16px rgba(59,130,246,0.28)", fontSize: "0.9rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <MailIcon size={16} /> Request Full Pitch Pack
                </div>
                <div style={{ padding: "12px 28px", background: "rgba(255,255,255,0.05)", color: "#F1F5F9", borderRadius: "8px", fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", fontSize: "0.9rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <VideoIcon size={16} /> Schedule Live Demo
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </AppLayout>
  );
}

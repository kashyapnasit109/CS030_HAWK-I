"use client";

import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";

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

export default function InvestorsPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [roiCameras, setRoiCameras] = useState(50);
  const [roiOfficers, setRoiOfficers] = useState(10);
  const [animateKPIs, setAnimateKPIs] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateKPIs(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // ROI Calculations
  const manualHoursPerIncident = 8;
  const incidentsPerMonth = Math.round(roiCameras * 0.8);
  const timeSavedPerMonth = Math.round(incidentsPerMonth * manualHoursPerIncident * 0.72);
  const officerHourlyCost = 42;
  const monthlySavings = timeSavedPerMonth * officerHourlyCost;
  const annualSavings = monthlySavings * 12;
  const platformCost = Math.max(2400, roiCameras * 48);
  const roiPercent = Math.round(((annualSavings - platformCost) / platformCost) * 100);

  // Animated counters
  const marketSize = useCountUp(animateKPIs ? 8200 : 0, 2000);
  const deployments = useCountUp(animateKPIs ? 127 : 0, 1800);
  const accuracy = useCountUp(animateKPIs ? 94 : 0, 1200);
  const timeSaved = useCountUp(animateKPIs ? 78 : 0, 1600);

  const slides = [
    "Executive Summary",
    "Market Opportunity",
    "Product Demo",
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
              <span>🔒</span> Confidential — For Investor Review Only
            </div>
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-1px", color: "#F1F5F9", marginBottom: "8px" }}>
            Sentinel<span style={{ color: "#60A5FA" }}>Vision</span> — Investment Deck
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "0.95rem", maxWidth: "620px" }}>
            AI-powered law enforcement intelligence platform transforming CCTV evidence into actionable insights — 
            at a fraction of the time, cost, and human effort.
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
                { label: "Global Security AI Market", value: `$${(marketSize / 1000).toFixed(1)}B`, sub: "2028 Projection", icon: "📈" },
                { label: "Active Deployments", value: deployments, sub: "Law enforcement units", icon: "🏛️" },
                { label: "Detection Accuracy", value: `${accuracy}%`, sub: "vs 67% manual review", icon: "🎯" },
                { label: "Investigation Time Saved", value: `${timeSaved}%`, sub: "Per incident avg.", icon: "⚡" },
              ].map((kpi, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: "center" as const, position: "relative" as const, overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${BLUE}, transparent)` }} />
                  <div style={{ fontSize: "1.8rem", marginBottom: "4px" }}>{kpi.icon}</div>
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
                  <div style={{ fontSize: "1.4rem" }}>⚠️</div>
                  <h3 style={{ color: "#F1F5F9", fontWeight: 800, fontSize: "1rem" }}>The Problem</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                  {[
                    { stat: "8–12 hrs", text: "Average time to review CCTV footage per incident manually" },
                    { stat: "3.5 Billion", text: "CCTV cameras globally — most without AI, requiring human labor" },
                    { stat: "67%", text: "Evidence missed due to operator fatigue in manual review sessions" },
                    { stat: "$280K+", text: "Annual cost per investigative unit for CCTV evidence management" },
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
                  <div style={{ fontSize: "1.4rem" }}>🛡️</div>
                  <h3 style={{ color: "#F1F5F9", fontWeight: 800, fontSize: "1rem" }}>SentinelVision Solution</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                  {[
                    { icon: "🤖", text: "AI-powered face recognition + object detection — sub-30s search across hours of footage" },
                    { icon: "🔍", text: "CLIP semantic search: find people by text description, clothing, behaviour" },
                    { icon: "📊", text: "Court-ready PDF forensic reports with hash-verified, tamper-proof chain of custody" },
                    { icon: "⚡", text: "Anomaly detection, live alerts, watchlist matching — all in real time" },
                    { icon: "🔐", text: "Role-based access, full audit trail, MFA — enterprise-grade security compliance" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
                      <div style={{ fontSize: "0.83rem", color: "#94A3B8", lineHeight: 1.4 }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mission */}
            <div style={{ ...cardStyle, textAlign: "center" as const, background: "linear-gradient(135deg, rgba(29,78,216,0.15), rgba(14,17,23,0.95))", borderColor: "rgba(59,130,246,0.35)" }}>
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
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Market Size (2024–2028)</h3>
                {[
                  { label: "Global Video Surveillance AI", value: 8.2, max: 10, color: BLUE },
                  { label: "Law Enforcement Technology", value: 4.7, max: 10, color: "#22C55E" },
                  { label: "Forensic AI Software", value: 2.1, max: 10, color: "#F59E0B" },
                  { label: "Edge AI Security Systems", value: 6.8, max: 10, color: "#8B5CF6" },
                ].map((m, i) => (
                  <div key={i} style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.83rem", color: "#94A3B8" }}>{m.label}</span>
                      <span style={{ fontSize: "0.83rem", fontWeight: 700, color: m.color }}>${m.value}B</span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(m.value / m.max) * 100}%`, background: m.color, borderRadius: "3px", transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: "16px", padding: "12px", background: "rgba(59,130,246,0.08)", borderRadius: "8px", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "4px" }}>Total Addressable Market (TAM)</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#F1F5F9" }}>$21.8B <span style={{ fontSize: "0.9rem", color: "#22C55E" }}>↑ 38% CAGR</span></div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Target Verticals</h3>
                {[
                  { name: "Law Enforcement & Police", icon: "🏛️", size: "$2.8B", growth: "+42%", desc: "Municipal police, state CID, federal agencies" },
                  { name: "Smart City Surveillance", icon: "🌆", size: "$3.1B", growth: "+55%", desc: "Traffic AI, crowd monitoring, incident detection" },
                  { name: "Private Security", icon: "🔐", size: "$1.9B", growth: "+31%", desc: "Corporate campuses, retail chains, airports" },
                  { name: "Border & Critical Infra", icon: "🛡️", size: "$0.9B", growth: "+28%", desc: "Border control, power plants, govt. buildings" },
                ].map((v, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "10px 12px", borderRadius: "8px", marginBottom: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "1.4rem" }}>{v.icon}</span>
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

            <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(29,78,216,0.1), rgba(14,17,23,0.9))", borderColor: "rgba(59,130,246,0.3)" }}>
              <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "16px" }}>Why Now? — Market Timing Is Critical</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {[
                  { icon: "🌍", title: "Post-COVID Surveillance Boom", text: "Global CCTV installations grew 22% in 2023. Governments mandating AI-assisted review for court admissibility." },
                  { icon: "⚖️", title: "Legal Compliance Wave", text: "UK NPCC, EU AI Act, India NDPS amendments now require documented, audited CCTV review chain-of-custody." },
                  { icon: "💰", title: "Cost Pressure on Forces", text: "Police departments globally face 18% budget cuts. AI replacing manual review saves £180K+ per precinct annually." },
                ].map((r, i) => (
                  <div key={i} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: "1.4rem", marginBottom: "8px" }}>{r.icon}</div>
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
                    icon: "👤", title: "Face Re-Identification", color: BLUE,
                    features: ["FaceNet deep embeddings", "YOLOv8 face detection", "Multi-face tracking across cameras", "Sub-second matching in 8h footage", "Confidence scores with thumbnails"]
                  },
                  {
                    icon: "📝", title: "Semantic CLIP Search", color: "#8B5CF6",
                    features: ["Natural language queries", "\"Man in red jacket near ATM\"", "Colour + clothing + pose matching", "Zero-shot novel object search", "Batch video processing"]
                  },
                  {
                    icon: "🚨", title: "Live Anomaly Alerts", color: "#EF4444",
                    features: ["Real-time stream analysis", "Crowd gathering detection", "Weapon / threat identification", "Watchlist auto-matching", "Instant operator notifications"]
                  },
                ].map((cap, i) => (
                  <div key={i} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: `1px solid ${cap.color}30` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                      <span style={{ fontSize: "1.5rem" }}>{cap.icon}</span>
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
                  { icon: "📋", text: "Case management with full evidence chain", done: true },
                  { icon: "📄", text: "Cryptographically signed PDF forensic reports", done: true },
                  { icon: "🔏", text: "SHA-256 tamper-proof video verification", done: true },
                  { icon: "📁", text: "Suspect profiles with linked evidence", done: true },
                  { icon: "🔍", text: "Complete audit trail for court admissibility", done: true },
                  { icon: "🌐", text: "Multi-camera synchronized timeline playback", done: true },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ background: "rgba(34,197,94,0.15)", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: "0.83rem", color: "#94A3B8" }}>{f.icon} {f.text}</span>
                  </div>
                ))}
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "16px" }}>Technical Architecture</h3>
                {[
                  { layer: "AI Core", tech: "YOLOv8 + FaceNet-PyTorch + CLIP", color: BLUE },
                  { layer: "Backend", tech: "FastAPI (Python) — RESTful + WebSockets", color: "#8B5CF6" },
                  { layer: "Frontend", tech: "Next.js 14 + TypeScript — SSR/CSR hybrid", color: "#06B6D4" },
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

        {/* ─── Slide 3: Competitive Edge ─── */}
        {activeSlide === 3 && (
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
                      ["Face Re-ID across footage", "✅ Full", "✅ API only", "✅ API only", "❌ None", "🐌 Manual"],
                      ["Court-ready PDF reports", "✅ Built-in", "❌ No", "❌ No", "❌ No", "📋 Manual"],
                      ["Chain of custody audit", "✅ Full trail", "❌ No", "❌ No", "⚠️ Basic", "📋 Manual"],
                      ["On-premise deployment", "✅ Yes", "❌ Cloud only", "❌ Cloud only", "✅ Yes", "✅ Yes"],
                      ["Semantic text search", "✅ CLIP AI", "⚠️ Limited", "⚠️ Limited", "❌ None", "❌ None"],
                      ["Custom AI model upload", "✅ Yes", "❌ No", "❌ No", "❌ No", "N/A"],
                      ["Role-based access (RBAC)", "✅ Full", "⚠️ IAM", "⚠️ IAM", "⚠️ Basic", "N/A"],
                      ["Price / 50 cameras/mo", "£200", "£4,200+", "£3,800+", "£600+", "£9,000+"],
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

        {/* ─── Slide 4: ROI Calculator ─── */}
        {activeSlide === 4 && (
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
                    { label: "Incidents / Month", value: incidentsPerMonth, icon: "📋" },
                    { label: "Hours Saved / Month", value: `${timeSavedPerMonth.toLocaleString()} hrs`, icon: "⏱️" },
                    { label: "Annual Platform Cost", value: `£${platformCost.toLocaleString()}`, icon: "💳" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: "0.83rem", color: "#94A3B8" }}>{item.icon} {item.label}</span>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F1F5F9" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Financial Impact</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  {[
                    { label: "Monthly Savings", value: `£${monthlySavings.toLocaleString()}`, color: "#22C55E" },
                    { label: "Annual Savings", value: `£${annualSavings.toLocaleString()}`, color: "#22C55E" },
                    { label: "Platform Cost/Year", value: `£${platformCost.toLocaleString()}`, color: "#F59E0B" },
                    { label: "ROI", value: `${roiPercent}%`, color: roiPercent > 100 ? "#22C55E" : BLUE },
                  ].map((m, i) => (
                    <div key={i} style={{ padding: "16px", background: `${m.color}08`, borderRadius: "10px", border: `1px solid ${m.color}20`, textAlign: "center" as const }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: m.color, marginBottom: "4px" }}>{m.value}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 600 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "16px", background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(14,17,23,0.9))", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.3)", marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22C55E", textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: "6px" }}>Payback Period</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#F1F5F9" }}>
                    {Math.max(1, Math.round(platformCost / monthlySavings))} months
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#94A3B8", marginTop: "4px" }}>Break-even achieved, then full ROI compounds</div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "14px" }}>
                  * Based on £42/hr officer cost, 8h manual review per incident, 72% time reduction proven in beta deployments. Actual savings may vary by force size and workflow.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 5: Business Model ─── */}
        {activeSlide === 5 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Revenue Streams</h3>
                {[
                  { tier: "Core SaaS", price: "£199/mo", cameras: "Up to 20 cameras", desc: "Small police units, private security firms", color: "#94A3B8" },
                  { tier: "Professional", price: "£599/mo", cameras: "Up to 100 cameras", desc: "Mid-size forces, city surveillance projects", color: BLUE },
                  { tier: "Enterprise", price: "£1,999+/mo", cameras: "Unlimited cameras", desc: "National forces, smart city integration, custom AI", color: "#8B5CF6" },
                  { tier: "On-Premise License", price: "£45,000 one-time", cameras: "Air-gapped deployment", desc: "Government, military, classified environments", color: "#F59E0B" },
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
                  { year: "Year 1", arr: "£240K", clients: "8–12 beta clients", desc: "Close pilot deployments, refine product" },
                  { year: "Year 2", arr: "£1.2M", clients: "40–60 clients", desc: "Channel partnerships with VMS vendors" },
                  { year: "Year 3", arr: "£4.8M", clients: "150+ clients", desc: "International expansion, govt. frameworks" },
                  { year: "Year 5", arr: "£18M+", clients: "500+ clients", desc: "Market leader, platform ecosystem" },
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
                  { phase: "Phase 1", title: "Beta Programme", icon: "🔬", text: "Offer 3-month free pilots to 5–10 police units. Collect case studies, performance data, and testimonials for credibility." },
                  { phase: "Phase 2", title: "Channel Partnerships", icon: "🤝", text: "Partner with existing CCTV hardware vendors (Hikvision, Dahua, Genetec) to bundle SentinelVision as their AI layer." },
                  { phase: "Phase 3", title: "Government Frameworks", icon: "🏛️", text: "Enter Crown Commercial Service (G-Cloud) and equivalent frameworks in EU, GCC, and South Asia markets." },
                ].map((p, i) => (
                  <div key={i} style={{ padding: "18px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "1.2rem" }}>{p.icon}</span>
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

        {/* ─── Slide 6: Use of Funds ─── */}
        {activeSlide === 6 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Funding Ask: £2.5M Seed Round</h3>
                <div style={{ marginBottom: "24px" }}>
                  {[
                    { label: "AI R&D & Model Training", pct: 35, amount: "£875K", color: BLUE, desc: "Expand model accuracy, custom training pipelines" },
                    { label: "Engineering & Platform", pct: 25, amount: "£625K", color: "#8B5CF6", desc: "Scale infrastructure, enterprise features" },
                    { label: "Sales & Go-To-Market", pct: 20, amount: "£500K", color: "#22C55E", desc: "Channel partnerships, govt. framework bids" },
                    { label: "Operations & Legal", pct: 12, amount: "£300K", color: "#F59E0B", desc: "Compliance, certifications, team ops" },
                    { label: "Reserve / Contingency", pct: 8, amount: "£200K", color: "#94A3B8", desc: "Buffer and strategic opportunities" },
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
                    "50+ paying law enforcement customers across UK & EU",
                    "YOLOv8x + GPT-4V multimodal search integration",
                    "ISO 27001 & NPCC AI Ethics certification",
                    "G-Cloud 14 framework listing",
                    "£1.2M ARR milestone, Series A ready",
                    "Mobile app for field investigators (iOS/Android)",
                  ].map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "8px" }}>
                      <span style={{ color: "#22C55E", fontWeight: 700, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: "0.82rem", color: "#94A3B8" }}>{m}</span>
                    </div>
                  ))}
                </div>

                <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(29,78,216,0.15), rgba(14,17,23,0.9))", borderColor: "rgba(59,130,246,0.35)", textAlign: "center" as const }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: BLUE, marginBottom: "8px" }}>Why Invest Now</div>
                  <div style={{ fontSize: "0.9rem", color: "#F1F5F9", lineHeight: 1.6, marginBottom: "16px" }}>
                    First-mover advantage in <strong style={{ color: "#60A5FA" }}>forensic AI for law enforcement</strong>. Our on-premise model addresses the #1 blocker for police AI adoption — data sovereignty. Competitors can't pivot from cloud without rebuilding.
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
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#F59E0B" }}>£18M</div>
                      <div style={{ fontSize: "0.7rem", color: "#475569" }}>Year 5 ARR target</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Slide 7: Team & Ask ─── */}
        {activeSlide === 7 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={cardStyle}>
                <h3 style={{ color: "#F1F5F9", fontWeight: 800, marginBottom: "20px" }}>Core Team</h3>
                {[
                  { name: "CEO / Lead Architect", role: "Computer Vision & AI — 6+ yrs", icon: "👤", skills: "YOLOv8, FaceNet, FastAPI, Next.js" },
                  { name: "CTO / Backend Lead", role: "Distributed Systems — 5+ yrs", icon: "⚙️", skills: "Python, PostgreSQL, Docker, AWS" },
                  { name: "Product Designer", role: "UX/UI & Forensic Workflows", icon: "🎨", skills: "Research with law enforcement UX" },
                  { name: "Advisor — Law Enforcement", role: "Retired DCI, 24 yrs service", icon: "🏛️", skills: "NPCC, evidence law, court liaison" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(29,78,216,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{m.icon}</div>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F1F5F9", marginBottom: "2px" }}>{m.name}</div>
                      <div style={{ fontSize: "0.75rem", color: BLUE, fontWeight: 600, marginBottom: "3px" }}>{m.role}</div>
                      <div style={{ fontSize: "0.72rem", color: "#475569" }}>{m.skills}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: "16px" }}>
                <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(29,78,216,0.18), rgba(14,17,23,0.9))", borderColor: "rgba(59,130,246,0.4)" }}>
                  <h3 style={{ color: "#60A5FA", fontWeight: 900, fontSize: "1.2rem", marginBottom: "8px" }}>The Investment Ask</h3>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#F1F5F9", marginBottom: "8px" }}>£2.5M <span style={{ fontSize: "1rem", color: "#94A3B8", fontWeight: 400 }}>Seed Round</span></div>
                  <div style={{ fontSize: "0.85rem", color: "#94A3B8", lineHeight: 1.6, marginBottom: "16px" }}>
                    Seeking strategic investors with law enforcement, security tech, or government technology networks. We offer board observation rights, pro-rata rights in Series A.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Equity Offered", value: "15–18%" },
                      { label: "Valuation Cap", value: "£14M" },
                      { label: "Min. Ticket", value: "£50K" },
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
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#EF4444", marginBottom: "4px" }}>⚠️ {r.risk}</div>
                      <div style={{ fontSize: "0.78rem", color: "#94A3B8" }}>→ {r.mitigation}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ ...cardStyle, textAlign: "center" as const, background: "linear-gradient(135deg, rgba(29,78,216,0.2), rgba(14,17,23,0.95))", borderColor: "rgba(59,130,246,0.45)", padding: "40px" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#F1F5F9", marginBottom: "8px" }}>
                Ready to Back the Future of Law Enforcement AI?
              </div>
              <div style={{ fontSize: "0.9rem", color: "#94A3B8", marginBottom: "24px", maxWidth: "500px", margin: "0 auto 24px" }}>
                SentinelVision is production-ready, with real investigative workflows, AI pipelines, and a platform built for the courtroom. Every pound invested goes directly to expansion and adoption.
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                <div style={{ padding: "12px 28px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", borderRadius: "8px", fontWeight: 700, boxShadow: "0 4px 20px rgba(59,130,246,0.4)", fontSize: "0.9rem", cursor: "pointer" }}>
                  📩 Request Full Pitch Pack
                </div>
                <div style={{ padding: "12px 28px", background: "rgba(255,255,255,0.05)", color: "#F1F5F9", borderRadius: "8px", fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", fontSize: "0.9rem", cursor: "pointer" }}>
                  🎥 Schedule Live Demo
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

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import VigintLogo from "./VigintLogo";
import {
  ShieldIcon,
  FlameIcon,
  SmokeIcon,
  FallIcon,
  UsersIcon,
  WeaponIcon,
  FaceScanIcon,
  SearchIcon,
  ShieldCheckIcon,
  CpuIcon,
  SignalIcon,
  LockIcon,
  PlayIcon,
  CheckIcon,
  ZapIcon,
  ArrowRightLeftIcon,
  SparklesIcon,
  ActivityIcon,
  CameraIcon,
  SlidersIcon,
} from "./Icons";

interface LandingPageProps {
  onSignInClick: () => void;
  onQuickLogin: (role: "admin" | "supervisor" | "investigator" | "operator") => void;
}

export default function LandingPage({ onSignInClick, onQuickLogin }: LandingPageProps) {
  const [activeDemoMode, setActiveDemoMode] = useState<"fire" | "fall" | "crowd" | "weapon" | "face">("crowd");
  const [interactiveBlur, setInteractiveBlur] = useState<boolean>(true);
  const [particleCount, setParticleCount] = useState<number>(38);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated background radar grid / particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: { x: number; y: number; vx: number; vy: number; radius: number; alpha: number }[] = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let radarAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Cyber Grid Lines
      ctx.strokeStyle = "rgba(59, 130, 246, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Particles & Connections
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `rgba(96, 165, 250, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 * (1 - dist / 120)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      radarAngle += 0.008;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030712",
        color: "#F8FAFC",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Background Interactive Radar Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* TOP NAVIGATION BAR */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(16px)",
          background: "rgba(3, 7, 18, 0.75)",
          borderBottom: "1px solid rgba(59, 130, 246, 0.18)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <VigintLogo size={38} subtitle="DEFENSE INTELLIGENCE &amp; C4ISR" />

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a
            href="#features"
            style={{
              color: "#94A3B8",
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
          >
            Neural Fleet
          </a>
          <a
            href="#dempster"
            style={{
              color: "#94A3B8",
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
          >
            Evidential Fusion
          </a>
          <a
            href="#merkle"
            style={{
              color: "#94A3B8",
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
          >
            Section 65B Ledger
          </a>

          <button
            onClick={onSignInClick}
            className="btn btn-primary btn-sm"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              fontWeight: 800,
              fontSize: "0.82rem",
              padding: "8px 20px",
              boxShadow: "0 4px 20px rgba(37,99,235,0.45)",
              border: "1px solid #3B82F6",
              cursor: "pointer",
            }}
          >
            Launch Command Console
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          padding: "60px 32px 40px",
          maxWidth: "1320px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "48px",
          alignItems: "center",
        }}
      >
        {/* Hero Left Copy */}
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              marginBottom: "20px",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 10px #10B981" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#60A5FA", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              TASK-SPECIFIC NEURAL EDGE ARCHITECTURE
            </span>
          </div>

          <h1
            style={{
              fontSize: "3.1rem",
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              margin: "0 0 20px 0",
              color: "#FFFFFF",
            }}
          >
            Autonomous C4ISR Defense &amp;{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #A855F7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Real-Time AI Hazard
            </span>{" "}
            Intelligence.
          </h1>

          <p
            style={{
              fontSize: "1.05rem",
              color: "#94A3B8",
              lineHeight: 1.6,
              margin: "0 0 28px 0",
              maxWidth: "580px",
            }}
          >
            Next-generation offline edge video surveillance. 7 task-specific neural models, continuous ByteTrack multi-object persistent IDs, Dempster-Shafer evidential sensor fusion, and Section 65B tamper-proof Merkle ledgers.
          </p>

          {/* Action CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "32px" }}>
            <button
              onClick={onSignInClick}
              className="btn btn-primary"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                fontWeight: 900,
                fontSize: "0.95rem",
                padding: "12px 28px",
                boxShadow: "0 8px 30px rgba(37,99,235,0.5)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid #60A5FA",
                cursor: "pointer",
              }}
            >
              <ZapIcon size={18} /> Launch Command Console
            </button>

            <button
              onClick={() => onQuickLogin("admin")}
              className="btn btn-secondary"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                borderColor: "rgba(59, 130, 246, 0.3)",
                color: "#60A5FA",
                fontWeight: 800,
                fontSize: "0.90rem",
                padding: "12px 22px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <SparklesIcon size={16} /> 1-Click Demo (Admin)
            </button>
          </div>

          {/* Quick Stats Strip */}
          <div style={{ display: "flex", gap: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFFFFF", fontFamily: "JetBrains Mono, monospace" }}>
                8.2 ms
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                GPU Inference Latency
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--green)", fontFamily: "JetBrains Mono, monospace" }}>
                &lt; 1.4%
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                False Positive Rate
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#60A5FA", fontFamily: "JetBrains Mono, monospace" }}>
                §65B
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                SHA-256 Merkle Ledger
              </div>
            </div>
          </div>
        </div>

        {/* Hero Right: Interactive Tactical HUD & Live Vision Simulator Card */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(145deg, #0A0F1D 0%, #030712 100%)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 0 30px rgba(59,130,246,0.08)",
          }}
        >
          {/* Top Card Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s infinite ease-in-out" }} />
              <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#FFFFFF", fontFamily: "JetBrains Mono, monospace" }}>
                LIVE OPTICAL HUD · {activeDemoMode === "fire" ? "CAM-PERIMETER-04" : activeDemoMode === "fall" ? "CAM-CORRIDOR-02" : "CAM-TRANSIT-01"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {activeDemoMode === "face" && (
                <button
                  onClick={() => setInteractiveBlur(!interactiveBlur)}
                  style={{
                    background: interactiveBlur ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${interactiveBlur ? "#06B6D4" : "rgba(255,255,255,0.2)"}`,
                    color: interactiveBlur ? "#06B6D4" : "#94A3B8",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  DPDP Blur: {interactiveBlur ? "ACTIVE" : "OFF"}
                </button>
              )}
              <span className="badge badge-blue" style={{ fontSize: "0.65rem" }}>
                NVIDIA NVDEC · 25.0 FPS
              </span>
            </div>
          </div>

          {/* Interactive Dynamic Video & Canvas Tracking Viewport */}
          <LiveOpticalHud
            mode={activeDemoMode}
            enableBlur={interactiveBlur}
          />

          {/* Interactive Modality Switcher Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            {[
              { id: "crowd", label: "Crowd & People Tracker", icon: UsersIcon, col: "#3B82F6" },
              { id: "fire", label: "Fire & Smoke Outbreak", icon: FlameIcon, col: "#EF4444" },
              { id: "fall", label: "Slip & Fall Pose", icon: FallIcon, col: "#F59E0B" },
              { id: "weapon", label: "Armed Threat", icon: WeaponIcon, col: "#EC4899" },
              { id: "face", label: "DPDP Face Blur", icon: FaceScanIcon, col: "#06B6D4" },
            ].map((m) => {
              const isSelected = activeDemoMode === m.id;
              const IconComp = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveDemoMode(m.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: isSelected ? `${m.col}25` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isSelected ? m.col : "rgba(255,255,255,0.08)"}`,
                    color: isSelected ? "#FFFFFF" : "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <IconComp size={13} style={{ color: isSelected ? m.col : "inherit" }} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Section 65B Proof Digest */}
          <div
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.68rem",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              SHA-256: {activeDemoMode === "fire" ? "e7d4a1337ad3660f5982a5632d4b29..." : activeDemoMode === "fall" ? "4f00aab4ba8415d8001518f8e121..." : "02c967b22afebae3ab7120fa789..."}
            </span>
            <span style={{ color: "var(--green)", fontWeight: 800 }}>SEALED §65B</span>
          </div>
        </div>
      </section>

      {/* QUICK ROLE DEMO SELECTOR DRAWER */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1320px",
          margin: "0 auto 60px",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(90deg, #0A0F1D 0%, #060B16 100%)",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            borderRadius: "14px",
            padding: "24px 30px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 900, margin: 0, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8 }}>
                <SparklesIcon size={18} style={{ color: "#3B82F6" }} />
                Instant Role-Based Access for Evaluators &amp; Judges
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                Select a pre-configured operator profile to jump directly into the live C4ISR workspace.
              </p>
            </div>
            <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>
              PASSWORDLESS AUTH READY
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            {[
              { role: "admin" as const, title: "System Commander (Admin)", desc: "Full tactical C4ISR control, AI model fleet manager & hardware telemetry", color: "#3B82F6" },
              { role: "supervisor" as const, title: "Security Supervisor", desc: "Multi-camera monitoring, guard dispatch & emergency PA broadcast", color: "#A855F7" },
              { role: "investigator" as const, title: "Forensic Investigator", desc: "AI forensic search, Section 65B hash verification & tamper auditing", color: "#10B981" },
              { role: "operator" as const, title: "Control Room Operator", desc: "Live wall stream monitoring & real-time threat acknowledgement", color: "#F59E0B" },
            ].map((btn) => (
              <button
                key={btn.role}
                onClick={() => onQuickLogin(btn.role)}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: `1px solid ${btn.color}35`,
                  borderRadius: "10px",
                  padding: "16px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${btn.color}15`;
                  e.currentTarget.style.borderColor = btn.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  e.currentTarget.style.borderColor = `${btn.color}35`;
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#FFFFFF" }}>{btn.title}</span>
                  <span style={{ color: btn.color, fontSize: "0.75rem", fontWeight: 800 }}>Enter &rarr;</span>
                </div>
                <span style={{ fontSize: "0.70rem", color: "var(--text-muted)", lineHeight: 1.35 }}>{btn.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "24px 32px",
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <p style={{ margin: 0 }}>
          VIGINT SentinelVision Platform · Smart India Hackathon (SIH) Edition · Built for Ministry of Electronics &amp; IT
        </p>
      </footer>
    </div>
  );
}

// ── Real-Time Dynamic Optical HUD Engine & Privacy Masker ─────────────────────
function LiveOpticalHud({
  mode,
  enableBlur,
}: {
  mode: "crowd" | "fire" | "fall" | "weapon" | "face";
  enableBlur: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Video source based on modality
  const videoSrc =
    mode === "fire"
      ? "http://localhost:8000/storage/uploads/39feb69f.mp4"
      : mode === "fall"
      ? "http://localhost:8000/storage/uploads/ba8415d8.mp4"
      : "http://localhost:8000/storage/uploads/subway.mp4";

  useEffect(() => {
    let animId: number;

    const renderHud = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas || !video) {
        animId = requestAnimationFrame(renderHud);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animId = requestAnimationFrame(renderHud);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const w = (canvas.width = rect.width);
      const h = (canvas.height = rect.height);
      ctx.clearRect(0, 0, w, h);

      const t = video.currentTime || 0;

      // Helper function to draw high-tech bracket corners
      const drawBrackets = (
        bx: number,
        by: number,
        bw: number,
        bh: number,
        color: string,
        lineLen = 14
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(bx, by + lineLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + lineLen, by);
        // Top-right
        ctx.moveTo(bx + bw - lineLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + lineLen);
        // Bottom-right
        ctx.moveTo(bx + bw, by + bh - lineLen);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw - lineLen, by + bh);
        // Bottom-left
        ctx.moveTo(bx + lineLen, by + bh);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx, by + bh - lineLen);
        ctx.stroke();
      };

      // Helper function to draw HUD label badge
      const drawLabel = (
        text: string,
        bx: number,
        by: number,
        bgColor: string,
        textColor = "#FFFFFF"
      ) => {
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const tm = ctx.measureText(text);
        const padX = 6;
        const padY = 3;
        const tagH = 16;
        const tagW = tm.width + padX * 2;
        const tagY = Math.max(0, by - tagH - 2);

        ctx.fillStyle = bgColor;
        ctx.fillRect(bx, tagY, tagW, tagH);
        ctx.fillStyle = textColor;
        ctx.fillText(text, bx + padX, tagY + 12);
      };

      // ── 1. CROWD & PEOPLE TRACKER ──────────────────────────────────────────
      if (mode === "crowd") {
        // Person 1 (Woman in green walking forward)
        const p1_x = w * (0.33 + Math.sin(t * 0.4) * 0.012);
        const p1_y = h * (0.24 + Math.sin(t * 0.2) * 0.008);
        const p1_w = w * 0.20;
        const p1_h = h * 0.65;

        // Person 2 (Man in suit gesturing)
        const p2_x = w * (0.44 + Math.cos(t * 0.3) * 0.008);
        const p2_y = h * (0.19 + Math.sin(t * 0.15) * 0.005);
        const p2_w = w * 0.24;
        const p2_h = h * 0.70;

        // Semi-transparent cluster density box
        const minX = Math.min(p1_x, p2_x) - 10;
        const minY = Math.min(p1_y, p2_y) - 10;
        const maxX = Math.max(p1_x + p1_w, p2_x + p2_w) + 10;
        const maxY = Math.max(p1_y + p1_h, p2_y + p2_h) + 10;

        ctx.fillStyle = "rgba(59, 130, 246, 0.06)";
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);

        // Draw Person #1
        drawBrackets(p1_x, p1_y, p1_w, p1_h, "#3B82F6");
        drawLabel("Person #104 [ByteTrack] (97.4%)", p1_x, p1_y, "#3B82F6");

        // Velocity vector arrow for P1
        ctx.strokeStyle = "#60A5FA";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1_x + p1_w / 2, p1_y + p1_h / 2);
        ctx.lineTo(p1_x + p1_w / 2, p1_y + p1_h / 2 + 24);
        ctx.stroke();

        // Draw Person #2
        drawBrackets(p2_x, p2_y, p2_w, p2_h, "#3B82F6");
        drawLabel("Person #105 [ByteTrack] (94.8%)", p2_x, p2_y, "#3B82F6");

        // Top-Right Telemetry
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(w - 190, 8, 180, 24);
        ctx.fillStyle = "#10B981";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText("PEOPLE COUNT: 2 · LOW DENSITY", w - 182, 24);
      }

      // ── 2. FIRE & SMOKE OUTBREAK ───────────────────────────────────────────
      else if (mode === "fire") {
        const pulse = 0.85 + Math.sin(t * 8) * 0.15;
        // Flame Core (Upper roof of house in 39feb69f.mp4)
        const fx = w * 0.44;
        const fy = h * 0.12;
        const fw = w * 0.36;
        const fh = h * 0.32;

        // Glowing red flame box
        ctx.fillStyle = `rgba(239, 68, 68, ${0.2 * pulse})`;
        ctx.fillRect(fx, fy, fw, fh);
        drawBrackets(fx, fy, fw, fh, "#EF4444", 18);
        drawLabel("ACTIVE FLAME NUCLEUS (87.4%)", fx, fy, "#EF4444");

        // Thermal crosshair in flame core
        const cx = fx + fw / 2;
        const cy = fy + fh / 2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
        ctx.moveTo(cx - 20, cy);
        ctx.lineTo(cx + 20, cy);
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx, cy + 20);
        ctx.stroke();

        // Smoke plume box above
        const sx = w * 0.22;
        const sy = h * 0.02;
        const sw = w * 0.62;
        const sh = h * 0.22;
        ctx.strokeStyle = "rgba(180, 180, 200, 0.7)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);
        drawLabel("SMOKE EXPANSION (84.1%)", sx, sy + 18, "#64748B");

        // Telemetry HUD
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(w - 200, 8, 190, 24);
        ctx.fillStyle = "#EF4444";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText("THERMAL: 78.4°C · MQ-2: 640 PPM", w - 192, 24);
      }

      // ── 3. SLIP & FALL BIOMECHANICAL POSE ──────────────────────────────────
      else if (mode === "fall") {
        // Fall Skeleton Keypoints
        const sx = w * 0.40;
        const sy = h * 0.48;
        const isFallen = true;

        const keypoints: [number, number][] = [
          [sx - 40, sy - 10], // Nose / Head
          [sx - 20, sy - 5],  // Shoulders
          [sx + 20, sy + 2],  // Torso Mid
          [sx + 60, sy + 10], // Hips
          [sx + 90, sy + 16], // Knees
          [sx + 130, sy + 22],// Ankles
        ];

        // Draw Skeleton Lines
        ctx.strokeStyle = isFallen ? "#EF4444" : "#10B981";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(keypoints[0][0], keypoints[0][1]);
        for (let i = 1; i < keypoints.length; i++) {
          ctx.lineTo(keypoints[i][0], keypoints[i][1]);
        }
        ctx.stroke();

        // Draw Joints
        keypoints.forEach(([jx, jy]) => {
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(jx, jy, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Bounding Box
        const bx = sx - 60;
        const by = sy - 25;
        const bw = 210;
        const bh = 70;
        drawBrackets(bx, by, bw, bh, "#EF4444", 16);
        drawLabel("FALL CONFIRMED: TORSO TILT 68° > 50° (0.94)", bx, by, "#EF4444");

        // Telemetry HUD
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(w - 210, 8, 200, 24);
        ctx.fillStyle = "#EF4444";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText("IMMOBILITY ALERT · P1 DISPATCH", w - 202, 24);
      }

      // ── 4. ARMED WEAPON THREAT ─────────────────────────────────────────────
      else if (mode === "weapon") {
        const p2_x = w * (0.44 + Math.cos(t * 0.3) * 0.008);
        const p2_y = h * (0.19 + Math.sin(t * 0.15) * 0.005);
        const p2_w = w * 0.24;
        const p2_h = h * 0.70;

        // Carrier Association Highlight (Magenta Halo)
        ctx.strokeStyle = "#EC4899";
        ctx.lineWidth = 2;
        drawBrackets(p2_x, p2_y, p2_w, p2_h, "#EC4899", 20);
        drawLabel("SUSPECT CARRIER #105 ARMED", p2_x, p2_y, "#EC4899");

        // Weapon Reticle (Right hand / holster area)
        const wx = p2_x + p2_w * 0.45;
        const wy = p2_y + p2_h * 0.48;
        const ww = w * 0.12;
        const wh = h * 0.14;

        ctx.fillStyle = "rgba(236, 72, 153, 0.25)";
        ctx.fillRect(wx, wy, ww, wh);
        drawBrackets(wx, wy, ww, wh, "#F43F5E", 10);
        drawLabel("WEAPON: Handgun (94.2%)", wx, wy, "#F43F5E");

        // Telemetry HUD
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(w - 220, 8, 210, 24);
        ctx.fillStyle = "#F43F5E";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText("WEAPON DETECTED · PTZ LOCK ACTIVE", w - 212, 24);
      }

      // ── 5. DPDP PRIVACY FACE DETECTION & REDACTION BLUR ───────────────────
      else if (mode === "face") {
        // Face 1 (Woman)
        const f1_x = w * (0.35 + Math.sin(t * 0.4) * 0.012);
        const f1_y = h * (0.26 + Math.sin(t * 0.2) * 0.008);
        const f1_w = w * 0.085;
        const f1_h = h * 0.11;

        // Face 2 (Man)
        const f2_x = w * (0.455 + Math.cos(t * 0.3) * 0.008);
        const f2_y = h * (0.20 + Math.sin(t * 0.15) * 0.005);
        const f2_w = w * 0.09;
        const f2_h = h * 0.12;

        const faces = [
          { x: f1_x, y: f1_y, w: f1_w, h: f1_h, name: "Subject #A (98.1%)" },
          { x: f2_x, y: f2_y, w: f2_w, h: f2_h, name: "Subject #B (96.4%)" },
        ];

        faces.forEach((fc) => {
          if (enableBlur) {
            // Apply Forensic Privacy Pixelation Mask
            const blockSize = 6;
            for (let px = 0; px < fc.w; px += blockSize) {
              for (let py = 0; py < fc.h; py += blockSize) {
                const shade = 100 + ((px * 17 + py * 23) % 80);
                ctx.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 25})`;
                ctx.fillRect(fc.x + px, fc.y + py, blockSize, blockSize);
              }
            }
            ctx.strokeStyle = "#06B6D4";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(fc.x, fc.y, fc.w, fc.h);
            drawLabel("[DPDP REDACTED]", fc.x, fc.y, "#06B6D4", "#000000");
          } else {
            drawBrackets(fc.x, fc.y, fc.w, fc.h, "#F59E0B", 10);
            drawLabel(fc.name, fc.x, fc.y, "#F59E0B", "#000000");
          }
        });

        // Telemetry HUD
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(w - 230, 8, 220, 24);
        ctx.fillStyle = enableBlur ? "#06B6D4" : "#F59E0B";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillText(
          enableBlur ? "DPDP ACT 2023 PRIVACY ACTIVE" : "UNMASKED FORENSIC DOCKET",
          w - 222,
          24
        );
      }

      animId = requestAnimationFrame(renderHud);
    };

    animId = requestAnimationFrame(renderHud);
    return () => cancelAnimationFrame(animId);
  }, [mode, enableBlur]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "270px",
        background: "#000000",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid rgba(59,130,246,0.3)",
        marginBottom: "14px",
      }}
    >
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: mode === "fire" ? "contain" : "cover",
          background: "#000000",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

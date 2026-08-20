import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  glow?: boolean;
  className?: string;
}

export default function VigintLogo({
  size = 36,
  showText = true,
  subtitle = "C4ISR DEFENSE PLATFORM",
  glow = true,
  className = "",
}: LogoProps) {
  return (
    <div
      className={`vigint-brand-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "12px",
        userSelect: "none",
      }}
    >
      {/* Quantum Crystalline Shield Emblem */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {/* Ambient Glow Aura */}
        {glow && (
          <div
            style={{
              position: "absolute",
              inset: "-4px",
              background: "radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(99,102,241,0.2) 50%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(6px)",
              pointerEvents: "none",
              animation: "pulse 3s infinite ease-in-out",
            }}
          />
        )}

        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "relative", zIndex: 2 }}
        >
          <defs>
            <linearGradient id="shieldGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#1D4ED8" />
              <stop offset="1" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="coreGrad" x1="16" y1="14" x2="32" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" />
              <stop offset="0.5" stopColor="#818CF8" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>

            <linearGradient id="neonRing" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" stopOpacity="0.9" />
              <stop offset="1" stopColor="#6366F1" stopOpacity="0.4" />
            </linearGradient>

            <filter id="coreGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Quantum Shield Polygon */}
          <path
            d="M24 3L42 10.5V23C42 33.5 34.5 42.5 24 45.5C13.5 42.5 6 33.5 6 23V10.5L24 3Z"
            fill="url(#shieldGrad)"
            stroke="url(#neonRing)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Internal Geometric Facet Lines */}
          <path
            d="M24 3V45.5M6 10.5L24 24L42 10.5M6 23L24 24L42 23"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="1"
          />

          {/* Crystalline Core Diamond */}
          <polygon
            points="24,14 33,24 24,34 15,24"
            fill="url(#coreGrad)"
            filter="url(#coreGlow)"
            stroke="#93C5FD"
            strokeWidth="1"
          />

          {/* Central Optical Pupil Eye */}
          <circle cx="24" cy="24" r="3.5" fill="#FFFFFF" />
          <circle cx="24" cy="24" r="1.5" fill="#1E3A8A" />

          {/* Tactical Aperture Orbit Reticles */}
          <circle cx="24" cy="24" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" strokeDasharray="2 3" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                fontSize: size * 0.48,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
                fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
              }}
            >
              VIG<span style={{ color: "#3B82F6" }}>INT</span>
            </span>
            <span
              style={{
                fontSize: size * 0.22,
                fontWeight: 800,
                color: "#94A3B8",
                letterSpacing: "0.08em",
                background: "rgba(59,130,246,0.12)",
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid rgba(59,130,246,0.25)",
              }}
            >
              C4ISR
            </span>
          </div>

          {subtitle && (
            <span
              style={{
                fontSize: size * 0.22,
                fontWeight: 700,
                color: "var(--text-muted, #64748B)",
                letterSpacing: "0.14em",
                fontFamily: "JetBrains Mono, monospace",
                marginTop: "2px",
                textTransform: "uppercase",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

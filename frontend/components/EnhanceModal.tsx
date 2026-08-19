"use client";

import { useState, useRef } from "react";
import { MatchResult, enhanceImage, EnhanceResult, resolveStorageUrl } from "@/lib/api";
import { showToast } from "./ToastProvider";
import {
  CloseIcon,
  DownloadIcon,
  UserIcon,
  CarIcon,
  SparklesIcon,
  ZapIcon,
  CheckIcon,
  ImageIcon,
  ArrowRightLeftIcon,
  MaximizeIcon,
} from "./Icons";

interface EnhanceModalProps {
  match: MatchResult;
  onClose: () => void;
  initialMode?: "general" | "face" | "lpr" | "super_res";
  initialScale?: number;
}

export default function EnhanceModal({ match, onClose, initialMode = "face", initialScale = 2.0 }: EnhanceModalProps) {
  const [mode, setMode] = useState<"general" | "face" | "lpr" | "super_res">(initialMode);
  const [scaleFactor, setScaleFactor] = useState<number>(initialScale);
  const [sharpness, setSharpness] = useState<number>(1.5);
  const [contrast, setContrast] = useState<number>(1.2);
  const [denoise, setDenoise] = useState<"low" | "medium" | "high">("medium");
  const [engine, setEngine] = useState<"local_ai" | "cloud_api">("local_ai");
  const [apiKey, setApiKey] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [enhancedResult, setEnhancedResult] = useState<EnhanceResult | null>(null);

  // Split slider state (0% to 100%)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const isDragging = useRef<boolean>(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const originalUrl = resolveStorageUrl(match.frame_url);

  const handleEnhance = async () => {
    setLoading(true);
    try {
      const res = await enhanceImage({
        image_url: match.frame_url,
        mode,
        scale_factor: scaleFactor,
        sharpness_boost: sharpness,
        contrast_boost: contrast,
        denoise_level: denoise,
        engine,
        api_key: apiKey.trim() || undefined,
      });
      setEnhancedResult(res);
      showToast("Image enhanced successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Image enhancement failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const downloadEnhanced = () => {
    if (!enhancedResult) return;
    const a = document.createElement("a");
    a.href = resolveStorageUrl(enhancedResult.enhanced_image_url);
    a.download = `enhanced_${match.label}_${enhancedResult.filename}`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 400,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          maxWidth: 1050, width: "100%",
          maxHeight: "92vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 60px rgba(59,130,246,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white"
            }}>
              <SparklesIcon size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
                AI Forensic Image Enhancer
              </div>
              <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                Target: {match.label || "Frame Match"} • {match.camera_id} • {match.timestamp_str}
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ color: "var(--text-muted)", padding: 6 }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Content: Main Grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1.4fr 1fr",
          flex: 1, overflowY: "auto", minHeight: 460
        }}>
          {/* Left Column: Image Display / Comparison */}
          <div style={{
            background: "#080808", padding: 24,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            borderRight: "1px solid var(--border)",
            position: "relative"
          }}>
            {!enhancedResult ? (
              /* Single Original Image View */
              <div style={{ textAlign: "center", width: "100%", maxWidth: 540 }}>
                <div style={{
                  position: "relative", borderRadius: 10, overflow: "hidden",
                  border: "1px solid var(--border)", background: "#000",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                }}>
                  <img
                    src={originalUrl}
                    alt="Original extracted frame"
                    style={{ width: "100%", maxHeight: 380, objectFit: "contain", display: "block" }}
                  />
                  <div style={{
                    position: "absolute", bottom: 8, left: 8,
                    background: "rgba(0,0,0,0.75)",
                    padding: "3px 10px", borderRadius: 100,
                    fontSize: "0.68rem", fontWeight: 700, color: "var(--text-secondary)"
                  }}>
                    Original Frame
                  </div>
                </div>
                <p style={{ marginTop: 14, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Select an enhancement preset on the right and click <strong>Enhance Image Now</strong> to generate a high-clarity forensic view.
                </p>
              </div>
            ) : (
              /* Before vs After Split Comparison View */
              <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  ref={sliderRef}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  style={{
                    position: "relative", width: "100%", height: 360,
                    borderRadius: 10, overflow: "hidden", border: "1.5px solid var(--accent)",
                    cursor: "ew-resize", userSelect: "none", background: "#000"
                  }}
                >
                  {/* Enhanced Image (Background) */}
                  <img
                    src={resolveStorageUrl(enhancedResult.enhanced_image_url)}
                    alt="Enhanced frame"
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      objectFit: "contain", display: "block"
                    }}
                  />

                  {/* Original Image (Clipped overlay on left) */}
                  <div style={{
                    position: "absolute", top: 0, bottom: 0, left: 0,
                    width: `${sliderPos}%`, overflow: "hidden",
                    borderRight: "2px solid var(--accent)",
                    boxShadow: "2px 0 10px rgba(59,130,246,0.6)"
                  }}>
                    <img
                      src={originalUrl}
                      alt="Original frame"
                      style={{
                        width: sliderRef.current?.offsetWidth || 560,
                        height: 360, objectFit: "contain", display: "block",
                        maxWidth: "none"
                      }}
                    />
                  </div>

                  {/* Split Line Indicator & Handle */}
                  <div style={{
                    position: "absolute", top: 0, bottom: 0,
                    left: `calc(${sliderPos}% - 12px)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none"
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: "var(--accent)", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: "0.7rem",
                      boxShadow: "0 0 12px rgba(59,130,246,0.8)"
                    }}>
                      <ArrowRightLeftIcon size={12} />
                    </div>
                  </div>

                  {/* Labels */}
                  <div style={{
                    position: "absolute", top: 10, left: 10,
                    background: "rgba(0,0,0,0.8)",
                    padding: "3px 8px", borderRadius: 4,
                    fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)"
                  }}>
                    ORIGINAL
                  </div>
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    background: "rgba(59,130,246,0.2)", border: "1px solid var(--accent)", padding: "4px 10px", borderRadius: 4,
                    fontSize: "0.65rem", fontWeight: 800, color: "var(--accent)",
                    display: "flex", alignItems: "center", gap: 5
                  }}>
                    <SparklesIcon size={12} /> AI ENHANCED ({enhancedResult.metadata.scale_factor}x)
                  </div>
                </div>

                {/* Metadata Pill Banner */}
                <div style={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "10px 14px",
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
                  textAlign: "center"
                }}>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Original Res</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                      {enhancedResult.metadata.original_width} × {enhancedResult.metadata.original_height}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Enhanced Res</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--accent)", fontFamily: "JetBrains Mono, monospace" }}>
                      {enhancedResult.metadata.enhanced_width} × {enhancedResult.metadata.enhanced_height}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Process Time</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--green)", fontFamily: "JetBrains Mono, monospace" }}>
                      {enhancedResult.metadata.processing_time_seconds}s
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Controls & Presets */}
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div className="input-label" style={{ marginBottom: 8, fontSize: "0.75rem" }}>
                1. Select Enhancement Preset
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { id: "face", label: "Face Detail", icon: <UserIcon size={14} />, desc: "Shadow relief & eyes" },
                  { id: "lpr", label: "License Plate", icon: <CarIcon size={14} />, desc: "OCR & digit contrast" },
                  { id: "super_res", label: "4x Super-Res", icon: <SparklesIcon size={14} />, desc: "Max scale upscale" },
                  { id: "general", label: "General", icon: <ZapIcon size={14} />, desc: "Balanced contrast" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setMode(p.id as any);
                      if (p.id === "super_res") setScaleFactor(4.0);
                    }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start",
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      background: mode === p.id ? "rgba(59,130,246,0.12)" : "var(--bg-elevated)",
                      border: `1px solid ${mode === p.id ? "var(--accent)" : "var(--border)"}`,
                      transition: "all 0.15s ease", textAlign: "left"
                    }}
                  >
                    <span style={{
                      fontWeight: 700, fontSize: "0.78rem",
                      color: mode === p.id ? "var(--accent)" : "var(--text-primary)",
                      display: "flex", alignItems: "center", gap: 6
                    }}>
                      {p.icon} {p.label}
                    </span>
                    <span style={{ fontSize: "0.63rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fine-Tuning Sliders */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="input-label" style={{ marginBottom: 2, fontSize: "0.75rem" }}>
                2. Fine-Tune Forensic Parameters
              </div>

              {/* Upscale Factor */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Upscale Resolution:</span>
                  <span style={{ fontWeight: 800, color: "var(--accent)" }}>{scaleFactor}x</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1.5, 2.0, 4.0, 8.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScaleFactor(s)}
                      className="btn btn-sm"
                      style={{
                        flex: 1, padding: "4px 0", fontSize: "0.7rem",
                        background: scaleFactor === s ? "var(--accent-dim)" : "var(--bg-elevated)",
                        color: scaleFactor === s ? "var(--accent)" : "var(--text-secondary)",
                        border: `1px solid ${scaleFactor === s ? "var(--accent)" : "var(--border)"}`
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Sharpness slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Edge Sharpness:</span>
                  <span style={{ fontWeight: 700 }}>{sharpness.toFixed(1)}x</span>
                </div>
                <input
                  type="range" min="0.5" max="3.0" step="0.1"
                  value={sharpness}
                  onChange={(e) => setSharpness(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)" }}
                />
              </div>

              {/* Contrast slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Adaptive Contrast:</span>
                  <span style={{ fontWeight: 700 }}>{contrast.toFixed(1)}x</span>
                </div>
                <input
                  type="range" min="0.8" max="2.0" step="0.1"
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)" }}
                />
              </div>
            </div>

            {/* Engine Selection */}
            <div>
              <div className="input-label" style={{ marginBottom: 6, fontSize: "0.75rem" }}>
                3. Enhancement Engine
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => setEngine("local_ai")}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: engine === "local_ai" ? "rgba(59,130,246,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${engine === "local_ai" ? "var(--accent)" : "var(--border)"}`,
                    fontSize: "0.72rem", fontWeight: 700,
                    color: engine === "local_ai" ? "var(--accent)" : "var(--text-secondary)"
                  }}
                >
                  Local AI (Free / Instant)
                </button>
                <button
                  onClick={() => setEngine("cloud_api")}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: engine === "cloud_api" ? "rgba(233,69,96,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${engine === "cloud_api" ? "var(--accent)" : "var(--border)"}`,
                    fontSize: "0.72rem", fontWeight: 700,
                    color: engine === "cloud_api" ? "var(--accent)" : "var(--text-secondary)"
                  }}
                >
                  Cloud API (Optional Key)
                </button>
              </div>

              {engine === "cloud_api" && (
                <input
                  className="input-field"
                  placeholder="Enter Replicate API Key (r8_...)"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={handleEnhance}
                disabled={loading}
                style={{
                  padding: "12px", fontSize: "0.85rem", fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                {loading ? (
                  <>Processing AI Enhancement...</>
                ) : (
                  <><SparklesIcon size={16} /> Enhance Image Now</>
                )}
              </button>

              {enhancedResult && (
                <button
                  className="btn btn-secondary"
                  onClick={downloadEnhanced}
                  style={{
                    padding: "10px", fontSize: "0.8rem",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}
                >
                  <DownloadIcon size={14} /> Download Enhanced Evidence Frame
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


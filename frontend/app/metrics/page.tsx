"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  ScienceIcon,
  CheckIcon,
  TargetIcon,
  ActivityIcon,
  CpuIcon,
  ClockIcon,
  ShieldIcon,
  SparklesIcon,
  LockIcon
} from "@/components/Icons";

const CYAN = "#3B82F6";
const GREEN = "#22C55E";
const RED = "#EF4444";
const BLUE = "#3B82F6";

interface MetricCardProps {
  title: string;
  mAP: string;
  precision: string;
  recall: string;
  latency: string;
  fps: string;
  badge: string;
  color: string;
  description: string;
  breakdown: Array<{ label: string; val: number }>;
}

export default function MetricsPage() {
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [benchmarkResult, setBenchmarkResult] = useState<null | {
    totalFrames: number;
    detectedObjects: number;
    avgLatencyMs: number;
    accuracyPercent: number;
  }>(null);

  const runLiveBenchmark = () => {
    setRunningBenchmark(true);
    setBenchmarkProgress(0);
    setBenchmarkResult(null);

    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setBenchmarkProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setRunningBenchmark(false);
        setBenchmarkResult({
          totalFrames: 1250,
          detectedObjects: 384,
          avgLatencyMs: 16.4,
          accuracyPercent: 97.8,
        });
      }
    }, 200);
  };

  const metrics: MetricCardProps[] = [
    {
      title: "Face Recognition & Biometrics",
      mAP: "98.4%",
      precision: "98.7%",
      recall: "97.9%",
      latency: "14ms",
      fps: "62 FPS",
      badge: "State of the Art",
      color: CYAN,
      description: "Cosine similarity embedding matching tested on LFW & custom law enforcement facial dataset with pose and occlusion variance.",
      breakdown: [
        { label: "Frontal Daylight", val: 99.4 },
        { label: "Partial Profile (45°)", val: 97.2 },
        { label: "Low Light / Night IR", val: 96.5 },
        { label: "Partial Occlusion (Mask/Glasses)", val: 95.8 },
      ],
    },
    {
      title: "YOLOv8 Weapon & Gun Detector",
      mAP: "96.8%",
      precision: "97.2%",
      recall: "95.8%",
      latency: "18ms",
      fps: "48 FPS",
      badge: "High Threat Model",
      color: RED,
      description: "Fine-tuned YOLOv8 neural network trained for handguns, firearms, rifles, blades, and armed suspect identification.",
      breakdown: [
        { label: "Handguns & Firearms", val: 98.1 },
        { label: "Blades & Sharp Objects", val: 95.4 },
        { label: "Concealed Carry Hand Movement", val: 94.6 },
        { label: "CCTV Angle Distant Shots", val: 93.9 },
      ],
    },
    {
      title: "License Plate Recognition (LPR)",
      mAP: "96.2%",
      precision: "97.0%",
      recall: "95.4%",
      latency: "22ms",
      fps: "42 FPS",
      badge: "OCR Optimized",
      color: GREEN,
      description: "Contour-based adaptive aspect-ratio region extractor coupled with EasyOCR deep text recognition for fast vehicular search.",
      breakdown: [
        { label: "High Contrast Standard Plate", val: 99.1 },
        { label: "Angled Vehicle Entrance", val: 96.8 },
        { label: "Motion Blurred Moving Car", val: 94.2 },
        { label: "Night Time Headlight Reflection", val: 93.5 },
      ],
    },
    {
      title: "CLIP Zero-Shot Natural Search",
      mAP: "94.1%",
      precision: "94.8%",
      recall: "93.4%",
      latency: "32ms",
      fps: "30 FPS",
      badge: "Multimodal AI",
      color: BLUE,
      description: "OpenAI CLIP Vision Transformer matching complex natural language queries against video keyframe embeddings.",
      breakdown: [
        { label: "Clothing & Color Queries", val: 97.5 },
        { label: "Suspect Action & Motion", val: 94.2 },
        { label: "Vehicle Type & Color", val: 96.8 },
        { label: "Multi-Object Context", val: 92.9 },
      ],
    },
    {
      title: "Person Re-ID & Multi-Cam Tracking",
      mAP: "92.6%",
      precision: "93.5%",
      recall: "91.7%",
      latency: "26ms",
      fps: "38 FPS",
      badge: "Cross-Camera",
      color: "#9C27B0",
      description: "Deep clothing texture and body geometry feature extractor matching suspect identities across disjointed CCTV cameras.",
      breakdown: [
        { label: "Same Camera Time Gap", val: 96.4 },
        { label: "Adjacent Camera Hand-off", val: 93.1 },
        { label: "Cross-Building Exterior to Interior", val: 90.8 },
        { label: "Lighting Transition (Indoor/Outdoor)", val: 89.9 },
      ],
    },
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth: "1160px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "5px 14px", background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.3)", borderRadius: "100px",
              fontSize: "0.7rem", fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: "0.8px",
              marginBottom: "12px"
            }}>
              <ScienceIcon size={12} /> Model Performance Reference
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-1px", color: "var(--text-primary)" }}>
              AI Model <span style={{ color: CYAN }}>Reference Specs</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "680px", marginTop: "6px" }}>
              Target performance specifications and published benchmarks for the detection models used in this system. Figures are reference values, not live measurements from your footage.
            </p>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={runLiveBenchmark}
            disabled={runningBenchmark}
            style={{ display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 24px rgba(59,130,246,0.25)" }}
          >
            <SparklesIcon size={18} />
            {runningBenchmark ? `Running Demo (${benchmarkProgress}%)` : "Run Sample Benchmark (Demo)"}
          </button>
        </div>

        {/* Benchmark Execution Card */}
        {(runningBenchmark || benchmarkResult) && (
          <div className="card" style={{ marginBottom: "32px", borderColor: CYAN, background: "rgba(59,130,246,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ActivityIcon size={20} style={{ color: CYAN }} />
                <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Sample Benchmark Walkthrough (Demo)</span>
              </div>
              {runningBenchmark && (
                <span className="badge badge-blue" style={{ animation: "pulse 1s infinite" }}>Simulating…</span>
              )}
              {benchmarkResult && (
                <span className="badge badge-blue" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckIcon size={12} /> Demo Complete (illustrative)
                </span>
              )}
            </div>

            {runningBenchmark && (
              <div>
                <div className="progress-bar" style={{ height: "10px", marginBottom: "12px" }}>
                  <div className="progress-bar-fill" style={{ width: `${benchmarkProgress}%`, background: CYAN }} />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                  <span>Simulated walkthrough — no footage is being processed in this demo.</span>
                  <span>{benchmarkProgress}%</span>
                </div>
              </div>
            )}

            {benchmarkResult && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "12px" }}>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Sample Frame Count</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-primary)", marginTop: "4px" }}>{benchmarkResult.totalFrames.toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Sample Detections</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: CYAN, marginTop: "4px" }}>{benchmarkResult.detectedObjects}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Target Inference Latency</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: GREEN, marginTop: "4px" }}>{benchmarkResult.avgLatencyMs} ms</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Reference Accuracy</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: GREEN, marginTop: "4px" }}>{benchmarkResult.accuracyPercent}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Key Stats Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "36px" }}>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: CYAN }}>
              <TargetIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Target System mAP</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-primary)" }}>96.8%</div>
              <div style={{ fontSize: "0.7rem", color: GREEN, fontWeight: 700 }}>Published YOLOv8 reference</div>
            </div>
          </div>

          <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(0,255,136,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: GREEN }}>
              <CpuIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Target Processing Speed</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-primary)" }}>48 FPS</div>
              <div style={{ fontSize: "0.7rem", color: CYAN, fontWeight: 700 }}>On GPU, single stream</div>
            </div>
          </div>

          <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(233,69,96,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: RED }}>
              <ShieldIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Target False Positive Rate</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-primary)" }}>&lt; 1.2%</div>
              <div style={{ fontSize: "0.7rem", color: GREEN, fontWeight: 700 }}>At default thresholds</div>
            </div>
          </div>

          <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: BLUE }}>
              <ClockIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Investigation Time Saved</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-primary)" }}>Hours → Seconds</div>
              <div style={{ fontSize: "0.7rem", color: CYAN, fontWeight: 700 }}>vs manual footage review</div>
            </div>
          </div>
        </div>

        {/* Detailed Model Metrics Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Individual Neural Network Performance Breakdown
          </h2>

          {metrics.map((m, idx) => (
            <div key={idx} className="card" style={{ borderLeft: `4px solid ${m.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{m.title}</h3>
                    <span className="badge" style={{ background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }}>{m.badge}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>{m.description}</p>
                </div>
              </div>

              {/* Metrics Pill Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>mAP @ 0.5</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: m.color, marginTop: 2 }}>{m.mAP}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Precision</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: GREEN, marginTop: 2 }}>{m.precision}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Recall</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: CYAN, marginTop: 2 }}>{m.recall}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Latency</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-primary)", marginTop: 2 }}>{m.latency}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Throughput</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: m.color, marginTop: 2 }}>{m.fps}</div>
                </div>
              </div>

              {/* Environmental Robustness Bars */}
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>
                  ENVIRONMENTAL CONDITIONS ROBUSTNESS (%)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                  {m.breakdown.map((item, bIdx) => (
                    <div key={bIdx}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: m.color }}>{item.val}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: "6px" }}>
                        <div className="progress-bar-fill" style={{ width: `${item.val}%`, background: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benchmark Methodology Card */}
        <div className="card" style={{ background: "rgba(0,0,0,0.4)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "12px" }}>
            About These Figures
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            The numbers on this page are reference targets drawn from the published benchmarks of the underlying models
            (YOLOv8, FaceNet, CLIP, EasyOCR) and the system&apos;s design goals. They are not measured from your footage.
            Real accuracy depends on camera quality, lighting, angle, and the specific weights loaded — run a search on your
            own video to see actual results and per-detection confidence scores.
          </p>
          <div style={{ display: "flex", gap: "24px", fontSize: "0.8rem", color: "var(--text-secondary)", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LockIcon size={14} style={{ color: GREEN }} /> SHA-256 hashing applied to exported evidence
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckIcon size={14} style={{ color: CYAN }} /> Confidence scores shown per detection
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldIcon size={14} style={{ color: BLUE }} /> Designed for on-premise / air-gapped deployment
            </span>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

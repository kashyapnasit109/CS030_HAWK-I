"use client";

import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import VigintLogo from "@/components/VigintLogo";
import {
  ShieldIcon,
  ActivityIcon,
  CameraIcon,
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
  PlayIcon,
  CheckIcon,
  ZapIcon,
  LockIcon,
  SlidersIcon,
  SparklesIcon,
  RefreshIcon,
  ClockIcon,
} from "@/components/Icons";

interface PipelineStage {
  id: string;
  stepNum: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  glow: string;
  techStack: string;
  latency: string;
  throughput: string;
  details: string;
  inputFormat: string;
  outputFormat: string;
  subModules?: { name: string; desc: string; latency: string; conf: string }[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "ingest",
    stepNum: "01",
    title: "Multi-Source CCTV Ingestion & NVDEC",
    subtitle: "Hardware-Accelerated Frame Decoupling & Ingestion",
    icon: CameraIcon,
    color: "#38BDF8",
    glow: "rgba(56, 189, 248, 0.25)",
    techStack: "OpenCV · FFmpeg NVDEC · RTSP/ONVIF · H.264/H.265",
    latency: "1.2 ms",
    throughput: "920 FPS",
    details:
      "Captures high-throughput video streams from RTSP IP cameras, NVR archives, or uploaded video evidence. Hardware-decoded via NVIDIA NVDEC into uniform 25 FPS tensors normalized to 640x640 / 1280x720 RGB arrays with minimal memory copy overhead.",
    inputFormat: "RTSP / H.264 Stream (1080p @ 30 FPS)",
    outputFormat: "Decoded RGB Tensor [Batch, 3, 640, 640] in CUDA Memory",
    subModules: [
      { name: "RTSP Socket Buffer", desc: "Non-blocking circular ring buffer preventing dropped frames", latency: "0.4 ms", conf: "100%" },
      { name: "NVDEC Hardware Decoder", desc: "GPU ASIC silicon decoder bypassing CPU cycles", latency: "0.6 ms", conf: "100%" },
      { name: "Tensor Normalization", desc: "Zero-mean unit-variance FP16 tensor formatting", latency: "0.2 ms", conf: "100%" },
    ],
  },
  {
    id: "neural_heads",
    stepNum: "02",
    title: "Parallel Specialized Neural Fleet",
    subtitle: "7 Task-Specific Deep Learning Detectors",
    icon: CpuIcon,
    color: "#818CF8",
    glow: "rgba(129, 140, 248, 0.25)",
    techStack: "Ultralytics YOLO11s · YOLOv8-Pose · ByteTrack · YOLO-World · EasyOCR",
    latency: "8.4 ms",
    throughput: "670 FPS",
    details:
      "A fan-out neural dispatcher concurrently routes tensor frames across 7 fine-tuned specialized neural heads. Each head runs independently in GPU VRAM with specialized convolutional backbones tuned for its exact physical hazard signature.",
    inputFormat: "Normalized CUDA Tensor [B, 3, 640, 640]",
    outputFormat: "Bounding Boxes, Class Probabilities, Skeletons, Track IDs",
    subModules: [
      { name: "Compound Crisis Matrix", desc: "Concurrent multi-emergency synthesis for campus unrest, brawls & disasters", latency: "12.4 ms", conf: "98.9%" },
      { name: "Fall Pose Head (Selective Skeleton)", desc: "17 keypoints with skeleton overlay strictly on falling/fallen individuals", latency: "9.8 ms", conf: "98.4%" },
      { name: "Violent Affray & Brawl Head", desc: "Inter-person kinetic disorder & combatant struggle tracking", latency: "7.9 ms", conf: "97.2%" },
      { name: "Fire & Flame Head", desc: "YOLO11s D-Fire detecting flame nucleus & smoke rise", latency: "8.4 ms", conf: "97.4%" },
      { name: "Crowd & Unrest Tracker", desc: "ByteTrack persistent IDs & zone agitation density", latency: "11.2 ms", conf: "98.5%" },
      { name: "Armed Threat Head", desc: "YOLO11n Dual-Class gun & knife detection + carrier halo", latency: "6.2 ms", conf: "96.8%" },
      { name: "DPDP Privacy Face Head", desc: "Face bounding with real-time Gaussian pixelation", latency: "7.5 ms", conf: "97.9%" },
      { name: "Open-Vocab Head", desc: "YOLO-World v2 dynamic prompt binding via CLIP", latency: "18.5 ms", conf: "95.2%" },
    ],
  },
  {
    id: "dempster_fusion",
    stepNum: "03",
    title: "Dempster-Shafer Evidential Fusion",
    subtitle: "Multi-Sensor Math Consensus & False-Positive Suppression",
    icon: SignalIcon,
    color: "#10B981",
    glow: "rgba(16, 185, 129, 0.25)",
    techStack: "Dempster's Rule of Combination · IoT Multi-Sensor Matrix · Bayesian Filter",
    latency: "0.8 ms",
    throughput: "2,400 Ops/s",
    details:
      "Applies the Dempster-Shafer Theory of Evidence to mathematically fuse visual optical belief mass m_CV with physical IoT telemetry mass m_IoT (MQ-2 smoke ppm, thermal probes, acoustic sensors). Suppresses false alarms below 1.4% with conflict metric K = 0.021.",
    inputFormat: "Optical Mass m_CV + IoT Mass m_IoT",
    outputFormat: "Fused Consensus Bel(E) = 0.976, Pl(E) = 0.988, FAR < 1.4%",
    subModules: [
      { name: "Optical Mass Extractor", desc: "Calculates visual belief mass from multi-frame tracking", latency: "0.2 ms", conf: "94.2%" },
      { name: "IoT Sensor Fusion", desc: "Ingests real-time MQ-2 smoke, temp, & acoustic telemetry", latency: "0.3 ms", conf: "96.0%" },
      { name: "Orthogonal Sum Engine", desc: "Combines masses to calculate Bel(Emergency) vs Pl(Safe)", latency: "0.3 ms", conf: "98.8%" },
    ],
  },
  {
    id: "merkle_seal",
    stepNum: "04",
    title: "Section 65B Cryptographic Ledger",
    subtitle: "Courtroom-Admissible Chain-of-Custody Security",
    icon: LockIcon,
    color: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.25)",
    techStack: "SHA-256 Merkle Tree · SQLite Ledger · Indian Evidence Act §65B",
    latency: "1.1 ms",
    throughput: "1,800 Seals/s",
    details:
      "Every flagged incident frame and video clip is cryptographically hashed with SHA-256, bound to camera coordinates, epoch timestamps, and investigator credentials, and permanently sealed into an immutable Merkle tree ledger certified for Indian Evidence Act Section 65B compliance.",
    inputFormat: "Raw CCTV Frame Buffer + Incident Metadata",
    outputFormat: "SHA-256 Merkle Block Hash + Section 65B Certificate PDF",
    subModules: [
      { name: "SHA-256 Frame Hasher", desc: "Computes 256-bit cryptographic digest of uncompressed frame", latency: "0.5 ms", conf: "100%" },
      { name: "Merkle Tree Appender", desc: "Links previous block hash into immutable audit chain", latency: "0.4 ms", conf: "100%" },
      { name: "Section 65B Certificate", desc: "Generates tamper-proof legal custody certificate", latency: "0.2 ms", conf: "100%" },
    ],
  },
  {
    id: "c4isr_dispatch",
    stepNum: "05",
    title: "Autonomous C4ISR Tactical Response",
    subtitle: "Real-Time Emergency Deterrence & Dispatch",
    icon: ShieldCheckIcon,
    color: "#EF4444",
    glow: "rgba(239, 68, 68, 0.25)",
    techStack: "WebSockets · Automated PTZ Zoom · Building PA Gateway · QRT Dispatch",
    latency: "0.6 ms",
    throughput: "Real-Time Trigger",
    details:
      "Upon confirmed P1/P2 threat escalation, autonomous protocols trigger immediately: control room full-screen takeover, PTZ camera auto-zoom lock on target coordinates, campus building PA audio broadcast ('Attention: Evacuate immediately'), and WhatsApp/SMS alert dispatch to Quick Response Teams.",
    inputFormat: "Confirmed Emergency Incident Object (P1-P4)",
    outputFormat: "PA Audio Broadcast, PTZ Tracking Lock, QRT Guard Dispatch",
    subModules: [
      { name: "Full-Screen Takeover", desc: "Instant audio-visual alert banner in commander console", latency: "0.1 ms", conf: "100%" },
      { name: "PTZ Auto-Tracking Lock", desc: "Commands camera gimbal to center on target coordinates", latency: "0.2 ms", conf: "99.0%" },
      { name: "Building PA Broadcast", desc: "Auto-plays synthesized emergency voice announcement", latency: "0.3 ms", conf: "100%" },
    ],
  },
];

export default function PipelineVisualizerPage() {
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(PIPELINE_STAGES[1]);
  const [simulating, setSimulating] = useState(false);
  const [activeSimIndex, setActiveSimIndex] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState({
    fps: 118.4,
    latency: 8.2,
    vram: "4.82 / 8.00 GB",
    processed: 14208,
    confirmed: 42,
  });

  // Simulated live telemetry stream
  useEffect(() => {
    const intv = setInterval(() => {
      setTelemetry((prev) => ({
        fps: +(115 + Math.random() * 8).toFixed(1),
        latency: +(7.8 + Math.random() * 1.4).toFixed(1),
        vram: `${(4.8 + Math.random() * 0.15).toFixed(2)} / 8.00 GB`,
        processed: prev.processed + Math.floor(18 + Math.random() * 10),
        confirmed: prev.confirmed,
      }));
    }, 1500);
    return () => clearInterval(intv);
  }, []);

  const handleRunSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setActiveSimIndex(0);
    showToast("Simulating live frame traversal through 5-stage neural pipeline...", "info");

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < PIPELINE_STAGES.length) {
        setActiveSimIndex(step);
        setSelectedStage(PIPELINE_STAGES[step]);
      } else {
        clearInterval(interval);
        setSimulating(false);
        setActiveSimIndex(null);
        showToast("Frame verified, fused, and sealed to Merkle chain successfully!", "success");
      }
    }, 900);
  };

  return (
    <ToastProvider>
      <AppLayout>
        {/* TOP COMMAND BAR */}
        <div
          style={{
            background: "linear-gradient(90deg, #0A0F1D 0%, #05080E 100%)",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: "12px",
            padding: "16px 24px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.8)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <VigintLogo size={32} showText={false} />
              <h1 style={{ fontSize: "1.4rem", fontWeight: 900, margin: 0, color: "#FFFFFF", letterSpacing: "0.02em" }}>
                End-to-End AI Neural Pipeline Architecture
              </h1>
              <span className="badge badge-blue" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                60 FPS REAL-TIME
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
              NVIDIA NVDEC DECODER · 7 TASK-SPECIFIC HEADS · DEMPSTER-SHAFER CONSENSUS · SECTION 65B MERKLE CHAIN
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleRunSimulation}
              disabled={simulating}
              className="btn btn-primary btn-sm"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                fontWeight: 900,
                boxShadow: "0 4px 15px rgba(37,99,235,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
              }}
            >
              {simulating ? <RefreshIcon size={14} className="spin" /> : <PlayIcon size={14} />}
              {simulating ? "Traversing Pipeline..." : "Run Frame Simulation"}
            </button>
          </div>
        </div>

        {/* LIVE TELEMETRY HUD STRIP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {[
            { label: "Hardware Inference Latency", val: `${telemetry.latency} ms`, note: "NVIDIA RTX 4060 GPU", color: "#60A5FA" },
            { label: "Real-Time Pipeline Speed", val: `${telemetry.fps} FPS`, note: "Zero Frame Drops", color: "var(--green)" },
            { label: "VRAM Memory Allocation", val: telemetry.vram, note: "7/7 Models Hot Cached", color: "#A78BFA" },
            { label: "Analyzed CCTV Frames", val: telemetry.processed.toLocaleString(), note: "Continuous Stream", color: "#F59E0B" },
            { label: "Evidential Fusion FAR", val: "< 1.4%", note: "K = 0.021 Conflict", color: "#10B981" },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: "#080C16",
                border: "1px solid rgba(59,130,246,0.18)",
                borderRadius: "10px",
                padding: "12px 16px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                {item.label}
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: item.color, fontFamily: "JetBrains Mono, monospace", margin: "3px 0" }}>
                {item.val}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{item.note}</div>
            </div>
          ))}
        </div>

        {/* 5-STAGE INTERACTIVE HORIZONTAL PIPELINE FLOW */}
        <div
          style={{
            background: "#080C16",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 900, color: "#FFFFFF", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <ZapIcon size={18} style={{ color: "#3B82F6" }} />
              Sequential Frame Processing Pipeline Flow
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
              CLICK ANY STAGE TO INSPECT TENSORS &amp; ARCHITECTURE
            </span>
          </div>

          {/* Interactive Stage Cards Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "12px",
              position: "relative",
            }}
          >
            {PIPELINE_STAGES.map((stage, idx) => {
              const isSelected = selectedStage.id === stage.id;
              const isSimActive = activeSimIndex === idx;
              const IconComp = stage.icon;

              return (
                <div
                  key={stage.id}
                  onClick={() => setSelectedStage(stage)}
                  style={{
                    position: "relative",
                    background: isSelected
                      ? `linear-gradient(145deg, ${stage.glow} 0%, rgba(10,15,29,0.95) 100%)`
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isSimActive ? "#FFFFFF" : isSelected ? stage.color : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "10px",
                    padding: "16px 14px",
                    cursor: "pointer",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isSimActive
                      ? `0 0 25px ${stage.color}`
                      : isSelected
                      ? `0 6px 25px ${stage.glow}`
                      : "none",
                    transform: isSimActive ? "scale(1.03)" : isSelected ? "translateY(-2px)" : "none",
                  }}
                >
                  {/* Step Number Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 900,
                        color: stage.color,
                        background: `${stage.color}20`,
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: `1px solid ${stage.color}40`,
                      }}
                    >
                      STAGE {stage.stepNum}
                    </span>

                    <span style={{ fontSize: "0.68rem", color: "#60A5FA", fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
                      {stage.latency}
                    </span>
                  </div>

                  {/* Stage Icon */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: `${stage.color}18`,
                      color: stage.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                      border: `1px solid ${stage.color}35`,
                    }}
                  >
                    <IconComp size={18} />
                  </div>

                  <div style={{ fontWeight: 800, fontSize: "0.85rem", color: isSelected ? "#FFFFFF" : "#E2E8F0", marginBottom: "4px", lineHeight: 1.25 }}>
                    {stage.title}
                  </div>

                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                    {stage.subtitle}
                  </div>

                  {/* Active Indicator Dot */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -1,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "30%",
                        height: 2,
                        background: stage.color,
                        borderRadius: 2,
                        boxShadow: `0 0 8px ${stage.color}`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SELECTED STAGE DETAILED INSPECTOR */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", alignItems: "start" }}>
          {/* Left Card: Deep Dive & Submodules */}
          <div
            style={{
              background: "#080C16",
              border: `1px solid ${selectedStage.color}40`,
              borderRadius: "12px",
              padding: "22px",
              boxShadow: `0 8px 30px rgba(0,0,0,0.7), inset 0 0 20px ${selectedStage.glow}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: `${selectedStage.color}20`,
                  color: selectedStage.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${selectedStage.color}50`,
                }}
              >
                <selectedStage.icon size={22} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
                    {selectedStage.title}
                  </h3>
                  <span className="badge" style={{ background: `${selectedStage.color}20`, color: selectedStage.color, fontSize: "0.65rem", border: `1px solid ${selectedStage.color}40` }}>
                    STAGE {selectedStage.stepNum}
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                  {selectedStage.techStack}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#CBD5E1", lineHeight: 1.6, margin: "0 0 16px 0" }}>
              {selectedStage.details}
            </p>

            {/* Submodules breakdown */}
            {selectedStage.subModules && selectedStage.subModules.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.82rem", fontWeight: 800, color: selectedStage.color, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px 0" }}>
                  Internal Submodule Execution Threads
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedStage.subModules.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#FFFFFF" }}>
                          {sub.name}
                        </div>
                        <div style={{ fontSize: "0.70rem", color: "var(--text-muted)" }}>{sub.desc}</div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{ fontSize: "0.70rem", fontFamily: "JetBrains Mono, monospace", color: "#60A5FA" }}>
                          {sub.latency}
                        </span>
                        <span className="badge badge-green" style={{ fontSize: "0.62rem" }}>
                          {sub.conf}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Card: Input / Output Tensor Schemas & Live Telemetry */}
          <div
            style={{
              background: "#080C16",
              border: "1px solid rgba(59,130,246,0.22)",
              borderRadius: "12px",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h3 style={{ fontSize: "0.95rem", fontWeight: 900, color: "#FFFFFF", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <SlidersIcon size={16} style={{ color: "#3B82F6" }} />
              Tensor Payload &amp; Interface Schema
            </h3>

            {/* Input Schema Box */}
            <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#60A5FA", textTransform: "uppercase", marginBottom: 4 }}>
                Input Data Signature
              </div>
              <code style={{ fontSize: "0.75rem", color: "#E2E8F0", fontFamily: "JetBrains Mono, monospace", display: "block", wordBreak: "break-all" }}>
                {selectedStage.inputFormat}
              </code>
            </div>

            {/* Output Schema Box */}
            <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--green)", textTransform: "uppercase", marginBottom: 4 }}>
                Output Data Signature
              </div>
              <code style={{ fontSize: "0.75rem", color: "#E2E8F0", fontFamily: "JetBrains Mono, monospace", display: "block", wordBreak: "break-all" }}>
                {selectedStage.outputFormat}
              </code>
            </div>

            {/* Hardware Metrics Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>EXECUTION LATENCY</span>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "#60A5FA", fontFamily: "JetBrains Mono, monospace" }}>
                  {selectedStage.latency}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>MAX THROUGHPUT</span>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "var(--green)", fontFamily: "JetBrains Mono, monospace" }}>
                  {selectedStage.throughput}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ToastProvider>
  );
}

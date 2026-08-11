"use client";

import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { LockIcon, ShieldIcon, FileTextIcon, CheckIcon, CloseIcon, CameraIcon, SearchIcon, ActivityIcon, SignalIcon, PackageIcon, TrashIcon, DownloadIcon } from "@/components/Icons";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "ai" | "ai_models" | "network" | "forensic" | "security">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state matching the backend default schema
  const [settings, setSettings] = useState<any>({
    general: {
      node_id: "SV-EDGE-NODE-01",
      node_name: "SentinelVision Main Controller",
      disk_usage_limit_gb: 100,
      auto_pruning: true,
      log_retention_days: 30
    },
    network: {
      discovery_subnet: "192.168.1",
      discovery_timeout_seconds: 1.5,
      multicast_discovery: true,
      ports_to_scan: [554, 8554, 8080, 80],
      default_username: "admin",
      default_password: "admin"
    },
    ai: {
      yolo_conf_threshold: 0.40,
      facenet_similarity_threshold: 0.65,
      lpr_levenshtein_distance: 2,
      frame_sample_fps: 1.0,
      max_concurrent_jobs: 2,
      device_provider: "CPU",
      cuda_device_index: 0
    },
    ai_models: {
      active_object_model: "yolov8n",
      active_face_model: "facenet",
      models: [
        {
          id: "yolov8n",
          name: "YOLOv8 Nano (Default COCO)",
          type: "object_detection",
          file_path: "yolov8n.pt",
          download_url: "",
          is_custom: false,
          classes: []
        },
        {
          id: "facenet",
          name: "FaceNet ONNX (Default Face)",
          type: "face_recognition",
          file_path: "facenet.onnx",
          download_url: "",
          is_custom: false,
          classes: []
        }
      ]
    },
    forensic: {
      pdf_hash_algorithm: "SHA-256",
      default_investigator: "System Admin",
      default_department: "Cyber Forensics Unit",
      sign_reports: true,
      nvr_sync_logging: true
    },
    security: {
      session_timeout_minutes: 60,
      enforce_mfa_all_admins: false,
      password_complexity: "medium"
    }
  });

  // MFA & PDF state variables (preserved from original settings page)
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model management helpers
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [downloadType, setDownloadType] = useState("object_detection");
  const [downloading, setDownloading] = useState(false);

  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("object_detection");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  // GPU device enumeration state
  const [gpuDevices, setGpuDevices] = useState<any[]>([]);
  const [gpuLoading, setGpuLoading] = useState(false);

  const refetchSettings = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivateModel = async (modelId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/settings/models/activate/${modelId}`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to activate model");
      showToast("Model activated successfully!", "success");
      await refetchSettings();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this custom model and delete its weights file from disk?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/settings/models/${modelId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete model");
      showToast("Model deleted and cleaned from disk successfully!", "success");
      await refetchSettings();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDownloadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl) return showToast("Please provide a valid download URL", "info");
    if (!downloadName) return showToast("Please provide a model name", "info");
    setDownloading(true);
    try {
      const res = await fetch("http://localhost:8000/api/settings/models/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl, name: downloadName, type: downloadType })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Download failed");
      }
      showToast(`Model '${downloadName}' downloaded and registered!`, "success");
      setDownloadUrl("");
      setDownloadName("");
      await refetchSettings();
    } catch (err: any) {
      showToast(err.message || "Failed to download model", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName) return showToast("Please provide a model name", "info");
    if (!uploadFile) return showToast("Please select a weights file", "info");
    
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("name", uploadName);
      fd.append("type", uploadType);
      fd.append("file", uploadFile);
      
      const res = await fetch("http://localhost:8000/api/settings/models/upload", {
        method: "POST",
        body: fd
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Upload failed");
      }
      showToast(`Model '${uploadName}' uploaded and registered!`, "success");
      setUploadName("");
      setUploadFile(null);
      if (modelFileInputRef.current) modelFileInputRef.current.value = "";
      await refetchSettings();
    } catch (err: any) {
      showToast(err.message || "Failed to upload model", "error");
    } finally {
      setUploading(false);
    }
  };

  // Fetch settings from API on load
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("http://localhost:8000/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        } else {
          showToast("Failed to fetch custom settings, using defaults.", "info");
        }
      } catch (err) {
        showToast("Error connecting to backend for settings", "error");
      } finally {
        setLoading(false);
      }
    }
    async function fetchGpuInfo() {
      setGpuLoading(true);
      try {
        const res = await fetch("http://localhost:8000/api/settings/gpu-info");
        if (res.ok) {
          const data = await res.json();
          setGpuDevices(data.devices || []);
        }
      } catch (err) {
        // Not fatal — GPU list just won't show
      } finally {
        setGpuLoading(false);
      }
    }
    fetchSettings();
    fetchGpuInfo();
  }, []);

  // Save settings via POST
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const data = await res.json();
      setSettings(data.settings);
      showToast("Configuration saved successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  // State mutation helper
  const updateSetting = (section: keyof typeof settings, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // MFA enrollment handler
  const handleEnrollMfa = async () => {
    setEnrolling(true);
    try {
      const token = localStorage.getItem("visioncctv_token");
      const res = await fetch("http://localhost:8000/api/auth/mfa/enroll", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to enroll in MFA");
      const data = await res.json();
      setMfaSecret(data.secret);
      showToast("MFA Enrollment started!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setEnrolling(false);
    }
  };

  // PDF verification triggers
  const handleVerifyUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleVerifyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifying(true);
    setVerifyResult(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/export/verify", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerifyResult(data);
      if (data.verified) {
        showToast("Report signature verified successfully!", "success");
      } else {
        showToast("Report verification failed", "error");
      }
    } catch (err: any) {
      showToast("Failed to verify PDF report", "error");
    } finally {
      setVerifying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <ToastProvider>
      <AppLayout>
        {/* Title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>System Settings &amp; Compliance</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>Configure offline edge AI parameters, local network scanner profiles, security mechanisms, and compliance logs.</p>
        </div>

        {/* Tab Headers */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", marginBottom: "24px", paddingBottom: "2px" }}>
          {[
            { id: "general", label: "General & Storage", Icon: ActivityIcon },
            { id: "ai", label: "AI Calibration", Icon: SignalIcon },
            { id: "ai_models", label: "AI Models Manager", Icon: PackageIcon },
            { id: "network", label: "LAN & CCTV Discovery", Icon: CameraIcon },
            { id: "forensic", label: "Forensic Integrity", Icon: ShieldIcon },
            { id: "security", label: "Security & MFA", Icon: LockIcon },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px 8px 0 0",
                  border: "none",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  background: isActive ? "var(--bg-card)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  transition: "var(--transition)",
                }}
              >
                <tab.Icon size={14} style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Settings Form */}
        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "20px 0" }}>Loading system configuration...</div>
        ) : (
          <form onSubmit={handleSaveSettings}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
              
              {/* General tab */}
              {activeTab === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <ActivityIcon size={20} style={{ color: "var(--accent)" }} /> Edge Node &amp; Ingestion Storage
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>Configure name details and local data limits for your offline field-officer edge workstation.</p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Edge Node ID</label>
                      <input className="input-field" value={settings.general.node_id} onChange={(e) => updateSetting("general", "node_id", e.target.value)} required />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Node Station Name</label>
                      <input className="input-field" value={settings.general.node_name} onChange={(e) => updateSetting("general", "node_name", e.target.value)} required />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Disk Storage Clean-Up Limit (GB)</label>
                      <input className="input-field" type="number" min={5} value={settings.general.disk_usage_limit_gb} onChange={(e) => updateSetting("general", "disk_usage_limit_gb", Number(e.target.value))} required />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Log Retention Audit Trail (Days)</label>
                      <input className="input-field" type="number" min={1} value={settings.general.log_retention_days} onChange={(e) => updateSetting("general", "log_retention_days", Number(e.target.value))} required />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                    <input
                      type="checkbox"
                      id="auto_pruning"
                      checked={settings.general.auto_pruning}
                      onChange={(e) => updateSetting("general", "auto_pruning", e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                    />
                    <label htmlFor="auto_pruning" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                      Enable auto-pruning (Delete oldest CCTV uploads when local storage usage surpasses the clean-up limit)
                    </label>
                  </div>
                </div>
              )}

              {/* AI tab */}
              {activeTab === "ai" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <SignalIcon size={20} style={{ color: "var(--accent)" }} /> AI Analytics Engine Calibration
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>Calibrate local machine learning inference parameters for face matching, YOLO object classification, and license plate matching.</p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">YOLOv8 Default Object Confidence Limit: {(settings.ai.yolo_conf_threshold * 100).toFixed(0)}%</label>
                      <input type="range" min={0.1} max={0.9} step={0.05} value={settings.ai.yolo_conf_threshold} onChange={(e) => updateSetting("ai", "yolo_conf_threshold", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Lower values catch more objects but raise false warnings.</span>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Face Re-ID Similarity Tolerance: {(settings.ai.facenet_similarity_threshold * 100).toFixed(0)}%</label>
                      <input type="range" min={0.3} max={0.95} step={0.05} value={settings.ai.facenet_similarity_threshold} onChange={(e) => updateSetting("ai", "facenet_similarity_threshold", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Cosine similarity limit for matching target profiles.</span>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">License Plate (LPR) Levenshtein Character Mismatch Tolerance</label>
                      <input className="input-field" type="number" min={0} max={5} value={settings.ai.lpr_levenshtein_distance} onChange={(e) => updateSetting("ai", "lpr_levenshtein_distance", Number(e.target.value))} required />
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Maximum character edit distance allowed to declare partial match.</span>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Video Search Frame Ingestion Skip Rate (Sample FPS)</label>
                      <input className="input-field" type="number" min={0.1} max={10} step={0.1} value={settings.ai.frame_sample_fps} onChange={(e) => updateSetting("ai", "frame_sample_fps", Number(e.target.value))} required />
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Frames evaluated per second (e.g. 1.0 = analyze 1 frame per second).</span>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Maximum Concurrent AI Search Jobs</label>
                      <input className="input-field" type="number" min={1} max={4} value={settings.ai.max_concurrent_jobs} onChange={(e) => updateSetting("ai", "max_concurrent_jobs", Number(e.target.value))} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                      <label className="input-label" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.9rem" }}>⚡</span> AI Inference Hardware — Select Compute Device
                      </label>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 12px 0" }}>
                        Choose which processor runs all AI models (YOLO, FaceNet, LPR). Select your dedicated NVIDIA GPU for maximum speed.
                      </p>

                      {gpuLoading ? (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "12px 0" }}>🔍 Enumerating compute devices...</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(gpuDevices.length > 0 ? gpuDevices : [
                            { index: -1, name: "CPU (no GPU acceleration)", vram_total_mb: 0, vram_free_mb: 0, is_cuda: false }
                          ]).map((dev: any) => {
                            const isCudaDevice = dev.is_cuda;
                            const isSelected = isCudaDevice
                              ? settings.ai.device_provider === "CUDA" && settings.ai.cuda_device_index === dev.index
                              : settings.ai.device_provider === "CPU";
                            const vramPct = dev.vram_total_mb > 0 ? Math.round((dev.vram_free_mb / dev.vram_total_mb) * 100) : 0;

                            return (
                              <div
                                key={dev.index}
                                onClick={() => {
                                  if (isCudaDevice) {
                                    updateSetting("ai", "device_provider", "CUDA");
                                    updateSetting("ai", "cuda_device_index", dev.index);
                                  } else {
                                    updateSetting("ai", "device_provider", "CPU");
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "16px",
                                  padding: "14px 18px",
                                  borderRadius: "10px",
                                  border: isSelected
                                    ? isCudaDevice ? "2px solid var(--accent)" : "2px solid var(--accent)"
                                    : "1px solid var(--border)",
                                  background: isSelected
                                    ? isCudaDevice ? "rgba(59,130,246,0.07)" : "rgba(34,197,94,0.05)"
                                    : "var(--bg-elevated)",
                                  cursor: "pointer",
                                  transition: "all 0.18s ease",
                                  boxShadow: isSelected ? (isCudaDevice ? "0 0 18px rgba(59,130,246,0.12)" : "0 0 14px rgba(34,197,94,0.08)") : "none",
                                }}
                              >
                                {/* Device Icon */}
                                <div style={{
                                  width: "44px", height: "44px", borderRadius: "10px",
                                  background: isCudaDevice ? "rgba(59,130,246,0.12)" : "rgba(160,160,160,0.1)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "1.4rem", flexShrink: 0
                                }}>
                                  {isCudaDevice ? "🎮" : "🖥️"}
                                </div>

                                {/* Device Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {dev.name}
                                    </span>
                                    {isCudaDevice && (
                                      <span style={{ fontSize: "0.65rem", background: "rgba(59,130,246,0.15)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "4px", padding: "1px 6px", fontWeight: 700, flexShrink: 0 }}>CUDA</span>
                                    )}
                                    {isSelected && (
                                      <span style={{ fontSize: "0.65rem", background: isCudaDevice ? "rgba(59,130,246,0.2)" : "rgba(34,197,94,0.15)", color: isCudaDevice ? "var(--accent)" : "var(--green)", border: `1px solid ${isCudaDevice ? "rgba(59,130,246,0.4)" : "rgba(34,197,94,0.3)"}`, borderRadius: "4px", padding: "1px 8px", fontWeight: 700, flexShrink: 0 }}>🟢 Active</span>
                                    )}
                                  </div>

                                  {isCudaDevice && dev.vram_total_mb > 0 ? (
                                    <div>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                                        <span>VRAM: {dev.vram_free_mb} MB free of {dev.vram_total_mb} MB</span>
                                        <span style={{ color: vramPct > 60 ? "var(--green)" : vramPct > 30 ? "#f59e0b" : "#ef4444" }}>{vramPct}% free</span>
                                      </div>
                                      <div style={{ height: "5px", background: "var(--bg-card)", borderRadius: "3px", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${vramPct}%`, background: vramPct > 60 ? "var(--green)" : vramPct > 30 ? "#f59e0b" : "#ef4444", borderRadius: "3px", transition: "width 0.3s ease" }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                      {isCudaDevice ? "Querying VRAM..." : "System RAM — slower inference, no VRAM required"}
                                    </span>
                                  )}
                                </div>

                                {/* Radio dot */}
                                <div style={{
                                  width: "18px", height: "18px", borderRadius: "50%",
                                  border: `2px solid ${isSelected ? (isCudaDevice ? "var(--accent)" : "var(--accent)") : "var(--border)"}`,
                                  background: isSelected ? (isCudaDevice ? "var(--accent)" : "var(--accent)") : "transparent",
                                  flexShrink: 0, transition: "all 0.18s ease"
                                }} />
                              </div>
                            );
                          })}

                          {/* RTX performance tip */}
                          {settings.ai.device_provider === "CUDA" && (
                            <div style={{ padding: "10px 14px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "8px", fontSize: "0.78rem", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚡</span>
                              <span><strong style={{ color: "var(--accent)" }}>GPU acceleration active.</strong> YOLO, FaceNet, and LPR inference will run on your dedicated GPU — expect 5–15× faster analysis compared to CPU mode. Make sure your PyTorch installation includes CUDA support.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Network tab */}
              {activeTab === "network" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <CameraIcon size={20} style={{ color: "var(--accent)" }} /> LAN Scan &amp; NVR Default Parameters
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>Adjust auto-discovery ranges, subnet scopes, and scanning details for local Ethernet IP streams.</p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Default Subnet prefix to Scan</label>
                      <input className="input-field" placeholder="e.g. 192.168.1" value={settings.network.discovery_subnet} onChange={(e) => updateSetting("network", "discovery_subnet", e.target.value)} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Probing Timeout per IP Address (Seconds)</label>
                      <input className="input-field" type="number" min={0.1} max={5} step={0.1} value={settings.network.discovery_timeout_seconds} onChange={(e) => updateSetting("network", "discovery_timeout_seconds", Number(e.target.value))} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Default IP Camera Username</label>
                      <input className="input-field" value={settings.network.default_username} onChange={(e) => updateSetting("network", "default_username", e.target.value)} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Default IP Camera Password</label>
                      <input className="input-field" type="password" value={settings.network.default_password} onChange={(e) => updateSetting("network", "default_password", e.target.value)} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                      <label className="input-label">Ports scanned during auto-discovery (separated by comma)</label>
                      <input
                        className="input-field"
                        value={settings.network.ports_to_scan.join(", ")}
                        onChange={(e) => {
                          const ports = e.target.value.split(",").map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                          updateSetting("network", "ports_to_scan", ports);
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                    <input
                      type="checkbox"
                      id="multicast_discovery"
                      checked={settings.network.multicast_discovery}
                      onChange={(e) => updateSetting("network", "multicast_discovery", e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                    />
                    <label htmlFor="multicast_discovery" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                      Enable background ONVIF WS-Discovery (Probe local switches using SOAP multicast queries)
                    </label>
                  </div>
                </div>
              )}

              {/* Forensic tab */}
              {activeTab === "forensic" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <ShieldIcon size={20} style={{ color: "var(--accent)" }} /> Courtroom Admissibility &amp; Signatures
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>Configure signature seals, database integrity checks, and PDF details to secure chains of custody.</p>
                    
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Default Case Investigator Name</label>
                      <input className="input-field" value={settings.forensic.default_investigator} onChange={(e) => updateSetting("forensic", "default_investigator", e.target.value)} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Operating Department Agency</label>
                      <input className="input-field" value={settings.forensic.default_department} onChange={(e) => updateSetting("forensic", "default_department", e.target.value)} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">PDF Cryptographic Signature Hash</label>
                      <select className="input-field" value={settings.forensic.pdf_hash_algorithm} onChange={(e) => updateSetting("forensic", "pdf_hash_algorithm", e.target.value)}>
                        <option value="SHA-256">SHA-256 Secure Hash Standard (Recommended)</option>
                        <option value="SHA-512">SHA-512 High-Security Hash</option>
                        <option value="MD5">MD5 Legal Legacy Hash</option>
                        <option value="SHA-256+MD5">Dual Signature (SHA-256 &amp; MD5)</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="checkbox"
                          id="sign_reports"
                          checked={settings.forensic.sign_reports}
                          onChange={(e) => updateSetting("forensic", "sign_reports", e.target.checked)}
                          style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                        />
                        <label htmlFor="sign_reports" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                          Embed electronic cryptographically signed checksum inside exported PDFs
                        </label>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="checkbox"
                          id="nvr_sync_logging"
                          checked={settings.forensic.nvr_sync_logging}
                          onChange={(e) => updateSetting("forensic", "nvr_sync_logging", e.target.checked)}
                          style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                        />
                        <label htmlFor="nvr_sync_logging" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                          Record NVR connection disruptions to the immutable SQLite audit catalog
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Forensic PDF Verification (Preserved Component) */}
                  <div style={{ padding: "20px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                    <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, margin: "0 0 10px 0" }}>Forensic Report Verification Tool</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.5, marginBottom: "16px" }}>
                      Submit any signed SentinelVision PDF report to verify its internal cryptographic seal against the VMS database.
                    </p>

                    <div 
                      onClick={handleVerifyUploadClick}
                      style={{ border: "2px dashed var(--border)", borderRadius: "8px", padding: "24px 16px", textAlign: "center", cursor: "pointer", background: "var(--bg-card)", transition: "var(--transition)" }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                    >
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                        <FileTextIcon size={28} style={{ color: "var(--accent)" }} />
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                        {verifying ? "Computing PDF signature..." : "Click to select PDF report"}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="application/pdf" 
                      onChange={handleVerifyFileChange}
                      style={{ display: "none" }}
                    />

                    {verifyResult && (
                      <div 
                        style={{ 
                          marginTop: "16px", 
                          padding: "12px", 
                          borderRadius: "6px", 
                          border: `1px solid ${verifyResult.verified ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`, 
                          background: verifyResult.verified ? "rgba(74,222,128,0.05)" : "rgba(239,68,68,0.05)",
                          fontSize: "0.78rem"
                        }}
                      >
                        {verifyResult.verified ? (
                          <div>
                            <h4 style={{ color: "var(--green)", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 4 }}>
                              <CheckIcon size={14} /> Seal Verified
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "var(--text-secondary)" }}>
                              <div>Case Ref: <strong>{verifyResult.case_number}</strong></div>
                              <div>Title: <strong>{verifyResult.case_title}</strong></div>
                              <div>Investigator: <strong>{verifyResult.generated_by}</strong></div>
                              <div style={{ wordBreak: "break-all", fontSize: "0.65rem", color: "var(--text-muted)" }}>Hash: {verifyResult.hash}</div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h4 style={{ color: "#EF4444", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 4 }}>
                              <CloseIcon size={14} /> Verification Failed
                            </h4>
                            <p style={{ margin: "0 0 4px 0" }}>{verifyResult.message}</p>
                            <div style={{ wordBreak: "break-all", fontSize: "0.65rem", color: "var(--text-muted)" }}>Hash: {verifyResult.hash}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security & MFA tab */}
              {activeTab === "security" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <LockIcon size={20} style={{ color: "var(--accent)" }} /> Session Access &amp; Protection
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>Configure system authentication policies, timeouts, and password parameters.</p>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Operator Session Auto-Timeout (Minutes)</label>
                      <input className="input-field" type="number" min={5} max={1440} value={settings.security.session_timeout_minutes} onChange={(e) => updateSetting("security", "session_timeout_minutes", Number(e.target.value))} required />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Enforced Password Complexity Policy</label>
                      <select className="input-field" value={settings.security.password_complexity} onChange={(e) => updateSetting("security", "password_complexity", e.target.value)}>
                        <option value="low">Low (Min 4 chars, no format check)</option>
                        <option value="medium">Medium (Min 6 chars, alphanumeric)</option>
                        <option value="high">High (Min 8 chars, mixed case + symbols)</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                      <input
                        type="checkbox"
                        id="enforce_mfa"
                        checked={settings.security.enforce_mfa_all_admins}
                        onChange={(e) => updateSetting("security", "enforce_mfa_all_admins", e.target.checked)}
                        style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                      />
                      <label htmlFor="enforce_mfa" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                        Force MFA setup on next login for all investigators and administrative logs
                      </label>
                    </div>
                  </div>

                  {/* Multi-Factor Authentication (Preserved Component) */}
                  <div style={{ padding: "20px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                    <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, margin: "0 0 10px 0" }}>Enroll in Multi-Factor Authentication (MFA)</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.5, marginBottom: "16px" }}>
                      Enable Time-based One-Time Passwords (TOTP) to protect critical evidence databases from unauthorized credential access.
                    </p>

                    {!mfaSecret ? (
                      <button
                        type="button"
                        onClick={handleEnrollMfa}
                        disabled={enrolling}
                        style={{ background: "var(--accent)", color: "#000000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: "bold", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        {enrolling ? "Connecting to MFA daemon..." : "Generate TOTP Secret"}
                      </button>
                    ) : (
                      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px" }}>
                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "bold", marginBottom: "4px" }}>
                          MFA TOTP Secret Key
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                          <code style={{ background: "#000000", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: "4px", color: "var(--accent)", fontSize: "0.95rem", fontWeight: "bold", flex: 1, textAlign: "center" }}>
                            {mfaSecret}
                          </code>
                          <button
                            type="button"
                            onClick={() => { if (mfaSecret) { navigator.clipboard.writeText(mfaSecret); showToast("Key copied to clipboard", "success"); }}}
                            style={{ background: "transparent", color: "var(--text-secondary)", border: "none", cursor: "pointer" }}
                            title="Copy Secret"
                          >
                            <FileTextIcon size={14} />
                          </button>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          <p style={{ margin: "0 0 4px 0" }}><strong>Setup Steps:</strong></p>
                          <ol style={{ paddingLeft: "14px", margin: 0 }}>
                            <li>Add an account manually in your TOTP app.</li>
                            <li>Enter the secret key generated above.</li>
                            <li>Use code generated on your app during verification.</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Models Manager tab */}
              {activeTab === "ai_models" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <PackageIcon size={20} style={{ color: "var(--accent)" }} /> Custom &amp; Downloaded AI Models
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>
                      Manage, download, and activate custom object detection, face recognition, or anomaly detection models.
                    </p>
                  </div>

                  {/* Active Models Summary Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ padding: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>Active Object Detection Model</span>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--accent)", margin: "4px 0 8px 0" }}>
                        {settings.ai_models?.models?.find((m: any) => m.id === settings.ai_models?.active_object_model)?.name || "YOLOv8 Nano (Default)"}
                      </h3>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        File Path: <code style={{ color: "var(--accent)" }}>{settings.ai_models?.models?.find((m: any) => m.id === settings.ai_models?.active_object_model)?.file_path || "yolov8n.pt"}</code>
                      </div>
                    </div>

                    <div style={{ padding: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>Active Face Recognition Model</span>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--accent)", margin: "4px 0 8px 0" }}>
                        {settings.ai_models?.models?.find((m: any) => m.id === settings.ai_models?.active_face_model)?.name || "FaceNet ONNX (Default)"}
                      </h3>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        File Path: <code style={{ color: "var(--accent)" }}>{settings.ai_models?.models?.find((m: any) => m.id === settings.ai_models?.active_face_model)?.file_path || "facenet.onnx"}</code>
                      </div>
                    </div>
                  </div>

                  {/* Model Registry List */}
                  <div>
                    <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>Registered Models Directory</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                            <th style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)" }}>Model Name</th>
                            <th style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)" }}>Type</th>
                            <th style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)" }}>Source</th>
                            <th style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)" }}>Local File Path</th>
                            <th style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)" }}>Detected Classes</th>
                            <th style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settings.ai_models?.models?.map((model: any) => {
                            const isActive = settings.ai_models.active_object_model === model.id || settings.ai_models.active_face_model === model.id;
                            return (
                              <tr key={model.id} style={{ borderBottom: "1px solid var(--border)", transition: "var(--transition)" }}>
                                <td style={{ padding: "12px 10px", fontWeight: "600", color: "var(--text-primary)" }}>{model.name}</td>
                                <td style={{ padding: "12px 10px" }}>
                                  <span style={{ padding: "2px 6px", borderRadius: "4px", background: "var(--bg-elevated)", fontSize: "0.75rem", border: "1px solid var(--border)" }}>
                                    {model.type === "object_detection" ? "Object Detection" : model.type === "face_recognition" ? "Face Recognition" : model.type === "anomaly_detection" ? "Anomaly Detection" : "Other"}
                                  </span>
                                </td>
                                <td style={{ padding: "12px 10px" }}>
                                  <span style={{ color: model.is_custom ? "var(--accent)" : "var(--text-muted)" }}>
                                    {model.is_custom ? (model.download_url === "uploaded" ? "Local Upload" : "Downloaded URL") : "Built-in"}
                                  </span>
                                </td>
                                <td style={{ padding: "12px 10px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>{model.file_path}</td>
                                <td style={{ padding: "12px 10px" }}>
                                  {model.classes && model.classes.length > 0 ? (
                                    <div style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={model.classes.join(", ")}>
                                      {model.classes.join(", ")}
                                    </div>
                                  ) : (
                                    <em style={{ color: "var(--text-muted)" }}>None/Dynamic</em>
                                  )}
                                </td>
                                <td style={{ padding: "12px 10px", textAlign: "right" }}>
                                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                    {!isActive ? (
                                      <button
                                        type="button"
                                        onClick={() => handleActivateModel(model.id)}
                                        style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: "4px", padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Activate
                                      </button>
                                    ) : (
                                      <span style={{ color: "var(--green)", fontWeight: "bold", fontSize: "0.75rem", padding: "4px 10px" }}>Active</span>
                                    )}
                                    {model.is_custom && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteModel(model.id)}
                                        style={{ background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}
                                        title="Delete model and weights"
                                      >
                                        <TrashIcon size={12} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Model Panel (Two Forms) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "12px" }}>
                    
                    {/* URL Download Form */}
                    <div style={{ padding: "20px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                      <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                        <DownloadIcon size={16} style={{ color: "var(--accent)" }} /> Download Model from Internet
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Model Custom Name</label>
                          <input className="input-field" placeholder="e.g. Weapon Detector v8" value={downloadName} onChange={(e) => setDownloadName(e.target.value)} disabled={downloading} />
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Model Type</label>
                          <select className="input-field" value={downloadType} onChange={(e) => setDownloadType(e.target.value)} disabled={downloading}>
                            <option value="object_detection">Object Detection (YOLOv8 format)</option>
                            <option value="face_recognition">Face Recognition (ONNX/PyTorch format)</option>
                            <option value="anomaly_detection">Anomaly Detection</option>
                            <option value="other">Other AI Model</option>
                          </select>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Weights Download URL (Direct Link)</label>
                          <input className="input-field" placeholder="https://huggingface.co/.../model.pt" value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} disabled={downloading} />
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Supports weights files ending in .pt, .onnx, .bin, or .weights</span>
                        </div>

                        <button
                          type="button"
                          onClick={handleDownloadModel}
                          disabled={downloading}
                          style={{
                            background: "var(--accent)",
                            color: "#000000",
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 20px",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            marginTop: "8px",
                            alignSelf: "flex-start",
                            transition: "var(--transition)"
                          }}
                        >
                          {downloading ? "Downloading weights file..." : "Download & Register"}
                        </button>
                      </div>
                    </div>

                    {/* Local File Upload Form */}
                    <div style={{ padding: "20px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                      <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                        <PackageIcon size={16} style={{ color: "var(--accent)" }} /> Upload Local Weights File
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Model Custom Name</label>
                          <input className="input-field" placeholder="e.g. License Plate Model" value={uploadName} onChange={(e) => setUploadName(e.target.value)} disabled={uploading} />
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Model Type</label>
                          <select className="input-field" value={uploadType} onChange={(e) => setUploadType(e.target.value)} disabled={uploading}>
                            <option value="object_detection">Object Detection (YOLOv8 format)</option>
                            <option value="face_recognition">Face Recognition (ONNX/PyTorch format)</option>
                            <option value="anomaly_detection">Anomaly Detection</option>
                            <option value="other">Other AI Model</option>
                          </select>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Select Weights File (.pt, .onnx, .bin)</label>
                          <input
                            type="file"
                            ref={modelFileInputRef}
                            className="input-field"
                            style={{ padding: "6px 12px" }}
                            accept=".pt,.onnx,.bin,.weights"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            disabled={uploading}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleUploadModel}
                          disabled={uploading}
                          style={{
                            background: "var(--accent)",
                            color: "#000000",
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 20px",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            marginTop: "8px",
                            alignSelf: "flex-start",
                            transition: "var(--transition)"
                          }}
                        >
                          {uploading ? "Uploading weights file..." : "Upload & Register"}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Save Button Row */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "var(--accent)",
                  color: "#000000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 32px",
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.2)",
                  transition: "var(--transition)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
              >
                {saving ? "Saving Changes..." : "Apply Config Options"}
              </button>
            </div>
          </form>
        )}
      </AppLayout>
    </ToastProvider>
  );
}

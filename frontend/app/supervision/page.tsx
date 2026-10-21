"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import {
  ZapIcon,
  CameraIcon,
  ShieldIcon,
  ScienceIcon,
  SearchIcon,
  CheckIcon,
  AlertIcon,
  CloseIcon,
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  TrendingUpIcon,
  SettingsIcon,
  SignalIcon,
  FolderIcon,
  EyeIcon,
  SparklesIcon,
  RefreshIcon,
  ActivityIcon,
  FlameIcon,
  SmokeIcon,
  FallIcon,
  UsersIcon,
  WeaponIcon,
  FaceScanIcon,
  ShieldCheckIcon,
  LockIcon,
  CpuIcon,
  FileTextIcon,
} from "@/components/Icons";

interface SupervisionInfo {
  version: string;
  available_models: Array<{
    id: string;
    name: string;
    description: string;
    supports_prompts: boolean;
    default_prompts: string[];
  }>;
  annotators: Array<{
    id: string;
    name: string;
    type: string;
    options?: string[];
    default: any;
  }>;
  color_palettes: string[];
}

interface DetectionItem {
  index: number;
  class_id: number;
  class_name: string;
  confidence: number;
  tracker_id?: number | null;
  box: number[];
  area: number;
  aspect_ratio: number;
}

interface ZoneStat {
  zone_index: number;
  occupancy_count: number;
  points: number[][];
  is_triggered: boolean;
}

interface BenchmarkItem {
  model_id: string;
  name: string;
  avg_latency_ms: number;
  p95_latency_ms: number;
  fps: number;
  avg_detections_per_frame: number;
  avg_confidence: number;
  map_50: number;
  map_50_95: number;
  f1_score: number;
  error?: string;
}

type ScanModality =
  | "compound_crisis"
  | "threat_weapon"
  | "fall_biomechanics"
  | "fire_smoke"
  | "crowd_stampede"
  | "brawl_violence"
  | "ppe_compliance"
  | "vehicle_lpr"
  | "loitering_restricted"
  | "zero_shot_custom";

const SCAN_MODALITIES: Array<{
  id: ScanModality;
  label: string;
  icon: any;
  defaultModel: string;
  defaultPrompts: string[];
  description: string;
  severity: "P1" | "P2" | "P3" | "P4";
}> = [
  {
    id: "compound_crisis",
    label: "Compound Crisis Fusion",
    icon: ShieldCheckIcon,
    defaultModel: "yolov8s-worldv2",
    defaultPrompts: ["person", "knife", "gun", "fire", "smoke", "backpack", "weapon"],
    description: "Multi-threat consensus scan combining vision, thermal, and sensor triggers",
    severity: "P1",
  },
  {
    id: "threat_weapon",
    label: "Threat & Weapon Scan",
    icon: WeaponIcon,
    defaultModel: "yolov8s-worldv2",
    defaultPrompts: ["knife", "gun", "firearm", "weapon", "scissors", "crowbar", "suspicious bag"],
    description: "Zero-shot bladed weapon, firearm, and tactical threat detection",
    severity: "P1",
  },
  {
    id: "fall_biomechanics",
    label: "Fall & Collapse",
    icon: FallIcon,
    defaultModel: "yolov8n-pose",
    defaultPrompts: ["person in ground", "fallen person", "person lying down"],
    description: "17-keypoint biomechanical skeletal posture & medical collapse detection",
    severity: "P2",
  },
  {
    id: "fire_smoke",
    label: "Fire & Smoke Plume",
    icon: FlameIcon,
    defaultModel: "yolov8s-worldv2",
    defaultPrompts: ["fire", "flame", "smoke", "smoke plume", "fire hazard"],
    description: "Dynamic flame chroma growth and turbulent smoke plume dispersion",
    severity: "P1",
  },
  {
    id: "crowd_stampede",
    label: "Crowd & Stampede Surge",
    icon: UsersIcon,
    defaultModel: "yolov8n",
    defaultPrompts: ["person", "crowd"],
    description: "Spatial headcount density (occupants/m²) & bottleneck stampede analytics",
    severity: "P2",
  },
  {
    id: "brawl_violence",
    label: "Brawl & Violence Kinematics",
    icon: ActivityIcon,
    defaultModel: "yolov8n-pose",
    defaultPrompts: ["person fighting", "physical fight", "brawl"],
    description: "High-velocity limb acceleration & aggressive physical altercation tracking",
    severity: "P1",
  },
  {
    id: "ppe_compliance",
    label: "PPE & Industrial Safety",
    icon: ShieldIcon,
    defaultModel: "yolov8s-worldv2",
    defaultPrompts: ["hard hat", "safety vest", "gloves", "person", "forklift"],
    description: "Occupational safety vest, helmet, and perimeter exclusion compliance",
    severity: "P3",
  },
  {
    id: "vehicle_lpr",
    label: "Vehicle Access & LPR",
    icon: CameraIcon,
    defaultModel: "easyocr",
    defaultPrompts: ["car", "truck", "motorcycle", "bus", "license plate"],
    description: "Vehicle classification, unauthorized parking, and license plate OCR",
    severity: "P3",
  },
  {
    id: "loitering_restricted",
    label: "Restricted Zone Loitering",
    icon: LockIcon,
    defaultModel: "yolov8s-worldv2",
    defaultPrompts: ["person", "intruder"],
    description: "Polygon dwell time tracking and unauthorized perimeter crossing",
    severity: "P2",
  },
  {
    id: "zero_shot_custom",
    label: "Open-Vocabulary Zero-Shot",
    icon: SparklesIcon,
    defaultModel: "yolov8s-worldv2",
    defaultPrompts: ["person", "backpack", "suitcase", "laptop", "cell phone"],
    description: "Custom natural-language prompt engineering for any target classes",
    severity: "P3",
  },
];

const PRESET_ZONES = [
  {
    name: "Perimeter Zone A",
    type: "polygon",
    points: [[150, 120], [600, 120], [600, 520], [150, 520]],
  },
  {
    name: "Lobby Turnstile",
    type: "line",
    points: [[120, 360, 720, 360]],
  },
  {
    name: "Queue / Loading Dock",
    type: "polygon",
    points: [[300, 200], [850, 200], [850, 620], [300, 620]],
  },
  {
    name: "Crosswalk Tripwire",
    type: "line",
    points: [[200, 480, 950, 480]],
  },
];

export default function SupervisionStudioPage() {
  const [info, setInfo] = useState<SupervisionInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"interactive" | "stream" | "batch" | "benchmark" | "emergency_hub" | "forensic">("interactive");

  // Emergency Scan Modality
  const [activeScanModality, setActiveScanModality] = useState<ScanModality>("compound_crisis");
  const [selectedLocation, setSelectedLocation] = useState<string>("Central Hub Terminal A");

  // Model Settings
  const [selectedModel, setSelectedModel] = useState<string>("yolov8s-worldv2");
  const [customClasses, setCustomClasses] = useState<string[]>([
    "person", "backpack", "suitcase", "helmet", "knife", "vehicle", "suspicious bag", "laptop"
  ]);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0.25);
  const [iouThreshold, setIouThreshold] = useState<number>(0.5);
  const [useNms, setUseNms] = useState<boolean>(true);
  const [useNmm, setUseNmm] = useState<boolean>(false);
  const [useSlicing, setUseSlicing] = useState<boolean>(false);
  const [sliceWh, setSliceWh] = useState<number>(640);

  // Annotator Config
  const [boxStyle, setBoxStyle] = useState<string>("round");
  const [halo, setHalo] = useState<boolean>(true);
  const [dot, setDot] = useState<boolean>(false);
  const [triangle, setTriangle] = useState<boolean>(false);
  const [trace, setTrace] = useState<boolean>(true);
  const [heatmap, setHeatmap] = useState<boolean>(false);
  const [percentageBar, setPercentageBar] = useState<boolean>(false);
  const [blur, setBlur] = useState<boolean>(false);
  const [pixelate, setPixelate] = useState<boolean>(false);
  const [labels, setLabels] = useState<boolean>(true);
  const [selectedPalette, setSelectedPalette] = useState<string>("ROBOFLOW");
  const [lineThickness, setLineThickness] = useState<number>(2);
  const [textScale, setTextScale] = useState<number>(0.5);

  // Source selection
  const [videoSource, setVideoSource] = useState<string>("subway.mp4");
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);

  // Interactive ROI drawing
  const [drawMode, setDrawMode] = useState<"none" | "polygon" | "line">("none");
  const [polygonPoints, setPolygonPoints] = useState<number[][]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [savedPolygons, setSavedPolygons] = useState<number[][][]>([
    [[150, 100], [550, 100], [550, 480], [150, 480]]
  ]);
  const [savedLines, setSavedLines] = useState<number[][]>([
    [100, 360, 600, 360]
  ]);

  // Results & Inference State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStat[]>([]);
  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [resolution, setResolution] = useState<number[]>([1280, 720]);
  const [selectedTarget, setSelectedTarget] = useState<DetectionItem | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Emergency Facilities State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [breachAlert, setBreachAlert] = useState<boolean>(false);
  const [solenoidLocked, setSolenoidLocked] = useState<boolean>(false);
  const [paPlaying, setPaPlaying] = useState<boolean>(false);
  const [escalatedIncidents, setEscalatedIncidents] = useState<any[]>([]);
  const [alertLog, setAlertLog] = useState<Array<{ time: string; msg: string; type: "zone" | "line" | "escalation" | "pa" }>>([]);

  // Batch Video Processing State
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [batchVideoUrl, setBatchVideoUrl] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<any>(null);
  const [batchProgress, setBatchProgress] = useState<number>(0);

  // Benchmark State
  const [benchmarkLoading, setBenchmarkLoading] = useState<boolean>(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkItem[]>([]);

  // Stream State
  const [selectedCamera, setSelectedCamera] = useState<string>("CAM-01");
  const [streamTripwireY, setStreamTripwireY] = useState<number>(0.5);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play audio alert tone
  const playAlertTone = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      console.warn("Audio alert error:", e);
    }
  }, [soundEnabled]);

  // Fetch Supervision info & sources on mount
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/supervision/info")
      .then((res) => res.json())
      .then((data) => setInfo(data))
      .catch((err) => console.error("Error fetching Supervision info:", err));

    fetch("http://127.0.0.1:8000/api/supervision/sources")
      .then((res) => res.json())
      .then((data) => {
        if (data.sources) setAvailableSources(data.sources);
      })
      .catch((err) => console.error("Error fetching sources:", err));
  }, []);

  // Handle Modality Switch
  const handleSelectModality = (mod: ScanModality) => {
    setActiveScanModality(mod);
    const modConfig = SCAN_MODALITIES.find((m) => m.id === mod);
    if (modConfig) {
      setSelectedModel(modConfig.defaultModel);
      setCustomClasses(modConfig.defaultPrompts);
      showToast(`Activated ${modConfig.label} scan modality (${modConfig.severity})`, "info");
    }
  };

  // Run image detection
  const runDetection = useCallback(async () => {
    setIsProcessing(true);
    try {
      const payload: any = {
        model_id: selectedModel,
        confidence_threshold: confidence,
        iou_threshold: iouThreshold,
        use_nms: useNms,
        use_nmm: useNmm,
        use_slicing: useSlicing,
        slice_wh: sliceWh,
        annotator_config: {
          box_style: boxStyle,
          halo: halo,
          dot: dot,
          triangle: triangle,
          trace: trace,
          heatmap: heatmap,
          percentage_bar: percentageBar,
          blur: blur,
          pixelate: pixelate,
          labels: labels,
          thickness: lineThickness,
          text_scale: textScale,
        },
        polygon_zones: savedPolygons.length > 0 ? savedPolygons : undefined,
        lines: savedLines.length > 0 ? savedLines : undefined,
      };

      if (selectedModel === "yolov8s-worldv2" && customClasses.length > 0) {
        payload.custom_classes = customClasses;
      }

      if (customImageBase64) {
        payload.image_base64 = customImageBase64;
      } else {
        payload.image_url = `/storage/thumbnails/${videoSource.replace(/\.mp4$/, ".jpg")}`;
      }

      const res = await fetch("http://127.0.0.1:8000/api/supervision/detect-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setProcessedImage(data.image_base64);
        setDetections(data.detections || []);
        setZoneStats(data.polygon_zones || []);
        setInferenceTime(data.inference_time_ms || 0);
        if (data.resolution) setResolution(data.resolution);

        const triggered = (data.polygon_zones || []).some((z: ZoneStat) => z.is_triggered);
        if (triggered) {
          setBreachAlert(true);
          playAlertTone();
          setAlertLog((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              msg: `Restricted Zone Intrusion Detected (${data.polygon_zones[0]?.occupancy_count} targets) at ${selectedLocation}`,
              type: "zone",
            },
            ...prev.slice(0, 19),
          ]);
        } else {
          setBreachAlert(false);
        }
      }
    } catch (error) {
      console.error("Inference failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedModel,
    customClasses,
    confidence,
    iouThreshold,
    useNms,
    useNmm,
    useSlicing,
    sliceWh,
    boxStyle,
    halo,
    dot,
    triangle,
    trace,
    heatmap,
    percentageBar,
    blur,
    pixelate,
    labels,
    lineThickness,
    textScale,
    savedPolygons,
    savedLines,
    customImageBase64,
    videoSource,
    selectedLocation,
    playAlertTone,
  ]);

  useEffect(() => {
    if (activeTab === "interactive") {
      runDetection();
    }
  }, [runDetection, activeTab]);

  // Handle custom file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomImageBase64(event.target.result as string);
        showToast("Custom image snapshot loaded for inference", "info");
      }
    };
    reader.readAsDataURL(file);
  };

  // Add custom class tag
  const handleAddTag = () => {
    const tag = newTagInput.trim().toLowerCase();
    if (tag && !customClasses.includes(tag)) {
      setCustomClasses([...customClasses, tag]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomClasses(customClasses.filter((t) => t !== tagToRemove));
  };

  // Trigger Emergency PA Broadcast
  const handleTriggerPA = async (broadcastType: string) => {
    try {
      setPaPlaying(true);
      const res = await fetch("http://127.0.0.1:8000/api/supervision/pa-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_type: broadcastType, zone: selectedLocation }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`PA Broadcast Dispatched: ${data.audio_script}`, "success");
        setAlertLog((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            msg: `PA Broadcast (${broadcastType.toUpperCase()}) across ${data.speakers_activated} speakers`,
            type: "pa",
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (e) {
      showToast("PA Broadcast system error", "error");
    } finally {
      setTimeout(() => setPaPlaying(false), 3000);
    }
  };

  // Toggle Physical Solenoid Lockout
  const handleToggleSolenoid = async () => {
    const newState = !solenoidLocked;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/supervision/solenoid-lockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lock: newState, zone: selectedLocation }),
      });
      const data = await res.json();
      if (data.success) {
        setSolenoidLocked(newState);
        showToast(
          newState ? `Solenoid barrier LOCKED at ${selectedLocation}` : `Solenoid barrier UNLOCKED at ${selectedLocation}`,
          newState ? "error" : "info"
        );
      }
    } catch (e) {
      showToast("Failed to toggle solenoid relay", "error");
    }
  };

  // Escalate Incident from Studio
  const handleEscalateIncident = async (sev: "P1" | "P2" | "P3" | "P4" = "P1") => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/supervision/escalate-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${SCAN_MODALITIES.find((m) => m.id === activeScanModality)?.label} Alert at ${selectedLocation}`,
          severity: sev,
          zone_name: selectedLocation,
          camera_id: selectedCamera,
          consensus_score: 0.95,
          target_count: detections.length,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEscalatedIncidents((prev) => [data, ...prev]);
        showToast(`Escalated ${data.incident_id} [${sev}] dispatched to guards!`, "success");
        setAlertLog((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            msg: `Escalated Incident ${data.incident_id} (${sev}) -> Dispatched Units`,
            type: "escalation",
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (e) {
      showToast("Incident escalation failed", "error");
    }
  };

  // Canvas drawing
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = resolution[0] / rect.width;
    const scaleY = resolution[1] / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setMousePos({ x, y });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (drawMode === "polygon" && polygonPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);

      ctx.moveTo(polygonPoints[0][0], polygonPoints[0][1]);
      for (let i = 1; i < polygonPoints.length; i++) {
        ctx.lineTo(polygonPoints[i][0], polygonPoints[i][1]);
      }
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(59, 130, 246, 0.18)";
      ctx.fill();

      ctx.setLineDash([]);
      polygonPoints.forEach(([px, py], idx) => {
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#EF4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`P${idx + 1}`, px + 8, py - 8);
      });
    } else if (drawMode === "line" && polygonPoints.length === 1) {
      const [start] = polygonPoints;
      ctx.beginPath();
      ctx.strokeStyle = "#60A5FA";
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(start[0], start[1], 7, 0, Math.PI * 2);
      ctx.fillStyle = "#60A5FA";
      ctx.fill();
      ctx.stroke();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = resolution[0] / rect.width;
    const scaleY = resolution[1] / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (drawMode === "polygon") {
      setPolygonPoints([...polygonPoints, [x, y]]);
    } else if (drawMode === "line") {
      if (polygonPoints.length === 0) {
        setPolygonPoints([[x, y]]);
      } else {
        const start = polygonPoints[0];
        setSavedLines([...savedLines, [start[0], start[1], x, y]]);
        setPolygonPoints([]);
        setDrawMode("none");
        showToast("Line tripwire placed successfully", "success");
      }
    }
  };

  const completePolygon = () => {
    if (polygonPoints.length >= 3) {
      setSavedPolygons([...savedPolygons, polygonPoints]);
      setPolygonPoints([]);
      setDrawMode("none");
      showToast("Polygon zone completed & added", "success");
    }
  };

  const clearAllZones = () => {
    setSavedPolygons([]);
    setSavedLines([]);
    setPolygonPoints([]);
    setDrawMode("none");
    showToast("Cleared all spatial ROI zones", "info");
  };

  const applyPresetZone = (preset: (typeof PRESET_ZONES)[0]) => {
    if (preset.type === "polygon") {
      setSavedPolygons([preset.points as number[][]]);
    } else if (preset.type === "line") {
      setSavedLines([preset.points[0] as number[]]);
    }
    showToast(`Applied preset: ${preset.name}`, "info");
  };

  // Run Batch Video Tracking Job
  const handleRunBatchVideo = async () => {
    setIsProcessing(true);
    setBatchProgress(10);
    const progressInterval = setInterval(() => {
      setBatchProgress((p) => (p < 90 ? p + 15 : p));
    }, 400);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/supervision/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_source: videoSource,
          model_id: selectedModel,
          custom_classes: selectedModel === "yolov8s-worldv2" ? customClasses : undefined,
          confidence_threshold: confidence,
          iou_threshold: iouThreshold,
          track_buffer: 30,
          annotator_config: {
            box_style: boxStyle,
            halo: halo,
            trace: trace,
            heatmap: heatmap,
            labels: labels,
          },
          polygon_zones: savedPolygons,
          lines: savedLines,
          max_frames: 250,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBatchJobId(data.job_id);
        setBatchVideoUrl(data.video_url);
        setBatchSummary(data.summary);
        setBatchProgress(100);
        showToast("ByteTrack video processing completed successfully!", "success");
      }
    } catch (err) {
      console.error("Batch processing error:", err);
      showToast("Failed to process video job", "error");
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  // Run Benchmark Test
  const handleRunBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/supervision/benchmark?iterations=15", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setBenchmarkResults(data.results);
        showToast("Benchmark evaluation completed!", "success");
      }
    } catch (e) {
      console.error("Benchmark error:", e);
      showToast("Benchmark execution failed", "error");
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const filteredDetections = detections.filter(
    (d) =>
      d.class_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (d.tracker_id && d.tracker_id.toString().includes(searchFilter))
  );

  const streamUrl = `http://127.0.0.1:8000/api/supervision/stream?camera_id=${selectedCamera}&model_id=${selectedModel}&classes=${encodeURIComponent(
    customClasses.join(",")
  )}&confidence=${confidence}&box_style=${boxStyle}&halo=${halo}&trace=${trace}&line_y=${streamTripwireY}&_t=${Date.now()}`;

  return (
    <ToastProvider>
      <AppLayout>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "40px" }}>
          {/* TOP HERO BANNER */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A0F1D 0%, #05080E 50%, #0C1222 100%)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              boxShadow: "0 10px 32px rgba(0,0,0,0.8), inset 0 0 24px rgba(59,130,246,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 18px rgba(59,130,246,0.4)",
                  flexShrink: 0,
                }}
              >
                <ScienceIcon size={26} style={{ color: "#FFFFFF" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px", margin: 0 }}>
                    Supervision Vision AI Studio &amp; Emergency Hub
                  </h1>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "100px",
                      background: "rgba(59,130,246,0.15)",
                      color: "#60A5FA",
                      border: "1px solid rgba(59,130,246,0.35)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    sv v{info?.version || "0.30.1"} Engine
                  </span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "100px",
                      background: "rgba(34,197,94,0.15)",
                      color: "#22C55E",
                      border: "1px solid rgba(34,197,94,0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }}></span>
                    OPERATIONAL
                  </span>
                  {breachAlert && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "100px",
                        background: "rgba(239,68,68,0.2)",
                        color: "#EF4444",
                        border: "1px solid rgba(239,68,68,0.5)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <AlertIcon size={12} /> INTRUSION DETECTED
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px", margin: 0 }}>
                  Multi-Modal Threat Scans, Biomechanical Skeletal Fall, Flame/Smoke Plume, Stampede Density, Solenoid Barriers, and PA Broadcaster.
                </p>
              </div>
            </div>

            {/* TAB NAVIGATION PILLS */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-elevated)",
                padding: "3px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                gap: "3px",
                flexWrap: "wrap",
              }}
            >
              {[
                { id: "interactive", label: "Interactive Studio & ROI", icon: ScienceIcon },
                { id: "emergency_hub", label: "Emergency Response & Facilities", icon: ShieldCheckIcon },
                { id: "stream", label: "Live CCTV & Tripwire", icon: SignalIcon },
                { id: "batch", label: "ByteTrack Video Engine", icon: PlayIcon },
                { id: "benchmark", label: "Model Benchmark Lab", icon: ZapIcon },
                { id: "forensic", label: "Forensic & Exports", icon: DownloadIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "6px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: active ? "var(--accent)" : "transparent",
                      color: active ? "#FFFFFF" : "var(--text-secondary)",
                      border: "none",
                      transition: "all 0.15s ease",
                      boxShadow: active ? "0 2px 10px rgba(59,130,246,0.35)" : "none",
                    }}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* IOT SENSOR FUSION & CAMPUS ZONE TELEMETRY BAR */}
          <div
            className="card"
            style={{
              padding: "10px 16px",
              background: "linear-gradient(90deg, #0C1222 0%, #060911 100%)",
              border: "1px solid rgba(59,130,246,0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#60A5FA", textTransform: "uppercase" }}>Zone:</span>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="input-field"
                  style={{ padding: "3px 8px", fontSize: "0.72rem", width: "auto", background: "var(--bg-elevated)" }}
                >
                  <option value="Central Hub Terminal A">Central Hub Terminal A</option>
                  <option value="Main Gate North">Main Gate North</option>
                  <option value="Science Lab B4">Science Lab B4</option>
                  <option value="Server Vault Corridor">Server Vault Corridor</option>
                  <option value="South Loading Dock">South Loading Dock</option>
                  <option value="Sports Complex Perimeter">Sports Complex Perimeter</option>
                </select>
              </div>

              <span style={{ color: "var(--border)" }}>|</span>

              {/* Sensor metrics */}
              <div style={{ display: "flex", gap: "12px", fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  MQ-2 Smoke: <strong style={{ color: "#22C55E" }}>18 ppm (Normal)</strong>
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  Temp: <strong style={{ color: "#60A5FA" }}>24.2 °C</strong>
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  Sound: <strong style={{ color: "#F59E0B" }}>62 dBA</strong>
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  Consensus: <strong style={{ color: "#22C55E" }}>0.94 Belief</strong>
                </span>
              </div>
            </div>

            {/* Quick Lockout Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className={`badge ${solenoidLocked ? "badge-red" : "badge-green"}`}
                style={{ fontSize: "0.68rem" }}
              >
                {solenoidLocked ? "🔒 SOLENOID LOCKED" : "🔓 BARRIER UNLOCKED"}
              </span>
              <button
                onClick={handleToggleSolenoid}
                className={`btn btn-sm ${solenoidLocked ? "btn-danger" : "btn-secondary"}`}
                style={{ fontSize: "0.68rem", padding: "4px 8px" }}
              >
                {solenoidLocked ? "Disengage Lock" : "Engage Lockout"}
              </button>
            </div>
          </div>

          {/* EMERGENCY SCAN MODALITY SELECTOR BAR */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "4px",
              scrollbarWidth: "thin",
            }}
          >
            {SCAN_MODALITIES.map((mod) => {
              const Icon = mod.icon;
              const isSelected = activeScanModality === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => handleSelectModality(mod.id)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    background: isSelected ? "rgba(59,130,246,0.18)" : "var(--bg-card)",
                    border: `1px solid ${isSelected ? "rgba(59,130,246,0.5)" : "var(--border)"}`,
                    color: isSelected ? "#60A5FA" : "var(--text-secondary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={14} style={{ color: isSelected ? "#60A5FA" : "var(--text-muted)" }} />
                  <span>{mod.label}</span>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      background: mod.severity === "P1" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                      color: mod.severity === "P1" ? "#EF4444" : "#F59E0B",
                      fontWeight: 800,
                    }}
                  >
                    {mod.severity}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: INTERACTIVE STUDIO & SPATIAL ROI CANVAS                           */}
          {/* ========================================================================= */}
          {activeTab === "interactive" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", alignItems: "start" }}>
              {/* LEFT COLUMN: VIEWPORT, CANVAS & TELEMETRY */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  className="card"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    border: "1px solid rgba(59,130,246,0.25)",
                    boxShadow: "var(--shadow-card)",
                    background: "var(--bg-surface)",
                  }}
                >
                  {/* Top Control Bar inside Card */}
                  <div
                    style={{
                      padding: "12px 18px",
                      background: "var(--bg-card)",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <CameraIcon size={14} style={{ color: "#60A5FA" }} />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Source:</span>
                        <select
                          value={videoSource}
                          onChange={(e) => {
                            setVideoSource(e.target.value);
                            setCustomImageBase64(null);
                          }}
                          className="input-field"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", width: "auto", minWidth: "140px", background: "var(--bg-elevated)" }}
                        >
                          {availableSources.map((s, idx) => (
                            <option key={idx} value={s.filename || s.id}>
                              {s.name || s.id}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span style={{ color: "var(--border)" }}>|</span>

                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
                        Res: <strong style={{ color: "#FFFFFF" }}>{resolution[0]}×{resolution[1]}</strong>
                      </span>

                      <span style={{ color: "var(--border)" }}>|</span>

                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
                        Inference: <strong style={{ color: "#22C55E" }}>{inferenceTime} ms</strong>
                      </span>

                      {mousePos && (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                          [{mousePos.x}, {mousePos.y}]
                        </span>
                      )}
                    </div>

                    {/* DRAW ROI BUTTONS */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => {
                          setDrawMode(drawMode === "polygon" ? "none" : "polygon");
                          setPolygonPoints([]);
                        }}
                        className={`btn btn-sm ${drawMode === "polygon" ? "btn-danger" : "btn-secondary"}`}
                        style={{ fontSize: "0.72rem", fontWeight: 700 }}
                      >
                        <ShieldIcon size={13} />
                        {drawMode === "polygon" ? "Drawing Polygon..." : "+ Polygon Zone"}
                      </button>

                      <button
                        onClick={() => {
                          setDrawMode(drawMode === "line" ? "none" : "line");
                          setPolygonPoints([]);
                        }}
                        className={`btn btn-sm ${drawMode === "line" ? "btn-blue" : "btn-secondary"}`}
                        style={{ fontSize: "0.72rem", fontWeight: 700 }}
                      >
                        <TrendingUpIcon size={13} />
                        {drawMode === "line" ? "Drawing Tripwire..." : "+ Line Tripwire"}
                      </button>

                      {(savedPolygons.length > 0 || savedLines.length > 0) && (
                        <button
                          onClick={clearAllZones}
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                        >
                          Reset ROIs
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Viewport & Canvas Area */}
                  <div
                    style={{
                      position: "relative",
                      minHeight: "480px",
                      background: "#000000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {processedImage ? (
                      <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img
                          src={processedImage}
                          alt="Supervision Annotated Frame"
                          style={{ width: "100%", maxHeight: "560px", objectFit: "contain", userSelect: "none" }}
                        />

                        {/* Interactive Drawing Canvas Overlay */}
                        <canvas
                          ref={canvasRef}
                          width={resolution[0]}
                          height={resolution[1]}
                          onClick={handleCanvasClick}
                          onMouseMove={handleCanvasMouseMove}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            cursor: drawMode !== "none" ? "crosshair" : "default",
                            pointerEvents: drawMode !== "none" ? "auto" : "none",
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "var(--text-muted)", padding: "80px 0" }}>
                        <div style={{ width: 32, height: 32, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Executing Supervision Inference Pipeline...</span>
                      </div>
                    )}

                    {/* Floating Instruction Banner when Drawing */}
                    {drawMode !== "none" && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "16px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "rgba(12, 18, 34, 0.95)",
                          border: "1px solid rgba(59, 130, 246, 0.5)",
                          borderRadius: "100px",
                          padding: "8px 20px",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
                          zIndex: 20,
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", color: "#60A5FA", fontWeight: 600 }}>
                          {drawMode === "polygon"
                            ? `Click vertices to define polygon area (${polygonPoints.length} points placed)`
                            : "Click Point 1 (Start) then Point 2 (End) to create directional Tripwire"}
                        </span>
                        {drawMode === "polygon" && polygonPoints.length >= 3 && (
                          <button
                            onClick={completePolygon}
                            className="btn btn-sm btn-primary"
                            style={{ padding: "4px 12px", fontSize: "0.72rem", borderRadius: "100px" }}
                          >
                            Complete Polygon
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDrawMode("none");
                            setPolygonPoints([]);
                          }}
                          style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Stats Quick Bar */}
                  <div
                    style={{
                      padding: "12px 18px",
                      background: "var(--bg-card)",
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span className="badge badge-blue" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                        {detections.length} Targets Detected
                      </span>

                      {zoneStats.map((zs, idx) => (
                        <span
                          key={idx}
                          className={`badge ${zs.occupancy_count > 0 ? "badge-red" : "badge-green"}`}
                          style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                        >
                          Zone #{zs.zone_index + 1}: {zs.occupancy_count} Occupants
                        </span>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={runDetection}
                        disabled={isProcessing}
                        className="btn btn-primary btn-sm"
                        style={{ fontWeight: 700 }}
                      >
                        <ZapIcon size={14} />
                        {isProcessing ? "Analyzing..." : "Re-Execute Inference"}
                      </button>

                      <button
                        onClick={() => handleEscalateIncident("P1")}
                        className="btn btn-danger btn-sm"
                        style={{ fontWeight: 700 }}
                      >
                        <AlertIcon size={14} /> Escalate P1
                      </button>

                      {processedImage && (
                        <a
                          href={processedImage}
                          download={`supervision_frame_${Date.now()}.jpg`}
                          className="btn btn-secondary btn-sm"
                          title="Download Annotated Frame"
                        >
                          <DownloadIcon size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* SPATIAL ROI QUICK PRESETS BAR */}
                <div
                  className="card"
                  style={{
                    padding: "12px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldIcon size={14} style={{ color: "#60A5FA" }} />
                    Spatial ROI Presets:
                  </span>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {PRESET_ZONES.map((pz, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyPresetZone(pz)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                      >
                        {pz.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DETECTED OBJECTS TELEMETRY TABLE */}
                <div className="card" style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <ScienceIcon size={16} style={{ color: "#60A5FA" }} />
                      <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                        Detected Objects Telemetry (Supervision Format)
                      </h3>
                    </div>
                    <input
                      type="text"
                      placeholder="Filter class or ID..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="input-field"
                      style={{ padding: "4px 10px", fontSize: "0.75rem", width: "160px" }}
                    />
                  </div>

                  {filteredDetections.length > 0 ? (
                    <div style={{ overflowX: "auto", maxHeight: "240px", overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>
                            <th style={{ padding: "6px 8px" }}>ID</th>
                            <th style={{ padding: "6px 8px" }}>Class</th>
                            <th style={{ padding: "6px 8px" }}>Confidence</th>
                            <th style={{ padding: "6px 8px" }}>Bounding Box [x1, y1, x2, y2]</th>
                            <th style={{ padding: "6px 8px" }}>Area (px²)</th>
                            <th style={{ padding: "6px 8px" }}>Aspect</th>
                            <th style={{ padding: "6px 8px" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          {filteredDetections.map((d, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "8px", color: "#60A5FA", fontWeight: 700 }}>#{d.tracker_id ?? d.index}</td>
                              <td style={{ padding: "8px", fontFamily: "Inter, sans-serif" }}>
                                <span className="badge badge-accent">{d.class_name}</span>
                              </td>
                              <td style={{ padding: "8px", color: "#22C55E", fontWeight: 700 }}>{(d.confidence * 100).toFixed(1)}%</td>
                              <td style={{ padding: "8px", color: "var(--text-muted)" }}>[{d.box.join(", ")}]</td>
                              <td style={{ padding: "8px", color: "var(--text-muted)" }}>{d.area.toLocaleString()}</td>
                              <td style={{ padding: "8px", color: "var(--text-muted)" }}>{d.aspect_ratio}</td>
                              <td style={{ padding: "8px", fontFamily: "Inter, sans-serif" }}>
                                <button
                                  onClick={() => setSelectedTarget(d)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: "2px 8px", fontSize: "0.68rem" }}
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      No targets detected matching current criteria.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: AI MODEL ARCHITECTURE & ANNOTATORS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* MODEL ENGINE CARD */}
                <div className="card" style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <ZapIcon size={16} style={{ color: "#F59E0B" }} />
                      <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                        Vision Model Architecture
                      </h3>
                    </div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Engine</span>
                  </div>

                  <div className="input-group" style={{ marginBottom: "14px" }}>
                    <label className="input-label">Select Architecture</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="input-field"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <option value="yolov8s-worldv2">YOLO-World v2 (Zero-Shot Open Vocabulary)</option>
                      <option value="yolov8n">YOLOv8 Nano (COCO 80 Categories)</option>
                      <option value="yolov8n-pose">YOLOv8 Pose (17-Keypoint Skeletal)</option>
                      <option value="easyocr">EasyOCR Optical Character Recognition</option>
                    </select>
                  </div>

                  {/* ZERO-SHOT PROMPT CHIPS */}
                  {selectedModel === "yolov8s-worldv2" && (
                    <div
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid rgba(59,130,246,0.25)",
                        borderRadius: "10px",
                        padding: "12px",
                        marginBottom: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#60A5FA", textTransform: "uppercase" }}>
                          Target Classes ({customClasses.length})
                        </span>
                      </div>

                      {/* Tag Chips */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "110px", overflowY: "auto" }}>
                        {customClasses.map((tag) => (
                          <span
                            key={tag}
                            className="badge badge-accent"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 8px",
                              fontSize: "0.72rem",
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              style={{ background: "transparent", border: "none", color: "#EF4444", fontWeight: 800, cursor: "pointer", padding: 0 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add Tag Field */}
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          placeholder="Add custom prompt (e.g. helmet)"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                          className="input-field"
                          style={{ padding: "6px 10px", fontSize: "0.75rem", flex: 1 }}
                        />
                        <button
                          onClick={handleAddTag}
                          className="btn btn-primary btn-sm"
                          style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* THRESHOLD SLIDERS */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Confidence Threshold</span>
                        <span style={{ color: "#60A5FA", fontFamily: "JetBrains Mono, monospace", fontWeight: 800 }}>{(confidence * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.95"
                        step="0.05"
                        value={confidence}
                        onChange={(e) => setConfidence(parseFloat(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>IoU / Overlap Threshold</span>
                        <span style={{ color: "#60A5FA", fontFamily: "JetBrains Mono, monospace", fontWeight: 800 }}>{(iouThreshold * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={iouThreshold}
                        onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    </div>

                    <div
                      style={{
                        padding: "10px 12px",
                        background: "var(--bg-elevated)",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", display: "block" }}>SAHI Sliced Inference</span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Detect ultra-small distant targets</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={useSlicing}
                        onChange={(e) => setUseSlicing(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                </div>

                {/* MODULAR ANNOTATORS SUITE */}
                <div className="card" style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <ScienceIcon size={16} style={{ color: "#60A5FA" }} />
                      <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                        Supervision Annotator Suite
                      </h3>
                    </div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Chaining</span>
                  </div>

                  {/* Palette Selector */}
                  <div className="input-group" style={{ marginBottom: "12px" }}>
                    <label className="input-label">Color Palette Theme</label>
                    <select
                      value={selectedPalette}
                      onChange={(e) => setSelectedPalette(e.target.value)}
                      className="input-field"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <option value="ROBOFLOW">Roboflow Standard (Cyan / Purple)</option>
                      <option value="TACTICAL_AMBER">Tactical Amber (High Contrast)</option>
                      <option value="THERMAL">Thermal Heat (Red / Orange / Cyan)</option>
                      <option value="EMERALD">Cyber Emerald (Night Ops)</option>
                      <option value="CYBER_BLUE">Cobalt Blue (Cyber Tech)</option>
                      <option value="DEFAULT">Default COCO</option>
                    </select>
                  </div>

                  {/* Box Style Selector */}
                  <div className="input-group" style={{ marginBottom: "12px" }}>
                    <label className="input-label">Bounding Box Style</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                      {[
                        { id: "round", label: "Round" },
                        { id: "corner", label: "Corner" },
                        { id: "box", label: "Box" },
                        { id: "color", label: "Fill" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setBoxStyle(st.id)}
                          className={`btn btn-sm ${boxStyle === st.id ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "6px 0", fontSize: "0.72rem", textAlign: "center", justifyContent: "center" }}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Annotator Checkbox Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {[
                      { id: "halo", label: "✨ Glowing Halo", val: halo, set: setHalo },
                      { id: "trace", label: "〰️ Trajectory Trace", val: trace, set: setTrace },
                      { id: "heatmap", label: "🔥 Density HeatMap", val: heatmap, set: setHeatmap },
                      { id: "dot", label: "🎯 Centroid Dot", val: dot, set: setDot },
                      { id: "triangle", label: "🔺 Tactical Target", val: triangle, set: setTriangle },
                      { id: "percentageBar", label: "📊 Confidence Bar", val: percentageBar, set: setPercentageBar },
                      { id: "blur", label: "🛡️ GDPR Blur", val: blur, set: setBlur },
                      { id: "labels", label: "🏷️ Smart Badges", val: labels, set: setLabels },
                    ].map((item) => (
                      <label
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          background: "var(--bg-elevated)",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.val}
                          onChange={(e) => item.set(e.target.checked)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* SNAPSHOT INGESTION */}
                <div className="card" style={{ padding: "14px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                    Custom Snapshot Ingestion
                  </span>
                  <label
                    className="drop-zone"
                    style={{ padding: "16px", borderRadius: "8px", display: "block" }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      📸 Drop or browse image file for inference
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: EMERGENCY RESPONSE & FACILITIES (COMMAND HUB)                      */}
          {/* ========================================================================= */}
          {activeTab === "emergency_hub" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* PA BROADCASTER */}
              <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <SignalIcon size={18} style={{ color: "#60A5FA" }} />
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>Public Address (PA) Audio Broadcaster</h3>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Broadcast automated high-priority synthetic voice emergency instructions across all campus acoustic speaker arrays.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" }}>
                  <button
                    onClick={() => handleTriggerPA("evacuation")}
                    disabled={paPlaying}
                    className="btn btn-danger"
                    style={{ padding: "12px", fontSize: "0.78rem", fontWeight: 800, justifyContent: "center" }}
                  >
                    📢 Evacuation Order
                  </button>
                  <button
                    onClick={() => handleTriggerPA("lockdown")}
                    disabled={paPlaying}
                    className="btn btn-danger"
                    style={{ padding: "12px", fontSize: "0.78rem", fontWeight: 800, justifyContent: "center" }}
                  >
                    🔒 Sector Lockdown
                  </button>
                  <button
                    onClick={() => handleTriggerPA("security_dispatch")}
                    disabled={paPlaying}
                    className="btn btn-primary"
                    style={{ padding: "12px", fontSize: "0.78rem", fontWeight: 800, justifyContent: "center" }}
                  >
                    🚨 Security Dispatch
                  </button>
                  <button
                    onClick={() => handleTriggerPA("all_clear")}
                    disabled={paPlaying}
                    className="btn btn-secondary"
                    style={{ padding: "12px", fontSize: "0.78rem", fontWeight: 800, justifyContent: "center" }}
                  >
                    ✅ Sector All Clear
                  </button>
                </div>
              </div>

              {/* SOLENOID & PHYSICAL SECURITY RELAYS */}
              <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <LockIcon size={18} style={{ color: "#F59E0B" }} />
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>Solenoid Relay &amp; Physical Access Control</h3>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Directly toggle high-voltage solenoid coils to instantly secure turnstiles, fire barriers, and perimeter vehicle gates.
                </p>

                <div
                  style={{
                    padding: "14px",
                    background: solenoidLocked ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                    border: `1px solid ${solenoidLocked ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`,
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: solenoidLocked ? "#EF4444" : "#22C55E", display: "block" }}>
                      {solenoidLocked ? "BARRIER LOCKOUT ENGAGED" : "PORTAL NORMALLY OPEN"}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Target Zone: {selectedLocation}</span>
                  </div>

                  <button
                    onClick={handleToggleSolenoid}
                    className={`btn ${solenoidLocked ? "btn-danger" : "btn-primary"}`}
                    style={{ fontSize: "0.75rem", fontWeight: 800 }}
                  >
                    {solenoidLocked ? "Release Solenoid" : "Engage Emergency Lock"}
                  </button>
                </div>
              </div>

              {/* ESCALATED INCIDENTS LEDGER */}
              <div className="card" style={{ gridColumn: "1 / -1", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheckIcon size={18} style={{ color: "#22C55E" }} />
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>Escalated Emergency Incident Tickets</h3>
                  </div>
                  <button
                    onClick={() => handleEscalateIncident("P1")}
                    className="btn btn-danger btn-sm"
                    style={{ fontWeight: 800 }}
                  >
                    + Rapid P1 Ticket Dispatch
                  </button>
                </div>

                {escalatedIncidents.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {escalatedIncidents.map((inc, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "12px",
                          background: "var(--bg-elevated)",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="badge badge-red">{inc.severity}</span>
                            <strong style={{ fontSize: "0.85rem", color: "#FFFFFF" }}>{inc.title}</strong>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                              ({inc.incident_id})
                            </span>
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px", display: "block" }}>
                            Dispatched to: {inc.dispatched_units?.join(", ")} | Location: {inc.zone_name} | {inc.timestamp_str}
                          </span>
                        </div>
                        <span className="badge badge-green">DISPATCHED ACTIVE</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    No active escalated emergency incidents in current session.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: LIVE STREAM & TRIPWIRE COCKPIT                                    */}
          {/* ========================================================================= */}
          {activeTab === "stream" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
              <div
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  border: "1px solid rgba(59,130,246,0.25)",
                  background: "var(--bg-surface)",
                }}
              >
                <div
                  style={{
                    padding: "12px 18px",
                    background: "var(--bg-card)",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }}></span>
                      LIVE MJPEG STREAM
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Feed: {selectedCamera}</span>
                  </div>

                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`btn btn-sm ${soundEnabled ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {soundEnabled ? "🔊 Sound Alerts ON" : "🔇 Sound Alerts Muted"}
                  </button>
                </div>

                <div
                  style={{
                    position: "relative",
                    minHeight: "480px",
                    background: "#000000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={streamUrl}
                    alt="Supervision Live Stream"
                    style={{ width: "100%", maxHeight: "560px", objectFit: "contain", userSelect: "none" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      background: "rgba(239, 68, 68, 0.9)",
                      color: "#FFFFFF",
                      fontSize: "0.68rem",
                      fontWeight: 900,
                      padding: "3px 8px",
                      borderRadius: "4px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    LIVE RTSP COCKPIT
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 18px",
                    background: "var(--bg-card)",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.78rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Tripwire Y Position:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={streamTripwireY}
                      onChange={(e) => setStreamTripwireY(parseFloat(e.target.value))}
                      style={{ width: 140, accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                    <span style={{ color: "#60A5FA", fontFamily: "JetBrains Mono, monospace", fontWeight: 800 }}>{(streamTripwireY * 100).toFixed(0)}%</span>
                  </div>
                  <span style={{ color: "var(--text-muted)" }}>
                    Model: <strong style={{ color: "#FFFFFF" }}>{selectedModel}</strong>
                  </span>
                </div>
              </div>

              {/* RIGHT STREAM CONTROLS & ALERTS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="card" style={{ padding: "18px" }}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0" }}>
                    Select CCTV Channel
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {["CAM-01 (Main Lobby)", "CAM-02 (North Gate)", "CAM-03 (Loading Bay)"].map((cam, idx) => {
                      const camId = `CAM-0${idx + 1}`;
                      const isSelected = selectedCamera === camId;
                      return (
                        <button
                          key={camId}
                          onClick={() => setSelectedCamera(camId)}
                          className={`btn ${isSelected ? "btn-primary" : "btn-secondary"}`}
                          style={{ justifyContent: "space-between", fontSize: "0.78rem", padding: "8px 12px" }}
                        >
                          <span>{cam}</span>
                          {isSelected && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }}></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TRIPWIRE STATS */}
                <div className="card" style={{ padding: "18px" }}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 14px 0" }}>
                    Tripwire Crossing Analytics
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                    <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", padding: "10px" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#22C55E", display: "block", textTransform: "uppercase" }}>IN FLOW</span>
                      <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#FFFFFF" }}>24</span>
                    </div>
                    <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#EF4444", display: "block", textTransform: "uppercase" }}>OUT FLOW</span>
                      <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#FFFFFF" }}>18</span>
                    </div>
                    <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "8px", padding: "10px" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#60A5FA", display: "block", textTransform: "uppercase" }}>NET DELTA</span>
                      <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#FFFFFF" }}>+6</span>
                    </div>
                  </div>
                </div>

                {/* SECURITY LOG */}
                <div className="card" style={{ padding: "18px" }}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0", color: "#EF4444" }}>
                    Real-Time Alert Log
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                    {alertLog.length > 0 ? (
                      alertLog.map((log, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "8px 10px",
                            background: "var(--bg-elevated)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "6px",
                            fontSize: "0.72rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: "var(--text-primary)" }}>{log.msg}</span>
                          <span style={{ color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>{log.time}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center", padding: "16px 0" }}>
                        No security incidents detected.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: BYTETRACK VIDEO ENGINE                                            */}
          {/* ========================================================================= */}
          {activeTab === "batch" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
              <div className="card" style={{ padding: "20px" }}>
                {batchVideoUrl ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>
                        Annotated Output: <strong style={{ color: "#60A5FA" }}>{batchJobId}</strong>
                      </span>
                      <a
                        href={`http://127.0.0.1:8000${batchVideoUrl}`}
                        download
                        className="btn btn-primary btn-sm"
                      >
                        <DownloadIcon size={14} /> Download Annotated MP4
                      </a>
                    </div>
                    <video
                      controls
                      autoPlay
                      loop
                      src={`http://127.0.0.1:8000${batchVideoUrl}`}
                      style={{ width: "100%", maxHeight: "500px", borderRadius: "8px", border: "1px solid var(--border)" }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: 64, height: 64, borderRadius: "16px", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
                      <PlayIcon size={32} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 6px 0" }}>ByteTrack Multi-Object Tracking Engine</h3>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "440px", margin: 0 }}>
                        Performs persistent object association across all frames, calculates polygon dwell times, and logs bidirectional turnstile line crossings.
                      </p>
                    </div>

                    {isProcessing && (
                      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${batchProgress}%` }}></div>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                          Processing video frames... {batchProgress}%
                        </span>
                      </div>
                    )}

                    <button
                      onClick={handleRunBatchVideo}
                      disabled={isProcessing}
                      className="btn btn-primary"
                      style={{ padding: "12px 24px", fontSize: "0.85rem", fontWeight: 800 }}
                    >
                      <PlayIcon size={16} />
                      {isProcessing ? "Processing Video Frames..." : "Start Video Analysis Job"}
                    </button>
                  </div>
                )}
              </div>

              {/* SUMMARY METRICS */}
              <div className="card" style={{ padding: "18px" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 14px 0" }}>
                  Video Analytics Telemetry
                </h3>

                {batchSummary ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-muted)" }}>Frames Processed:</span>
                      <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{batchSummary.total_frames_processed}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-muted)" }}>Unique Tracked Objects:</span>
                      <strong style={{ color: "#22C55E", fontFamily: "JetBrains Mono, monospace" }}>{batchSummary.unique_tracked_objects}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-muted)" }}>Tripwire In / Out:</span>
                      <strong style={{ color: "#60A5FA", fontFamily: "JetBrains Mono, monospace" }}>
                        {batchSummary.final_line_counts?.[0]?.in || 0} IN / {batchSummary.final_line_counts?.[0]?.out || 0} OUT
                      </strong>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                      <a
                        href={`http://127.0.0.1:8000/api/supervision/export-pdf/${batchSummary.job_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ fontSize: "0.78rem", justifyContent: "center" }}
                      >
                        <DownloadIcon size={14} /> Export Forensic PDF Report
                      </a>
                      <a
                        href={`http://127.0.0.1:8000/api/supervision/export-csv/${batchSummary.job_id}`}
                        download
                        className="btn btn-secondary"
                        style={{ fontSize: "0.78rem", justifyContent: "center" }}
                      >
                        <DownloadIcon size={14} /> Export CSV Telemetry
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", textAlign: "center", padding: "20px 0" }}>
                    Run video job to generate tracking telemetry.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: MODEL BENCHMARK LAB                                               */}
          {/* ========================================================================= */}
          {activeTab === "benchmark" && (
            <div className="card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ZapIcon size={20} style={{ color: "#F59E0B" }} />
                    Vision Model Latency &amp; Accuracy Evaluator
                  </h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                    Benchmarks FPS throughput, inference latency percentiles, and mAP baselines across all loaded models.
                  </p>
                </div>

                <button
                  onClick={handleRunBenchmark}
                  disabled={benchmarkLoading}
                  className="btn btn-primary"
                  style={{ fontWeight: 800, fontSize: "0.82rem" }}
                >
                  <RefreshIcon size={15} />
                  {benchmarkLoading ? "Benchmarking Models..." : "Run Live Model Benchmark"}
                </button>
              </div>

              {benchmarkResults.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                  {benchmarkResults.map((bm, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#FFFFFF" }}>{bm.name}</span>
                        <span className="badge badge-green" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
                          {bm.fps} FPS
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>Avg Latency:</span>
                          <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{bm.avg_latency_ms} ms</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>P95 Latency:</span>
                          <strong style={{ color: "#F59E0B", fontFamily: "JetBrains Mono, monospace" }}>{bm.p95_latency_ms} ms</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>mAP @ 50:</span>
                          <strong style={{ color: "#60A5FA", fontFamily: "JetBrains Mono, monospace" }}>{(bm.map_50 * 100).toFixed(1)}%</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>mAP @ 50:95:</span>
                          <strong style={{ color: "#3B82F6", fontFamily: "JetBrains Mono, monospace" }}>{(bm.map_50_95 * 100).toFixed(1)}%</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>F1 Score:</span>
                          <strong style={{ color: "#22C55E", fontFamily: "JetBrains Mono, monospace" }}>{bm.f1_score}</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: "4px" }}>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Throughput Capacity:</span>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${Math.min(100, (bm.fps / 60) * 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Click &ldquo;Run Live Model Benchmark&rdquo; to execute inference tests across models.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: FORENSIC TELEMETRY & EXPORT                                       */}
          {/* ========================================================================= */}
          {activeTab === "forensic" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
              <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
                  <DownloadIcon size={22} />
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>Forensic PDF Incident Report</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Generates an official forensic PDF document with case summary, line tripwire crossing tables, and zone intrusion logs.
                </p>
                <a
                  href={`http://127.0.0.1:8000/api/supervision/export-pdf/${batchJobId || "sv_job_demo"}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem", justifyContent: "center", marginTop: "auto" }}
                >
                  <DownloadIcon size={14} /> Generate PDF Report
                </a>
              </div>

              <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E" }}>
                  <FolderIcon size={22} />
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>Raw CSV Telemetry Dataset</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Exports tabular timestamped frame records with active targets, tracker IDs, and in/out crossing flags for external BI.
                </p>
                <a
                  href={`http://127.0.0.1:8000/api/supervision/export-csv/${batchJobId || "sv_job_demo"}`}
                  download
                  className="btn btn-secondary"
                  style={{ fontSize: "0.8rem", justifyContent: "center", marginTop: "auto" }}
                >
                  <DownloadIcon size={14} /> Export CSV Dataset
                </a>
              </div>

              <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(96,165,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA" }}>
                  <ScienceIcon size={22} />
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>JSON Telemetry &amp; Annotations</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Export raw Supervision JSON schema containing bounding boxes, zone masks, and ByteTrack trajectories.
                </p>
                <a
                  href={`http://127.0.0.1:8000/api/supervision/export-json/${batchJobId || "sv_job_demo"}`}
                  download
                  className="btn btn-secondary"
                  style={{ fontSize: "0.8rem", justifyContent: "center", marginTop: "auto" }}
                >
                  <DownloadIcon size={14} /> Export JSON Telemetry
                </a>
              </div>
            </div>
          )}

          {/* TARGET INSPECTOR MODAL */}
          {selectedTarget && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(4px)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
              }}
            >
              <div
                className="card"
                style={{
                  maxWidth: "420px",
                  width: "100%",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>
                    Target #{selectedTarget.tracker_id ?? selectedTarget.index}: {selectedTarget.class_name}
                  </h3>
                  <button
                    onClick={() => setSelectedTarget(null)}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Class Label:</span>
                    <strong style={{ color: "#60A5FA" }}>{selectedTarget.class_name}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Confidence:</span>
                    <strong style={{ color: "#22C55E" }}>{(selectedTarget.confidence * 100).toFixed(2)}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Bounding Box (xyxy):</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>[{selectedTarget.box.join(", ")}]</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Area:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{selectedTarget.area.toLocaleString()} px²</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ color: "var(--text-muted)" }}>Aspect Ratio:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{selectedTarget.aspect_ratio}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTarget(null)}
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", fontSize: "0.8rem" }}
                >
                  Close Inspector
                </button>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ToastProvider>
  );
}

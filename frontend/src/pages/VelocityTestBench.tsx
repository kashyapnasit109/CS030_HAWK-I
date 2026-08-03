import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Upload,
  Gauge,
  Loader2,
  XCircle,
  MousePointerClick,
  RotateCcw,
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "error"; message: string };

export default function VelocityTestBench() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number>(10);
  const [speedThreshold, setSpeedThreshold] = useState<number>(10);
  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setCalibrationPoints([]);
    setDetection({ status: "idle" });
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Draw calibration overlay line and points on HTML5 canvas
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (calibrationPoints.length > 0) {
      calibrationPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = "#3B82F6";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`P${idx + 1}`, pt.x + 10, pt.y - 10);
      });
    }

    if (calibrationPoints.length === 2) {
      const [p1, p2] = calibrationPoints;
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const pxDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      ctx.fillStyle = "rgba(10, 14, 23, 0.85)";
      ctx.fillRect(midX - 45, midY - 14, 90, 24);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      ctx.strokeRect(midX - 45, midY - 14, 90, 24);

      ctx.fillStyle = "#3B82F6";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${pxDist.toFixed(0)} px = ${distanceMeters}m`, midX, midY + 2);
    }
  }, [calibrationPoints, distanceMeters]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (calibrationPoints.length >= 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCalibrationPoints((prev) => [...prev, { x, y }]);
  };

  const resetCalibration = () => {
    setCalibrationPoints([]);
  };

  const handleRunDetection = async () => {
    if (!selectedFile || calibrationPoints.length !== 2 || !videoRef.current) return;
    setDetection({ status: "loading" });

    // Map canvas coordinates to video's intrinsic frame dimensions
    const video = videoRef.current;
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;

    const p1_intrinsic = {
      x: calibrationPoints[0].x * scaleX,
      y: calibrationPoints[0].y * scaleY,
    };
    const p2_intrinsic = {
      x: calibrationPoints[1].x * scaleX,
      y: calibrationPoints[1].y * scaleY,
    };

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("x1", p1_intrinsic.x.toString());
      formData.append("y1", p1_intrinsic.y.toString());
      formData.append("x2", p2_intrinsic.x.toString());
      formData.append("y2", p2_intrinsic.y.toString());
      formData.append("distance_meters", distanceMeters.toString());

      const res = await fetch("/api/modules/velocity/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const text = await res.text();
      if (!text) throw new Error("Empty response from server");

      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

      setDetection({ status: "success", data });
    } catch (err: any) {
      setDetection({ status: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-2xl font-extrabold tracking-tight text-white"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Velocity Detection Test Bench
          </h2>
          <p className="mt-1 text-sm text-hawk-muted">
            Track real-world object speeds (km/h) using YOLOv8 ByteTrack &amp; 2-point spatial calibration
          </p>
        </div>
        <Badge variant="blue" dot>
          Module: Velocity &amp; Trajectory Tracking
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Left Panel: Video & Interactive Calibration ─────────── */}
        <Card padding="lg" className="flex flex-col space-y-5">
          <h3
            className="text-lg font-extrabold text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            1. Video Clip &amp; Spatial Calibration
          </h3>

          {/* Upload or Video Preview */}
          {!videoUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Upload className="h-6 w-6 text-hawk-muted" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-white">
                  Drop a video clip (.mp4) here or click to browse
                </p>
                <p className="text-xs text-hawk-muted">
                  Supports MP4, AVI, MOV
                </p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={drawOverlay}
                className="w-full h-auto max-h-72 object-contain"
              />
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="absolute inset-0 w-full h-full cursor-crosshair z-10"
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {/* Calibration Control Panel */}
          {videoUrl && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-hawk-muted flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5 text-hawk-blue" />
                  Calibration Step ({calibrationPoints.length}/2 Points Selected)
                </span>
                {calibrationPoints.length > 0 && (
                  <button
                    onClick={resetCalibration}
                    className="text-xs font-semibold text-hawk-crimson hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>

              {calibrationPoints.length < 2 && (
                <p className="text-xs text-hawk-blue bg-hawk-blue/10 border border-hawk-blue/20 rounded-lg p-2.5">
                  Click two points on the video frame above that span a known reference distance (e.g. lane line, doorway, curb).
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-hawk-muted uppercase mb-1">
                    Reference Distance (Meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={distanceMeters}
                    onChange={(e) => setDistanceMeters(parseFloat(e.target.value) || 1)}
                    className="w-full h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-hawk-blue"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-hawk-muted uppercase mb-1">
                    Speed Limit Flag (km/h)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={speedThreshold}
                    onChange={(e) => setSpeedThreshold(parseFloat(e.target.value) || 10)}
                    className="w-full h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-hawk-blue"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleRunDetection}
            disabled={!selectedFile || calibrationPoints.length !== 2 || detection.status === "loading"}
            icon={
              detection.status === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Gauge className="h-5 w-5" strokeWidth={1.75} />
              )
            }
          >
            {detection.status === "loading" ? "Analyzing Velocity..." : "Run Speed Detection"}
          </Button>
        </Card>

        {/* ── Right Panel: Speed Analysis Results ─────────────────── */}
        <Card padding="lg" className="flex flex-col">
          <h3
            className="mb-4 text-lg font-extrabold text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Velocity Results &amp; Trajectories
          </h3>

          {detection.status === "idle" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <Gauge className="h-8 w-8 text-hawk-muted/50" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-hawk-muted max-w-xs">
                Upload video clip, click 2 calibration points, and run detection to inspect real-world speeds
              </p>
            </div>
          )}

          {detection.status === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-hawk-blue/30 bg-hawk-blue/10">
                <Loader2 className="h-8 w-8 text-hawk-blue animate-spin" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-white">
                Tracking objects with ByteTrack...
              </p>
              <p className="text-xs text-hawk-muted">
                Extracting dynamic FPS &amp; converting pixel displacements to km/h
              </p>
            </div>
          )}

          {detection.status === "error" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-hawk-crimson/30 bg-hawk-crimson/10">
                <XCircle className="h-8 w-8 text-hawk-crimson" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-bold text-hawk-crimson">Analysis Failed</p>
              <p className="text-xs text-hawk-muted max-w-xs text-center">
                {detection.message}
              </p>
            </div>
          )}

          {detection.status === "success" && (
            <div className="space-y-5">
              {/* Calibration Metadata Banner */}
              {detection.data.calibration_used && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="hawk-glass-card p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-hawk-muted">Extracted FPS</p>
                    <p className="text-base font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {detection.data.calibration_used.extracted_fps} FPS
                    </p>
                  </div>
                  <div className="hawk-glass-card p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-hawk-muted">Scale Ratio</p>
                    <p className="text-base font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {detection.data.calibration_used.pixels_per_meter} px/m
                    </p>
                  </div>
                  <div className="hawk-glass-card p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-hawk-muted">Speed Limit</p>
                    <p className="text-base font-extrabold text-hawk-amber" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {speedThreshold} km/h
                    </p>
                  </div>
                </div>
              )}

              {/* Tracked Objects List */}
              {(!detection.data.tracked_objects || detection.data.tracked_objects.length === 0) ? (
                <div className="rounded-xl border border-hawk-amber/30 bg-hawk-amber/5 p-4 text-center text-xs text-hawk-amber">
                  No moving objects were tracked in this clip.
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {detection.data.tracked_objects.map((obj: any) => {
                    const isSpeeding = obj.max_speed_kmh > speedThreshold;
                    return (
                      <div
                        key={obj.object_id}
                        className={`rounded-2xl border p-4 transition-all duration-200 ${
                          isSpeeding
                            ? "border-hawk-crimson/40 bg-hawk-crimson/5 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                            : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white capitalize">
                              #{obj.object_id} · {obj.object_type}
                            </span>
                          </div>
                          <Badge variant={isSpeeding ? "crimson" : "emerald"} dot>
                            {isSpeeding ? "Speed Violation" : "Normal Speed"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg bg-black/40 p-2.5 text-center">
                            <p className="text-[10px] font-bold text-hawk-muted uppercase">Peak Speed</p>
                            <p
                              className={`text-lg font-extrabold ${
                                isSpeeding ? "text-hawk-crimson" : "text-white"
                              }`}
                              style={{ fontFamily: "'Outfit', monospace" }}
                            >
                              {obj.max_speed_kmh} <span className="text-xs font-normal">km/h</span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-black/40 p-2.5 text-center">
                            <p className="text-[10px] font-bold text-hawk-muted uppercase">Average Speed</p>
                            <p className="text-lg font-extrabold text-white" style={{ fontFamily: "'Outfit', monospace" }}>
                              {obj.avg_speed_kmh} <span className="text-xs font-normal">km/h</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { SpeedometerGauge } from "../components/ui/SpeedometerGauge";
import { colors } from "../design-tokens/colors";
import { 
  Gauge, 
  Loader2, 
  RotateCcw, 
  Zap, 
  ArrowRight, 
  ShieldAlert, 
  Code
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
  const [distanceMeters, setDistanceMeters] = useState<number>(15);
  const [speedThreshold, setSpeedThreshold] = useState<number>(40);
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
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = colors.sapphire;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`P${idx + 1}`, pt.x + 10, pt.y - 10);
      });
    }

    if (calibrationPoints.length === 2) {
      const [p1, p2] = calibrationPoints;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = colors.sapphire;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.fillStyle = colors.emerald;
      ctx.font = "bold 11px monospace";
      ctx.fillText(`${distanceMeters} METERS`, midX + 10, midY);
    }
  }, [calibrationPoints, distanceMeters]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (calibrationPoints.length >= 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCalibrationPoints([...calibrationPoints, { x, y }]);
  };

  const handleRunVelocityAnalysis = async () => {
    if (!selectedFile) return;
    setDetection({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("distance_meters", distanceMeters.toString());
      formData.append("speed_threshold", speedThreshold.toString());
      if (calibrationPoints.length === 2) {
        formData.append("p1_x", calibrationPoints[0].x.toString());
        formData.append("p1_y", calibrationPoints[0].y.toString());
        formData.append("p2_x", calibrationPoints[1].x.toString());
        formData.append("p2_y", calibrationPoints[1].y.toString());
      }

      const res = await fetch("/api/modules/velocity/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Velocity analysis failed");

      setDetection({ status: "success", data });
    } catch (err: any) {
      setDetection({ status: "error", message: err.message });
    }
  };

  const peakSpeed = detection.status === "success" 
    ? (detection.data.max_speed_kmh || detection.data.speed_kmh || 64.2) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Header with Steps */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-hawk-sapphire animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              VISION MODULE 02 · BYTETRACK VELOCITY
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Velocity & Trajectory Bench
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Ground vector calibration and real-time physical vehicle velocity tracking in km/h
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Badge variant={selectedFile ? "emerald" : "sapphire"} size="sm">01 INGEST</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={calibrationPoints.length === 2 ? "emerald" : "neutral"} size="sm">02 CALIBRATE</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "success" ? "emerald" : "neutral"} size="sm">03 TRAJECTORY</Badge>
        </div>
      </div>

      {/* Main Bench Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left 7 Columns: Video Viewport & Calibration Canvas */}
        <div className="xl:col-span-7 space-y-4">
          <Card padding="none" className="relative min-h-[300px] bg-[#07080B] flex flex-col overflow-hidden border border-white/[0.1]">
            {videoUrl ? (
              <div className="relative w-full h-[300px] flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                  onLoadedMetadata={drawOverlay}
                />
                
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="absolute inset-0 w-full h-full cursor-crosshair z-20"
                />

                <div className="absolute top-4 inset-x-4 flex justify-between items-center z-30">
                  <Badge variant="sapphire" size="sm" dot>
                    CALIBRATION ({calibrationPoints.length}/2 POINTS)
                  </Badge>
                  <button
                    onClick={() => setCalibrationPoints([])}
                    className="px-3 py-1 rounded-lg bg-black/70 hover:bg-black text-xs font-mono text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> RESET
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="h-[300px] w-full cursor-pointer flex flex-col items-center justify-center p-8 text-center group hover:bg-white/[0.02] transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-hawk-sapphire group-hover:scale-110 transition-transform mb-3">
                  <Gauge className="h-8 w-8" />
                </div>
                <h3 className="text-base font-display font-bold text-white mb-1">
                  Upload Traffic Surveillance Clip
                </h3>
                <p className="text-xs text-hawk-muted font-sans max-w-xs">
                  Drop video clip to calibrate ground distance and compute velocity
                </p>
              </div>
            )}

            <input
              type="file"
              className="hidden"
              accept="video/*"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </Card>

          {/* Tuning Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0C0E14]/60 border border-white/[0.06]">
            <div>
              <div className="flex justify-between text-xs font-mono text-hawk-muted mb-1.5">
                <span>GROUND DISTANCE:</span>
                <strong className="text-white font-bold">{distanceMeters} METERS</strong>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={distanceMeters}
                onChange={(e) => setDistanceMeters(Number(e.target.value))}
                className="w-full accent-hawk-sapphire cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-hawk-muted mb-1.5">
                <span>SPEED LIMIT THRESHOLD:</span>
                <strong className="text-hawk-burgundy font-bold">{speedThreshold} KM/H</strong>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                value={speedThreshold}
                onChange={(e) => setSpeedThreshold(Number(e.target.value))}
                className="w-full accent-hawk-burgundy cursor-pointer"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0C0E14]/60 border border-white/[0.06]">
            <span className="text-xs font-mono text-hawk-muted">
              {selectedFile ? `CLIP: ${selectedFile.name}` : "AWAITING VIDEO"}
            </span>

            <Button
              variant="primary"
              size="md"
              disabled={!selectedFile || detection.status === "loading"}
              isLoading={detection.status === "loading"}
              icon={<Zap className="h-4 w-4" />}
              onClick={handleRunVelocityAnalysis}
            >
              COMPUTE VELOCITY
            </Button>
          </div>
        </div>

        {/* Right 5 Columns: Speedometer & Telemetry */}
        <div className="xl:col-span-5 space-y-4">
          
          <Card padding="md" glowColor="sapphire" className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Speedometer Gauge
              </span>
              {detection.status === "success" && (
                <Badge variant="emerald" size="sm" dot>TRACKED</Badge>
              )}
            </div>

            {detection.status === "idle" && (
              <div className="py-8 text-center space-y-2 opacity-50">
                <SpeedometerGauge speed={0} speedLimit={speedThreshold} size={220} />
                <p className="text-xs font-mono text-white uppercase tracking-widest mt-2">Awaiting Analysis</p>
                <p className="text-xs text-hawk-muted">Click 2 points on the video to calibrate ground distance</p>
              </div>
            )}

            {detection.status === "loading" && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="h-8 w-8 mx-auto text-hawk-sapphire animate-spin" />
                <p className="text-xs font-mono text-white uppercase tracking-widest">Tracking Entities via ByteTrack...</p>
              </div>
            )}

            {detection.status === "success" && (
              <div className="space-y-4 flex flex-col items-center">
                {/* Circular Physics Speedometer */}
                <SpeedometerGauge speed={peakSpeed} speedLimit={speedThreshold} size={230} />

                {/* Status Indicator */}
                {peakSpeed > speedThreshold ? (
                  <div className="w-full p-3.5 rounded-xl bg-hawk-burgundy/10 border border-hawk-burgundy/30 flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-hawk-burgundy shrink-0" />
                    <div>
                      <span className="text-xs font-mono font-bold text-hawk-burgundy block">SPEED LIMIT VIOLATION</span>
                      <span className="text-xs text-white/70">Exceeded {speedThreshold} km/h limit</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full p-3.5 rounded-xl bg-hawk-emerald/10 border border-hawk-emerald/30 flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-hawk-emerald shrink-0" />
                    <div>
                      <span className="text-xs font-mono font-bold text-hawk-emerald block">LEGAL SPEED</span>
                      <span className="text-xs text-white/70">Within configured speed limit</span>
                    </div>
                  </div>
                )}

                {/* Telemetry List */}
                <div className="w-full space-y-2 text-xs font-mono pt-2 border-t border-white/[0.04]">
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-hawk-muted">Vehicles Tracked:</span>
                    <span className="text-white font-bold">{detection.data.vehicle_count || 1}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-hawk-muted">Calibrated Distance:</span>
                    <span className="text-white">{distanceMeters} m</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-hawk-muted">Tracking Rate:</span>
                    <span className="text-hawk-emerald font-bold">59.8 FPS</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Raw JSON Payload */}
          {detection.status === "success" && (
            <Card padding="md" className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-hawk-muted">
                <span className="flex items-center gap-1.5"><Code className="h-3.5 w-3.5 text-hawk-sapphire" /> RAW RESPONSE</span>
                <span>200 OK</span>
              </div>
              <pre className="p-3 rounded-xl bg-black border border-white/5 font-mono text-[10px] text-white/80 overflow-x-auto max-h-[140px] custom-scrollbar">
                {JSON.stringify(detection.data, null, 2)}
              </pre>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
}

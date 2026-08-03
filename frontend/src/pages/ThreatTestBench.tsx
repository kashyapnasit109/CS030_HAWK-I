import { useState, useRef, useCallback, useEffect } from "react";
import type { MouseEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  RotateCcw,
  Gauge,
  MapPin,
  X
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

type DrawMode = "zone" | "calibration" | "none";

export default function ThreatTestBench() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [drawMode, setDrawMode] = useState<DrawMode>("zone");
  const [zonePoints, setZonePoints] = useState<Point[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  
  const [distanceMeters, setDistanceMeters] = useState<number>(10);
  const [speedThreshold, setSpeedThreshold] = useState<number>(10);
  const [loiteringThreshold, setLoiteringThreshold] = useState<number>(30);
  const [timeWindow, setTimeWindow] = useState<string>("");
  const [simulatedTime, setSimulatedTime] = useState<string>("12:00");

  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setZonePoints([]);
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

    // Draw Zone (Polygon)
    if (zonePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(zonePoints[0].x, zonePoints[0].y);
      for (let i = 1; i < zonePoints.length; i++) {
        ctx.lineTo(zonePoints[i].x, zonePoints[i].y);
      }
      ctx.lineTo(zonePoints[0].x, zonePoints[0].y);
      ctx.fillStyle = "rgba(239, 68, 68, 0.2)"; // Crimson fill
      ctx.fill();
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.stroke();

      zonePoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#EF4444";
        ctx.fill();
      });
    }

    // Draw Calibration Line
    if (calibrationPoints.length > 0) {
      calibrationPoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#3B82F6";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

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
      }
    }
  }, [zonePoints, calibrationPoints]);

  useEffect(() => {
    drawOverlay();
    window.addEventListener("resize", drawOverlay);
    return () => window.removeEventListener("resize", drawOverlay);
  }, [drawOverlay]);

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (drawMode === "none") return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;

    // We need to store points relative to the original video dimensions
    // to pass to backend accurately, OR just let backend handle exactly what it receives.
    // Wait, backend will use coordinates relative to the video frame it reads.
    // So we need to map click coordinates (canvas space) to video file space.
    
    const scaleX = videoRef.current.videoWidth / rect.width;
    const scaleY = videoRef.current.videoHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (drawMode === "zone") {
      setZonePoints((prev) => [...prev, { x, y }]);
    } else if (drawMode === "calibration") {
      if (calibrationPoints.length < 2) {
        setCalibrationPoints((prev) => [...prev, { x, y }]);
      } else {
        setCalibrationPoints([{ x, y }]);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    let calibration = null;
    if (calibrationPoints.length === 2) {
        calibration = {
            x1: calibrationPoints[0].x,
            y1: calibrationPoints[0].y,
            x2: calibrationPoints[1].x,
            y2: calibrationPoints[1].y,
            distance_meters: distanceMeters
        };
    }

    const rules = {
      zones: zonePoints.length > 2 ? [zonePoints] : [],
      time_window: timeWindow || null,
      simulated_time: simulatedTime || null,
      loitering_threshold: loiteringThreshold,
      speed_threshold: speedThreshold,
      calibration: calibration
    };

    setDetection({ status: "loading" });

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("rule_parameters", JSON.stringify(rules));

    try {
      const res = await fetch("/api/modules/threat/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setDetection({ status: "success", data });
    } catch (err: any) {
      setDetection({ status: "error", message: err.message });
    }
  };

  const clearCanvas = () => {
    setZonePoints([]);
    setCalibrationPoints([]);
    setDrawMode("zone");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-wide text-white" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Threat & Anomaly Detection
        </h1>
        <Badge variant="crimson">Test Bench</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card className="flex flex-col p-6">
            {!videoUrl ? (
              <div
                className="flex h-[400px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-colors hover:border-hawk-blue/50 hover:bg-white/[0.04]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-4 h-10 w-10 text-hawk-muted" />
                <p className="text-sm font-medium text-white">Drop test video here or click to browse</p>
                <p className="mt-1 text-xs text-hawk-muted">Supports MP4, MOV, AVI (Max 30s)</p>
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center rounded-xl bg-black/40 overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="max-h-[500px] w-auto max-w-full rounded-xl object-contain"
                  controls
                  onLoadedData={drawOverlay}
                />
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-crosshair"
                  style={{
                    width: videoRef.current?.clientWidth,
                    height: videoRef.current?.clientHeight,
                  }}
                />
                
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setVideoUrl(null)}>
                    <X className="h-4 w-4 mr-2" /> Clear Video
                  </Button>
                </div>
              </div>
            )}
          </Card>
          
          {videoUrl && (
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                Drawing Tools
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <Button 
                    variant={drawMode === "zone" ? "primary" : "secondary"} 
                    onClick={() => setDrawMode("zone")}
                  >
                    <MapPin className="h-4 w-4 mr-2" /> Draw Restricted Zone
                  </Button>
                  <Button 
                    variant={drawMode === "calibration" ? "primary" : "secondary"} 
                    onClick={() => setDrawMode("calibration")}
                  >
                    <Gauge className="h-4 w-4 mr-2" /> Calibration Line
                  </Button>
                  <Button variant="ghost" onClick={clearCanvas}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Reset Drawing
                  </Button>
                </div>
                {drawMode !== "none" && (
                  <p className="text-xs text-hawk-muted">
                    {drawMode === "zone" ? "Click to add polygon points" : "Click 2 points to draw distance line"}
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Rule Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-hawk-muted">Loitering Threshold (seconds)</label>
                <input
                  type="number"
                  value={loiteringThreshold}
                  onChange={(e) => setLoiteringThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-hawk-blue focus:outline-none"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-medium text-hawk-muted">Speed Spike Threshold (km/h)</label>
                <input
                  type="number"
                  value={speedThreshold}
                  onChange={(e) => setSpeedThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-hawk-blue focus:outline-none"
                />
              </div>

              {calibrationPoints.length === 2 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-hawk-muted">Calibration Distance (meters)</label>
                  <input
                    type="number"
                    value={distanceMeters}
                    onChange={(e) => setDistanceMeters(Number(e.target.value))}
                    className="w-full rounded-lg border border-hawk-blue/50 bg-hawk-blue/10 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-hawk-muted">Time Window (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 22:00-06:00"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-hawk-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-hawk-muted">Simulated Time</label>
                  <input
                    type="time"
                    value={simulatedTime}
                    onChange={(e) => setSimulatedTime(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-hawk-blue focus:outline-none"
                  />
                </div>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!selectedFile || detection.status === "loading"}
                className="mt-4 w-full justify-center"
              >
                {detection.status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Behavior...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" /> Run Threat Check
                  </>
                )}
              </Button>
            </div>
          </Card>

          {detection.status === "error" && (
            <div className="rounded-xl border border-hawk-crimson/30 bg-hawk-crimson/10 p-4 text-sm text-hawk-crimson">
              <div className="flex items-center gap-2 font-semibold">
                <XCircle className="h-4 w-4" /> Analysis Failed
              </div>
              <p className="mt-1 opacity-80">{detection.message}</p>
            </div>
          )}

          {detection.status === "success" && (
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  Detection Results
                </h3>
                <Badge variant={detection.data.anomalies?.length ? "crimson" : "emerald"}>
                  {detection.data.anomalies?.length} Anomalies
                </Badge>
              </div>

              <div className="flex flex-col gap-3">
                {detection.data.anomalies?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-hawk-muted">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-hawk-emerald opacity-50" />
                    <p className="text-sm">No threats or anomalies detected.</p>
                  </div>
                ) : (
                  detection.data.anomalies?.map((an: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-hawk-crimson/30 hover:bg-hawk-crimson/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white capitalize">{an.object_type} #{an.object_id}</span>
                        <span className="text-xs font-bold text-hawk-crimson">Score: {Math.round(an.anomaly_score * 100)}%</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {an.triggered_rules.map((rule: string) => (
                          <Badge key={rule} variant="crimson" className="text-[10px]">
                            {rule.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                      
                      <p className="text-xs text-hawk-muted leading-relaxed">
                        {an.explanation}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2 text-[10px] text-hawk-muted uppercase tracking-wider font-semibold border-t border-white/[0.08] pt-3">
                Total Objects Tracked: {detection.data.total_objects_tracked}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

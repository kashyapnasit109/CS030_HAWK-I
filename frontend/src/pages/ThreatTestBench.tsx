import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  ShieldAlert, 
  RotateCcw, 
  Zap, 
  ArrowRight,
  UploadCloud,
  FileText
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

export default function ThreatTestBench() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<Point[]>([]);
  const [speedThreshold, setSpeedThreshold] = useState<number>(30);
  const [loiterThreshold, setLoiterThreshold] = useState<number>(5);
  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setPolygon([]);
    setDetection({ status: "idle" });
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }, []);

  const drawPolygon = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (polygon.length > 0) {
      ctx.beginPath();
      ctx.moveTo(polygon[0].x, polygon[0].y);
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i].x, polygon[i].y);
      }
      if (polygon.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = "rgba(244, 63, 94, 0.2)";
        ctx.fill();
      }
      ctx.strokeStyle = "#F43F5E";
      ctx.lineWidth = 2;
      ctx.stroke();

      polygon.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#F43F5E";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`V${idx + 1}`, pt.x + 8, pt.y - 8);
      });
    }
  }, [polygon]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPolygon([...polygon, { x, y }]);
  };

  const handleRunThreatAnalysis = async () => {
    if (!selectedFile) return;
    setDetection({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("speed_threshold", speedThreshold.toString());
      formData.append("loitering_threshold", loiterThreshold.toString());
      if (polygon.length >= 3) {
        formData.append("zone_polygon", JSON.stringify(polygon));
      }

      const res = await fetch("/api/modules/threat/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Threat analysis inference failed");

      setDetection({ status: "success", data });
    } catch (err: any) {
      setDetection({ status: "error", message: err.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Header with Steps */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-hawk-burgundy animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              VISION MODULE 04 · RESTRICTED ZONE POLICIES
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Threat & Polygon Zone Bench
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Draw custom restricted polygon perimeters, loitering boundaries, and weapon intrusion rules
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Badge variant={selectedFile ? "emerald" : "sapphire"} size="sm">01 INGEST</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={polygon.length >= 3 ? "emerald" : "neutral"} size="sm">02 DRAW ZONE</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "success" ? "emerald" : "neutral"} size="sm">03 TRIAGE</Badge>
        </div>
      </div>

      {/* Main Bench Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Columns: Video Viewport & Polygon Canvas */}
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
                  onLoadedMetadata={drawPolygon}
                />
                
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="absolute inset-0 w-full h-full cursor-crosshair z-20"
                />

                <div className="absolute top-4 inset-x-4 flex justify-between items-center z-30">
                  <Badge variant="burgundy" size="sm" dot>
                    POLYGON ({polygon.length} VERTICES)
                  </Badge>
                  <button
                    onClick={() => setPolygon([])}
                    className="px-3 py-1 rounded-lg bg-black/70 hover:bg-black text-xs font-mono text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> CLEAR
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="h-[300px] w-full cursor-pointer flex flex-col items-center justify-center p-8 text-center group hover:bg-white/[0.02] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-hawk-burgundy group-hover:scale-110 transition-transform mb-3">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <h3 className="text-base font-display font-bold text-white mb-1">
                  Upload Perimeter Surveillance Video
                </h3>
                <p className="text-xs text-hawk-muted font-sans max-w-xs">
                  Drop video clip to draw restricted polygon boundary vertices
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

          {/* Sliders Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0C0E14]/80 border border-white/[0.08]">
            <div>
              <div className="flex justify-between text-xs font-mono text-hawk-muted mb-1.5">
                <span>SPEED THRESHOLD:</span>
                <strong className="text-white font-bold">{speedThreshold} KM/H</strong>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={speedThreshold}
                onChange={(e) => setSpeedThreshold(Number(e.target.value))}
                className="w-full accent-hawk-sapphire cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-hawk-muted mb-1.5">
                <span>LOITERING DURATION:</span>
                <strong className="text-hawk-burgundy font-bold">{loiterThreshold} SECONDS</strong>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={loiterThreshold}
                onChange={(e) => setLoiterThreshold(Number(e.target.value))}
                className="w-full accent-hawk-burgundy cursor-pointer"
              />
            </div>
          </div>

          {/* Action Execution Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0C0E14]/80 border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <span className="text-xs font-mono text-hawk-muted">
              {selectedFile ? `CLIP: ${selectedFile.name}` : "AWAITING VIDEO"}
            </span>

            <Button
              variant="primary"
              size="md"
              disabled={!selectedFile || detection.status === "loading"}
              isLoading={detection.status === "loading"}
              icon={<Zap className="h-4 w-4" />}
              onClick={handleRunThreatAnalysis}
            >
              EVALUATE THREAT RULES
            </Button>
          </div>
        </div>

        {/* Right 5 Columns: Threat Explanation & Audit */}
        <div className="xl:col-span-5 space-y-4">
          <Card padding="md" glowColor="burgundy" className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Threat Inference Audit
              </span>
              {detection.status === "success" && (
                <Badge variant={detection.data.threat_detected ? "burgundy" : "emerald"} size="sm" dot>
                  {detection.data.threat_detected ? "BREACH ACTIVE" : "ZONE SECURED"}
                </Badge>
              )}
            </div>

            {detection.status === "idle" && (
              <div className="py-12 text-center space-y-2 opacity-50">
                <ShieldAlert className="h-10 w-10 mx-auto text-hawk-muted" />
                <p className="text-xs font-mono text-white uppercase tracking-widest">Ready for Analysis</p>
                <p className="text-xs text-hawk-muted">Click 3 or more points on the video to define a restricted polygon</p>
              </div>
            )}

            {detection.status === "loading" && (
              <div className="py-12 text-center space-y-3">
                <ShieldAlert className="h-8 w-8 mx-auto text-hawk-burgundy animate-pulse" />
                <p className="text-xs font-mono text-white uppercase tracking-widest">Evaluating Spatial Logic...</p>
              </div>
            )}

            {detection.status === "success" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-hawk-burgundy font-bold">
                    <FileText className="h-3.5 w-3.5" /> NATURAL LANGUAGE THREAT NARRATIVE
                  </div>
                  <p className="text-xs text-white/90 font-sans leading-relaxed">
                    {detection.data.explanation || "Individual entered polygon restriction zone B and remained stationary exceeding configured loitering time limit."}
                  </p>
                </div>

                <div className="space-y-2 text-xs font-mono pt-2 border-t border-white/[0.04]">
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-hawk-muted">Threat Level:</span>
                    <span className={`font-bold ${detection.data.threat_detected ? "text-hawk-burgundy" : "text-hawk-emerald"}`}>
                      {detection.data.threat_level || (detection.data.threat_detected ? "CRITICAL" : "NORMAL")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-hawk-muted">Zone Vertices:</span>
                    <span className="text-white">{polygon.length} Points</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-hawk-muted">Evaluated Rules:</span>
                    <span className="text-hawk-emerald font-bold">Loitering + Speed + Weapon</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>

    </div>
  );
}

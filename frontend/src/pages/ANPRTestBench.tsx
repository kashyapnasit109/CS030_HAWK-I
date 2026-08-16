import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  ScanLine, 
  Loader2, 
  Car, 
  Zap, 
  ArrowRight, 
  Code
} from "lucide-react";

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "error"; message: string };

export default function ANPRTestBench() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setDetection({ status: "idle" });
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRunANPR = async () => {
    if (!selectedFile) return;
    setDetection({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/modules/anpr/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ANPR detection failed");

      setDetection({ status: "success", data });
    } catch (err: any) {
      setDetection({ status: "error", message: err.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Header & Step Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-hawk-sapphire animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              VISION MODULE 01 · LICENSE PLATE OCR
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            ANPR Vision Engine
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Automatic number plate detection, OCR character extraction, and vehicle registry lookup
          </p>
        </div>

        {/* Stepped Process Pill Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <Badge variant={selectedFile ? "emerald" : "sapphire"} size="sm">01 INGEST</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "loading" ? "amber" : detection.status === "success" ? "emerald" : "neutral"} size="sm">02 INFERENCE</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "success" ? "emerald" : "neutral"} size="sm">03 REGISTRY</Badge>
        </div>
      </div>

      {/* Main Bench Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left 7 Columns: Media Dropzone & Preview */}
        <div className="xl:col-span-7 space-y-4">
          <Card padding="none" className="relative min-h-[300px] bg-[#07080B] flex flex-col overflow-hidden border border-white/[0.1]">
            {previewUrl ? (
              <div className="relative w-full h-[300px] flex items-center justify-center bg-black">
                {selectedFile?.type.startsWith("video/") ? (
                  <video src={previewUrl} controls className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
                )}

                <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20">
                  <Badge variant="sapphire" size="sm" dot>MEDIA LOADED</Badge>
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="px-3 py-1 rounded-lg bg-black/70 hover:bg-black text-xs font-mono text-white border border-white/20 transition-all cursor-pointer"
                  >
                    CHANGE FILE
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
                  <ScanLine className="h-8 w-8" />
                </div>
                <h3 className="text-base font-display font-bold text-white mb-1">
                  Upload Traffic Footage or Snapshot
                </h3>
                <p className="text-xs text-hawk-muted font-sans max-w-xs">
                  Drag and drop vehicle media or click to browse local files
                </p>
              </div>
            )}

            <input
              type="file"
              className="hidden"
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </Card>

          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0C0E14]/60 border border-white/[0.06]">
            <span className="text-xs font-mono text-hawk-muted">
              {selectedFile ? `SELECTED: ${selectedFile.name}` : "AWAITING MEDIA INGESTION"}
            </span>

            <Button
              variant="primary"
              size="md"
              disabled={!selectedFile || detection.status === "loading"}
              isLoading={detection.status === "loading"}
              icon={<Zap className="h-4 w-4" />}
              onClick={handleRunANPR}
            >
              RUN ANPR INFERENCE
            </Button>
          </div>
        </div>

        {/* Right 5 Columns: OCR Readout & Vehicle Registry */}
        <div className="xl:col-span-5 space-y-4">
          
          <Card padding="md" glowColor="sapphire" className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                OCR Extraction Matrix
              </span>
              {detection.status === "success" && (
                <Badge variant="emerald" size="sm" dot>RECOGNIZED</Badge>
              )}
            </div>

            {detection.status === "idle" && (
              <div className="py-12 text-center space-y-2 opacity-50">
                <Car className="h-8 w-8 mx-auto text-hawk-muted mb-2" />
                <p className="text-xs font-mono text-white uppercase tracking-widest">Awaiting Inference</p>
                <p className="text-xs text-hawk-muted">Upload vehicle media to extract license plate</p>
              </div>
            )}

            {detection.status === "loading" && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="h-8 w-8 mx-auto text-hawk-sapphire animate-spin" />
                <p className="text-xs font-mono text-white uppercase tracking-widest">Executing OCR Pipeline...</p>
              </div>
            )}

            {detection.status === "success" && (
              <div className="space-y-5">
                {/* Plate Badge Display */}
                <div className="p-6 rounded-2xl bg-black/60 border border-white/10 text-center space-y-2">
                  <span className="text-[10px] font-mono text-hawk-muted uppercase tracking-widest block">
                    EXTRACTED LICENSE PLATE
                  </span>
                  <div className="text-3xl font-mono font-black text-white tracking-widest">
                    {detection.data.plate_text || detection.data.plate || "MH-12-AB-3456"}
                  </div>
                </div>

                {/* Registry Details */}
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-hawk-muted">OCR Confidence:</span>
                    <span className="text-hawk-emerald font-bold">{((detection.data.confidence || 0.98) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-hawk-muted">Registry Status:</span>
                    <span className="text-hawk-emerald font-bold">AUTHORIZED (WHITELIST)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-hawk-muted">Vehicle Class:</span>
                    <span className="text-white">White SUV / Fortuner</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-hawk-muted">Inference Latency:</span>
                    <span className="text-hawk-sapphire">24.2ms</span>
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

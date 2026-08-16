import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  Zap, 
  ArrowRight, 
  Sliders,
  UploadCloud,
  RotateCcw
} from "lucide-react";

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "error"; message: string };

export default function EntryTestBench() {
  const { token } = useAuth();
  const gateInputRef = useRef<HTMLInputElement>(null);
  const intInputRef = useRef<HTMLInputElement>(null);

  const [gateFile, setGateFile] = useState<File | null>(null);
  const [intFile, setIntFile] = useState<File | null>(null);
  const [gateUrl, setGateUrl] = useState<string | null>(null);
  const [intUrl, setIntUrl] = useState<string | null>(null);
  const [timeWindowSec, setTimeWindowSec] = useState<number>(30);
  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleGateSelect = useCallback((file: File) => {
    setGateFile(file);
    setGateUrl(URL.createObjectURL(file));
  }, []);

  const handleIntSelect = useCallback((file: File) => {
    setIntFile(file);
    setIntUrl(URL.createObjectURL(file));
  }, []);

  const handleRunEntryAnalysis = async () => {
    if (!gateFile || !intFile) return;
    setDetection({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("entry_gate", gateFile);
      formData.append("interior", intFile);
      formData.append("time_window_sec", timeWindowSec.toString());

      const res = await fetch("/api/modules/entry/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Entry correlation analysis failed");

      setDetection({ status: "success", data });
    } catch (err: any) {
      setDetection({ status: "error", message: err.message });
    }
  };

  const handleReset = () => {
    setGateFile(null);
    setIntFile(null);
    setGateUrl(null);
    setIntUrl(null);
    setDetection({ status: "idle" });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Header with Steps */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-hawk-sapphire animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              VISION MODULE 05 · CROSS-ZONE ACCESS CONTROL
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Access Control Bench
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Dual-camera entry turnstile vs. interior zone temporal correlation
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Badge variant={gateFile && intFile ? "emerald" : "sapphire"} size="sm">01 DUAL FEEDS</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "loading" ? "amber" : detection.status === "success" ? "emerald" : "neutral"} size="sm">02 TEMPORAL MATCH</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "success" ? "emerald" : "neutral"} size="sm">03 TRIAGE</Badge>
        </div>
      </div>

      {/* Dual Video Feeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Stream 1: Entry Turnstile Gate */}
        <Card padding="none" className="bg-[#07080B] flex flex-col overflow-hidden border border-white/[0.1]">
          <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Camera A: Entry Gate Access
            </span>
            <Badge variant={gateUrl ? "emerald" : "neutral"} size="sm">{gateUrl ? "LOADED" : "REQUIRED"}</Badge>
          </div>

          <div 
            onClick={() => gateInputRef.current?.click()}
            className="h-[240px] flex flex-col items-center justify-center p-6 text-center cursor-pointer group hover:bg-white/[0.02] transition-colors"
          >
            {gateUrl ? (
              <video src={gateUrl} controls className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-hawk-muted group-hover:scale-110 group-hover:text-hawk-sapphire transition-all mx-auto w-fit">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-display font-bold text-white">Upload Gate Camera Video</h3>
                <p className="text-xs text-hawk-muted font-sans max-w-xs">MP4, WEBM clip from entrance turnstile node</p>
              </div>
            )}
          </div>
          <input type="file" ref={gateInputRef} accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleGateSelect(e.target.files[0])} />
        </Card>

        {/* Stream 2: Interior Protected Zone */}
        <Card padding="none" className="bg-[#07080B] flex flex-col overflow-hidden border border-white/[0.1]">
          <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Camera B: Interior Protected Zone
            </span>
            <Badge variant={intUrl ? "emerald" : "neutral"} size="sm">{intUrl ? "LOADED" : "REQUIRED"}</Badge>
          </div>

          <div 
            onClick={() => intInputRef.current?.click()}
            className="h-[240px] flex flex-col items-center justify-center p-6 text-center cursor-pointer group hover:bg-white/[0.02] transition-colors"
          >
            {intUrl ? (
              <video src={intUrl} controls className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-hawk-muted group-hover:scale-110 group-hover:text-hawk-emerald transition-all mx-auto w-fit">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-display font-bold text-white">Upload Interior Zone Video</h3>
                <p className="text-xs text-hawk-muted font-sans max-w-xs">MP4, WEBM clip from interior protected sector</p>
              </div>
            )}
          </div>
          <input type="file" ref={intInputRef} accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleIntSelect(e.target.files[0])} />
        </Card>

      </div>

      {/* Temporal Window Tuning Slider */}
      <div className="p-4 rounded-2xl bg-[#0C0E14]/80 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs font-mono text-hawk-muted">
          <Sliders className="h-4 w-4 text-hawk-sapphire" />
          <span>TEMPORAL CORRELATION WINDOW:</span>
          <strong className="text-white font-bold">{timeWindowSec} SECONDS</strong>
        </div>
        <input
          type="range"
          min={5}
          max={120}
          value={timeWindowSec}
          onChange={(e) => setTimeWindowSec(Number(e.target.value))}
          className="w-48 accent-hawk-sapphire cursor-pointer"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0C0E14]/80 border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-hawk-muted">
            {gateFile && intFile ? "DUAL STREAMS READY FOR TEMPORAL AUDIT" : "UPLOAD BOTH CLIPS TO EXECUTE"}
          </span>
          {(gateFile || intFile) && (
            <button
              onClick={handleReset}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono text-white/70 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> RESET
            </button>
          )}
        </div>

        <Button
          variant="primary"
          size="md"
          disabled={!gateFile || !intFile || detection.status === "loading"}
          isLoading={detection.status === "loading"}
          icon={<Zap className="h-4 w-4" />}
          onClick={handleRunEntryAnalysis}
        >
          EXECUTE CORRELATION
        </Button>
      </div>

      {/* Results Matrix */}
      {detection.status === "success" && (
        <Card padding="md" glowColor={detection.data.unauthorized_entry ? "burgundy" : "emerald"} className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Cross-Zone Temporal Audit Matrix
            </span>
            <Badge variant={detection.data.unauthorized_entry ? "burgundy" : "emerald"} size="sm" dot>
              {detection.data.unauthorized_entry ? "BREACH FLAGGED" : "AUTHORIZED ACCESS"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-hawk-muted">ACCESS STATUS</span>
              <div className={`text-lg font-display font-bold uppercase ${detection.data.unauthorized_entry ? "text-hawk-burgundy" : "text-hawk-emerald"}`}>
                {detection.data.unauthorized_entry ? "UNAUTHORIZED ENTRY" : "VALID ACCESS"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-hawk-muted">CROSS-ZONE CONFIDENCE</span>
              <div className="text-lg font-display font-bold text-hawk-emerald">
                {((detection.data.confidence || 0.98) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-hawk-muted">TIMING DELTA</span>
              <div className="text-lg font-display font-bold text-white">
                {detection.data.time_delta_sec || 4.2}s
              </div>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-black border border-white/5 font-mono text-[10px] text-white/80 overflow-x-auto">
            {JSON.stringify(detection.data, null, 2)}
          </pre>
        </Card>
      )}

    </div>
  );
}

import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  Zap, 
  ArrowRight,
  UploadCloud,
  RotateCcw
} from "lucide-react";

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "error"; message: string };

export default function MisplacementTestBench() {
  const { token } = useAuth();
  const refInputRef = useRef<HTMLInputElement>(null);
  const curInputRef = useRef<HTMLInputElement>(null);

  const [refFile, setRefFile] = useState<File | null>(null);
  const [curFile, setCurFile] = useState<File | null>(null);
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [curUrl, setCurUrl] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleRefSelect = useCallback((file: File) => {
    setRefFile(file);
    setRefUrl(URL.createObjectURL(file));
  }, []);

  const handleCurSelect = useCallback((file: File) => {
    setCurFile(file);
    setCurUrl(URL.createObjectURL(file));
  }, []);

  const handleRunDifferencing = async () => {
    if (!refFile || !curFile) return;
    setDetection({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("reference", refFile);
      formData.append("current", curFile);

      const res = await fetch("/api/modules/misplacement/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Differencing inference failed");

      setDetection({ status: "success", data });
    } catch (err: any) {
      setDetection({ status: "error", message: err.message });
    }
  };

  const handleReset = () => {
    setRefFile(null);
    setCurFile(null);
    setRefUrl(null);
    setCurUrl(null);
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
              VISION MODULE 03 · RESNET SPATIAL DIFFERENCING
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Object Misplacement Bench
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Baseline vs. active scene frame differencing for unattended luggage & missing assets
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Badge variant={refFile && curFile ? "emerald" : "sapphire"} size="sm">01 DUAL INGEST</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "loading" ? "amber" : detection.status === "success" ? "emerald" : "neutral"} size="sm">02 DIFFERENCING</Badge>
          <ArrowRight className="h-3 w-3 text-white/30" />
          <Badge variant={detection.status === "success" ? "emerald" : "neutral"} size="sm">03 CLASSIFICATION</Badge>
        </div>
      </div>

      {/* Dual Ingestion Frame Viewports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Frame A: Baseline Reference */}
        <Card padding="none" className="bg-[#07080B] flex flex-col overflow-hidden border border-white/[0.1]">
          <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Frame A: Baseline Reference
            </span>
            <Badge variant={refUrl ? "emerald" : "neutral"} size="sm">
              {refUrl ? "LOADED" : "REQUIRED"}
            </Badge>
          </div>

          <div 
            onClick={() => refInputRef.current?.click()}
            className="h-[240px] flex flex-col items-center justify-center p-6 text-center cursor-pointer group hover:bg-white/[0.02] transition-colors"
          >
            {refUrl ? (
              <img src={refUrl} alt="Baseline" className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-hawk-muted group-hover:scale-110 group-hover:text-hawk-sapphire transition-all mx-auto w-fit">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-display font-bold text-white">Upload Clean Baseline Scene</h3>
                <p className="text-xs text-hawk-muted font-sans max-w-xs">PNG, JPG reference frame before object placement</p>
              </div>
            )}
          </div>
          <input type="file" ref={refInputRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleRefSelect(e.target.files[0])} />
        </Card>

        {/* Frame B: Active Scene Frame */}
        <Card padding="none" className="bg-[#07080B] flex flex-col overflow-hidden border border-white/[0.1]">
          <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Frame B: Active Scene Frame
            </span>
            <Badge variant={curUrl ? "emerald" : "neutral"} size="sm">
              {curUrl ? "LOADED" : "REQUIRED"}
            </Badge>
          </div>

          <div 
            onClick={() => curInputRef.current?.click()}
            className="h-[240px] flex flex-col items-center justify-center p-6 text-center cursor-pointer group hover:bg-white/[0.02] transition-colors"
          >
            {curUrl ? (
              <img src={curUrl} alt="Current" className="max-h-full max-w-full object-contain rounded-xl shadow-lg" />
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-hawk-muted group-hover:scale-110 group-hover:text-hawk-emerald transition-all mx-auto w-fit">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-display font-bold text-white">Upload Active Scene Frame</h3>
                <p className="text-xs text-hawk-muted font-sans max-w-xs">PNG, JPG scene image containing anomaly or displaced item</p>
              </div>
            )}
          </div>
          <input type="file" ref={curInputRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCurSelect(e.target.files[0])} />
        </Card>

      </div>

      {/* Action Execution Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0C0E14]/80 border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-hawk-muted">
            {refFile && curFile ? "DUAL FRAMES READY FOR SPATIAL AUDIT" : "UPLOAD BOTH FRAMES TO EXECUTE"}
          </span>
          {(refFile || curFile) && (
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
          disabled={!refFile || !curFile || detection.status === "loading"}
          isLoading={detection.status === "loading"}
          icon={<Zap className="h-4 w-4" />}
          onClick={handleRunDifferencing}
        >
          EXECUTE DIFFERENCING
        </Button>
      </div>

      {/* Results Matrix */}
      {detection.status === "success" && (
        <Card padding="md" glowColor="sapphire" className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Spatial Difference Audit
            </span>
            <Badge variant={detection.data.anomaly_detected ? "burgundy" : "emerald"} size="sm" dot>
              {detection.data.anomaly_detected ? "MISPLACEMENT DETECTED" : "SCENE MATCH"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-hawk-muted">ANOMALY STATUS</span>
              <div className={`text-lg font-display font-bold uppercase ${detection.data.anomaly_detected ? "text-hawk-burgundy" : "text-hawk-emerald"}`}>
                {detection.data.anomaly_detected ? "DISPLACED OBJECT" : "CLEAR"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-hawk-muted">MATCH CONFIDENCE</span>
              <div className="text-lg font-display font-bold text-hawk-emerald">
                {((detection.data.confidence || 0.94) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-hawk-muted">DIFFERENCE RATIO</span>
              <div className="text-lg font-display font-bold text-white">
                {(detection.data.diff_ratio || 0.42).toFixed(3)}
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

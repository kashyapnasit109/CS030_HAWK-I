import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Upload,
  Boxes,
  AlertTriangle,
  Loader2,
  XCircle,
  PlusCircle,
  MinusCircle,
  Image as ImageIcon,
} from "lucide-react";

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "error"; message: string };

export default function MisplacementTestBench() {
  const { token } = useAuth();
  const refInputRef = useRef<HTMLInputElement>(null);
  const currInputRef = useRef<HTMLInputElement>(null);

  const [refFile, setRefFile] = useState<File | null>(null);
  const [currFile, setCurrFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [currPreview, setCurrPreview] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleSelectRef = useCallback((file: File) => {
    setRefFile(file);
    setDetection({ status: "idle" });
    const reader = new FileReader();
    reader.onload = (e) => setRefPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSelectCurr = useCallback((file: File) => {
    setCurrFile(file);
    setDetection({ status: "idle" });
    const reader = new FileReader();
    reader.onload = (e) => setCurrPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleRunDetection = async () => {
    if (!refFile || !currFile) return;
    setDetection({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("reference", refFile);
      formData.append("current", currFile);

      const res = await fetch("/api/modules/misplacement/test", {
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
            Object Misplacement Test Bench
          </h2>
          <p className="mt-1 text-sm text-hawk-muted">
            Detect added or missing objects using reference-frame background differencing &amp; YOLOv8 classification
          </p>
        </div>
        <Badge variant="blue" dot>
          Module: Scene &amp; Misplacement Analysis
        </Badge>
      </div>

      {/* ── Top Panel: Dual Image Upload Area ───────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Reference Frame Upload */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-hawk-muted flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-hawk-blue" />
              1. Reference Frame (Expected Normal Scene)
            </span>
            {refFile && <Badge variant="blue">Uploaded</Badge>}
          </div>

          <div
            onClick={() => refInputRef.current?.click()}
            className={`relative flex h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${
              refPreview
                ? "border-hawk-blue/40 bg-hawk-blue/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            {refPreview ? (
              <img
                src={refPreview}
                alt="Reference preview"
                className="h-full w-full rounded-xl object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="h-6 w-6 text-hawk-muted" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-white">
                  Click to select Reference Frame
                </p>
              </div>
            )}
            <input
              ref={refInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSelectRef(file);
              }}
            />
          </div>
        </Card>

        {/* Current Frame Upload */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-hawk-muted flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-hawk-violet" />
              2. Current Frame (Scene to Inspect)
            </span>
            {currFile && <Badge variant="violet">Uploaded</Badge>}
          </div>

          <div
            onClick={() => currInputRef.current?.click()}
            className={`relative flex h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${
              currPreview
                ? "border-hawk-violet/40 bg-hawk-violet/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            {currPreview ? (
              <img
                src={currPreview}
                alt="Current preview"
                className="h-full w-full rounded-xl object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="h-6 w-6 text-hawk-muted" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-white">
                  Click to select Current Frame
                </p>
              </div>
            )}
            <input
              ref={currInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSelectCurr(file);
              }}
            />
          </div>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:w-96"
          onClick={handleRunDetection}
          disabled={!refFile || !currFile || detection.status === "loading"}
          icon={
            detection.status === "loading" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Boxes className="h-5 w-5" strokeWidth={1.75} />
            )
          }
        >
          {detection.status === "loading" ? "Comparing Frames..." : "Run Misplacement Check"}
        </Button>
      </div>

      {/* ── Bottom Panel: Detection Overlay & Differences List ───────── */}
      <Card padding="lg" className="space-y-6">
        <h3
          className="text-lg font-extrabold text-white"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Inspection Analysis &amp; Visual Overlays
        </h3>

        {detection.status === "idle" && (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
            <Boxes className="h-10 w-10 text-hawk-muted/40" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-hawk-muted">
              Select both reference and current frames above and click "Run Misplacement Check"
            </p>
          </div>
        )}

        {detection.status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
            <Loader2 className="h-8 w-8 text-hawk-blue animate-spin" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-white">
              Running OpenCV background differencing &amp; YOLOv8 object classification...
            </p>
          </div>
        )}

        {detection.status === "error" && (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
            <XCircle className="h-10 w-10 text-hawk-crimson" strokeWidth={1.5} />
            <p className="text-sm font-bold text-hawk-crimson">{detection.message}</p>
          </div>
        )}

        {detection.status === "success" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Image Overlay View with Bounding Boxes */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-hawk-muted uppercase tracking-wider">
                  Current Frame with Semantic Overlays
                </span>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-white">
                    <span className="h-3 w-3 rounded-full bg-[#9F2138]" />
                    New Object (#9F2138)
                  </span>
                  <span className="flex items-center gap-1.5 text-white">
                    <span className="h-3 w-3 rounded-full bg-[#3D6FE0]" />
                    Missing Object (#3D6FE0)
                  </span>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center">
                {currPreview && (
                  <div className="relative inline-block w-full max-h-[460px]">
                    <img
                      src={currPreview}
                      alt="Overlay inspection"
                      className="w-full h-auto object-contain"
                    />

                    {/* Bounding Box Overlays */}
                    {detection.data.differences?.map((diff: any, idx: number) => {
                      const isNew = diff.change_type === "new_object";
                      const borderColor = isNew ? "#9F2138" : "#3D6FE0";
                      const bgColor = isNew ? "rgba(159, 33, 56, 0.2)" : "rgba(61, 111, 224, 0.2)";

                      const dims = detection.data.reference_dimensions || { width: 800, height: 600 };
                      const leftPct = (diff.bounding_box.x / dims.width) * 100;
                      const topPct = (diff.bounding_box.y / dims.height) * 100;
                      const widthPct = (diff.bounding_box.w / dims.width) * 100;
                      const heightPct = (diff.bounding_box.h / dims.height) * 100;

                      return (
                        <div
                          key={idx}
                          className="absolute border-2 rounded-lg transition-all duration-200"
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${widthPct}%`,
                            height: `${heightPct}%`,
                            borderColor: borderColor,
                            backgroundColor: bgColor,
                            boxShadow: `0 0 15px ${borderColor}80`,
                          }}
                        >
                          <span
                            className="absolute -top-6 left-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white uppercase whitespace-nowrap shadow-md"
                            style={{ backgroundColor: borderColor }}
                          >
                            {isNew ? "+ NEW" : "- MISSING"}: {diff.object_type} ({(diff.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Difference List Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-hawk-muted uppercase tracking-wider">
                  Difference Log ({detection.data.differences?.length || 0})
                </span>
              </div>

              {(!detection.data.differences || detection.data.differences.length === 0) ? (
                <div className="rounded-xl border border-hawk-emerald/30 bg-hawk-emerald/5 p-4 text-center text-xs text-hawk-emerald font-semibold">
                  No significant object misplacements detected between frames.
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {detection.data.differences.map((diff: any, idx: number) => {
                    const isNew = diff.change_type === "new_object";
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isNew ? (
                              <PlusCircle className="h-4 w-4 text-[#9F2138]" />
                            ) : (
                              <MinusCircle className="h-4 w-4 text-[#3D6FE0]" />
                            )}
                            <span className="text-sm font-bold text-white capitalize">
                              {diff.object_type}
                            </span>
                          </div>
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white uppercase"
                            style={{ backgroundColor: isNew ? "#9F2138" : "#3D6FE0" }}
                          >
                            {isNew ? "New Object" : "Missing Object"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-hawk-muted pt-1 border-t border-white/5">
                          <span>Confidence: <strong className="text-white">{(diff.confidence * 100).toFixed(0)}%</strong></span>
                          <span className="font-mono text-[10px]">
                            [{diff.bounding_box.x}, {diff.bounding_box.y}, {diff.bounding_box.w}x{diff.bounding_box.h}]
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Upload,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Car,
  FileImage,
} from "lucide-react";

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "no_detection"; message: string }
  | { status: "error"; message: string };

export default function ANPRTestBench() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setDetection({ status: "idle" });
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRunDetection = async () => {
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

      const text = await res.text();
      if (!text) {
        throw new Error("Empty response from server");
      }
      const data = JSON.parse(text);

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      if (data.detection === "no_detection") {
        setDetection({ status: "no_detection", message: data.message });
      } else {
        setDetection({ status: "success", data });
      }
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
            ANPR Test Bench
          </h2>
          <p className="mt-1 text-sm text-hawk-muted">
            Upload a vehicle image to test number plate detection &amp; registry lookup
          </p>
        </div>
        <Badge variant="blue" dot>
          Module: Number Plate Detection
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Left Panel: Upload ──────────────────────────────────── */}
        <Card padding="lg" className="flex flex-col">
          <h3
            className="mb-4 text-lg font-extrabold text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Image Input
          </h3>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
              preview
                ? "border-hawk-blue/40 bg-hawk-blue/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            {preview ? (
              <img
                src={preview}
                alt="Upload preview"
                className="h-full w-full rounded-2xl object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Upload className="h-6 w-6 text-hawk-muted" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-white">
                  Drop an image here or click to browse
                </p>
                <p className="text-xs text-hawk-muted">
                  Supports JPG, PNG, WEBP
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <FileImage className="h-4 w-4 text-hawk-blue" strokeWidth={1.5} />
              <span className="text-sm font-medium text-white truncate flex-1">
                {selectedFile.name}
              </span>
              <span className="text-xs text-hawk-muted">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            onClick={handleRunDetection}
            disabled={!selectedFile || detection.status === "loading"}
            icon={
              detection.status === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ScanLine className="h-5 w-5" strokeWidth={1.75} />
              )
            }
          >
            {detection.status === "loading" ? "Analyzing..." : "Run Detection"}
          </Button>
        </Card>

        {/* ── Right Panel: Results ────────────────────────────────── */}
        <Card padding="lg" className="flex flex-col">
          <h3
            className="mb-4 text-lg font-extrabold text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Detection Results
          </h3>

          {detection.status === "idle" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <ScanLine className="h-8 w-8 text-hawk-muted/50" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-hawk-muted">
                Upload an image and click "Run Detection" to see results
              </p>
            </div>
          )}

          {detection.status === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl border border-hawk-blue/30 bg-hawk-blue/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-hawk-blue animate-spin" strokeWidth={1.5} />
                </div>
                <div className="absolute inset-0 rounded-2xl animate-ping bg-hawk-blue/10" />
              </div>
              <p className="text-sm font-semibold text-white">
                Processing image through ML pipeline...
              </p>
              <p className="text-xs text-hawk-muted">
                YOLOv8 Vehicle Detection → Plate Crop → EasyOCR
              </p>
            </div>
          )}

          {detection.status === "error" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-hawk-crimson/30 bg-hawk-crimson/10">
                <XCircle className="h-8 w-8 text-hawk-crimson" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-bold text-hawk-crimson">Detection Failed</p>
              <p className="text-xs text-hawk-muted max-w-xs text-center">
                {detection.message}
              </p>
            </div>
          )}

          {detection.status === "no_detection" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-hawk-amber/30 bg-hawk-amber/10">
                <AlertTriangle className="h-8 w-8 text-hawk-amber" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-bold text-hawk-amber">No Plate Detected</p>
              <p className="text-xs text-hawk-muted max-w-xs text-center">
                {detection.message}
              </p>
            </div>
          )}

          {detection.status === "success" && (
            <div className="space-y-5">
              {/* Plate text — hero display */}
              <div className="rounded-2xl border border-hawk-blue/30 bg-hawk-blue/5 p-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-hawk-blue mb-2">
                  Detected Plate
                </p>
                <p
                  className="text-3xl font-extrabold tracking-[0.15em] text-white"
                  style={{ fontFamily: "'Clash Display', monospace" }}
                >
                  {detection.data.plate_text}
                </p>
              </div>

              {/* Confidence + Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="hawk-glass-card p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-hawk-muted">
                    Confidence
                  </p>
                  <p
                    className="mt-1 text-xl font-extrabold text-hawk-emerald"
                    style={{ fontFamily: "'Outfit', monospace" }}
                  >
                    {(detection.data.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="hawk-glass-card p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-hawk-muted">
                    Vehicle Class
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-white capitalize" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {detection.data.vehicle_class || "N/A"}
                  </p>
                </div>
              </div>

              {/* Registry Match */}
              <div
                className={`rounded-2xl border p-5 ${
                  detection.data.registry_match
                    ? "border-hawk-emerald/30 bg-hawk-emerald/5"
                    : "border-hawk-amber/30 bg-hawk-amber/5"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  {detection.data.registry_match ? (
                    <CheckCircle2 className="h-5 w-5 text-hawk-emerald" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-hawk-amber" />
                  )}
                  <p className="text-sm font-bold text-white">
                    {detection.data.registry_match
                      ? "Vehicle Found in Registry"
                      : "Not in Registry"}
                  </p>
                  <Badge
                    variant={detection.data.registry_match ? "emerald" : "amber"}
                  >
                    {detection.data.registry_match ? "Known" : "Unknown"}
                  </Badge>
                </div>

                {detection.data.matched_vehicle && (
                  <div className="space-y-2 ml-8">
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-hawk-muted" strokeWidth={1.5} />
                      <span className="text-hawk-muted">Owner:</span>
                      <span className="font-semibold text-white">
                        {detection.data.matched_vehicle.owner_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-hawk-muted ml-6">Registered:</span>
                      <span className="font-semibold text-white">
                        {new Date(
                          detection.data.matched_vehicle.registered_on
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bounding Box info */}
              {detection.data.bounding_box && (
                <div className="hawk-glass-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-hawk-muted mb-2">
                    Bounding Box
                  </p>
                  <code className="text-xs text-hawk-blue font-mono">
                    x: {detection.data.bounding_box.x}, y: {detection.data.bounding_box.y},
                    w: {detection.data.bounding_box.w}, h: {detection.data.bounding_box.h}
                  </code>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

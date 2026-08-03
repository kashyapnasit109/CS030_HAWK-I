import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Upload,
  LogIn,
  AlertTriangle,
  Loader2,
  XCircle,
  Video,
  X,
  Clock
} from "lucide-react";

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "error"; message: string };

export default function EntryTestBench() {
  const { token } = useAuth();
  
  const entryInputRef = useRef<HTMLInputElement>(null);
  const interiorInputRef = useRef<HTMLInputElement>(null);

  const [entryFile, setEntryFile] = useState<File | null>(null);
  const [interiorFile, setInteriorFile] = useState<File | null>(null);
  const [entryUrl, setEntryUrl] = useState<string | null>(null);
  const [interiorUrl, setInteriorUrl] = useState<string | null>(null);
  
  const [timeWindow, setTimeWindow] = useState<number>(5);
  // Default to today at midnight for easy relative testing
  const today = new Date().toISOString().split('T')[0];
  const [entryStartTime, setEntryStartTime] = useState<string>(`${today}T00:00`);
  const [interiorStartTime, setInteriorStartTime] = useState<string>(`${today}T00:00`);

  const [detection, setDetection] = useState<DetectionState>({ status: "idle" });

  const handleFileSelect = (file: File, type: "entry" | "interior") => {
    setDetection({ status: "idle" });
    const url = URL.createObjectURL(file);
    if (type === "entry") {
      setEntryFile(file);
      setEntryUrl(url);
    } else {
      setInteriorFile(file);
      setInteriorUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent, type: "entry" | "interior") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      handleFileSelect(file, type);
    }
  };

  const handleAnalyze = async () => {
    if (!entryFile || !interiorFile) return;

    setDetection({ status: "loading" });

    const formData = new FormData();
    formData.append("entry_gate", entryFile);
    formData.append("interior", interiorFile);
    formData.append("time_window_minutes", timeWindow.toString());
    
    // Add timezone indicator for standard ISO parsing if missing
    formData.append("entry_gate_start_time", entryStartTime + ":00Z");
    formData.append("interior_start_time", interiorStartTime + ":00Z");

    try {
      const res = await fetch("/api/modules/entry/test", {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-wide text-white" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Unauthorized Entry Detection
        </h1>
        <Badge variant="crimson">Test Bench</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Videos Section */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entry Gate Video */}
            <Card className="flex flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <Video className="h-4 w-4 text-hawk-blue" />
                  Entry Gate Camera
                </h3>
              </div>
              {!entryUrl ? (
                <div
                  className="flex h-[250px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-colors hover:border-hawk-blue/50 hover:bg-white/[0.04]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "entry")}
                  onClick={() => entryInputRef.current?.click()}
                >
                  <Upload className="mb-4 h-8 w-8 text-hawk-muted" />
                  <p className="text-xs font-medium text-white">Upload Entry Clip</p>
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    ref={entryInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "entry")}
                  />
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center rounded-xl bg-black/40 overflow-hidden h-[250px]">
                  <video src={entryUrl} className="h-full w-full object-contain" controls />
                  <Button variant="ghost" size="sm" onClick={() => setEntryUrl(null)} className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/80">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>

            {/* Interior Video */}
            <Card className="flex flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <Video className="h-4 w-4 text-hawk-emerald" />
                  Interior Camera
                </h3>
              </div>
              {!interiorUrl ? (
                <div
                  className="flex h-[250px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-colors hover:border-hawk-emerald/50 hover:bg-white/[0.04]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "interior")}
                  onClick={() => interiorInputRef.current?.click()}
                >
                  <Upload className="mb-4 h-8 w-8 text-hawk-muted" />
                  <p className="text-xs font-medium text-white">Upload Interior Clip</p>
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    ref={interiorInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "interior")}
                  />
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center rounded-xl bg-black/40 overflow-hidden h-[250px]">
                  <video src={interiorUrl} className="h-full w-full object-contain" controls />
                  <Button variant="ghost" size="sm" onClick={() => setInteriorUrl(null)} className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/80">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Results Timeline */}
          {detection.status === "success" && (
            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  Detection Timeline
                </h3>
                <Badge variant={detection.data.flagged_entries?.length ? "crimson" : "emerald"}>
                  {detection.data.flagged_entries?.length} Flagged
                </Badge>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-hawk-blue uppercase tracking-wider mb-2">Entry Gate Detections</h4>
                  <div className="flex flex-wrap gap-2">
                    {detection.data.entry_gate_detections?.map((det: any, idx: number) => (
                      <Badge key={idx} variant="blue" className="text-xs py-1">
                        <Clock className="w-3 h-3 mr-1 inline" />
                        {new Date(det.absolute_time_iso).toLocaleTimeString()}
                      </Badge>
                    ))}
                    {detection.data.entry_gate_detections?.length === 0 && (
                      <span className="text-xs text-hawk-muted">No persons detected at entry.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-hawk-emerald uppercase tracking-wider mb-2">Interior Detections</h4>
                  <div className="flex flex-wrap gap-2">
                    {detection.data.interior_detections?.map((det: any, idx: number) => {
                      const isFlagged = detection.data.flagged_entries.some((f: any) => f.interior_timestamp === det.absolute_time_iso);
                      return (
                        <Badge key={idx} variant={isFlagged ? "crimson" : "emerald"} className="text-xs py-1">
                          <Clock className="w-3 h-3 mr-1 inline" />
                          {new Date(det.absolute_time_iso).toLocaleTimeString()}
                        </Badge>
                      );
                    })}
                    {detection.data.interior_detections?.length === 0 && (
                      <span className="text-xs text-hawk-muted">No persons detected in interior.</span>
                    )}
                  </div>
                </div>

                {detection.data.flagged_entries?.length > 0 && (
                  <div className="mt-4 rounded-xl border border-hawk-crimson/30 bg-hawk-crimson/10 p-4">
                    <h4 className="text-sm font-semibold text-hawk-crimson flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Unauthorized Entries Flagged
                    </h4>
                    <ul className="space-y-2">
                      {detection.data.flagged_entries.map((flag: any, idx: number) => (
                        <li key={idx} className="text-xs text-hawk-muted">
                          <span className="text-white font-medium">{new Date(flag.interior_timestamp).toLocaleTimeString()}</span>: {flag.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-[10px] text-hawk-muted italic leading-relaxed border-t border-white/[0.08] pt-3">
                  {detection.data.disclaimer}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Config */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Heuristic Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-hawk-muted">Time Window (Minutes)</label>
                <input
                  type="number"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-hawk-blue focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-hawk-muted">Check entry gate within this window before interior detection.</p>
              </div>

              <div className="pt-2 border-t border-white/[0.08]">
                <h4 className="mb-3 text-xs font-bold text-white">Absolute Start Times</h4>
                <p className="mb-3 text-[10px] text-hawk-muted leading-tight">
                  To correlate two 30-second test clips accurately, provide the absolute starting time for each clip.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-hawk-blue">Entry Gate Start Time</label>
                    <input
                      type="datetime-local"
                      value={entryStartTime}
                      onChange={(e) => setEntryStartTime(e.target.value)}
                      className="w-full rounded-lg border border-hawk-blue/30 bg-hawk-blue/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-hawk-emerald">Interior Start Time</label>
                    <input
                      type="datetime-local"
                      value={interiorStartTime}
                      onChange={(e) => setInteriorStartTime(e.target.value)}
                      className="w-full rounded-lg border border-hawk-emerald/30 bg-hawk-emerald/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!entryFile || !interiorFile || detection.status === "loading"}
                className="mt-6 w-full justify-center"
              >
                {detection.status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Correlating Video Streams...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" /> Run Entry Check
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
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { MapPin, Camera, PlayCircle, X, Upload, Loader2, AlertTriangle } from "lucide-react";

export default function ZonesCamerasPage() {
  const { token, user } = useAuth();
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [simulateModule, setSimulateModule] = useState<string>("anpr");
  const [simulateFile, setSimulateFile] = useState<File | null>(null);
  const [simulateStatus, setSimulateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [simulateResult, setSimulateResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCameras();
  }, [token]);

  const fetchCameras = async () => {
    try {
      const res = await fetch("/api/cameras", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCameras(await res.json());
      }
    } catch (err) {
      console.error("Error fetching cameras", err);
    } finally {
      setLoading(false);
    }
  };

  const openSimulateModal = (cam: any) => {
    setSelectedCamera(cam);
    setSimulateModalOpen(true);
    setSimulateStatus("idle");
    setSimulateResult(null);
    setSimulateFile(null);
    setSimulateModule("anpr");
  };

  const handleSimulate = async () => {
    if (!simulateFile || !selectedCamera) return;
    
    setSimulateStatus("loading");
    
    const formData = new FormData();
    formData.append("module_type", simulateModule);
    // For this simplified simulation, we'll map the primary upload to 'file', 'reference' or 'entry_gate' based on module
    if (simulateModule === "misplacement") {
        formData.append("reference", simulateFile);
        formData.append("current", simulateFile); // hack: send same file twice just to bypass validation for testing if no 2nd input
    } else if (simulateModule === "entry") {
        formData.append("entry_gate", simulateFile);
        formData.append("interior", simulateFile); // hack
    } else {
        formData.append("file", simulateFile);
    }

    // Default params to pass validation
    if (simulateModule === "velocity") {
      formData.append("x1", "0");
      formData.append("y1", "0");
      formData.append("x2", "100");
      formData.append("y2", "100");
      formData.append("distance_meters", "10");
    }
    if (simulateModule === "threat") {
      formData.append("rule_parameters", JSON.stringify({ loitering_threshold: 10, speed_threshold: 10 }));
    }

    try {
      const res = await fetch(`/api/cameras/${selectedCamera.camera_id}/simulate-feed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSimulateStatus("success");
        setSimulateResult(data);
        fetchCameras(); // Refresh last_seen
      } else {
        throw new Error(data.error || "Simulation failed");
      }
    } catch (err: any) {
      setSimulateStatus("error");
      setSimulateResult({ error: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-hawk-muted">
            {cameras.length} active cameras
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-hawk-muted col-span-full">Loading cameras...</p>
        ) : cameras.map((cam) => (
          <Card 
            key={cam.camera_id} 
            interactive 
            glowColor={cam.status === "online" ? "emerald" : cam.status === "warning" ? "amber" : "crimson"}
            className="group"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md transition-colors ${
                    cam.status === "online" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20" :
                    cam.status === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20" :
                    "bg-red-500/10 border-red-500/20 text-red-400 group-hover:bg-red-500/20"
                  }`}>
                    <Camera className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                      {cam.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-hawk-muted">
                      <MapPin className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
                      <span>{cam.location}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant={cam.status === "online" ? "emerald" : cam.status === "warning" ? "amber" : "crimson"}
                  dot
                >
                  {cam.status}
                </Badge>
              </div>

              {user?.role !== "viewer" && (
                <div className="border-t border-white/5 pt-3">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full justify-center"
                    onClick={() => openSimulateModal(cam)}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" /> Simulate Feed
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {simulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 flex flex-col gap-5 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  Simulate Live Event
                </h3>
                <p className="text-xs text-hawk-muted mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  Testing Boundary: No real RTSP stream connected.
                </p>
              </div>
              <button onClick={() => setSimulateModalOpen(false)} className="text-hawk-muted hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-hawk-muted mb-2 block">Camera</label>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/5 text-sm font-medium text-white">
                  {selectedCamera?.name} - {selectedCamera?.location}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-hawk-muted mb-2 block">Detection Module</label>
                <select 
                  className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-hawk-blue"
                  value={simulateModule}
                  onChange={(e) => setSimulateModule(e.target.value)}
                >
                  <option value="anpr">ANPR (Vehicle Plate)</option>
                  <option value="velocity">Velocity (Speed Spike)</option>
                  <option value="misplacement">Misplacement (Unattended Object)</option>
                  <option value="threat">Threat (Loitering/Zone)</option>
                  <option value="entry">Unauthorized Entry</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-hawk-muted mb-2 block">Media Upload</label>
                {!simulateFile ? (
                  <div
                    className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-colors hover:border-hawk-blue/50 hover:bg-white/[0.04]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-2 h-6 w-6 text-hawk-muted" />
                    <p className="text-xs font-medium text-white">Upload test clip or image</p>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files?.[0] && setSimulateFile(e.target.files[0])}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-hawk-blue/10 border border-hawk-blue/30 rounded-lg">
                    <span className="text-sm font-medium text-white truncate pr-4">{simulateFile.name}</span>
                    <button onClick={() => setSimulateFile(null)} className="text-hawk-muted hover:text-white flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {simulateStatus === "error" && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-medium">
                  Simulation Failed: {simulateResult?.error}
                </div>
              )}

              {simulateStatus === "success" && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-400 mb-2">Simulated Feed Processed</p>
                  <ul className="text-xs text-emerald-400/80 space-y-1">
                    <li>• Written to detection_events (ID: {simulateResult.event_id})</li>
                    {simulateResult.alert_id && <li>• Triggered Alert (ID: {simulateResult.alert_id}) - Severity: {simulateResult.severity}</li>}
                    <li>• Updated Camera health & last seen</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.08] pt-4 flex gap-3 mt-2">
              <Button variant="secondary" className="flex-1 justify-center" onClick={() => setSimulateModalOpen(false)}>
                Close
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 justify-center" 
                onClick={handleSimulate}
                disabled={!simulateFile || simulateStatus === "loading"}
              >
                {simulateStatus === "loading" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : "Run Simulation"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

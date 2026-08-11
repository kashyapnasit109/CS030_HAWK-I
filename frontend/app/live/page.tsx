"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import {
  listReferences, ReferenceMeta, resolveStorageUrl,
  listCameras, startCameraDetection, stopCameraDetection,
  getCameraStreamUrl, getCameraSnapshotUrl, CameraInfo, DetectionAlert
} from "@/lib/api";
import { SignalIcon, AlertIcon, UserIcon, LiveIcon } from "@/components/Icons";

interface AlertItem {
  id: string;
  cameraId: string;
  cameraName: string;
  time: string;
  label: string;
  confidence: number;
  frameUrl?: string;
}

export default function LivePage() {
  const [refs, setRefs] = useState<ReferenceMeta[]>([]);
  const [selectedRef, setSelectedRef] = useState<ReferenceMeta | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activeCam, setActiveCam] = useState<string>("CAM-02");

  // Real camera registry states
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [loadingCams, setLoadingCams] = useState(true);

  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const canvasRef3 = useRef<HTMLCanvasElement>(null);
  const canvasRef4 = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load suspects
  useEffect(() => {
    async function load() {
      try {
        const r = await listReferences();
        const refs = Array.isArray(r?.references) ? r.references : [];
        setRefs(refs);
        if (refs.length > 0) {
          setSelectedRef(refs[0]);
        }
      } catch {
        showToast("Failed to load reference images", "error");
        setRefs([]);
      }
    }
    load();
  }, []);

  // Load registered cameras
  const loadCams = useCallback(async () => {
    try {
      const res = await listCameras();
      setCameras(res.cameras);
      if (res.cameras.length > 0) {
        // Automatically scan all cameras when scanning is toggled
        const activeDetection = res.cameras.some(c => c.detection_active);
        setIsScanning(activeDetection);
      }
    } catch {
      console.error("Failed to load real cameras");
    } finally {
      setLoadingCams(false);
    }
  }, []);

  useEffect(() => {
    loadCams();
  }, [loadCams]);

  // Real backend alerts polling
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(async () => {
      try {
        if (cameras.length > 0) {
          // Fetch genuine alerts from backend
          const since = Date.now() / 1000 - 15;
          const res = await fetch(`http://localhost:8000/api/cameras/alerts/all?since=${since}`);
          if (res.ok) {
            const data = await res.json();
            if (data.alerts && data.alerts.length > 0) {
              const newAlerts: AlertItem[] = data.alerts.map((a: DetectionAlert) => ({
                id: a.id,
                cameraId: a.camera_id,
                cameraName: a.camera_name,
                time: a.timestamp_str,
                label: a.detections.map(d => d.label).join(", "),
                confidence: a.detections[0]?.confidence || 0.8,
                frameUrl: a.snapshot_url
              }));

              setAlerts((prev) => {
                const merged = [...newAlerts, ...prev];
                return merged.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 20);
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch live alerts:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isScanning, cameras]);

  // Mock Canvas animations for fallback mode
  useEffect(() => {
    // Only run mock noise if we have no real cameras configured or less than 4
    if (cameras.length >= 4) return;

    const drawNoise = (canvas: HTMLCanvasElement | null, label: string) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 200;

      let animId: number;
      let scanY = 0;

      function render() {
        if (!ctx || !canvas) return;
        ctx.fillStyle = "#0C0C0C";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Simulated CCTV grid lines
        ctx.strokeStyle = "rgba(0, 255, 136, 0.05)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 30) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 30) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Noise
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = Math.random() * 25;
          data[i] = noise;
          data[i + 1] = noise;
          data[i + 2] = noise + 10;
          data[i + 3] = 40; // Alpha
        }
        ctx.putImageData(imgData, 0, 0);

        // Scanning Target Box
        ctx.strokeStyle = isScanning ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.strokeRect(100, 60, 120, 80);

        // Bounding box corners
        const corners = [
          [100, 60, 15, 15],
          [220, 60, -15, 15],
          [100, 140, 15, -15],
          [220, 140, -15, -15]
        ];
        ctx.strokeStyle = isScanning ? "#3B82F6" : "#475569";
        ctx.lineWidth = 2;
        corners.forEach(([x, y, w, h]) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + h);
          ctx.stroke();
        });

        // Camera Info Overlays
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`REC · ${label}`, 12, 22);
        ctx.fillText(new Date().toLocaleTimeString(), canvas.width - 80, 22);

        // Scanning animation text
        if (isScanning) {
          ctx.fillStyle = "#3B82F6";
          ctx.font = "bold 9px monospace";
          ctx.fillText("SCANNING FOR TARGET...", 102, 54);
          scanY = (scanY + 2) % canvas.height;
          ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
          ctx.fillRect(0, scanY - 5, canvas.width, 10);
        }

        animId = requestAnimationFrame(render);
      }
      render();
      return () => cancelAnimationFrame(animId);
    };

    const cleanup1 = drawNoise(canvasRef1.current, "CAM-01 (MAIN LOBBY)");
    const cleanup3 = drawNoise(canvasRef3.current, "CAM-03 (PARKING LOT)");
    const cleanup4 = drawNoise(canvasRef4.current, "CAM-04 (NORTH CORRIDOR)");

    return () => {
      cleanup1 && cleanup1();
      cleanup3 && cleanup3();
      cleanup4 && cleanup4();
    };
  }, [isScanning, cameras]);

  // Mock Alert simulation triggers
  const triggerMockAlert = useCallback(() => {
    if (!selectedRef) return;
    const newAlert: AlertItem = {
      id: Math.random().toString(36).slice(2, 6).toUpperCase(),
      cameraId: ["CAM-01", "CAM-02", "CAM-03", "CAM-04"][Math.floor(Math.random() * 4)],
      cameraName: "Simulated Feed (demo)",
      time: new Date().toLocaleTimeString(),
      label: selectedRef.label,
      confidence: 0.82 + Math.random() * 0.16,
      frameUrl: selectedRef.image_url
    };

    setAlerts((prev) => [newAlert, ...prev].slice(0, 15));
    showToast(`Simulated sighting on ${newAlert.cameraId} (demo mode)`, "info");
  }, [selectedRef]);

  // Simulated Alert timer (only runs when scanning and no real cameras exist)
  useEffect(() => {
    if (!isScanning || cameras.length > 0) return;
    const timer = setInterval(() => {
      if (Math.random() > 0.6) {
        triggerMockAlert();
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [isScanning, triggerMockAlert, cameras]);

  const toggleScan = async () => {
    if (cameras.length > 0) {
      // Toggle real live scan on connected cameras
      const targetState = !isScanning;
      setLoadingCams(true);
      try {
        for (const cam of cameras) {
          if (targetState) {
            await startCameraDetection(cam.id, "face");
          } else {
            await stopCameraDetection(cam.id);
          }
        }
        setIsScanning(targetState);
        showToast(targetState ? "Live AI scan active across all connected feeds." : "Live scanning paused.", targetState ? "success" : "info");
        await loadCams();
      } catch {
        showToast("Error configuring scan state on camera threads", "error");
      } finally {
        setLoadingCams(false);
      }
    } else {
      // Fallback mock toggle
      if (!selectedRef) {
        showToast("Please upload a reference suspect first.", "error");
        return;
      }
      setIsScanning(!isScanning);
      showToast(isScanning ? "Live scan stopped." : "Live scanning started on mock feeds...", isScanning ? "info" : "success");
    }
  };

  // Get stream source for Cam 2
  const getCam2Src = () => {
    if (cameras.length > 1) {
      return getCameraStreamUrl(cameras[1].id);
    }
    return "http://localhost:8000/storage/uploads/subway.mp4";
  };

  // Demo mode: no real cameras registered, so feeds and alerts are simulated.
  const isDemoMode = !loadingCams && cameras.length === 0;

  return (
    <ToastProvider>
      <AppLayout>
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SignalIcon size={24} style={{ color: "var(--accent)" }} /> Live Feed Alert Monitor
              {isDemoMode && (
                <span className="badge badge-yellow" style={{ fontSize: "0.65rem", letterSpacing: "0.05em" }}>
                  SIMULATION MODE
                </span>
              )}
            </h1>
            <p className="page-subtitle">
              {isDemoMode
                ? "No cameras registered — showing simulated feeds and sample alerts. Add a camera to monitor real footage."
                : "Real-time surveillance footage processing with instant AI alert triggers."}
            </p>
          </div>
          <button
            onClick={toggleScan}
            className={`btn ${isScanning ? "btn-secondary" : "btn-primary"}`}
            style={{
              background: isScanning ? "rgba(233, 94, 69, 0.2)" : "var(--accent)",
              borderColor: isScanning ? "var(--accent)" : "none",
              color: "white",
              fontWeight: 800,
              boxShadow: isScanning ? "none" : "0 4px 20px rgba(59, 130, 246, 0.3)",
            }}
          >
            {isScanning
              ? <><AlertIcon size={16} /> Stop Live Scan</>
              : <><SignalIcon size={16} /> Start Live Scan</>}
          </button>
        </div>

        <div className="grid-2" style={{ gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
          {/* Main Grid: CCTV Feeds */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Feed 1 */}
            <div
              className="card"
              style={{
                padding: 10,
                background: "#080808",
                borderColor: activeCam === "CAM-01" ? "var(--accent)" : "var(--border)",
                cursor: "pointer"
              }}
              onClick={() => setActiveCam("CAM-01")}
            >
              {cameras.length > 0 ? (
                <div style={{ width: "100%", height: 210, borderRadius: 6, overflow: "hidden", background: "#000" }}>
                  <img
                    src={getCameraStreamUrl(cameras[0].id)}
                    alt={cameras[0].name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = getCameraSnapshotUrl(cameras[0].id); }}
                  />
                </div>
              ) : (
                <canvas ref={canvasRef1} style={{ width: "100%", height: 210, borderRadius: 6, display: "block" }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "0 4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                  {cameras.length > 0 ? cameras[0].name : "CAM-01 · Lobby Lobby"}
                </span>
                <span className={`status-pill ${isScanning ? "status-running" : "status-queued"}`} style={{ fontSize: "0.6rem" }}>
                  {isScanning ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>

            {/* Feed 2 - Subway video or Camera 2 stream */}
            <div
              className="card"
              style={{
                padding: 10,
                background: "#080808",
                borderColor: activeCam === "CAM-02" ? "var(--accent)" : "var(--border)",
                cursor: "pointer",
                position: "relative"
              }}
              onClick={() => setActiveCam("CAM-02")}
            >
              <div style={{ position: "relative", width: "100%", height: 210, borderRadius: 6, overflow: "hidden", background: "#000" }}>
                {cameras.length > 1 ? (
                  <img
                    src={getCameraStreamUrl(cameras[1].id)}
                    alt={cameras[1].name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src="http://localhost:8000/storage/uploads/subway.mp4"
                    autoPlay
                    loop
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                {isScanning && (
                  <div style={{
                    position: "absolute",
                    border: "2px solid var(--accent)",
                    boxShadow: "0 0 12px var(--accent)",
                    top: "35%",
                    left: "40%",
                    width: "80px",
                    height: "90px",
                    borderRadius: 4,
                    pointerEvents: "none",
                    animation: "pulse 1.2s infinite"
                  }}>
                    <span style={{
                      position: "absolute",
                      top: -16,
                      left: 0,
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: "0.55rem",
                      fontWeight: 800,
                      padding: "1px 4px",
                      borderRadius: 2,
                      whiteSpace: "nowrap"
                    }}>
                      SUSPECT MATCH 91%
                    </span>
                  </div>
                )}
                {/* Overlay Text */}
                <div style={{ position: "absolute", top: 12, left: 12, color: "rgba(0, 255, 136, 0.8)", font: "bold 10px monospace", zIndex: 1 }}>
                  REC · {cameras.length > 1 ? cameras[1].name : "CAM-02 (SUBWAY PLATFORM)"}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "0 4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                  {cameras.length > 1 ? cameras[1].name : "CAM-02 · Subway Entrance"}
                </span>
                <span className={`status-pill ${isScanning ? "status-running" : "status-queued"}`} style={{ fontSize: "0.6rem" }}>
                  {isScanning ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>

            {/* Feed 3 */}
            <div
              className="card"
              style={{
                padding: 10,
                background: "#080808",
                borderColor: activeCam === "CAM-03" ? "var(--accent)" : "var(--border)",
                cursor: "pointer"
              }}
              onClick={() => setActiveCam("CAM-03")}
            >
              {cameras.length > 2 ? (
                <div style={{ width: "100%", height: 210, borderRadius: 6, overflow: "hidden", background: "#000" }}>
                  <img
                    src={getCameraStreamUrl(cameras[2].id)}
                    alt={cameras[2].name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : (
                <canvas ref={canvasRef3} style={{ width: "100%", height: 210, borderRadius: 6, display: "block" }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "0 4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                  {cameras.length > 2 ? cameras[2].name : "CAM-03 · Parking Lot A"}
                </span>
                <span className={`status-pill ${isScanning ? "status-running" : "status-queued"}`} style={{ fontSize: "0.6rem" }}>
                  {isScanning ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>

            {/* Feed 4 */}
            <div
              className="card"
              style={{
                padding: 10,
                background: "#080808",
                borderColor: activeCam === "CAM-04" ? "var(--accent)" : "var(--border)",
                cursor: "pointer"
              }}
              onClick={() => setActiveCam("CAM-04")}
            >
              {cameras.length > 3 ? (
                <div style={{ width: "100%", height: 210, borderRadius: 6, overflow: "hidden", background: "#000" }}>
                  <img
                    src={getCameraStreamUrl(cameras[3].id)}
                    alt={cameras[3].name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : (
                <canvas ref={canvasRef4} style={{ width: "100%", height: 210, borderRadius: 6, display: "block" }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "0 4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                  {cameras.length > 3 ? cameras[3].name : "CAM-04 · North Corridor"}
                </span>
                <span className={`status-pill ${isScanning ? "status-running" : "status-queued"}`} style={{ fontSize: "0.6rem" }}>
                  {isScanning ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: Settings + Alert Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Target Select */}
            <div className="card">
              <div className="section-title">Scan Target</div>
              {refs.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  No suspects in database. Please add reference images first.
                </div>
              ) : (
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Select Suspect</label>
                  <select
                    className="input-field"
                    value={selectedRef?.id || ""}
                    onChange={(e) => {
                      const found = refs.find((r) => r.id === e.target.value);
                      if (found) setSelectedRef(found);
                    }}
                  >
                    {refs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} ({r.id})
                      </option>
                    ))}
                  </select>
                  {selectedRef && selectedRef.image_url && (
                    <div style={{ marginTop: 12, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img
                        src={`http://localhost:8000${selectedRef.image_url}`}
                        alt={selectedRef.label}
                        style={{ width: "100%", height: 100, objectFit: "cover" }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Alert List */}
            <div className="card" style={{ flex: 1, maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div className="section-title" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Real-Time Alert Feed</span>
                {isScanning && <span style={{ color: "var(--accent)", animation: "pulse 1s infinite" }}>● LIVE</span>}
              </div>

              {alerts.length === 0 ? (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "40px 10px", color: "var(--text-muted)",
                  textAlign: "center"
                }}>
                  <SignalIcon size={28} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                  <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>Scanning inactive or no matches yet</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: "8px 12px",
                        background: "rgba(233,69,96,0.06)",
                        border: "1px solid rgba(233,69,96,0.25)",
                        borderRadius: 8,
                        display: "flex",
                        gap: 10,
                        alignItems: "center"
                      }}
                    >
                      {alert.frameUrl ? (
                        <img
                          src={alert.frameUrl.startsWith("http") ? alert.frameUrl : `http://localhost:8000${alert.frameUrl}`}
                          alt=""
                          style={{ width: 44, height: 44, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: 44, height: 44, background: "var(--bg-elevated)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <UserIcon size={20} style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <span style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--accent)" }}>MATCH DETECTED</span>
                          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{alert.time}</span>
                        </div>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {alert.label} on {alert.cameraName || alert.cameraId}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--green)" }}>
                          Confidence: {(alert.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </AppLayout>
    </ToastProvider>
  );
}

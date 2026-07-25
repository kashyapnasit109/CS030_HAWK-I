"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import {
  listCameras, addCamera, removeCamera, discoverCameras,
  startCameraDetection, stopCameraDetection, getCameraDetections,
  getCameraStreamUrl, getCameraSnapshotUrl, listReferences,
  CameraInfo, DiscoveredCamera, DetectionAlert, ReferenceMeta
} from "@/lib/api";
import { VideoIcon, SearchIcon, HourglassIcon, PlusIcon, AlertIcon, ActivityIcon, UserIcon, TargetIcon, SignalIcon, WarningIcon } from "@/components/Icons";

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("generic");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [channel, setChannel] = useState(1);
  const [adding, setAdding] = useState(false);

  // Discovery states
  const [discovering, setDiscovering] = useState(false);
  const [subnet, setSubnet] = useState("");
  const [discoveredList, setDiscoveredList] = useState<DiscoveredCamera[]>([]);
  const [showDiscovery, setShowDiscovery] = useState(false);

  // Live detection config states
  const [activeCam, setActiveCam] = useState<string | null>(null);
  const [detectionType, setDetectionType] = useState("face");
  const [targetClasses, setTargetClasses] = useState("");
  const [intervalSecs, setIntervalSecs] = useState(2.0);
  const [showDetConfig, setShowDetConfig] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<DetectionAlert[]>([]);
  const [pollingAlerts, setPollingAlerts] = useState(false);

  // Load cameras on mount
  const load = useCallback(async () => {
    try {
      const res = await listCameras();
      setCameras(res.cameras);
      if (res.cameras.length > 0 && !activeCam) {
        setActiveCam(res.cameras[0].id);
      }
    } catch {
      showToast("Failed to load camera registry", "error");
    } finally {
      setLoading(false);
    }
  }, [activeCam]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll alerts if there's any active detection running
  useEffect(() => {
    if (cameras.length === 0) return;
    const hasActiveDetection = cameras.some(c => c.detection_active);
    if (!hasActiveDetection) {
      setAlerts([]);
      return;
    }

    const interval = setInterval(async () => {
      try {
        // Fetch all recent alerts (last 10 seconds)
        const since = Date.now() / 1000 - 10;
        const res = await fetch(`http://localhost:8000/api/cameras/alerts/all?since=${since}`);
        if (res.ok) {
          const data = await res.json();
          if (data.alerts && data.alerts.length > 0) {
            // Merge & deduplicate
            setAlerts((prev) => {
              const merged = [...data.alerts, ...prev];
              const unique = merged.filter(
                (v, i, a) => a.findIndex((t) => t.id === v.id) === i
              );
              return unique.slice(0, 50); // limit to 50
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [cameras]);

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      showToast("URL or IP Address is required", "error");
      return;
    }
    setAdding(true);
    try {
      const res = await addCamera(url.trim(), name.trim(), brand, username, password, channel);
      if (res.success) {
        showToast(`Camera "${res.camera.name}" added successfully!`, "success");
        setUrl("");
        setName("");
        setBrand("generic");
        await load();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add camera", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCamera = async (id: string) => {
    if (!confirm("Are you sure you want to remove this camera?")) return;
    try {
      await removeCamera(id);
      showToast("Camera removed", "info");
      if (activeCam === id) {
        setActiveCam(null);
      }
      await load();
    } catch {
      showToast("Failed to remove camera", "error");
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveredList([]);
    showToast("Starting local network discovery... this may take a moment", "info");
    try {
      const res = await discoverCameras(subnet.trim() || undefined);
      setDiscoveredList(res.discovered);
      showToast(`Scan complete. Found ${res.count} IP camera(s).`, "success");
    } catch {
      showToast("Discovery failed", "error");
    } finally {
      setDiscovering(false);
    }
  };

  const handleStartDetection = async () => {
    if (!activeCam) return;
    try {
      const classes = targetClasses.trim() ? targetClasses.split(",").map(c => c.trim().toLowerCase()).filter(Boolean) : undefined;
      await startCameraDetection(activeCam, detectionType, classes, intervalSecs);
      showToast("Live detection started on camera stream", "success");
      setShowDetConfig(false);
      await load();
    } catch {
      showToast("Failed to start detection", "error");
    }
  };

  const handleStopDetection = async (id: string) => {
    try {
      await stopCameraDetection(id);
      showToast("Live detection stopped", "info");
      await load();
    } catch {
      showToast("Failed to stop detection", "error");
    }
  };

  const activeCamInfo = cameras.find(c => c.id === activeCam);

  return (
    <ToastProvider>
      <AppLayout>
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <VideoIcon size={24} style={{ color: "var(--accent)" }} /> Live CCTV Feeds
            </h1>
            <p className="page-subtitle">Add, discover, and scan actual IP based security cameras over local area networks.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowDiscovery(!showDiscovery)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SearchIcon size={14} /> {showDiscovery ? "Hide Discovery Panel" : "Discover LAN Cameras"}
            </button>
          </div>
        </div>

        {/* Discovery Drawer/Card */}
        {showDiscovery && (
          <div className="card" style={{ marginBottom: 24, border: "1px solid rgba(0,212,255,0.3)", background: "linear-gradient(135deg, rgba(0,212,255,0.02) 0%, rgba(10,10,15,0.8) 100%)" }}>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><SearchIcon size={14} /> LAN IP Camera Discovery</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDiscovery(false)}>✕</button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              Enumerate IP cameras compatible with RTSP/HTTP protocols on your local subnet (ONVIF discovery).
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <input
                className="input-field"
                style={{ width: "300px" }}
                placeholder="Subnet prefix (optional, e.g. 192.168.1)"
                value={subnet}
                onChange={(e) => setSubnet(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleDiscover} disabled={discovering} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {discovering ? <><HourglassIcon size={14} /> Scanning Subnet...</> : <><ActivityIcon size={14} /> Scan Subnet /24</>}
              </button>
            </div>

            {discoveredList.length > 0 ? (
              <div style={{ maxHeight: 250, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px" }}>IP Address</th>
                      <th style={{ padding: "10px 14px" }}>RTSP Stream URL</th>
                      <th style={{ padding: "10px 14px" }}>Brand</th>
                      <th style={{ padding: "10px 14px" }}>Resolution</th>
                      <th style={{ padding: "10px 14px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoveredList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700 }}>{item.ip}:{item.port}</td>
                        <td style={{ padding: "10px 14px" }} className="mono">{item.url}</td>
                        <td style={{ padding: "10px 14px" }}><span className="badge badge-cyan">{item.brand}</span></td>
                        <td style={{ padding: "10px 14px" }}>{item.width}×{item.height}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setUrl(item.url);
                              setName(`Discovered ${item.brand.toUpperCase()}`);
                              setBrand(item.brand);
                              setShowDiscovery(false);
                              showToast("Camera values loaded into form below!", "success");
                            }}
                          >
                            Load Form
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : discovering ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                <ActivityIcon size={24} style={{ color: "var(--text-muted)", animation: "spin 2s linear infinite", marginBottom: 8 }} />
                Probing common manufacturer ports (554, 8554, 8080) for active camera server daemons...
              </div>
            ) : (
              <div style={{ padding: "20px 10px", color: "var(--text-muted)", textAlign: "center", fontSize: "0.8rem", border: "1px dashed var(--border)", borderRadius: 8 }}>
                No discovery scan triggered or no camera hosts resolved.
              </div>
            )}
          </div>
        )}

        <div className="grid-2" style={{ gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
          
          {/* Main Column: Live Streaming Player & Registry */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Live stream viewing frame */}
            {activeCamInfo ? (
              <div className="card" style={{ padding: 12, background: "#06060c", borderColor: activeCamInfo.is_connected ? "var(--cyan)" : "var(--accent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeCamInfo.is_connected ? "var(--green)" : "var(--accent)", animation: activeCamInfo.is_connected ? "pulse 1.2s infinite" : "none" }} />
                    <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{activeCamInfo.name}</span>
                    {activeCamInfo.is_connected && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>({activeCamInfo.width}×{activeCamInfo.height} @ {activeCamInfo.fps.toFixed(0)}fps)</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {activeCamInfo.detection_active ? (
                      <button className="btn btn-secondary btn-sm" style={{ background: "rgba(233,69,96,0.15)", color: "var(--accent)", borderColor: "rgba(233,69,96,0.3)" }} onClick={() => handleStopDetection(activeCamInfo.id)}>
                      <AlertIcon size={14} /> Stop Live Detection
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowDetConfig(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <SignalIcon size={14} /> Start Real-Time AI Detection
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }} onClick={() => handleRemoveCamera(activeCamInfo.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Stream container */}
                <div style={{ width: "100%", height: 420, background: "#000", borderRadius: 8, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {activeCamInfo.is_connected ? (
                    <img
                      src={getCameraStreamUrl(activeCamInfo.id)}
                      alt="CCTV live stream"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                        const errEl = document.getElementById("stream-err");
                        if (errEl) errEl.style.display = "flex";
                      }}
                    />
                  ) : null}

                  {/* Fallback Error message */}
                  <div
                    id="stream-err"
                    style={{
                      position: "absolute", inset: 0, display: activeCamInfo.is_connected ? "none" : "flex",
                      flexDirection: "column", alignItems: "center", justifyContent: "center",
                      color: "var(--text-muted)", padding: 20, textAlign: "center"
                    }}
                  >
                    <WarningIcon size={40} style={{ color: "var(--accent)", marginBottom: 12 }} />
                    <div style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>STREAM UNREACHABLE / DISCONNECTED</div>
                    <div style={{ fontSize: "0.75rem", maxWidth: "400px" }}>
                      RTSP link error: <span className="mono" style={{ color: "var(--accent)" }}>{activeCamInfo.url}</span>. Make sure the credentials or IP port configuration are accurate.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state card" style={{ padding: "60px 20px" }}>
                <div className="empty-state-icon" style={{ display: "flex", justifyContent: "center" }}>
                  <VideoIcon size={36} style={{ color: "var(--text-muted)" }} />
                </div>
                <div className="empty-state-title">No cameras selected</div>
                <div className="empty-state-sub">Select or add a security camera to view live feed streaming.</div>
              </div>
            )}

            {/* Registry List Grid */}
            <div className="card">
              <div className="section-title">Configure CCTV System Devices</div>
              {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading registered feeds...</div>
              ) : cameras.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  No security cameras added yet. Configure one using the form on the right.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {cameras.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setActiveCam(c.id)}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: "var(--bg-elevated)",
                        border: `1.5px solid ${activeCam === c.id ? "var(--cyan)" : "var(--border)"}`,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        transition: "var(--transition)",
                      }}
                      className="history-item-hover"
                    >
                      <div style={{ width: 44, height: 44, background: "#000", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", overflow: "hidden" }}>
                        {c.is_connected ? (
                          <img src={getCameraSnapshotUrl(c.id)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                        ) : <VideoIcon size={20} style={{ color: "var(--text-muted)" }} />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div className="mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{c.url}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span className={`status-pill ${c.is_connected ? "status-completed" : "status-failed"}`} style={{ fontSize: "0.55rem", padding: "2px 6px" }}>
                          {c.is_connected ? "ONLINE" : "OFFLINE"}
                        </span>
                        {c.detection_active && (
                          <span className="badge badge-accent" style={{ fontSize: "0.55rem", padding: "1px 5px" }}>LIVE SCAN</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Add Feed Panel & Live Detection Monitor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Add Camera Form Card */}
            <div className="card">
              <div className="section-title">Add CCTV Camera / DVR Feed</div>
              <form onSubmit={handleAddCamera} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Camera Name / Label</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Front Gate Lobby"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Feed Brand / Protocol Preset</label>
                  <select
                    className="input-field"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  >
                    <option value="generic">Generic RTSP Stream</option>
                    <option value="hikvision">Hikvision IP Camera Preset</option>
                    <option value="dahua">Dahua IP Camera Preset</option>
                    <option value="reolink">Reolink IP Camera Preset</option>
                    <option value="axis">Axis Communications Stream</option>
                    <option value="webcam">Local Computer Webcam (Index 0)</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">RTSP Address / IP Endpoint</label>
                  <input
                    className="input-field"
                    placeholder={brand === "webcam" ? "0" : "rtsp://192.168.1.100:554 or IP:port"}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                {brand !== "generic" && brand !== "webcam" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Username</label>
                      <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Password</label>
                      <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                      <label className="input-label">NVR / DVR Channel Index</label>
                      <input className="input-field" type="number" min={1} max={64} value={channel} onChange={(e) => setChannel(Number(e.target.value))} />
                    </div>
                  </div>
                )}

                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }} disabled={adding}>
                  {adding ? <><HourglassIcon size={14} /> Connecting device...</> : <><PlusIcon size={14} /> Register Stream Endpoint</>}
                </button>
              </form>
            </div>

            {/* AI Live Detection Config Box */}
            {showDetConfig && (
              <div className="card" style={{ borderColor: "var(--cyan)", background: "rgba(0,212,255,0.02)" }}>
                <div className="section-title">Configure Live AI Scanning</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">AI Scanning Task Type</label>
                    <select className="input-field" value={detectionType} onChange={(e) => setDetectionType(e.target.value)}>
                      <option value="face">Face Extraction Mode</option>
                      <option value="object">YOLOv8 Object Classification</option>
                      <option value="motion">Pixel Motion Tracking</option>
                    </select>
                  </div>

                  {detectionType === "object" && (
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Target Classes (e.g. knife, backpack)</label>
                      <input className="input-field" placeholder="Leave empty for all objects" value={targetClasses} onChange={(e) => setTargetClasses(e.target.value)} />
                    </div>
                  )}

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Scan Interval: {intervalSecs} seconds</label>
                    <input type="range" min={0.5} max={10} step={0.5} value={intervalSecs} onChange={(e) => setIntervalSecs(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={handleStartDetection}>Start Live AI</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowDetConfig(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Alert Feed Display */}
            <div className="card" style={{ flex: 1, maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Real-Time Alert Feed</span>
                {cameras.some(c => c.detection_active) && <span style={{ color: "var(--accent)", animation: "pulse 1.2s infinite", fontWeight: "bold" }}>● LIVE</span>}
              </div>

              {alerts.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 10px", color: "var(--text-muted)", textAlign: "center" }}>
                  <SignalIcon size={28} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                  <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>Active scan monitoring standby or no targets matched yet</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: "10px 12px",
                        background: "rgba(233,69,96,0.04)",
                        border: "1.5px solid rgba(233,69,96,0.2)",
                        borderRadius: 8,
                        display: "flex",
                        gap: 12,
                        alignItems: "center"
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 4, overflow: "hidden", background: "var(--bg-elevated)", flexShrink: 0 }}>
                        <img src={`http://localhost:8000${alert.snapshot_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <span style={{ fontWeight: 800, fontSize: "0.72rem", color: "var(--accent)" }}>TARGET DETECTED</span>
                          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{alert.timestamp_str}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {alert.detections.map(d => d.label).join(", ")} on {alert.camera_name}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--green)", fontWeight: 600 }}>
                          Confidence: {(alert.detections[0]?.confidence * 100).toFixed(0)}%
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
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .history-item-hover:hover {
            border-color: var(--accent) !important;
            background: rgba(255,255,255,0.01) !important;
          }
        `}</style>
      </AppLayout>
    </ToastProvider>
  );
}

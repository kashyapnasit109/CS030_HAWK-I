"use client";

import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/api";
import { ActivityIcon, AlertIcon, CameraIcon, DashboardIcon, SignalIcon } from "@/components/Icons";

interface AnalyticsStats {
  cameras: Record<string, number>;
  modules: Record<string, number>;
  top_colors: Record<string, number>;
  bottom_colors: Record<string, number>;
  poses: Record<string, number>;
}

interface LiveAlert {
  id: string;
  camera_id: string;
  camera_name: string;
  timestamp: number;
  timestamp_str: string;
  detections: Array<{ type: string; label: string; confidence: number }>;
  snapshot_url: string;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioBeep, setAudioBeep] = useState(true);

  // Load stats and alerts
  const loadData = async () => {
    try {
      const statsData = await apiFetch<AnalyticsStats>("/api/search/analytics/stats");
      setStats(statsData);

      const alertsData = await apiFetch<{ alerts: LiveAlert[]; count: number }>("/api/cameras/alerts/all?since=0");
      if (alertsData.alerts) {
        const sorted = alertsData.alerts.sort((a, b) => b.timestamp - a.timestamp);
        
        // Trigger alert beep on new alert
        if (audioBeep && sorted.length > 0 && alerts.length > 0 && sorted[0].id !== alerts[0].id) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.25);
          } catch (e) {
            console.error("Audio beep blocked:", e);
          }
          showToast(`NEW ALERT: Sighting on ${sorted[0].camera_name}`, "info");
        }
        setAlerts(sorted.slice(0, 15));
      }
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [audioBeep, alerts]);

  // Combine attributes for tag cloud, memoized to prevent layout-shift glitches on updates
  const tags = useMemo(() => {
    if (!stats) return [];
    const items: { text: string; count: number; category: string }[] = [];
    
    Object.entries(stats.top_colors).forEach(([color, count]) => {
      items.push({ text: `${color} top`, count, category: "clothing" });
    });
    Object.entries(stats.bottom_colors).forEach(([color, count]) => {
      items.push({ text: `${color} bottom`, count, category: "clothing" });
    });
    Object.entries(stats.poses).forEach(([pose, count]) => {
      items.push({ text: pose, count, category: "pose" });
    });
    
    // Add default seeds if empty
    if (items.length === 0) {
      return [
        { text: "black top", count: 12, category: "clothing" },
        { text: "white top", count: 8, category: "clothing" },
        { text: "blue bottom", count: 15, category: "clothing" },
        { text: "running", count: 8, category: "pose" },
        { text: "crouching", count: 4, category: "pose" },
        { text: "helmet", count: 5, category: "headgear" },
        { text: "backpack", count: 10, category: "bag" },
      ];
    }
    
    // Sort stably by popularity (count descending)
    return items.sort((a, b) => b.count - a.count);
  }, [stats]);

  return (
    <ToastProvider>
      <AppLayout>
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ActivityIcon size={24} style={{ color: "var(--cyan)" }} /> VMS Analytics Dashboard
            </h1>
            <p className="page-subtitle">Real-time surveillance match charts, attribute counts, and dynamic alert feed.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer", background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: 6 }}>
              <input type="checkbox" checked={audioBeep} onChange={() => setAudioBeep(!audioBeep)} />
              🔊 Live Audio Beep Alert
            </label>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            Aggregating VMS statistics from SQLite databases...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Real-time Alert Ticker */}
            <div className="card" style={{ borderColor: "rgba(233,69,96,0.3)", background: "rgba(233,69,96,0.01)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, color: "var(--accent)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1.2s infinite" }} />
                  Live Alert Incident Ticker
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Updates dynamically every 5s</span>
              </div>
              
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
                {alerts.length === 0 ? (
                  <div style={{ padding: 20, color: "var(--text-muted)", fontSize: "0.8rem", width: "100%", textAlign: "center" }}>
                    No alerts triggered on active feeds. Start live scans in CCTV Streams page.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        flexShrink: 0,
                        width: 250,
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 10,
                        display: "flex",
                        gap: 10,
                        alignItems: "center"
                      }}
                    >
                      <div style={{ width: 48, height: 48, background: "#000", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                        {alert.snapshot_url ? (
                          <img src={`http://localhost:8000${alert.snapshot_url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <AlertIcon size={18} style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--yellow)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {alert.camera_name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>
                          {alert.detections.map(d => d.label).join(", ")}
                        </div>
                        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 4 }}>
                          {alert.timestamp_str}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Grid 2: Charts and Widgets */}
            <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              
              {/* Chart 1: Matches by Camera */}
              <div className="card">
                <div className="section-title">Match Events by Camera Unit</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
                  {stats && Object.entries(stats.cameras).map(([cam, count]) => {
                    const maxVal = Math.max(...Object.values(stats.cameras), 1);
                    const pct = (count / maxVal) * 100;
                    return (
                      <div key={cam} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                          <span>{cam}</span>
                          <span style={{ color: "var(--cyan)" }}>{count} sightings</span>
                        </div>
                        <div style={{ height: 16, background: "rgba(255,255,255,0.03)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, var(--cyan), #00ff88)",
                              boxShadow: "0 0 10px rgba(0, 212, 255, 0.4)",
                              borderRadius: 4,
                              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Matches by Detection Module */}
              <div className="card">
                <div className="section-title">Sightings by Engine Analysis Module</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
                  {stats && Object.entries(stats.modules).map(([module, count]) => {
                    const maxVal = Math.max(...Object.values(stats.modules), 1);
                    const pct = (count / maxVal) * 100;
                    return (
                      <div key={module} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                          <span style={{ textTransform: "capitalize" }}>{module.replace("_", " ")}</span>
                          <span style={{ color: "var(--accent)" }}>{count} matches</span>
                        </div>
                        <div style={{ height: 16, background: "rgba(255,255,255,0.03)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, var(--accent), #ff2a7f)",
                              boxShadow: "0 0 10px rgba(233, 69, 96, 0.4)",
                              borderRadius: 4,
                              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Tag Cloud & Attribute Heatmap */}
            <div className="card">
              <div className="section-title">Query Attribute Tag Cloud (Sighting Popularity)</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 16 }}>
                Common colors, postures, and tags seeded or extracted from historical video evidence. Larger tags indicate higher occurrence rate.
              </p>
              
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "20px 10px",
                  background: "rgba(255,255,255,0.01)",
                  borderRadius: 12,
                  border: "1px solid var(--border)"
                }}
              >
                {tags.map((tag, idx) => {
                  const size = Math.min(24, Math.max(12, 12 + tag.count * 0.7));
                  const glowColor = tag.category === "pose" ? "rgba(0, 255, 136, 0.25)" : "rgba(0, 212, 255, 0.25)";
                  const borderColor = tag.category === "pose" ? "#00ff88" : "var(--cyan)";
                  return (
                    <span
                      key={idx}
                      style={{
                        fontSize: `${size}px`,
                        fontWeight: 700,
                        padding: "6px 14px",
                        borderRadius: 30,
                        background: "var(--bg-elevated)",
                        border: `1.5px solid ${borderColor}`,
                        color: "var(--text-primary)",
                        boxShadow: `0 0 12px ${glowColor}`,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      className="history-item-hover"
                      onClick={() => showToast(`Filtered search by tag: "${tag.text}"`, "info")}
                    >
                      {tag.text}
                      <span style={{ fontSize: "0.55em", color: "var(--text-muted)", marginLeft: 6 }}>({tag.count})</span>
                    </span>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </AppLayout>
    </ToastProvider>
  );
}

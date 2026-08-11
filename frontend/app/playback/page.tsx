"use client";

import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import { VideoIcon, PlayIcon, PauseIcon, ClockIcon } from "@/components/Icons";

// Mock video segments
const videoSegments = [
  { id: "seg1", label: "00:00 - 04:00 (Continuous Archive)", url: "http://localhost:8000/storage/uploads/subway.mp4" },
  { id: "seg2", label: "08:30 - 10:00 (Morning Rush)", url: "http://localhost:8000/storage/uploads/subway.mp4" },
  { id: "seg3", label: "13:00 - 15:30 (Afternoon Shift)", url: "http://localhost:8000/storage/uploads/subway.mp4" },
];

// Generate motion activity values (0-100) for 24 hours (24 bars)
const generateMotionGraph = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    // Peak hours: 9-11 AM, 5-7 PM, rest are random low values
    if (i >= 8 && i <= 11) {
      data.push(Math.floor(Math.random() * 40) + 60);
    } else if (i >= 17 && i <= 19) {
      data.push(Math.floor(Math.random() * 30) + 70);
    } else {
      data.push(Math.floor(Math.random() * 25) + 10);
    }
  }
  return data;
};

export default function PlaybackPage() {
  const [selectedCamera, setSelectedCamera] = useState("CAM-01");
  const [selectedDate, setSelectedDate] = useState("2026-07-25");
  const [motionGraph, setMotionGraph] = useState<number[]>([]);
  const [currentTimeSec, setCurrentTimeSec] = useState(0); // 0 to 86400 (seconds in a day)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [deepLinked, setDeepLinked] = useState(false);

  useEffect(() => {
    setMotionGraph(generateMotionGraph());
    // Deep-link support: /playback?camera=GATE-01&t=1234 jumps straight to a
    // moment (used by "Playback" buttons on search results and live alerts).
    let seededTime = 32400; // default 9:00 AM
    try {
      const qs = new URLSearchParams(window.location.search);
      const cam = qs.get("camera");
      const t = qs.get("t");
      if (cam) setSelectedCamera(cam);
      if (t !== null && t !== "") {
        const secs = Math.max(0, Math.min(86399, Math.floor(Number(t))));
        if (!Number.isNaN(secs)) { seededTime = secs; setDeepLinked(true); }
      }
    } catch {}
    setCurrentTimeSec(seededTime);
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Simulating playhead advancement
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeSec((prev) => {
        const next = prev + playbackSpeed;
        return next >= 86400 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleTimelineInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTimeSec(Math.floor(percentage * 86400));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    handleTimelineInteraction(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    handleTimelineInteraction(e);
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Check if a given second in the day falls into any of the recorded segments
  // seg1: 00:00 - 04:00 (0 to 14400s)
  // seg2: 08:30 - 10:00 (30600 to 36000s)
  // seg3: 13:00 - 15:30 (46800 to 55800s)
  const isTimeRecorded = (sec: number) => {
    if (sec >= 0 && sec <= 14400) return true;
    if (sec >= 30600 && sec <= 36000) return true;
    if (sec >= 46800 && sec <= 55800) return true;
    return false;
  };

  return (
    <ToastProvider>
      <AppLayout>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ color: "var(--text-primary)", fontSize: "1.75rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              VMS Continuous Playback
              <span className="badge badge-yellow" style={{ fontSize: "0.65rem", letterSpacing: "0.05em" }}>SAMPLE DATA</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>Timeline preview with illustrative motion activity — connect a VMS archive for real recorded streams.</p>
          </div>
        </div>

        {deepLinked && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            padding: "10px 14px", background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8,
            color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600,
          }}>
            <ClockIcon size={15} />
            Jumped to {selectedCamera} @ {formatTime(currentTimeSec)} from a search hit.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "24px", alignItems: "flex-start" }}>
          {/* Left Column: Device and Calendar Selectors */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 700, margin: "0 0 16px 0" }}>VMS Registry</h3>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Camera Node</label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", padding: "10px", color: "#E6EDF3", fontSize: "0.85rem", outline: "none" }}
                >
                  <option value="CAM-01">CAM-01 — Front Entrance</option>
                  <option value="CAM-02">CAM-02 — Side Alleyway</option>
                  <option value="CAM-03">CAM-03 — Server Room</option>
                  {selectedCamera && !["CAM-01", "CAM-02", "CAM-03"].includes(selectedCamera) && (
                    <option value={selectedCamera}>{selectedCamera} — (linked)</option>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" }}>Archive Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "#000000", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", padding: "10px", color: "#E6EDF3", fontSize: "0.85rem", outline: "none" }}
                />
              </div>
            </div>

            {/* List of segment blocks */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 700, margin: "0 0 12px 0" }}>Recorded Segments</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {videoSegments.map((seg) => (
                  <div
                    key={seg.id}
                    style={{ padding: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}
                    onClick={() => {
                      if (seg.id === "seg1") setCurrentTimeSec(3600); // 1:00 AM
                      if (seg.id === "seg2") setCurrentTimeSec(32400); // 9:00 AM
                      if (seg.id === "seg3") setCurrentTimeSec(50400); // 2:00 PM
                      showToast(`Jumped to segment ${seg.label}`, "info");
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <PlayIcon size={10} style={{ color: "var(--green)" }} />
                      <span>{seg.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Player and Timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Player Container */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: "bold" }}>
                  {selectedCamera} — {selectedDate} Feed
                </span>
                <span style={{ color: "var(--accent)", fontFamily: "monospace", fontWeight: "bold", fontSize: "1.1rem" }}>
                  {formatTime(currentTimeSec)}
                </span>
              </div>
              
              <div style={{ width: "100%", height: "400px", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {isTimeRecorded(currentTimeSec) ? (
                  <video
                    src="http://localhost:8000/storage/uploads/subway.mp4"
                    autoPlay={isPlaying}
                    muted
                    loop
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "8px" }}>
                    <VideoIcon size={36} style={{ color: "var(--text-muted)" }} />
                    <span>No footage recorded at this timestamp</span>
                  </div>
                )}
                
                {/* Visual Status overlay */}
                <div style={{ position: "absolute", top: "16px", left: "16px", display: "flex", gap: "8px" }}>
                  <span style={{ background: "rgba(0,0,0,0.6)", color: "var(--green)", fontSize: "0.7rem", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} /> Online
                  </span>
                  <span style={{ background: "rgba(0,0,0,0.6)", color: "var(--text-primary)", fontSize: "0.7rem", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px" }}>
                    FPS: 25.0
                  </span>
                </div>
              </div>

              {/* Player Controls */}
              <div style={{ padding: "16px 24px", background: "var(--bg-elevated)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{ background: "var(--accent)", color: "#000000", border: "none", borderRadius: "6px", width: "40px", height: "40px", fontSize: "1.2rem", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                  </button>
                  <button
                    onClick={() => setCurrentTimeSec((prev) => Math.max(0, prev - 10))}
                    style={{ background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 12px", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    -10s
                  </button>
                  <button
                    onClick={() => setCurrentTimeSec((prev) => Math.min(86400, prev + 10))}
                    style={{ background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 12px", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    +10s
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Speed:</span>
                  {[1, 2, 4, 8].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      style={{
                        background: playbackSpeed === s ? "var(--accent)" : "transparent",
                        color: playbackSpeed === s ? "#000000" : "var(--text-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Continuous Timeline Scrubber Card */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>24-Hour Continuous Timeline</strong>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Click or drag to scrub playhead</span>
              </div>

              {/* Motion density visual graph */}
              <div style={{ display: "flex", gap: "2px", height: "40px", alignItems: "flex-end", marginBottom: "8px", padding: "0 10px" }}>
                {motionGraph.map((val, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: `${val}%`,
                      background: val > 60 ? "var(--accent)" : val > 30 ? "var(--yellow)" : "rgba(255,255,255,0.08)",
                      borderRadius: "2px 2px 0 0",
                      opacity: isTimeRecorded(idx * 3600) ? 1 : 0.25
                    }}
                    title={`Hour ${idx.toString().padStart(2, "0")}:00 - Motion activity: ${val}%`}
                  />
                ))}
              </div>

              {/* Interactive Timeline Track */}
              <div 
                ref={timelineRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                style={{ position: "relative", height: "24px", background: "#000000", border: "1px solid var(--border)", borderRadius: "6px", cursor: "ew-resize", overflow: "hidden", userSelect: "none" }}
              >
                {/* Highlighted recorded zones */}
                {/* seg1: 0 - 16.6% */}
                <div style={{ position: "absolute", left: "0%", width: "16.6%", height: "100%", background: "rgba(59,130,246,0.15)", borderRight: "1px solid var(--accent)" }} />
                {/* seg2: 35.4% - 41.6% */}
                <div style={{ position: "absolute", left: "35.4%", width: "6.2%", height: "100%", background: "rgba(59,130,246,0.15)", borderLeft: "1px solid var(--accent)", borderRight: "1px solid var(--accent)" }} />
                {/* seg3: 54.1% - 64.5% */}
                <div style={{ position: "absolute", left: "54.1%", width: "10.4%", height: "100%", background: "rgba(59,130,246,0.15)", borderLeft: "1px solid var(--accent)", borderRight: "1px solid var(--accent)" }} />

                {/* Vertical Hours grids */}
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${(i / 24) * 100}%`,
                      top: 0,
                      width: "1px",
                      height: i % 4 === 0 ? "100%" : "30%",
                      background: "rgba(255,255,255,0.15)"
                    }}
                  />
                ))}

                {/* Red Playhead cursor line */}
                <div
                  style={{
                    position: "absolute",
                    left: `${(currentTimeSec / 86400) * 100}%`,
                    top: 0,
                    width: "3px",
                    height: "100%",
                    background: "#EF4444",
                    boxShadow: "0 0 8px #EF4444",
                    zIndex: 10
                  }}
                />
              </div>

              {/* Hours labels scale */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "6px", padding: "0 4px" }}>
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>24:00</span>
              </div>
            </div>

            {/* Heatmap Section */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 700, margin: "0 0 16px 0" }}>Daily Activity Heatmap Grid</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: "4px" }}>
                {motionGraph.map((val, idx) => (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: "1/1",
                      borderRadius: "4px",
                      background: val > 75 ? "var(--accent)" : val > 50 ? "#2563EB" : val > 25 ? "#1D4ED8" : "#1E3A8A",
                      opacity: val > 15 ? 1 : 0.2
                    }}
                    title={`Hour ${idx.toString().padStart(2, "0")}:00 -> Peak activity: ${val}%`}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "8px" }}>
                <span>Low Motion</span>
                <span>Peak Traffic Motion</span>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ToastProvider>
  );
}

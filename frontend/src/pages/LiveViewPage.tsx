import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { 
  Grid2X2, 
  Grid3X3, 
  Square, 
  Sun, 
  Eye, 
  Flame, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Radio
} from "lucide-react";

import feedAnpr from "../assets/feed_anpr_gate_1786554321922.png";
import feedServer from "../assets/feed_server_room_1786554342814.png";
import feedDrone from "../assets/feed_drone_view_1786554359554.png";

export default function LiveViewPage() {
  const [layout, setLayout] = useState<"1x1" | "2x2" | "3x3">("2x2");
  const [activeFilter, setActiveFilter] = useState<"optical" | "thermal" | "night">("optical");
  const [isMuted, setIsMuted] = useState(true);
  const [hudVisible, setHudVisible] = useState(true);
  const [selectedCam, setSelectedCam] = useState("CAM-01");

  const cameras = [
    { id: "CAM-01", name: "Main Entrance ANPR Gate", src: feedAnpr, zone: "Sector 1", fps: "59.9 FPS", resolution: "4K UHD" },
    { id: "CAM-02", name: "Server Room Core Vault", src: feedServer, zone: "Sector 2", fps: "30.0 FPS", resolution: "1080p" },
    { id: "CAM-03", name: "Outer Perimeter Drone", src: feedDrone, zone: "Sector 4", fps: "60.0 FPS", resolution: "4K UHD" },
    { id: "CAM-04", name: "North Loading Dock Bay", src: feedAnpr, zone: "Sector 3", fps: "30.0 FPS", resolution: "1080p" },
  ];

  const displayedCameras = layout === "1x1" 
    ? cameras.filter(c => c.id === selectedCam) 
    : layout === "2x2" 
      ? cameras.slice(0, 4) 
      : cameras;

  const filterClass = activeFilter === "thermal" 
    ? "invert hue-rotate-180 contrast-150 saturate-200" 
    : activeFilter === "night" 
      ? "hue-rotate-90 saturate-150 brightness-110" 
      : "";

  return (
    <div className="space-y-8 pb-16">
      
      {/* ═══════════════════════════════════════════════════════════
          HEADER & WORKSPACE CONTROLS
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-hawk-emerald animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              RTSP STREAM MATRIX
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Live CCTV Matrix
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Multi-spectral video streams with PTZ controls and neural filters
          </p>
        </div>

        {/* Layout & Shader Controls */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Multi-Spectral Shader Selector */}
          <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1">
            {[
              { id: "optical", label: "OPTICAL", icon: Sun },
              { id: "thermal", label: "THERMAL", icon: Flame },
              { id: "night", label: "NIGHT IR", icon: Eye },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    activeFilter === f.id
                      ? "bg-hawk-sapphire text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                      : "text-hawk-muted hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grid Layout Switcher */}
          <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1">
            {[
              { id: "1x1", icon: Square },
              { id: "2x2", icon: Grid2X2 },
              { id: "3x3", icon: Grid3X3 },
            ].map((l) => {
              const Icon = l.icon;
              return (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id as any)}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    layout === l.id
                      ? "bg-white/15 text-white"
                      : "text-hawk-muted hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CCTV GRID + PTZ CONTROLS
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left 9 Columns: Video Streams Grid */}
        <div className="xl:col-span-9">
          <div className={`grid gap-5 ${layout === "1x1" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {displayedCameras.map((cam) => (
              <Card
                key={cam.id}
                padding="none"
                interactive
                onClick={() => setSelectedCam(cam.id)}
                className={`overflow-hidden bg-[#07080B] group ${
                  selectedCam === cam.id ? "ring-2 ring-hawk-sapphire/50" : ""
                }`}
              >
                {/* Header Strip */}
                <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-hawk-emerald animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white">{cam.id}</span>
                    <span className="text-xs text-hawk-muted font-sans font-medium">{cam.name}</span>
                  </div>
                  <Badge variant="emerald" size="sm" dot>{cam.fps}</Badge>
                </div>

                {/* Video Container */}
                <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                  <img
                    src={cam.src}
                    alt={cam.name}
                    className={`w-full h-full object-cover transition-all duration-500 ${filterClass}`}
                  />

                  {/* Reticle Crosshairs */}
                  {hudVisible && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/20 rounded-xl pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity">
                      <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-hawk-sapphire" />
                      <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-hawk-sapphire" />
                      <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-hawk-sapphire" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-hawk-sapphire" />
                    </div>
                  )}

                  {/* Bottom Meta Overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-[10px] font-mono text-white/70">
                    <span>{cam.zone}</span>
                    <span>{cam.resolution}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right 3 Columns: PTZ Controller & Stream Controls */}
        <div className="xl:col-span-3 space-y-5">
          
          {/* PTZ Joystick Card */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                PTZ Pan-Tilt-Zoom
              </span>
              <Badge variant="sapphire" size="sm">{selectedCam}</Badge>
            </div>

            {/* D-Pad */}
            <div className="flex flex-col items-center justify-center py-3 gap-2">
              <button className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-white transition-all cursor-pointer">
                <ChevronUp className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <button className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-white transition-all cursor-pointer">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 rounded-full bg-hawk-sapphire/20 border border-hawk-sapphire/40 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-hawk-sapphire animate-pulse" />
                </div>
                <button className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-white transition-all cursor-pointer">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <button className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-white transition-all cursor-pointer">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
              <button className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <ZoomIn className="h-3.5 w-3.5 text-hawk-emerald" /> ZOOM +
              </button>
              <button className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <ZoomOut className="h-3.5 w-3.5 text-hawk-burgundy" /> ZOOM -
              </button>
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card padding="md" className="space-y-3">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
              Stream Telemetry
            </span>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-hawk-muted">Audio Feed:</span>
                <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-hawk-sapphire cursor-pointer">
                  {isMuted ? "MUTED" : "LIVE AUDIO"}
                </button>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-hawk-muted">HUD Reticle:</span>
                <button onClick={() => setHudVisible(!hudVisible)} className="text-hawk-emerald font-bold cursor-pointer">
                  {hudVisible ? "ENABLED" : "DISABLED"}
                </button>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-hawk-muted">Bitrate:</span>
                <span className="text-white font-bold">14.8 Mbps</span>
              </div>
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
}

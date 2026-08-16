import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { 
  Camera, 
  Activity, 
  ScanLine, 
  Video, 
  ArrowUpRight, 
  ShieldAlert, 
  Gauge, 
  Boxes, 
  LogIn, 
  Zap,
  Sparkles,
  Maximize2,
  Radio,
  Eye,
  Flame,
  Sun
} from "lucide-react";
import { Link } from "react-router-dom";

// Optical feed assets
import feedAnpr from "../assets/feed_anpr_gate_1786554321922.png";
import feedServer from "../assets/feed_server_room_1786554342814.png";
import feedDrone from "../assets/feed_drone_view_1786554359554.png";

export default function DashboardPage() {
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);
  const [visionMode, setVisionMode] = useState<"optical" | "thermal" | "night">("optical");
  const [selectedBBox, setSelectedBBox] = useState<string | null>(null);

  const streams = [
    { id: "CAM-01", name: "Sector 1 Gate (ANPR Optical)", src: feedAnpr, fps: "59.9 FPS", resolution: "4K (3840x2160)", type: "ANPR / OVERVIEW", zone: "Perimeter Gate" },
    { id: "CAM-02", name: "Server Vault (Thermal Core)", src: feedServer, fps: "30.0 FPS", resolution: "1080p (1920x1080)", type: "THERMAL FLIR", zone: "Vault Sector B" },
    { id: "CAM-03", name: "Perimeter Drone Alpha", src: feedDrone, fps: "60.0 FPS", resolution: "4K (3840x2160)", type: "AERIAL PATROL", zone: "Outer Perimeter" },
  ];

  const detectionBoxes = [
    { id: "box-1", label: "SUV (TOYOTA)", confidence: "98.4%", color: "border-hawk-sapphire text-hawk-sapphire", top: "42%", left: "46%", width: "24%", height: "28%" },
    { id: "box-2", label: "PLATE [MH-12-AB-3456]", confidence: "99.1%", color: "border-hawk-emerald text-hawk-emerald", top: "58%", left: "54%", width: "10%", height: "8%" },
    { id: "box-3", label: "SECURITY GUARD", confidence: "96.7%", color: "border-hawk-amber text-hawk-amber", top: "38%", left: "28%", width: "9%", height: "32%" },
  ];

  const incidents = [
    { id: "INC-8942", time: "Just now", type: "UNAUTHORIZED_ENTRY", zone: "Vault Entry Gate", severity: "critical", msg: "Unregistered individual detected in restricted sector" },
    { id: "INC-8941", time: "2 min ago", type: "SPEED_VIOLATION", zone: "Loading Bay North", severity: "warning", msg: "Vehicle MH-12-DE-1420 clocked at 84 km/h (Limit: 40)" },
    { id: "INC-8940", time: "14 min ago", type: "UNATTENDED_OBJECT", zone: "Terminal B Lobby", severity: "warning", msg: "Static briefcase detected unattended for > 120s" },
    { id: "INC-8939", time: "32 min ago", type: "ANPR_MATCH", zone: "Main Perimeter Gate", severity: "neutral", msg: "Blacklist plate DL-08-CC-8899 flagged at entrance" },
  ];

  const activeStream = streams[activeStreamIndex];

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-hawk-emerald animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              AUTONOMOUS SURVEILLANCE PLATFORM
            </span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-display font-black text-white tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Real-time optical surveillance feeds, automated neural threat triage & spatial telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/live">
            <Button variant="secondary" size="md" icon={<Video className="h-4 w-4 text-hawk-sapphire" />}>
              Live Matrix
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="primary" size="md" icon={<Zap className="h-4 w-4" />}>
              Semantic Query
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<Camera className="h-4 w-4" />}
          label="Active Optical Feeds"
          value="08 / 08"
          accentColor="sapphire"
          trend="+2 online"
          trendDirection="up"
          subtext="100% frame delivery rate"
        />
        <StatCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Threat Incidents (24h)"
          value="03"
          accentColor="burgundy"
          trend="1 Critical"
          trendDirection="down"
          subtext="Requires immediate operator triage"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Inference Latency"
          value="14.2ms"
          accentColor="emerald"
          trend="60 FPS"
          trendDirection="up"
          subtext="YOLOv8 + ByteTrack TensorRT"
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Total Vision Events"
          value="1,482"
          accentColor="amber"
          trend="+18.4%"
          trendDirection="up"
          subtext="Processed in past 24 hours"
        />
      </div>

      {/* Central Workbench: Live Video with Interactive AI Bounding Box Overlays */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left 8 Columns: High-Resolution Optical Live Canvas */}
        <div className="xl:col-span-8 space-y-4">
          <Card padding="none" className="overflow-hidden bg-[#07080B] flex flex-col justify-between shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/[0.1]">
            
            {/* Camera Switcher & Vision Shader Mode Pills */}
            <div className="p-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-hawk-sapphire animate-pulse" />
                {streams.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveStreamIndex(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeStreamIndex === idx
                        ? "bg-hawk-sapphire text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-400/40"
                        : "bg-white/[0.03] text-hawk-muted hover:text-white border border-white/5"
                    }`}
                  >
                    {s.id}
                  </button>
                ))}
              </div>

              {/* Spectral Shader Modes */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
                {[
                  { id: "optical", label: "OPTICAL", icon: Eye },
                  { id: "thermal", label: "THERMAL", icon: Flame },
                  { id: "night", label: "NIGHT IR", icon: Sun },
                ].map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setVisionMode(mode.id as any)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        visionMode === mode.id
                          ? "bg-white/15 text-white font-bold"
                          : "text-hawk-muted hover:text-white"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="text-[10px]">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Canvas with Dynamic Shader Filter and AI Target Bounding Boxes */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group">
              <img
                src={activeStream.src}
                alt={activeStream.name}
                className={`w-full h-full object-cover transition-all duration-700 ${
                  visionMode === "thermal"
                    ? "hue-rotate-180 contrast-200 saturate-200"
                    : visionMode === "night"
                    ? "invert brightness-90 contrast-150 saturate-50 sepia hue-rotate-90"
                    : "group-hover:scale-101"
                }`}
              />

              {/* Dynamic Neural AI Bounding Box Tracking Overlays */}
              {detectionBoxes.map((box) => (
                <div
                  key={box.id}
                  onClick={() => setSelectedBBox(selectedBBox === box.id ? null : box.id)}
                  style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
                  className={`absolute border-2 ${box.color} rounded-lg transition-all cursor-pointer group/bbox ${
                    selectedBBox === box.id ? "bg-hawk-sapphire/20 shadow-[0_0_20px_rgba(59,130,246,0.6)]" : "hover:bg-white/10"
                  }`}
                >
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[8px] font-mono font-bold whitespace-nowrap border border-white/20">
                    {box.label} <span className="text-hawk-emerald">{box.confidence}</span>
                  </div>

                  {/* Corner reticle brackets */}
                  <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
                  <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />
                </div>
              ))}

              {/* Bottom Canvas Overlay */}
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex items-end justify-between">
                <div>
                  <h3 className="text-xl font-display font-black text-white uppercase tracking-wide">
                    {activeStream.name}
                  </h3>
                  <p className="text-xs font-mono text-white/70 mt-1">
                    Zone: <strong className="text-hawk-sapphire">{activeStream.zone}</strong> · Frame Rate: <strong className="text-hawk-emerald">{activeStream.fps}</strong>
                  </p>
                </div>

                <Link to="/live">
                  <button className="p-3 rounded-xl bg-black/70 hover:bg-black text-white border border-white/20 transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>

          </Card>
        </div>

        {/* Right 4 Columns: Threat Radar & Incidents Rail */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-hawk-burgundy animate-pulse" />
              <h2 className="text-base font-display font-bold text-white uppercase tracking-wider">
                Threat Incidents
              </h2>
            </div>
            <Link to="/alerts" className="text-xs font-mono text-hawk-sapphire hover:text-blue-400 font-bold">
              View All (4) &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <Card key={inc.id} padding="sm" interactive glowColor={inc.severity === 'critical' ? 'burgundy' : inc.severity === 'warning' ? 'amber' : 'sapphire'} className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${inc.severity === 'critical' ? 'bg-hawk-burgundy animate-ping' : 'bg-hawk-amber'}`} />
                    <span className="text-xs font-mono font-bold text-white">{inc.id}</span>
                    <Badge variant={inc.severity === 'critical' ? 'burgundy' : inc.severity === 'warning' ? 'amber' : 'neutral'} size="sm">
                      {inc.type}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-hawk-muted">{inc.time}</span>
                </div>

                <p className="text-xs text-white/80 font-sans leading-relaxed">
                  {inc.msg}
                </p>

                <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-hawk-muted border-t border-white/[0.04]">
                  <span>ZONE: <strong className="text-white/80">{inc.zone}</strong></span>
                  <Link to="/alerts" className="text-hawk-sapphire font-bold flex items-center gap-1">
                    Audit <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* Vision Intelligence Diagnostic Suites */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-display font-black text-white uppercase tracking-wider">
              Vision Intelligence Diagnostic Suites
            </h2>
            <p className="text-xs text-hawk-muted font-sans mt-0.5">
              Interactive test benches for computer vision neural pipelines
            </p>
          </div>
          <span className="text-xs font-mono text-hawk-emerald font-bold bg-hawk-emerald/10 border border-hawk-emerald/20 px-2.5 py-1 rounded-full">
            5 MODULES ONLINE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { title: "ANPR Engine", path: "/modules/anpr", icon: ScanLine, tag: "YOLO + OCR", latency: "24ms", desc: "Plate detection & registry lookup" },
            { title: "Velocity Radar", path: "/modules/velocity", icon: Gauge, tag: "ByteTrack", latency: "16ms", desc: "Physical km/h speed trajectory" },
            { title: "Object Differencing", path: "/modules/misplacement", icon: Boxes, tag: "ResNet Diff", latency: "12ms", desc: "Appeared & missing anomalies" },
            { title: "Threat Polygons", path: "/modules/threat", icon: ShieldAlert, tag: "Threat Logic", latency: "18ms", desc: "Weapon & perimeter breach" },
            { title: "Access Control", path: "/modules/entry", icon: LogIn, tag: "Cross-Zone", latency: "14ms", desc: "Gate vs. interior correlation" },
          ].map((bench) => {
            const Icon = bench.icon;
            return (
              <Link to={bench.path} key={bench.path} className="block">
                <Card interactive padding="md" className="h-full flex flex-col justify-between space-y-4 group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-hawk-sapphire group-hover:bg-hawk-sapphire group-hover:text-white transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-mono text-hawk-emerald font-bold">{bench.latency}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold text-white group-hover:text-hawk-sapphire transition-colors">
                        {bench.title}
                      </h3>
                      <p className="text-xs text-hawk-muted font-sans mt-1 line-clamp-2">
                        {bench.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-hawk-muted">
                    <span>{bench.tag}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 group-hover:text-hawk-sapphire transition-colors" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}

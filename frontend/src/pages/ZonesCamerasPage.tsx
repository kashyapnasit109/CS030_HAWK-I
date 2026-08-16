import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  Camera, 
  Hexagon, 
  Plus,
  Radio,
  Maximize2
} from "lucide-react";

export default function ZonesCamerasPage() {
  const [activeZone, setActiveZone] = useState(1);
  const [selectedCam, setSelectedCam] = useState<string | null>("CAM-01A");

  const zones = [
    { id: 1, name: "Sector 1 (Main Entrance & ANPR)", status: "optimal", cameras: 3, area: "14,500 sq ft", threats: 0, geohash: "9q8yyk8" },
    { id: 2, name: "Sector 2 (Server Room Vault)", status: "optimal", cameras: 2, area: "6,200 sq ft", threats: 1, geohash: "9q8yyf2" },
    { id: 3, name: "Sector 3 (North Loading Docks)", status: "optimal", cameras: 4, area: "22,000 sq ft", threats: 1, geohash: "9q8yym4" },
    { id: 4, name: "Sector 4 (Outer Perimeter Drone)", status: "degraded", cameras: 1, area: "45,000 sq ft", threats: 0, geohash: "9q8yyx9" },
  ];

  const camerasInActiveZone = [
    { id: "CAM-01A", name: "Gate 1 Inbound ANPR", ip: "10.0.4.11", status: "online", fps: "59.9 FPS", resolution: "4K (3840x2160)", type: "ANPR / LPR", latency: "12ms", x: 28, y: 35, fovAngle: 45 },
    { id: "CAM-01B", name: "Gate 1 Overview Optical", ip: "10.0.4.12", status: "online", fps: "30.0 FPS", resolution: "1080p (1920x1080)", type: "OVERVIEW", latency: "14ms", x: 68, y: 40, fovAngle: 135 },
    { id: "CAM-01C", name: "Pedestrian Turnstile Gate", ip: "10.0.4.13", status: "online", fps: "30.0 FPS", resolution: "1080p (1920x1080)", type: "ACCESS CONTROL", latency: "16ms", x: 48, y: 72, fovAngle: 270 },
  ];

  const curZone = zones.find(z => z.id === activeZone) || zones[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-hawk-emerald animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-hawk-muted">
              GEOSPATIAL TOPOGRAPHY & RTSP NODES
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight">
            Zone Topography
          </h1>
          <p className="text-sm text-hawk-muted font-sans mt-1">
            Interactive security sectors, optical camera frustum coverage, and RTSP stream mappings
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => alert("Creating new sector boundary...")}
        >
          ADD SECTOR
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left 4 Columns: Sector Selector Cards */}
        <div className="xl:col-span-4 space-y-3">
          <span className="text-xs font-mono font-bold tracking-wider text-hawk-muted uppercase block px-1">
            SECTORS ({zones.length})
          </span>

          {zones.map((zone) => (
            <Card
              key={zone.id}
              padding="md"
              interactive
              onClick={() => setActiveZone(zone.id)}
              className={`transition-all ${
                activeZone === zone.id ? "border-hawk-sapphire/60 bg-[#0E1524]/90 shadow-[0_0_25px_rgba(59,130,246,0.2)]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-display font-bold text-white">
                  {zone.name}
                </h3>
                <Badge variant={zone.status === "optimal" ? "emerald" : "amber"} size="sm" dot>
                  {zone.status.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-hawk-muted pt-3 border-t border-white/[0.04]">
                <span className="flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-hawk-sapphire" /> {zone.cameras} NODES</span>
                <span className="flex items-center gap-1.5"><Hexagon className="h-3.5 w-3.5 text-hawk-emerald" /> {zone.area}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Right 8 Columns: High-Tech Interactive Geospatial Coverage Topology */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Tactical Schematic Canvas Card */}
          <Card padding="none" className="bg-[#07080B] relative overflow-hidden border border-white/[0.1] shadow-2xl rounded-2xl">
            
            {/* Top Toolbar */}
            <div className="p-4 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  {curZone.name}
                </h3>
                <p className="text-xs font-mono text-hawk-emerald mt-0.5">
                  GEOSPATIAL TOPOGRAPHY MAPPED · 100% ONLINE
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="emerald" size="sm" dot>CLUSTER ACTIVE</Badge>
                <button className="p-2 rounded-lg bg-black/60 border border-white/10 text-hawk-muted hover:text-white transition-colors cursor-pointer">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive 2.5D Geospatial Floorplan & Camera FOV Cones */}
            <div className="relative h-[300px] w-full bg-[#05060A] overflow-hidden">
              
              {/* Tactical Grid Background */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#3B82F6_1px,transparent_1px),linear-gradient(to_bottom,#3B82F6_1px,transparent_1px)] bg-[size:32px_32px]" />

              {/* SVG Tactical Floorplan Geometry */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                
                {/* Sector Polygon Perimeter */}
                <polygon
                  points="70,40 520,30 560,240 100,260"
                  fill="rgba(59, 130, 246, 0.04)"
                  stroke="rgba(59, 130, 246, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Inner Restricted Zone */}
                <polygon
                  points="180,80 380,75 400,200 200,210"
                  fill="rgba(244, 63, 94, 0.05)"
                  stroke="rgba(244, 63, 94, 0.3)"
                  strokeWidth="1"
                />

                {/* Drone Patrol Flight Path */}
                <path
                  d="M 90,50 Q 300,10 500,60 T 540,220 Q 300,270 120,240 Z"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.35)"
                  strokeWidth="1.2"
                  strokeDasharray="6 3"
                />

                {/* Camera FOV Optical Cones */}
                <path
                  d="M 160,100 L 260,30 A 120,120 0 0,1 280,160 Z"
                  fill="rgba(59, 130, 246, 0.15)"
                  stroke="rgba(59, 130, 246, 0.5)"
                  strokeWidth="1"
                />

                <path
                  d="M 380,120 L 300,50 A 110,110 0 0,0 270,180 Z"
                  fill="rgba(59, 130, 246, 0.12)"
                  stroke="rgba(59, 130, 246, 0.4)"
                  strokeWidth="1"
                />

                <path
                  d="M 270,220 L 210,130 A 100,100 0 0,1 330,130 Z"
                  fill="rgba(16, 185, 129, 0.14)"
                  stroke="rgba(16, 185, 129, 0.5)"
                  strokeWidth="1"
                />
              </svg>

              {/* Interactive Camera Optical Pins */}
              {camerasInActiveZone.map((cam) => (
                <div
                  key={cam.id}
                  onClick={() => setSelectedCam(cam.id)}
                  style={{ top: `${cam.y}%`, left: `${cam.x}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group/pin z-20"
                >
                  <div className={`p-2 rounded-full border transition-all ${
                    selectedCam === cam.id
                      ? "bg-hawk-sapphire border-white shadow-[0_0_20px_rgba(59,130,246,0.8)] scale-125 text-white"
                      : "bg-black/80 border-hawk-sapphire/60 hover:bg-hawk-sapphire/30 text-hawk-sapphire hover:scale-110"
                  }`}>
                    <Camera className="h-3.5 w-3.5" />
                  </div>

                  {/* Pin Tooltip */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/20 text-[9px] font-mono font-bold text-white whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none shadow-lg">
                    {cam.id}: {cam.type}
                  </div>
                </div>
              ))}

              {/* Active Patrol Drone Marker */}
              <div className="absolute top-[28%] left-[78%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-6 w-6 rounded-full bg-hawk-emerald/40 animate-ping" />
                  <span className="relative h-3 w-3 rounded-full bg-hawk-emerald border border-white shadow-[0_0_10px_rgba(16,185,129,1)]" />
                </div>
              </div>

            </div>

            {/* Bottom Status Ribbon */}
            <div className="p-3.5 bg-black/80 backdrop-blur-md border-t border-white/[0.08] flex flex-wrap justify-between items-center text-xs font-mono text-hawk-muted">
              <span className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-hawk-sapphire animate-pulse" />
                ACTIVE CLUSTER NODES: <strong className="text-white">3 OPTICAL UNITS</strong>
              </span>
              <span>GEOHASH: <strong className="text-white">{curZone.geohash}</strong></span>
            </div>
          </Card>

          {/* Node Cards Grid */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold tracking-wider text-hawk-muted uppercase block px-1">
              CAMERA NODES IN ACTIVE SECTOR
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {camerasInActiveZone.map((cam) => (
                <Card
                  key={cam.id}
                  padding="md"
                  interactive
                  onClick={() => setSelectedCam(cam.id)}
                  className={`flex flex-col justify-between h-36 transition-all ${
                    selectedCam === cam.id ? "border-hawk-sapphire/70 bg-[#0E1524]/90 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-white block">{cam.id}</span>
                      <span className="text-xs text-hawk-muted font-sans mt-0.5 line-clamp-1">{cam.name}</span>
                    </div>
                    <Badge variant="emerald" size="sm" dot>LIVE</Badge>
                  </div>

                  <div className="pt-2 border-t border-white/[0.04] text-xs font-mono text-hawk-muted flex justify-between items-center">
                    <span>{cam.type}</span>
                    <span className="text-hawk-emerald font-bold">{cam.latency}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

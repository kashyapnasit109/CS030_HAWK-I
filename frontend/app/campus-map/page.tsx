"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ToastProvider, { showToast } from "@/components/ToastProvider";
import {
  ShieldIcon,
  AlertIcon,
  SignalIcon,
  CameraIcon,
  LiveIcon,
  SearchIcon,
  LockIcon,
  CheckIcon,
  ActivityIcon,
  CloseIcon,
  EyeIcon,
} from "@/components/Icons";

interface CampusBuilding {
  id: string;
  name: string;
  code: string;
  type: string;
  mgrs: string;
  coords: { lat: number; lng: number };
  iso: {
    // 2.5D Isometric footprint on ground grid
    gx: number;
    gy: number;
    gw: number;
    gl: number;
    height: number;
  };
  colorTop: string;
  colorLeft: string;
  colorRight: string;
  accent: string;
  sensors: { temp: number; smoke: number; co: number; sound: number; status: string };
  cameras: Array<{ id: string; name: string; heading: number; fov: number; range: number; is_alert?: boolean }>;
  status: "nominal" | "elevated" | "critical";
  threatScore: number;
  activeIncident?: {
    id: string;
    type: string;
    severity: "P1" | "P2" | "P3";
    title: string;
    consensus: number;
    timestamp: string;
  };
}

interface GuardUnit {
  id: string;
  callsign: string;
  name: string;
  gx: number;
  gy: number;
  targetGx?: number;
  targetGy?: number;
  heading: number;
  speed: number;
  status: "patrol" | "intercepting" | "standby";
  etaSeconds?: number;
  assignedIncident?: string;
}

export default function CampusTacticalMapPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport transformation state (Pan & Zoom)
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: -20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Selection & Layer state
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("bldg-labs");
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<"c4isr" | "heat" | "sensors" | "geofence">("c4isr");
  const [threatLevel, setThreatLevel] = useState<"DEFCON 1" | "DEFCON 2" | "DEFCON 3">("DEFCON 2");
  const [geofenceActive, setGeofenceActive] = useState(false);
  const [liveStreamModal, setLiveStreamModal] = useState<{ camId: string; name: string } | null>(null);

  // Buildings Database with High-Precision Isometric 3D Coordinates
  const [buildings, setBuildings] = useState<CampusBuilding[]>([
    {
      id: "bldg-labs",
      name: "Bio-Chemical & Materials Science Labs",
      code: "LAB-B2",
      type: "Level-3 Hazard Research Complex",
      mgrs: "43Q FK 8912 4321",
      coords: { lat: 12.9716, lng: 77.5946 },
      iso: { gx: 120, gy: 90, gw: 160, gl: 130, height: 75 },
      colorTop: "#1A233A",
      colorLeft: "#0F1626",
      colorRight: "#0A0F1D",
      accent: "#EF4444",
      sensors: { temp: 49.5, smoke: 380, co: 24, sound: 78.5, status: "CRITICAL_HEAT_SMOKE" },
      cameras: [
        { id: "CAM-03", name: "CAM-03 (Lab Corridors North)", heading: 135, fov: 65, range: 110, is_alert: true },
        { id: "CAM-LAB-01", name: "CAM-LAB-01 (Chemical Storage Vault)", heading: 220, fov: 75, range: 95, is_alert: true },
      ],
      status: "critical",
      threatScore: 94.2,
      activeIncident: {
        id: "INC-9941",
        type: "fire_outbreak",
        severity: "P1",
        title: "P1: Thermal & Optical Combustion Flashover",
        consensus: 0.942,
        timestamp: "14:28:12 IST",
      },
    },
    {
      id: "bldg-quad",
      name: "Central Academic Quad & Grand Atrium",
      code: "QUAD-A",
      type: "High-Density Gathering Plaza",
      mgrs: "43Q FK 8935 4350",
      coords: { lat: 12.9722, lng: 77.5958 },
      iso: { gx: 360, gy: 180, gw: 200, gl: 160, height: 50 },
      colorTop: "#1E293B",
      colorLeft: "#111827",
      colorRight: "#0B0F19",
      accent: "#F59E0B",
      sensors: { temp: 27.2, smoke: 30, co: 12, sound: 64.0, status: "ELEVATED_MOTION" },
      cameras: [
        { id: "CAM-01", name: "CAM-01 (Quad Pedestrian Walkway)", heading: 45, fov: 80, range: 140, is_alert: true },
        { id: "CAM-02", name: "CAM-02 (Grand Stairs & Plaza)", heading: 310, fov: 70, range: 120 },
      ],
      status: "elevated",
      threatScore: 78.6,
      activeIncident: {
        id: "INC-9938",
        type: "fall_detected",
        severity: "P2",
        title: "P2: Subject Recumbent Fall with Post-Fall Immobility",
        consensus: 0.884,
        timestamp: "14:24:55 IST",
      },
    },
    {
      id: "bldg-server",
      name: "Central Datacenter & Power Substation",
      code: "SRV-TOWER",
      type: "Class-1 Mission Critical Infrastructure",
      mgrs: "43Q FK 8970 4310",
      coords: { lat: 12.9708, lng: 77.5965 },
      iso: { gx: 640, gy: 80, gw: 140, gl: 120, height: 90 },
      colorTop: "#162032",
      colorLeft: "#0D1322",
      colorRight: "#080C16",
      accent: "#3B82F6",
      sensors: { temp: 21.0, smoke: 25, co: 4, sound: 68.5, status: "NOMINAL" },
      cameras: [
        { id: "CAM-SRV-01", name: "CAM-SRV-01 (Datacenter Aisle 1-4)", heading: 240, fov: 60, range: 100 },
      ],
      status: "nominal",
      threatScore: 12.0,
    },
    {
      id: "bldg-cafe",
      name: "Student Activity Center & Dining Hall",
      code: "SAC-01",
      type: "High-Throughput Common Area",
      mgrs: "43Q FK 8910 4390",
      coords: { lat: 12.9735, lng: 77.5938 },
      iso: { gx: 100, gy: 320, gw: 180, gl: 140, height: 40 },
      colorTop: "#1A2536",
      colorLeft: "#0F1724",
      colorRight: "#090E17",
      accent: "#10B981",
      sensors: { temp: 29.8, smoke: 95, co: 15, sound: 74.0, status: "NOMINAL_ACTIVE" },
      cameras: [
        { id: "CAM-04", name: "CAM-04 (Cafeteria Main Hall)", heading: 90, fov: 85, range: 130 },
      ],
      status: "nominal",
      threatScore: 24.5,
    },
    {
      id: "bldg-lib",
      name: "Memorial University Library & Archives",
      code: "LIB-CENTRAL",
      type: "Silent Zone & Research Repository",
      mgrs: "43Q FK 8980 4380",
      coords: { lat: 12.9730, lng: 77.5975 },
      iso: { gx: 650, gy: 280, gw: 170, gl: 150, height: 60 },
      colorTop: "#1D2338",
      colorLeft: "#111624",
      colorRight: "#0A0D18",
      accent: "#8B5CF6",
      sensors: { temp: 22.1, smoke: 20, co: 5, sound: 34.0, status: "QUIET_COMPLIANT" },
      cameras: [
        { id: "CAM-LIB-01", name: "CAM-LIB-01 (Atrium Reading Zone)", heading: 270, fov: 70, range: 110 },
      ],
      status: "nominal",
      threatScore: 8.5,
    },
    {
      id: "bldg-hostel",
      name: "East Student Hostels & Residential Quad",
      code: "HST-C",
      type: "Residential Living Quarters",
      mgrs: "43Q FK 8940 4430",
      coords: { lat: 12.9745, lng: 77.5955 },
      iso: { gx: 380, gy: 400, gw: 190, gl: 130, height: 55 },
      colorTop: "#1F2937",
      colorLeft: "#111827",
      colorRight: "#090D15",
      accent: "#F59E0B",
      sensors: { temp: 24.5, smoke: 35, co: 9, sound: 51.0, status: "PERIMETER_MONITORED" },
      cameras: [
        { id: "CAM-HST-01", name: "CAM-HST-01 (Hostel Gate B Barrier)", heading: 180, fov: 75, range: 125, is_alert: true },
      ],
      status: "elevated",
      threatScore: 62.0,
      activeIncident: {
        id: "INC-9932",
        type: "unauthorized_vehicle",
        severity: "P3",
        title: "P3: Non-Whitelisted Vehicle Ingress (Plate: DL-01-AB-1234)",
        consensus: 0.825,
        timestamp: "14:18:02 IST",
      },
    },
  ]);

  // Quick Response Team Tactical Patrol Units
  const [guards, setGuards] = useState<GuardUnit[]>([
    {
      id: "QRT-01",
      callsign: "EAGLE-1",
      name: "Officer Rajesh Sharma (Team Lead)",
      gx: 330,
      gy: 210,
      targetGx: 180,
      targetGy: 140,
      heading: 140,
      speed: 1.8,
      status: "intercepting",
      etaSeconds: 42,
      assignedIncident: "INC-9941",
    },
    {
      id: "QRT-02",
      callsign: "HAWK-2",
      name: "Officer Priya Nair (Paramedic)",
      gx: 200,
      gy: 130,
      targetGx: 200,
      targetGy: 130,
      heading: 210,
      speed: 0.4,
      status: "patrol",
      etaSeconds: 0,
      assignedIncident: "INC-9941",
    },
    {
      id: "QRT-03",
      callsign: "FALCON-3",
      name: "Officer Vikram Singh",
      gx: 600,
      gy: 320,
      heading: 330,
      speed: 1.2,
      status: "patrol",
    },
    {
      id: "QRT-04",
      callsign: "SENTINEL-4",
      name: "Officer Amit Patel",
      gx: 580,
      gy: 120,
      heading: 85,
      speed: 0.0,
      status: "standby",
    },
  ]);

  // Selected building reference
  const selectedBuilding = useMemo(() => {
    return buildings.find((b) => b.id === selectedBuildingId) || buildings[0];
  }, [buildings, selectedBuildingId]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2.5D Isometric Projection Helper Functions
  // ──────────────────────────────────────────────────────────────────────────
  const isoProject = (gx: number, gy: number, gz: number = 0) => {
    // 2:1 Isometric projection angle
    const ix = (gx - gy) * Math.cos(Math.PI / 6);
    const iy = (gx + gy) * Math.sin(Math.PI / 6) - gz;
    return { x: ix, y: iy };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // High-Performance Canvas Renderer Loop
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const w = (canvas.width = canvas.parentElement?.clientWidth || 1100);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 680);

      ctx.clearRect(0, 0, w, h);

      // Save canvas state for Pan & Zoom
      ctx.save();
      ctx.translate(w / 2 + pan.x, h / 3 + pan.y);
      ctx.scale(zoom, zoom);

      // ── 1. Draw Defense-Grade Isometric Grid Ground ─────────────────────
      const gridSize = 900;
      const step = 45;

      ctx.strokeStyle = "rgba(59, 130, 246, 0.06)";
      ctx.lineWidth = 1;

      for (let x = -gridSize; x <= gridSize; x += step) {
        const p1 = isoProject(x, -gridSize);
        const p2 = isoProject(x, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      for (let y = -gridSize; y <= gridSize; y += step) {
        const p1 = isoProject(-gridSize, y);
        const p2 = isoProject(gridSize, y);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // ── 2. Campus Tactical Geofence Outer Boundary ──────────────────────
      const geoPoints = [
        isoProject(40, 40),
        isoProject(780, 40),
        isoProject(780, 520),
        isoProject(40, 520),
      ];

      ctx.strokeStyle = geofenceActive ? "rgba(239, 68, 68, 0.8)" : "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(geoPoints[0].x, geoPoints[0].y);
      geoPoints.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // ── 3. Draw Camera Coverage Cones (FOV Frustums) ────────────────────
      buildings.forEach((b) => {
        b.cameras.forEach((cam) => {
          const baseIso = isoProject(b.iso.gx + b.iso.gw / 2, b.iso.gy + b.iso.gl / 2, b.iso.height);
          const rad = (cam.heading * Math.PI) / 180;
          const halfFov = ((cam.fov / 2) * Math.PI) / 180;

          const pLeftGround = isoProject(
            b.iso.gx + b.iso.gw / 2 + Math.cos(rad - halfFov) * cam.range,
            b.iso.gy + b.iso.gl / 2 + Math.sin(rad - halfFov) * cam.range,
            0
          );
          const pRightGround = isoProject(
            b.iso.gx + b.iso.gw / 2 + Math.cos(rad + halfFov) * cam.range,
            b.iso.gy + b.iso.gl / 2 + Math.sin(rad + halfFov) * cam.range,
            0
          );

          // Glowing FOV fan
          const grad = ctx.createRadialGradient(baseIso.x, baseIso.y, 10, baseIso.x, baseIso.y, cam.range * 1.5);
          if (cam.is_alert) {
            grad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
            grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");
          } else {
            grad.addColorStop(0, "rgba(59, 130, 246, 0.22)");
            grad.addColorStop(1, "rgba(59, 130, 246, 0.0)");
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(baseIso.x, baseIso.y);
          ctx.lineTo(pLeftGround.x, pLeftGround.y);
          ctx.lineTo(pRightGround.x, pRightGround.y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = cam.is_alert ? "rgba(239, 68, 68, 0.7)" : "rgba(59, 130, 246, 0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });

      // ── 4. Draw QRT Intercept Vector Lines ──────────────────────────────
      guards.forEach((g) => {
        if (g.targetGx && g.targetGy && g.status === "intercepting") {
          const start = isoProject(g.gx, g.gy, 10);
          const end = isoProject(g.targetGx, g.targetGy, 10);

          ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -tick * 0.5;

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Mid-vector ETA tag
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
          ctx.fillRect(midX - 34, midY - 10, 68, 20);
          ctx.strokeStyle = "#10B981";
          ctx.strokeRect(midX - 34, midY - 10, 68, 20);

          ctx.fillStyle = "#10B981";
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(`ETA ${g.etaSeconds}s`, midX, midY + 4);
        }
      });

      // ── 5. Draw 3D Isometric Buildings (Sorted back-to-front by depth) ──
      const sortedBuildings = [...buildings].sort((a, b) => a.iso.gx + a.iso.gy - (b.iso.gx + b.iso.gy));

      sortedBuildings.forEach((b) => {
        const isSelected = b.id === selectedBuildingId;
        const { gx, gy, gw, gl, height } = b.iso;

        // Base ground corners
        const g0 = isoProject(gx, gy, 0);
        const g1 = isoProject(gx + gw, gy, 0);
        const g2 = isoProject(gx + gw, gy + gl, 0);
        const g3 = isoProject(gx, gy + gl, 0);

        // Roof top corners (extruded by height)
        const r0 = isoProject(gx, gy, height);
        const r1 = isoProject(gx + gw, gy, height);
        const r2 = isoProject(gx + gw, gy + gl, height);
        const r3 = isoProject(gx, gy + gl, height);

        // A. Drop Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.beginPath();
        ctx.moveTo(g0.x, g0.y);
        ctx.lineTo(g1.x, g1.y);
        ctx.lineTo(g2.x + 20, g2.y + 10);
        ctx.lineTo(g3.x + 20, g3.y + 10);
        ctx.closePath();
        ctx.fill();

        // B. Left Wall Face
        ctx.fillStyle = isSelected ? "rgba(59,130,246,0.3)" : b.colorLeft;
        ctx.beginPath();
        ctx.moveTo(g3.x, g3.y);
        ctx.lineTo(g2.x, g2.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.lineTo(r3.x, r3.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#60A5FA" : "rgba(255,255,255,0.08)";
        ctx.stroke();

        // C. Right Wall Face
        ctx.fillStyle = isSelected ? "rgba(59,130,246,0.2)" : b.colorRight;
        ctx.beginPath();
        ctx.moveTo(g1.x, g1.y);
        ctx.lineTo(g2.x, g2.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.lineTo(r1.x, r1.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#60A5FA" : "rgba(255,255,255,0.08)";
        ctx.stroke();

        // D. Top Roof Face
        ctx.fillStyle = isSelected ? "rgba(59,130,246,0.45)" : b.colorTop;
        ctx.beginPath();
        ctx.moveTo(r0.x, r0.y);
        ctx.lineTo(r1.x, r1.y);
        ctx.lineTo(r2.x, r2.y);
        ctx.lineTo(r3.x, r3.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#60A5FA" : b.accent;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // E. Rooftop Architectural Detailing (Helipad or HVAC cluster)
        const rc = isoProject(gx + gw / 2, gy + gl / 2, height);
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(rc.x, rc.y, 16, 0, Math.PI * 2);
        ctx.stroke();

        // F. Floating Tactical Hologram Label Badge
        const tagY = r0.y - 28;
        ctx.fillStyle = "rgba(5, 8, 14, 0.88)";
        ctx.beginPath();
        ctx.roundRect(rc.x - 55, tagY - 14, 110, 26, 4);
        ctx.fill();

        ctx.strokeStyle = b.status === "critical" ? "#EF4444" : isSelected ? "#60A5FA" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pulsing dot on threat
        if (b.status === "critical" || b.status === "elevated") {
          const dotColor = b.status === "critical" ? "#EF4444" : "#F59E0B";
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(rc.x - 44, tagY - 1, 4 + Math.sin(tick * 0.1) * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(b.code, rc.x - 34, tagY + 3);

        ctx.fillStyle = b.status === "critical" ? "#EF4444" : "#94A3B8";
        ctx.font = "8.5px sans-serif";
        ctx.fillText(`${b.threatScore}% THREAT`, rc.x + 10, tagY + 3);
      });

      // ── 6. Draw Live On-Duty QRT Guard Units ─────────────────────────────
      guards.forEach((g) => {
        const gp = isoProject(g.gx, g.gy, 12);

        // Guard Beacon
        ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
        ctx.beginPath();
        ctx.arc(gp.x, gp.y, 12 + Math.sin(tick * 0.15) * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#10B981";
        ctx.beginPath();
        ctx.arc(gp.x, gp.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(10, 15, 29, 0.9)";
        ctx.fillRect(gp.x + 10, gp.y - 12, 60, 18);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.strokeRect(gp.x + 10, gp.y - 12, 60, 18);

        ctx.fillStyle = "#10B981";
        ctx.font = "bold 8.5px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(g.callsign, gp.x + 14, gp.y);
      });

      ctx.restore();
      animFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameId);
  }, [zoom, pan, buildings, guards, selectedBuildingId, geofenceActive]);

  // ──────────────────────────────────────────────────────────────────────────
  // Interactive Canvas Mouse Handlers (Pan & Click-to-Select)
  // ──────────────────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Approximate picking logic on isometric layout
    const clickX = e.clientX - rect.left - rect.width / 2 - pan.x;
    const clickY = e.clientY - rect.top - rect.height / 3 - pan.y;

    // Find closest building center
    let closestId = buildings[0].id;
    let minDist = Infinity;

    buildings.forEach((b) => {
      const { x, y } = isoProject(b.iso.gx + b.iso.gw / 2, b.iso.gy + b.iso.gl / 2, b.iso.height / 2);
      const dist = Math.hypot(x * zoom - clickX, y * zoom - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestId = b.id;
      }
    });

    if (minDist < 120 * zoom) {
      setSelectedBuildingId(closestId);
    }
  };

  const dispatchQRT = (guardId: string, bldg: CampusBuilding) => {
    setGuards((prev) =>
      prev.map((g) =>
        g.id === guardId
          ? {
              ...g,
              status: "intercepting",
              targetGx: bldg.iso.gx + bldg.iso.gw / 2,
              targetGy: bldg.iso.gy + bldg.iso.gl / 2,
              etaSeconds: 38,
              assignedIncident: bldg.activeIncident?.id || "INC-TACTICAL",
            }
          : g
      )
    );
    showToast(`TACTICAL DISPATCH: ${guardId} routed to ${bldg.code} (${bldg.name}). Optimal intercept vector calculated.`, "success");
  };

  return (
    <ToastProvider>
      <AppLayout>
        {/* PALANTIR-STYLE TOP C4ISR TACTICAL STATUS BAR */}
        <div
          style={{
            background: "linear-gradient(90deg, #0A0F1D 0%, #05080E 100%)",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: "10px",
            padding: "10px 18px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(59,130,246,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 900, fontSize: "0.85rem", color: "#EF4444", letterSpacing: "0.08em" }}>
                {threatLevel} ACTIVE
              </span>
            </div>
            <div style={{ height: "16px", width: "1px", background: "rgba(255,255,255,0.15)" }} />
            <div style={{ fontSize: "0.78rem", color: "#94A3B8", fontFamily: "JetBrains Mono, monospace" }}>
              GEOLOCUS: <strong style={{ color: "#E2E8F0" }}>VIGINT_CAMPUS_GRID_01 (43Q FK 8920 4360)</strong>
            </div>
            <div style={{ height: "16px", width: "1px", background: "rgba(255,255,255,0.15)" }} />
            <div style={{ fontSize: "0.78rem", color: "#94A3B8", fontFamily: "JetBrains Mono, monospace" }}>
              CONSENSUS RATE: <strong style={{ color: "var(--green)" }}>98.4% (&lt;1.8% FP)</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setGeofenceActive(!geofenceActive)}
              className="btn btn-secondary btn-sm"
              style={{
                background: geofenceActive ? "rgba(239, 68, 68, 0.2)" : "rgba(59,130,246,0.1)",
                borderColor: geofenceActive ? "#EF4444" : "rgba(59,130,246,0.3)",
                color: geofenceActive ? "#EF4444" : "#60A5FA",
                fontSize: "0.75rem",
                fontWeight: 800,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              <ShieldIcon size={14} />
              {geofenceActive ? "DISARM PERIMETER GEOFENCE" : "ENGAGE PERIMETER GEOFENCE"}
            </button>

            <button
              onClick={() => {
                setZoom(1.15);
                setPan({ x: 0, y: -20 });
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}
            >
              RE-CENTER C4ISR
            </button>
          </div>
        </div>

        {/* MAIN COMMAND CONSOLE: LEFT HIERARCHY | CENTER 2.5D CANVAS | RIGHT DEEP DOSSIER */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 380px", gap: "16px", minHeight: "700px" }}>
          {/* LEFT PANE: ASSET TREE & TACTICAL LAYERS */}
          <div
            className="card"
            style={{
              padding: "16px",
              background: "#080C16",
              border: "1px solid rgba(59,130,246,0.18)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#60A5FA", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <SignalIcon size={14} /> Campus Assets & Nodes
            </div>

            {/* Buildings Tree */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "300px" }}>
              {buildings.map((b) => {
                const isSelected = b.id === selectedBuildingId;
                const isCritical = b.status === "critical";

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBuildingId(b.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isSelected ? "#3B82F6" : isCritical ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.06)"}`,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: "0.8rem", color: isSelected ? "#FFFFFF" : "#E2E8F0" }}>
                        {b.code}
                      </span>
                      <span
                        className="badge"
                        style={{
                          fontSize: "0.6rem",
                          background: isCritical ? "#EF4444" : "rgba(59,130,246,0.2)",
                          color: isCritical ? "#FFFFFF" : "#60A5FA",
                        }}
                      >
                        {b.threatScore}%
                      </span>
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tactical Units List */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--green)", marginBottom: "8px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                QRT Units on Grid ({guards.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {guards.map((g) => (
                  <div key={g.id} style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "4px", fontSize: "0.72rem", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ color: "#10B981", fontWeight: 800 }}>{g.callsign}</span>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{g.name.split(" ")[0]}</div>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: "0.6rem" }}>
                      {g.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer Filter Toggles */}
            <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", fontWeight: 700 }}>
                C4ISR View Layers
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {[
                  { id: "c4isr", label: "Tactical Cones" },
                  { id: "sensors", label: "IoT Heatmap" },
                  { id: "geofence", label: "Perimeter Poly" },
                  { id: "heat", label: "Threat Density" },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLayer(l.id as any)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      background: activeLayer === l.id ? "var(--accent)" : "rgba(255,255,255,0.04)",
                      color: activeLayer === l.id ? "white" : "var(--text-muted)",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER PANE: 2.5D INTERACTIVE ISOMETRIC CANVAS VIEWPORT */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              position: "relative",
              background: "#03060B",
              border: "1px solid rgba(59,130,246,0.25)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.9)",
            }}
          >
            {/* Viewport Top HUD Controls */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 14,
                zIndex: 10,
                display: "flex",
                gap: 8,
                background: "rgba(5,8,14,0.85)",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <button onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))} className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: "0.8rem", color: "#60A5FA" }}>
                +
              </button>
              <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))} className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: "0.8rem", color: "#60A5FA" }}>
                -
              </button>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: "0 6px", fontFamily: "JetBrains Mono, monospace" }}>
                {(zoom * 100).toFixed(0)}% MAG
              </span>
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 14,
                zIndex: 10,
                fontSize: "0.72rem",
                fontFamily: "JetBrains Mono, monospace",
                color: "#60A5FA",
                background: "rgba(5,8,14,0.85)",
                padding: "4px 10px",
                borderRadius: "4px",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              CLICK TO INSPECT · DRAG TO ORBIT PAN · MGRS {selectedBuilding.mgrs}
            </div>

            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={handleCanvasClick}
              style={{ width: "100%", height: "100%", cursor: isDragging ? "grabbing" : "grab", display: "block" }}
            />
          </div>

          {/* RIGHT PANE: PALANTIR DEEP DOSSIER & REAL-TIME INCIDENT TRIAGE */}
          <div
            className="card"
            style={{
              padding: "18px",
              background: "#080C16",
              border: "1px solid rgba(59,130,246,0.22)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              overflowY: "auto",
            }}
          >
            {/* Building Header */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span
                  className="badge"
                  style={{
                    background: selectedBuilding.status === "critical" ? "#EF4444" : "rgba(59,130,246,0.2)",
                    color: selectedBuilding.status === "critical" ? "#FFFFFF" : "#60A5FA",
                    fontSize: "0.65rem",
                    fontWeight: 900,
                  }}
                >
                  ZONE {selectedBuilding.code} · {selectedBuilding.status.toUpperCase()}
                </span>
                <span style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>
                  MGRS {selectedBuilding.mgrs.slice(0, 10)}
                </span>
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "2px 0 4px", color: "#FFFFFF" }}>
                {selectedBuilding.name}
              </h2>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{selectedBuilding.type}</div>
            </div>

            {/* Active Emergency Incident Trigger */}
            {selectedBuilding.activeIncident ? (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: "#EF4444", fontWeight: 900, fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertIcon size={14} /> {selectedBuilding.activeIncident.severity} EMERGENCY FLASH
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#FCA5A5", fontFamily: "JetBrains Mono, monospace" }}>
                    {selectedBuilding.activeIncident.timestamp}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
                  {selectedBuilding.activeIncident.title}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#CBD5E1", display: "flex", justifyContent: "space-between" }}>
                  <span>Dempster-Shafer Consensus:</span>
                  <strong style={{ color: "var(--green)" }}>{(selectedBuilding.activeIncident.consensus * 100).toFixed(1)}% Confirmed</strong>
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "6px", padding: "10px", fontSize: "0.75rem", color: "#10B981", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckIcon size={14} /> Zero active critical incidents in this sector.
              </div>
            )}

            {/* Multi-Sensor Telemetry Matrix */}
            <div>
              <div style={{ fontSize: "0.7rem", color: "#60A5FA", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
                Sector Environmental IoT Telemetry
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ background: "rgba(0,0,0,0.4)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>CORE TEMP</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: selectedBuilding.sensors.temp > 40 ? "#EF4444" : "var(--accent)" }}>
                    {selectedBuilding.sensors.temp}°C
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.4)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>MQ-2 SMOKE</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: selectedBuilding.sensors.smoke > 200 ? "#EF4444" : "var(--green)" }}>
                    {selectedBuilding.sensors.smoke} ppm
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.4)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>MQ-7 TOXIC CO</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: selectedBuilding.sensors.co > 20 ? "#EF4444" : "var(--accent)" }}>
                    {selectedBuilding.sensors.co} ppm
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.4)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>ACOUSTIC FFT</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#FFFFFF" }}>
                    {selectedBuilding.sensors.sound} dBA
                  </div>
                </div>
              </div>
            </div>

            {/* CCTV Stream Intercept Feed */}
            <div>
              <div style={{ fontSize: "0.7rem", color: "#60A5FA", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
                Associated Optics & CCTV Feeds ({selectedBuilding.cameras.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedBuilding.cameras.map((cam) => (
                  <div
                    key={cam.id}
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${cam.is_alert ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: "6px",
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "white" }}>{cam.id}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Heading {cam.heading}° · FOV {cam.fov}°</div>
                    </div>
                    <button
                      onClick={() => setLiveStreamModal({ camId: cam.id, name: cam.name })}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CameraIcon size={12} /> PIP
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical QRT Dispatch Action */}
            <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
              <button
                onClick={() => dispatchQRT("QRT-01", selectedBuilding)}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  gap: 8,
                  background: selectedBuilding.status === "critical" ? "#EF4444" : "var(--accent)",
                  borderColor: selectedBuilding.status === "critical" ? "#EF4444" : "var(--accent)",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 20px rgba(239,68,68,0.25)",
                }}
              >
                <ShieldIcon size={16} />
                AUTHORIZE QRT INTERCEPT VECTOR
              </button>
            </div>
          </div>
        </div>

        {/* PICTURE-IN-PICTURE (PIP) LIVE STREAM MODAL */}
        {liveStreamModal && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 440,
              background: "#080C16",
              border: "1px solid #3B82F6",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
              zIndex: 1000,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(10,15,29,0.95)", borderBottom: "1px solid rgba(59,130,246,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", animation: "pulse 1s infinite" }} />
                <span style={{ fontWeight: 800, fontSize: "0.8rem", color: "white" }}>LIVE TACTICAL STREAM: {liveStreamModal.camId}</span>
              </div>
              <button onClick={() => setLiveStreamModal(null)} className="btn btn-ghost btn-sm" style={{ padding: 2 }}>
                <CloseIcon size={16} />
              </button>
            </div>

            <div style={{ position: "relative", width: "100%", height: 240, background: "#000000" }}>
              <video
                src="/storage/uploads/subway.mp4"
                autoPlay
                loop
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* HUD Reticle Overlay */}
              <div style={{ position: "absolute", top: 12, left: 12, fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace", color: "var(--green)" }}>
                ● 1080p 30FPS · YOLOv8 HUD ON
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ToastProvider>
  );
}


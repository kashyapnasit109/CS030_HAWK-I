import { useEffect, useRef, useState } from "react";

interface ThreatBlip {
  id: string;
  code: string;
  zone: string;
  type: string;
  severity: "critical" | "warning" | "neutral";
  angle: number; // in degrees
  distance: number; // 0 to 1 (normalized radius)
  time: string;
}

interface ThreatRadarCanvasProps {
  onSelectIncident?: (id: string) => void;
  selectedId?: string | null;
  className?: string;
}

export function ThreatRadarCanvas({
  onSelectIncident,
  selectedId,
  className = "",
}: ThreatRadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBlip, setHoveredBlip] = useState<ThreatBlip | null>(null);

  const blips: ThreatBlip[] = [
    { id: "INC-8942", code: "INC-8942", zone: "Vault Entry Gate", type: "UNAUTHORIZED_ENTRY", severity: "critical", angle: 45, distance: 0.72, time: "Just now" },
    { id: "INC-8941", code: "INC-8941", zone: "Loading Bay North", type: "SPEED_VIOLATION", severity: "warning", angle: 160, distance: 0.58, time: "2 min ago" },
    { id: "INC-8940", code: "INC-8940", zone: "Terminal B Lobby", type: "UNATTENDED_OBJECT", severity: "warning", angle: 280, distance: 0.85, time: "14 min ago" },
    { id: "INC-8939", code: "INC-8939", zone: "Main Perimeter Gate", type: "ANPR_MATCH", severity: "neutral", angle: 210, distance: 0.40, time: "32 min ago" },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;

    const render = () => {
      sweepAngle = (sweepAngle + 0.025) % (Math.PI * 2);
      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const maxRadius = Math.min(centerX, centerY) - 24;

      ctx.clearRect(0, 0, w, h);

      // Radar Concentric Range Rings
      [0.25, 0.5, 0.75, 1.0].forEach((ratio, idx) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * ratio, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 3 ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.12)";
        ctx.lineWidth = idx === 3 ? 1.5 : 1;
        ctx.stroke();

        // Range text
        ctx.font = "8px monospace";
        ctx.fillStyle = "rgba(16, 185, 129, 0.5)";
        ctx.fillText(`${Math.round(ratio * 100)}m`, centerX + 4, centerY - maxRadius * ratio + 10);
      });

      // Crosshair grid lines
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Diagonal Quadrant lines
      ctx.beginPath();
      const diagDist = maxRadius * 0.707;
      ctx.moveTo(centerX - diagDist, centerY - diagDist);
      ctx.lineTo(centerX + diagDist, centerY + diagDist);
      ctx.moveTo(centerX + diagDist, centerY - diagDist);
      ctx.lineTo(centerX - diagDist, centerY + diagDist);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sweeping Laser Beam Arc
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0.01)");

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, sweepAngle - 0.4, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Leading beam line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + maxRadius * Math.cos(sweepAngle),
        centerY + maxRadius * Math.sin(sweepAngle)
      );
      ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#10B981";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Draw Center Hub Radar Eye
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#10B981";
      ctx.fill();

      // Render Active Threat Incident Blips
      blips.forEach((b) => {
        const rad = (b.angle * Math.PI) / 180;
        const bx = centerX + maxRadius * b.distance * Math.cos(rad);
        const by = centerY + maxRadius * b.distance * Math.sin(rad);
        const isSelected = selectedId === b.id;

        // Blip color
        const color = b.severity === "critical" ? "#F43F5E" : b.severity === "warning" ? "#F59E0B" : "#3B82F6";

        // Blip Outer Target Ring
        ctx.beginPath();
        ctx.arc(bx, by, isSelected ? 10 : 7, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Blip Center Pulse Dot
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(b.code, bx + 10, by - 4);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelectIncident) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 24;

    blips.forEach((b) => {
      const rad = (b.angle * Math.PI) / 180;
      const bx = centerX + maxRadius * b.distance * Math.cos(rad);
      const by = centerY + maxRadius * b.distance * Math.sin(rad);
      const dist = Math.hypot(clickX - bx, clickY - by);
      if (dist < 18) {
        onSelectIncident(b.id);
        setHoveredBlip(b);
      }
    });
  };

  return (
    <div className={`relative rounded-3xl bg-[#07080B] border border-white/[0.1] overflow-hidden flex flex-col items-center justify-center p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${className}`}>
      
      {/* Top Telemetry Header */}
      <div className="absolute top-4 inset-x-6 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-hawk-emerald animate-ping" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-hawk-emerald uppercase">
            GEOSPATIAL THREAT SCANNER
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-mono text-white/50 bg-black/60 px-2 py-0.5 rounded border border-white/10">
            SWEEP: 360° · RANGE: 100M
          </span>
          <span className="text-[8px] text-white/40 font-mono tracking-wider">
            MODE: CONTINUOUS POLAR SCAN
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={440}
        height={360}
        onClick={handleCanvasClick}
        className="cursor-crosshair max-w-full"
      />

      {/* Target Inspection Overlay */}
      {hoveredBlip && (
        <div className="absolute bottom-4 inset-x-6 p-3 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hoveredBlip.severity === 'critical' ? 'bg-hawk-burgundy animate-ping' : 'bg-hawk-amber'}`} />
            <div>
              <span className="font-bold text-white block">{hoveredBlip.code} · {hoveredBlip.type}</span>
              <span className="text-[10px] text-hawk-muted">{hoveredBlip.zone}</span>
            </div>
          </div>
          <span className="text-[10px] text-hawk-emerald font-bold">{hoveredBlip.time}</span>
        </div>
      )}
    </div>
  );
}

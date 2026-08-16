import { useEffect, useRef, useState } from "react";
import { colors } from "../../design-tokens/colors";

interface InteractiveCanvasProps {
  mode: "anpr" | "velocity" | "threat" | "entry" | "misplacement";
  cameraId?: string;
  className?: string;
}

export function InteractiveCanvas({
  mode,
  cameraId = "01",
  className = "",
}: InteractiveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(30);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let frameCount = 0;
    
    // Scale canvas to match element size
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    // Mock targets / coordinates that move around in time
    const objects = [
      { id: "OBJ_984", type: "VEHICLE", baseSpeed: 55, x: 100, y: 120, vx: 1.8, vy: 0.4, w: 100, h: 70, status: "normal" },
      { id: "OBJ_412", type: "PERSON", baseSpeed: 4, x: 420, y: 180, vx: -0.6, vy: 0.2, w: 40, h: 90, status: "warning" },
      { id: "OBJ_853", type: "OBJECT", baseSpeed: 0, x: 260, y: 220, vx: 0, vy: 0, w: 35, h: 35, status: "alert" },
    ];

    // Trajectory history for velocity radar
    const trajectories: { [key: string]: { x: number; y: number }[] } = {};

    // Helper to draw premium cinematic HUD boxes instead of basic rectangles
    const drawHUDBox = (x: number, y: number, w: number, h: number, color: string, label: string, value?: string) => {
      const corner = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      
      // Draw 4 corners
      ctx.beginPath();
      // TL
      ctx.moveTo(x, y + corner); ctx.lineTo(x, y); ctx.lineTo(x + corner, y);
      // TR
      ctx.moveTo(x + w - corner, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + corner);
      // BR
      ctx.moveTo(x + w, y + h - corner); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - corner, y + h);
      // BL
      ctx.moveTo(x + corner, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - corner);
      ctx.stroke();

      // Subtle pulse fill
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1.0;

      // Crosshair in center
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
      ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw premium sleek label
      ctx.font = "bold 9px monospace";
      const labelW = ctx.measureText(label).width + (value ? ctx.measureText(" | " + value).width : 0) + 16;
      
      // Label background (glassy)
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x, y - 22, labelW, 18);
      
      // Label border line
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 22, 2, 18);

      // Label Text
      ctx.fillStyle = color;
      ctx.fillText(label, x + 8, y - 10);
      
      if (value) {
         ctx.fillStyle = "#FFFFFF";
         ctx.fillText(` | ${value}`, x + 8 + ctx.measureText(label).width, y - 10);
      }
    };

    const loop = (time: number) => {
      // Calculate FPS
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // --- Draw Camera Backdrop Grid Lines ---
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      // Verticals
      for (let x = 40; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // Horizontals
      for (let y = 40; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // --- Render Active Bounding Boxes & HUD graphics ---
      const tSec = time / 1000;

      // Update positions
      objects.forEach((obj) => {
        if (obj.baseSpeed > 0) {
          obj.x += obj.vx;
          obj.y += obj.vy;

          // Bounce limits
          if (obj.x < 30 || obj.x > w - 120) obj.vx *= -1;
          if (obj.y < 40 || obj.y > h - 100) obj.vy *= -1;
        }

        // Store trajectory points
        if (!trajectories[obj.id]) trajectories[obj.id] = [];
        trajectories[obj.id].push({ x: obj.x + obj.w / 2, y: obj.y + obj.h / 2 });
        if (trajectories[obj.id].length > 40) trajectories[obj.id].shift();
      });

      // ─── Mode 1: ANPR (License Plate Tracker) ───
      if (mode === "anpr") {
        const car = objects[0];
        
        drawHUDBox(car.x, car.y, car.w, car.h, colors.sapphire, "VEHICLE", "98%");

        // Draw plate target lock (internal targeting box)
        const px = car.x + car.w * 0.35;
        const py = car.y + car.h * 0.65;
        const pw = car.w * 0.3;
        const ph = 14;

        ctx.strokeStyle = colors.emerald;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(px, py, pw, ph);
        ctx.setLineDash([]);
        
        ctx.fillStyle = colors.emerald;
        ctx.font = "8px monospace";
        ctx.fillText("MH12-EF-1234", px, py - 4);

        // Telemetry readout sidebar
        ctx.fillStyle = "rgba(5, 5, 5, 0.85)";
        ctx.fillRect(w - 160, 10, 150, 85);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(w - 160, 10, 150, 85);
        ctx.fillStyle = colors.sapphire;
        ctx.fillRect(w - 160, 10, 2, 85);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 9px monospace";
        ctx.fillText("ANPR DIAGNOSTIC LOG", w - 150, 24);
        ctx.fillStyle = colors.textMuted;
        ctx.font = "8px monospace";
        ctx.fillText(`PLATE: MH12-EF-1234`, w - 150, 38);
        ctx.fillText(`MATCH: APPROVED_DB`, w - 150, 50);
        ctx.fillText(`LOCK: CONFIDENCE 99.4%`, w - 150, 62);
        ctx.fillText(`TIME: ${new Date().toLocaleTimeString()}`, w - 150, 74);
      }

      // ─── Mode 2: Velocity (Speed Trajectory Radar) ───
      if (mode === "velocity") {
        objects.forEach((obj) => {
          if (obj.baseSpeed === 0) return;

          const speed = obj.id === "OBJ_984" 
            ? Math.round(obj.baseSpeed + Math.sin(tSec) * 4)
            : Math.round(obj.baseSpeed + Math.cos(tSec) * 0.5);

          const isSpeeding = speed > 50;
          const statusColor = isSpeeding ? colors.burgundy : colors.emerald;

          // Draw trajectory tail
          const tail = trajectories[obj.id] || [];
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          tail.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.globalAlpha = 0.3;
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Premium HUD Box
          drawHUDBox(obj.x, obj.y, obj.w, obj.h, statusColor, obj.type, `${speed} KM/H`);

          // Draw movement vector line with dot at end
          const cx = obj.x + obj.w / 2;
          const cy = obj.y + obj.h / 2;
          const ex = cx + obj.vx * 15;
          const ey = cy + obj.vy * 15;
          
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          
          ctx.fillStyle = statusColor;
          ctx.beginPath();
          ctx.arc(ex, ey, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // ─── Mode 3: Threat (Anomaly / Suspicion Grid) ───
      if (mode === "threat") {
        const person = objects[1];
        
        // Premium HUD Box
        drawHUDBox(person.x, person.y, person.w, person.h, colors.amber, "LOITERING", "SUSP 84%");

        // Draw loitering heatmap pulse overlay
        ctx.fillStyle = colors.amber;
        ctx.globalAlpha = 0.05 + Math.sin(tSec * 4) * 0.02;
        ctx.beginPath();
        ctx.arc(person.x + person.w / 2, person.y + person.h / 2, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Highlight tracking coordinate target (circular lock)
        ctx.strokeStyle = colors.amber;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(person.x + person.w / 2, person.y + person.h / 2, 12 + Math.sin(tSec * 6) * 4, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(person.x + person.w / 2, person.y + person.h / 2, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ─── Mode 4: Entry (Perimeter Security Breach) ───
      if (mode === "entry") {
        // Draw restricted perimeter boundary
        ctx.strokeStyle = colors.burgundy;
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.65);
        ctx.lineTo(w, h * 0.65);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Ambient glow on border
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = colors.burgundy;
        ctx.fillRect(0, h * 0.65, w, h * 0.35);
        ctx.globalAlpha = 1.0;

        // Label perimeter
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(10, h * 0.65 - 20, 160, 20);
        ctx.fillStyle = colors.burgundy;
        ctx.fillRect(10, h * 0.65 - 20, 2, 20);
        ctx.font = "bold 8px monospace";
        ctx.fillText("RESTRICTED PERIMETER ZONE", 20, h * 0.65 - 7);

        // Draw person
        const p = objects[1];
        const isBreached = p.y + p.h > h * 0.65;
        const col = isBreached ? colors.burgundy : colors.sapphire;

        drawHUDBox(p.x, p.y, p.w, p.h, col, isBreached ? "BREACH ACTIVE" : "EXTERNAL ENTITY", isBreached ? "CRITICAL" : "TRACKING");

        if (isBreached) {
          // Flashing warning banner
          ctx.fillStyle = "rgba(159, 33, 56, 0.9)";
          ctx.fillRect(w / 2 - 200, 20, 400, 30);
          ctx.fillStyle = "#FFF";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText("! ALARM: UNAUTHORIZED PERIMETER PENETRATION !", w / 2, 40);
          ctx.textAlign = "left";
        }
      }

      // ─── Mode 5: Misplacement (Object Tracking Points) ───
      if (mode === "misplacement") {
        const item = objects[2];
        
        drawHUDBox(item.x, item.y, item.w, item.h, colors.amber, "ABANDONED_BOX", "ALERT");

        // Concentric tracking circles
        ctx.strokeStyle = colors.amber;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(item.x + item.w / 2, item.y + item.h / 2, 25 + Math.sin(tSec * 4) * 5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(item.x + item.w / 2, item.y + item.h / 2, 35 + Math.sin(tSec * 2) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Render timer countdown
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(item.x, item.y + item.h + 8, 100, 18);
        ctx.fillStyle = colors.amber;
        ctx.fillRect(item.x, item.y + item.h + 8, 2, 18);
        ctx.fillStyle = "#FFF";
        ctx.font = "9px monospace";
        const idleTime = Math.round(184 + tSec);
        ctx.fillText(`IDLE: ${idleTime}s`, item.x + 8, item.y + item.h + 20);
      }

      // --- Draw CRT Scan Telemetry Overlay ---
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.font = "9px monospace";
      ctx.fillText(`FPS: ${fps}`, 10, h - 10);
      ctx.fillText(`CAM::CH${cameraId}`, 58, h - 10);
      ctx.fillText(`RENDER::GPU_ACCEL`, w - 110, h - 10);
      
      // Moving CRT scanline
      const scanY = (time / 10) % h;
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(0, scanY, w, 2);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [mode, cameraId, fps]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full rounded-xl border border-white/5 overflow-hidden bg-[#030406] shadow-inner ${className}`}
      style={{ minHeight: "260px" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none z-10"
      />
      {/* Decorative HUD targeted corner lines */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/20 pointer-events-none" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/20 pointer-events-none" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/20 pointer-events-none" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/20 pointer-events-none" />
    </div>
  );
}

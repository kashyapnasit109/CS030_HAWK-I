import { useState, useRef } from "react";
import type { ReactNode } from "react";

interface HudOverlayProps {
  children: ReactNode;
  cameraId?: string;
  className?: string;
  showCrosshairs?: boolean;
}

export function HudOverlay({
  children,
  cameraId = "01",
  className = "",
  showCrosshairs = true,
}: HudOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setCoords({ x, y });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group overflow-hidden border border-white/5 bg-[#0B0B0E] rounded-md ${className}`}
    >
      {/* Base Card Bracket Corners */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <span className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-hawk-sapphire/40 group-hover:border-hawk-sapphire group-hover:drop-shadow-[0_0_2px_#3D6FE0] transition-colors duration-300" />
        <span className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-hawk-sapphire/40 group-hover:border-hawk-sapphire group-hover:drop-shadow-[0_0_2px_#3D6FE0] transition-colors duration-300" />
        <span className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-hawk-sapphire/40 group-hover:border-hawk-sapphire group-hover:drop-shadow-[0_0_2px_#3D6FE0] transition-colors duration-300" />
        <span className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-hawk-sapphire/40 group-hover:border-hawk-sapphire group-hover:drop-shadow-[0_0_2px_#3D6FE0] transition-colors duration-300" />
      </div>

      {/* Render children inside container */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>

      {/* Flagship HUD Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none z-20 select-none flex flex-col justify-between p-3 font-mono text-[9px] text-hawk-muted/70">
        {/* Top telemetry bar */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-white/5">
            <span className="h-1.5 w-1.5 rounded-full bg-hawk-sapphire animate-pulse" />
            <span className="font-bold text-white tracking-wider">FEED::{cameraId}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-white/5 text-[8.5px]">
            <span className="h-1.5 w-1.5 rounded-full bg-hawk-burgundy animate-ping" />
            <span className="font-bold text-white uppercase tracking-widest">LIVE</span>
          </div>
        </div>

        {/* Center Crosshairs */}
        {showCrosshairs && isHovered && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Center target cursor with Chromatic Aberration */}
            <div className="relative flex items-center justify-center filter drop-shadow-[1px_0_0_rgba(255,0,0,0.5)] drop-shadow-[-1px_0_0_rgba(0,255,255,0.5)]">
              <span className="absolute h-8 w-8 rounded-full border border-hawk-sapphire/30 animate-spin" style={{ animationDuration: "12s" }} />
              <span className="absolute h-4 w-4 rounded-full border border-hawk-sapphire/50" />
              <span className="absolute h-px w-14 bg-hawk-sapphire/40" />
              <span className="absolute w-px h-14 bg-hawk-sapphire/40" />
            </div>
          </div>
        )}

        {/* Bottom coordinates display */}
        <div className="flex justify-between items-end mt-auto">
          <div className="bg-black/60 px-2 py-0.5 rounded border border-white/5">
            <span className="text-[8px] text-hawk-muted">RES: </span>
            <span className="font-semibold text-white">1920x1080</span>
          </div>

          <div className="bg-black/60 px-2 py-0.5 rounded border border-white/5 font-mono text-[8px] transition-opacity duration-300 opacity-0 group-hover:opacity-100">
            <span>X:</span>
            <span className="text-white font-bold ml-0.5">{String(coords.x).padStart(3, "0")}</span>
            <span className="mx-1 text-hawk-muted">|</span>
            <span>Y:</span>
            <span className="text-white font-bold ml-0.5">{String(coords.y).padStart(3, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

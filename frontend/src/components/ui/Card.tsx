import type { ReactNode } from "react";
import { useRef, useState } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "sapphire" | "emerald" | "burgundy" | "amber" | "none";
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  corners?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  glowColor = "none",
  interactive = false,
  padding = "md",
  onClick,
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const paddingMap = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const glowStyles = {
    none: "",
    sapphire: "hover:border-hawk-sapphire/40 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)]",
    emerald: "hover:border-hawk-emerald/40 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)]",
    burgundy: "hover:border-hawk-burgundy/40 hover:shadow-[0_20px_50px_rgba(244,63,94,0.15)]",
    amber: "hover:border-hawk-amber/40 hover:shadow-[0_20px_50px_rgba(245,158,11,0.15)]",
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-2xl bg-gradient-to-b from-[#0E121C]/90 to-[#080A10]/95 backdrop-blur-2xl border border-white/[0.08] transition-all duration-300 overflow-hidden ${
        interactive ? "cursor-pointer " + glowStyles[glowColor] : ""
      } ${paddingMap[padding]} ${className}`}
    >
      {/* Dynamic Cursor Spotlight Radial Layer */}
      {interactive && isHovered && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.06), transparent 70%)`,
          }}
        />
      )}

      {/* Top Hairline Highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

import type { SemanticColor } from "../../design-tokens/colors";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: SemanticColor;
  label?: string;
  className?: string;
}

const colorGradients: Record<SemanticColor, { stroke: string; glow: string }> = {
  emerald: { stroke: "#10B981", glow: "rgba(16, 185, 129, 0.5)" },
  blue: { stroke: "#3B82F6", glow: "rgba(59, 130, 246, 0.5)" },
  violet: { stroke: "#8B5CF6", glow: "rgba(139, 92, 246, 0.5)" },
  crimson: { stroke: "#EF4444", glow: "rgba(239, 68, 68, 0.5)" },
  amber: { stroke: "#F59E0B", glow: "rgba(245, 158, 11, 0.5)" },
};

export function ProgressRing({
  value,
  size = 160,
  strokeWidth = 9,
  color = "emerald",
  label = "Peak Optimal",
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const cfg = colorGradients[color];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <defs>
          <filter id={`hawk-ring-glow-${color}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Glowing Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={cfg.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#hawk-ring-glow-${color})`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center Display Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="text-3xl font-extrabold tracking-tight text-white"
          style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
        >
          {value}%
        </span>
        {label && (
          <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-hawk-emerald">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

import { colors, type SemanticColor } from "../../design-tokens/colors";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: SemanticColor;
  label?: string;
  className?: string;
}

/** Ring stroke colors pulled from the jewel-tone token source. */
const strokeMap: Record<SemanticColor, string> = {
  burgundy: colors.burgundy,
  sapphire: colors.sapphire,
  emerald: colors.emerald,
  amber: colors.amber,
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
  const stroke = strokeMap[color];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Sharp progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold tracking-tight text-white font-display">
          {value}%
        </span>
        {label && (
          <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-hawk-emerald font-body">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

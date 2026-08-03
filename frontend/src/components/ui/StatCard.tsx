import type { ReactNode } from "react";
import type { SemanticColor } from "../../design-tokens/colors";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: ReactNode;
  trendDirection?: "up" | "down" | "neutral";
  accentColor?: SemanticColor;
  className?: string;
}

const trendColors = {
  up: "text-hawk-emerald bg-hawk-emerald/10 border-hawk-emerald/30",
  down: "text-hawk-crimson bg-hawk-crimson/10 border-hawk-crimson/30",
  neutral: "text-hawk-muted bg-white/5 border-white/10",
} as const;

const accentGradient: Record<SemanticColor, string> = {
  blue: "bg-gradient-to-br from-hawk-blue/30 to-hawk-blue-deep/80 text-hawk-blue border-hawk-blue/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  violet: "bg-gradient-to-br from-hawk-violet/30 to-hawk-violet-deep/80 text-hawk-violet border-hawk-violet/40 shadow-[0_0_15px_rgba(139,92,246,0.3)]",
  crimson: "bg-gradient-to-br from-hawk-crimson/30 to-hawk-crimson-deep/80 text-hawk-crimson border-hawk-crimson/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  emerald: "bg-gradient-to-br from-hawk-emerald/30 to-hawk-emerald-deep/80 text-hawk-emerald border-hawk-emerald/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
  amber: "bg-gradient-to-br from-hawk-amber/30 to-amber-900/80 text-hawk-amber border-hawk-amber/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
};

const glowMap: Record<SemanticColor, string> = {
  blue: "hawk-glass-card--glow-blue",
  violet: "hawk-glass-card--glow-violet",
  crimson: "hawk-glass-card--glow-crimson",
  emerald: "hawk-glass-card--glow-emerald",
  amber: "hawk-glass-card--glow-violet",
};

export function StatCard({
  icon,
  value,
  label,
  trend,
  trendDirection = "neutral",
  accentColor = "blue",
  className = "",
}: StatCardProps) {
  return (
    <div className={`hawk-glass-card hawk-glass-card--interactive ${glowMap[accentColor]} p-6 ${className}`}>
      {/* Icon badge in top-right corner */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-hawk-muted">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${accentGradient[accentColor]}`}>
          {icon}
        </div>
      </div>

      {/* Large display number in Outfit geometric style */}
      <div
        className="mt-3 text-4xl font-extrabold tracking-tight text-white"
        style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
      >
        {value}
      </div>

      {/* Trend indicator pill */}
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${trendColors[trendDirection]}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  accentColor?: "sapphire" | "emerald" | "burgundy" | "amber";
  code?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  trendDirection = "up",
  accentColor = "sapphire",
}: StatCardProps) {
  const accentGlow = {
    sapphire: "text-hawk-sapphire bg-hawk-sapphire/10 border-hawk-sapphire/20",
    emerald: "text-hawk-emerald bg-hawk-emerald/10 border-hawk-emerald/20",
    burgundy: "text-hawk-burgundy bg-hawk-burgundy/10 border-hawk-burgundy/20",
    amber: "text-hawk-amber bg-hawk-amber/10 border-hawk-amber/20",
  };

  const trendColors = {
    up: "text-hawk-emerald bg-hawk-emerald/10 border-hawk-emerald/20",
    down: "text-hawk-burgundy bg-hawk-burgundy/10 border-hawk-burgundy/20",
    neutral: "text-white/40 bg-white/5 border-white/10",
  };

  return (
    <Card padding="md" interactive glowColor={accentColor} className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-hawk-muted font-semibold">
          {label}
        </span>
        {icon && (
          <div className={`p-2.5 rounded-xl border ${accentGlow[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight tabular-nums drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">
          {value}
        </div>
        {trend && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${trendColors[trendDirection]}`}>
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-hawk-muted/80">
          <span className="line-clamp-1">{subtext}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-hawk-emerald animate-pulse shrink-0 ml-2" />
        </div>
      )}
    </Card>
  );
}

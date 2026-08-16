import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "sapphire" | "emerald" | "burgundy" | "amber" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  dot = false,
  className = "",
}: BadgeProps) {
  const variantStyles = {
    sapphire: "bg-hawk-sapphire/10 text-hawk-sapphire border-hawk-sapphire/20",
    emerald: "bg-hawk-emerald/10 text-hawk-emerald border-hawk-emerald/20",
    burgundy: "bg-hawk-burgundy/10 text-hawk-burgundy border-hawk-burgundy/20",
    amber: "bg-hawk-amber/10 text-hawk-amber border-hawk-amber/20",
    neutral: "bg-white/[0.04] text-white/70 border-white/10",
  };

  const dotColors = {
    sapphire: "bg-hawk-sapphire",
    emerald: "bg-hawk-emerald",
    burgundy: "bg-hawk-burgundy",
    amber: "bg-hawk-amber",
    neutral: "bg-white/40",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium tracking-wide uppercase ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

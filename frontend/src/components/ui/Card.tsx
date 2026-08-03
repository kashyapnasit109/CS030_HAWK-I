import type { ReactNode } from "react";

type GlowColor = "blue" | "violet" | "crimson" | "emerald" | "amber";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  glowColor?: GlowColor;
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

const glowMap: Record<GlowColor, string> = {
  blue: "hawk-glass-card--glow-blue",
  violet: "hawk-glass-card--glow-violet",
  crimson: "hawk-glass-card--glow-crimson",
  emerald: "hawk-glass-card--glow-emerald",
  amber: "hawk-glass-card--glow-violet",
};

export function Card({
  children,
  className = "",
  padding = "md",
  interactive = false,
  glowColor,
}: CardProps) {
  const interactiveClass = interactive || glowColor ? "hawk-glass-card--interactive" : "";
  const glowClass = glowColor ? glowMap[glowColor] : "";

  return (
    <div className={`hawk-glass-card ${interactiveClass} ${glowClass} ${paddingMap[padding]} ${className}`}>
      {children}
    </div>
  );
}

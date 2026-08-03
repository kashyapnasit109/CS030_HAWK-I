import type { ReactNode } from "react";

export type BadgeVariant =
  | "emerald"
  | "blue"
  | "violet"
  | "crimson"
  | "amber"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "burgundy"
  | "sapphire";

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<
  BadgeVariant,
  { bg: string; text: string; border: string; dotClass: string }
> = {
  emerald: {
    bg: "bg-[#10B981]/15",
    text: "text-[#10B981]",
    border: "border-[#10B981]/30",
    dotClass: "hawk-dot--emerald",
  },
  success: {
    bg: "bg-[#10B981]/15",
    text: "text-[#10B981]",
    border: "border-[#10B981]/30",
    dotClass: "hawk-dot--emerald",
  },
  blue: {
    bg: "bg-[#3B82F6]/15",
    text: "text-[#3B82F6]",
    border: "border-[#3B82F6]/30",
    dotClass: "hawk-dot--blue",
  },
  sapphire: {
    bg: "bg-[#3B82F6]/15",
    text: "text-[#3B82F6]",
    border: "border-[#3B82F6]/30",
    dotClass: "hawk-dot--blue",
  },
  info: {
    bg: "bg-[#3B82F6]/15",
    text: "text-[#3B82F6]",
    border: "border-[#3B82F6]/30",
    dotClass: "hawk-dot--blue",
  },
  violet: {
    bg: "bg-[#8B5CF6]/15",
    text: "text-[#8B5CF6]",
    border: "border-[#8B5CF6]/30",
    dotClass: "hawk-dot--violet",
  },
  crimson: {
    bg: "bg-[#EF4444]/15",
    text: "text-[#EF4444]",
    border: "border-[#EF4444]/30",
    dotClass: "hawk-dot--crimson",
  },
  burgundy: {
    bg: "bg-[#EF4444]/15",
    text: "text-[#EF4444]",
    border: "border-[#EF4444]/30",
    dotClass: "hawk-dot--crimson",
  },
  danger: {
    bg: "bg-[#EF4444]/15",
    text: "text-[#EF4444]",
    border: "border-[#EF4444]/30",
    dotClass: "hawk-dot--crimson",
  },
  amber: {
    bg: "bg-[#F59E0B]/15",
    text: "text-[#F59E0B]",
    border: "border-[#F59E0B]/30",
    dotClass: "hawk-dot--amber",
  },
  warning: {
    bg: "bg-[#F59E0B]/15",
    text: "text-[#F59E0B]",
    border: "border-[#F59E0B]/30",
    dotClass: "hawk-dot--amber",
  },
  neutral: {
    bg: "bg-white/5",
    text: "text-hawk-muted",
    border: "border-white/10",
    dotClass: "",
  },
};

export function Badge({ variant, children, className = "", dot = false }: BadgeProps) {
  const s = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md ${s.bg} ${s.text} ${s.border} ${className}`}
    >
      {dot && <span className={`hawk-dot ${s.dotClass}`} />}
      {children}
    </span>
  );
}

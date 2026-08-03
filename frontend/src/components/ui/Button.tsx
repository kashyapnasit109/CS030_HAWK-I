import type { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "blue" | "violet";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-hawk-blue to-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-400/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:border-blue-300 active:scale-[0.98]",
  blue:
    "bg-gradient-to-r from-hawk-blue to-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-400/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:border-blue-300 active:scale-[0.98]",
  violet:
    "bg-gradient-to-r from-hawk-violet to-purple-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-purple-400/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:border-purple-300 active:scale-[0.98]",
  secondary:
    "hawk-glass-card hawk-glass-card--interactive text-white hover:border-white/30",
  ghost:
    "bg-transparent text-hawk-muted hover:bg-white/5 hover:text-white",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-xs gap-1.5 rounded-full font-semibold",
  md: "h-10.5 px-5 text-sm gap-2 rounded-full font-bold",
  lg: "h-12 px-7 text-base gap-2.5 rounded-full font-bold",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  icon,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hawk-blue/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hawk-bg disabled:pointer-events-none disabled:opacity-40 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

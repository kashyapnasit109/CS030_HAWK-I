import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  isLoading = false,
  disabled = false,
  onClick,
  className = "",
  type = "button",
}: ButtonProps) {
  const variantStyles = {
    primary:
      "relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] border border-blue-400/30 hover:border-blue-400/60 active:scale-[0.98]",
    secondary:
      "bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 hover:border-white/20 active:scale-[0.98]",
    danger:
      "relative overflow-hidden bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-[0_8px_24px_rgba(244,63,94,0.35)] border border-rose-400/30 hover:border-rose-400/60 active:scale-[0.98]",
    outline:
      "bg-transparent text-white/80 hover:text-white hover:bg-white/[0.05] border border-white/15 hover:border-white/30 active:scale-[0.98]",
    ghost:
      "bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05] border border-transparent active:scale-[0.98]",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
    md: "px-4 py-2 text-xs rounded-xl gap-2",
    lg: "px-6 py-3 text-sm rounded-2xl gap-2.5",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-display font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed group ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {/* Subtle Shimmer Sheen on Primary/Danger */}
      {(variant === "primary" || variant === "danger") && (
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      )}

      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon && <span className="shrink-0 transition-transform group-hover:scale-110">{icon}</span>
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

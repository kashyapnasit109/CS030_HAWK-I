import type { ReactNode } from "react";

interface SectionHeaderProps {
  /** Primary heading — rendered in font-display (Sora). */
  title: string;
  /** Optional supporting line beneath the title (font-body). */
  subtitle?: string;
  /** Optional leading icon/badge shown to the left of the title. */
  icon?: ReactNode;
  /** Optional right-aligned actions (buttons, filters, etc.). */
  actions?: ReactNode;
  /** Heading size preset. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const titleSize = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

/**
 * SectionHeader — the single shared page/section title lockup.
 * Title uses font-display; supporting copy uses font-body. No inline fonts.
 */
export function SectionHeader({
  title,
  subtitle,
  icon,
  actions,
  size = "md",
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-hawk-sapphire">
            {icon}
          </div>
        )}
        <div>
          <h1 className={`${titleSize[size]} font-extrabold tracking-tight text-white font-display`}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-hawk-muted font-body">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

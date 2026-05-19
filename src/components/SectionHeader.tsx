import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  accent?: "neon" | "badge-star" | "badge-hot" | "chart-negative";
  badge?: string;
  count?: number;
  countLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ACCENT_BAR: Record<string, string> = {
  neon: "bg-neon shadow-[0_0_10px_hsl(var(--neon)/0.6)]",
  "badge-star": "bg-badge-star shadow-[0_0_10px_hsl(var(--badge-star)/0.6)]",
  "badge-hot": "bg-badge-hot shadow-[0_0_10px_hsl(var(--badge-hot)/0.6)]",
  "chart-negative": "bg-chart-negative shadow-[0_0_10px_hsl(var(--chart-negative)/0.6)] animate-pulse-neon",
};

const ACCENT_TEXT: Record<string, string> = {
  neon: "text-neon",
  "badge-star": "text-badge-star",
  "badge-hot": "text-badge-hot",
  "chart-negative": "text-chart-negative",
};

export function SectionHeader({
  eyebrow,
  title,
  accent = "neon",
  badge,
  count,
  countLabel,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("block w-1 h-8 rounded-full shrink-0", ACCENT_BAR[accent])} />
        <div className="min-w-0">
          {eyebrow && (
            <p className={cn("text-[9px] font-bold uppercase tracking-[0.2em] leading-none", ACCENT_TEXT[accent])}>
              {eyebrow}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-base font-bold tracking-tight text-foreground truncate">{title}</h2>
            {badge && (
              <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase", ACCENT_TEXT[accent], "bg-current/10")}>
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
      {(count !== undefined || actionLabel) && (
        <div className="flex items-center gap-3 shrink-0">
          {count !== undefined && (
            <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums uppercase tracking-wider">
              {count} {countLabel}
            </span>
          )}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="text-[10px] font-bold uppercase tracking-wider text-chart-negative hover:underline"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

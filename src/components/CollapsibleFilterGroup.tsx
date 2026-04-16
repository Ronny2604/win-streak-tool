import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface CollapsibleFilterGroupProps {
  icon: LucideIcon;
  label: string;
  accentClass?: string;
  activeCount?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleFilterGroup({
  icon: Icon,
  label,
  accentClass = "text-neon",
  activeCount = 0,
  defaultOpen = false,
  children,
}: CollapsibleFilterGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden transition-all">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accentClass}`} />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">{label}</span>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-neon/15 text-neon text-[10px] font-extrabold tabular-nums">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3 pt-1 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  );
}

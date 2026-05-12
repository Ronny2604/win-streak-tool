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
    <div className={`rounded-2xl border border-border/30 bg-card/30 backdrop-blur-md overflow-hidden transition-all duration-300 ${open ? "border-border/60" : ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3.5 hover:bg-card/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`block w-1 h-4 rounded-full ${accentClass.replace("text-", "bg-")}`} />
          <Icon className={`h-3.5 w-3.5 ${accentClass} opacity-80`} />
          <span className="text-[12px] font-semibold tracking-wide text-foreground">{label}</span>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-neon/15 text-neon text-[10px] font-extrabold tabular-nums">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground/70 transition-transform duration-300 ${open ? "rotate-180 text-foreground" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-3.5 pt-1 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  );
}

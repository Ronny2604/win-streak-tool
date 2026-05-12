import { Flame, TrendingUp, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickFilterType = "all" | "high-odds" | "safe" | "value" | "today-best";

interface QuickFiltersProps {
  active: QuickFilterType;
  onChange: (filter: QuickFilterType) => void;
}

const filters = [
  { id: "all" as QuickFilterType, label: "Todos", icon: null },
  { id: "today-best" as QuickFilterType, label: "Top Picks", icon: Flame },
  { id: "safe" as QuickFilterType, label: "Seguras", icon: Shield },
  { id: "high-odds" as QuickFilterType, label: "Odds Altas", icon: TrendingUp },
  { id: "value" as QuickFilterType, label: "Valor", icon: Zap },
];

export function QuickFilters({ active, onChange }: QuickFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {filters.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300",
              isActive
                ? "bg-neon text-neon-foreground shadow-[0_0_18px_-4px_hsl(var(--neon)/0.7)] scale-[1.02]"
                : "bg-card/40 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border backdrop-blur"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

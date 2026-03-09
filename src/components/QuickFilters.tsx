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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {filters.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap border",
            active === id
              ? "bg-neon/10 border-neon/50 text-neon"
              : "bg-card border-border text-muted-foreground hover:border-neon/30 hover:text-foreground"
          )}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </button>
      ))}
    </div>
  );
}

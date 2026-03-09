import { Zap, Ticket, Trophy, Radio, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "futebol" | "live" | "bilhetes" | "historico" | "premium";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isPro: boolean;
}

const tabs = [
  { id: "futebol" as Tab, label: "Jogos", icon: Trophy },
  { id: "live" as Tab, label: "Ao Vivo", icon: Radio, proOnly: true },
  { id: "bilhetes" as Tab, label: "Bilhetes", icon: Ticket },
  { id: "premium" as Tab, label: "Premium", icon: Star, proOnly: true },
];

export function BottomNav({ activeTab, onTabChange, isPro }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map(({ id, label, icon: Icon, proOnly }) => {
          const disabled = proOnly && !isPro;
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => !disabled && onTabChange(id)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[60px]",
                active && "text-neon",
                !active && !disabled && "text-muted-foreground",
                disabled && "text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(var(--neon)/0.5)]")} />
                {id === "live" && !disabled && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-chart-negative animate-pulse-neon" />
                )}
              </div>
              <span className={cn("text-[10px] font-semibold", active && "font-bold")}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

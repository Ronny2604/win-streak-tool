import { Zap, Ticket, Trophy, Radio, Star, User, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type Tab = "futebol" | "nba" | "copa" | "live" | "bilhetes" | "historico" | "premium" | "perfil";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isPro: boolean;
}

const NBAIcon = () => <span className="text-sm leading-none">🏀</span>;

const tabs = [
  { id: "futebol" as Tab, label: "Futebol", icon: Trophy },
  { id: "nba" as Tab, label: "NBA", icon: Trophy, customIcon: true },
  { id: "copa" as Tab, label: "Copa", icon: Globe },
  { id: "bilhetes" as Tab, label: "Bilhetes", icon: Ticket },
  { id: "premium" as Tab, label: "Premium", icon: Star, proOnly: true },
  { id: "perfil" as Tab, label: "Perfil", icon: User },
];

export function BottomNav({ activeTab, onTabChange, isPro }: BottomNavProps) {
  const navigate = useNavigate();

  const handleTabChange = (id: Tab) => {
    if (id === "perfil") {
      navigate("/perfil");
      return;
    }
    if (activeTab === "perfil") {
      navigate("/");
    }
    onTabChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/80 backdrop-blur-2xl md:hidden safe-area-bottom shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.3)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/40 to-transparent" />
      <div className="flex items-center justify-around px-2 py-1.5">
      {tabs.map(({ id, label, icon: Icon, proOnly, customIcon }) => {
          const disabled = proOnly && !isPro;
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => !disabled && handleTabChange(id)}
              disabled={disabled}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-300 min-w-[52px]",
                active && "text-neon",
                !active && !disabled && "text-muted-foreground hover:text-foreground",
                disabled && "text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              {active && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-neon shadow-[0_0_8px_hsl(var(--neon))]" />
              )}
              <div className={cn(
                "relative flex items-center justify-center rounded-xl transition-all duration-300",
                active && "bg-neon/10 px-2.5 py-1"
              )}>
                {customIcon ? <NBAIcon /> : <Icon className={cn("h-5 w-5 transition-all", active && "drop-shadow-[0_0_6px_hsl(var(--neon)/0.6)] scale-110")} />}
                {id === "live" && !disabled && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-chart-negative animate-pulse-neon" />
                )}
              </div>
              <span className={cn("text-[10px] font-semibold tracking-tight", active && "font-bold")}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

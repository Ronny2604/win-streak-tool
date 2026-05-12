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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
      {/* Soft gradient mask to fade content behind */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <nav className="pointer-events-auto relative mx-3 mb-3 rounded-[28px] border border-border/40 bg-card/60 backdrop-blur-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] safe-area-bottom overflow-hidden">
        {/* Top accent line */}
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-neon/50 to-transparent" />
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--neon)/0.06),transparent_60%)] pointer-events-none" />

        <div className="relative flex items-center justify-around px-1.5 py-2">
          {tabs.map(({ id, label, icon: Icon, proOnly, customIcon }) => {
            const disabled = proOnly && !isPro;
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => !disabled && handleTabChange(id)}
                disabled={disabled}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all duration-300 min-w-[48px] active:scale-95",
                  active ? "text-neon" : "text-muted-foreground/80 hover:text-foreground",
                  disabled && "text-muted-foreground/25 cursor-not-allowed hover:text-muted-foreground/25"
                )}
              >
                {/* Active pill background */}
                <span
                  className={cn(
                    "absolute inset-x-1.5 inset-y-1 rounded-2xl transition-all duration-300",
                    active
                      ? "bg-neon/10 border border-neon/25 shadow-[inset_0_0_12px_-4px_hsl(var(--neon)/0.3)] opacity-100 scale-100"
                      : "opacity-0 scale-90"
                  )}
                />
                {/* Top neon dot indicator */}
                <span
                  className={cn(
                    "absolute -top-2 left-1/2 -translate-x-1/2 h-1 rounded-full bg-neon shadow-[0_0_10px_hsl(var(--neon))] transition-all duration-300",
                    active ? "w-6 opacity-100" : "w-0 opacity-0"
                  )}
                />

                <div className="relative flex items-center justify-center">
                  {customIcon ? (
                    <span className={cn("text-base leading-none transition-transform duration-300", active && "scale-110")}>🏀</span>
                  ) : (
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-all duration-300",
                        active && "drop-shadow-[0_0_6px_hsl(var(--neon)/0.6)] scale-110",
                        !active && "group-hover:scale-105"
                      )}
                      strokeWidth={active ? 2.4 : 2}
                    />
                  )}
                  {id === "live" && !disabled && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-chart-negative animate-pulse-neon" />
                  )}
                  {proOnly && !isPro && (
                    <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-badge-star/70" />
                  )}
                </div>

                <span
                  className={cn(
                    "relative text-[9.5px] tracking-wide transition-all duration-300",
                    active ? "font-bold" : "font-semibold opacity-80"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

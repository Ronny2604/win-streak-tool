import { BarChart3, Shield, Sun, Moon, LogIn, LogOut, KeyRound, Palette, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyGate } from "@/contexts/KeyGateContext";
import { PersonalizationPanel } from "@/components/PersonalizationPanel";
import { VipBadge } from "@/components/VipBadge";
import { toast } from "sonner";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const { session: keySession, logout: keyLogout } = useKeyGate();
  const navigate = useNavigate();
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [surebetCount, setSurebetCount] = useState(0);
  const [surebetPulse, setSurebetPulse] = useState(false);
  const prevCountRef = useRef(0);

  // Listen for surebet events from the notifier
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const count = e.detail?.count || 0;
      setSurebetCount(count);
      if (count > prevCountRef.current) {
        setSurebetPulse(true);
        setTimeout(() => setSurebetPulse(false), 3000);
      }
      prevCountRef.current = count;
    };
    window.addEventListener("surebet-update" as any, handler as any);
    return () => window.removeEventListener("surebet-update" as any, handler as any);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-neon/30 to-transparent" />
        <div className="container flex h-14 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon/15 to-transparent border border-neon/25 transition-all group-hover:border-neon/50">
              <BarChart3 className="h-4 w-4 text-neon" />
              <span className="absolute inset-0 rounded-xl bg-neon/10 blur-md -z-10" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-extrabold tracking-tight text-foreground">
                WIN<span className="text-neon">STREAK</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70 font-semibold mt-0.5">
                {keySession.valid && keySession.plan === "pro" ? "RonnyBR Premium" : "RonnyBR"}
              </span>
            </div>
            {keySession.valid && keySession.plan && (
              <VipBadge plan={keySession.plan} />
            )}
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => {
                if (surebetCount > 0) {
                  window.dispatchEvent(new CustomEvent("navigate-to-surebet"));
                } else {
                  toast.info("Nenhuma surebet ativa no momento", {
                    description: "Você será notificado quando uma oportunidade surgir.",
                  });
                }
              }}
              className={`relative rounded-full p-2 transition-all ${
                surebetCount > 0
                  ? "text-neon hover:bg-neon/10"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              } ${surebetPulse ? "animate-bounce" : ""}`}
              title={surebetCount > 0 ? `${surebetCount} surebet(s) ativa(s)` : "Sem surebets no momento"}
            >
              <Bell className={`h-4 w-4 ${surebetCount > 0 ? "fill-neon" : ""}`} />
              {surebetCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-chart-negative text-[9px] font-bold text-primary-foreground">
                  {surebetCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowPersonalization(true)}
              className="rounded-full p-2 text-muted-foreground hover:bg-card/60 hover:text-foreground transition-colors"
              title="Personalizar"
            >
              <Palette className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-muted-foreground hover:bg-card/60 hover:text-foreground transition-colors"
              title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-full p-2 text-muted-foreground hover:bg-card/60 hover:text-foreground transition-colors"
                title="Admin"
              >
                <Shield className="h-4 w-4" />
              </Link>
            )}
            {user ? (
              <button
                onClick={async () => {
                  keyLogout();
                  await signOut();
                  toast.success("Até logo! 👋", {
                    description: "Você saiu da sua conta com sucesso.",
                    duration: 3000,
                  });
                  navigate("/");
                }}
                className="rounded-full p-2 text-muted-foreground hover:bg-card/60 hover:text-foreground transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-full p-2 text-muted-foreground hover:bg-card/60 hover:text-foreground transition-colors"
                title="Entrar"
              >
                <LogIn className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Personalization Drawer */}
      {showPersonalization && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setShowPersonalization(false)}
          />
          {/* Panel */}
          <aside className="relative ml-auto h-full w-full max-w-sm bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Personalização</h2>
              </div>
              <button
                onClick={() => setShowPersonalization(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5">
              <PersonalizationPanel />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

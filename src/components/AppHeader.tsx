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
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-[0_1px_0_0_hsl(var(--border)/0.3)]">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-neon/40 to-transparent" />
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon/20 to-neon/5 border border-neon/30">
              <BarChart3 className="h-4.5 w-4.5 text-neon" />
              <span className="absolute inset-0 rounded-xl bg-neon/10 blur-md -z-10" />
            </div>
            <Link to="/" className="text-lg font-extrabold tracking-tight text-foreground leading-none">
              Ronny<span className="bg-gradient-to-r from-neon to-neon-glow bg-clip-text text-transparent">BR</span>
            </Link>
            {keySession.valid && keySession.plan && (
              <>
                <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${
                  keySession.plan === "pro"
                    ? "bg-badge-elite/20 text-neon"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {keySession.plan.toUpperCase()}
                </span>
                <VipBadge plan={keySession.plan} />
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Surebet notification bell */}
            <button
              onClick={() => {
                if (surebetCount > 0) {
                  // Dispatch event to switch to premium tab and scroll to surebet
                  window.dispatchEvent(new CustomEvent("navigate-to-surebet"));
                  const el = document.getElementById("surebet-panel");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    navigate("/");
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("navigate-to-surebet"));
                    }, 500);
                  }
                } else {
                  toast.info("Nenhuma surebet ativa no momento", {
                    description: "Você será notificado quando uma oportunidade surgir.",
                  });
                }
              }}
              className={`relative rounded-lg p-2 transition-all ${
                surebetCount > 0
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              } ${surebetPulse ? "animate-bounce" : ""}`}
              title={surebetCount > 0 ? `${surebetCount} surebet(s) ativa(s)` : "Sem surebets no momento"}
            >
              <Bell className={`h-4 w-4 ${surebetCount > 0 ? "fill-primary" : ""}`} />
              {surebetCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-chart-negative text-[9px] font-bold text-primary-foreground animate-pulse-subtle">
                  {surebetCount}
                </span>
              )}
            </button>
            {keySession.valid && (
              <span className="hidden sm:block text-xs text-muted-foreground mr-2 truncate max-w-[120px]">
                {keySession.username}
              </span>
            )}
            {/* Personalization button — visible to all */}
            <button
              onClick={() => setShowPersonalization(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Personalizar"
            >
              <Palette className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <LogIn className="h-4 w-4" />
              </Link>
            )}
            {keySession.valid && (
              <button
                onClick={keyLogout}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-chart-negative transition-colors"
                title="Sair da chave"
              >
                <KeyRound className="h-4 w-4" />
              </button>
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

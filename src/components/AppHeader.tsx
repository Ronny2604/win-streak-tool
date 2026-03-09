import { BarChart3, Shield, Sun, Moon, LogIn, LogOut, KeyRound, Palette } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyGate } from "@/contexts/KeyGateContext";
import { PersonalizationPanel } from "@/components/PersonalizationPanel";
import { VipBadge } from "@/components/VipBadge";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const { session: keySession, logout: keyLogout } = useKeyGate();
  const [showPersonalization, setShowPersonalization] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-neon" />
            <Link to="/" className="text-lg font-extrabold tracking-tight text-foreground">
              Ronny<span className="text-neon">BR</span>
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
                onClick={signOut}
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

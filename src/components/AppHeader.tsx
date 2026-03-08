import { BarChart3, Shield, Sun, Moon, LogIn, LogOut, KeyRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyGate } from "@/contexts/KeyGateContext";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const { session: keySession, logout: keyLogout } = useKeyGate();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-neon" />
          <Link to="/" className="text-lg font-extrabold tracking-tight text-foreground">
            Props<span className="text-neon">BR</span>
          </Link>
          {keySession.valid && keySession.plan && (
            <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${
              keySession.plan === "pro"
                ? "bg-badge-elite/20 text-neon"
                : "bg-secondary text-muted-foreground"
            }`}>
              {keySession.plan.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {keySession.valid && (
            <span className="hidden sm:block text-xs text-muted-foreground mr-2 truncate max-w-[120px]">
              {keySession.username}
            </span>
          )}
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
  );
}

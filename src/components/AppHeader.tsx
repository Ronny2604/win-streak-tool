import { BarChart3, Shield, Settings, Sun, Moon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-neon" />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            Props<span className="text-neon">BR</span>
          </span>
          <div className="ml-2 flex rounded-lg bg-secondary p-0.5">
            <Link
              to="/"
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                location.pathname === "/"
                  ? "bg-neon text-filter-chip-active-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LITE
            </Link>
            <Link
              to="/"
              className="rounded-md px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              PRO
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/admin"
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Shield className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

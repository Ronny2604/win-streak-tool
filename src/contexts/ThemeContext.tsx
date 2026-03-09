import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "dark" | "light";
export type ThemePreset = "emerald" | "purple" | "blue" | "orange" | "pink" | "cyan";

interface ThemeContextType {
  theme: ThemeMode;
  preset: ThemePreset;
  setTheme: (theme: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_PRESETS: { id: ThemePreset; name: string; color: string }[] = [
  { id: "emerald", name: "Esmeralda", color: "145 72% 45%" },
  { id: "purple", name: "Roxo", color: "270 70% 55%" },
  { id: "blue", name: "Azul", color: "210 90% 50%" },
  { id: "orange", name: "Laranja", color: "25 95% 53%" },
  { id: "pink", name: "Rosa", color: "330 80% 55%" },
  { id: "cyan", name: "Ciano", color: "185 80% 45%" },
];

async function saveThemeToDb(mode: ThemeMode, preset: ThemePreset) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ theme_mode: mode, theme_preset: preset })
    .eq("user_id", user.id);
}

async function loadThemeFromDb(): Promise<{ mode: ThemeMode; preset: ThemePreset } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("theme_mode, theme_preset")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  return {
    mode: (data.theme_mode as ThemeMode) || "dark",
    preset: (data.theme_preset as ThemePreset) || "emerald",
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("app-theme") as ThemeMode) || "dark";
  });

  const [preset, setPresetState] = useState<ThemePreset>(() => {
    return (localStorage.getItem("app-theme-preset") as ThemePreset) || "emerald";
  });

  // Apply theme class to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  // Apply preset class to DOM
  useEffect(() => {
    const root = document.documentElement;
    THEME_PRESETS.forEach((p) => root.classList.remove(`theme-${p.id}`));
    root.classList.add(`theme-${preset}`);
    localStorage.setItem("app-theme-preset", preset);
  }, [preset]);

  // Load theme from DB on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const saved = await loadThemeFromDb();
        if (saved) {
          setThemeState(saved.mode);
          setPresetState(saved.preset);
        }
      }
    });

    // Also load on mount if already logged in
    loadThemeFromDb().then((saved) => {
      if (saved) {
        setThemeState(saved.mode);
        setPresetState(saved.preset);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    saveThemeToDb(newTheme, preset);
  }, [preset]);

  const setPreset = useCallback((newPreset: ThemePreset) => {
    setPresetState(newPreset);
    saveThemeToDb(theme, newPreset);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setThemeState(newTheme);
    saveThemeToDb(newTheme, preset);
  }, [theme, preset]);

  return (
    <ThemeContext.Provider value={{ theme, preset, setTheme, setPreset, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("app-theme") as ThemeMode;
    return stored || "dark";
  });

  const [preset, setPreset] = useState<ThemePreset>(() => {
    const stored = localStorage.getItem("app-theme-preset") as ThemePreset;
    return stored || "emerald";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all preset classes
    THEME_PRESETS.forEach(p => root.classList.remove(`theme-${p.id}`));
    
    // Add current preset class
    root.classList.add(`theme-${preset}`);
    localStorage.setItem("app-theme-preset", preset);
  }, [preset]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

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

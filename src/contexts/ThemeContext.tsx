import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "dark" | "light";
export type ThemePreset = "emerald" | "purple" | "blue" | "orange" | "pink" | "cyan";
export type FontFamily = "system" | "inter" | "roboto" | "poppins" | "fira";
export type FontSize = "small" | "medium" | "large";
export type BorderRadius = "none" | "small" | "medium" | "large";

interface ThemeContextType {
  theme: ThemeMode;
  preset: ThemePreset;
  fontFamily: FontFamily;
  fontSize: FontSize;
  borderRadius: BorderRadius;
  setTheme: (theme: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
  setBorderRadius: (radius: BorderRadius) => void;
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

export const FONT_OPTIONS: { id: FontFamily; name: string; css: string }[] = [
  { id: "system", name: "Sistema", css: "ui-sans-serif, system-ui, sans-serif" },
  { id: "inter", name: "Inter", css: "'Inter', sans-serif" },
  { id: "roboto", name: "Roboto", css: "'Roboto', sans-serif" },
  { id: "poppins", name: "Poppins", css: "'Poppins', sans-serif" },
  { id: "fira", name: "Fira Sans", css: "'Fira Sans', sans-serif" },
];

export const FONT_SIZE_OPTIONS: { id: FontSize; name: string; scale: string }[] = [
  { id: "small", name: "Pequeno", scale: "14px" },
  { id: "medium", name: "Médio", scale: "16px" },
  { id: "large", name: "Grande", scale: "18px" },
];

export const BORDER_RADIUS_OPTIONS: { id: BorderRadius; name: string; value: string }[] = [
  { id: "none", name: "Nenhum", value: "0" },
  { id: "small", name: "Pequeno", value: "0.375rem" },
  { id: "medium", name: "Médio", value: "0.75rem" },
  { id: "large", name: "Grande", value: "1.25rem" },
];

interface ThemeSettings {
  mode: ThemeMode;
  preset: ThemePreset;
  fontFamily: FontFamily;
  fontSize: FontSize;
  borderRadius: BorderRadius;
}

async function saveThemeToDb(settings: ThemeSettings) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({
      theme_mode: settings.mode,
      theme_preset: settings.preset,
      font_family: settings.fontFamily,
      font_size: settings.fontSize,
      border_radius: settings.borderRadius,
    })
    .eq("user_id", user.id);
}

async function loadThemeFromDb(): Promise<ThemeSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("theme_mode, theme_preset, font_family, font_size, border_radius")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  return {
    mode: (data.theme_mode as ThemeMode) || "dark",
    preset: (data.theme_preset as ThemePreset) || "emerald",
    fontFamily: (data.font_family as FontFamily) || "system",
    fontSize: (data.font_size as FontSize) || "medium",
    borderRadius: (data.border_radius as BorderRadius) || "medium",
  };
}

function getLocalSettings(): ThemeSettings {
  return {
    mode: (localStorage.getItem("app-theme") as ThemeMode) || "dark",
    preset: (localStorage.getItem("app-theme-preset") as ThemePreset) || "emerald",
    fontFamily: (localStorage.getItem("app-font-family") as FontFamily) || "system",
    fontSize: (localStorage.getItem("app-font-size") as FontSize) || "medium",
    borderRadius: (localStorage.getItem("app-border-radius") as BorderRadius) || "medium",
  };
}

function saveLocalSettings(settings: ThemeSettings) {
  localStorage.setItem("app-theme", settings.mode);
  localStorage.setItem("app-theme-preset", settings.preset);
  localStorage.setItem("app-font-family", settings.fontFamily);
  localStorage.setItem("app-font-size", settings.fontSize);
  localStorage.setItem("app-border-radius", settings.borderRadius);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getLocalSettings().mode);
  const [preset, setPresetState] = useState<ThemePreset>(() => getLocalSettings().preset);
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => getLocalSettings().fontFamily);
  const [fontSize, setFontSizeState] = useState<FontSize>(() => getLocalSettings().fontSize);
  const [borderRadius, setBorderRadiusState] = useState<BorderRadius>(() => getLocalSettings().borderRadius);

  // Apply theme mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  // Apply preset
  useEffect(() => {
    const root = document.documentElement;
    THEME_PRESETS.forEach((p) => root.classList.remove(`theme-${p.id}`));
    root.classList.add(`theme-${preset}`);
    localStorage.setItem("app-theme-preset", preset);
  }, [preset]);

  // Apply font family
  useEffect(() => {
    const fontOption = FONT_OPTIONS.find((f) => f.id === fontFamily);
    if (fontOption) {
      document.documentElement.style.setProperty("--font-family", fontOption.css);
      document.body.style.fontFamily = fontOption.css;
    }
    localStorage.setItem("app-font-family", fontFamily);
  }, [fontFamily]);

  // Apply font size
  useEffect(() => {
    const sizeOption = FONT_SIZE_OPTIONS.find((s) => s.id === fontSize);
    if (sizeOption) {
      document.documentElement.style.setProperty("--font-size-base", sizeOption.scale);
      document.documentElement.style.fontSize = sizeOption.scale;
    }
    localStorage.setItem("app-font-size", fontSize);
  }, [fontSize]);

  // Apply border radius
  useEffect(() => {
    const radiusOption = BORDER_RADIUS_OPTIONS.find((r) => r.id === borderRadius);
    if (radiusOption) {
      document.documentElement.style.setProperty("--radius", radiusOption.value);
    }
    localStorage.setItem("app-border-radius", borderRadius);
  }, [borderRadius]);

  // Load from DB on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const saved = await loadThemeFromDb();
        if (saved) {
          setThemeState(saved.mode);
          setPresetState(saved.preset);
          setFontFamilyState(saved.fontFamily);
          setFontSizeState(saved.fontSize);
          setBorderRadiusState(saved.borderRadius);
        }
      }
    });

    loadThemeFromDb().then((saved) => {
      if (saved) {
        setThemeState(saved.mode);
        setPresetState(saved.preset);
        setFontFamilyState(saved.fontFamily);
        setFontSizeState(saved.fontSize);
        setBorderRadiusState(saved.borderRadius);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveAll = useCallback((settings: Partial<ThemeSettings>) => {
    const current: ThemeSettings = { mode: theme, preset, fontFamily, fontSize, borderRadius };
    const updated = { ...current, ...settings };
    saveLocalSettings(updated);
    saveThemeToDb(updated);
  }, [theme, preset, fontFamily, fontSize, borderRadius]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    saveAll({ mode: newTheme });
  }, [saveAll]);

  const setPreset = useCallback((newPreset: ThemePreset) => {
    setPresetState(newPreset);
    saveAll({ preset: newPreset });
  }, [saveAll]);

  const setFontFamily = useCallback((newFont: FontFamily) => {
    setFontFamilyState(newFont);
    saveAll({ fontFamily: newFont });
  }, [saveAll]);

  const setFontSize = useCallback((newSize: FontSize) => {
    setFontSizeState(newSize);
    saveAll({ fontSize: newSize });
  }, [saveAll]);

  const setBorderRadius = useCallback((newRadius: BorderRadius) => {
    setBorderRadiusState(newRadius);
    saveAll({ borderRadius: newRadius });
  }, [saveAll]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setThemeState(newTheme);
    saveAll({ mode: newTheme });
  }, [theme, saveAll]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        preset,
        fontFamily,
        fontSize,
        borderRadius,
        setTheme,
        setPreset,
        setFontFamily,
        setFontSize,
        setBorderRadius,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

import { Sun, Moon, Check, Palette, Type, Maximize2 } from "lucide-react";
import {
  useTheme,
  THEME_PRESETS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  BORDER_RADIUS_OPTIONS,
} from "@/contexts/ThemeContext";

export function PersonalizationPanel() {
  const {
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
  } = useTheme();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Theme Mode */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Modo do Tema</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center justify-center gap-2 rounded-xl p-4 border-2 transition-all ${
              theme === "light"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <Sun className={`h-5 w-5 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${theme === "light" ? "text-foreground" : "text-muted-foreground"}`}>
              Claro
            </span>
            {theme === "light" && <Check className="h-4 w-4 text-primary ml-auto" />}
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center justify-center gap-2 rounded-xl p-4 border-2 transition-all ${
              theme === "dark"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <Moon className={`h-5 w-5 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${theme === "dark" ? "text-foreground" : "text-muted-foreground"}`}>
              Escuro
            </span>
            {theme === "dark" && <Check className="h-4 w-4 text-primary ml-auto" />}
          </button>
        </div>
      </div>

      {/* Color Presets */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Cor do Tema</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`flex items-center gap-3 rounded-xl p-3 border-2 transition-all ${
                preset === p.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div
                className="w-6 h-6 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(${p.color})` }}
              />
              <span className={`text-sm font-medium ${preset === p.id ? "text-foreground" : "text-muted-foreground"}`}>
                {p.name}
              </span>
              {preset === p.id && <Check className="h-4 w-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Fonte</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontFamily(f.id)}
              className={`flex items-center gap-3 rounded-xl p-3 border-2 transition-all ${
                fontFamily === f.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <span
                className={`text-sm font-medium ${fontFamily === f.id ? "text-foreground" : "text-muted-foreground"}`}
                style={{ fontFamily: f.css }}
              >
                {f.name}
              </span>
              {fontFamily === f.id && <Check className="h-4 w-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Tamanho do Texto</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {FONT_SIZE_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setFontSize(s.id)}
              className={`flex items-center justify-center gap-2 rounded-xl p-3 border-2 transition-all ${
                fontSize === s.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <span
                className={`font-medium ${fontSize === s.id ? "text-foreground" : "text-muted-foreground"}`}
                style={{ fontSize: s.scale }}
              >
                Aa
              </span>
              <span className={`text-xs ${fontSize === s.id ? "text-foreground" : "text-muted-foreground"}`}>
                {s.name}
              </span>
              {fontSize === s.id && <Check className="h-4 w-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Raio dos Cantos</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BORDER_RADIUS_OPTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setBorderRadius(r.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 border-2 transition-all ${
                borderRadius === r.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div
                className="w-10 h-10 bg-primary/30 border-2 border-primary"
                style={{ borderRadius: r.value }}
              />
              <span className={`text-xs font-medium ${borderRadius === r.id ? "text-foreground" : "text-muted-foreground"}`}>
                {r.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Prévia</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Cor primária</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Botão Primário
            </button>
            <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
              Botão Secundário
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neon text-sm font-semibold">Texto Destaque</span>
            <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
              BADGE
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-primary transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Star, TrendingUp, Zap } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface HeroCarouselProps {
  fixtures: NormalizedFixture[] | undefined;
  onSelect: (fixture: NormalizedFixture) => void;
}

interface ScoredFixture {
  fixture: NormalizedFixture;
  score: number;
  bestOdd: number;
  bestSide: "home" | "draw" | "away";
  badge: { label: string; icon: typeof Flame; color: string };
}

function scoreFixture(f: NormalizedFixture): ScoredFixture | null {
  if (!f.odds) return null;
  const h = parseFloat(f.odds.home);
  const d = parseFloat(f.odds.draw);
  const a = parseFloat(f.odds.away);
  if (isNaN(h) || isNaN(a)) return null;

  // remove margin → fair probabilities
  const margin = 1 / h + (isNaN(d) ? 0 : 1 / d) + 1 / a;
  const fairH = 1 / h / margin;
  const fairA = 1 / a / margin;
  const fairD = isNaN(d) ? 0 : 1 / d / margin;

  const evH = h * fairH - 1;
  const evA = a * fairA - 1;
  const evD = isNaN(d) ? -1 : d * fairD - 1;

  const best = [
    { side: "home" as const, ev: evH, odd: h, fair: fairH },
    { side: "draw" as const, ev: evD, odd: isNaN(d) ? 0 : d, fair: fairD },
    { side: "away" as const, ev: evA, odd: a, fair: fairA },
  ].sort((x, y) => y.ev - x.ev)[0];

  // composite score: EV weight + odds attractiveness (1.6-3.0 sweet spot)
  const oddSweetness = best.odd >= 1.6 && best.odd <= 3.5 ? 1 : 0.5;
  const score = best.ev * 100 + oddSweetness * 5 + best.fair * 10;

  let badge = { label: "TOP", icon: Star, color: "from-badge-star to-badge-hot" };
  if (best.ev > 0.05) badge = { label: "+EV", icon: Zap, color: "from-neon to-chart-positive" };
  else if (best.odd >= 2.5) badge = { label: "ALTA ODD", icon: Flame, color: "from-badge-hot to-chart-negative" };
  else if (best.odd <= 1.7) badge = { label: "SEGURO", icon: TrendingUp, color: "from-chart-positive to-neon" };

  return { fixture: f, score, bestOdd: best.odd, bestSide: best.side, badge };
}

export function HeroCarousel({ fixtures, onSelect }: HeroCarouselProps) {
  const top = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return [];
    return fixtures
      .map(scoreFixture)
      .filter((x): x is ScoredFixture => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [fixtures]);

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const SLIDE_MS = 5000;
  const TICK_MS = 50;

  useEffect(() => {
    if (top.length <= 1) return;
    setProgress(0);
    const tick = setInterval(() => {
      setProgress((p) => {
        const next = p + (TICK_MS / SLIDE_MS) * 100;
        if (next >= 100) {
          setIndex((i) => (i + 1) % top.length);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [top.length, index]);

  if (top.length === 0) return null;

  const current = top[index];
  const f = current.fixture;
  const Badge = current.badge.icon;
  const sideLabel = current.bestSide === "home" ? f.teams.home.name : current.bestSide === "away" ? f.teams.away.name : "Empate";

  const date = new Date(f.date);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-surface to-card shadow-lg">
      {/* Background team logos */}
      <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]">
        <img
          src={f.teams.home.logo}
          alt=""
          className="absolute -left-8 top-1/2 -translate-y-1/2 h-48 w-48 object-contain"
          loading="lazy"
        />
        <img
          src={f.teams.away.logo}
          alt=""
          className="absolute -right-8 top-1/2 -translate-y-1/2 h-48 w-48 object-contain"
          loading="lazy"
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-transparent to-card/80" />
      <div className={`absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-gradient-to-br ${current.badge.color} opacity-20 blur-3xl`} />

      {/* Content */}
      <button
        onClick={() => onSelect(f)}
        className="relative w-full p-4 text-left"
      >
        {/* Top row: badge + league */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${current.badge.color} px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md`}>
            <Badge className="h-3 w-3" />
            {current.badge.label}
          </span>
          <div className="flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur px-2.5 py-1">
            {f.league.logo && <img src={f.league.logo} alt="" className="h-3 w-3 object-contain" />}
            <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-[120px]">{f.league.name}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-full bg-background/80 backdrop-blur ring-2 ring-border/40 flex items-center justify-center p-1.5 shadow-sm">
              <img src={f.teams.home.logo} alt="" className="h-full w-full object-contain" />
            </div>
            <span className="text-xs font-bold text-foreground text-center leading-tight line-clamp-2">{f.teams.home.name}</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neon">{time}</span>
            <span className="text-2xl font-black text-muted-foreground">VS</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-full bg-background/80 backdrop-blur ring-2 ring-border/40 flex items-center justify-center p-1.5 shadow-sm">
              <img src={f.teams.away.logo} alt="" className="h-full w-full object-contain" />
            </div>
            <span className="text-xs font-bold text-foreground text-center leading-tight line-clamp-2">{f.teams.away.name}</span>
          </div>
        </div>

        {/* Best pick */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-background/60 backdrop-blur border border-border/40 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="h-3.5 w-3.5 text-neon shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Melhor Pick</p>
              <p className="text-xs font-bold text-foreground truncate">{sideLabel}</p>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground leading-none">Odd</span>
            <span className="text-lg font-extrabold text-neon tabular-nums leading-none">{current.bestOdd.toFixed(2)}</span>
          </div>
        </div>
      </button>

      {/* Navigation arrows */}
      {top.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + top.length) % top.length); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/70 backdrop-blur border border-border/40 flex items-center justify-center text-muted-foreground hover:text-neon hover:border-neon/40 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % top.length); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/70 backdrop-blur border border-border/40 flex items-center justify-center text-muted-foreground hover:text-neon hover:border-neon/40 transition-all"
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {top.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-neon shadow-[0_0_6px_hsl(var(--neon))]" : "w-1.5 bg-muted-foreground/40"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Auto-advance progress bar */}
      {top.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon via-neon-glow to-neon shadow-[0_0_8px_hsl(var(--neon))] transition-[width] duration-[50ms] ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

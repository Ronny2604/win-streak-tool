import { Trophy, Radio, Layers, TrendingUp } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface StatsSummaryBarProps {
  fixtures: NormalizedFixture[] | undefined;
  isLoading: boolean;
}

export function StatsSummaryBar({ fixtures, isLoading }: StatsSummaryBarProps) {
  if (isLoading || !fixtures) return null;

  const totalGames = fixtures.length;
  const liveGames = fixtures.filter(f => f.status.short === "LIVE").length;
  const leagues = new Set(fixtures.map(f => f.league.name)).size;
  const oddsArr = fixtures
    .map(f => (f.odds ? parseFloat(f.odds.home) : NaN))
    .filter(n => !isNaN(n));
  const avgOdds = oddsArr.length ? oddsArr.reduce((a, b) => a + b, 0) / oddsArr.length : 0;

  const items = [
    { icon: Trophy, value: totalGames, label: "Jogos", color: "text-neon", bg: "from-neon/15 to-neon/5", ring: "ring-neon/20" },
    { icon: Radio, value: liveGames, label: "Ao Vivo", color: "text-chart-negative", bg: "from-chart-negative/15 to-chart-negative/5", ring: "ring-chart-negative/20", pulse: liveGames > 0 },
    { icon: Layers, value: leagues, label: "Ligas", color: "text-badge-star", bg: "from-badge-star/15 to-badge-star/5", ring: "ring-badge-star/20" },
    { icon: TrendingUp, value: avgOdds.toFixed(2), label: "Odd Média", color: "text-badge-hot", bg: "from-badge-hot/15 to-badge-hot/5", ring: "ring-badge-hot/20" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-surface p-4 shadow-sm">
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-neon/10 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-badge-star/10 blur-3xl" />

      <div className="relative grid grid-cols-4 gap-2">
        {items.map(({ icon: Icon, value, label, color, bg, ring, pulse }) => (
          <div
            key={label}
            className={`group relative flex flex-col items-center gap-1.5 rounded-xl bg-gradient-to-br ${bg} p-2.5 ring-1 ${ring} transition-all hover:scale-[1.03]`}
          >
            <div className="relative">
              <Icon className={`h-4 w-4 ${color}`} />
              {pulse && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-chart-negative animate-pulse" />}
            </div>
            <p className="text-base font-extrabold text-foreground leading-none tabular-nums">{value}</p>
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

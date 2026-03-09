import { Trophy, Radio, Layers } from "lucide-react";
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
  const avgOdds = fixtures.reduce((acc, f) => {
    if (f.odds) {
      const h = parseFloat(f.odds.home);
      if (!isNaN(h)) return acc + h;
    }
    return acc;
  }, 0) / Math.max(fixtures.filter(f => f.odds).length, 1);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
        <Trophy className="h-4 w-4 text-neon shrink-0" />
        <div>
          <p className="text-lg font-bold text-foreground leading-none">{totalGames}</p>
          <p className="text-[10px] text-muted-foreground">Jogos</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
        <Radio className="h-4 w-4 text-chart-negative shrink-0" />
        <div>
          <p className="text-lg font-bold text-foreground leading-none">{liveGames}</p>
          <p className="text-[10px] text-muted-foreground">Ao Vivo</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
        <Layers className="h-4 w-4 text-badge-star shrink-0" />
        <div>
          <p className="text-lg font-bold text-foreground leading-none">{leagues}</p>
          <p className="text-[10px] text-muted-foreground">Ligas</p>
        </div>
      </div>
    </div>
  );
}

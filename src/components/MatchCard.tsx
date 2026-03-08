import { NormalizedFixture } from "@/lib/odds-api";
import { MiniChart } from "./MiniChart";
import { EliteBadge } from "./EliteBadge";

interface MatchCardProps {
  fixture: NormalizedFixture;
  showOdds?: boolean;
}

function generateMockChart(): number[] {
  return Array.from({ length: 10 }, () => Math.random() > 0.3 ? Math.random() * 10 : -Math.random() * 3);
}

export function MatchCard({ fixture, showOdds = true }: MatchCardProps) {
  const { teams, league, status, goals, odds, date } = fixture;
  const isLive = status.short === "LIVE";
  const time = new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-xl bg-card p-4 border border-border hover:border-neon/30 transition-all group">
      {/* League header */}
      <div className="flex items-center gap-2 mb-3">
        {league.logo && <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />}
        <span className="text-xs text-muted-foreground font-medium capitalize">{league.name}</span>
        {isLive && (
          <span className="ml-auto flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-chart-negative animate-pulse-neon" />
            <span className="text-xs font-bold text-chart-negative">AO VIVO</span>
          </span>
        )}
        {!isLive && <span className="ml-auto text-xs text-muted-foreground">{time}</span>}
      </div>

      {/* Teams */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {teams.home.logo && <img src={teams.home.logo} alt={teams.home.name} className="w-6 h-6 object-contain" />}
            <span className="text-sm font-semibold text-foreground">{teams.home.name}</span>
          </div>
          {goals.home !== null && (
            <span className="text-sm font-bold text-foreground">{goals.home}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {teams.away.logo && <img src={teams.away.logo} alt={teams.away.name} className="w-6 h-6 object-contain" />}
            <span className="text-sm font-semibold text-foreground">{teams.away.name}</span>
          </div>
          {goals.away !== null && (
            <span className="text-sm font-bold text-foreground">{goals.away}</span>
          )}
        </div>
      </div>

      {/* Odds */}
      {showOdds && odds && (
        <div className="flex gap-2 mb-3">
          <div className="flex-1 rounded-lg bg-surface py-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">Casa</div>
            <div className="text-sm font-bold text-foreground">{odds.home}</div>
          </div>
          <div className="flex-1 rounded-lg bg-surface py-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">Empate</div>
            <div className="text-sm font-bold text-foreground">{odds.draw}</div>
          </div>
          <div className="flex-1 rounded-lg bg-surface py-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">Fora</div>
            <div className="text-sm font-bold text-foreground">{odds.away}</div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EliteBadge />
          <span className="text-xs text-muted-foreground">CONF <span className="font-bold text-neon">90%</span></span>
        </div>
        <MiniChart data={generateMockChart()} />
      </div>
    </div>
  );
}

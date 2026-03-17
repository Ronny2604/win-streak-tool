import { NBAGame } from "@/lib/nba-api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NBAGameCardProps {
  game: NBAGame;
  onClick?: () => void;
}

export function NBAGameCard({ game, onClick }: NBAGameCardProps) {
  const isLive = game.status === "LIVE";
  const isFinished = game.status === "FT";
  const dateStr = new Date(game.date).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md",
        isLive && "border-chart-negative/40 shadow-[0_0_12px_hsl(var(--chart-negative)/0.15)]"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NBA</span>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-chart-negative">
              <span className="h-1.5 w-1.5 rounded-full bg-chart-negative animate-pulse" />
              AO VIVO
            </span>
          )}
          {isFinished && <span className="text-[10px] font-bold text-muted-foreground">ENCERRADO</span>}
        </div>
        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <img src={game.homeLogo} alt={game.homeTeam} className="h-10 w-10 object-contain" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
          <span className="text-xs font-bold text-foreground text-center leading-tight truncate w-full">{game.homeTeam}</span>
        </div>

        {/* Score / Odds */}
        <div className="flex flex-col items-center gap-1">
          {(isLive || isFinished) && game.scores.home !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-foreground">{game.scores.home}</span>
              <span className="text-lg text-muted-foreground">-</span>
              <span className="text-2xl font-black text-foreground">{game.scores.away}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-muted-foreground">VS</span>
          )}
          {game.odds && game.status === "NS" && (
            <div className="flex gap-2 mt-1">
              <span className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold",
                game.odds.home < game.odds.away
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-card border border-border text-muted-foreground"
              )}>
                {game.odds.home.toFixed(2)}
              </span>
              <span className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold",
                game.odds.away < game.odds.home
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-card border border-border text-muted-foreground"
              )}>
                {game.odds.away.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <img src={game.awayLogo} alt={game.awayTeam} className="h-10 w-10 object-contain" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
          <span className="text-xs font-bold text-foreground text-center leading-tight truncate w-full">{game.awayTeam}</span>
        </div>
      </div>
    </Card>
  );
}

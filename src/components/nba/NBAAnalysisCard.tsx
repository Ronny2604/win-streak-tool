import { NBAAnalysis } from "@/lib/nba-api";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface NBAAnalysisCardProps {
  analysis: NBAAnalysis;
}

export function NBAAnalysisCard({ analysis }: NBAAnalysisCardProps) {
  const { game, pick, confidence, reasoning, edge } = analysis;
  const teamName = pick === "home" ? game.homeTeam : game.awayTeam;
  const teamLogo = pick === "home" ? game.homeLogo : game.awayLogo;
  const odd = pick === "home" ? game.odds!.home : game.odds!.away;

  return (
    <Card className="p-4 border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <div className="flex items-start gap-3">
        <img src={teamLogo} alt={teamName} className="h-12 w-12 object-contain rounded-lg" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-foreground truncate">{teamName}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              {odd.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-1">
            {game.homeTeam} vs {game.awayTeam}
          </p>
          <p className="text-xs text-foreground/80 mb-2">{reasoning}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">{confidence}%</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className={cn("h-3 w-3", edge > 0 ? "text-chart-positive" : "text-chart-negative")} />
              <span className={cn("text-[10px] font-bold", edge > 0 ? "text-chart-positive" : "text-chart-negative")}>
                {edge > 0 ? "+" : ""}{edge.toFixed(1)}% edge
              </span>
            </div>
            {confidence >= 70 && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-badge-star" />
                <span className="text-[10px] font-bold text-badge-star">Forte</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

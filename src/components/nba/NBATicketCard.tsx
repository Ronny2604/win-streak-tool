import { NBATicket } from "@/lib/nba-api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Target, DollarSign, TrendingUp } from "lucide-react";

interface NBATicketCardProps {
  ticket: NBATicket;
}

const TYPE_CONFIG = {
  safe: { label: "Seguro", color: "text-chart-positive", border: "border-chart-positive/30", bg: "bg-chart-positive/5" },
  moderate: { label: "Moderado", color: "text-badge-star", border: "border-badge-star/30", bg: "bg-badge-star/5" },
  aggressive: { label: "Agressivo", color: "text-chart-negative", border: "border-chart-negative/30", bg: "bg-chart-negative/5" },
};

export function NBATicketCard({ ticket }: NBATicketCardProps) {
  const config = TYPE_CONFIG[ticket.type];

  return (
    <Card className={cn("p-4", config.border, config.bg)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{ticket.name}</span>
          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold", config.color, `bg-${ticket.type === "safe" ? "chart-positive" : ticket.type === "moderate" ? "badge-star" : "chart-negative"}/10`)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="h-3 w-3 text-primary" />
          <span className="text-xs font-bold text-primary">{ticket.confidence}%</span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {ticket.picks.map((pick, i) => (
          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img src={pick.pick === "home" ? pick.game.homeLogo : pick.game.awayLogo} alt="" className="h-6 w-6 object-contain" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-foreground block truncate">{pick.label}</span>
                <span className="text-[10px] text-muted-foreground">{pick.game.homeTeam} vs {pick.game.awayTeam}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{pick.confidence}%</span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                {pick.odd.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">Odd Total: {ticket.totalOdd.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-chart-positive" />
          <span className="text-xs font-bold text-chart-positive">{ticket.potentialReturn}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">Stake sugerida: {ticket.suggestedStake}</span>
      </div>
    </Card>
  );
}

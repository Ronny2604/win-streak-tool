import { NormalizedFixture } from "@/lib/odds-api";
import { MiniChart } from "./MiniChart";
import { EliteBadge } from "./EliteBadge";
import { useCustomTicket } from "@/contexts/CustomTicketContext";
import { Check, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  fixture: NormalizedFixture;
  showOdds?: boolean;
  onClick?: () => void;
  animationDelay?: number;
}

function generateMockChart(): number[] {
  return Array.from({ length: 10 }, () => Math.random() > 0.3 ? Math.random() * 10 : -Math.random() * 3);
}

function generateFormStreak(): string[] {
  const results = ["W", "D", "L"];
  return Array.from({ length: 5 }, () => results[Math.floor(Math.random() * 3)]);
}

function getConfidence(odds: NormalizedFixture["odds"]): number {
  if (!odds) return Math.floor(Math.random() * 30) + 60;
  const h = parseFloat(odds.home);
  const a = parseFloat(odds.away);
  if (isNaN(h) || isNaN(a)) return 70;
  const diff = Math.abs(h - a);
  return Math.min(98, Math.floor(60 + diff * 8));
}

const formColors: Record<string, string> = {
  W: "bg-chart-positive text-primary-foreground",
  D: "bg-badge-star text-primary-foreground",
  L: "bg-chart-negative text-primary-foreground",
};

export function MatchCard({ fixture, showOdds = true, onClick, animationDelay = 0 }: MatchCardProps) {
  const { teams, league, status, goals, odds, date } = fixture;
  const { isSelected } = useCustomTicket();
  const isLive = status.short === "LIVE";
  const selected = isSelected(fixture.id);
  const time = new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const confidence = getConfidence(odds);
  const homeForm = generateFormStreak();
  const awayForm = generateFormStreak();

  const oddsHome = odds ? parseFloat(odds.home) : null;
  const oddsAway = odds ? parseFloat(odds.away) : null;
  const isFavoriteHome = oddsHome && oddsAway ? oddsHome < oddsAway : null;

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={cn(
        "rounded-xl bg-card p-4 border transition-all group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both",
        selected ? "border-neon bg-neon/5" : "border-border hover:border-neon/30 hover:shadow-lg hover:shadow-neon/5"
      )}
    >
      {/* League header */}
      <div className="flex items-center gap-2 mb-3">
        {league.logo && <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />}
        <span className="text-xs text-muted-foreground font-medium capitalize">{league.name}</span>
        {selected && (
          <span className="ml-1 flex items-center gap-1">
            <Check className="h-3 w-3 text-neon" />
            <span className="text-[10px] font-bold text-neon">NO BILHETE</span>
          </span>
        )}
        {isLive && (
          <span className="ml-auto flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-chart-negative animate-pulse-neon" />
            <span className="text-xs font-bold text-chart-negative">AO VIVO</span>
            {status.elapsed && (
              <span className="text-[10px] text-chart-negative font-medium">{status.elapsed}'</span>
            )}
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
            {isFavoriteHome === true && <TrendingUp className="h-3 w-3 text-chart-positive" />}
          </div>
          <div className="flex items-center gap-2">
            {/* Home form streak */}
            <div className="hidden sm:flex gap-0.5">
              {homeForm.map((r, i) => (
                <span key={i} className={cn("h-4 w-4 rounded-sm text-[8px] font-bold flex items-center justify-center", formColors[r])}>
                  {r}
                </span>
              ))}
            </div>
            {goals.home !== null && (
              <span className="text-sm font-bold text-foreground min-w-[16px] text-right">{goals.home}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {teams.away.logo && <img src={teams.away.logo} alt={teams.away.name} className="w-6 h-6 object-contain" />}
            <span className="text-sm font-semibold text-foreground">{teams.away.name}</span>
            {isFavoriteHome === false && <TrendingUp className="h-3 w-3 text-chart-positive" />}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-0.5">
              {awayForm.map((r, i) => (
                <span key={i} className={cn("h-4 w-4 rounded-sm text-[8px] font-bold flex items-center justify-center", formColors[r])}>
                  {r}
                </span>
              ))}
            </div>
            {goals.away !== null && (
              <span className="text-sm font-bold text-foreground min-w-[16px] text-right">{goals.away}</span>
            )}
          </div>
        </div>
      </div>

      {/* Odds */}
      {showOdds && odds && (
        <div className="flex gap-2 mb-3">
          {[
            { label: "Casa", value: odds.home, highlight: isFavoriteHome === true },
            { label: "Empate", value: odds.draw, highlight: false },
            { label: "Fora", value: odds.away, highlight: isFavoriteHome === false },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={cn(
              "flex-1 rounded-lg py-1.5 text-center transition-colors",
              highlight ? "bg-neon/10 border border-neon/20" : "bg-surface"
            )}>
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className={cn("text-sm font-bold", highlight ? "text-neon" : "text-foreground")}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EliteBadge />
          {/* Confidence meter */}
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  confidence >= 85 ? "bg-chart-positive" : confidence >= 70 ? "bg-badge-star" : "bg-chart-negative"
                )}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className={cn(
              "text-[10px] font-bold",
              confidence >= 85 ? "text-chart-positive" : confidence >= 70 ? "text-badge-star" : "text-chart-negative"
            )}>
              {confidence}%
            </span>
          </div>
        </div>
        <MiniChart data={generateMockChart()} />
      </div>
    </div>
  );
}

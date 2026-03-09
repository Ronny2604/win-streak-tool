import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface LeagueROI {
  name: string;
  logo: string;
  roi: number;
  totalBets: number;
  winRate: number;
  avgOdd: number;
}

const MOCK_LEAGUE_ROI: LeagueROI[] = [
  { name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png", roi: 12.4, totalBets: 156, winRate: 68, avgOdd: 1.85 },
  { name: "La Liga", logo: "https://media.api-sports.io/football/leagues/140.png", roi: 8.7, totalBets: 142, winRate: 64, avgOdd: 1.92 },
  { name: "Serie A", logo: "https://media.api-sports.io/football/leagues/135.png", roi: 6.2, totalBets: 128, winRate: 61, avgOdd: 1.88 },
  { name: "Bundesliga", logo: "https://media.api-sports.io/football/leagues/78.png", roi: 3.1, totalBets: 134, winRate: 58, avgOdd: 1.95 },
  { name: "Ligue 1", logo: "https://media.api-sports.io/football/leagues/61.png", roi: -1.5, totalBets: 118, winRate: 52, avgOdd: 2.05 },
  { name: "Brasileirão", logo: "https://media.api-sports.io/football/leagues/71.png", roi: -4.2, totalBets: 98, winRate: 48, avgOdd: 2.15 },
  { name: "Champions League", logo: "https://media.api-sports.io/football/leagues/2.png", roi: 15.8, totalBets: 64, winRate: 72, avgOdd: 1.78 },
];

export function LeagueROIPanel() {
  const sorted = [...MOCK_LEAGUE_ROI].sort((a, b) => b.roi - a.roi);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="h-5 w-5 text-badge-star" />
        <h3 className="text-sm font-bold text-foreground">Ranking de Ligas por ROI</h3>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-surface text-[10px] font-semibold text-muted-foreground">
          <span className="w-5">#</span>
          <span>Liga</span>
          <span className="text-right w-14">ROI</span>
          <span className="text-right w-14">Win%</span>
          <span className="text-right w-14">Odd Méd</span>
        </div>

        {sorted.map((league, i) => (
          <div
            key={league.name}
            className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center border-t border-border hover:bg-surface/50 transition-colors"
          >
            <span className={`w-5 text-xs font-bold ${i < 3 ? "text-badge-star" : "text-muted-foreground"}`}>
              {i + 1}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <img src={league.logo} alt={league.name} className="w-5 h-5 object-contain flex-shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{league.name}</span>
            </div>
            <div className={`text-right w-14 text-sm font-bold flex items-center justify-end gap-1 ${
              league.roi >= 0 ? "text-chart-positive" : "text-chart-negative"
            }`}>
              {league.roi >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {league.roi > 0 ? "+" : ""}{league.roi}%
            </div>
            <span className="text-right w-14 text-xs text-foreground">{league.winRate}%</span>
            <span className="text-right w-14 text-xs text-muted-foreground">{league.avgOdd.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Dados baseados em análise dos últimos 30 dias • {MOCK_LEAGUE_ROI.reduce((a, b) => a + b.totalBets, 0)} apostas analisadas
      </p>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Flame, TrendingUp, TrendingDown, Shield, Target, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NormalizedFixture } from "@/lib/odds-api";

interface StreakData {
  team: string;
  logo: string;
  league: string;
  streaks: {
    type: string;
    count: number;
    icon: "fire" | "shield" | "target" | "up" | "down";
    description: string;
  }[];
}

interface StreakTrackerProps {
  fixtures: NormalizedFixture[];
}

export function StreakTracker({ fixtures }: StreakTrackerProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const streakData = useMemo(() => {
    const teamMap = new Map<string, { games: NormalizedFixture[]; logo: string; league: string }>();

    fixtures.forEach(f => {
      [
        { name: f.teams.home.name, logo: f.teams.home.logo, isHome: true },
        { name: f.teams.away.name, logo: f.teams.away.logo, isHome: false },
      ].forEach(({ name, logo, isHome }) => {
        if (!teamMap.has(name)) teamMap.set(name, { games: [], logo, league: f.league.name });
        teamMap.get(name)!.games.push(f);
      });
    });

    const results: StreakData[] = [];

    teamMap.forEach(({ games, logo, league }, team) => {
      const completedGames = games
        .filter(g => g.goals.home !== null && g.goals.away !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (completedGames.length < 2) return;

      const streaks: StreakData["streaks"] = [];

      // Win streak
      let winStreak = 0;
      for (const g of completedGames) {
        const isHome = g.teams.home.name === team;
        const homeG = g.goals.home ?? 0;
        const awayG = g.goals.away ?? 0;
        const won = isHome ? homeG > awayG : awayG > homeG;
        if (won) winStreak++;
        else break;
      }
      if (winStreak >= 2) {
        streaks.push({ type: "wins", count: winStreak, icon: "fire", description: `${winStreak} vitórias seguidas` });
      }

      // Loss streak
      let lossStreak = 0;
      for (const g of completedGames) {
        const isHome = g.teams.home.name === team;
        const homeG = g.goals.home ?? 0;
        const awayG = g.goals.away ?? 0;
        const lost = isHome ? homeG < awayG : awayG < homeG;
        if (lost) lossStreak++;
        else break;
      }
      if (lossStreak >= 2) {
        streaks.push({ type: "losses", count: lossStreak, icon: "down", description: `${lossStreak} derrotas seguidas` });
      }

      // Clean sheets
      let cleanSheets = 0;
      for (const g of completedGames) {
        const isHome = g.teams.home.name === team;
        const conceded = isHome ? (g.goals.away ?? 0) : (g.goals.home ?? 0);
        if (conceded === 0) cleanSheets++;
        else break;
      }
      if (cleanSheets >= 2) {
        streaks.push({ type: "clean", count: cleanSheets, icon: "shield", description: `${cleanSheets} jogos sem sofrer gol` });
      }

      // Over 2.5
      let overStreak = 0;
      for (const g of completedGames) {
        const total = (g.goals.home ?? 0) + (g.goals.away ?? 0);
        if (total > 2) overStreak++;
        else break;
      }
      if (overStreak >= 2) {
        streaks.push({ type: "over", count: overStreak, icon: "target", description: `${overStreak} jogos com Over 2.5` });
      }

      // BTTS streak
      let bttsStreak = 0;
      for (const g of completedGames) {
        if ((g.goals.home ?? 0) > 0 && (g.goals.away ?? 0) > 0) bttsStreak++;
        else break;
      }
      if (bttsStreak >= 2) {
        streaks.push({ type: "btts", count: bttsStreak, icon: "up", description: `${bttsStreak} jogos com Ambas Marcam` });
      }

      if (streaks.length > 0) {
        results.push({ team, logo, league, streaks });
      }
    });

    return results.sort((a, b) => {
      const maxA = Math.max(...a.streaks.map(s => s.count));
      const maxB = Math.max(...b.streaks.map(s => s.count));
      return maxB - maxA;
    });
  }, [fixtures]);

  const filteredData = filterType === "all"
    ? streakData
    : streakData.filter(d => d.streaks.some(s => s.type === filterType));

  const iconMap = {
    fire: <Flame className="h-4 w-4 text-badge-hot" />,
    shield: <Shield className="h-4 w-4 text-neon" />,
    target: <Target className="h-4 w-4 text-badge-star" />,
    up: <TrendingUp className="h-4 w-4 text-chart-positive" />,
    down: <TrendingDown className="h-4 w-4 text-chart-negative" />,
  };

  const filters = [
    { id: "all", label: "Todas" },
    { id: "wins", label: "Vitórias" },
    { id: "losses", label: "Derrotas" },
    { id: "clean", label: "Clean Sheet" },
    { id: "over", label: "Over 2.5" },
    { id: "btts", label: "BTTS" },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-5 w-5 text-badge-hot" />
            Streak Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === f.id
                    ? "bg-badge-hot/10 border border-badge-hot/50 text-badge-hot"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Flame className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma sequência encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.map(team => (
                <div
                  key={team.team}
                  className="rounded-xl border border-border bg-background/50 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedTeam(expandedTeam === team.team ? null : team.team)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors"
                  >
                    <img src={team.logo} alt={team.team} className="h-8 w-8 object-contain" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-foreground">{team.team}</p>
                      <p className="text-xs text-muted-foreground">{team.league}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {team.streaks.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs gap-1">
                          {iconMap[s.icon]}
                          {s.count}
                        </Badge>
                      ))}
                    </div>
                    {expandedTeam === team.team ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {expandedTeam === team.team && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                      {team.streaks.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {iconMap[s.icon]}
                          <span className="text-foreground">{s.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

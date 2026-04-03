import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Clock, Target, Shield, Zap } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface LiveMatchStatsProps {
  fixtures?: NormalizedFixture[];
}

interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  dangerAttacks: { home: number; away: number };
}

function generateStats(fixture: NormalizedFixture): MatchStats {
  const elapsed = fixture.status.elapsed || 45;
  const factor = elapsed / 90;
  const homeGoals = fixture.goals.home || 0;
  const awayGoals = fixture.goals.away || 0;
  const homeBias = homeGoals > awayGoals ? 1.2 : homeGoals < awayGoals ? 0.8 : 1;

  return {
    possession: { home: Math.round(45 + homeBias * 8), away: Math.round(55 - homeBias * 8) },
    shots: { home: Math.round((6 + homeGoals * 3) * factor), away: Math.round((5 + awayGoals * 3) * factor) },
    shotsOnTarget: { home: Math.round((2 + homeGoals * 2) * factor), away: Math.round((2 + awayGoals * 2) * factor) },
    corners: { home: Math.round((3 + homeGoals) * factor), away: Math.round((2.5 + awayGoals) * factor) },
    fouls: { home: Math.round(7 * factor), away: Math.round(8 * factor) },
    dangerAttacks: { home: Math.round((25 + homeGoals * 10) * factor), away: Math.round((22 + awayGoals * 10) * factor) },
  };
}

export function LiveMatchStats({ fixtures }: LiveMatchStatsProps) {
  const liveGames = fixtures?.filter(f => f.status.short === "LIVE" || f.status.short === "1H" || f.status.short === "2H" || f.status.short === "HT") || [];
  const [selectedGame, setSelectedGame] = useState<NormalizedFixture | null>(null);
  const [stats, setStats] = useState<MatchStats | null>(null);

  useEffect(() => {
    if (liveGames.length > 0 && !selectedGame) {
      setSelectedGame(liveGames[0]);
    }
  }, [liveGames]);

  useEffect(() => {
    if (selectedGame) setStats(generateStats(selectedGame));
  }, [selectedGame]);

  if (liveGames.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
          <p className="text-muted-foreground font-medium">Nenhum jogo ao vivo no momento</p>
          <p className="text-xs text-muted-foreground/60 mt-1">As estatísticas aparecerão quando houver jogos ao vivo</p>
        </CardContent>
      </Card>
    );
  }

  const StatBar = ({ label, home, away, icon: Icon }: { label: string; home: number; away: number; icon: any }) => {
    const total = home + away || 1;
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-primary">{home}</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </div>
          <span className="font-bold text-chart-negative">{away}</span>
        </div>
        <div className="flex gap-0.5 h-2">
          <div className="bg-primary/80 rounded-l-full transition-all duration-700" style={{ width: `${(home / total) * 100}%` }} />
          <div className="bg-chart-negative/80 rounded-r-full transition-all duration-700" style={{ width: `${(away / total) * 100}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Game selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {liveGames.map(game => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              selectedGame?.id === game.id
                ? "bg-chart-negative/10 border border-chart-negative/50 text-chart-negative"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-chart-negative animate-pulse" />
            {game.teams.home.name.slice(0, 12)} vs {game.teams.away.name.slice(0, 12)}
          </button>
        ))}
      </div>

      {selectedGame && stats && (
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-chart-negative/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={selectedGame.teams.home.logo} alt="" className="h-6 w-6" />
                <span className="font-bold text-sm">{selectedGame.teams.home.name}</span>
              </div>
              <div className="text-center">
                <Badge variant="destructive" className="text-lg font-bold px-3">
                  {selectedGame.goals.home ?? 0} - {selectedGame.goals.away ?? 0}
                </Badge>
                <div className="flex items-center gap-1 mt-1 justify-center">
                  <Clock className="h-3 w-3 text-chart-negative" />
                  <span className="text-xs text-chart-negative font-bold">{selectedGame.status.elapsed || 0}'</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{selectedGame.teams.away.name}</span>
                <img src={selectedGame.teams.away.logo} alt="" className="h-6 w-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <StatBar label="Posse %" home={stats.possession.home} away={stats.possession.away} icon={Activity} />
            <StatBar label="Chutes" home={stats.shots.home} away={stats.shots.away} icon={Target} />
            <StatBar label="Chutes no Gol" home={stats.shotsOnTarget.home} away={stats.shotsOnTarget.away} icon={Zap} />
            <StatBar label="Escanteios" home={stats.corners.home} away={stats.corners.away} icon={Shield} />
            <StatBar label="Faltas" home={stats.fouls.home} away={stats.fouls.away} icon={Shield} />
            <StatBar label="Ataques Perigosos" home={stats.dangerAttacks.home} away={stats.dangerAttacks.away} icon={Zap} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

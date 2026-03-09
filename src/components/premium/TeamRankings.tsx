import { NormalizedFixture } from "@/lib/odds-api";
import { Trophy, TrendingUp, Goal, CornerUpRight, Square, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface TeamStats {
  name: string;
  logo?: string;
  league: string;
  form: number; // 0-100
  avgGoals: number;
  avgConceded: number;
  avgCorners: number;
  avgCards: number;
  cleanSheets: number;
  bttsPercent: number;
}

interface TeamRankingsProps {
  fixtures: NormalizedFixture[];
}

type SortKey = "form" | "avgGoals" | "avgConceded" | "avgCorners" | "avgCards" | "bttsPercent";

export function TeamRankings({ fixtures }: TeamRankingsProps) {
  const [sortBy, setSortBy] = useState<SortKey>("form");
  const [sortAsc, setSortAsc] = useState(false);

  // Generate team stats from fixtures (simulated - in production, use real data)
  const teamStats: TeamStats[] = fixtures.reduce((acc: TeamStats[], f) => {
    const addOrUpdate = (name: string, logo?: string, league?: string) => {
      let team = acc.find(t => t.name === name);
      if (!team) {
        team = {
          name,
          logo,
          league: league || "",
          form: Math.floor(Math.random() * 40) + 40,
          avgGoals: Number((Math.random() * 2 + 0.5).toFixed(2)),
          avgConceded: Number((Math.random() * 1.5 + 0.3).toFixed(2)),
          avgCorners: Number((Math.random() * 4 + 3).toFixed(1)),
          avgCards: Number((Math.random() * 2 + 1).toFixed(1)),
          cleanSheets: Math.floor(Math.random() * 5),
          bttsPercent: Math.floor(Math.random() * 40) + 40,
        };
        acc.push(team);
      }
    };

    addOrUpdate(f.teams.home.name, f.teams.home.logo, f.league.name);
    addOrUpdate(f.teams.away.name, f.teams.away.logo, f.league.name);
    return acc;
  }, []);

  const sorted = [...teamStats].sort((a, b) => {
    const diff = sortAsc ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    return diff;
  }).slice(0, 20);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-badge-star" />
        <h3 className="text-sm font-bold text-foreground">Rankings de Times</h3>
      </div>

      {/* Sort Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "form" as SortKey, label: "Forma", icon: TrendingUp },
          { key: "avgGoals" as SortKey, label: "Gols", icon: Goal },
          { key: "avgCorners" as SortKey, label: "Escanteios", icon: CornerUpRight },
          { key: "avgCards" as SortKey, label: "Cartões", icon: Square },
          { key: "bttsPercent" as SortKey, label: "BTTS", icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              sortBy === key
                ? "bg-neon/10 border border-neon/50 text-neon"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
            {sortBy === key && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
          </button>
        ))}
      </div>

      {/* Rankings List */}
      <div className="space-y-2">
        {sorted.map((team, i) => (
          <div
            key={team.name}
            className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 hover:border-neon/30 transition-colors"
          >
            {/* Position */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i === 0 ? "bg-badge-star text-black" :
              i === 1 ? "bg-gray-300 text-black" :
              i === 2 ? "bg-amber-600 text-black" :
              "bg-surface text-muted-foreground"
            }`}>
              {i + 1}
            </div>

            {/* Team Info */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {team.logo && <img src={team.logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{team.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{team.league}</div>
              </div>
            </div>

            {/* Main Stat */}
            <div className="text-right">
              {sortBy === "form" && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${team.form >= 70 ? "bg-chart-positive" : team.form >= 50 ? "bg-badge-star" : "bg-chart-negative"}`}
                      style={{ width: `${team.form}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${team.form >= 70 ? "text-chart-positive" : team.form >= 50 ? "text-badge-star" : "text-chart-negative"}`}>
                    {team.form}%
                  </span>
                </div>
              )}
              {sortBy === "avgGoals" && (
                <span className="text-sm font-bold text-chart-positive">{team.avgGoals}</span>
              )}
              {sortBy === "avgConceded" && (
                <span className="text-sm font-bold text-chart-negative">{team.avgConceded}</span>
              )}
              {sortBy === "avgCorners" && (
                <span className="text-sm font-bold text-neon">{team.avgCorners}</span>
              )}
              {sortBy === "avgCards" && (
                <span className="text-sm font-bold text-badge-star">{team.avgCards}</span>
              )}
              {sortBy === "bttsPercent" && (
                <span className="text-sm font-bold text-neon">{team.bttsPercent}%</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum time disponível</p>
        </div>
      )}
    </div>
  );
}

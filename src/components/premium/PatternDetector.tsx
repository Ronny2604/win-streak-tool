import { useMemo, useState } from "react";
import { Search, Eye, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface Pattern {
  team: string;
  pattern: string;
  description: string;
  confidence: number;
  trend: "bullish" | "bearish" | "neutral";
  games: number;
  suggestion: string;
}

export function PatternDetector({ fixtures }: { fixtures: NormalizedFixture[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const patterns = useMemo(() => {
    if (!fixtures?.length) return [];
    const teamMap = new Map<string, { home: NormalizedFixture[]; away: NormalizedFixture[] }>();

    fixtures.forEach((f) => {
      const h = f.teams.home.name;
      const a = f.teams.away.name;
      if (!teamMap.has(h)) teamMap.set(h, { home: [], away: [] });
      if (!teamMap.has(a)) teamMap.set(a, { home: [], away: [] });
      teamMap.get(h)!.home.push(f);
      teamMap.get(a)!.away.push(f);
    });

    const result: Pattern[] = [];

    teamMap.forEach((data, team) => {
      const totalGames = data.home.length + data.away.length;
      if (totalGames < 1) return;

      // Home strength pattern
      if (data.home.length >= 1) {
        const avgHomeOdd = data.home.reduce((s, f) => s + parseFloat(f.odds?.home || "2"), 0) / data.home.length;
        if (avgHomeOdd < 1.6) {
          result.push({
            team,
            pattern: "Fortaleza em Casa",
            description: `${team} tem odds médias de ${avgHomeOdd.toFixed(2)} jogando em casa, indicando forte favoritismo`,
            confidence: Math.min(90, Math.round(80 + (1.6 - avgHomeOdd) * 20)),
            trend: "bullish",
            games: data.home.length,
            suggestion: `Considere apostas em ${team} como mandante. Odds consistentemente baixas indicam domínio em casa.`,
          });
        }
      }

      // Away weakness pattern
      if (data.away.length >= 1) {
        const avgAwayOdd = data.away.reduce((s, f) => s + parseFloat(f.odds?.away || "3"), 0) / data.away.length;
        if (avgAwayOdd > 3.5) {
          result.push({
            team,
            pattern: "Fragilidade Fora de Casa",
            description: `${team} apresenta odds médias de ${avgAwayOdd.toFixed(2)} como visitante`,
            confidence: Math.min(85, Math.round(60 + (avgAwayOdd - 3.5) * 10)),
            trend: "bearish",
            games: data.away.length,
            suggestion: `Evite apostar em ${team} fora de casa. Considere apostar contra.`,
          });
        }
      }

      // Goals pattern
      const allGames = [...data.home, ...data.away];
      const highOddsCount = allGames.filter((f) => {
        const h = parseFloat(f.odds?.home || "0");
        const a = parseFloat(f.odds?.away || "0");
        return h > 2 && a > 2;
      }).length;

      if (highOddsCount >= 1 && highOddsCount / allGames.length > 0.5) {
        result.push({
          team,
          pattern: "Jogos Equilibrados",
          description: `${((highOddsCount / allGames.length) * 100).toFixed(0)}% dos jogos de ${team} têm odds equilibradas (ambos > 2.0)`,
          confidence: Math.round(55 + (highOddsCount / allGames.length) * 30),
          trend: "neutral",
          games: allGames.length,
          suggestion: `Jogos de ${team} tendem a ser imprevisíveis. Considere mercados alternativos como Over/Under.`,
        });
      }
    });

    return result.sort((a, b) => b.confidence - a.confidence).slice(0, 15);
  }, [fixtures]);

  const filtered = searchTerm
    ? patterns.filter((p) => p.team.toLowerCase().includes(searchTerm.toLowerCase()) || p.pattern.toLowerCase().includes(searchTerm.toLowerCase()))
    : patterns;

  const trendIcons = { bullish: TrendingUp, bearish: AlertCircle, neutral: Eye };
  const trendColors = { bullish: "text-chart-positive", bearish: "text-chart-negative", neutral: "text-badge-star" };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Detector de Padrões</h3>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
            {patterns.length} padrões
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar time ou padrão..."
            className="w-full rounded-xl bg-muted/50 border border-border py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Patterns list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum padrão encontrado</p>
          ) : (
            filtered.map((p, i) => {
              const TrendIcon = trendIcons[p.trend];
              const expanded = expandedIdx === i;
              return (
                <div
                  key={i}
                  className="rounded-xl bg-muted/30 border border-border overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedIdx(expanded ? null : i)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <TrendIcon className={`h-4 w-4 shrink-0 ${trendColors[p.trend]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground truncate">{p.team}</p>
                        <span className="text-[10px] text-muted-foreground">• {p.pattern}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full rounded-full ${p.confidence >= 70 ? "bg-chart-positive" : p.confidence >= 50 ? "bg-badge-star" : "bg-chart-negative"}`}
                            style={{ width: `${p.confidence}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{p.confidence}%</span>
                      </div>
                    </div>
                    {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                      <p className="text-[11px] text-muted-foreground">{p.description}</p>
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
                        <p className="text-[11px] font-bold text-primary">💡 Sugestão</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.suggestion}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Baseado em {p.games} jogo(s) analisados</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

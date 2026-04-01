import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCopaOdds, COPA_LEAGUES, type NormalizedFixture } from "@/lib/odds-api";
import { MatchCard } from "./MatchCard";
import { MatchCardSkeleton } from "./MatchCardSkeleton";
import { MatchDetailModal } from "./MatchDetailModal";
import { EmptyState } from "./EmptyState";
import { FilterChip } from "./FilterChip";
import { Globe, Trophy, Search, TrendingUp, Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopaSectionProps {
  isPro: boolean;
}

function analyzeMatch(fixture: NormalizedFixture) {
  const odds = fixture.odds;
  if (!odds) return null;

  const h = parseFloat(odds.home);
  const d = parseFloat(odds.draw);
  const a = parseFloat(odds.away);
  if (isNaN(h) || isNaN(d) || isNaN(a)) return null;

  const favorite = h < a ? "home" : a < h ? "away" : "draw";
  const favName = favorite === "home" ? fixture.teams.home.name : favorite === "away" ? fixture.teams.away.name : "Empate";
  const favOdd = favorite === "home" ? h : favorite === "away" ? a : d;
  const confidence = Math.min(95, Math.floor(60 + Math.abs(h - a) * 12));

  let suggestion = "";
  let betType = "";
  if (Math.abs(h - a) > 1.5) {
    suggestion = `${favName} deve dominar. Considere Vitória ${favName} ou Handicap.`;
    betType = favorite === "home" ? "Vitória Casa" : "Vitória Fora";
  } else if (Math.abs(h - a) < 0.3) {
    suggestion = "Jogo equilibrado. Empate ou Ambas Marcam pode ser boa opção.";
    betType = "Empate / Ambas Marcam";
  } else {
    suggestion = `${favName} é leve favorito. Resultado Final ou Dupla Chance são seguros.`;
    betType = `Dupla Chance (${favName})`;
  }

  return { favorite, favName, favOdd, confidence, suggestion, betType };
}

export function CopaSection({ isPro }: CopaSectionProps) {
  const [selectedLeague, setSelectedLeague] = useState<string | undefined>(undefined);
  const [selectedMatch, setSelectedMatch] = useState<NormalizedFixture | null>(null);
  const [search, setSearch] = useState("");
  const [showAnalysis, setShowAnalysis] = useState<string | null>(null);

  const { data: fixtures, isLoading } = useQuery({
    queryKey: ["copa-fixtures"],
    queryFn: () => getCopaOdds(),
    staleTime: 60000,
  });

  const filtered = fixtures
    ?.filter((f) => {
      if (selectedLeague) {
        const leagueInfo = COPA_LEAGUES.find((l) => l.id === selectedLeague);
        if (leagueInfo && !f.league.name.toLowerCase().includes(leagueInfo.name.toLowerCase().split(" ")[0])) {
          // Match by sport key in league name
          const sportKey = selectedLeague.replace(/soccer_/g, "").replace(/_/g, " ");
          if (!f.league.name.toLowerCase().includes(sportKey.split(" ")[0])) return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          f.teams.home.name.toLowerCase().includes(q) ||
          f.teams.away.name.toLowerCase().includes(q)
        );
      }
      return true;
    })
    ?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-yellow-400">
          <Globe className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Copa & Amistosos</h2>
          <p className="text-xs text-muted-foreground">
            Jogos internacionais, eliminatórias e amistosos
          </p>
        </div>
      </div>

      {/* League filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip
          label="Todos"
          active={!selectedLeague}
          onClick={() => setSelectedLeague(undefined)}
        />
        {COPA_LEAGUES.map((l) => (
          <FilterChip
            key={l.id}
            label={l.name}
            active={selectedLeague === l.id}
            onClick={() => setSelectedLeague(selectedLeague === l.id ? undefined : l.id)}
          />
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar seleções..."
          className="w-full rounded-xl bg-card border border-border py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon/50 transition-all"
        />
      </div>

      {/* Stats summary */}
      {fixtures && fixtures.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <Trophy className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{fixtures.length}</p>
            <p className="text-[10px] text-muted-foreground">Jogos</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <Globe className="h-4 w-4 text-chart-positive mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">
              {new Set(fixtures.map((f) => f.league.name)).size}
            </p>
            <p className="text-[10px] text-muted-foreground">Competições</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <TrendingUp className="h-4 w-4 text-badge-star mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">
              {fixtures.filter((f) => f.odds).length}
            </p>
            <p className="text-[10px] text-muted-foreground">Com Odds</p>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.slice(0, isPro ? 50 : 5).map((fixture, index) => {
            const analysis = analyzeMatch(fixture);
            const isExpanded = showAnalysis === fixture.id;

            return (
              <div key={fixture.id}>
                <MatchCard
                  fixture={fixture}
                  showOdds={isPro}
                  onClick={() => setSelectedMatch(fixture)}
                  animationDelay={index * 50}
                />
                {/* Analysis button & panel */}
                {isPro && analysis && (
                  <div className="mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAnalysis(isExpanded ? null : fixture.id);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline ml-2"
                    >
                      <Target className="h-3 w-3" />
                      {isExpanded ? "Fechar análise" : "Ver análise e entrada sugerida"}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 rounded-xl bg-card border border-primary/20 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Análise do Jogo</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{analysis.suggestion}</p>
                        <div className="flex gap-3">
                          <div className="flex-1 rounded-lg bg-primary/5 border border-primary/10 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Entrada Sugerida</p>
                            <p className="text-xs font-bold text-primary">{analysis.betType}</p>
                          </div>
                          <div className="flex-1 rounded-lg bg-chart-positive/5 border border-chart-positive/10 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Confiança</p>
                            <p className={cn(
                              "text-xs font-bold",
                              analysis.confidence >= 80 ? "text-chart-positive" : analysis.confidence >= 65 ? "text-badge-star" : "text-chart-negative"
                            )}>
                              {analysis.confidence}%
                            </p>
                          </div>
                          <div className="flex-1 rounded-lg bg-badge-star/5 border border-badge-star/10 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Odd Favorito</p>
                            <p className="text-xs font-bold text-badge-star">
                              {analysis.favOdd.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState type="no-games" />
      )}

      {selectedMatch && (
        <MatchDetailModal
          fixture={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          showOdds={isPro}
        />
      )}
    </div>
  );
}

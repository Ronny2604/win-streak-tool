import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCopaOdds, COPA_LEAGUES, type NormalizedFixture } from "@/lib/odds-api";
import { MatchCard } from "./MatchCard";
import { MatchCardSkeleton } from "./MatchCardSkeleton";
import { MatchDetailModal } from "./MatchDetailModal";
import { EmptyState } from "./EmptyState";
import { FilterChip } from "./FilterChip";
import { Globe, Trophy, Search, TrendingUp, Shield, Target, Flag, CalendarDays, Sparkles, Goal, Crosshair, Scale, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildPoissonModel, calibrateLambdas, deriveProbabilities } from "@/lib/poisson";

interface CopaSectionProps {
  isPro: boolean;
}

interface MarketPick {
  label: string;
  pick: string;
  probability: number;
  fairOdd: number;
  icon: "goal" | "shield" | "target" | "scale" | "zap" | "crosshair";
  tone: "positive" | "neutral" | "star";
}

function analyzeMatch(fixture: NormalizedFixture) {
  const odds = fixture.odds;
  if (!odds) return null;

  const h = parseFloat(odds.home);
  const d = parseFloat(odds.draw);
  const a = parseFloat(odds.away);
  if (isNaN(h) || isNaN(d) || isNaN(a)) return null;

  // Fair probabilities (remove vig)
  const ih = 1 / h, id = 1 / d, ia = 1 / a;
  const overround = ih + id + ia;
  const pH = ih / overround;
  const pD = id / overround;
  const pA = ia / overround;

  const favorite = h < a ? "home" : a < h ? "away" : "draw";
  const favName = favorite === "home" ? fixture.teams.home.name : favorite === "away" ? fixture.teams.away.name : "Empate";
  const favOdd = favorite === "home" ? h : favorite === "away" ? a : d;
  const confidence = Math.min(95, Math.floor(60 + Math.abs(h - a) * 12));

  // Poisson model — Copa games tend to be tighter, base total 2.5
  const { lambdaHome, lambdaAway } = calibrateLambdas(pH, pA, 0, 0, 2.5);
  const model = buildPoissonModel(lambdaHome, lambdaAway);
  const probs = deriveProbabilities(model);

  let suggestion = "";
  let betType = "";
  if (Math.abs(h - a) > 1.5) {
    suggestion = `${favName} deve dominar. Considere Vitória ${favName} ou Handicap -1.`;
    betType = favorite === "home" ? "Vitória Casa" : "Vitória Fora";
  } else if (Math.abs(h - a) < 0.3) {
    suggestion = "Jogo equilibrado. Empate ou Ambas Marcam pode ser boa opção.";
    betType = "Empate / Ambas Marcam";
  } else {
    suggestion = `${favName} é leve favorito. Resultado Final ou Dupla Chance são seguros.`;
    betType = `Dupla Chance (${favName})`;
  }

  // Build best markets ranked by probability
  const markets: MarketPick[] = [];

  // 1X2 best side
  const winProb = Math.max(pH, pD, pA);
  markets.push({
    label: "Resultado Final",
    pick: favName,
    probability: winProb,
    fairOdd: 1 / winProb,
    icon: "target",
    tone: "positive",
  });

  // Dupla Chance
  const dc1X = pH + pD, dcX2 = pD + pA, dc12 = pH + pA;
  const bestDc = Math.max(dc1X, dcX2, dc12);
  const dcLabel = bestDc === dc1X
    ? `${fixture.teams.home.name} ou Empate`
    : bestDc === dcX2
    ? `${fixture.teams.away.name} ou Empate`
    : `${fixture.teams.home.name} ou ${fixture.teams.away.name}`;
  markets.push({
    label: "Dupla Chance",
    pick: dcLabel,
    probability: bestDc,
    fairOdd: 1 / bestDc,
    icon: "shield",
    tone: "positive",
  });

  // Over/Under 2.5
  const overUnderProb = Math.max(probs.over25, probs.under25);
  markets.push({
    label: "Total de Gols",
    pick: probs.over25 > probs.under25 ? "Mais de 2.5" : "Menos de 2.5",
    probability: overUnderProb,
    fairOdd: 1 / overUnderProb,
    icon: "goal",
    tone: "neutral",
  });

  // Over 1.5 (safer alt)
  markets.push({
    label: "Gols Alternativo",
    pick: probs.over15 > 0.7 ? "Mais de 1.5" : "Menos de 3.5",
    probability: probs.over15 > 0.7 ? probs.over15 : 1 - probs.over35,
    fairOdd: 1 / (probs.over15 > 0.7 ? probs.over15 : 1 - probs.over35),
    icon: "zap",
    tone: "neutral",
  });

  // BTTS
  const bttsProb = Math.max(probs.btts, 1 - probs.btts);
  markets.push({
    label: "Ambas Marcam",
    pick: probs.btts > 0.5 ? "Sim" : "Não",
    probability: bttsProb,
    fairOdd: 1 / bttsProb,
    icon: "scale",
    tone: "neutral",
  });

  // Top correct score
  const topScore = probs.topScores[0];
  if (topScore) {
    markets.push({
      label: "Placar Exato",
      pick: topScore.score,
      probability: topScore.probability,
      fairOdd: 1 / topScore.probability,
      icon: "crosshair",
      tone: "star",
    });
  }

  // Multiple correct scores (top 3 combined)
  const top3 = probs.topScores.slice(0, 3);
  const top3Prob = top3.reduce((s, x) => s + x.probability, 0);
  if (top3.length === 3) {
    markets.push({
      label: "Múltiplos Placares",
      pick: top3.map((s) => s.score).join(" / "),
      probability: top3Prob,
      fairOdd: 1 / top3Prob,
      icon: "crosshair",
      tone: "star",
    });
  }

  // Sort by probability (highest = safer) and keep top 6
  const bestMarkets = markets.sort((a, b) => b.probability - a.probability).slice(0, 6);

  return { favorite, favName, favOdd, confidence, suggestion, betType, bestMarkets, expectedGoals: probs.expectedGoals };
}

const MARKET_ICONS = {
  goal: Goal,
  shield: Shield,
  target: Target,
  scale: Scale,
  zap: Zap,
  crosshair: Crosshair,
} as const;

const WC_LEAGUE_IDS = ["soccer_fifa_world_cup"];
const WC_QUALIFIER_IDS = [
  "soccer_fifa_world_cup_qualifiers_conmebol",
  "soccer_fifa_world_cup_qualifiers_uefa",
];
const FRIENDLY_IDS = ["soccer_international_friendlies"];

function isWorldCupFixture(f: NormalizedFixture) {
  const n = f.league.name.toLowerCase();
  return n.includes("world cup") || n.includes("copa do mundo") || n.includes("fifa world");
}
function isQualifierFixture(f: NormalizedFixture) {
  const n = f.league.name.toLowerCase();
  return n.includes("qualif") || n.includes("eliminat");
}

function useWorldCupCountdown() {
  // FIFA World Cup 2026: June 11, 2026 → July 19, 2026 (USA / Canada / Mexico)
  const start = new Date("2026-06-11T20:00:00Z").getTime();
  const end = new Date("2026-07-19T23:00:00Z").getTime();
  const now = Date.now();
  if (now < start) {
    const days = Math.ceil((start - now) / 86400000);
    return { status: "before" as const, label: `Faltam ${days} dias`, days };
  }
  if (now <= end) {
    return { status: "live" as const, label: "Acontecendo agora", days: 0 };
  }
  return { status: "after" as const, label: "Edição encerrada", days: 0 };
}

export function CopaSection({ isPro }: CopaSectionProps) {
  const [selectedLeague, setSelectedLeague] = useState<string | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<"all" | "wc" | "qualifiers" | "friendlies">("all");
  const [selectedMatch, setSelectedMatch] = useState<NormalizedFixture | null>(null);
  const [search, setSearch] = useState("");
  const [showAnalysis, setShowAnalysis] = useState<string | null>(null);
  const wc = useWorldCupCountdown();

  const REFRESH_INTERVAL_MS = 60_000;
  const { data: fixtures, isLoading, isFetching, isError, refetch, dataUpdatedAt, errorUpdatedAt } = useQuery({
    queryKey: ["copa-fixtures"],
    queryFn: () => getCopaOdds(),
    staleTime: 30_000,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const lastUpdate = dataUpdatedAt || errorUpdatedAt;
  const secondsAgo = lastUpdate ? Math.max(0, Math.floor((now - lastUpdate) / 1000)) : null;
  const nextRefreshIn = lastUpdate
    ? Math.max(0, Math.ceil((lastUpdate + REFRESH_INTERVAL_MS - now) / 1000))
    : null;
  const status: "updating" | "ok" | "error" = isFetching ? "updating" : isError ? "error" : "ok";

  const filtered = fixtures
    ?.filter((f) => {
      if (selectedGroup === "wc" && !isWorldCupFixture(f)) return false;
      if (selectedGroup === "qualifiers" && !isQualifierFixture(f)) return false;
      if (selectedGroup === "friendlies" && !(f.league.name.toLowerCase().includes("friendl") || f.league.name.toLowerCase().includes("amistos"))) return false;
      if (selectedLeague) {
        const leagueInfo = COPA_LEAGUES.find((l) => l.id === selectedLeague);
        if (leagueInfo && !f.league.name.toLowerCase().includes(leagueInfo.name.toLowerCase().split(" ")[0])) {
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
    ?.sort((a, b) => {
      // Prioritize World Cup fixtures, then by date
      const wcA = isWorldCupFixture(a) ? 0 : isQualifierFixture(a) ? 1 : 2;
      const wcB = isWorldCupFixture(b) ? 0 : isQualifierFixture(b) ? 1 : 2;
      if (wcA !== wcB) return wcA - wcB;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const wcCount = fixtures?.filter(isWorldCupFixture).length ?? 0;
  const qualCount = fixtures?.filter(isQualifierFixture).length ?? 0;

  return (
    <div className="space-y-4">
      {/* World Cup 2026 Hero */}
      <button
        type="button"
        onClick={() => setSelectedGroup("wc")}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border text-left transition-all",
          "bg-gradient-to-br from-badge-star/20 via-primary/10 to-chart-positive/15",
          "border-badge-star/40 backdrop-blur-xl p-4 shadow-[0_8px_32px_-12px_hsl(var(--badge-star)/0.5)]",
          "hover:scale-[1.01] active:scale-[0.99]"
        )}
      >
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-badge-star/20 blur-2xl" />
        <div className="absolute -left-4 -bottom-8 h-24 w-24 rounded-full bg-chart-positive/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-badge-star to-primary shadow-lg">
            <Trophy className="h-6 w-6 text-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-badge-star">FIFA World Cup 2026</p>
              {wc.status === "live" && (
                <span className="flex items-center gap-1 rounded-full bg-chart-negative/20 px-1.5 py-0.5 text-[9px] font-bold text-chart-negative">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-chart-negative" /> AO VIVO
                </span>
              )}
            </div>
            <h3 className="truncate text-base font-bold text-foreground">Caminho até a Copa</h3>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{wc.label}</span>
              <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{wcCount} jogos</span>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-badge-star" />
        </div>
      </button>

      {/* Auto-refresh status bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 backdrop-blur-xl transition-colors",
          status === "updating" && "border-primary/40 bg-primary/10",
          status === "ok" && "border-chart-positive/30 bg-chart-positive/5",
          status === "error" && "border-chart-negative/40 bg-chart-negative/10"
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "updating" && "animate-pulse bg-primary",
              status === "ok" && "bg-chart-positive",
              status === "error" && "bg-chart-negative"
            )}
          />
          {status === "updating" && <span className="text-primary">Atualizando odds…</span>}
          {status === "ok" && (
            <span className="text-foreground/80">
              Odds atualizadas
              {secondsAgo !== null && (
                <span className="ml-1 text-muted-foreground">
                  · há {secondsAgo < 60 ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}min`}
                </span>
              )}
              {nextRefreshIn !== null && nextRefreshIn > 0 && (
                <span className="ml-1 text-muted-foreground">· próxima em {nextRefreshIn}s</span>
              )}
            </span>
          )}
          {status === "error" && <span className="text-chart-negative">Erro ao atualizar odds</span>}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className={cn(
            "flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-2 py-1 text-[10px] font-semibold text-foreground/80 transition-all hover:border-primary/50 hover:text-primary disabled:opacity-50",
          )}
        >
          <TrendingUp className={cn("h-3 w-3", isFetching && "animate-spin")} />
          Atualizar
        </button>
      </div>


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

      {/* Group quick filters (WC focus) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip label="Todos" active={selectedGroup === "all"} onClick={() => setSelectedGroup("all")} />
        <FilterChip label={`🏆 Copa 2026${wcCount ? ` · ${wcCount}` : ""}`} active={selectedGroup === "wc"} onClick={() => setSelectedGroup("wc")} />
        <FilterChip label={`Eliminatórias${qualCount ? ` · ${qualCount}` : ""}`} active={selectedGroup === "qualifiers"} onClick={() => setSelectedGroup("qualifiers")} />
        <FilterChip label="Amistosos" active={selectedGroup === "friendlies"} onClick={() => setSelectedGroup("friendlies")} />
      </div>

      {/* League filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip
          label="Todas ligas"
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

                        {/* Best Markets */}
                        {analysis.bestMarkets.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-badge-star" />
                                <span className="text-[11px] font-bold text-foreground">Melhores Mercados</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                xG {analysis.expectedGoals.toFixed(2)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {analysis.bestMarkets.map((m, i) => {
                                const Icon = MARKET_ICONS[m.icon];
                                const toneClass =
                                  m.tone === "positive"
                                    ? "bg-chart-positive/10 border-chart-positive/20 text-chart-positive"
                                    : m.tone === "star"
                                    ? "bg-badge-star/10 border-badge-star/20 text-badge-star"
                                    : "bg-primary/10 border-primary/20 text-primary";
                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      "rounded-lg border p-2 backdrop-blur-sm transition-all hover:scale-[1.02]",
                                      toneClass
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Icon className="h-3 w-3 flex-shrink-0" />
                                      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
                                        {m.label}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] font-bold text-foreground" title={m.pick}>
                                      {m.pick}
                                    </p>
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="text-[10px] font-bold tabular-nums">
                                        {(m.probability * 100).toFixed(0)}%
                                      </span>
                                      <span className="text-[10px] text-muted-foreground tabular-nums">
                                        @{m.fairOdd.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-muted-foreground text-center pt-1">
                              Probabilidade real (sem margem) · Odd justa estimada
                            </p>
                          </div>
                        )}
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

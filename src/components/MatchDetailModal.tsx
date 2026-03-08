import { useMemo, useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { analyzeMatch } from "@/lib/match-analysis";
import { useCustomTicket } from "@/contexts/CustomTicketContext";
import {
  X,
  Trophy,
  TrendingUp,
  BarChart3,
  Target,
  Shield,
  Zap,
  Plus,
  Check,
  Swords,
  Goal,
} from "lucide-react";

const FORM_COLORS: Record<string, string> = {
  W: "bg-emerald-500 text-white",
  D: "bg-amber-500 text-white",
  L: "bg-red-500 text-white",
};

const TAG_STYLES: Record<string, string> = {
  "MELHOR APOSTA": "bg-neon/20 text-neon border-neon/30",
  "VALUE BET": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  SEGURO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  RISCO: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface MatchDetailModalProps {
  fixture: NormalizedFixture;
  onClose: () => void;
  showOdds: boolean;
}

export function MatchDetailModal({ fixture, onClose, showOdds }: MatchDetailModalProps) {
  const analysis = useMemo(() => analyzeMatch(fixture), [fixture]);
  const { addSelection, removeSelection, isSelected, getSelection } = useCustomTicket();
  const { teams, league, odds, date } = fixture;
  const time = new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const handleSelectMarket = (market: typeof analysis.markets[0]) => {
    if (isSelected(fixture.id) && getSelection(fixture.id)?.betType === market.betType) {
      removeSelection(fixture.id);
    } else {
      addSelection({
        fixtureId: fixture.id,
        fixture,
        betType: market.betType,
        label: market.label,
        odd: market.odd,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-background border border-border rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {league.logo && <img src={league.logo} alt="" className="w-5 h-5 object-contain" />}
              <span className="text-xs text-muted-foreground capitalize">{league.name}</span>
              <span className="text-xs text-muted-foreground">• {time}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-card border border-border hover:border-neon/30 transition-all"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">{teams.home.name}</p>
              <p className="text-base font-bold text-foreground">{teams.away.name}</p>
            </div>
            {odds && showOdds && (
              <div className="flex gap-1.5">
                {[
                  { label: "C", val: odds.home },
                  { label: "E", val: odds.draw },
                  { label: "F", val: odds.away },
                ].map((o) => (
                  <div key={o.label} className="rounded-lg bg-surface px-2.5 py-1 text-center min-w-[44px]">
                    <div className="text-[9px] text-muted-foreground">{o.label}</div>
                    <div className="text-xs font-bold text-foreground">{o.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Stats Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-neon" />
              <span className="text-sm font-bold text-foreground">Estatísticas</span>
            </div>

            {/* Form */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{teams.home.name}</span>
                <div className="flex gap-1">
                  {analysis.stats.homeForm.map((r, i) => (
                    <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${FORM_COLORS[r]}`}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{teams.away.name}</span>
                <div className="flex gap-1">
                  {analysis.stats.awayForm.map((r, i) => (
                    <span key={i} className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${FORM_COLORS[r]}`}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* H2H */}
            <div className="rounded-xl bg-card border border-border p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Confronto Direto ({analysis.stats.h2h.total} jogos)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">{teams.home.name}</span>
                    <span className="font-bold text-foreground">{analysis.stats.h2h.homeWins}</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neon"
                      style={{ width: `${(analysis.stats.h2h.homeWins / analysis.stats.h2h.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-center min-w-[36px]">
                  <span className="text-[10px] text-muted-foreground">Emp</span>
                  <p className="text-xs font-bold text-foreground">{analysis.stats.h2h.draws}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold text-foreground">{analysis.stats.h2h.awayWins}</span>
                    <span className="text-muted-foreground">{teams.away.name}</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-chart-negative ml-auto"
                      style={{ width: `${(analysis.stats.h2h.awayWins / analysis.stats.h2h.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <Goal className="h-4 w-4 mx-auto text-neon mb-1" />
                <p className="text-xs text-muted-foreground">Gols/Jogo</p>
                <p className="text-sm font-bold text-foreground">
                  {analysis.stats.homeGoalsAvg} - {analysis.stats.awayGoalsAvg}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-neon mb-1" />
                <p className="text-xs text-muted-foreground">Over 2.5</p>
                <p className="text-sm font-bold text-foreground">{analysis.stats.over25Percent}%</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <Target className="h-4 w-4 mx-auto text-amber-400 mb-1" />
                <p className="text-xs text-muted-foreground">BTTS</p>
                <p className="text-sm font-bold text-foreground">{analysis.stats.bttsPercent}%</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <Swords className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">H2H</p>
                <p className="text-sm font-bold text-foreground">
                  {analysis.stats.h2h.homeWins}-{analysis.stats.h2h.draws}-{analysis.stats.h2h.awayWins}
                </p>
              </div>
            </div>
          </div>

          {/* Suggested Markets */}
          {showOdds && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-neon" />
                <span className="text-sm font-bold text-foreground">Mercados Sugeridos</span>
              </div>

              <div className="space-y-2">
                {analysis.markets.map((market, i) => {
                  const selected = isSelected(fixture.id) && getSelection(fixture.id)?.betType === market.betType;

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectMarket(market)}
                      className={`w-full rounded-xl border p-3 text-left transition-all ${
                        selected
                          ? "border-neon bg-neon/10"
                          : "border-border bg-card hover:border-neon/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TAG_STYLES[market.tag]}`}>
                            {market.tag}
                          </span>
                          <span className="text-xs font-bold text-foreground">{market.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neon">{market.odd.toFixed(2)}</span>
                          {selected ? (
                            <div className="w-5 h-5 rounded-full bg-neon flex items-center justify-center">
                              <Check className="h-3 w-3 text-background" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center">
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground flex-1">{market.reasoning}</p>
                        <span className="text-[10px] text-muted-foreground ml-2">{market.confidence}%</span>
                      </div>
                      {/* Confidence bar */}
                      <div className="h-1 rounded-full bg-border mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-neon transition-all"
                          style={{ width: `${market.confidence}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

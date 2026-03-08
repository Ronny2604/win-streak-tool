import { useEffect, useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { analyzeMarketAsync, analyzeMarket, MarketType, MarketTeamInsight } from "@/lib/market-analysis";
import { useCustomTicket } from "@/contexts/CustomTicketContext";
import {
  CornerDownRight,
  CreditCard,
  Goal,
  Target,
  Shield,
  Swords,
  Plus,
  Check,
  TrendingUp,
  X,
  Loader2,
  Database,
} from "lucide-react";

const MARKET_ICONS: Record<MarketType, typeof Goal> = {
  Escanteios: CornerDownRight,
  Cartões: CreditCard,
  Gols: Goal,
  "Ambas Marcam": Target,
  "Chance Dupla": Shield,
  "S/ Empate": Swords,
};

const TAG_STYLES: Record<string, string> = {
  FAVORITO: "bg-neon/20 text-neon border-neon/30",
  VALUE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  TENDÊNCIA: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FORTE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

interface MarketInsightPanelProps {
  market: MarketType;
  fixtures: NormalizedFixture[];
  onClose: () => void;
}

export function MarketInsightPanel({ market, fixtures, onClose }: MarketInsightPanelProps) {
  const [insights, setInsights] = useState<MarketTeamInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const { addSelection, removeSelection, isSelected, getSelection } = useCustomTicket();
  const Icon = MARKET_ICONS[market];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Show immediate fallback
    const fallback = analyzeMarket(fixtures, market);
    setInsights(fallback);

    // Then fetch real data
    analyzeMarketAsync(fixtures, market)
      .then((real) => {
        if (!cancelled) {
          setInsights(real);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fixtures, market]);

  const handleToggle = (insight: MarketTeamInsight) => {
    const key = insight.fixture.id;
    if (isSelected(key) && getSelection(key)?.betType === `market_${market}_${insight.teamName}`) {
      removeSelection(key);
    } else {
      addSelection({
        fixtureId: key,
        fixture: insight.fixture,
        betType: `market_${market}_${insight.teamName}`,
        label: insight.suggestedBet,
        odd: insight.suggestedOdd,
      });
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-neon/20 overflow-hidden animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-neon/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neon/20 flex items-center justify-center">
            <Icon className="h-4 w-4 text-neon" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{market}</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando dados reais...
                </>
              ) : (
                <>
                  {insights.filter(i => i.realData).length > 0 && (
                    <Database className="h-3 w-3 text-neon" />
                  )}
                  {insights.length} {insights.length === 1 ? "oportunidade" : "oportunidades"} encontradas
                  {insights.filter(i => i.realData).length > 0 && (
                    <span className="text-neon ml-1">• Dados reais</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-card border border-border hover:border-neon/30 transition-all"
        >
          <X className="h-4 w-4 text-foreground" />
        </button>
      </div>

      {/* Insights list */}
      <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
        {insights.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade forte para este mercado hoje.</p>
          </div>
        ) : (
          insights.slice(0, 15).map((insight, i) => {
            const key = insight.fixture.id;
            const betType = `market_${market}_${insight.teamName}`;
            const selected = isSelected(key) && getSelection(key)?.betType === betType;

            return (
              <button
                key={`${key}-${i}`}
                onClick={() => handleToggle(insight)}
                className={`w-full p-3.5 text-left transition-all hover:bg-accent/5 ${
                  selected ? "bg-neon/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TAG_STYLES[insight.tag]}`}>
                        {insight.tag}
                      </span>
                      {insight.realData && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-neon/30 bg-neon/10 text-neon">
                          REAL
                        </span>
                      )}
                      <span className="text-xs font-bold text-foreground truncate">{insight.teamName}</span>
                    </div>
                    {insight.opponent !== "Total" && insight.opponent !== "BTTS" && insight.opponent !== "Sem Empate" && insight.opponent !== "Estimativa" && (
                      <p className="text-[10px] text-muted-foreground mb-1.5">vs {insight.opponent}</p>
                    )}
                    <p className="text-xs font-semibold text-neon mb-1">{insight.suggestedBet}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{insight.reasoning}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-neon">{insight.suggestedOdd.toFixed(2)}</span>
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
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-foreground">{insight.score}%</span>
                    </div>
                    <div className="w-12 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-neon"
                        style={{ width: `${insight.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

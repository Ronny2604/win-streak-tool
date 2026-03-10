import { useMemo, useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { detectSurebets, SurebetOpportunity } from "@/lib/surebet-detector";
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
} from "lucide-react";

const RATING_CONFIG = {
  surebet: {
    label: "SUREBET",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    icon: Shield,
  },
  "near-surebet": {
    label: "QUASE SURE",
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-400",
    icon: Target,
  },
  "low-margin": {
    label: "MARGEM BAIXA",
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-400",
    icon: TrendingUp,
  },
};

interface SurebetDetectorProps {
  fixtures: NormalizedFixture[];
}

export function SurebetDetector({ fixtures }: SurebetDetectorProps) {
  const [bankroll, setBankroll] = useState(100);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const opportunities = useMemo(
    () => detectSurebets(fixtures, bankroll),
    [fixtures, bankroll]
  );

  const surebets = opportunities.filter((o) => o.rating === "surebet");
  const nearSurebets = opportunities.filter((o) => o.rating === "near-surebet");
  const lowMargin = opportunities.filter((o) => o.rating === "low-margin");

  return (
    <div id="surebet-panel" className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Detector de Surebets</h2>
            <p className="text-[10px] text-muted-foreground">
              Encontre oportunidades de arbitragem no mercado 1X2
            </p>
          </div>
        </div>

        {/* Bankroll input */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Banca:</label>
          <div className="relative flex-1">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Math.max(1, Number(e.target.value)))}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:border-neon/50 focus:outline-none transition-colors"
              min={1}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard
            label="Surebets"
            value={surebets.length}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <SummaryCard
            label="Quase Sure"
            value={nearSurebets.length}
            color="text-amber-400"
            bg="bg-amber-500/10"
          />
          <SummaryCard
            label="Margem Baixa"
            value={lowMargin.length}
            color="text-blue-400"
            bg="bg-blue-500/10"
          />
        </div>
      </div>

      {/* Alert if surebets found */}
      {surebets.length > 0 && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2.5">
          <Zap className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-emerald-400">
              {surebets.length} Surebet{surebets.length > 1 ? "s" : ""} encontrada{surebets.length > 1 ? "s" : ""}!
            </p>
            <p className="text-[10px] text-emerald-400/70 mt-0.5">
              Lucro garantido independente do resultado. Aja rápido — odds mudam constantemente.
            </p>
          </div>
        </div>
      )}

      {opportunities.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhuma oportunidade de arbitragem encontrada no momento.
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Surebets são raras. Continue monitorando — novas odds surgem a todo momento.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <OpportunityCard
              key={opp.fixture.id}
              opportunity={opp}
              expanded={expandedId === opp.fixture.id}
              onToggle={() =>
                setExpandedId(expandedId === opp.fixture.id ? null : opp.fixture.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl ${bg} p-2.5 text-center`}>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function OpportunityCard({
  opportunity: opp,
  expanded,
  onToggle,
}: {
  opportunity: SurebetOpportunity;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = RATING_CONFIG[opp.rating];
  const RatingIcon = config.icon;

  return (
    <div
      className={`rounded-xl bg-card border ${
        opp.rating === "surebet" ? "border-emerald-500/40" : "border-border"
      } overflow-hidden transition-all`}
    >
      <button
        onClick={onToggle}
        className="w-full p-3.5 text-left hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
              <RatingIcon className={`h-3.5 w-3.5 ${config.text}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${config.bg} ${config.border} ${config.text}`}>
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {opp.fixture.league.name}
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground truncate">
                {opp.fixture.teams.home.name} vs {opp.fixture.teams.away.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <p className={`text-sm font-bold ${opp.margin < 0 ? "text-emerald-400" : opp.margin < 2 ? "text-amber-400" : "text-blue-400"}`}>
                {opp.margin < 0 ? `+${opp.profitPercent}%` : `${opp.margin}%`}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {opp.margin < 0 ? "lucro" : "margem"}
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
          {/* Odds */}
          <div className="grid grid-cols-3 gap-2">
            <OddCell label="Casa" odd={opp.bestOdds.home} stake={opp.stakes.home} />
            <OddCell label="Empate" odd={opp.bestOdds.draw} stake={opp.stakes.draw} />
            <OddCell label="Fora" odd={opp.bestOdds.away} stake={opp.stakes.away} />
          </div>

          {/* Return info */}
          <div className="rounded-lg bg-background border border-border p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">Investimento total</p>
              <p className="text-sm font-bold text-foreground">
                R$ {opp.totalStake.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">
                {opp.rating === "surebet" ? "Retorno garantido" : "Retorno estimado"}
              </p>
              <p className={`text-sm font-bold ${opp.rating === "surebet" ? "text-emerald-400" : "text-foreground"}`}>
                R$ {opp.guaranteedReturn.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>

          {opp.rating !== "surebet" && (
            <p className="text-[10px] text-muted-foreground/60 text-center">
              ⚠️ Margem positiva — não é surebet garantida, mas a margem é baixa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OddCell({ label, odd, stake }: { label: string; odd: number; stake: number }) {
  return (
    <div className="rounded-lg bg-background border border-border p-2 text-center">
      <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold text-neon">{odd.toFixed(2)}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        R$ {stake.toFixed(2).replace(".", ",")}
      </p>
    </div>
  );
}

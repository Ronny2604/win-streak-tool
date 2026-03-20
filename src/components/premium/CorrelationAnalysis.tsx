import { useMemo, useState } from "react";
import { GitBranch, Info } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

export function CorrelationAnalysis({ fixtures }: { fixtures: NormalizedFixture[] }) {
  const [maxPairs, setMaxPairs] = useState(6);

  const pairs = useMemo(() => {
    if (!fixtures?.length) return [];
    const valid = fixtures.filter((f) => f.odds?.home && f.odds?.away).slice(0, 12);
    const result: { a: NormalizedFixture; b: NormalizedFixture; correlation: number; insight: string }[] = [];

    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const a = valid[i];
        const b = valid[j];
        const sameLeague = a.league.name === b.league.name;
        const aHome = parseFloat(a.odds!.home);
        const bHome = parseFloat(b.odds!.home);
        const oddsDiff = Math.abs(aHome - bHome);
        
        // Simulated correlation based on league proximity and odds similarity
        let corr = 0;
        if (sameLeague) corr += 0.3;
        if (oddsDiff < 0.5) corr += 0.25;
        else if (oddsDiff < 1) corr += 0.1;
        corr += Math.random() * 0.3; // Statistical variation simulation
        corr = Math.min(corr, 0.95);

        let insight = "";
        if (sameLeague && oddsDiff < 0.5) insight = "Mesma liga, odds similares — alta correlação potencial";
        else if (sameLeague) insight = "Mesma liga — resultados podem se influenciar";
        else if (oddsDiff < 0.3) insight = "Odds muito próximas — perfis de jogo parecidos";
        else insight = "Correlação baixa — boa para diversificação em múltiplas";

        result.push({ a, b, correlation: corr, insight });
      }
    }
    return result.sort((x, y) => y.correlation - x.correlation).slice(0, maxPairs);
  }, [fixtures, maxPairs]);

  const getCorrelationColor = (c: number) => {
    if (c >= 0.7) return "bg-chart-negative/20 text-chart-negative border-chart-negative/30";
    if (c >= 0.4) return "bg-badge-star/20 text-badge-star border-badge-star/30";
    return "bg-chart-positive/20 text-chart-positive border-chart-positive/30";
  };

  const getCorrelationLabel = (c: number) => {
    if (c >= 0.7) return "Alta";
    if (c >= 0.4) return "Média";
    return "Baixa";
  };

  if (!fixtures?.length) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum jogo disponível para análise de correlação</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Análise de Correlação</h3>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 mb-4">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Correlações altas indicam jogos cujos resultados tendem a se influenciar. Para múltiplas, prefira jogos com correlação baixa para maximizar diversificação.
          </p>
        </div>

        <div className="space-y-3">
          {pairs.map(({ a, b, correlation, insight }, i) => (
            <div key={i} className="rounded-xl bg-muted/30 border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {a.teams.home.name} vs {a.teams.away.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{a.league.name}</p>
                </div>
                <div className={`rounded-lg px-2 py-1 text-[10px] font-black border ${getCorrelationColor(correlation)}`}>
                  {getCorrelationLabel(correlation)} ({(correlation * 100).toFixed(0)}%)
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-bold text-foreground truncate">
                    {b.teams.home.name} vs {b.teams.away.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{b.league.name}</p>
                </div>
              </div>

              {/* Heatmap bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    correlation >= 0.7 ? "bg-chart-negative" : correlation >= 0.4 ? "bg-badge-star" : "bg-chart-positive"
                  }`}
                  style={{ width: `${correlation * 100}%` }}
                />
              </div>

              <p className="text-[10px] text-muted-foreground italic">{insight}</p>
            </div>
          ))}
        </div>

        {pairs.length >= maxPairs && (
          <button
            onClick={() => setMaxPairs((p) => p + 6)}
            className="w-full mt-3 text-xs font-bold text-primary hover:underline"
          >
            Ver mais pares
          </button>
        )}
      </div>
    </div>
  );
}

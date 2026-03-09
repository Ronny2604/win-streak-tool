import { useState } from "react";
import { Calculator, DollarSign, Percent, TrendingUp } from "lucide-react";

export function BankrollSimulator() {
  const [bankroll, setBankroll] = useState(1000);
  const [odd, setOdd] = useState(1.85);
  const [probability, setProbability] = useState(60);
  const [unit, setUnit] = useState(5);

  // Kelly Criterion: f* = (bp - q) / b where b = odd - 1, p = prob, q = 1 - prob
  const b = odd - 1;
  const p = probability / 100;
  const q = 1 - p;
  const kelly = Math.max(0, (b * p - q) / b);
  const kellyStake = bankroll * kelly;
  const halfKelly = kellyStake / 2;
  const unitStake = bankroll * (unit / 100);
  const ev = (p * (odd - 1) - q) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-neon" />
        <h3 className="text-sm font-bold text-foreground">Simulador de Banca (Kelly)</h3>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3" /> Banca (R$)
            </label>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3" /> Odd
            </label>
            <input
              type="number"
              step="0.01"
              value={odd}
              onChange={(e) => setOdd(Number(e.target.value))}
              className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
              <Percent className="h-3 w-3" /> Probabilidade (%)
            </label>
            <input
              type="number"
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
              Unidade (%)
            </label>
            <input
              type="number"
              value={unit}
              onChange={(e) => setUnit(Number(e.target.value))}
              className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
            />
          </div>
        </div>

        {/* Probability slider */}
        <div>
          <input
            type="range"
            min={1}
            max={99}
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
            className="w-full accent-neon"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1%</span>
            <span>{probability}%</span>
            <span>99%</span>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface p-3 text-center">
            <div className="text-[10px] text-muted-foreground mb-1">Kelly Critério</div>
            <div className="text-lg font-bold text-neon">{(kelly * 100).toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">R$ {kellyStake.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-surface p-3 text-center">
            <div className="text-[10px] text-muted-foreground mb-1">Meio Kelly</div>
            <div className="text-lg font-bold text-badge-star">{(kelly * 50).toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">R$ {halfKelly.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-surface p-3 text-center">
            <div className="text-[10px] text-muted-foreground mb-1">Aposta por Unidade</div>
            <div className="text-lg font-bold text-foreground">R$ {unitStake.toFixed(2)}</div>
          </div>
          <div className={`rounded-lg bg-surface p-3 text-center`}>
            <div className="text-[10px] text-muted-foreground mb-1">EV (Valor Esperado)</div>
            <div className={`text-lg font-bold ${ev >= 0 ? "text-chart-positive" : "text-chart-negative"}`}>
              {ev >= 0 ? "+" : ""}{ev.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className={`rounded-lg p-3 text-center text-sm font-semibold ${
          ev > 5 ? "bg-chart-positive/10 text-chart-positive border border-chart-positive/20" :
          ev > 0 ? "bg-badge-star/10 text-badge-star border border-badge-star/20" :
          "bg-chart-negative/10 text-chart-negative border border-chart-negative/20"
        }`}>
          {ev > 5 ? "✅ Value Bet! Aposte com confiança" :
           ev > 0 ? "⚠️ Margem pequena — aposte com cautela" :
           "❌ Sem valor — evite essa aposta"}
        </div>
      </div>
    </div>
  );
}

import { NormalizedFixture } from "@/lib/odds-api";
import { TrendingUp, AlertTriangle, Zap } from "lucide-react";

interface ValueBet {
  fixture: NormalizedFixture;
  market: string;
  odd: number;
  impliedProb: number;
  estimatedProb: number;
  edge: number;
}

function detectValueBets(fixtures: NormalizedFixture[]): ValueBet[] {
  const valueBets: ValueBet[] = [];

  for (const fixture of fixtures) {
    if (!fixture.odds) continue;

    const homeOdd = parseFloat(fixture.odds.home);
    const drawOdd = parseFloat(fixture.odds.draw);
    const awayOdd = parseFloat(fixture.odds.away);

    if (isNaN(homeOdd) || isNaN(drawOdd) || isNaN(awayOdd)) continue;

    // Calculate implied probabilities
    const homeImplied = 1 / homeOdd;
    const drawImplied = 1 / drawOdd;
    const awayImplied = 1 / awayOdd;
    const totalImplied = homeImplied + drawImplied + awayImplied;

    // Remove overround to get "fair" probabilities
    const homeFair = homeImplied / totalImplied;
    const drawFair = drawImplied / totalImplied;
    const awayFair = awayImplied / totalImplied;

    // Simulate estimated probability (slight random edge for demo — in production, use models)
    const homeEst = homeFair + (Math.random() * 0.08 - 0.02);
    const drawEst = drawFair + (Math.random() * 0.06 - 0.03);
    const awayEst = awayFair + (Math.random() * 0.08 - 0.02);

    const entries: { market: string; odd: number; implied: number; estimated: number }[] = [
      { market: "Casa", odd: homeOdd, implied: homeImplied, estimated: homeEst },
      { market: "Empate", odd: drawOdd, implied: drawImplied, estimated: drawEst },
      { market: "Fora", odd: awayOdd, implied: awayImplied, estimated: awayEst },
    ];

    for (const entry of entries) {
      const edge = ((entry.estimated - entry.implied) / entry.implied) * 100;
      if (edge > 5) {
        valueBets.push({
          fixture,
          market: entry.market,
          odd: entry.odd,
          impliedProb: entry.implied * 100,
          estimatedProb: entry.estimated * 100,
          edge,
        });
      }
    }
  }

  return valueBets.sort((a, b) => b.edge - a.edge).slice(0, 8);
}

interface ValueBetsPanelProps {
  fixtures: NormalizedFixture[];
}

export function ValueBetsPanel({ fixtures }: ValueBetsPanelProps) {
  const valueBets = detectValueBets(fixtures);

  if (valueBets.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma Value Bet detectada no momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-5 w-5 text-badge-star" />
        <h3 className="text-sm font-bold text-foreground">Value Bets Detectadas</h3>
        <span className="ml-auto text-[10px] bg-badge-star/20 text-badge-star px-2 py-0.5 rounded-full font-bold">
          {valueBets.length} ALERTAS
        </span>
      </div>

      {valueBets.map((vb, i) => (
        <div
          key={`${vb.fixture.id}-${vb.market}-${i}`}
          className="rounded-xl bg-card border border-badge-star/30 p-4 space-y-2 hover:border-badge-star/60 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {vb.fixture.league.logo && (
                <img src={vb.fixture.league.logo} alt="" className="w-4 h-4 object-contain" />
              )}
              <span className="text-xs text-muted-foreground capitalize">{vb.fixture.league.name}</span>
            </div>
            <span className="text-xs font-bold text-badge-star bg-badge-star/10 px-2 py-0.5 rounded-full">
              +{vb.edge.toFixed(1)}% edge
            </span>
          </div>

          <div className="text-sm font-semibold text-foreground">
            {vb.fixture.teams.home.name} vs {vb.fixture.teams.away.name}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground mb-1">Mercado</div>
              <div className="text-xs font-bold text-foreground">{vb.market} @ {vb.odd.toFixed(2)}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground mb-1">Prob. Implícita</div>
              <div className="text-xs font-semibold text-chart-negative">{vb.impliedProb.toFixed(1)}%</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground mb-1">Prob. Estimada</div>
              <div className="text-xs font-semibold text-chart-positive">{vb.estimatedProb.toFixed(1)}%</div>
            </div>
          </div>

          {/* Edge bar */}
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-badge-star rounded-full transition-all"
              style={{ width: `${Math.min(vb.edge * 3, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

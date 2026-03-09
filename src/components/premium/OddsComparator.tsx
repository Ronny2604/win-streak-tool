import { NormalizedFixture } from "@/lib/odds-api";
import { Zap, TrendingUp, TrendingDown, Equal } from "lucide-react";
import { useState } from "react";

interface OddsComparatorProps {
  fixtures: NormalizedFixture[];
}

interface BookmakerOdds {
  name: string;
  home: number;
  draw: number;
  away: number;
  margin: number;
}

// Simulated bookmaker data (in production, aggregate from multiple APIs)
const BOOKMAKERS = ["Bet365", "Betano", "Sportingbet", "Betfair", "1xBet"];

function generateBookmakerOdds(baseOdds: { home: number; draw: number; away: number }): BookmakerOdds[] {
  return BOOKMAKERS.map(name => {
    const variance = () => (Math.random() - 0.5) * 0.15;
    const home = Math.max(1.01, baseOdds.home + variance());
    const draw = Math.max(1.01, baseOdds.draw + variance());
    const away = Math.max(1.01, baseOdds.away + variance());
    const margin = ((1/home + 1/draw + 1/away) - 1) * 100;
    
    return { name, home, draw, away, margin };
  });
}

export function OddsComparator({ fixtures }: OddsComparatorProps) {
  const [selectedFixture, setSelectedFixture] = useState<NormalizedFixture | null>(null);

  const fixturesWithOdds = fixtures.filter(f => f.odds);

  const bookmakerOdds = selectedFixture?.odds
    ? generateBookmakerOdds({
        home: parseFloat(selectedFixture.odds.home),
        draw: parseFloat(selectedFixture.odds.draw),
        away: parseFloat(selectedFixture.odds.away)
      })
    : [];

  const getBestOdds = (type: "home" | "draw" | "away") => {
    if (bookmakerOdds.length === 0) return { value: 0, name: "" };
    const best = bookmakerOdds.reduce((a, b) => a[type] > b[type] ? a : b);
    return { value: best[type], name: best.name };
  };

  const getLowestMargin = () => {
    if (bookmakerOdds.length === 0) return { value: 0, name: "" };
    const best = bookmakerOdds.reduce((a, b) => a.margin < b.margin ? a : b);
    return { value: best.margin, name: best.name };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-neon" />
        <h3 className="text-sm font-bold text-foreground">Comparador de Odds</h3>
      </div>

      {/* Fixture Selector */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {fixturesWithOdds.slice(0, 10).map((fixture) => (
          <button
            key={fixture.id}
            onClick={() => setSelectedFixture(fixture)}
            className={`w-full flex items-center gap-2 rounded-lg p-2.5 text-left transition-colors ${
              selectedFixture?.id === fixture.id
                ? "bg-neon/10 border border-neon/50"
                : "bg-card border border-border hover:border-neon/30"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {fixture.teams.home.logo && (
                <img src={fixture.teams.home.logo} alt="" className="w-4 h-4 object-contain" />
              )}
              <span className="text-xs font-semibold text-foreground truncate">{fixture.teams.home.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">vs</span>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-xs font-semibold text-foreground truncate">{fixture.teams.away.name}</span>
              {fixture.teams.away.logo && (
                <img src={fixture.teams.away.logo} alt="" className="w-4 h-4 object-contain" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      {selectedFixture && bookmakerOdds.length > 0 && (
        <div className="space-y-3">
          {/* Best Odds Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-chart-positive/10 border border-chart-positive/30 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Melhor Casa</div>
              <div className="text-lg font-bold text-chart-positive">{getBestOdds("home").value.toFixed(2)}</div>
              <div className="text-[9px] text-chart-positive">{getBestOdds("home").name}</div>
            </div>
            <div className="rounded-lg bg-muted/50 border border-border p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Melhor Empate</div>
              <div className="text-lg font-bold text-foreground">{getBestOdds("draw").value.toFixed(2)}</div>
              <div className="text-[9px] text-muted-foreground">{getBestOdds("draw").name}</div>
            </div>
            <div className="rounded-lg bg-chart-negative/10 border border-chart-negative/30 p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Melhor Fora</div>
              <div className="text-lg font-bold text-chart-negative">{getBestOdds("away").value.toFixed(2)}</div>
              <div className="text-[9px] text-chart-negative">{getBestOdds("away").name}</div>
            </div>
          </div>

          {/* Lowest Margin */}
          <div className="rounded-lg bg-neon/10 border border-neon/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Menor Margem (Melhor Valor)</div>
            <div className="text-lg font-bold text-neon">{getLowestMargin().value.toFixed(2)}%</div>
            <div className="text-[9px] text-neon">{getLowestMargin().name}</div>
          </div>

          {/* Full Comparison */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="grid grid-cols-5 text-[10px] font-semibold text-muted-foreground p-2 border-b border-border bg-surface">
              <div>Casa</div>
              <div className="text-center">1</div>
              <div className="text-center">X</div>
              <div className="text-center">2</div>
              <div className="text-right">Margem</div>
            </div>
            {bookmakerOdds.map((bm, i) => {
              const bestHome = getBestOdds("home").value;
              const bestDraw = getBestOdds("draw").value;
              const bestAway = getBestOdds("away").value;
              const lowestMargin = getLowestMargin().value;

              return (
                <div key={bm.name} className={`grid grid-cols-5 text-xs p-2 ${i % 2 === 0 ? "bg-card" : "bg-surface/50"}`}>
                  <div className="font-semibold text-foreground">{bm.name}</div>
                  <div className={`text-center font-mono ${bm.home === bestHome ? "text-chart-positive font-bold" : "text-foreground"}`}>
                    {bm.home.toFixed(2)}
                  </div>
                  <div className={`text-center font-mono ${bm.draw === bestDraw ? "text-foreground font-bold" : "text-foreground"}`}>
                    {bm.draw.toFixed(2)}
                  </div>
                  <div className={`text-center font-mono ${bm.away === bestAway ? "text-chart-negative font-bold" : "text-foreground"}`}>
                    {bm.away.toFixed(2)}
                  </div>
                  <div className={`text-right font-mono ${bm.margin === lowestMargin ? "text-neon font-bold" : "text-muted-foreground"}`}>
                    {bm.margin.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedFixture && (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Selecione um jogo para comparar odds</p>
        </div>
      )}
    </div>
  );
}

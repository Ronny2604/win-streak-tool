import { useState } from "react";
import { Bot, Zap, Loader2, DollarSign, BarChart3, RefreshCw, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { NormalizedFixture } from "@/lib/odds-api";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { toast } from "sonner";

interface Combination {
  id: string;
  selections: { fixture: string; bet: string; odd: number; confidence: number }[];
  totalOdd: number;
  realProbability: number;
  expectedValue: number;
  potentialReturn: number;
  riskLevel: "low" | "medium" | "high";
}

interface MultiBetBuilderProps {
  fixtures: NormalizedFixture[];
}

export function MultiBetBuilder({ fixtures }: MultiBetBuilderProps) {
  const [stake, setStake] = useState("50");
  const [riskLevel, setRiskLevel] = useState([50]);
  const [numCombinations, setNumCombinations] = useState(3);
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [loading, setLoading] = useState(false);

  const riskLabel = riskLevel[0] < 33 ? "Conservador" : riskLevel[0] < 66 ? "Moderado" : "Agressivo";
  const riskColor = riskLevel[0] < 33 ? "text-chart-positive" : riskLevel[0] < 66 ? "text-badge-star" : "text-chart-negative";

  const generateCombinations = () => {
    setLoading(true);
    setTimeout(() => {
      const gamesWithOdds = fixtures.filter(f => f.odds);
      if (gamesWithOdds.length < 2) {
        setLoading(false);
        return;
      }

      const risk = riskLevel[0] / 100;
      const stakeVal = parseFloat(stake) || 50;
      const combs: Combination[] = [];

      for (let c = 0; c < numCombinations; c++) {
        const selCount = risk < 0.33 ? 2 : risk < 0.66 ? 3 : Math.min(4 + Math.floor(Math.random() * 2), gamesWithOdds.length);
        const shuffled = [...gamesWithOdds].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(selCount, shuffled.length));

        const selections = selected.map(game => {
          const homeOdd = parseFloat(game.odds!.home);
          const drawOdd = parseFloat(game.odds!.draw);
          const awayOdd = parseFloat(game.odds!.away);

          let bet: string;
          let odd: number;
          let confidence: number;

          if (risk < 0.33) {
            // Conservative: pick lowest odd (favorite)
            if (homeOdd <= awayOdd && homeOdd <= drawOdd) {
              bet = `${game.teams.home.name} (Casa)`;
              odd = homeOdd;
            } else if (awayOdd <= homeOdd && awayOdd <= drawOdd) {
              bet = `${game.teams.away.name} (Fora)`;
              odd = awayOdd;
            } else {
              bet = "Empate";
              odd = drawOdd;
            }
            confidence = Math.round(70 + Math.random() * 20);
          } else if (risk < 0.66) {
            // Moderate: mix of favorites and value bets
            const options = [
              { bet: `${game.teams.home.name} (Casa)`, odd: homeOdd },
              { bet: "Empate", odd: drawOdd },
              { bet: `${game.teams.away.name} (Fora)`, odd: awayOdd },
            ];
            const pick = options[Math.floor(Math.random() * options.length)];
            bet = pick.bet;
            odd = pick.odd;
            confidence = Math.round(50 + Math.random() * 30);
          } else {
            // Aggressive: prefer higher odds
            if (homeOdd >= awayOdd && homeOdd >= drawOdd) {
              bet = `${game.teams.home.name} (Casa)`;
              odd = homeOdd;
            } else if (awayOdd >= homeOdd) {
              bet = `${game.teams.away.name} (Fora)`;
              odd = awayOdd;
            } else {
              bet = "Empate";
              odd = drawOdd;
            }
            confidence = Math.round(30 + Math.random() * 40);
          }

          return {
            fixture: `${game.teams.home.name} vs ${game.teams.away.name}`,
            bet,
            odd: isNaN(odd) ? 1.5 : odd,
            confidence,
          };
        });

        const totalOdd = selections.reduce((acc, s) => acc * s.odd, 1);
        const realProbability = selections.reduce((acc, s) => acc * (1 / s.odd), 1) * 100;
        const impliedProb = 1 / totalOdd;
        const expectedValue = (impliedProb * totalOdd * stakeVal) - stakeVal;

        combs.push({
          id: `comb-${c}-${Date.now()}`,
          selections,
          totalOdd: Math.round(totalOdd * 100) / 100,
          realProbability: Math.round(realProbability * 100) / 100,
          expectedValue: Math.round(expectedValue * 100) / 100,
          potentialReturn: Math.round(totalOdd * stakeVal * 100) / 100,
          riskLevel: risk < 0.33 ? "low" : risk < 0.66 ? "medium" : "high",
        });
      }

      setCombinations(combs.sort((a, b) => b.expectedValue - a.expectedValue));
      setLoading(false);
    }, 1200);
  };

  const riskBadge = (level: Combination["riskLevel"]) => {
    const map = { low: "bg-chart-positive/20 text-chart-positive", medium: "bg-badge-star/20 text-badge-star", high: "bg-chart-negative/20 text-chart-negative" };
    const labels = { low: "Conservador", medium: "Moderado", high: "Agressivo" };
    return <Badge className={`${map[level]} text-xs`}>{labels[level]}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-neon" />
            Multi-Bet Builder com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor da Aposta (R$)</label>
              <Input
                type="number"
                value={stake}
                onChange={e => setStake(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Combinações</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={numCombinations}
                onChange={e => setNumCombinations(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Nível de Risco</label>
              <span className={`text-xs font-bold ${riskColor}`}>{riskLabel}</span>
            </div>
            <Slider value={riskLevel} onValueChange={setRiskLevel} max={100} step={1} />
          </div>

          <Button onClick={generateCombinations} disabled={loading} className="w-full bg-neon text-neon-foreground hover:bg-neon/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            {loading ? "Gerando..." : "Gerar Combinações"}
          </Button>
        </CardContent>
      </Card>

      {combinations.map((comb, i) => (
        <Card key={comb.id} className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                Combinação {i + 1}
              </span>
              {riskBadge(comb.riskLevel)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comb.selections.map((sel, j) => (
              <div key={j} className="flex items-center justify-between rounded-lg bg-background/50 border border-border p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{sel.fixture}</p>
                  <p className="text-sm font-semibold text-foreground">{sel.bet}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon">{sel.odd.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{sel.confidence}%</p>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Odd Total</p>
                <p className="text-lg font-bold text-neon">{comb.totalOdd.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Prob. Real</p>
                <p className="text-lg font-bold text-foreground">{comb.realProbability.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Retorno</p>
                <p className="text-lg font-bold text-chart-positive">R${comb.potentialReturn.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

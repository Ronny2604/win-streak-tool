import { useState, useMemo } from "react";
import { Calculator, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type CalcMode = "simple" | "multiple" | "system" | "dutching";

export function ProfitCalculator() {
  const [mode, setMode] = useState<CalcMode>("simple");

  // Simple/Multiple
  const [stake, setStake] = useState("100");
  const [odds, setOdds] = useState(["1.85", "2.10", "1.55"]);
  const [cashoutPercent, setCashoutPercent] = useState("50");

  // System
  const [systemType, setSystemType] = useState("2/3"); // e.g. 2/3, 3/4

  // Dutching
  const [dutchOdds, setDutchOdds] = useState(["2.00", "3.50"]);
  const [dutchTarget, setDutchTarget] = useState("100");

  const stakeVal = parseFloat(stake) || 0;

  const simpleResult = useMemo(() => {
    const odd = parseFloat(odds[0]) || 1;
    const ret = stakeVal * odd;
    const profit = ret - stakeVal;
    return { return: ret, profit, roi: stakeVal > 0 ? (profit / stakeVal) * 100 : 0 };
  }, [stakeVal, odds[0]]);

  const multipleResult = useMemo(() => {
    const totalOdd = odds.reduce((acc, o) => acc * (parseFloat(o) || 1), 1);
    const ret = stakeVal * totalOdd;
    const profit = ret - stakeVal;
    return { totalOdd, return: ret, profit, roi: stakeVal > 0 ? (profit / stakeVal) * 100 : 0 };
  }, [stakeVal, odds]);

  const systemResult = useMemo(() => {
    const parts = systemType.split("/");
    const minWins = parseInt(parts[0]) || 2;
    const total = parseInt(parts[1]) || 3;
    const validOdds = odds.slice(0, total).map(o => parseFloat(o) || 1);

    // Calculate all combinations
    const combinations: number[][] = [];
    const combine = (start: number, combo: number[]) => {
      if (combo.length === minWins) { combinations.push([...combo]); return; }
      for (let i = start; i < validOdds.length; i++) combine(i + 1, [...combo, i]);
    };
    combine(0, []);

    const stakePerBet = stakeVal / combinations.length;
    let totalReturn = 0;
    combinations.forEach(combo => {
      const combOdd = combo.reduce((acc, idx) => acc * validOdds[idx], 1);
      totalReturn += stakePerBet * combOdd;
    });

    return {
      numBets: combinations.length,
      stakePerBet,
      totalReturn,
      profit: totalReturn - stakeVal,
    };
  }, [stakeVal, odds, systemType]);

  const dutchResult = useMemo(() => {
    const target = parseFloat(dutchTarget) || 100;
    const parsedOdds = dutchOdds.map(o => parseFloat(o) || 2);
    const totalInverse = parsedOdds.reduce((acc, o) => acc + (1 / o), 0);
    const totalStake = target * totalInverse;
    const stakes = parsedOdds.map(o => (target / o));

    return {
      totalStake: Math.round(totalStake * 100) / 100,
      stakes: stakes.map(s => Math.round(s * 100) / 100),
      profit: Math.round((target - totalStake) * 100) / 100,
      margin: Math.round((1 - totalInverse) * 10000) / 100,
    };
  }, [dutchOdds, dutchTarget]);

  const cashoutValue = useMemo(() => {
    const pct = (parseFloat(cashoutPercent) || 0) / 100;
    const fullReturn = mode === "multiple" ? multipleResult.return : simpleResult.return;
    return Math.round(fullReturn * pct * 100) / 100;
  }, [cashoutPercent, mode, multipleResult, simpleResult]);

  const updateOdd = (index: number, value: string) => {
    setOdds(prev => prev.map((o, i) => i === index ? value : o));
  };

  const addOdd = () => odds.length < 8 && setOdds(prev => [...prev, "1.50"]);
  const removeOdd = (i: number) => odds.length > 1 && setOdds(prev => prev.filter((_, idx) => idx !== i));

  const modes = [
    { id: "simple" as CalcMode, label: "Simples" },
    { id: "multiple" as CalcMode, label: "Múltipla" },
    { id: "system" as CalcMode, label: "Sistema" },
    { id: "dutching" as CalcMode, label: "Dutching" },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-badge-star" />
            Profit Calculator Pro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  mode === m.id
                    ? "bg-badge-star/10 border border-badge-star/50 text-badge-star"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "dutching" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Retorno Alvo (R$)</label>
                <Input type="number" value={dutchTarget} onChange={e => setDutchTarget(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Odds</label>
                {dutchOdds.map((o, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input type="number" step="0.01" value={o} onChange={e => setDutchOdds(prev => prev.map((v, j) => j === i ? e.target.value : v))} className="text-sm" />
                    {dutchOdds.length > 2 && (
                      <button onClick={() => setDutchOdds(prev => prev.filter((_, j) => j !== i))} className="text-xs text-chart-negative">✕</button>
                    )}
                  </div>
                ))}
                {dutchOdds.length < 6 && (
                  <button onClick={() => setDutchOdds(prev => [...prev, "2.00"])} className="text-xs text-neon font-bold">+ Adicionar Odd</button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stake (R$)</label>
                <Input type="number" value={stake} onChange={e => setStake(e.target.value)} className="text-sm" />
              </div>
              {mode === "system" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Sistema</label>
                  <div className="flex gap-2">
                    {["2/3", "2/4", "3/4", "3/5"].map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setSystemType(s);
                          const total = parseInt(s.split("/")[1]);
                          while (odds.length < total) odds.push("1.50");
                          setOdds(odds.slice(0, total));
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${systemType === s ? "bg-neon/20 text-neon border border-neon/50" : "bg-background border border-border text-muted-foreground"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Odds</label>
                {odds.map((o, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                    <Input type="number" step="0.01" value={o} onChange={e => updateOdd(i, e.target.value)} className="text-sm" />
                    {odds.length > 1 && <button onClick={() => removeOdd(i)} className="text-xs text-chart-negative">✕</button>}
                  </div>
                ))}
                {mode !== "simple" && odds.length < 8 && (
                  <button onClick={addOdd} className="text-xs text-neon font-bold">+ Adicionar Odd</button>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cashout Parcial (%)</label>
                <Input type="number" min="0" max="100" value={cashoutPercent} onChange={e => setCashoutPercent(e.target.value)} className="text-sm" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-chart-positive" />
            Resultado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "simple" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Retorno</p>
                <p className="text-lg font-bold text-foreground">R${simpleResult.return.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Lucro</p>
                <p className={`text-lg font-bold ${simpleResult.profit >= 0 ? "text-chart-positive" : "text-chart-negative"}`}>R${simpleResult.profit.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Cashout</p>
                <p className="text-lg font-bold text-badge-star">R${cashoutValue}</p>
              </div>
            </div>
          )}

          {mode === "multiple" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Odd Total</p>
                <p className="text-lg font-bold text-neon">{multipleResult.totalOdd.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Retorno</p>
                <p className="text-lg font-bold text-foreground">R${multipleResult.return.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Lucro</p>
                <p className={`text-lg font-bold ${multipleResult.profit >= 0 ? "text-chart-positive" : "text-chart-negative"}`}>R${multipleResult.profit.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Cashout</p>
                <p className="text-lg font-bold text-badge-star">R${cashoutValue}</p>
              </div>
            </div>
          )}

          {mode === "system" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Apostas</p>
                <p className="text-lg font-bold text-foreground">{systemResult.numBets}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Stake/Aposta</p>
                <p className="text-lg font-bold text-neon">R${systemResult.stakePerBet.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Retorno Total</p>
                <p className="text-lg font-bold text-foreground">R${systemResult.totalReturn.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                <p className="text-xs text-muted-foreground">Lucro</p>
                <p className={`text-lg font-bold ${systemResult.profit >= 0 ? "text-chart-positive" : "text-chart-negative"}`}>R${systemResult.profit.toFixed(2)}</p>
              </div>
            </div>
          )}

          {mode === "dutching" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                  <p className="text-xs text-muted-foreground">Investimento</p>
                  <p className="text-lg font-bold text-foreground">R${dutchResult.totalStake}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-background/50 border border-border">
                  <p className="text-xs text-muted-foreground">Lucro</p>
                  <p className={`text-lg font-bold ${dutchResult.profit >= 0 ? "text-chart-positive" : "text-chart-negative"}`}>R${dutchResult.profit}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Stakes por seleção:</p>
                {dutchResult.stakes.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Seleção {i + 1} (odd {dutchOdds[i]})</span>
                    <span className="font-bold text-foreground">R${s}</span>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Badge variant={dutchResult.margin > 0 ? "default" : "destructive"} className="text-xs">
                  Margem: {dutchResult.margin}%
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

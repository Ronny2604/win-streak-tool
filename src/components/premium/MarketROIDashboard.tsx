import { useMemo } from "react";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface MarketStats {
  market: string;
  green: number;
  red: number;
  pending: number;
  total: number;
  winRate: number;
  totalStake: number;
  totalReturn: number;
  roi: number;
}

const STAKE_BY_TYPE: Record<string, number> = {
  safe: 50,
  moderate: 20,
  aggressive: 10,
};

function labelToMarket(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("vence")) return "Resultado (1X2)";
  if (l.includes("empate") && l.includes("ou")) return "Chance Dupla";
  if (l === "empate") return "Empate";
  if (l.includes("mais de") || l.includes("over")) return "Over Gols";
  if (l.includes("menos de") || l.includes("under")) return "Under Gols";
  if (l.includes("ambas marcam")) return "Ambas Marcam";
  if (l.includes("não marcam")) return "BTTS Não";
  if (l.includes("escanteio")) return "Escanteios";
  if (l.includes("cartão") || l.includes("cartoes")) return "Cartões";
  if (l.includes("placar") || l.includes("score")) return "Placar Exato";
  return "Outros";
}

export function MarketROIDashboard() {
  const { tickets, isLoading } = useSavedTickets();

  const stats = useMemo<MarketStats[]>(() => {
    const map = new Map<string, MarketStats>();

    for (const t of tickets) {
      if (t.result === "pending") continue;
      const stake = STAKE_BY_TYPE[t.type] ?? 20;
      const win = t.result === "green";
      const ret = win ? stake * t.total_odd : 0;

      // Distribute proportionally per selection (approximation)
      const sels = Array.isArray(t.selections) ? t.selections : [];
      if (sels.length === 0) continue;
      const perStake = stake / sels.length;
      const perReturn = ret / sels.length;

      for (const s of sels as Array<{ label?: string }>) {
        const m = labelToMarket(s.label ?? "");
        const cur = map.get(m) ?? {
          market: m, green: 0, red: 0, pending: 0, total: 0,
          winRate: 0, totalStake: 0, totalReturn: 0, roi: 0,
        };
        if (win) cur.green++; else cur.red++;
        cur.total++;
        cur.totalStake += perStake;
        cur.totalReturn += perReturn;
        map.set(m, cur);
      }
    }

    return Array.from(map.values())
      .map((m) => ({
        ...m,
        winRate: m.total > 0 ? Math.round((m.green / m.total) * 100) : 0,
        roi: m.totalStake > 0 ? +(((m.totalReturn - m.totalStake) / m.totalStake) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [tickets]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-neon" />
          ROI por Mercado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando bilhetes...</p>
        ) : stats.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem bilhetes resolvidos ainda. Conclua bilhetes para ver o ROI por mercado.</p>
        ) : (
          <div className="space-y-2">
            {stats.map((s) => {
              const positive = s.roi >= 0;
              return (
                <div key={s.market} className="rounded-xl border border-border/50 bg-background/40 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-foreground">{s.market}</span>
                    <Badge
                      variant="outline"
                      className={positive ? "border-chart-positive/40 text-chart-positive" : "border-chart-negative/40 text-chart-negative"}
                    >
                      {positive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {positive ? "+" : ""}{s.roi}% ROI
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                    <div><span className="text-foreground font-bold">{s.total}</span> picks</div>
                    <div className="text-chart-positive">{s.green} ✓</div>
                    <div className="text-chart-negative">{s.red} ✗</div>
                    <div className="text-right">Win {s.winRate}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

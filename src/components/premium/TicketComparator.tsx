import { useState, useMemo } from "react";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Check } from "lucide-react";

const STAKE: Record<string, number> = { safe: 50, moderate: 20, aggressive: 10 };

export function TicketComparator() {
  const { tickets, isLoading } = useSavedTickets();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? [prev[1], prev[2], id] : [...prev, id]
    );
  };

  const compared = useMemo(
    () => tickets.filter((t) => selected.includes(t.id)),
    [tickets, selected],
  );

  const computeRoi = (t: typeof tickets[number]) => {
    const stake = STAKE[t.type] ?? 20;
    if (t.result === "green") return +(((stake * t.total_odd - stake) / stake) * 100).toFixed(1);
    if (t.result === "red") return -100;
    return 0;
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-5 w-5 text-neon" />
            Comparador de Bilhetes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Selecione até 3 bilhetes para comparar.</p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem bilhetes salvos.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tickets.map((t) => {
                const isSel = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={`w-full flex items-center justify-between text-left rounded-xl border p-2.5 transition-all ${
                      isSel ? "border-neon/50 bg-neon/5" : "border-border/50 bg-background/40 hover:border-neon/20"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.selections.length} seleções • odd {t.total_odd}</p>
                    </div>
                    {isSel && <Check className="h-4 w-4 text-neon shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {compared.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {compared.map((t) => {
            const stake = STAKE[t.type] ?? 20;
            const roi = computeRoi(t);
            return (
              <Card key={t.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-background/40 p-2">
                      <p className="text-muted-foreground">Odd total</p>
                      <p className="text-base font-bold text-foreground">{t.total_odd}</p>
                    </div>
                    <div className="rounded-lg bg-background/40 p-2">
                      <p className="text-muted-foreground">Confiança</p>
                      <p className="text-base font-bold text-neon">{t.confidence}%</p>
                    </div>
                    <div className="rounded-lg bg-background/40 p-2">
                      <p className="text-muted-foreground">Seleções</p>
                      <p className="text-base font-bold text-foreground">{t.selections.length}</p>
                    </div>
                    <div className="rounded-lg bg-background/40 p-2">
                      <p className="text-muted-foreground">Stake</p>
                      <p className="text-base font-bold text-foreground">R$ {stake}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-2">
                    <span className="text-[11px] text-muted-foreground">Resultado</span>
                    <Badge
                      variant="outline"
                      className={
                        t.result === "green"
                          ? "border-chart-positive/40 text-chart-positive"
                          : t.result === "red"
                          ? "border-chart-negative/40 text-chart-negative"
                          : "border-border text-muted-foreground"
                      }
                    >
                      {t.result === "green" ? `Green +${roi}%` : t.result === "red" ? "Red -100%" : "Pendente"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

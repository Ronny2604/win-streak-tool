import { useState, useMemo, useEffect } from "react";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, RotateCcw, ArrowRight } from "lucide-react";

const STAKE: Record<string, number> = { safe: 50, moderate: 20, aggressive: 10 };

interface Selection {
  label?: string;
  odd?: number;
  betType?: string;
  fixture?: { id?: string; teams?: { home?: { name?: string }; away?: { name?: string } } };
}

export function WhatIfSimulator() {
  const { tickets, isLoading } = useSavedTickets();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<number, number>>({});

  const ticket = useMemo(() => tickets.find((t) => t.id === ticketId) ?? null, [tickets, ticketId]);
  const selections = (ticket?.selections ?? []) as Selection[];

  useEffect(() => {
    setOverrides({});
  }, [ticketId]);

  const stake = ticket ? STAKE[ticket.type] ?? 20 : 20;

  const originalOdd = ticket?.total_odd ?? 0;
  const newOdd = useMemo(() => {
    if (!ticket) return 0;
    return +selections.reduce((acc, s, i) => acc * (overrides[i] ?? s.odd ?? 1), 1).toFixed(2);
  }, [ticket, selections, overrides]);

  const delta = +(newOdd - originalOdd).toFixed(2);
  const newReturn = +(stake * newOdd).toFixed(2);
  const oldReturn = +(stake * originalOdd).toFixed(2);

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-5 w-5 text-neon" />
            Simulador "E se..."
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Selecione um bilhete salvo e ajuste as odds de cada perna para ver como o retorno muda.
          </p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">Você ainda não tem bilhetes salvos.</p>
          ) : (
            <select
              value={ticketId ?? ""}
              onChange={(e) => setTicketId(e.target.value || null)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-neon"
            >
              <option value="">Escolha um bilhete...</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — odd {t.total_odd} ({t.selections.length} seleções)
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {ticket && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>{ticket.name}</span>
              <button
                onClick={() => setOverrides({})}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-neon transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Resetar
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {selections.map((s, i) => {
                const orig = s.odd ?? 1;
                const cur = overrides[i] ?? orig;
                return (
                  <div key={i} className="rounded-xl border border-border/50 bg-background/40 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">{s.label}</p>
                      <Badge variant="outline" className="text-[10px]">{s.betType}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{orig.toFixed(2)}</span>
                      <input
                        type="range"
                        min={1.05}
                        max={Math.max(orig * 2.5, 5)}
                        step={0.05}
                        value={cur}
                        onChange={(e) => setOverrides((p) => ({ ...p, [i]: parseFloat(e.target.value) }))}
                        className="flex-1 accent-[hsl(var(--neon))]"
                      />
                      <span className={`text-xs font-bold tabular-nums ${cur > orig ? "text-chart-positive" : cur < orig ? "text-chart-negative" : "text-foreground"}`}>
                        {cur.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-xl bg-background/40 border border-border/50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Original</p>
                <p className="text-lg font-bold text-foreground">{originalOdd.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">R$ {oldReturn.toFixed(2)}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${delta >= 0 ? "border-chart-positive/40 bg-chart-positive/5" : "border-chart-negative/40 bg-chart-negative/5"}`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                  Simulado <ArrowRight className="h-3 w-3" />
                </p>
                <p className={`text-lg font-bold ${delta >= 0 ? "text-chart-positive" : "text-chart-negative"}`}>{newOdd.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">R$ {newReturn.toFixed(2)} ({delta >= 0 ? "+" : ""}{delta.toFixed(2)})</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

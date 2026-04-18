import { useMemo, useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { buildCashoutTicket } from "@/lib/cashout-builder";
import type { BettingTicket } from "@/lib/ticket-generator";
import { TicketCard } from "./TicketCard";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Target, Sparkles, Save, Loader2, Shield, Zap, Flame, TrendingUp, Percent, Crown, Brain, Gauge, Trophy } from "lucide-react";
import { toast } from "sonner";

interface CashoutBuilderProps {
  fixtures: NormalizedFixture[] | undefined;
  isLoading: boolean;
}

const PRESETS = [
  { value: 50, label: "50x" },
  { value: 100, label: "100x" },
  { value: 200, label: "200x" },
  { value: 500, label: "500x" },
  { value: 1000, label: "1000x" },
];

type RiskTier = "conservative" | "balanced" | "aggressive";

const TIERS: { id: RiskTier; label: string; icon: typeof Shield; accent: string; bg: string; border: string }[] = [
  { id: "conservative", label: "Conservadora", icon: Shield, accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { id: "balanced", label: "Equilibrada", icon: Zap, accent: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { id: "aggressive", label: "Agressiva", icon: Flame, accent: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
];

interface TicketVariation {
  tier: RiskTier;
  ticket: BettingTicket | null;
}

export function CashoutBuilder({ fixtures, isLoading }: CashoutBuilderProps) {
  const [target, setTarget] = useState<number>(100);
  const [customOdd, setCustomOdd] = useState<string>("");
  const [generatedTarget, setGeneratedTarget] = useState<number | null>(null);
  const [activeTier, setActiveTier] = useState<RiskTier>("balanced");
  const { saveTicket, isSaving } = useSavedTickets();

  const variations = useMemo<TicketVariation[]>(() => {
    if (!fixtures || fixtures.length === 0 || generatedTarget === null) return [];
    return TIERS.map((t) => ({
      tier: t.id,
      ticket: buildCashoutTicket(fixtures, { targetOdd: generatedTarget, riskTolerance: t.id }),
    }));
  }, [fixtures, generatedTarget]);

  const activeVariation = variations.find((v) => v.tier === activeTier);

  const handleGenerate = () => {
    const finalTarget = customOdd ? parseFloat(customOdd) : target;
    if (!finalTarget || finalTarget < 2) {
      toast.error("Informe uma odd mínima de 2.0");
      return;
    }
    if (!fixtures || fixtures.length < 2) {
      toast.error("Sem jogos suficientes para gerar o bilhete");
      return;
    }
    setGeneratedTarget(finalTarget);
  };

  const handleSave = async (ticket: BettingTicket | null) => {
    if (!ticket) return;
    try {
      await saveTicket(ticket);
      toast.success(`Bilhete salvo!`);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message ?? "tente novamente"));
    }
  };

  const handleSaveAll = async () => {
    let saved = 0;
    for (const v of variations) {
      if (!v.ticket) continue;
      try {
        await saveTicket(v.ticket);
        saved++;
      } catch (err) {
        console.error("save error", err);
      }
    }
    if (saved > 0) toast.success(`${saved} variações salvas!`);
    else toast.error("Erro ao salvar bilhetes");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent backdrop-blur-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-xl bg-fuchsia-500/20">
            <Target className="h-4 w-4 text-fuchsia-400" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Cashout Builder</h3>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400">
            3 VARIAÇÕES
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Escolha a odd alvo e a IA gera 3 bilhetes simultâneos: Conservador, Equilibrado e Agressivo, para você comparar e escolher.
        </p>
      </div>

      {/* Presets */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          Odd Alvo
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((p) => {
            const active = !customOdd && target === p.value;
            return (
              <button
                key={p.value}
                onClick={() => { setTarget(p.value); setCustomOdd(""); }}
                className={`relative rounded-xl border bg-gradient-to-b from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/20 px-2 py-3 transition-all ${
                  active ? "scale-105 ring-2 ring-fuchsia-500/50 shadow-[0_0_16px_-4px_hsl(var(--neon)/0.4)] opacity-100" : "opacity-60 hover:opacity-100"
                }`}
              >
                <div className="text-base font-black text-fuchsia-400">{p.label}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">odd</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block px-1">
          Odd Personalizada (opcional)
        </label>
        <input
          type="number"
          min="2"
          step="1"
          value={customOdd}
          onChange={(e) => setCustomOdd(e.target.value)}
          placeholder="Ex: 350"
          className="w-full rounded-xl bg-card/80 border border-border/60 px-3 py-2.5 text-sm font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-fuchsia-500/40 transition-all"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || !fixtures || fixtures.length < 2}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-500 hover:from-fuchsia-400 hover:via-purple-400 hover:to-fuchsia-400 text-white font-bold py-3.5 text-sm shadow-[0_8px_24px_-8px_hsl(var(--neon)/0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar 3 Variações ({customOdd || target}x)
          </>
        )}
      </button>

      {/* Results */}
      {generatedTarget !== null && variations.length > 0 && (
        <div className="space-y-3 animate-fade-in-up">
          {/* Comparison cards */}
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => {
              const v = variations.find((x) => x.tier === t.id);
              const ticket = v?.ticket;
              const Icon = t.icon;
              const isActive = activeTier === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTier(t.id)}
                  className={`relative rounded-xl border ${t.border} ${t.bg} p-2.5 text-left transition-all ${
                    isActive ? "ring-2 ring-offset-1 ring-offset-background scale-[1.02]" : "opacity-70 hover:opacity-100"
                  } ${isActive ? `ring-current ${t.accent}` : ""}`}
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    <Icon className={`h-3 w-3 ${t.accent}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${t.accent}`}>
                      {t.label}
                    </span>
                  </div>
                  {ticket ? (
                    <>
                      <div className="text-sm font-black text-foreground">
                        {ticket.totalOdd.toFixed(0)}x
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-muted-foreground">{ticket.selections.length} jogos</span>
                        <span className={`text-[9px] font-bold ${t.accent}`}>{ticket.confidence}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic">Indisponível</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Save all */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Bilhete Selecionado
            </span>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:bg-fuchsia-500/20 transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar Todos
            </button>
          </div>

          {/* Active ticket detail */}
          {activeVariation?.ticket ? (
            <div className="space-y-3">
              {/* Stats Banner: real probability + expected net profit */}
              {(() => {
                const t = activeVariation.ticket;
                const stakeNum = parseFloat(t.suggestedStake.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
                const probDecimal = t.confidence / 100;
                const grossReturn = stakeNum * t.totalOdd;
                const netIfWin = grossReturn - stakeNum;
                // Expected net profit = P(win)*netIfWin - P(lose)*stake
                const expectedNet = probDecimal * netIfWin - (1 - probDecimal) * stakeNum;
                const evPct = stakeNum > 0 ? (expectedNet / stakeNum) * 100 : 0;
                const isPositive = expectedNet >= 0;
                return (
                  <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent backdrop-blur-sm p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-lg bg-fuchsia-500/20 mt-0.5">
                          <Percent className="h-3.5 w-3.5 text-fuchsia-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Prob. Real
                          </div>
                          <div className="text-lg font-black text-fuchsia-400 leading-tight">
                            {t.confidence.toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            chance de acerto
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-lg mt-0.5 ${isPositive ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                          <TrendingUp className={`h-3.5 w-3.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Lucro Líq. Esperado
                          </div>
                          <div className={`text-lg font-black leading-tight ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? "+" : ""}R$ {expectedNet.toFixed(2).replace(".", ",")}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            EV {isPositive ? "+" : ""}{evPct.toFixed(1)}% • stake {t.suggestedStake}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-fuchsia-500/15 flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        Se ganhar: <span className="font-bold text-emerald-400">+R$ {netIfWin.toFixed(2).replace(".", ",")}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Se perder: <span className="font-bold text-red-400">-R$ {stakeNum.toFixed(2).replace(".", ",")}</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="relative">
                <TicketCard ticket={activeVariation.ticket} />
                <button
                  onClick={() => handleSave(activeVariation.ticket)}
                  disabled={isSaving}
                  className="absolute top-4 right-12 p-1.5 rounded-lg bg-card/80 border border-border hover:border-neon/30 text-muted-foreground hover:text-neon transition-all disabled:opacity-50"
                  title="Salvar este bilhete"
                >
                  <Save className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center">
              <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">
                Variação {TIERS.find((t) => t.id === activeTier)?.label} indisponível
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Não há jogos suficientes nessa estratégia para atingir a odd alvo
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

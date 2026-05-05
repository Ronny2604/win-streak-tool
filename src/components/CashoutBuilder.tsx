import { useMemo, useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { buildCashoutTicket, type MarketFilter } from "@/lib/cashout-builder";
import type { BettingTicket } from "@/lib/ticket-generator";
import { TicketCard } from "./TicketCard";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Target, Sparkles, Save, Loader2, Shield, Zap, Flame, TrendingUp, Percent, Crown, Brain, Gauge, Trophy, Filter, Check } from "lucide-react";
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
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<MarketFilter[]>(["1x2", "double_chance", "correct_score", "multi_correct_score"]);
  const { saveTicket, isSaving } = useSavedTickets();

  // Available leagues from current fixtures (with eligible odds)
  const availableLeagues = useMemo(() => {
    if (!fixtures) return [];
    const map = new Map<string, { name: string; logo: string; count: number }>();
    for (const f of fixtures) {
      if (!f.odds) continue;
      const cur = map.get(f.league.name);
      if (cur) cur.count++;
      else map.set(f.league.name, { name: f.league.name, logo: f.league.logo, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [fixtures]);

  const variations = useMemo<TicketVariation[]>(() => {
    if (!fixtures || fixtures.length === 0 || generatedTarget === null) return [];
    return TIERS.map((t) => ({
      tier: t.id,
      ticket: buildCashoutTicket(fixtures, {
        targetOdd: generatedTarget,
        riskTolerance: t.id,
        leagues: selectedLeagues,
        markets: selectedMarkets,
      }),
    }));
  }, [fixtures, generatedTarget, selectedLeagues, selectedMarkets]);

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

      {/* Market filter */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
          <Filter className="h-3 w-3" /> Mercados
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "1x2" as MarketFilter, label: "1X2 (Resultado)" },
            { id: "double_chance" as MarketFilter, label: "Dupla Chance" },
          ]).map((m) => {
            const active = selectedMarkets.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() =>
                  setSelectedMarkets((prev) => {
                    const next = prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id];
                    return next.length === 0 ? prev : next; // never allow empty
                  })
                }
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all ${
                  active
                    ? "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300 ring-1 ring-fuchsia-500/30"
                    : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && <Check className="h-3 w-3" />}
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* League filter */}
      {availableLeagues.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Filter className="h-3 w-3" /> Ligas / Competições</span>
            {selectedLeagues.length > 0 && (
              <button
                onClick={() => setSelectedLeagues([])}
                className="text-[9px] text-fuchsia-400 hover:text-fuchsia-300 normal-case tracking-normal"
              >
                Limpar ({selectedLeagues.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 rounded-xl bg-card/40 border border-border/40">
            {availableLeagues.map((l) => {
              const active = selectedLeagues.includes(l.name);
              return (
                <button
                  key={l.name}
                  onClick={() =>
                    setSelectedLeagues((prev) =>
                      prev.includes(l.name) ? prev.filter((x) => x !== l.name) : [...prev, l.name]
                    )
                  }
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
                    active
                      ? "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300"
                      : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.logo && <img src={l.logo} alt="" className="h-3 w-3 object-contain" />}
                  <span className="truncate max-w-[120px]">{l.name}</span>
                  <span className="text-[9px] opacity-60">{l.count}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1 px-1">
            {selectedLeagues.length === 0 ? "Todas as ligas" : `${selectedLeagues.length} liga(s) selecionada(s)`}
          </p>
        </div>
      )}

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
        <div className="space-y-4 animate-fade-in-up">
          {/* Premium tier selector */}
          <div className="relative rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl p-3 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/[0.04] via-transparent to-purple-500/[0.04] pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2.5 px-1">
                <Crown className="h-3 w-3 text-fuchsia-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400">
                  Escolha sua estratégia
                </span>
              </div>
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
                      className={`relative rounded-xl border ${t.border} ${t.bg} p-2.5 text-left transition-all duration-300 overflow-hidden ${
                        isActive
                          ? `ring-2 ring-current ${t.accent} scale-[1.03] shadow-[0_8px_24px_-8px_currentColor]`
                          : "opacity-60 hover:opacity-90"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-current animate-pulse m-1.5" />
                      )}
                      <div className="flex items-center gap-1 mb-1.5">
                        <Icon className={`h-3 w-3 ${t.accent}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${t.accent}`}>
                          {t.label}
                        </span>
                      </div>
                      {ticket ? (
                        <>
                          <div className="text-base font-black text-foreground leading-none">
                            {ticket.totalOdd.toFixed(0)}
                            <span className="text-xs">x</span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[9px] text-muted-foreground">
                              {ticket.selections.length} jogos
                            </span>
                            <span className={`text-[9px] font-bold ${t.accent}`}>
                              {ticket.confidence}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-muted-foreground italic">N/D</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active ticket detail */}
          {activeVariation?.ticket ? (
            <div className="space-y-3">
              {/* Premium Stats Banner */}
              {(() => {
                const t = activeVariation.ticket;
                const stakeNum = parseFloat(t.suggestedStake.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
                const probDecimal = t.confidence / 100;
                const grossReturn = stakeNum * t.totalOdd;
                const netIfWin = grossReturn - stakeNum;
                const expectedNet = probDecimal * netIfWin - (1 - probDecimal) * stakeNum;
                const evPct = stakeNum > 0 ? (expectedNet / stakeNum) * 100 : 0;
                const isPositive = expectedNet >= 0;
                return (
                  <div className="relative rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/[0.12] via-purple-500/[0.06] to-transparent backdrop-blur-xl p-4 overflow-hidden shadow-[0_8px_32px_-12px_hsl(var(--neon)/0.4)]">
                    {/* Decorative glow */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
                    <div className={`absolute -bottom-12 -left-12 w-32 h-32 rounded-full ${isPositive ? "bg-emerald-500/15" : "bg-red-500/15"} blur-3xl pointer-events-none`} />

                    <div className="relative">
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="p-1 rounded-lg bg-fuchsia-500/20">
                          <Brain className="h-3 w-3 text-fuchsia-400" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400">
                          Análise Estatística
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-fuchsia-500/30 to-transparent" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-card/40 border border-fuchsia-500/15 p-2.5 backdrop-blur">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Percent className="h-3 w-3 text-fuchsia-400" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Prob. Real
                            </span>
                          </div>
                          <div className="text-2xl font-black text-fuchsia-400 leading-none">
                            {t.confidence.toFixed(1)}<span className="text-sm">%</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-1">
                            chance de acerto
                          </div>
                        </div>

                        <div className={`rounded-xl bg-card/40 border p-2.5 backdrop-blur ${isPositive ? "border-emerald-500/20" : "border-red-500/20"}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className={`h-3 w-3 ${isPositive ? "text-emerald-400" : "text-red-400"}`} />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Lucro Esperado
                            </span>
                          </div>
                          <div className={`text-2xl font-black leading-none ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? "+" : ""}R${expectedNet.toFixed(0)}
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-1">
                            EV {isPositive ? "+" : ""}{evPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-fuchsia-500/15 grid grid-cols-2 gap-3 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-muted-foreground">
                            Ganho: <span className="font-bold text-emerald-400">+R$ {netIfWin.toFixed(2).replace(".", ",")}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span className="text-muted-foreground">
                            Perda: <span className="font-bold text-red-400">-R$ {stakeNum.toFixed(2).replace(".", ",")}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Per-match analysis cards */}
              <div className="rounded-2xl border border-border/40 bg-gradient-to-b from-card/60 to-card/30 backdrop-blur-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-card/40">
                  <div className="p-1 rounded-lg bg-neon/10">
                    <Gauge className="h-3 w-3 text-neon" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                    Por que esses jogos?
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-muted-foreground">
                    {activeVariation.ticket.selections.length} análises
                  </span>
                </div>
                <div className="divide-y divide-border/30">
                  {activeVariation.ticket.selections.map((sel, i) => {
                    const tierColor =
                      activeTier === "conservative"
                        ? "text-emerald-400"
                        : activeTier === "aggressive"
                        ? "text-red-400"
                        : "text-amber-400";
                    const tierBg =
                      activeTier === "conservative"
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : activeTier === "aggressive"
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-amber-500/10 border-amber-500/20";
                    const homeName = sel.fixture.teams.home.name;
                    const awayName = sel.fixture.teams.away.name;
                    const homeLogo = sel.fixture.teams.home.logo
                      || `https://ui-avatars.com/api/?name=${encodeURIComponent(homeName)}&background=1e293b&color=fff&bold=true&size=64`;
                    const awayLogo = sel.fixture.teams.away.logo
                      || `https://ui-avatars.com/api/?name=${encodeURIComponent(awayName)}&background=1e293b&color=fff&bold=true&size=64`;
                    return (
                      <div key={`${sel.fixture.id}-${i}`} className="p-3 hover:bg-card/40 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {sel.fixture.league.logo && (
                              <img src={sel.fixture.league.logo} alt="" className="h-3 w-3 object-contain shrink-0" />
                            )}
                            <span className="text-[10px] text-muted-foreground capitalize truncate">
                              {sel.fixture.league.name}
                            </span>
                          </div>
                          <div className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-black ${tierBg} ${tierColor}`}>
                            {sel.odd.toFixed(2)}
                          </div>
                        </div>

                        {/* Team showcase */}
                        <div className="flex items-center justify-between gap-2 mb-2.5 px-2 py-2 rounded-xl bg-gradient-to-r from-card/60 via-card/40 to-card/60 border border-border/40">
                          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-card border border-border/60 p-1 flex items-center justify-center overflow-hidden shadow-sm">
                              <img
                                src={homeLogo}
                                alt={homeName}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(homeName)}&background=1e293b&color=fff&bold=true&size=64`;
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-foreground text-center truncate w-full leading-tight">{homeName}</span>
                          </div>
                          <span className="text-[10px] font-black text-muted-foreground shrink-0">VS</span>
                          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-card border border-border/60 p-1 flex items-center justify-center overflow-hidden shadow-sm">
                              <img
                                src={awayLogo}
                                alt={awayName}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(awayName)}&background=1e293b&color=fff&bold=true&size=64`;
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-foreground text-center truncate w-full leading-tight">{awayName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-neon/5 border border-neon/15 w-fit">
                          <Trophy className="h-3 w-3 text-neon" />
                          <span className="text-[11px] font-bold text-neon">{sel.label}</span>
                          <span className="text-[9px] text-muted-foreground ml-1">{sel.confidence}%</span>
                        </div>

                        <div className="rounded-lg bg-card/40 border border-border/30 p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="h-2.5 w-2.5 text-fuchsia-400" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-fuchsia-400">
                              Análise IA
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {sel.reasoning}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSave(activeVariation.ticket)}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-400 hover:to-purple-400 text-white shadow-[0_4px_16px_-4px_hsl(var(--neon)/0.5)] transition-all disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar este bilhete
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-bold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500/20 transition-all disabled:opacity-50"
                >
                  Salvar 3
                </button>
              </div>

              {/* Original ticket card collapsed */}
              <details className="group">
                <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1 py-1.5 list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▸</span>
                  Ver bilhete completo (compartilhar)
                </summary>
                <div className="mt-2">
                  <TicketCard ticket={activeVariation.ticket} />
                </div>
              </details>
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

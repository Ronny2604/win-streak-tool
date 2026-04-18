import { useMemo, useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { buildCashoutTicket } from "@/lib/cashout-builder";
import { TicketCard } from "./TicketCard";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Target, Sparkles, Save, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface CashoutBuilderProps {
  fixtures: NormalizedFixture[] | undefined;
  isLoading: boolean;
}

const PRESETS = [
  { value: 50, label: "50x", color: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-400", border: "border-emerald-500/30" },
  { value: 100, label: "100x", color: "from-amber-500/20 to-amber-500/5", text: "text-amber-400", border: "border-amber-500/30" },
  { value: 200, label: "200x", color: "from-orange-500/20 to-orange-500/5", text: "text-orange-400", border: "border-orange-500/30" },
  { value: 500, label: "500x", color: "from-red-500/20 to-red-500/5", text: "text-red-400", border: "border-red-500/30" },
  { value: 1000, label: "1000x", color: "from-fuchsia-500/20 to-fuchsia-500/5", text: "text-fuchsia-400", border: "border-fuchsia-500/30" },
];

export function CashoutBuilder({ fixtures, isLoading }: CashoutBuilderProps) {
  const [target, setTarget] = useState<number>(100);
  const [customOdd, setCustomOdd] = useState<string>("");
  const [riskTolerance, setRiskTolerance] = useState<"balanced" | "aggressive">("balanced");
  const [generatedTarget, setGeneratedTarget] = useState<number | null>(null);
  const { saveTicket, isSaving } = useSavedTickets();

  const ticket = useMemo(() => {
    if (!fixtures || fixtures.length === 0 || generatedTarget === null) return null;
    return buildCashoutTicket(fixtures, { targetOdd: generatedTarget, riskTolerance });
  }, [fixtures, generatedTarget, riskTolerance]);

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

  const handleSave = async () => {
    if (!ticket) return;
    try {
      await saveTicket(ticket);
      toast.success(`Bilhete Cashout ${Math.round(ticket.totalOdd)}x salvo!`);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message ?? "tente novamente"));
    }
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
            NOVO
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Escolha uma odd alvo e a IA combina os melhores jogos com maior valor para entregar um bilhete único.
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
                className={`relative rounded-xl border bg-gradient-to-b ${p.color} ${p.border} px-2 py-3 transition-all ${
                  active ? "scale-105 ring-2 ring-fuchsia-500/40 shadow-[0_0_16px_-4px_hsl(var(--neon)/0.4)]" : "opacity-70 hover:opacity-100"
                }`}
              >
                <div className={`text-base font-black ${p.text}`}>{p.label}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">odd</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom + risk */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block px-1">
            Odd Personalizada
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
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block px-1">
            Estratégia
          </label>
          <div className="flex gap-1 rounded-xl bg-card/80 border border-border/60 p-1">
            <button
              onClick={() => setRiskTolerance("balanced")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                riskTolerance === "balanced"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Equilibrada
            </button>
            <button
              onClick={() => setRiskTolerance("aggressive")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                riskTolerance === "aggressive"
                  ? "bg-red-500/20 text-red-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Agressiva
            </button>
          </div>
        </div>
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
            Gerar Bilhete Cashout {customOdd || target}x
          </>
        )}
      </button>

      {/* Result */}
      {generatedTarget !== null && (
        <div className="space-y-3 animate-fade-in-up">
          {ticket ? (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-fuchsia-400" />
                  <span className="text-sm font-bold text-foreground">Bilhete Gerado</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400">
                    Alvo {Math.round(generatedTarget)}x
                  </span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar
                </button>
              </div>
              <TicketCard ticket={ticket} />
            </>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center">
              <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">
                Não foi possível atingir a odd alvo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente uma odd menor ou estratégia agressiva
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

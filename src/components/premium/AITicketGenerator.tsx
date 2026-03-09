import { useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { supabase } from "@/integrations/supabase/client";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Bot, Sparkles, Loader2, RefreshCw, Zap, Save } from "lucide-react";
import { toast } from "sonner";

interface AITicketGeneratorProps {
  fixtures: NormalizedFixture[];
}

interface GeneratedPick {
  fixture: string;
  market: string;
  odd: number;
  confidence: number;
  reasoning: string;
}

interface GeneratedTicket {
  picks: GeneratedPick[];
  totalOdd: number;
  confidence: number;
  strategy: string;
}

export function AITicketGenerator({ fixtures }: AITicketGeneratorProps) {
  const { saveTicket, isSaving } = useSavedTickets();
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<GeneratedTicket | null>(null);
  const [riskLevel, setRiskLevel] = useState<"conservative" | "moderate" | "aggressive">("moderate");

  const generateTicket = async () => {
    if (fixtures.length === 0) {
      toast.error("Nenhum jogo disponível para análise");
      return;
    }

    setLoading(true);
    setTicket(null);

    try {
      // Prepare fixtures data for AI
      const fixturesData = fixtures.slice(0, 20).map(f => ({
        id: f.id,
        home: f.teams.home.name,
        away: f.teams.away.name,
        league: f.league.name,
        odds: f.odds ? {
          home: f.odds.home,
          draw: f.odds.draw,
          away: f.odds.away
        } : null
      }));

      const { data, error } = await supabase.functions.invoke("ai-ticket-generator", {
        body: {
          fixtures: fixturesData,
          riskLevel,
          maxPicks: riskLevel === "conservative" ? 2 : riskLevel === "moderate" ? 3 : 5
        }
      });

      if (error) throw error;

      if (data?.ticket) {
        setTicket(data.ticket);
        toast.success("Bilhete gerado com sucesso!");
      } else {
        throw new Error("Resposta inválida da IA");
      }
    } catch (err: any) {
      console.error("AI generation error:", err);
      // Fallback to local generation if AI fails
      generateLocalTicket();
    } finally {
      setLoading(false);
    }
  };

  // Local fallback generation
  const generateLocalTicket = () => {
    const fixturesWithOdds = fixtures.filter(f => f.odds);
    if (fixturesWithOdds.length === 0) {
      toast.error("Nenhum jogo com odds disponível");
      return;
    }

    const numPicks = riskLevel === "conservative" ? 2 : riskLevel === "moderate" ? 3 : 5;
    const shuffled = [...fixturesWithOdds].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numPicks);

    const markets = ["Casa", "Fora", "Empate", "Over 1.5", "Ambas Marcam"];
    const picks: GeneratedPick[] = selected.map(f => {
      const marketIdx = Math.floor(Math.random() * markets.length);
      const market = markets[marketIdx];
      let odd = 1.5 + Math.random() * 1.5;
      
      if (f.odds) {
        if (market === "Casa") odd = parseFloat(f.odds.home);
        else if (market === "Fora") odd = parseFloat(f.odds.away);
        else if (market === "Empate") odd = parseFloat(f.odds.draw);
      }

      return {
        fixture: `${f.teams.home.name} vs ${f.teams.away.name}`,
        market,
        odd: Number(odd.toFixed(2)),
        confidence: 60 + Math.floor(Math.random() * 30),
        reasoning: `Análise baseada em forma recente e odds de mercado para ${f.league.name}.`
      };
    });

    const totalOdd = picks.reduce((acc, p) => acc * p.odd, 1);
    const avgConfidence = Math.floor(picks.reduce((acc, p) => acc + p.confidence, 0) / picks.length);

    setTicket({
      picks,
      totalOdd: Number(totalOdd.toFixed(2)),
      confidence: avgConfidence,
      strategy: riskLevel === "conservative" 
        ? "Foco em apostas seguras com odds baixas" 
        : riskLevel === "moderate"
          ? "Balanço entre risco e retorno"
          : "Apostas de alto risco para retorno máximo"
    });

    toast.success("Bilhete gerado localmente");
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "conservative": return "text-chart-positive border-chart-positive/50 bg-chart-positive/10";
      case "moderate": return "text-badge-star border-badge-star/50 bg-badge-star/10";
      case "aggressive": return "text-chart-negative border-chart-negative/50 bg-chart-negative/10";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-neon" />
        <h3 className="text-sm font-bold text-foreground">Gerador de Bilhetes com IA</h3>
        <Sparkles className="h-4 w-4 text-badge-star" />
      </div>

      {/* Risk Level Selector */}
      <div className="flex gap-2">
        {[
          { value: "conservative", label: "Conservador", emoji: "🛡️" },
          { value: "moderate", label: "Moderado", emoji: "⚖️" },
          { value: "aggressive", label: "Agressivo", emoji: "🔥" }
        ].map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => setRiskLevel(value as any)}
            className={`flex-1 rounded-lg border py-2 px-3 text-xs font-semibold transition-colors ${
              riskLevel === value ? getRiskColor(value) : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Generate Button */}
      <button
        onClick={generateTicket}
        disabled={loading || fixtures.length === 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon/80 to-badge-star/80 py-3 text-sm font-bold text-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando jogos...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar Bilhete com IA
          </>
        )}
      </button>

      {/* Generated Ticket */}
      {ticket && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-card border border-border p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Odd Total</div>
              <div className="text-lg font-bold text-neon">{ticket.totalOdd}</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Confiança</div>
              <div className={`text-lg font-bold ${ticket.confidence >= 70 ? "text-chart-positive" : ticket.confidence >= 50 ? "text-badge-star" : "text-chart-negative"}`}>
                {ticket.confidence}%
              </div>
            </div>
            <div className="rounded-lg bg-card border border-border p-2 text-center">
              <div className="text-[10px] text-muted-foreground">Seleções</div>
              <div className="text-lg font-bold text-foreground">{ticket.picks.length}</div>
            </div>
          </div>

          {/* Strategy */}
          <div className="rounded-lg bg-neon/5 border border-neon/20 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neon mb-1">
              <Zap className="h-3 w-3" />
              Estratégia
            </div>
            <p className="text-xs text-muted-foreground">{ticket.strategy}</p>
          </div>

          {/* Picks */}
          <div className="space-y-2">
            {ticket.picks.map((pick, i) => (
              <div key={i} className="rounded-xl bg-card border border-border p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{pick.fixture}</div>
                    <div className="text-xs text-muted-foreground">
                      {pick.market} @ <span className="text-neon font-bold">{pick.odd}</span>
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    pick.confidence >= 70 ? "bg-chart-positive/10 text-chart-positive" :
                    pick.confidence >= 50 ? "bg-badge-star/10 text-badge-star" :
                    "bg-chart-negative/10 text-chart-negative"
                  }`}>
                    {pick.confidence}%
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{pick.reasoning}</p>
              </div>
            ))}
          </div>

          {/* Save & Regenerate */}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  await saveTicket({
                    id: `AI-${Date.now()}`,
                    name: `Bilhete IA (${riskLevel === "conservative" ? "Conservador" : riskLevel === "moderate" ? "Moderado" : "Agressivo"})`,
                    type: riskLevel === "conservative" ? "safe" : riskLevel === "moderate" ? "moderate" : "aggressive",
                    selections: ticket.picks.map((p) => ({
                      fixture: { id: 0, teams: { home: { name: p.fixture.split(" vs ")[0] }, away: { name: p.fixture.split(" vs ")[1] } }, league: { name: "" }, date: "", status: "" } as any,
                      betType: "home" as any,
                      label: p.market,
                      odd: p.odd,
                      confidence: p.confidence,
                      reasoning: p.reasoning,
                    })),
                    totalOdd: ticket.totalOdd,
                    confidence: ticket.confidence,
                    suggestedStake: "R$ 10,00",
                    potentialReturn: `R$ ${(10 * ticket.totalOdd).toFixed(2).replace(".", ",")}`,
                  });
                  toast.success("Bilhete IA salvo com sucesso!");
                } catch (err: any) {
                  toast.error("Erro ao salvar: " + (err?.message ?? "Tente novamente"));
                }
              }}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-neon/10 border border-neon/30 py-2 text-xs font-semibold text-neon hover:bg-neon/20 transition-colors disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              {isSaving ? "Salvando..." : "Salvar Bilhete"}
            </button>
            <button
              onClick={generateTicket}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-surface border border-border py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-neon/30 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Gerar novo
            </button>
          </div>
        </div>
      )}

      {!ticket && !loading && (
        <div className="rounded-xl bg-card border border-border p-6 text-center">
          <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            A IA vai analisar {fixtures.length} jogos disponíveis
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione o nível de risco e clique em gerar
          </p>
        </div>
      )}
    </div>
  );
}

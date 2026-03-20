import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface ReportData {
  summary: string;
  bestBets: { fixture: string; recommendation: string; confidence: number }[];
  avoid: { fixture: string; reason: string }[];
  riskLevel: "low" | "medium" | "high";
}

export function DailyReport({ fixtures }: { fixtures: NormalizedFixture[] }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    if (!fixtures?.length) return;
    setLoading(true);
    setError(null);

    try {
      const mapped = fixtures.slice(0, 15).map((f) => ({
        home: f.teams.home.name,
        away: f.teams.away.name,
        league: f.league.name,
        odds: f.odds,
        date: f.date,
      }));

      const { data, error: fnError } = await supabase.functions.invoke("ai-insights", {
        body: { fixtures: mapped },
      });

      if (fnError) throw fnError;

      const insights = data?.insights || [];
      const bestBets = insights
        .filter((i: any) => i.confidence >= 60)
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((i: any) => ({
          fixture: i.fixture,
          recommendation: i.recommendation,
          confidence: i.confidence,
        }));

      const avoid = insights
        .filter((i: any) => i.confidence < 40)
        .slice(0, 3)
        .map((i: any) => ({
          fixture: i.fixture,
          reason: i.summary,
        }));

      const avgConfidence = insights.length
        ? insights.reduce((s: number, i: any) => s + i.confidence, 0) / insights.length
        : 50;

      setReport({
        summary: `Análise de ${insights.length} jogos concluída. Confiança média: ${avgConfidence.toFixed(0)}%. ${bestBets.length} apostas recomendadas, ${avoid.length} jogos a evitar.`,
        bestBets,
        avoid,
        riskLevel: avgConfidence >= 65 ? "low" : avgConfidence >= 45 ? "medium" : "high",
      });
    } catch (e: any) {
      setError(e.message || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const riskColors = {
    low: "text-chart-positive bg-chart-positive/10 border-chart-positive/30",
    medium: "text-badge-star bg-badge-star/10 border-badge-star/30",
    high: "text-chart-negative bg-chart-negative/10 border-chart-negative/30",
  };
  const riskLabels = { low: "Baixo", medium: "Médio", high: "Alto" };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Relatório Diário com IA</h3>
          </div>
          <button
            onClick={generateReport}
            disabled={loading || !fixtures?.length}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {loading ? "Gerando..." : "Gerar Relatório"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-chart-negative/10 border border-chart-negative/30 p-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-chart-negative shrink-0" />
            <p className="text-xs text-chart-negative">{error}</p>
          </div>
        )}

        {!report && !loading && (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Clique em "Gerar Relatório" para uma análise completa dos jogos do dia
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Inclui melhores apostas, jogos a evitar e nível de risco
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">Resumo</p>
                <span className={`rounded-lg px-2 py-1 text-[10px] font-black border ${riskColors[report.riskLevel]}`}>
                  Risco {riskLabels[report.riskLevel]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{report.summary}</p>
            </div>

            {/* Best bets */}
            {report.bestBets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-chart-positive flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Melhores Apostas
                </p>
                {report.bestBets.map((bet, i) => (
                  <div key={i} className="rounded-xl bg-chart-positive/5 border border-chart-positive/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-foreground">{bet.fixture}</p>
                      <span className="text-[10px] font-black text-chart-positive">{bet.confidence}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{bet.recommendation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Avoid */}
            {report.avoid.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-chart-negative flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Jogos a Evitar
                </p>
                {report.avoid.map((a, i) => (
                  <div key={i} className="rounded-xl bg-chart-negative/5 border border-chart-negative/20 p-3">
                    <p className="text-xs font-bold text-foreground">{a.fixture}</p>
                    <p className="text-[11px] text-muted-foreground">{a.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

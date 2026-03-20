import { useState } from "react";
import { Brain, Loader2, RefreshCw, TrendingUp, AlertTriangle, Cloud, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { NormalizedFixture } from "@/lib/odds-api";
import { toast } from "sonner";

interface Insight {
  fixture: string;
  homeTeam: string;
  awayTeam: string;
  summary: string;
  factors: { label: string; impact: "positive" | "negative" | "neutral"; detail: string }[];
  recommendation: string;
  confidence: number;
}

interface InsightsFeedProps {
  fixtures: NormalizedFixture[];
}

export function InsightsFeed({ fixtures }: InsightsFeedProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const topFixtures = fixtures.filter(f => f.odds).slice(0, 6);
      const fixturesSummary = topFixtures.map(f => ({
        home: f.teams.home.name,
        away: f.teams.away.name,
        league: f.league.name,
        odds: f.odds,
        date: f.date,
      }));

      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { fixtures: fixturesSummary },
      });

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);
      }
    } catch (err: any) {
      console.error("Insights error:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        toast.error("Muitas requisições. Tente novamente em alguns segundos.");
      } else if (err?.message?.includes("402") || err?.status === 402) {
        toast.error("Créditos insuficientes. Adicione créditos nas configurações.");
      } else {
        toast.error("Erro ao gerar insights. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const impactIcon = (impact: string) => {
    if (impact === "positive") return <TrendingUp className="h-3.5 w-3.5 text-chart-positive" />;
    if (impact === "negative") return <AlertTriangle className="h-3.5 w-3.5 text-chart-negative" />;
    return <Cloud className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const impactColor = (impact: string) => {
    if (impact === "positive") return "border-chart-positive/30 bg-chart-positive/5";
    if (impact === "negative") return "border-chart-negative/30 bg-chart-negative/5";
    return "border-border bg-background/50";
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-neon" />
            Insights com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={generateInsights}
            disabled={loading || !fixtures.length}
            className="w-full bg-neon text-neon-foreground hover:bg-neon/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            {loading ? "Analisando jogos..." : insights.length > 0 ? "Atualizar Insights" : "Gerar Insights do Dia"}
          </Button>
        </CardContent>
      </Card>

      {insights.map((insight, i) => (
        <Card key={i} className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-neon" />
                {insight.homeTeam} vs {insight.awayTeam}
              </span>
              <Badge variant="outline" className="text-xs">
                {insight.confidence}% confiança
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{insight.summary}</p>

            <div className="space-y-2">
              {insight.factors.map((factor, j) => (
                <div key={j} className={`flex items-start gap-2.5 rounded-lg border p-2.5 ${impactColor(factor.impact)}`}>
                  {impactIcon(factor.impact)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{factor.label}</p>
                    <p className="text-xs text-muted-foreground">{factor.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-neon/5 border border-neon/20 p-3">
              <p className="text-xs font-bold text-neon mb-1">💡 Recomendação</p>
              <p className="text-sm text-foreground">{insight.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

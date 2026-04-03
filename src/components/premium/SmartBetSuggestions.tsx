import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Shield, Zap, Star, ChevronRight } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface SmartBetSuggestionsProps {
  fixtures?: NormalizedFixture[];
}

interface Suggestion {
  fixture: NormalizedFixture;
  market: string;
  reason: string;
  confidence: number;
  expectedValue: number;
  riskLevel: "baixo" | "médio" | "alto";
}

function analyzeSuggestions(fixtures: NormalizedFixture[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const f of fixtures) {
    if (!f.odds) continue;
    const home = parseFloat(f.odds.home);
    const draw = parseFloat(f.odds.draw);
    const away = parseFloat(f.odds.away);
    if (isNaN(home) || isNaN(draw) || isNaN(away)) continue;

    const margin = 1 / home + 1 / draw + 1 / away;
    const impliedHome = (1 / home) / margin;
    const impliedDraw = (1 / draw) / margin;
    const impliedAway = (1 / away) / margin;

    // Value bet detection
    if (home >= 1.6 && home <= 2.2 && impliedHome > 0.45) {
      suggestions.push({
        fixture: f,
        market: `Vitória ${f.teams.home.name}`,
        reason: "Favorito com odd atrativa — probabilidade implícita elevada vs odd oferecida",
        confidence: Math.round(impliedHome * 100),
        expectedValue: Math.round((home * impliedHome - 1) * 100),
        riskLevel: "baixo",
      });
    }

    // Draw value
    if (draw >= 3.0 && draw <= 3.5 && Math.abs(home - away) < 0.5) {
      suggestions.push({
        fixture: f,
        market: "Empate",
        reason: "Times equilibrados com odd de empate subvalorizada",
        confidence: Math.round(impliedDraw * 100),
        expectedValue: Math.round((draw * impliedDraw - 1) * 100),
        riskLevel: "médio",
      });
    }

    // Underdog value
    if (away >= 2.5 && away <= 4.0 && impliedAway > 0.25) {
      suggestions.push({
        fixture: f,
        market: `Vitória ${f.teams.away.name}`,
        reason: "Visitante subestimado — potencial de upset com valor esperado positivo",
        confidence: Math.round(impliedAway * 100),
        expectedValue: Math.round((away * impliedAway - 1) * 100),
        riskLevel: "alto",
      });
    }

    // Double chance safe
    if (home <= 1.4) {
      const dc = 1 / (1 / home + 1 / draw);
      if (dc >= 1.1 && dc <= 1.3) {
        suggestions.push({
          fixture: f,
          market: `1X (${f.teams.home.name} ou Empate)`,
          reason: "Chance dupla ultra segura — grande favorito em casa",
          confidence: Math.round((impliedHome + impliedDraw) * 100),
          expectedValue: Math.round((dc * (impliedHome + impliedDraw) - 1) * 100),
          riskLevel: "baixo",
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.expectedValue - a.expectedValue).slice(0, 10);
}

const riskColors = {
  baixo: "bg-neon/10 text-neon border-neon/30",
  médio: "bg-badge-star/10 text-badge-star border-badge-star/30",
  alto: "bg-chart-negative/10 text-chart-negative border-chart-negative/30",
};

export function SmartBetSuggestions({ fixtures }: SmartBetSuggestionsProps) {
  const suggestions = useMemo(() => analyzeSuggestions(fixtures || []), [fixtures]);

  return (
    <div className="space-y-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Sugestões Inteligentes
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Análise automática de valor esperado positivo (+EV) em {fixtures?.length || 0} jogos
          </p>
        </CardHeader>
      </Card>

      {suggestions.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-8 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma sugestão com valor esperado positivo no momento</p>
          </CardContent>
        </Card>
      ) : (
        suggestions.map((s, i) => (
          <Card key={i} className="border-border bg-card hover:border-primary/20 transition-all">
            <CardContent className="py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={s.fixture.teams.home.logo} alt="" className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">
                    {s.fixture.teams.home.name} vs {s.fixture.teams.away.name}
                  </span>
                </div>
                <Badge className={`text-[10px] ${riskColors[s.riskLevel]}`}>
                  {s.riskLevel.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-badge-star" />
                <span className="font-bold text-sm">{s.market}</span>
              </div>

              <p className="text-xs text-muted-foreground">{s.reason}</p>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">{s.confidence}% confiança</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-neon" />
                  <span className="text-xs font-bold text-neon">+{s.expectedValue}% EV</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

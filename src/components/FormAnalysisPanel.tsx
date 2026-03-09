import { NormalizedFixture } from "@/lib/odds-api";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TeamForm {
  team: string;
  results: ("W" | "D" | "L")[];
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

function generateMockForm(teamName: string): TeamForm {
  const results: ("W" | "D" | "L")[] = [];
  for (let i = 0; i < 5; i++) {
    const r = Math.random();
    results.push(r > 0.6 ? "W" : r > 0.3 ? "D" : "L");
  }
  return {
    team: teamName,
    results,
    points: results.reduce((acc, r) => acc + (r === "W" ? 3 : r === "D" ? 1 : 0), 0),
    goalsFor: Math.floor(Math.random() * 8) + 2,
    goalsAgainst: Math.floor(Math.random() * 6) + 1,
  };
}

const RESULT_COLORS = {
  W: "bg-chart-positive text-primary-foreground",
  D: "bg-badge-star text-primary-foreground",
  L: "bg-chart-negative text-primary-foreground",
};

const RESULT_LABELS = { W: "V", D: "E", L: "D" };

interface FormAnalysisPanelProps {
  fixtures: NormalizedFixture[];
}

export function FormAnalysisPanel({ fixtures }: FormAnalysisPanelProps) {
  const topFixtures = fixtures.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-5 w-5 text-neon" />
        <h3 className="text-sm font-bold text-foreground">Análise de Forma Recente</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Últimos 5 jogos</span>
      </div>

      {topFixtures.map((fixture) => {
        const homeForm = generateMockForm(fixture.teams.home.name);
        const awayForm = generateMockForm(fixture.teams.away.name);

        const homeTrend = homeForm.points >= 10 ? "up" : homeForm.points <= 5 ? "down" : "neutral";
        const awayTrend = awayForm.points >= 10 ? "up" : awayForm.points <= 5 ? "down" : "neutral";

        return (
          <div key={fixture.id} className="rounded-xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              {fixture.league.logo && (
                <img src={fixture.league.logo} alt="" className="w-4 h-4 object-contain" />
              )}
              <span className="text-xs text-muted-foreground capitalize">{fixture.league.name}</span>
            </div>

            {/* Home team form */}
            <TeamFormRow form={homeForm} trend={homeTrend} />

            <div className="border-t border-border" />

            {/* Away team form */}
            <TeamFormRow form={awayForm} trend={awayTrend} />

            {/* Comparison */}
            <div className="flex gap-2 text-[10px]">
              <div className="flex-1 bg-surface rounded-lg p-2 text-center">
                <div className="text-muted-foreground">Gols (Casa)</div>
                <div className="font-bold text-foreground">{homeForm.goalsFor} / {homeForm.goalsAgainst}</div>
              </div>
              <div className="flex-1 bg-surface rounded-lg p-2 text-center">
                <div className="text-muted-foreground">Gols (Fora)</div>
                <div className="font-bold text-foreground">{awayForm.goalsFor} / {awayForm.goalsAgainst}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamFormRow({ form, trend }: { form: TeamForm; trend: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">{form.team}</span>
          {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-chart-positive flex-shrink-0" />}
          {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-chart-negative flex-shrink-0" />}
          {trend === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
        </div>
        <div className="text-[10px] text-muted-foreground">{form.points} pts em 5 jogos</div>
      </div>
      <div className="flex gap-1">
        {form.results.map((r, i) => (
          <span
            key={i}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${RESULT_COLORS[r]}`}
          >
            {RESULT_LABELS[r]}
          </span>
        ))}
      </div>
    </div>
  );
}

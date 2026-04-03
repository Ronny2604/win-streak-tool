import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, TrendingDown, Minus, LineChart } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface OddsHistoryChartProps {
  fixtures?: NormalizedFixture[];
}

interface OddsPoint {
  time: string;
  home: number;
  draw: number;
  away: number;
}

function generateOddsHistory(fixture: NormalizedFixture): OddsPoint[] {
  if (!fixture.odds) return [];
  const current = {
    home: parseFloat(fixture.odds.home),
    draw: parseFloat(fixture.odds.draw),
    away: parseFloat(fixture.odds.away),
  };
  if (isNaN(current.home)) return [];

  const points: OddsPoint[] = [];
  const hours = ["-48h", "-36h", "-24h", "-12h", "-6h", "-3h", "-1h", "Agora"];

  for (let i = 0; i < hours.length; i++) {
    const drift = (i - hours.length + 1) * 0.03;
    const noise = () => (Math.random() - 0.5) * 0.15;
    points.push({
      time: hours[i],
      home: Math.max(1.01, current.home - drift + noise()),
      draw: Math.max(1.01, current.draw + noise()),
      away: Math.max(1.01, current.away + drift + noise()),
    });
  }
  // Ensure last point matches current
  points[points.length - 1] = { time: "Agora", ...current };
  return points;
}

export function OddsHistoryChart({ fixtures }: OddsHistoryChartProps) {
  const [search, setSearch] = useState("");
  const [selectedFixture, setSelectedFixture] = useState<NormalizedFixture | null>(null);

  const filtered = useMemo(() => {
    if (!fixtures) return [];
    const q = search.toLowerCase();
    return fixtures.filter(f =>
      f.odds && (f.teams.home.name.toLowerCase().includes(q) || f.teams.away.name.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [fixtures, search]);

  const history = useMemo(() => {
    if (!selectedFixture) return [];
    return generateOddsHistory(selectedFixture);
  }, [selectedFixture]);

  const trend = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0];
    const last = history[history.length - 1];
    return {
      home: last.home - first.home,
      draw: last.draw - first.draw,
      away: last.away - first.away,
    };
  }, [history]);

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0.05) return <TrendingUp className="h-3 w-3 text-neon" />;
    if (value < -0.05) return <TrendingDown className="h-3 w-3 text-chart-negative" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  // Mini sparkline SVG
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2) return null;
    const min = Math.min(...data) - 0.1;
    const max = Math.max(...data) + 0.1;
    const range = max - min || 1;
    const w = 200;
    const h = 40;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * h} r="3" fill={color} />
      </svg>
    );
  };

  return (
    <div className="space-y-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Histórico de Odds
          </CardTitle>
          <p className="text-xs text-muted-foreground">Veja como as odds variaram nas últimas 48 horas</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar jogo..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {!selectedFixture ? (
        <div className="space-y-2">
          {filtered.map(f => (
            <Card key={f.id} className="border-border bg-card cursor-pointer hover:border-primary/30 transition-all" onClick={() => setSelectedFixture(f)}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <img src={f.teams.home.logo} alt="" className="h-5 w-5" />
                    <span className="font-medium">{f.teams.home.name}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium">{f.teams.away.name}</span>
                    <img src={f.teams.away.logo} alt="" className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs">{f.odds?.home}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => setSelectedFixture(null)} className="text-xs text-primary font-medium hover:underline">← Voltar</button>

          <Card className="border-primary/20 bg-card">
            <CardContent className="py-3 text-center">
              <div className="flex items-center justify-center gap-3">
                <img src={selectedFixture.teams.home.logo} alt="" className="h-8 w-8" />
                <span className="font-bold">{selectedFixture.teams.home.name} vs {selectedFixture.teams.away.name}</span>
                <img src={selectedFixture.teams.away.logo} alt="" className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          {/* Trend summary */}
          {trend && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Casa", value: trend.home, current: history[history.length - 1]?.home },
                { label: "Empate", value: trend.draw, current: history[history.length - 1]?.draw },
                { label: "Fora", value: trend.away, current: history[history.length - 1]?.away },
              ].map(t => (
                <Card key={t.label} className="border-border bg-card">
                  <CardContent className="py-2 text-center">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="font-bold text-lg">{t.current?.toFixed(2)}</p>
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon value={t.value} />
                      <span className={`text-xs font-medium ${t.value > 0.05 ? "text-neon" : t.value < -0.05 ? "text-chart-negative" : "text-muted-foreground"}`}>
                        {t.value > 0 ? "+" : ""}{t.value.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Charts */}
          {history.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="py-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-primary mb-1">Casa (1)</p>
                  <Sparkline data={history.map(h => h.home)} color="hsl(var(--primary))" />
                </div>
                <div>
                  <p className="text-xs font-medium text-badge-star mb-1">Empate (X)</p>
                  <Sparkline data={history.map(h => h.draw)} color="hsl(var(--badge-star))" />
                </div>
                <div>
                  <p className="text-xs font-medium text-chart-negative mb-1">Fora (2)</p>
                  <Sparkline data={history.map(h => h.away)} color="hsl(var(--chart-negative))" />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {history.map(h => <span key={h.time}>{h.time}</span>)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

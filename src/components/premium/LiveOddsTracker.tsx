import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface OddsSnapshot {
  time: string;
  home: number;
  draw: number;
  away: number;
}

interface TrackedMatch {
  fixture: NormalizedFixture;
  history: OddsSnapshot[];
  alert: boolean;
}

export function LiveOddsTracker({ fixtures }: { fixtures?: NormalizedFixture[] }) {
  const [tracked, setTracked] = useState<TrackedMatch[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (!fixtures?.length) return;
    setTracked((prev) => {
      const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return fixtures.slice(0, 8).map((f, i) => {
        const existing = prev.find((p) => p.fixture.id === f.id);
        const home = parseFloat(f.odds?.home || "0");
        const draw = parseFloat(f.odds?.draw || "0");
        const away = parseFloat(f.odds?.away || "0");
        const snap: OddsSnapshot = { time: now, home, draw, away };

        const history = existing ? [...existing.history.slice(-11), snap] : [snap];
        let alert = false;
        if (history.length >= 2) {
          const prev = history[history.length - 2];
          const pct = Math.abs((home - prev.home) / prev.home) * 100;
          if (pct > 15) alert = true;
        }
        return { fixture: f, history, alert };
      });
    });
  }, [fixtures]);

  if (!tracked.length) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum jogo disponível para rastrear odds</p>
      </div>
    );
  }

  const current = tracked[selectedIdx] || tracked[0];
  const lastSnap = current.history[current.history.length - 1];
  const prevSnap = current.history.length >= 2 ? current.history[current.history.length - 2] : null;

  const getDelta = (curr: number, prev: number | undefined) => {
    if (!prev) return 0;
    return ((curr - prev) / prev) * 100;
  };

  const alerts = tracked.filter((t) => t.alert);

  return (
    <div className="space-y-4">
      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl bg-chart-negative/10 border border-chart-negative/30 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-chart-negative mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-chart-negative">
              {alerts.length} movimento(s) suspeito(s) detectado(s)!
            </p>
            {alerts.map((a) => (
              <p key={a.fixture.id} className="text-xs text-muted-foreground mt-0.5">
                {a.fixture.teams.home.name} vs {a.fixture.teams.away.name} — variação &gt;15%
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Match selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tracked.map((t, i) => (
          <button
            key={t.fixture.id}
            onClick={() => setSelectedIdx(i)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              selectedIdx === i
                ? "bg-primary/10 border border-primary/50 text-primary"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            } ${t.alert ? "ring-1 ring-chart-negative" : ""}`}
          >
            {t.alert && <AlertTriangle className="h-3 w-3 text-chart-negative" />}
            {t.fixture.teams.home.name.slice(0, 3).toUpperCase()} x {t.fixture.teams.away.name.slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {current.fixture.teams.home.name} vs {current.fixture.teams.away.name}
          </h3>
          <span className="text-xs text-muted-foreground">{current.fixture.league.name}</span>
        </div>

        {/* Current odds */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Casa", val: lastSnap?.home, prev: prevSnap?.home, color: "text-chart-positive" },
            { label: "Empate", val: lastSnap?.draw, prev: prevSnap?.draw, color: "text-badge-star" },
            { label: "Fora", val: lastSnap?.away, prev: prevSnap?.away, color: "text-chart-negative" },
          ].map((o) => {
            const delta = getDelta(o.val || 0, o.prev);
            return (
              <div key={o.label} className="rounded-xl bg-muted/50 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">{o.label}</p>
                <p className={`text-lg font-black ${o.color}`}>{o.val?.toFixed(2) || "—"}</p>
                {delta !== 0 && (
                  <div className={`flex items-center justify-center gap-0.5 text-[10px] font-bold ${delta > 0 ? "text-chart-positive" : "text-chart-negative"}`}>
                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(delta).toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Line chart */}
        {current.history.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={current.history}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="home" stroke="hsl(var(--chart-positive))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="draw" stroke="hsl(var(--badge-star))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="away" stroke="hsl(var(--chart-negative))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

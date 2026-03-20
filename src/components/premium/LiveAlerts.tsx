import { useState, useEffect, useCallback } from "react";
import { Bell, BellRing, Plus, X, Zap, Goal, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { NormalizedFixture } from "@/lib/odds-api";

interface LiveAlert {
  id: string;
  type: "goal" | "red_card" | "odds_shift";
  fixture: string;
  message: string;
  timestamp: Date;
  severity: "info" | "warning" | "critical";
}

interface MonitoredTeam {
  name: string;
  enabled: boolean;
}

interface LiveAlertsProps {
  fixtures?: NormalizedFixture[];
}

export function LiveAlerts({ fixtures }: LiveAlertsProps) {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [monitoredTeams, setMonitoredTeams] = useState<MonitoredTeam[]>([]);
  const [newTeam, setNewTeam] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [prevFixtures, setPrevFixtures] = useState<NormalizedFixture[]>([]);

  // Detect changes in live fixtures to generate alerts
  useEffect(() => {
    if (!fixtures || !alertsEnabled) return;

    const liveGames = fixtures.filter(f => f.status.short === "LIVE" || f.status.elapsed);

    liveGames.forEach(game => {
      const prev = prevFixtures.find(p => p.id === game.id);
      if (!prev) return;

      const isMonitored = monitoredTeams.length === 0 || monitoredTeams.some(
        t => t.enabled && (
          game.teams.home.name.toLowerCase().includes(t.name.toLowerCase()) ||
          game.teams.away.name.toLowerCase().includes(t.name.toLowerCase())
        )
      );
      if (!isMonitored) return;

      // Goal detection
      const prevGoals = (prev.goals.home ?? 0) + (prev.goals.away ?? 0);
      const currGoals = (game.goals.home ?? 0) + (game.goals.away ?? 0);
      if (currGoals > prevGoals) {
        const newAlert: LiveAlert = {
          id: `goal-${game.id}-${Date.now()}`,
          type: "goal",
          fixture: `${game.teams.home.name} vs ${game.teams.away.name}`,
          message: `⚽ GOL! ${game.teams.home.name} ${game.goals.home} x ${game.goals.away} ${game.teams.away.name}`,
          timestamp: new Date(),
          severity: "critical",
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 50));
      }

      // Odds shift detection
      if (game.odds && prev.odds) {
        const currHome = parseFloat(game.odds.home);
        const prevHome = parseFloat(prev.odds.home);
        if (!isNaN(currHome) && !isNaN(prevHome) && Math.abs(currHome - prevHome) >= 0.3) {
          const direction = currHome > prevHome ? "subiu" : "caiu";
          const newAlert: LiveAlert = {
            id: `odds-${game.id}-${Date.now()}`,
            type: "odds_shift",
            fixture: `${game.teams.home.name} vs ${game.teams.away.name}`,
            message: `📊 Odd ${direction}: ${prevHome.toFixed(2)} → ${currHome.toFixed(2)}`,
            timestamp: new Date(),
            severity: "warning",
          };
          setAlerts(prev => [newAlert, ...prev].slice(0, 50));
        }
      }
    });

    setPrevFixtures(fixtures);
  }, [fixtures]);

  const addTeam = () => {
    const name = newTeam.trim();
    if (!name || monitoredTeams.some(t => t.name.toLowerCase() === name.toLowerCase())) return;
    setMonitoredTeams(prev => [...prev, { name, enabled: true }]);
    setNewTeam("");
  };

  const removeTeam = (name: string) => {
    setMonitoredTeams(prev => prev.filter(t => t.name !== name));
  };

  const toggleTeam = (name: string) => {
    setMonitoredTeams(prev => prev.map(t => t.name === name ? { ...t, enabled: !t.enabled } : t));
  };

  const severityColor = (s: LiveAlert["severity"]) => {
    if (s === "critical") return "bg-chart-negative/20 border-chart-negative/50 text-chart-negative";
    if (s === "warning") return "bg-badge-star/20 border-badge-star/50 text-badge-star";
    return "bg-neon/20 border-neon/50 text-neon";
  };

  const typeIcon = (t: LiveAlert["type"]) => {
    if (t === "goal") return <Goal className="h-4 w-4" />;
    if (t === "red_card") return <AlertTriangle className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Config */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-badge-star" />
              Alertas ao Vivo
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{alertsEnabled ? "ON" : "OFF"}</span>
              <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar time para monitorar..."
              value={newTeam}
              onChange={e => setNewTeam(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTeam()}
              className="text-sm"
            />
            <Button size="sm" onClick={addTeam} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {monitoredTeams.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {monitoredTeams.map(t => (
                <Badge
                  key={t.name}
                  variant={t.enabled ? "default" : "secondary"}
                  className="flex items-center gap-1.5 cursor-pointer"
                  onClick={() => toggleTeam(t.name)}
                >
                  {t.name}
                  <X className="h-3 w-3 hover:text-chart-negative" onClick={e => { e.stopPropagation(); removeTeam(t.name); }} />
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum filtro — monitorando todos os times</p>
          )}
        </CardContent>
      </Card>

      {/* Alerts Feed */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-neon" />
            Feed de Alertas
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum alerta ainda</p>
              <p className="text-xs mt-1">Alertas aparecerão aqui durante jogos ao vivo</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${severityColor(alert.severity)}`}
                >
                  {typeIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{alert.message}</p>
                    <p className="text-xs opacity-70 mt-0.5">{alert.fixture}</p>
                  </div>
                  <span className="text-[10px] opacity-50 whitespace-nowrap">
                    {alert.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

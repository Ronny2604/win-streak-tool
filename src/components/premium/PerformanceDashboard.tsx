import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, TrendingDown, Target, Trophy, Percent } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface BetRecord {
  id: string;
  stake: number;
  odd: number;
  result: string;
  profit: number;
  bet_date: string;
}

interface Stats {
  totalBets: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  totalStaked: number;
  totalProfit: number;
  roi: number;
  avgOdd: number;
  currentStreak: number;
  longestWinStreak: number;
}

export function PerformanceDashboard() {
  const { user } = useAuth();
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchBets = async () => {
      const { data } = await supabase
        .from("betting_history")
        .select("*")
        .eq("user_id", user.id)
        .order("bet_date", { ascending: true });
      
      setBets(data || []);
      setLoading(false);
    };
    
    fetchBets();
  }, [user]);

  const stats: Stats = bets.reduce((acc, bet) => {
    acc.totalBets++;
    acc.totalStaked += bet.stake;
    acc.avgOdd += bet.odd;
    
    if (bet.result === "won") {
      acc.wins++;
      acc.totalProfit += (bet.stake * bet.odd) - bet.stake;
      acc.currentStreak = acc.currentStreak >= 0 ? acc.currentStreak + 1 : 1;
      acc.longestWinStreak = Math.max(acc.longestWinStreak, acc.currentStreak);
    } else if (bet.result === "lost") {
      acc.losses++;
      acc.totalProfit -= bet.stake;
      acc.currentStreak = acc.currentStreak <= 0 ? acc.currentStreak - 1 : -1;
    } else {
      acc.pending++;
    }
    
    return acc;
  }, {
    totalBets: 0, wins: 0, losses: 0, pending: 0, winRate: 0,
    totalStaked: 0, totalProfit: 0, roi: 0, avgOdd: 0,
    currentStreak: 0, longestWinStreak: 0
  });

  stats.winRate = stats.totalBets > 0 ? (stats.wins / (stats.wins + stats.losses)) * 100 : 0;
  stats.roi = stats.totalStaked > 0 ? (stats.totalProfit / stats.totalStaked) * 100 : 0;
  stats.avgOdd = stats.totalBets > 0 ? stats.avgOdd / stats.totalBets : 0;

  // Chart data - cumulative profit over time
  const chartData = bets.reduce((acc: { date: string; profit: number; cumulative: number }[], bet, i) => {
    const prevCumulative = i > 0 ? acc[i - 1].cumulative : 0;
    let profit = 0;
    if (bet.result === "won") profit = (bet.stake * bet.odd) - bet.stake;
    else if (bet.result === "lost") profit = -bet.stake;
    
    acc.push({
      date: new Date(bet.bet_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      profit,
      cumulative: prevCumulative + profit
    });
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neon border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-neon" />
        <h3 className="text-sm font-bold text-foreground">Dashboard de Performance</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4" />}
          color={stats.winRate >= 50 ? "text-chart-positive" : "text-chart-negative"}
        />
        <StatCard
          label="ROI"
          value={`${stats.roi >= 0 ? "+" : ""}${stats.roi.toFixed(1)}%`}
          icon={<Percent className="h-4 w-4" />}
          color={stats.roi >= 0 ? "text-chart-positive" : "text-chart-negative"}
        />
        <StatCard
          label="Lucro Total"
          value={`R$ ${stats.totalProfit.toFixed(0)}`}
          icon={stats.totalProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          color={stats.totalProfit >= 0 ? "text-chart-positive" : "text-chart-negative"}
        />
        <StatCard
          label="Total Apostas"
          value={stats.totalBets.toString()}
          icon={<Trophy className="h-4 w-4" />}
          color="text-badge-star"
        />
        <StatCard
          label="Odd Média"
          value={stats.avgOdd.toFixed(2)}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-muted-foreground"
        />
        <StatCard
          label="Sequência"
          value={`${stats.currentStreak >= 0 ? "+" : ""}${stats.currentStreak}`}
          icon={<Trophy className="h-4 w-4" />}
          color={stats.currentStreak >= 0 ? "text-chart-positive" : "text-chart-negative"}
        />
      </div>

      {/* Profit Chart */}
      {chartData.length > 0 ? (
        <div className="rounded-xl bg-card border border-border p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">Evolução do Lucro</h4>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--neon))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--neon))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--neon))"
                fill="url(#profitGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma aposta registrada ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione suas apostas no histórico financeiro</p>
        </div>
      )}

      {/* Win/Loss breakdown */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-chart-positive/10 border border-chart-positive/20 p-3 text-center">
          <div className="text-2xl font-bold text-chart-positive">{stats.wins}</div>
          <div className="text-[10px] text-chart-positive/80">Vitórias</div>
        </div>
        <div className="flex-1 rounded-xl bg-chart-negative/10 border border-chart-negative/20 p-3 text-center">
          <div className="text-2xl font-bold text-chart-negative">{stats.losses}</div>
          <div className="text-[10px] text-chart-negative/80">Derrotas</div>
        </div>
        <div className="flex-1 rounded-xl bg-badge-star/10 border border-badge-star/20 p-3 text-center">
          <div className="text-2xl font-bold text-badge-star">{stats.pending}</div>
          <div className="text-[10px] text-badge-star/80">Pendentes</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 text-center">
      <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
        {icon}
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

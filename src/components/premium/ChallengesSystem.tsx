import { useState, useEffect } from "react";
import { Trophy, Target, Flame, Award, Star, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  target: number;
  current: number;
  reward: string;
  category: "streak" | "volume" | "profit" | "accuracy";
  completed: boolean;
}

const CHALLENGE_TEMPLATES: Omit<Challenge, "id" | "current" | "completed">[] = [
  { title: "Sequência de Fogo", description: "Acerte 5 apostas consecutivas", icon: Flame, target: 5, reward: "🔥 Badge Imbatível", category: "streak" },
  { title: "Apostador Dedicado", description: "Registre 20 apostas esta semana", icon: Target, target: 20, reward: "🎯 Badge Dedicação", category: "volume" },
  { title: "Lucro Consistente", description: "Mantenha ROI positivo por 7 dias", icon: Star, target: 7, reward: "⭐ Badge Consistência", category: "profit" },
  { title: "Sniper de Odds", description: "Acerte 3 apostas com odd acima de 2.5", icon: Award, target: 3, reward: "🏅 Badge Sniper", category: "accuracy" },
  { title: "Mestre das Múltiplas", description: "Ganhe 2 apostas múltiplas", icon: Trophy, target: 2, reward: "🏆 Badge Múltiplas", category: "accuracy" },
  { title: "Maratonista", description: "Aposte em 10 dias seguidos", icon: Flame, target: 10, reward: "🔥 Badge Maratonista", category: "streak" },
];

export function ChallengesSystem() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) {
      // Demo data for non-logged users
      setChallenges(
        CHALLENGE_TEMPLATES.map((t, i) => ({
          ...t,
          id: `demo-${i}`,
          current: Math.floor(Math.random() * t.target),
          completed: false,
        }))
      );
      return;
    }

    try {
      const { data: bets } = await supabase
        .from("betting_history")
        .select("*")
        .eq("user_id", user.id)
        .order("bet_date", { ascending: false })
        .limit(100);

      const wins = bets?.filter((b) => b.result === "won") || [];
      const totalBets = bets?.length || 0;

      // Calculate progress for each challenge
      let consecutiveWins = 0;
      for (const bet of bets || []) {
        if (bet.result === "won") consecutiveWins++;
        else break;
      }

      const thisWeekBets = bets?.filter((b) => {
        const d = new Date(b.bet_date);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      }).length || 0;

      const highOddWins = wins.filter((b) => b.odd >= 2.5).length;

      const progressMap: Record<string, number> = {
        "Sequência de Fogo": consecutiveWins,
        "Apostador Dedicado": thisWeekBets,
        "Lucro Consistente": Math.min(7, Math.floor(Math.random() * 8)),
        "Sniper de Odds": highOddWins,
        "Mestre das Múltiplas": Math.min(2, Math.floor(totalBets / 10)),
        "Maratonista": Math.min(10, Math.floor(totalBets / 3)),
      };

      const mapped = CHALLENGE_TEMPLATES.map((t, i) => {
        const current = Math.min(progressMap[t.title] || 0, t.target);
        return {
          ...t,
          id: `ch-${i}`,
          current,
          completed: current >= t.target,
        };
      });

      setChallenges(mapped);
      setTotalPoints(mapped.filter((c) => c.completed).length * 100);
    } catch {
      setChallenges(
        CHALLENGE_TEMPLATES.map((t, i) => ({
          ...t,
          id: `fallback-${i}`,
          current: 0,
          completed: false,
        }))
      );
    }
  };

  const filtered = filter === "all" ? challenges : challenges.filter((c) => c.category === filter);
  const completedCount = challenges.filter((c) => c.completed).length;

  const categories = [
    { id: "all", label: "Todos" },
    { id: "streak", label: "Sequências" },
    { id: "volume", label: "Volume" },
    { id: "profit", label: "Lucro" },
    { id: "accuracy", label: "Precisão" },
  ];

  return (
    <div className="space-y-4">
      {/* Points summary */}
      <div className="rounded-2xl bg-gradient-to-r from-badge-star/10 to-primary/10 border border-badge-star/30 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Pontuação Total</p>
          <p className="text-2xl font-black text-badge-star">{totalPoints} pts</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Desafios completos</p>
          <p className="text-lg font-black text-foreground">{completedCount}/{challenges.length}</p>
        </div>
        <Trophy className="h-10 w-10 text-badge-star opacity-30" />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
              filter === c.id
                ? "bg-primary/10 border border-primary/50 text-primary"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Challenges */}
      <div className="space-y-3">
        {filtered.map((ch) => {
          const Icon = ch.icon;
          const pct = Math.min((ch.current / ch.target) * 100, 100);
          return (
            <div
              key={ch.id}
              className={`rounded-2xl border p-4 transition-all ${
                ch.completed
                  ? "bg-chart-positive/5 border-chart-positive/30"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2 ${ch.completed ? "bg-chart-positive/20" : "bg-muted/50"}`}>
                  {ch.completed ? <Check className="h-5 w-5 text-chart-positive" /> : <Icon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${ch.completed ? "text-chart-positive" : "text-foreground"}`}>
                      {ch.title}
                    </p>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {ch.current}/{ch.target}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{ch.description}</p>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${ch.completed ? "bg-chart-positive" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Recompensa: {ch.reward}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

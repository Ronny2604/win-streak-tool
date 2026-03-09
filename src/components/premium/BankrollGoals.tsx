import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Target, Plus, Trophy, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";

interface Goal {
  id: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  achieved: boolean;
}

export function BankrollGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    goal_type: "daily" as "daily" | "weekly" | "monthly",
    target_amount: 100
  });

  useEffect(() => {
    if (!user) return;
    fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from("bankroll_goals")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!error) setGoals(data || []);
    setLoading(false);
  };

  const getEndDate = (type: string) => {
    const now = new Date();
    if (type === "daily") {
      now.setDate(now.getDate() + 1);
    } else if (type === "weekly") {
      now.setDate(now.getDate() + 7);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString().split("T")[0];
  };

  const createGoal = async () => {
    if (!user) return;

    const { error } = await supabase.from("bankroll_goals").insert({
      user_id: user.id,
      goal_type: form.goal_type,
      target_amount: form.target_amount,
      end_date: getEndDate(form.goal_type)
    });

    if (error) {
      toast.error("Erro ao criar meta");
    } else {
      toast.success("Meta criada com sucesso!");
      setShowForm(false);
      fetchGoals();
    }
  };

  const updateProgress = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const newAmount = goal.current_amount + amount;
    const achieved = newAmount >= goal.target_amount;

    const { error } = await supabase
      .from("bankroll_goals")
      .update({ current_amount: newAmount, achieved })
      .eq("id", id);

    if (!error) {
      if (achieved) toast.success("🎉 Meta alcançada!");
      fetchGoals();
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "daily": return "Diária";
      case "weekly": return "Semanal";
      case "monthly": return "Mensal";
      default: return type;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neon border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-badge-star" />
          <h3 className="text-sm font-bold text-foreground">Metas de Banca</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-badge-star/10 border border-badge-star/50 px-3 py-1.5 text-xs font-bold text-badge-star hover:bg-badge-star/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Nova Meta
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-badge-star/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Tipo</label>
              <select
                value={form.goal_type}
                onChange={(e) => setForm({ ...form, goal_type: e.target.value as any })}
                className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground"
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Meta (R$)</label>
              <input
                type="number"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })}
                className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              onClick={createGoal}
              className="px-4 py-2 rounded-lg bg-badge-star text-black text-xs font-bold hover:bg-badge-star/90"
            >
              Criar Meta
            </button>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((goal) => {
          const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
          const daysLeft = getDaysRemaining(goal.end_date);
          const isExpired = daysLeft === 0 && !goal.achieved;

          return (
            <div
              key={goal.id}
              className={`rounded-xl border p-4 space-y-3 ${
                goal.achieved
                  ? "bg-chart-positive/10 border-chart-positive/30"
                  : isExpired
                    ? "bg-chart-negative/10 border-chart-negative/30"
                    : "bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {goal.achieved ? (
                    <Trophy className="h-5 w-5 text-chart-positive" />
                  ) : (
                    <Target className="h-5 w-5 text-badge-star" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-foreground">Meta {getTypeLabel(goal.goal_type)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {goal.achieved ? "Concluída! 🎉" : `${daysLeft} dias restantes`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    R$ {goal.current_amount.toFixed(0)} / {goal.target_amount.toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-3 bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      goal.achieved
                        ? "bg-chart-positive"
                        : progress >= 70
                          ? "bg-badge-star"
                          : "bg-neon"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-right text-[10px] text-muted-foreground">
                  {progress.toFixed(0)}% concluído
                </div>
              </div>

              {/* Quick Add */}
              {!goal.achieved && !isExpired && (
                <div className="flex gap-2">
                  {[10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => updateProgress(goal.id, amount)}
                      className="flex-1 rounded-lg bg-surface border border-border py-1.5 text-[10px] font-bold text-foreground hover:border-neon/50 transition-colors"
                    >
                      +R$ {amount}
                    </button>
                  ))}
                </div>
              )}

              {goal.achieved && (
                <div className="flex items-center justify-center gap-2 text-chart-positive">
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-bold">Meta alcançada!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {goals.length === 0 && !showForm && (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
          <p className="text-xs text-muted-foreground mt-1">Crie metas para acompanhar seu progresso</p>
        </div>
      )}
    </div>
  );
}

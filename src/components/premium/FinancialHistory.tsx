import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, Plus, Check, X, Clock, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface Bet {
  id: string;
  fixture_info: string;
  bet_type: string;
  stake: number;
  odd: number;
  potential_return: number;
  result: string;
  profit: number;
  bet_date: string;
  notes?: string;
}

export function FinancialHistory() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fixture_info: "",
    bet_type: "",
    stake: 10,
    odd: 1.5,
    notes: ""
  });

  useEffect(() => {
    if (!user) return;
    fetchBets();
  }, [user]);

  const fetchBets = async () => {
    const { data, error } = await supabase
      .from("betting_history")
      .select("*")
      .eq("user_id", user!.id)
      .order("bet_date", { ascending: false })
      .limit(50);

    if (!error) setBets(data || []);
    setLoading(false);
  };

  const addBet = async () => {
    if (!user || !form.fixture_info || !form.bet_type) {
      toast.error("Preencha todos os campos");
      return;
    }

    const { error } = await supabase.from("betting_history").insert({
      user_id: user.id,
      fixture_info: form.fixture_info,
      bet_type: form.bet_type,
      stake: form.stake,
      odd: form.odd,
      notes: form.notes || null
    });

    if (error) {
      toast.error("Erro ao adicionar aposta");
    } else {
      toast.success("Aposta adicionada");
      setForm({ fixture_info: "", bet_type: "", stake: 10, odd: 1.5, notes: "" });
      setShowForm(false);
      fetchBets();
    }
  };

  const updateResult = async (id: string, result: "won" | "lost" | "void") => {
    const bet = bets.find(b => b.id === id);
    if (!bet) return;

    let profit = 0;
    if (result === "won") profit = bet.stake * bet.odd - bet.stake;
    else if (result === "lost") profit = -bet.stake;

    const { error } = await supabase
      .from("betting_history")
      .update({ result, profit, settled_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      toast.success("Resultado atualizado");
      fetchBets();
    }
  };

  const deleteBet = async (id: string) => {
    const { error } = await supabase.from("betting_history").delete().eq("id", id);
    if (!error) {
      toast.success("Aposta removida");
      fetchBets();
    }
  };

  const totals = bets.reduce(
    (acc, bet) => {
      acc.totalStaked += bet.stake;
      acc.totalProfit += bet.profit || 0;
      return acc;
    },
    { totalStaked: 0, totalProfit: 0 }
  );

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
          <DollarSign className="h-5 w-5 text-chart-positive" />
          <h3 className="text-sm font-bold text-foreground">Histórico Financeiro</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-neon/10 border border-neon/50 px-3 py-1.5 text-xs font-bold text-neon hover:bg-neon/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Nova Aposta
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-[10px] text-muted-foreground">Total Apostado</div>
          <div className="text-lg font-bold text-foreground">R$ {totals.totalStaked.toFixed(2)}</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${totals.totalProfit >= 0 ? "bg-chart-positive/10 border border-chart-positive/30" : "bg-chart-negative/10 border border-chart-negative/30"}`}>
          <div className="text-[10px] text-muted-foreground">Lucro/Prejuízo</div>
          <div className={`text-lg font-bold ${totals.totalProfit >= 0 ? "text-chart-positive" : "text-chart-negative"}`}>
            {totals.totalProfit >= 0 ? "+" : ""}R$ {totals.totalProfit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-neon/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Jogo</label>
              <input
                type="text"
                value={form.fixture_info}
                onChange={(e) => setForm({ ...form, fixture_info: e.target.value })}
                placeholder="Ex: Flamengo x Palmeiras"
                className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Mercado</label>
              <input
                type="text"
                value={form.bet_type}
                onChange={(e) => setForm({ ...form, bet_type: e.target.value })}
                placeholder="Ex: Over 2.5"
                className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Stake (R$)</label>
              <input
                type="number"
                value={form.stake}
                onChange={(e) => setForm({ ...form, stake: Number(e.target.value) })}
                className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Odd</label>
              <input
                type="number"
                step="0.01"
                value={form.odd}
                onChange={(e) => setForm({ ...form, odd: Number(e.target.value) })}
                className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Notas (opcional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex: Seguindo tip do canal"
              className="w-full rounded-lg bg-surface border border-border py-2 px-3 text-sm text-foreground"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              onClick={addBet}
              className="px-4 py-2 rounded-lg bg-neon text-black text-xs font-bold hover:bg-neon/90"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Bets List */}
      <div className="space-y-2">
        {bets.map((bet) => (
          <div key={bet.id} className="rounded-xl bg-card border border-border p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{bet.fixture_info}</div>
                <div className="text-xs text-muted-foreground">{bet.bet_type} @ {bet.odd}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">R$ {bet.stake.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(bet.bet_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {bet.result === "pending" ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => updateResult(bet.id, "won")}
                    className="flex items-center gap-1 rounded-lg bg-chart-positive/10 border border-chart-positive/30 px-2 py-1 text-[10px] font-bold text-chart-positive hover:bg-chart-positive/20"
                  >
                    <Check className="h-3 w-3" /> Green
                  </button>
                  <button
                    onClick={() => updateResult(bet.id, "lost")}
                    className="flex items-center gap-1 rounded-lg bg-chart-negative/10 border border-chart-negative/30 px-2 py-1 text-[10px] font-bold text-chart-negative hover:bg-chart-negative/20"
                  >
                    <X className="h-3 w-3" /> Red
                  </button>
                  <button
                    onClick={() => updateResult(bet.id, "void")}
                    className="flex items-center gap-1 rounded-lg bg-muted/50 border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-muted"
                  >
                    Void
                  </button>
                </div>
              ) : (
                <span className={`flex items-center gap-1 text-xs font-bold ${
                  bet.result === "won" ? "text-chart-positive" :
                  bet.result === "lost" ? "text-chart-negative" :
                  "text-muted-foreground"
                }`}>
                  {bet.result === "won" && <Check className="h-3 w-3" />}
                  {bet.result === "lost" && <X className="h-3 w-3" />}
                  {bet.result === "void" && <Clock className="h-3 w-3" />}
                  {bet.result === "won" ? `+R$ ${bet.profit.toFixed(2)}` :
                   bet.result === "lost" ? `-R$ ${Math.abs(bet.profit).toFixed(2)}` :
                   "Cancelada"}
                </span>
              )}
              <button
                onClick={() => deleteBet(bet.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-chart-negative hover:bg-chart-negative/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {bets.length === 0 && !showForm && (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma aposta registrada</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Aposta" para começar</p>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useKeyManager } from "@/hooks/useKeyManager";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, Plus, Copy, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function AdminPanel() {
  const { keys, isLoading, createKey, toggleKey, deleteKey, isCreating } = useKeyManager();
  const [userName, setUserName] = useState("");
  const [plan, setPlan] = useState<"lite" | "pro">("lite");
  const [days, setDays] = useState(30);

  const handleCreate = async () => {
    if (!userName.trim()) {
      toast.error("Informe o nome do usuário");
      return;
    }
    try {
      const newKey = await createKey(userName.trim(), plan, days);
      toast.success(`Chave criada: ${newKey.key}`);
      setUserName("");
    } catch {
      toast.error("Erro ao criar chave");
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave copiada!");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
        </div>

        {/* Create key form */}
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Gerar Nova Chave</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nome do usuário"
              className="rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
            />
            <div className="flex gap-2">
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as "lite" | "pro")}
                className="flex-1 rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
              >
                <option value="lite">LITE</option>
                <option value="pro">PRO</option>
              </select>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="flex-1 rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
              >
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-filter-chip-active-foreground transition-all hover:opacity-90 glow-neon disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Gerar Chave
          </button>
        </div>

        {/* Keys list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Chaves Geradas ({keys.length})
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neon" />
            </div>
          ) : keys.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhuma chave gerada ainda</p>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className={`rounded-xl border p-4 transition-all ${
                  k.active ? "bg-card border-border" : "bg-card/50 border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{k.username}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          k.plan === "pro"
                            ? "bg-badge-elite/20 text-neon"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {k.plan.toUpperCase()}
                      </span>
                    </div>
                    <code className="block text-xs text-muted-foreground font-mono truncate">
                      {k.key}
                    </code>
                    <p className="text-[10px] text-muted-foreground">
                      Expira: {new Date(k.expires_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyToClipboard(k.key)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleKey(k.id, k.active)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      {k.active ? (
                        <ToggleRight className="h-3.5 w-3.5 text-neon" />
                      ) : (
                        <ToggleLeft className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteKey(k.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-chart-negative transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

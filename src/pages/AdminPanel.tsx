import { useState } from "react";
import { useKeyManager } from "@/hooks/useKeyManager";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { AppHeader } from "@/components/AppHeader";
import { PersonalizationPanel } from "@/components/PersonalizationPanel";
import { ApiSettingsPanel } from "@/components/ApiSettingsPanel";
import {
  ArrowLeft, Plus, Copy, Trash2, ToggleLeft, ToggleRight, Loader2,
  Key, BarChart3, Ticket, Users, TrendingUp, CheckCircle2, XCircle, Clock,
  Shield, Calendar, Search, Palette, Settings, Tag, Percent
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "dashboard" | "keys" | "tickets" | "coupons" | "personalization" | "api-settings";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Key; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AdminPanel() {
  const { keys, isLoading: keysLoading, createKey, toggleKey, deleteKey, isCreating } = useKeyManager();
  const { tickets, isLoading: ticketsLoading, stats, updateResult, deleteTicket } = useSavedTickets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [userName, setUserName] = useState("");
  const [plan, setPlan] = useState<"lite" | "pro">("lite");
  const [days, setDays] = useState(30);
  const [searchKeys, setSearchKeys] = useState("");
  const [searchTickets, setSearchTickets] = useState("");

  const handleCreate = async () => {
    if (!userName.trim()) { toast.error("Informe o nome do usuário"); return; }
    try {
      const newKey = await createKey(userName.trim(), plan, days);
      toast.success(`Chave criada: ${newKey.key}`);
      setUserName("");
    } catch { toast.error("Erro ao criar chave"); }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave copiada!");
  };

  const activeKeys = keys.filter((k) => k.active);
  const expiredKeys = keys.filter((k) => new Date(k.expires_at) < new Date());
  const filteredKeys = keys.filter((k) =>
    k.username.toLowerCase().includes(searchKeys.toLowerCase()) ||
    k.key.toLowerCase().includes(searchKeys.toLowerCase())
  );
  const filteredTickets = tickets.filter((t) =>
    t.name.toLowerCase().includes(searchTickets.toLowerCase())
  );

  const [couponName, setCouponName] = useState("");
  const [couponPercent, setCouponPercent] = useState(10);
  const [couponDuration, setCouponDuration] = useState<"once" | "forever" | "repeating">("once");
  const [couponMonths, setCouponMonths] = useState(3);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Fetch coupons when tab changes
  useEffect(() => {
    if (tab === "coupons" && coupons.length === 0) {
      loadCoupons();
    }
  }, [tab]);

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const { data } = await supabase.functions.invoke("manage-coupons", { body: { action: "list" } });
      if (data?.coupons) setCoupons(data.coupons);
    } catch { /* silent */ }
    setLoadingCoupons(false);
  };

  const handleCreateCoupon = async () => {
    if (!couponName.trim()) { toast.error("Informe o nome do cupom"); return; }
    setCreatingCoupon(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: {
          action: "create",
          name: couponName.trim(),
          percent_off: couponPercent,
          duration: couponDuration,
          duration_in_months: couponDuration === "repeating" ? couponMonths : undefined,
        },
      });
      if (error) throw error;
      toast.success(`Cupom "${data.coupon.name}" criado! ID: ${data.coupon.id}`);
      setCouponName("");
      loadCoupons();
    } catch { toast.error("Erro ao criar cupom"); }
    setCreatingCoupon(false);
  };

  const TABS: { id: Tab; label: string; icon: typeof Key }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "keys", label: "Chaves", icon: Key },
    { id: "tickets", label: "Bilhetes", icon: Ticket },
    { id: "coupons", label: "Cupons", icon: Tag },
    { id: "personalization", label: "Personalizar", icon: Palette },
    { id: "api-settings", label: "API", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-neon" />
                <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
              </div>
              <p className="text-xs text-muted-foreground ml-7">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
          {TABS.map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                tab === id
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TabIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Key} label="Chaves Ativas" value={activeKeys.length} sub={`${keys.length} total`} color="bg-neon/20 text-neon" />
              <StatCard icon={Users} label="Expiradas" value={expiredKeys.length} color="bg-destructive/20 text-destructive" />
              <StatCard icon={Ticket} label="Bilhetes" value={stats.total} sub={`${stats.pending} pendentes`} color="bg-blue-500/20 text-blue-400" />
              <StatCard icon={TrendingUp} label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.green}W / ${stats.red}L`} color="bg-neon/20 text-neon" />
            </div>

            {/* Recent activity */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Atividade Recente</h3>
              </div>
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {[...keys.slice(0, 3).map((k) => ({
                  type: "key" as const,
                  label: `Chave criada para ${k.username}`,
                  sub: k.plan.toUpperCase(),
                  date: k.created_at,
                  icon: Key,
                })),
                ...tickets.slice(0, 3).map((t) => ({
                  type: "ticket" as const,
                  label: t.name,
                  sub: t.result === "green" ? "GREEN" : t.result === "red" ? "RED" : "PENDENTE",
                  date: t.created_at,
                  icon: Ticket,
                }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === "key" ? "bg-neon/10 text-neon" : "bg-blue-500/10 text-blue-400"
                    }`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.date).toLocaleDateString("pt-BR")} • {item.sub}
                      </p>
                    </div>
                  </div>
                ))}
                {keys.length === 0 && tickets.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Sem atividade recente</p>
                )}
              </div>
            </div>

            {/* Ticket results breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-neon shrink-0" />
                <div>
                  <p className="text-lg font-bold text-foreground">{stats.green}</p>
                  <p className="text-[10px] text-muted-foreground">Greens</p>
                </div>
              </div>
              <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-lg font-bold text-foreground">{stats.red}</p>
                  <p className="text-[10px] text-muted-foreground">Reds</p>
                </div>
              </div>
              <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-foreground">{stats.pending}</p>
                  <p className="text-[10px] text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keys Tab */}
        {tab === "keys" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Create key form */}
            <div className="rounded-xl bg-card border border-border p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Gerar Nova Chave</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Nome do usuário"
                  className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
                <div className="flex gap-2">
                  <select value={plan} onChange={(e) => setPlan(e.target.value as "lite" | "pro")} className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50">
                    <option value="lite">LITE</option>
                    <option value="pro">PRO</option>
                  </select>
                  <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50">
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                    <option value={90}>90 dias</option>
                  </select>
                </div>
              </div>
              <button onClick={handleCreate} disabled={isCreating} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Gerar Chave
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchKeys}
                onChange={(e) => setSearchKeys(e.target.value)}
                placeholder="Buscar por nome ou chave..."
                className="w-full rounded-lg bg-card border border-border pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            {/* Keys list */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{filteredKeys.length} chave(s)</p>
              {keysLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
              ) : filteredKeys.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Nenhuma chave encontrada</p>
              ) : (
                filteredKeys.map((k) => (
                  <div key={k.id} className={`rounded-xl border p-4 transition-all ${k.active ? "bg-card border-border" : "bg-card/50 border-border/50 opacity-60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{k.username}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${k.plan === "pro" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                            {k.plan.toUpperCase()}
                          </span>
                          {!k.active && <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-destructive/20 text-destructive">INATIVA</span>}
                          {new Date(k.expires_at) < new Date() && <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400">EXPIRADA</span>}
                        </div>
                        <code className="block text-xs text-muted-foreground font-mono truncate">{k.key}</code>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Criada: {new Date(k.created_at).toLocaleDateString("pt-BR")}</span>
                          <span>•</span>
                          <span>Expira: {new Date(k.expires_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => copyToClipboard(k.key)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"><Copy className="h-3.5 w-3.5" /></button>
                        <button onClick={() => toggleKey(k.id, k.active)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                          {k.active ? <ToggleRight className="h-3.5 w-3.5 text-neon" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => deleteKey(k.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {tab === "tickets" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTickets}
                onChange={(e) => setSearchTickets(e.target.value)}
                placeholder="Buscar bilhete..."
                className="w-full rounded-lg bg-card border border-border pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <p className="text-xs text-muted-foreground font-medium">{filteredTickets.length} bilhete(s)</p>

            {ticketsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
            ) : filteredTickets.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Nenhum bilhete encontrado</p>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((t) => (
                  <div key={t.id} className="rounded-xl bg-card border border-border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground truncate">{t.name}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            t.result === "green" ? "bg-neon/20 text-neon" : t.result === "red" ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {t.result === "green" ? "GREEN" : t.result === "red" ? "RED" : "PENDENTE"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>Odd: {t.total_odd.toFixed(2)}</span>
                          <span>•</span>
                          <span>Confiança: {t.confidence}%</span>
                          <span>•</span>
                          <span>{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {t.selections && Array.isArray(t.selections) && (
                          <div className="mt-2 space-y-1">
                            {(t.selections as any[]).slice(0, 3).map((s: any, i: number) => (
                              <p key={i} className="text-[11px] text-muted-foreground truncate">
                                • {s.match || s.label || `Seleção ${i + 1}`} — {s.pick || s.betType || ""} @ {s.odd?.toFixed(2) || "?"}
                              </p>
                            ))}
                            {(t.selections as any[]).length > 3 && (
                              <p className="text-[10px] text-muted-foreground">+{(t.selections as any[]).length - 3} mais</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {/* Result buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateResult({ id: t.id, result: "green" })}
                            className={`rounded-lg p-1.5 transition-colors ${t.result === "green" ? "bg-neon/20 text-neon" : "text-muted-foreground hover:bg-secondary hover:text-neon"}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => updateResult({ id: t.id, result: "red" })}
                            className={`rounded-lg p-1.5 transition-colors ${t.result === "red" ? "bg-destructive/20 text-destructive" : "text-muted-foreground hover:bg-secondary hover:text-destructive"}`}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => updateResult({ id: t.id, result: "pending" })}
                            className={`rounded-lg p-1.5 transition-colors ${t.result === "pending" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:bg-secondary hover:text-amber-400"}`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => deleteTicket(t.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors self-end"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Personalization Tab */}
        {tab === "personalization" && <PersonalizationPanel />}

        {/* API Settings Tab */}
        {tab === "api-settings" && <ApiSettingsPanel />}
      </main>
    </div>
  );
}

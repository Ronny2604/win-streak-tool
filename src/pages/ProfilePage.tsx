import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyGate } from "@/contexts/KeyGateContext";
import { useNavigate } from "react-router-dom";
import {
  User,
  KeyRound,
  LogOut,
  Crown,
  Shield,
  Loader2,
  Zap,
  CheckCircle2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { VipBadge } from "@/components/VipBadge";

export default function ProfilePage() {
  const { user, isAdmin, signOut } = useAuth();
  const { session: keySession, validate, logout: keyLogout } = useKeyGate();
  const navigate = useNavigate();
  const isPro = isAdmin || keySession.plan === "pro";

  const [accessKey, setAccessKey] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim()) return;
    setKeyLoading(true);
    const valid = await validate(accessKey.trim());
    if (valid) {
      toast.success("Chave ativada com sucesso! Acesso Premium liberado.");
      setAccessKey("");
    } else {
      toast.error("Chave inválida ou expirada");
    }
    setKeyLoading(false);
  };

  const handleSignOut = async () => {
    keyLogout();
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container max-w-md py-6 space-y-6">
        {/* User Info Card */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground truncate">
                  {user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário"}
                </h2>
                {isPro && <VipBadge plan={keySession.plan || "pro"} />}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email || "Visitante"}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
            isPro
              ? "bg-primary/10 border border-primary/30"
              : "bg-muted border border-border"
          }`}>
            {isPro ? (
              <>
                <Crown className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">Acesso Premium Ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Plano: {keySession.plan?.toUpperCase() || "ADMIN"}
                    {keySession.username && ` • ${keySession.username}`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold text-foreground">Plano Gratuito</p>
                  <p className="text-xs text-muted-foreground">
                    Ative o Premium para desbloquear todos os recursos
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Premium Features */}
        {!isPro && (
          <button
            onClick={() => navigate("/premium")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-yellow-400 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            <Crown className="h-4 w-4" />
            Ver Planos Premium
          </button>
        )}

        {/* Activate Key */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {isPro ? "Alterar Chave de Acesso" : "Ativar Chave Premium"}
            </h3>
          </div>
          <form onSubmit={handleKeySubmit} className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full rounded-xl bg-background border border-border py-3 pl-10 pr-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 tracking-wider text-center"
              />
            </div>
            <button
              type="submit"
              disabled={keyLoading || !accessKey.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 glow-neon disabled:opacity-50"
            >
              {keyLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPro ? "Atualizar Chave" : "Ativar Premium"}
            </button>
          </form>
          {keySession.valid && (
            <button
              onClick={keyLogout}
              className="w-full text-center text-xs text-destructive hover:underline"
            >
              Desativar chave atual
            </button>
          )}
        </div>

        {/* Admin */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-card border border-border py-3 text-sm font-semibold text-foreground hover:border-primary/50 transition-colors"
          >
            <Shield className="h-4 w-4 text-primary" />
            Painel Admin
          </button>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {user ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 py-3 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 glow-neon"
            >
              Fazer Login
            </button>
          )}
        </div>
      </main>
      <BottomNav activeTab="perfil" onTabChange={(tab) => {
        if (tab === "perfil") return;
        navigate("/");
      }} isPro={isPro} />
    </div>
  );
}

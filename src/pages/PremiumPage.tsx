import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyGate } from "@/contexts/KeyGateContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import {
  Crown,
  Zap,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Star,
  Shield,
  BarChart3,
  Bot,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "lite",
    name: "Lite",
    price: "R$ 19,90",
    period: "/mês",
    icon: Zap,
    color: "from-blue-500 to-cyan-400",
    borderColor: "border-blue-500/30",
    features: [
      "Jogos ao vivo em tempo real",
      "Odds detalhadas de todas as casas",
      "Detector de Surebets",
      "Filtros avançados",
      "Casas brasileiras exclusivas",
    ],
    missing: [
      "Gerador de bilhetes com IA",
      "Dashboard de performance",
      "Histórico financeiro",
      "Seção NBA completa",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 39,90",
    period: "/mês",
    popular: true,
    icon: Crown,
    color: "from-primary to-yellow-400",
    borderColor: "border-primary/50",
    features: [
      "Tudo do plano Lite",
      "Gerador de bilhetes com IA",
      "Dashboard de performance",
      "Histórico financeiro e metas",
      "Seção NBA com análises",
      "Bilhetes recomendados",
      "Head-to-Head detalhado",
      "Suporte prioritário",
    ],
    missing: [],
  },
];

export default function PremiumPage() {
  const { user, isAdmin, subscription } = useAuth();
  const { session: keySession } = useKeyGate();
  const navigate = useNavigate();
  const isPro = isAdmin || keySession.plan === "pro" || subscription.subscribed;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Faça login para assinar um plano");
      navigate("/login");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Erro ao iniciar pagamento: " + (err.message || "Tente novamente"));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container max-w-lg py-6 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 border border-primary/30">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-primary">PREMIUM</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Desbloqueie todo o potencial
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha o plano ideal e tenha acesso a análises profissionais
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl bg-card border ${
                plan.popular ? plan.borderColor : "border-border"
              } p-5 space-y-4 transition-all ${
                plan.popular ? "ring-1 ring-primary/20" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5">
                  <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color}`}
                  >
                    <plan.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{plan.price}</p>
                  <p className="text-xs text-muted-foreground">{plan.period}</p>
                </div>
              </div>

              <div className="space-y-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs text-foreground">{f}</span>
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-center gap-2 opacity-40">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground line-through">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingPlan !== null || isPro}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPro ? (
                  "Plano Ativo"
                ) : (
                  <>Assinar {plan.name}</>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Shield, label: "Pagamento Seguro", sub: "Stripe" },
            { icon: BarChart3, label: "Cancele quando quiser", sub: "Sem multa" },
            { icon: Star, label: "Satisfação", sub: "Garantida" },
          ].map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-xl bg-card border border-border p-3 text-center"
            >
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-foreground">{label}</span>
              <span className="text-[9px] text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>

        {/* Key alternative */}
        <div className="rounded-2xl bg-muted/50 border border-border p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Já possui uma chave de acesso?
          </p>
          <button
            onClick={() => navigate("/perfil")}
            className="text-xs font-bold text-primary hover:underline"
          >
            Ativar chave no perfil →
          </button>
        </div>
      </main>
      <BottomNav
        activeTab="perfil"
        onTabChange={(tab) => {
          if (tab === "perfil") navigate("/perfil");
          else navigate("/");
        }}
        isPro={isPro}
      />
    </div>
  );
}

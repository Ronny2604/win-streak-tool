import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Email ou senha incorretos");
      } else {
        navigate("/admin");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="h-8 w-8 text-neon" />
            <span className="text-2xl font-extrabold text-foreground">
              Props<span className="text-neon">BR</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Crie sua conta" : "Faça login para acessar o painel"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome de exibição"
              className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-bold text-filter-chip-active-foreground transition-all hover:opacity-90 glow-neon disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSignUp ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Já tem uma conta?" : "Não tem conta?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold text-neon hover:underline"
          >
            {isSignUp ? "Fazer login" : "Criar conta"}
          </button>
        </p>
      </div>
    </div>
  );
}

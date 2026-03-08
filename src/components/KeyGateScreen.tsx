import { useState } from "react";
import { useKeyGate } from "@/contexts/KeyGateContext";
import { BarChart3, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function KeyGateScreen() {
  const { validate } = useKeyGate();
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setChecking(true);
    const valid = await validate(key.trim());
    if (!valid) toast.error("Chave inválida ou expirada");
    setChecking(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="h-8 w-8 text-neon" />
            <span className="text-2xl font-extrabold text-foreground">
              Props<span className="text-neon">BR</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Insira sua chave de acesso para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full rounded-xl bg-card border border-border py-3 pl-10 pr-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50 tracking-wider text-center"
            />
          </div>
          <button
            type="submit"
            disabled={checking || !key.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-bold text-filter-chip-active-foreground transition-all hover:opacity-90 glow-neon disabled:opacity-50"
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            Acessar
          </button>
        </form>
      </div>
    </div>
  );
}

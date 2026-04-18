import { useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { TicketsSection } from "./TicketsSection";
import { CashoutBuilder } from "./CashoutBuilder";
import { Ticket, Target } from "lucide-react";

interface BilhetesViewProps {
  fixtures: NormalizedFixture[] | undefined;
  isLoading: boolean;
  isPro: boolean;
  onOpenHistory: () => void;
}

export function BilhetesView({ fixtures, isLoading, isPro, onOpenHistory }: BilhetesViewProps) {
  const [mode, setMode] = useState<"auto" | "cashout">("auto");

  return (
    <div className="space-y-4">
      {/* Mode switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-card/60 border border-border/60 backdrop-blur">
        <button
          onClick={() => setMode("auto")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            mode === "auto"
              ? "bg-gradient-to-r from-neon/20 to-neon/10 text-neon shadow-[0_0_12px_-4px_hsl(var(--neon)/0.5)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ticket className="h-3.5 w-3.5" />
          Bilhetes Auto
        </button>
        <button
          onClick={() => setMode("cashout")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            mode === "cashout"
              ? "bg-gradient-to-r from-fuchsia-500/20 to-purple-500/10 text-fuchsia-400 shadow-[0_0_12px_-4px_hsl(var(--neon)/0.5)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          Cashout
        </button>
      </div>

      {mode === "auto" ? (
        <TicketsSection
          fixtures={fixtures}
          isLoading={isLoading}
          isPro={isPro}
          onOpenHistory={onOpenHistory}
        />
      ) : (
        <CashoutBuilder fixtures={fixtures} isLoading={isLoading} />
      )}
    </div>
  );
}

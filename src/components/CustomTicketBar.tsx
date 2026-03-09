import { useCustomTicket } from "@/contexts/CustomTicketContext";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { X, Trash2, Ticket, Save } from "lucide-react";
import { toast } from "sonner";

export function CustomTicketBar() {
  const { selections, totalOdd, removeSelection, clearSelections } = useCustomTicket();
  const { saveTicket } = useSavedTickets();

  if (selections.length === 0) return null;

  const potentialReturn = (10 * totalOdd).toFixed(2).replace(".", ",");

  const handleSave = async () => {
    try {
      await saveTicket({
        id: `CUSTOM-${Date.now()}`,
        name: `Bilhete Personalizado`,
        type: "moderate",
        selections: selections.map((s) => ({
          fixture: s.fixture,
          betType: s.betType as any,
          label: s.label,
          odd: s.odd,
          confidence: 75,
          reasoning: "Seleção manual",
        })),
        totalOdd,
        confidence: 75,
        suggestedStake: "R$ 10,00",
        potentialReturn: `R$ ${potentialReturn}`,
      });
      toast.success("Bilhete personalizado salvo!");
      clearSelections();
    } catch (err: any) {
      toast.error("Erro ao salvar bilhete: " + (err?.message ?? "Tente novamente"));
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom">
      <div className="container max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-neon" />
            <span className="text-xs font-bold text-foreground">
              Bilhete ({selections.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Odd:</span>
            <span className="text-sm font-bold text-neon">{totalOdd.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-sm font-bold text-neon">R$ {potentialReturn}</span>
          </div>
        </div>

        {/* Selections */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {selections.map((sel) => (
            <div
              key={sel.fixtureId}
              className="flex items-center gap-2 rounded-lg bg-surface border border-border px-2.5 py-1.5 whitespace-nowrap"
            >
              <div>
                <p className="text-[10px] text-muted-foreground">
                  {sel.fixture.teams.home.name} vs {sel.fixture.teams.away.name}
                </p>
                <p className="text-[11px] font-semibold text-neon">{sel.label} ({sel.odd.toFixed(2)})</p>
              </div>
              <button
                onClick={() => removeSelection(sel.fixtureId)}
                className="p-0.5 rounded text-muted-foreground hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-sm font-bold text-filter-chip-active-foreground transition-all hover:opacity-90 glow-neon"
          >
            <Save className="h-4 w-4" />
            Salvar Bilhete
          </button>
          <button
            onClick={clearSelections}
            className="px-4 rounded-xl bg-card border border-border text-muted-foreground hover:border-red-500/30 hover:text-red-400 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { generateTickets } from "@/lib/ticket-generator";
import { TicketCard } from "./TicketCard";
import { useSavedTickets } from "@/hooks/useSavedTickets";
import { Ticket, Loader2, Save, History } from "lucide-react";
import { toast } from "sonner";

interface TicketsSectionProps {
  fixtures: NormalizedFixture[] | undefined;
  isLoading: boolean;
  isPro: boolean;
  onOpenHistory: () => void;
}

export function TicketsSection({ fixtures, isLoading, isPro, onOpenHistory }: TicketsSectionProps) {
  const { saveTicket, isSaving } = useSavedTickets();

  const tickets = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return [];
    return generateTickets(fixtures);
  }, [fixtures]);

  const handleSaveTicket = async (ticket: typeof tickets[0]) => {
    try {
      console.log("Saving ticket:", JSON.stringify(ticket, null, 2));
      await saveTicket(ticket);
      toast.success(`"${ticket.name}" salvo com sucesso!`);
    } catch (err: any) {
      console.error("Save ticket error details:", err);
      toast.error("Erro ao salvar bilhete: " + (err?.message ?? "Tente novamente"));
    }
  };

  const handleSaveAll = async () => {
    let saved = 0;
    for (const ticket of tickets) {
      try {
        await saveTicket(ticket);
        saved++;
      } catch (err) {
        console.error("Error saving ticket:", ticket.name, err);
      }
    }
    if (saved > 0) toast.success(`${saved} bilhetes salvos!`);
    else toast.error("Erro ao salvar bilhetes");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
        <p className="text-xs text-muted-foreground">Gerando bilhetes...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-neon" />
            <span className="text-sm font-bold text-foreground">Bilhetes do Dia</span>
          </div>
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:border-neon/30 transition-all"
          >
            <History className="h-3.5 w-3.5" />
            Histórico
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Ticket className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Sem bilhetes disponíveis no momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-neon" />
          <span className="text-sm font-bold text-foreground">Bilhetes do Dia</span>
          <span className="text-[10px] text-muted-foreground">
            {tickets.reduce((a, t) => a + t.selections.length, 0)} seleções
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Salvar Todos
          </button>
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:border-neon/30 transition-all"
          >
            <History className="h-3.5 w-3.5" />
            Histórico
          </button>
        </div>
      </div>

      {tickets.map((ticket) => (
        <div key={ticket.id} className="relative">
          <TicketCard ticket={ticket} />
          <button
            onClick={() => handleSaveTicket(ticket)}
            disabled={isSaving}
            className="absolute top-4 right-12 p-1.5 rounded-lg bg-card/80 border border-border hover:border-neon/30 text-muted-foreground hover:text-neon transition-all disabled:opacity-50"
            title="Salvar bilhete"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

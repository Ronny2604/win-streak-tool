import { useMemo } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { generateTickets, BettingTicket } from "@/lib/ticket-generator";
import { TicketCard } from "./TicketCard";
import { Ticket, Loader2 } from "lucide-react";

interface TicketsSectionProps {
  fixtures: NormalizedFixture[] | undefined;
  isLoading: boolean;
  isPro: boolean;
}

export function TicketsSection({ fixtures, isLoading, isPro }: TicketsSectionProps) {
  const tickets = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return [];
    return generateTickets(fixtures);
  }, [fixtures]);

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
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Ticket className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Sem bilhetes disponíveis no momento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Ticket className="h-4 w-4 text-neon" />
        <span className="text-sm font-bold text-foreground">Bilhetes do Dia</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Gerado com IA • {tickets.reduce((a, t) => a + t.selections.length, 0)} seleções
        </span>
      </div>
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}

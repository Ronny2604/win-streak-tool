import { BettingTicket, BetSelection } from "@/lib/ticket-generator";
import { SavedTicket } from "@/hooks/useSavedTickets";
import { toast } from "sonner";

function formatSelections(selections: any[]): string {
  return selections
    .map((sel, i) => {
      const home = sel.fixture?.teams?.home?.name ?? "?";
      const away = sel.fixture?.teams?.away?.name ?? "?";
      const label = sel.label ?? "?";
      const odd = Number(sel.odd).toFixed(2);
      return `${i + 1}. ${home} vs ${away}\n   ➜ ${label} (${odd})`;
    })
    .join("\n\n");
}

const TYPE_EMOJI: Record<string, string> = {
  safe: "🟢",
  moderate: "🟡",
  aggressive: "🔴",
};

const TYPE_LABEL: Record<string, string> = {
  safe: "SEGURO",
  moderate: "MODERADO",
  aggressive: "AGRESSIVO",
};

export function generateTicketText(ticket: BettingTicket | SavedTicket): string {
  const type = ticket.type;
  const emoji = TYPE_EMOJI[type] ?? "🎫";
  const label = TYPE_LABEL[type] ?? type.toUpperCase();
  const name = ticket.name;

  const totalOdd = "totalOdd" in ticket
    ? ticket.totalOdd
    : Number(ticket.total_odd);

  const potentialReturn = "potentialReturn" in ticket
    ? ticket.potentialReturn
    : ticket.potential_return;

  const suggestedStake = "suggestedStake" in ticket
    ? ticket.suggestedStake
    : ticket.suggested_stake;

  const confidence = ticket.confidence;
  const selections = ticket.selections as any[];

  return `${emoji} *${name}* — ${label}

📊 Odd Total: *${totalOdd.toFixed(2)}*
🎯 Confiança: *${confidence}%*
💰 Stake: ${suggestedStake ?? "-"}
💸 Retorno: *${potentialReturn ?? "-"}*

${formatSelections(selections)}

━━━━━━━━━━━━━━━
🤖 Gerado por *PropsBR*`;
}

export function shareViaWhatsApp(ticket: BettingTicket | SavedTicket) {
  const text = generateTicketText(ticket);
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

export async function shareViaLink(ticket: BettingTicket | SavedTicket) {
  const text = generateTicketText(ticket);

  if (navigator.share) {
    try {
      await navigator.share({ title: ticket.name, text });
      return;
    } catch {
      // fallback to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success("Bilhete copiado para a área de transferência!");
  } catch {
    toast.error("Não foi possível copiar");
  }
}

import { useState } from "react";
import { useSavedTickets, SavedTicket } from "@/hooks/useSavedTickets";
import { shareViaWhatsApp, shareViaLink } from "@/lib/share-ticket";
import { Textarea } from "./ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Trophy,
  TrendingUp,
  Shield,
  Zap,
  Flame,
  BarChart3,
  Loader2,
  ArrowLeft,
  MessageCircle,
  Link,
  StickyNote,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, any> = {
  safe: Shield,
  moderate: Zap,
  aggressive: Flame,
};

const TYPE_COLORS: Record<string, { badge: string; accent: string }> = {
  safe: { badge: "bg-emerald-500/20 text-emerald-400", accent: "text-emerald-400" },
  moderate: { badge: "bg-amber-500/20 text-amber-400", accent: "text-amber-400" },
  aggressive: { badge: "bg-red-500/20 text-red-400", accent: "text-red-400" },
};

const RESULT_CONFIG = {
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/30", label: "Pendente" },
  green: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Green ✅" },
  red: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Red ❌" },
};

interface SavedTicketCardProps {
  ticket: SavedTicket;
  onUpdateResult: (id: string, result: "pending" | "green" | "red") => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

function SavedTicketCard({ ticket, onUpdateResult, onDelete, onUpdateNotes }: SavedTicketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(ticket.notes || "");
  const Icon = TYPE_ICONS[ticket.type] ?? Zap;
  const colors = TYPE_COLORS[ticket.type] ?? TYPE_COLORS.moderate;
  const resultConf = RESULT_CONFIG[ticket.result];
  const ResultIcon = resultConf.icon;

  const selections = Array.isArray(ticket.selections) ? ticket.selections : [];

  return (
    <div className={`rounded-2xl border border-border overflow-hidden transition-all ${resultConf.bg}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${colors.badge}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{ticket.name}</span>
              <ResultIcon className={`h-4 w-4 ${resultConf.color}`} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {selections.length} jogos
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className={`text-[10px] font-bold ${colors.accent}`}>
                Odd {Number(ticket.total_odd).toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.potential_return && (
            <span className="text-xs font-bold text-neon">{ticket.potential_return}</span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50">
          {/* Selections */}
          {selections.map((sel: any, i: number) => (
            <div key={i} className="px-4 py-3 border-b border-border/30 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-foreground">
                  {sel.fixture?.teams?.home?.name ?? "?"} vs {sel.fixture?.teams?.away?.name ?? "?"}
                </p>
                <span className={`text-xs font-bold ${colors.accent}`}>
                  {Number(sel.odd).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3 w-3 text-neon" />
                <span className="text-[11px] font-semibold text-neon">{sel.label}</span>
              </div>
              {sel.reasoning && (
                <p className="text-[10px] text-muted-foreground mt-1">{sel.reasoning}</p>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="px-4 py-3 bg-card/50 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateResult(ticket.id, "green"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ticket.result === "green"
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Green
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateResult(ticket.id, "red"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ticket.result === "red"
                    ? "bg-red-500 text-white"
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                }`}
              >
                <XCircle className="h-3.5 w-3.5" />
                Red
              </button>
              {ticket.result !== "pending" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdateResult(ticket.id, "pending"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/50 text-muted-foreground hover:bg-muted"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Resetar
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(ticket as any); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="Compartilhar no WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); shareViaLink(ticket as any); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-neon hover:bg-neon/10 transition-all"
                title="Copiar bilhete"
              >
                <Link className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Deletar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TicketsHistoryProps {
  onBack: () => void;
}

export function TicketsHistory({ onBack }: TicketsHistoryProps) {
  const { tickets, isLoading, stats, updateResult, deleteTicket } = useSavedTickets();
  const [filter, setFilter] = useState<"all" | "pending" | "green" | "red">("all");

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.result === filter);

  const handleUpdateResult = async (id: string, result: "pending" | "green" | "red") => {
    try {
      await updateResult({ id, result });
      toast.success(result === "green" ? "Marcado como Green! ✅" : result === "red" ? "Marcado como Red ❌" : "Resetado");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTicket(id);
      toast.success("Bilhete removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-card border border-border hover:border-neon/30 transition-all"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Histórico de Bilhetes</h2>
          <p className="text-xs text-muted-foreground">Gerencie e acompanhe seus bilhetes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-400 mb-1" />
          <p className="text-lg font-bold text-emerald-400">{stats.green}</p>
          <p className="text-[10px] text-emerald-400/70">Green</p>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
          <XCircle className="h-4 w-4 mx-auto text-red-400 mb-1" />
          <p className="text-lg font-bold text-red-400">{stats.red}</p>
          <p className="text-[10px] text-red-400/70">Red</p>
        </div>
        <div className="rounded-xl bg-neon/10 border border-neon/20 p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto text-neon mb-1" />
          <p className="text-lg font-bold text-neon">{stats.winRate}%</p>
          <p className="text-[10px] text-neon/70">Win Rate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "green", "red"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f
                ? "bg-neon text-filter-chip-active-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-neon/30"
            }`}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "green" ? "Green" : "Red"}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-neon" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <SavedTicketCard
              key={ticket.id}
              ticket={ticket}
              onUpdateResult={handleUpdateResult}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Clock className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {filter === "all" ? "Nenhum bilhete salvo ainda" : `Nenhum bilhete ${filter}`}
          </p>
        </div>
      )}
    </div>
  );
}

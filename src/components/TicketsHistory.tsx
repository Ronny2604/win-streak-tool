import { useState, useEffect, useMemo } from "react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSavedTickets, SavedTicket } from "@/hooks/useSavedTickets";
import { useAutoSettle, analyzeTicketSelections, type SelectionResult } from "@/hooks/useAutoSettle";
import { getCompletedScores, type NormalizedFixture } from "@/lib/odds-api";
import { shareViaWhatsApp, shareViaLink } from "@/lib/share-ticket";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
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
  RefreshCw,
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
  selectionResults: SelectionResult[];
}

function SavedTicketCard({ ticket, onUpdateResult, onDelete, onUpdateNotes, selectionResults }: SavedTicketCardProps) {
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
          {selections.map((sel: any, i: number) => {
            const selResult = selectionResults[i];
            const selIcon = selResult?.result === "green" ? CheckCircle2 : selResult?.result === "red" ? XCircle : Clock;
            const selColor = selResult?.result === "green" ? "text-emerald-400" : selResult?.result === "red" ? "text-red-400" : "text-muted-foreground";
            const SelIcon = selIcon;
            return (
              <div key={i} className="px-4 py-3 border-b border-border/30 last:border-b-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <SelIcon className={`h-3.5 w-3.5 ${selColor}`} />
                    <p className="text-xs font-semibold text-foreground">
                      {sel.fixture?.teams?.home?.name ?? sel.homeName ?? "?"} vs {sel.fixture?.teams?.away?.name ?? sel.awayName ?? "?"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selResult?.score && (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        {selResult.score}
                      </span>
                    )}
                    <span className={`text-xs font-bold ${colors.accent}`}>
                      {Number(sel.odd).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3 w-3 text-neon" />
                  <span className="text-[11px] font-semibold text-neon">{sel.label}</span>
                </div>
                {sel.reasoning && (
                  <p className="text-[10px] text-muted-foreground mt-1">{sel.reasoning}</p>
                )}
              </div>
            );
          })}

          {/* Notes Section */}
          <div className="px-4 py-3 border-b border-border/30 bg-muted/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <StickyNote className="h-3.5 w-3.5" />
                Notas do Bilhete
              </div>
              {!editingNotes && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingNotes(true); }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            {editingNotes ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Adicione suas notas aqui..."
                  className="min-h-[60px] text-xs resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setNotesText(ticket.notes || "");
                      setEditingNotes(false);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdateNotes(ticket.id, notesText);
                      setEditingNotes(false);
                    }}
                    className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {ticket.notes || "Nenhuma nota adicionada."}
              </p>
            )}
          </div>

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
  const { tickets, isLoading, stats, updateResult, deleteTicket, updateNotes } = useSavedTickets();
  const [filter, setFilter] = useState<"all" | "pending" | "green" | "red">("all");
  const [completedScores, setCompletedScores] = useState<NormalizedFixture[]>([]);
  const [settling, setSettling] = useState(false);

  // Auto-settle with periodic polling
  useAutoSettle(completedScores, tickets);

  // Analyze per-selection results for all tickets
  const selectionResultsMap = useMemo(() => {
    const map: Record<string, SelectionResult[]> = {};
    const finished = completedScores.filter(
      (f) => f.status.short === "FT" && f.goals.home !== null && f.goals.away !== null
    );
    for (const ticket of tickets) {
      map[ticket.id] = analyzeTicketSelections(ticket, finished);
    }
    return map;
  }, [completedScores, tickets]);

  const fetchAndSettle = async () => {
    setSettling(true);
    try {
      const scores = await getCompletedScores();
      setCompletedScores(scores);
      const pendingCount = tickets.filter(t => t.result === "pending").length;
      toast.success(`${scores.length} resultados verificados • ${pendingCount} bilhetes pendentes`);
    } catch {
      toast.error("Erro ao buscar resultados");
    } finally {
      setSettling(false);
    }
  };

  useEffect(() => {
    // Auto-fetch completed scores on mount
    getCompletedScores().then(setCompletedScores).catch(() => {});
  }, []);

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

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateNotes({ id, notes });
      toast.success("Notas atualizadas");
    } catch {
      toast.error("Erro ao atualizar notas");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <button
          onClick={fetchAndSettle}
          disabled={settling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all disabled:opacity-50"
          title="Verificar resultados automaticamente"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${settling ? "animate-spin" : ""}`} />
          Auto
        </button>
      </div>

      {/* Pie Chart + Stats */}
      {stats.total > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-primary" />
            <p className="text-sm font-bold text-foreground">Resumo de Acertividade</p>
          </div>

          <div className="flex items-center gap-4">
            {/* SVG Pie Chart */}
            <div className="relative flex-shrink-0">
              <svg width="110" height="110" viewBox="0 0 110 110">
                {(() => {
                  const resolved = stats.green + stats.red;
                  const total = resolved + stats.pending;
                  if (total === 0) return null;

                  const greenPct = total > 0 ? stats.green / total : 0;
                  const redPct = total > 0 ? stats.red / total : 0;
                  const pendingPct = total > 0 ? stats.pending / total : 0;

                  const r = 45;
                  const cx = 55;
                  const cy = 55;
                  const circumference = 2 * Math.PI * r;

                  const greenLen = greenPct * circumference;
                  const redLen = redPct * circumference;
                  const pendingLen = pendingPct * circumference;

                  const greenOffset = 0;
                  const redOffset = -greenLen;
                  const pendingOffset = -(greenLen + redLen);

                  return (
                    <>
                      {/* Background circle */}
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" opacity="0.3" />
                      {/* Green arc */}
                      {greenLen > 0 && (
                        <circle
                          cx={cx} cy={cy} r={r} fill="none"
                          stroke="hsl(142, 71%, 45%)"
                          strokeWidth="14"
                          strokeDasharray={`${greenLen} ${circumference - greenLen}`}
                          strokeDashoffset={greenOffset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${cx} ${cy})`}
                          className="transition-all duration-700"
                        />
                      )}
                      {/* Red arc */}
                      {redLen > 0 && (
                        <circle
                          cx={cx} cy={cy} r={r} fill="none"
                          stroke="hsl(0, 84%, 60%)"
                          strokeWidth="14"
                          strokeDasharray={`${redLen} ${circumference - redLen}`}
                          strokeDashoffset={redOffset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${cx} ${cy})`}
                          className="transition-all duration-700"
                        />
                      )}
                      {/* Pending arc */}
                      {pendingLen > 0 && (
                        <circle
                          cx={cx} cy={cy} r={r} fill="none"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth="14"
                          strokeDasharray={`${pendingLen} ${circumference - pendingLen}`}
                          strokeDashoffset={pendingOffset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${cx} ${cy})`}
                          className="transition-all duration-700"
                          opacity="0.5"
                        />
                      )}
                    </>
                  );
                })()}
                {/* Center text */}
                <text x="55" y="50" textAnchor="middle" className="fill-foreground text-xl font-black">
                  {stats.winRate}%
                </text>
                <text x="55" y="68" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                  win rate
                </text>
              </svg>
            </div>

            {/* Legend + numbers */}
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-foreground font-medium">Green</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">{stats.green}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-foreground font-medium">Red</span>
                </div>
                <span className="text-sm font-bold text-red-400">{stats.red}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                  <span className="text-xs text-foreground font-medium">Pendentes</span>
                </div>
                <span className="text-sm font-bold text-muted-foreground">{stats.pending}</span>
              </div>
              <div className="pt-1.5 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-foreground">{stats.total}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
              onUpdateNotes={handleUpdateNotes}
              selectionResults={selectionResultsMap[ticket.id] ?? []}
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

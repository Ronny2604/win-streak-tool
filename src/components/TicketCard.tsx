import { BettingTicket } from "@/lib/ticket-generator";
import { shareViaWhatsApp, shareViaLink } from "@/lib/share-ticket";
import { Shield, Zap, Flame, ChevronDown, ChevronUp, Trophy, Share2, MessageCircle, Link } from "lucide-react";
import { useState } from "react";

const TYPE_CONFIG = {
  safe: {
    icon: Shield,
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-400",
    label: "SEGURO",
    accent: "text-emerald-400",
  },
  moderate: {
    icon: Zap,
    gradient: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-400",
    label: "MODERADO",
    accent: "text-amber-400",
  },
  aggressive: {
    icon: Flame,
    gradient: "from-red-500/20 to-red-500/5",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-400",
    label: "AGRESSIVO",
    accent: "text-red-400",
  },
};

interface TicketCardProps {
  ticket: BettingTicket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[ticket.type];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-2xl border ${config.border} bg-gradient-to-b ${config.gradient} backdrop-blur-sm overflow-hidden transition-all`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${config.badge}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{ticket.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {ticket.selections.length} jogos
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className={`text-xs font-bold ${config.accent}`}>
                Odd {ticket.totalOdd.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Retorno</div>
            <div className="text-sm font-bold text-neon">{ticket.potentialReturn}</div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Confiança</span>
          <span className={`text-[10px] font-bold ${config.accent}`}>{ticket.confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              ticket.type === "safe"
                ? "bg-emerald-500"
                : ticket.type === "moderate"
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${ticket.confidence}%` }}
          />
        </div>
      </div>

      {/* Expanded selections */}
      {expanded && (
        <div className="border-t border-border/50">
          {ticket.selections.map((sel, i) => (
            <div
              key={`${sel.fixture.id}-${i}`}
              className="px-4 py-3 border-b border-border/30 last:border-b-0"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {sel.fixture.league.logo && (
                    <img
                      src={sel.fixture.league.logo}
                      alt=""
                      className="h-3 w-3 object-contain"
                    />
                  )}
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {sel.fixture.league.name}
                  </span>
                </div>
                <span className={`text-xs font-bold ${config.accent}`}>
                  {sel.odd.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {sel.fixture.teams.home.name} vs {sel.fixture.teams.away.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Trophy className="h-3 w-3 text-neon" />
                    <span className="text-[11px] font-semibold text-neon">{sel.label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground">{sel.confidence}%</span>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                {sel.reasoning}
              </p>
            </div>
          ))}

          {/* Footer */}
          <div className="px-4 py-3 bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground">Aposta sugerida</span>
                <p className="text-sm font-bold text-foreground">{ticket.suggestedStake}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(ticket); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); shareViaLink(ticket); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:border-neon/30 transition-all"
                >
                  <Link className="h-3.5 w-3.5" />
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

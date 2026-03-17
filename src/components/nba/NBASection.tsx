import { useQuery } from "@tanstack/react-query";
import { getNBAGames, analyzeNBAGames, generateNBATickets, type NBAGame } from "@/lib/nba-api";
import { NBAGameCard } from "./NBAGameCard";
import { NBAAnalysisCard } from "./NBAAnalysisCard";
import { NBATicketCard } from "./NBATicketCard";
import { Loader2, Trophy, Zap, Ticket, BarChart3 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NBATab = "jogos" | "analises" | "bilhetes";

export function NBASection() {
  const [activeTab, setActiveTab] = useState<NBATab>("jogos");

  const { data: games, isLoading } = useQuery({
    queryKey: ["nba-games"],
    queryFn: getNBAGames,
    staleTime: 60_000,
  });

  const analyses = games ? analyzeNBAGames(games) : [];
  const tickets = games ? generateNBATickets(games) : [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando jogos da NBA...</p>
      </div>
    );
  }

  const tabs = [
    { id: "jogos" as NBATab, icon: Trophy, label: "Jogos", count: games?.length ?? 0 },
    { id: "analises" as NBATab, icon: BarChart3, label: "Análises", count: analyses.length },
    { id: "bilhetes" as NBATab, icon: Ticket, label: "Bilhetes", count: tickets.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-lg">🏀</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">NBA</h2>
          <p className="text-xs text-muted-foreground">Análises e bilhetes recomendados</p>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2">
        {tabs.map(({ id, icon: Icon, label, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all",
              activeTab === id
                ? "bg-primary/10 border border-primary/40 text-primary"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                activeTab === id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "jogos" && (
        <div className="space-y-3">
          {!games || games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Trophy className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum jogo NBA disponível no momento</p>
            </div>
          ) : (
            games.map((game) => <NBAGameCard key={game.id} game={game} />)
          )}
        </div>
      )}

      {activeTab === "analises" && (
        <div className="space-y-3">
          {analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sem análises disponíveis</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Entradas Sugeridas</span>
                <span className="text-[10px] text-muted-foreground">{analyses.length} oportunidades</span>
              </div>
              {analyses.map((a, i) => <NBAAnalysisCard key={i} analysis={a} />)}
            </>
          )}
        </div>
      )}

      {activeTab === "bilhetes" && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Ticket className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sem bilhetes disponíveis</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Bilhetes Recomendados</span>
              </div>
              {tickets.map((t) => <NBATicketCard key={t.id} ticket={t} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTodayFixtures, getLiveFixtures, LEAGUES, type Fixture } from "@/lib/api-football";
import { MatchCard } from "@/components/MatchCard";
import { FilterChip } from "@/components/FilterChip";
import { AppHeader } from "@/components/AppHeader";
import { KeyGateScreen } from "@/components/KeyGateScreen";
import { useKeyGate } from "@/contexts/KeyGateContext";
import { Star, Flame, Target, Search, Loader2 } from "lucide-react";

const MARKETS = ["Chance Dupla", "S/ Empate", "Escanteios", "Cartões", "Gols", "Ambas Marcam"];
const HIGHLIGHTS = [
  { label: "MELHOR DO DIA", icon: Star, color: "text-badge-star" },
  { label: "10 MELHORES", icon: Flame, color: "text-badge-hot" },
  { label: "TOP", icon: Target, color: "text-chart-negative" },
];

export default function Index() {
  const { session, loading: keyLoading } = useKeyGate();
  const [activeTab, setActiveTab] = useState<"futebol" | "live">("futebol");
  const [selectedLeague, setSelectedLeague] = useState<string | undefined>(undefined);
  const [activeMarkets, setActiveMarkets] = useState<string[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: fixturesData, isLoading: loadingFixtures } = useQuery({
    queryKey: ["fixtures", selectedLeague],
    queryFn: () => getTodayFixtures(selectedLeague),
    staleTime: 60000,
  });

  const { data: liveData, isLoading: loadingLive } = useQuery({
    queryKey: ["live-fixtures"],
    queryFn: getLiveFixtures,
    refetchInterval: 30000,
    enabled: activeTab === "live",
  });

  const fixtures = activeTab === "live" ? liveData?.response : fixturesData?.response;
  const isLoading = activeTab === "live" ? loadingLive : loadingFixtures;

  const filteredFixtures = fixtures?.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.teams.home.name.toLowerCase().includes(q) ||
      f.teams.away.name.toLowerCase().includes(q) ||
      f.league.name.toLowerCase().includes(q)
    );
  });

  const toggleMarket = (m: string) => {
    setActiveMarkets((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  if (keyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    );
  }

  if (!session.valid) return <KeyGateScreen />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-2xl py-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-border">
          <button
            onClick={() => setActiveTab("futebol")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "futebol"
                ? "border-neon text-neon"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Futebol
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "live"
                ? "border-chart-negative text-chart-negative"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-chart-negative animate-pulse-neon" />
            Ao Vivo
          </button>
        </div>

        {/* Market filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MARKETS.map((m) => (
            <FilterChip
              key={m}
              label={m}
              active={activeMarkets.includes(m)}
              onClick={() => toggleMarket(m)}
            />
          ))}
        </div>

        {/* Highlights */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {HIGHLIGHTS.map((h, i) => (
            <button
              key={h.label}
              onClick={() => setActiveHighlight(activeHighlight === i ? null : i)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                activeHighlight === i
                  ? "bg-card border border-neon/50 glow-neon"
                  : "bg-card border border-border hover:border-neon/30"
              }`}
            >
              <h.icon className={`h-4 w-4 ${h.color}`} />
              <span className="text-foreground">{h.label}</span>
            </button>
          ))}
        </div>

        {/* League filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            label="Todos"
            active={!selectedLeague}
            onClick={() => setSelectedLeague(undefined)}
          />
          {LEAGUES.map((l) => (
            <FilterChip
              key={l.id}
              label={l.name}
              active={selectedLeague === l.id}
              onClick={() => setSelectedLeague(selectedLeague === l.id ? undefined : l.id)}
            />
          ))}
        </div>

        {/* Active filters display */}
        {activeMarkets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeMarkets.map((m) => (
              <FilterChip
                key={m}
                label={m}
                active
                removable
                onClick={() => {}}
                onRemove={() => toggleMarket(m)}
              />
            ))}
            <button
              onClick={() => setActiveMarkets([])}
              className="text-xs font-medium text-chart-negative hover:underline"
            >
              Limpar tudo
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar Jogadores ou Times"
            className="w-full rounded-xl bg-card border border-border py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50 focus:border-neon/50 transition-all"
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
            <p className="text-sm text-muted-foreground">Carregando jogos...</p>
          </div>
        ) : filteredFixtures && filteredFixtures.length > 0 ? (
          <div className="space-y-3">
            {filteredFixtures.slice(0, 20).map((fixture) => (
              <MatchCard key={fixture.fixture.id} fixture={fixture} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-sm text-muted-foreground">Nenhum jogo encontrado para hoje</p>
            <p className="text-xs text-muted-foreground">Tente selecionar outra liga ou volte mais tarde</p>
          </div>
        )}
      </main>
    </div>
  );
}

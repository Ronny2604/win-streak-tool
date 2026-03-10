import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSoccerOdds, getLiveScores, LEAGUES, type NormalizedFixture } from "@/lib/odds-api";
import { MatchCard } from "@/components/MatchCard";
import { MatchCardSkeleton } from "@/components/MatchCardSkeleton";
import { MatchDetailModal } from "@/components/MatchDetailModal";
import { MarketInsightPanel } from "@/components/MarketInsightPanel";
import { CustomTicketBar } from "@/components/CustomTicketBar";
import { StatsSummaryBar } from "@/components/StatsSummaryBar";
import { QuickFilters, type QuickFilterType } from "@/components/QuickFilters";
import { EmptyState } from "@/components/EmptyState";
import { BottomNav } from "@/components/BottomNav";
import type { MarketType } from "@/lib/market-analysis";
import { TicketsSection } from "@/components/TicketsSection";
import { TicketsHistory } from "@/components/TicketsHistory";
import { FilterChip } from "@/components/FilterChip";
import { AppHeader } from "@/components/AppHeader";
import { useKeyGate } from "@/contexts/KeyGateContext";
import { useAuth } from "@/contexts/AuthContext";
import { ValueBetsPanel } from "@/components/ValueBetsPanel";
import { FormAnalysisPanel } from "@/components/FormAnalysisPanel";
import { LeagueROIPanel } from "@/components/LeagueROIPanel";
import { TipsChat } from "@/components/TipsChat";
import { BankrollSimulator } from "@/components/BankrollSimulator";
import {
  PerformanceDashboard,
  HeadToHead,
  TeamRankings,
  FinancialHistory,
  BankrollGoals,
  FavoritesWidget,
  OddsComparator,
  GamesCalendar,
  AITicketGenerator,
  SurebetDetector
} from "@/components/premium";
import { Star, Flame, Target, Search, Loader2, Lock, Zap, BarChart3, Trophy, MessageCircle, Calculator, Users, DollarSign, Calendar, Bot } from "lucide-react";
import { Navigate } from "react-router-dom";

const MARKETS = ["Chance Dupla", "S/ Empate", "Escanteios", "Cartões", "Gols", "Ambas Marcam"];
const HIGHLIGHTS = [
  { label: "MELHOR DO DIA", icon: Star, color: "text-badge-star" },
  { label: "10 MELHORES", icon: Flame, color: "text-badge-hot" },
  { label: "TOP", icon: Target, color: "text-chart-negative" },
];

type PremiumSection = "valuebets" | "form" | "roi" | "chat" | "kelly" | "dashboard" | "h2h" | "rankings" | "financial" | "goals" | "favorites" | "odds" | "calendar" | "ai";

function applyQuickFilter(fixtures: NormalizedFixture[], filter: QuickFilterType): NormalizedFixture[] {
  switch (filter) {
    case "high-odds":
      return fixtures.filter(f => {
        if (!f.odds) return false;
        const h = parseFloat(f.odds.home);
        return !isNaN(h) && h >= 2.5;
      });
    case "safe":
      return fixtures.filter(f => {
        if (!f.odds) return false;
        const h = parseFloat(f.odds.home);
        const a = parseFloat(f.odds.away);
        return (!isNaN(h) && h <= 1.5) || (!isNaN(a) && a <= 1.5);
      });
    case "value":
      return fixtures.filter(f => {
        if (!f.odds) return false;
        const h = parseFloat(f.odds.home);
        return !isNaN(h) && h >= 1.8 && h <= 2.5;
      });
    case "today-best":
      return [...fixtures].sort((a, b) => {
        const aOdd = a.odds ? parseFloat(a.odds.home) : 99;
        const bOdd = b.odds ? parseFloat(b.odds.home) : 99;
        return Math.abs(aOdd - 1.8) - Math.abs(bOdd - 1.8);
      }).slice(0, 10);
    default:
      return fixtures;
  }
}

export default function Index() {
  const { session, loading: keyLoading } = useKeyGate();
  const { isAdmin, loading: authLoading } = useAuth();
  const isPro = isAdmin || session.plan === "pro";
  const LITE_LIMIT = 5;
  const [activeTab, setActiveTab] = useState<"futebol" | "live" | "bilhetes" | "historico" | "premium">("futebol");
  const [premiumSection, setPremiumSection] = useState<PremiumSection>("dashboard");
  const [selectedLeague, setSelectedLeague] = useState<string | undefined>(undefined);
  const [activeMarkets, setActiveMarkets] = useState<string[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<NormalizedFixture | null>(null);

  const { data: fixturesData, isLoading: loadingFixtures } = useQuery({
    queryKey: ["fixtures", selectedLeague],
    queryFn: () => getSoccerOdds(selectedLeague),
    staleTime: 60000,
  });

  const { data: liveData, isLoading: loadingLive } = useQuery({
    queryKey: ["live-fixtures"],
    queryFn: () => getLiveScores(),
    refetchInterval: 30000,
    enabled: activeTab === "live",
  });

  const fixtures = activeTab === "live" ? liveData : fixturesData;
  const isLoading = activeTab === "live" ? loadingLive : loadingFixtures;

  const searchFiltered = fixtures?.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.teams.home.name.toLowerCase().includes(q) ||
      f.teams.away.name.toLowerCase().includes(q) ||
      f.league.name.toLowerCase().includes(q)
    );
  });

  const filteredFixtures = searchFiltered ? applyQuickFilter(searchFiltered, quickFilter) : undefined;

  const toggleMarket = (m: string) => {
    setActiveMarkets((prev) => prev.includes(m) ? [] : [m]);
  };

  if (keyLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    );
  }

  if (!session.valid && !isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />

      <main className="container max-w-2xl py-4 space-y-4">
        {/* Tabs - hidden on mobile since we have bottom nav */}
        <div className="hidden md:flex gap-4 border-b border-border overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("futebol")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "futebol"
                ? "border-neon text-neon"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Futebol
          </button>
          <button
            onClick={() => isPro && setActiveTab("live")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              !isPro
                ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                : activeTab === "live"
                  ? "border-chart-negative text-chart-negative"
                  : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-chart-negative animate-pulse-neon" />
            Ao Vivo
            {!isPro && <Lock className="h-3 w-3 ml-1" />}
          </button>
          <button
            onClick={() => setActiveTab("bilhetes")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "bilhetes"
                ? "border-neon text-neon"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🎫 Bilhetes
          </button>
          <button
            onClick={() => isPro && setActiveTab("premium")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              !isPro
                ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                : activeTab === "premium"
                  ? "border-badge-star text-badge-star"
                  : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-3 w-3" />
            Premium
            {!isPro && <Lock className="h-3 w-3 ml-1" />}
          </button>
        </div>

        {activeTab === "historico" ? (
          <TicketsHistory onBack={() => setActiveTab("bilhetes")} />
        ) : activeTab === "bilhetes" ? (
          <TicketsSection fixtures={fixturesData} isLoading={loadingFixtures} isPro={isPro} onOpenHistory={() => setActiveTab("historico")} />
        ) : activeTab === "premium" ? (
        <div className="space-y-4">
            {/* Premium sub-nav */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "dashboard" as PremiumSection, icon: BarChart3, label: "Dashboard" },
                { id: "ai" as PremiumSection, icon: Bot, label: "IA" },
                { id: "valuebets" as PremiumSection, icon: Zap, label: "Value" },
                { id: "h2h" as PremiumSection, icon: Users, label: "H2H" },
                { id: "rankings" as PremiumSection, icon: Trophy, label: "Rankings" },
                { id: "odds" as PremiumSection, icon: Zap, label: "Odds" },
                { id: "calendar" as PremiumSection, icon: Calendar, label: "Calendário" },
                { id: "financial" as PremiumSection, icon: DollarSign, label: "Financeiro" },
                { id: "goals" as PremiumSection, icon: Target, label: "Metas" },
                { id: "favorites" as PremiumSection, icon: Star, label: "Favoritos" },
                { id: "form" as PremiumSection, icon: BarChart3, label: "Forma" },
                { id: "roi" as PremiumSection, icon: Trophy, label: "ROI" },
                { id: "chat" as PremiumSection, icon: MessageCircle, label: "Chat" },
                { id: "kelly" as PremiumSection, icon: Calculator, label: "Kelly" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setPremiumSection(id)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                    premiumSection === id
                      ? "bg-badge-star/10 border border-badge-star/50 text-badge-star"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {premiumSection === "dashboard" && <PerformanceDashboard />}
            {premiumSection === "ai" && fixturesData && <AITicketGenerator fixtures={fixturesData} />}
            {premiumSection === "h2h" && fixturesData && <HeadToHead fixtures={fixturesData} />}
            {premiumSection === "rankings" && fixturesData && <TeamRankings fixtures={fixturesData} />}
            {premiumSection === "odds" && fixturesData && <OddsComparator fixtures={fixturesData} />}
            {premiumSection === "calendar" && fixturesData && <GamesCalendar fixtures={fixturesData} onSelectFixture={setSelectedMatch} />}
            {premiumSection === "financial" && <FinancialHistory />}
            {premiumSection === "goals" && <BankrollGoals />}
            {premiumSection === "favorites" && fixturesData && <FavoritesWidget fixtures={fixturesData} onSelectFixture={setSelectedMatch} />}
            {premiumSection === "valuebets" && fixturesData && <ValueBetsPanel fixtures={fixturesData} />}
            {premiumSection === "form" && fixturesData && <FormAnalysisPanel fixtures={fixturesData} />}
            {premiumSection === "roi" && <LeagueROIPanel />}
            {premiumSection === "chat" && <TipsChat />}
            {premiumSection === "kelly" && <BankrollSimulator />}
          </div>
        ) : (<>
        {/* Stats Summary */}
        <StatsSummaryBar fixtures={fixtures} isLoading={isLoading} />

        {/* Quick Filters */}
        <QuickFilters active={quickFilter} onChange={setQuickFilter} />

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
          <div className="flex flex-wrap gap-2 mb-1">
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
              Limpar
            </button>
          </div>
        )}

        {/* Market Insight Panel */}
        {activeMarkets.length === 1 && fixturesData && fixturesData.length > 0 && (
          <MarketInsightPanel
            market={activeMarkets[0] as MarketType}
            fixtures={fixturesData}
            onClose={() => setActiveMarkets([])}
          />
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
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredFixtures && filteredFixtures.length > 0 ? (
          <div className="space-y-3">
            {filteredFixtures.slice(0, isPro ? 50 : LITE_LIMIT).map((fixture, index) => (
              <MatchCard
                key={fixture.id}
                fixture={fixture}
                showOdds={isPro}
                onClick={() => setSelectedMatch(fixture)}
                animationDelay={index * 50}
              />
            ))}
            {!isPro && filteredFixtures.length > LITE_LIMIT && (
              <div className="relative">
                <div className="space-y-3 blur-sm pointer-events-none select-none opacity-50">
                  {filteredFixtures.slice(LITE_LIMIT, LITE_LIMIT + 2).map((fixture) => (
                    <MatchCard key={fixture.id} fixture={fixture} showOdds={false} />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
                  <Lock className="h-6 w-6 text-neon mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    +{filteredFixtures.length - LITE_LIMIT} jogos disponíveis
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upgrade para <span className="font-bold text-neon">PRO</span> para ver todos os jogos, odds e ao vivo
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            type={search ? "no-results" : "no-games"}
            searchTerm={search || undefined}
          />
        )}
        </>)}
      </main>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal
          fixture={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          showOdds={isPro}
        />
      )}

      {/* Custom Ticket Bar */}
      <CustomTicketBar />

      {/* Bottom Navigation (mobile only) */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isPro={isPro} />
    </div>
  );
}

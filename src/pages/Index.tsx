import { useState, useEffect } from "react";
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
import { CashoutBuilder } from "@/components/CashoutBuilder";
import { BilhetesView } from "@/components/BilhetesView";
import { FilterChip } from "@/components/FilterChip";
import { AppHeader } from "@/components/AppHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { CollapsibleFilterGroup } from "@/components/CollapsibleFilterGroup";
import { Layers, Sparkles, Globe2 } from "lucide-react";
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
  SurebetDetector,
  LiveAlerts,
  StreakTracker,
  MultiBetBuilder,
  ProfitCalculator,
  InsightsFeed,
  LiveOddsTracker,
  CorrelationAnalysis,
  DailyReport,
  ChallengesSystem,
  PatternDetector,
  LiveMatchStats,
  ExportReports,
  BookmakerComparator,
  SmartBetSuggestions,
  OddsHistoryChart,
  MarketROIDashboard,
  TicketComparator,
  WhatIfSimulator,
} from "@/components/premium";
import { NBASection } from "@/components/nba/NBASection";
import { CopaSection } from "@/components/CopaSection";
import { Star, Flame, Target, Search, Loader2, Lock, Zap, BarChart3, Trophy, MessageCircle, Calculator, Users, DollarSign, Calendar, Bot, Shield, BellRing, Brain, Activity, GitBranch, FileText, Eye, Globe, LineChart, Download, GitCompare, Wand2, PieChart } from "lucide-react";
import { Navigate } from "react-router-dom";
// Surebet notifier disabled per user request

const MARKETS = ["Chance Dupla", "S/ Empate", "Escanteios", "Cartões", "Gols", "Ambas Marcam"];

type PremiumSection = "valuebets" | "form" | "roi" | "chat" | "kelly" | "dashboard" | "h2h" | "rankings" | "financial" | "goals" | "favorites" | "odds" | "calendar" | "ai" | "surebet" | "livealerts" | "streaks" | "multibet" | "calculator" | "insights" | "oddstracker" | "correlation" | "report" | "challenges" | "patterns" | "livestats" | "export" | "bookmaker" | "smartbet" | "oddshistory" | "marketroi" | "compare" | "whatif";

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
  const { isAdmin, loading: authLoading, subscription } = useAuth();
  const isPro = isAdmin || session.plan === "pro" || subscription.subscribed;
  const LITE_LIMIT = 5;
  const [activeTab, setActiveTab] = useState<"futebol" | "nba" | "copa" | "live" | "bilhetes" | "historico" | "premium" | "perfil">("futebol");
  const [premiumSection, setPremiumSection] = useState<PremiumSection>("dashboard");
  const [selectedLeague, setSelectedLeague] = useState<string | undefined>(undefined);
  const [activeMarkets, setActiveMarkets] = useState<string[]>([]);
  // activeHighlight removed — redundant with QuickFilters
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<NormalizedFixture | null>(null);

  const { data: fixturesData, isLoading: loadingFixtures } = useQuery({
    queryKey: ["fixtures", selectedLeague],
    queryFn: () => getSoccerOdds(selectedLeague),
    staleTime: 60000,
  });

  // Surebet notifier disabled per user request

  // Listen for navigate-to-surebet event from notification bell
  useEffect(() => {
    const handler = () => {
      if (isPro) {
        setActiveTab("premium");
        setPremiumSection("surebet");
        setTimeout(() => {
          document.getElementById("surebet-panel")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    };
    window.addEventListener("navigate-to-surebet", handler);
    return () => window.removeEventListener("navigate-to-surebet", handler);
  }, [isPro]);

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

  // Free users can access basic features - no redirect needed

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--neon)/0.06),transparent_60%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--surface)/0.3))] pb-24 md:pb-4">
      <AppHeader />

      <main className="container max-w-2xl py-5 space-y-5 animate-fade-in-up">
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
            ⚽ Futebol
          </button>
          <button
            onClick={() => setActiveTab("nba")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "nba"
                ? "border-neon text-neon"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🏀 NBA
          </button>
          <button
            onClick={() => setActiveTab("copa")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "copa"
                ? "border-neon text-neon"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🌍 Copa
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
        ) : activeTab === "nba" ? (
          <NBASection />
        ) : activeTab === "copa" ? (
          <CopaSection isPro={isPro} />
        ) : activeTab === "bilhetes" ? (
          <BilhetesView fixtures={fixturesData} isLoading={loadingFixtures} isPro={isPro} onOpenHistory={() => setActiveTab("historico")} />
        ) : activeTab === "premium" ? (
        <div className="space-y-4">
            {/* Premium grid nav - organized by category */}
            <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]">
              {[
                {
                  title: "Análise",
                  items: [
                    { id: "dashboard" as PremiumSection, icon: BarChart3, label: "Dashboard" },
                    { id: "ai" as PremiumSection, icon: Bot, label: "IA Bilhete" },
                    { id: "valuebets" as PremiumSection, icon: Zap, label: "Value" },
                    { id: "smartbet" as PremiumSection, icon: Brain, label: "Smart Bet" },
                    { id: "insights" as PremiumSection, icon: Brain, label: "Insights" },
                    { id: "patterns" as PremiumSection, icon: Eye, label: "Padrões" },
                  ],
                },
                {
                  title: "Times & Ligas",
                  items: [
                    { id: "h2h" as PremiumSection, icon: Users, label: "H2H" },
                    { id: "rankings" as PremiumSection, icon: Trophy, label: "Rankings" },
                    { id: "form" as PremiumSection, icon: BarChart3, label: "Forma" },
                    { id: "favorites" as PremiumSection, icon: Star, label: "Favoritos" },
                    { id: "calendar" as PremiumSection, icon: Calendar, label: "Calendário" },
                    { id: "correlation" as PremiumSection, icon: GitBranch, label: "Correlação" },
                  ],
                },
                {
                  title: "Odds & Casas",
                  items: [
                    { id: "odds" as PremiumSection, icon: Zap, label: "Comparar" },
                    { id: "bookmaker" as PremiumSection, icon: Globe, label: "Casas" },
                    { id: "oddstracker" as PremiumSection, icon: Activity, label: "Odds Live" },
                    { id: "oddshistory" as PremiumSection, icon: LineChart, label: "Histórico" },
                    { id: "surebet" as PremiumSection, icon: Shield, label: "Surebet" },
                    { id: "livealerts" as PremiumSection, icon: BellRing, label: "Alertas" },
                  ],
                },
                {
                  title: "Financeiro",
                  items: [
                    { id: "financial" as PremiumSection, icon: DollarSign, label: "Financeiro" },
                    { id: "goals" as PremiumSection, icon: Target, label: "Metas" },
                    { id: "roi" as PremiumSection, icon: Trophy, label: "ROI Ligas" },
                    { id: "marketroi" as PremiumSection, icon: PieChart, label: "ROI Mercado" },
                    { id: "kelly" as PremiumSection, icon: Calculator, label: "Kelly" },
                    { id: "calculator" as PremiumSection, icon: Calculator, label: "Lucro" },
                  ],
                },
                {
                  title: "Bilhetes & Ferramentas",
                  items: [
                    { id: "multibet" as PremiumSection, icon: Target, label: "Multi-Bet" },
                    { id: "compare" as PremiumSection, icon: GitCompare, label: "Comparar" },
                    { id: "whatif" as PremiumSection, icon: Wand2, label: "E se..." },
                    { id: "streaks" as PremiumSection, icon: Flame, label: "Streaks" },
                    { id: "challenges" as PremiumSection, icon: Trophy, label: "Desafios" },
                    { id: "chat" as PremiumSection, icon: MessageCircle, label: "Chat IA" },
                  ],
                },
                {
                  title: "Live & Relatórios",
                  items: [
                    { id: "livestats" as PremiumSection, icon: Activity, label: "Ao Vivo+" },
                    { id: "report" as PremiumSection, icon: FileText, label: "Relatório" },
                    { id: "export" as PremiumSection, icon: Download, label: "Exportar" },
                  ],
                },
              ].map((group) => (
                <div key={group.title} className="mb-3 last:mb-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 px-1 mb-2">{group.title}</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {group.items.map(({ id, icon: Icon, label }) => {
                      const isActive = premiumSection === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setPremiumSection(id)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-[10px] font-semibold transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-br from-badge-star/20 to-badge-star/5 border border-badge-star/50 text-badge-star shadow-[0_0_20px_-8px_hsl(var(--badge-star)/0.5)] scale-[1.03]"
                              : "bg-surface/40 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-surface/70 active:scale-95"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? "text-badge-star" : ""}`} />
                          <span className="leading-tight text-center line-clamp-1">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
            {premiumSection === "surebet" && fixturesData && <SurebetDetector fixtures={fixturesData} />}
            {premiumSection === "livealerts" && <LiveAlerts fixtures={fixturesData} />}
            {premiumSection === "streaks" && fixturesData && <StreakTracker fixtures={fixturesData} />}
            {premiumSection === "multibet" && fixturesData && <MultiBetBuilder fixtures={fixturesData} />}
            {premiumSection === "calculator" && <ProfitCalculator />}
            {premiumSection === "insights" && fixturesData && <InsightsFeed fixtures={fixturesData} />}
            {premiumSection === "oddstracker" && <LiveOddsTracker fixtures={fixturesData} />}
            {premiumSection === "correlation" && fixturesData && <CorrelationAnalysis fixtures={fixturesData} />}
            {premiumSection === "report" && fixturesData && <DailyReport fixtures={fixturesData} />}
            {premiumSection === "challenges" && <ChallengesSystem />}
            {premiumSection === "patterns" && fixturesData && <PatternDetector fixtures={fixturesData} />}
            {premiumSection === "livestats" && <LiveMatchStats fixtures={fixturesData} />}
            {premiumSection === "export" && <ExportReports />}
            {premiumSection === "bookmaker" && <BookmakerComparator fixtures={fixturesData} />}
            {premiumSection === "smartbet" && fixturesData && <SmartBetSuggestions fixtures={fixturesData} />}
            {premiumSection === "oddshistory" && <OddsHistoryChart fixtures={fixturesData} />}
            {premiumSection === "marketroi" && <MarketROIDashboard />}
            {premiumSection === "compare" && <TicketComparator />}
            {premiumSection === "whatif" && <WhatIfSimulator />}
          </div>
        ) : (<>
        {/* ───── SEÇÃO 1: VISÃO GERAL ───── */}
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Visão Geral"
            title={activeTab === "live" ? "Ao Vivo Agora" : "Mercado Hoje"}
            accent="neon"
            badge={activeTab === "live" ? "LIVE" : undefined}
          />
          <StatsSummaryBar fixtures={fixtures} isLoading={isLoading} />
        </section>

        {/* ───── SEÇÃO 2: BUSCA & FILTROS RÁPIDOS ───── */}
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Descobrir"
            title="Buscar & Filtrar"
            accent="badge-star"
          />
          <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-3 space-y-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-neon transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar jogos ou ligas..."
                className="w-full rounded-xl bg-surface/60 border border-border/40 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-neon/40 focus:border-neon/40 transition-all"
              />
            </div>
            <QuickFilters active={quickFilter} onChange={setQuickFilter} />
          </div>
        </section>

        {/* ───── SEÇÃO 3: FILTROS AVANÇADOS ───── */}
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Refinar"
            title="Mercados & Ligas"
            accent="badge-hot"
            actionLabel={(activeMarkets.length > 0 || selectedLeague) ? "Limpar" : undefined}
            onAction={() => { setActiveMarkets([]); setSelectedLeague(undefined); }}
          />
          <div className="space-y-2">
            <CollapsibleFilterGroup
              icon={Layers}
              label="Mercados"
              accentClass="text-neon"
              activeCount={activeMarkets.length}
            >
              <div className="flex flex-wrap gap-2">
                {MARKETS.map((m) => (
                  <FilterChip
                    key={m}
                    label={m}
                    active={activeMarkets.includes(m)}
                    onClick={() => toggleMarket(m)}
                  />
                ))}
              </div>
            </CollapsibleFilterGroup>

            <CollapsibleFilterGroup
              icon={Globe2}
              label="Ligas"
              accentClass="text-badge-hot"
              activeCount={selectedLeague ? 1 : 0}
            >
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="Todas"
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
            </CollapsibleFilterGroup>
          </div>

          {/* Market Insight Panel - shown inline when single market active */}
          {activeMarkets.length === 1 && fixturesData && fixturesData.length > 0 && (
            <MarketInsightPanel
              market={activeMarkets[0] as MarketType}
              fixtures={fixturesData}
              onClose={() => setActiveMarkets([])}
            />
          )}
        </section>

        {/* ───── SEÇÃO 4: JOGOS ───── */}
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Jogos"
            title={activeTab === "live" ? "Partidas Ao Vivo" : "Próximos Jogos"}
            accent={activeTab === "live" ? "chart-negative" : "neon"}
            count={filteredFixtures?.length}
            countLabel="jogos"
          />

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
                      Upgrade para <span className="font-bold text-neon">PRO</span> para ver todos
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
        </section>
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

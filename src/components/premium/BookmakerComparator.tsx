import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, TrendingDown, ArrowRight, BarChart3 } from "lucide-react";
import type { NormalizedFixture } from "@/lib/odds-api";

interface BookmakerComparatorProps {
  fixtures?: NormalizedFixture[];
}

export function BookmakerComparator({ fixtures }: BookmakerComparatorProps) {
  const [search, setSearch] = useState("");
  const [selectedFixture, setSelectedFixture] = useState<NormalizedFixture | null>(null);

  const filtered = useMemo(() => {
    if (!fixtures) return [];
    const q = search.toLowerCase();
    return fixtures.filter(f =>
      f.teams.home.name.toLowerCase().includes(q) ||
      f.teams.away.name.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [fixtures, search]);

  const bookmakerData = useMemo(() => {
    if (!selectedFixture?.bookmakerOdds) return [];
    return selectedFixture.bookmakerOdds.sort((a, b) => b.home - a.home);
  }, [selectedFixture]);

  const bestOdds = useMemo(() => {
    if (!bookmakerData.length) return null;
    return {
      home: Math.max(...bookmakerData.map(b => b.home)),
      draw: Math.max(...bookmakerData.map(b => b.draw)),
      away: Math.max(...bookmakerData.map(b => b.away)),
    };
  }, [bookmakerData]);

  return (
    <div className="space-y-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-badge-star" />
            Comparador de Casas
          </CardTitle>
          <p className="text-xs text-muted-foreground">Compare odds entre diferentes casas de apostas</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jogo..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {!selectedFixture ? (
        <div className="space-y-2">
          {filtered.map(f => (
            <Card
              key={f.id}
              className="border-border bg-card hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setSelectedFixture(f)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={f.teams.home.logo} alt="" className="h-5 w-5" />
                    <span className="text-sm font-medium">{f.teams.home.name}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="text-sm font-medium">{f.teams.away.name}</span>
                    <img src={f.teams.away.logo} alt="" className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {f.bookmakerOdds?.length || 0} casas
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum jogo encontrado</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedFixture(null)}
            className="text-xs text-primary font-medium hover:underline"
          >
            ← Voltar
          </button>

          <Card className="border-primary/20 bg-card">
            <CardContent className="py-3">
              <div className="flex items-center justify-center gap-3">
                <img src={selectedFixture.teams.home.logo} alt="" className="h-8 w-8" />
                <span className="font-bold">{selectedFixture.teams.home.name}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-bold">{selectedFixture.teams.away.name}</span>
                <img src={selectedFixture.teams.away.logo} alt="" className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          {bookmakerData.length > 0 ? (
            <>
              {/* Best odds highlight */}
              {bestOdds && (
                <Card className="border-neon/30 bg-neon/5">
                  <CardContent className="py-3">
                    <p className="text-xs font-bold text-neon mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> MELHORES ODDS
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Casa</p>
                        <p className="font-bold text-lg text-neon">{bestOdds.home.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Empate</p>
                        <p className="font-bold text-lg text-badge-star">{bestOdds.draw.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fora</p>
                        <p className="font-bold text-lg text-chart-negative">{bestOdds.away.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All bookmakers */}
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-2 px-3 text-xs text-muted-foreground font-medium">
                  <span>Casa de Aposta</span>
                  <span className="text-center">1</span>
                  <span className="text-center">X</span>
                  <span className="text-center">2</span>
                </div>
                {bookmakerData.map((b, i) => (
                  <Card key={i} className="border-border bg-card">
                    <CardContent className="py-2">
                      <div className="grid grid-cols-4 gap-2 items-center">
                        <span className="text-xs font-medium truncate">{b.bookmaker}</span>
                        <span className={`text-center text-sm font-bold ${bestOdds && b.home === bestOdds.home ? "text-neon" : ""}`}>
                          {b.home.toFixed(2)}
                        </span>
                        <span className={`text-center text-sm font-bold ${bestOdds && b.draw === bestOdds.draw ? "text-badge-star" : ""}`}>
                          {b.draw.toFixed(2)}
                        </span>
                        <span className={`text-center text-sm font-bold ${bestOdds && b.away === bestOdds.away ? "text-chart-negative" : ""}`}>
                          {b.away.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">Sem dados de casas de apostas para este jogo</p>
          )}
        </div>
      )}
    </div>
  );
}

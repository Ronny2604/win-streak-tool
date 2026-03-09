import { useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, isToday, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GamesCalendarProps {
  fixtures: NormalizedFixture[];
  onSelectFixture?: (f: NormalizedFixture) => void;
}

export function GamesCalendar({ fixtures, onSelectFixture }: GamesCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group fixtures by date (simulating multiple days - in production, fetch real data)
  const getFixturesForDate = (date: Date) => {
    // For demo, show fixtures on current selected date
    if (isToday(date) || isSameDay(date, selectedDate)) {
      return fixtures;
    }
    // Simulate some fixtures for other days
    return fixtures.slice(0, Math.floor(Math.random() * fixtures.length));
  };

  const dayFixtures = getFixturesForDate(selectedDate);

  // Group by league
  const groupedByLeague = dayFixtures.reduce((acc: Record<string, NormalizedFixture[]>, f) => {
    if (!acc[f.league.name]) acc[f.league.name] = [];
    acc[f.league.name].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-neon" />
          <h3 className="text-sm font-bold text-foreground">Calendário de Jogos</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("day")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "day" ? "bg-neon/10 text-neon" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "week" ? "bg-neon/10 text-neon" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-border p-3">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, viewMode === "week" ? 7 : 1))}
          className="p-2 rounded-lg hover:bg-surface transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">
            {viewMode === "day"
              ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
              : `${format(weekStart, "d MMM", { locale: ptBR })} - ${format(weekEnd, "d MMM", { locale: ptBR })}`}
          </div>
          {isToday(selectedDate) && viewMode === "day" && (
            <span className="text-[10px] text-neon font-semibold">Hoje</span>
          )}
        </div>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, viewMode === "week" ? 7 : 1))}
          className="p-2 rounded-lg hover:bg-surface transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Week View */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayGames = getFixturesForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode("day");
                }}
                className={`rounded-lg p-2 text-center transition-colors ${
                  isSelected
                    ? "bg-neon/10 border border-neon/50"
                    : today
                      ? "bg-badge-star/10 border border-badge-star/30"
                      : "bg-card border border-border hover:border-neon/30"
                }`}
              >
                <div className="text-[10px] text-muted-foreground">
                  {format(day, "EEE", { locale: ptBR })}
                </div>
                <div className={`text-sm font-bold ${today ? "text-badge-star" : "text-foreground"}`}>
                  {format(day, "d")}
                </div>
                {dayGames.length > 0 && (
                  <div className="text-[9px] text-neon font-semibold">{dayGames.length} jogos</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Day View - Games List */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {Object.entries(groupedByLeague).length > 0 ? (
            Object.entries(groupedByLeague).map(([league, leagueFixtures]) => (
              <div key={league} className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  {leagueFixtures[0].league.logo && (
                    <img src={leagueFixtures[0].league.logo} alt="" className="w-4 h-4 object-contain" />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">{league}</span>
                  <span className="text-[10px] text-muted-foreground">({leagueFixtures.length} jogos)</span>
                </div>
                
                <div className="space-y-1">
                  {leagueFixtures.map((fixture) => (
                    <button
                      key={fixture.id}
                      onClick={() => onSelectFixture?.(fixture)}
                      className="w-full flex items-center gap-2 rounded-lg bg-card border border-border p-2.5 hover:border-neon/30 transition-colors"
                    >
                      <div className="text-[10px] text-muted-foreground w-12">
                        {fixture.date ? format(new Date(fixture.date), "HH:mm") : "--:--"}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {fixture.teams.home.logo && (
                          <img src={fixture.teams.home.logo} alt="" className="w-4 h-4 object-contain" />
                        )}
                        <span className="text-xs font-medium text-foreground truncate">{fixture.teams.home.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">vs</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-xs font-medium text-foreground truncate">{fixture.teams.away.name}</span>
                        {fixture.teams.away.logo && (
                          <img src={fixture.teams.away.logo} alt="" className="w-4 h-4 object-contain" />
                        )}
                      </div>
                      {fixture.odds && (
                        <div className="flex gap-1 ml-2">
                          <span className="text-[9px] bg-surface px-1.5 py-0.5 rounded text-foreground font-mono">
                            {fixture.odds.home}
                          </span>
                          <span className="text-[9px] bg-surface px-1.5 py-0.5 rounded text-foreground font-mono">
                            {fixture.odds.draw}
                          </span>
                          <span className="text-[9px] bg-surface px-1.5 py-0.5 rounded text-foreground font-mono">
                            {fixture.odds.away}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum jogo nesta data</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

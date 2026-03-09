import { useState } from "react";
import { NormalizedFixture } from "@/lib/odds-api";
import { Users, TrendingUp, Goal, CornerUpRight, Square, Search } from "lucide-react";

interface HeadToHeadProps {
  fixtures: NormalizedFixture[];
}

export function HeadToHead({ fixtures }: HeadToHeadProps) {
  const [team1Search, setTeam1Search] = useState("");
  const [team2Search, setTeam2Search] = useState("");
  const [selectedTeam1, setSelectedTeam1] = useState<{ name: string; logo?: string } | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<{ name: string; logo?: string } | null>(null);

  // Extract all unique teams
  const allTeams = fixtures.reduce((acc: { name: string; logo?: string }[], f) => {
    if (!acc.find(t => t.name === f.teams.home.name)) {
      acc.push({ name: f.teams.home.name, logo: f.teams.home.logo });
    }
    if (!acc.find(t => t.name === f.teams.away.name)) {
      acc.push({ name: f.teams.away.name, logo: f.teams.away.logo });
    }
    return acc;
  }, []).sort((a, b) => a.name.localeCompare(b.name));

  const filteredTeams1 = team1Search
    ? allTeams.filter(t => t.name.toLowerCase().includes(team1Search.toLowerCase())).slice(0, 5)
    : [];
  
  const filteredTeams2 = team2Search
    ? allTeams.filter(t => t.name.toLowerCase().includes(team2Search.toLowerCase())).slice(0, 5)
    : [];

  // Simulated H2H stats (in production, fetch from API)
  const h2hStats = selectedTeam1 && selectedTeam2 ? {
    team1Wins: Math.floor(Math.random() * 8) + 2,
    draws: Math.floor(Math.random() * 5) + 1,
    team2Wins: Math.floor(Math.random() * 8) + 2,
    team1Goals: Math.floor(Math.random() * 20) + 10,
    team2Goals: Math.floor(Math.random() * 20) + 10,
    totalMatches: 0,
    avgGoals: 0,
    bttsPercent: Math.floor(Math.random() * 40) + 40,
    over25Percent: Math.floor(Math.random() * 30) + 50,
    team1CleanSheets: Math.floor(Math.random() * 4) + 1,
    team2CleanSheets: Math.floor(Math.random() * 4) + 1,
  } : null;

  if (h2hStats) {
    h2hStats.totalMatches = h2hStats.team1Wins + h2hStats.draws + h2hStats.team2Wins;
    h2hStats.avgGoals = (h2hStats.team1Goals + h2hStats.team2Goals) / h2hStats.totalMatches;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-neon" />
        <h3 className="text-sm font-bold text-foreground">Confronto Direto (H2H)</h3>
      </div>

      {/* Team Selection */}
      <div className="grid grid-cols-2 gap-3">
        <TeamSelector
          label="Time 1"
          search={team1Search}
          setSearch={setTeam1Search}
          selected={selectedTeam1}
          setSelected={setSelectedTeam1}
          filteredTeams={filteredTeams1}
        />
        <TeamSelector
          label="Time 2"
          search={team2Search}
          setSearch={setTeam2Search}
          selected={selectedTeam2}
          setSelected={setSelectedTeam2}
          filteredTeams={filteredTeams2}
        />
      </div>

      {/* H2H Results */}
      {selectedTeam1 && selectedTeam2 && h2hStats ? (
        <div className="space-y-3">
          {/* Teams Header */}
          <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2">
              {selectedTeam1.logo && <img src={selectedTeam1.logo} alt="" className="w-10 h-10 object-contain" />}
              <span className="text-sm font-bold text-foreground">{selectedTeam1.name}</span>
            </div>
            <span className="text-xs font-bold text-muted-foreground">VS</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{selectedTeam2.name}</span>
              {selectedTeam2.logo && <img src={selectedTeam2.logo} alt="" className="w-10 h-10 object-contain" />}
            </div>
          </div>

          {/* Win Stats Bar */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{h2hStats.team1Wins} Vitórias</span>
              <span>{h2hStats.draws} Empates</span>
              <span>{h2hStats.team2Wins} Vitórias</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex">
              <div 
                className="bg-chart-positive h-full transition-all" 
                style={{ width: `${(h2hStats.team1Wins / h2hStats.totalMatches) * 100}%` }}
              />
              <div 
                className="bg-muted-foreground h-full transition-all" 
                style={{ width: `${(h2hStats.draws / h2hStats.totalMatches) * 100}%` }}
              />
              <div 
                className="bg-chart-negative h-full transition-all" 
                style={{ width: `${(h2hStats.team2Wins / h2hStats.totalMatches) * 100}%` }}
              />
            </div>
            <div className="text-center text-[10px] text-muted-foreground mt-2">
              {h2hStats.totalMatches} confrontos
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox
              icon={<Goal className="h-4 w-4" />}
              label="Média de Gols"
              value={h2hStats.avgGoals.toFixed(1)}
              subtext="por partida"
            />
            <StatBox
              icon={<TrendingUp className="h-4 w-4" />}
              label="Ambas Marcam"
              value={`${h2hStats.bttsPercent}%`}
              subtext="das partidas"
              highlight
            />
            <StatBox
              icon={<CornerUpRight className="h-4 w-4" />}
              label="Over 2.5"
              value={`${h2hStats.over25Percent}%`}
              subtext="das partidas"
            />
            <StatBox
              icon={<Square className="h-4 w-4" />}
              label="Clean Sheets"
              value={`${h2hStats.team1CleanSheets} x ${h2hStats.team2CleanSheets}`}
              subtext=""
            />
          </div>

          {/* Goals Comparison */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3">Gols Marcados H2H</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-right">
                <span className="text-2xl font-bold text-chart-positive">{h2hStats.team1Goals}</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex-1 text-left">
                <span className="text-2xl font-bold text-chart-negative">{h2hStats.team2Goals}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Selecione dois times para comparar</p>
        </div>
      )}
    </div>
  );
}

function TeamSelector({
  label,
  search,
  setSearch,
  selected,
  setSelected,
  filteredTeams
}: {
  label: string;
  search: string;
  setSearch: (s: string) => void;
  selected: { name: string; logo?: string } | null;
  setSelected: (t: { name: string; logo?: string } | null) => void;
  filteredTeams: { name: string; logo?: string }[];
}) {
  return (
    <div className="relative">
      <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{label}</label>
      {selected ? (
        <div
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 rounded-lg bg-card border border-neon/50 py-2 px-3 cursor-pointer hover:bg-surface transition-colors"
        >
          {selected.logo && <img src={selected.logo} alt="" className="w-5 h-5 object-contain" />}
          <span className="text-sm text-foreground truncate">{selected.name}</span>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar time..."
              className="w-full rounded-lg bg-surface border border-border py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon/50"
            />
          </div>
          {filteredTeams.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg bg-card border border-border shadow-lg max-h-40 overflow-auto">
              {filteredTeams.map((team) => (
                <button
                  key={team.name}
                  onClick={() => {
                    setSelected(team);
                    setSearch("");
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-surface transition-colors"
                >
                  {team.logo && <img src={team.logo} alt="" className="w-4 h-4 object-contain" />}
                  <span className="text-sm text-foreground truncate">{team.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ icon, label, value, subtext, highlight }: { icon: React.ReactNode; label: string; value: string; subtext: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? "bg-neon/10 border border-neon/30" : "bg-card border border-border"}`}>
      <div className={`flex items-center justify-center gap-1 ${highlight ? "text-neon" : "text-muted-foreground"} mb-1`}>
        {icon}
        <span className="text-[10px] font-semibold">{label}</span>
      </div>
      <div className={`text-xl font-bold ${highlight ? "text-neon" : "text-foreground"}`}>{value}</div>
      {subtext && <div className="text-[10px] text-muted-foreground">{subtext}</div>}
    </div>
  );
}

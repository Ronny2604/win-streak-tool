import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://api.the-odds-api.com/v4";

const DEFAULT_ODDS_API_KEY = "aea68609eb6c802ff8fa4173bf489ba9";

let cachedOddsApiKey = DEFAULT_ODDS_API_KEY;
let lastKeyFetchAt = 0;
const KEY_CACHE_TTL_MS = 60_000;

async function resolveOddsApiKey(): Promise<string> {
  const now = Date.now();
  if (now - lastKeyFetchAt < KEY_CACHE_TTL_MS && cachedOddsApiKey) return cachedOddsApiKey;
  try {
    const { data, error } = await supabase.rpc("get_app_setting", { _key: "odds_api_key" });
    if (!error && typeof data === "string" && data.trim()) {
      cachedOddsApiKey = data.trim();
    }
  } catch { /* keep fallback */ }
  lastKeyFetchAt = now;
  return cachedOddsApiKey || DEFAULT_ODDS_API_KEY;
}

export interface NBAGame {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  odds: { home: number; away: number } | null;
  bookmakerOdds: { bookmaker: string; home: number; away: number }[];
  scores: { home: number | null; away: number | null };
  status: "NS" | "LIVE" | "FT";
}

export interface NBAAnalysis {
  game: NBAGame;
  pick: "home" | "away";
  confidence: number;
  reasoning: string;
  edge: number; // value edge percentage
}

export interface NBATicket {
  id: string;
  name: string;
  type: "safe" | "moderate" | "aggressive";
  picks: { game: NBAGame; pick: "home" | "away"; label: string; odd: number; confidence: number; reasoning: string }[];
  totalOdd: number;
  confidence: number;
  suggestedStake: string;
  potentialReturn: string;
}

// NBA team logos from ESPN CDN
const NBA_LOGOS: Record<string, string> = {
  "Los Angeles Lakers": "https://a.espncdn.com/i/teamlogos/nba/500/lal.png",
  "Boston Celtics": "https://a.espncdn.com/i/teamlogos/nba/500/bos.png",
  "Golden State Warriors": "https://a.espncdn.com/i/teamlogos/nba/500/gs.png",
  "Milwaukee Bucks": "https://a.espncdn.com/i/teamlogos/nba/500/mil.png",
  "Phoenix Suns": "https://a.espncdn.com/i/teamlogos/nba/500/phx.png",
  "Denver Nuggets": "https://a.espncdn.com/i/teamlogos/nba/500/den.png",
  "Philadelphia 76ers": "https://a.espncdn.com/i/teamlogos/nba/500/phi.png",
  "Miami Heat": "https://a.espncdn.com/i/teamlogos/nba/500/mia.png",
  "New York Knicks": "https://a.espncdn.com/i/teamlogos/nba/500/ny.png",
  "Dallas Mavericks": "https://a.espncdn.com/i/teamlogos/nba/500/dal.png",
  "Cleveland Cavaliers": "https://a.espncdn.com/i/teamlogos/nba/500/cle.png",
  "Sacramento Kings": "https://a.espncdn.com/i/teamlogos/nba/500/sac.png",
  "Memphis Grizzlies": "https://a.espncdn.com/i/teamlogos/nba/500/mem.png",
  "Brooklyn Nets": "https://a.espncdn.com/i/teamlogos/nba/500/bkn.png",
  "Atlanta Hawks": "https://a.espncdn.com/i/teamlogos/nba/500/atl.png",
  "Chicago Bulls": "https://a.espncdn.com/i/teamlogos/nba/500/chi.png",
  "Toronto Raptors": "https://a.espncdn.com/i/teamlogos/nba/500/tor.png",
  "Minnesota Timberwolves": "https://a.espncdn.com/i/teamlogos/nba/500/min.png",
  "New Orleans Pelicans": "https://a.espncdn.com/i/teamlogos/nba/500/no.png",
  "Oklahoma City Thunder": "https://a.espncdn.com/i/teamlogos/nba/500/okc.png",
  "LA Clippers": "https://a.espncdn.com/i/teamlogos/nba/500/lac.png",
  "Indiana Pacers": "https://a.espncdn.com/i/teamlogos/nba/500/ind.png",
  "Orlando Magic": "https://a.espncdn.com/i/teamlogos/nba/500/orl.png",
  "Portland Trail Blazers": "https://a.espncdn.com/i/teamlogos/nba/500/por.png",
  "Utah Jazz": "https://a.espncdn.com/i/teamlogos/nba/500/uta.png",
  "Charlotte Hornets": "https://a.espncdn.com/i/teamlogos/nba/500/cha.png",
  "Houston Rockets": "https://a.espncdn.com/i/teamlogos/nba/500/hou.png",
  "San Antonio Spurs": "https://a.espncdn.com/i/teamlogos/nba/500/sa.png",
  "Detroit Pistons": "https://a.espncdn.com/i/teamlogos/nba/500/det.png",
  "Washington Wizards": "https://a.espncdn.com/i/teamlogos/nba/500/wsh.png",
};

function getTeamLogo(name: string): string {
  return NBA_LOGOS[name] ?? `https://a.espncdn.com/i/teamlogos/nba/500/default.png`;
}

export async function getNBAGames(): Promise<NBAGame[]> {
  // Check cache
  try {
    const { data: cached } = await supabase.rpc("get_cache", { _cache_key: "nba:games" });
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached as unknown as NBAGame[];
    }
  } catch { /* continue */ }

  const apiKey = await resolveOddsApiKey();

  try {
    const url = `${BASE_URL}/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us,eu&markets=h2h&oddsFormat=decimal`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const events = await res.json();

    const games: NBAGame[] = events.map((e: any) => {
      const bookmakerOdds: NBAGame["bookmakerOdds"] = [];
      let bestHome: number | null = null;
      let bestAway: number | null = null;

      for (const bk of e.bookmakers ?? []) {
        const h2h = bk.markets?.find((m: any) => m.key === "h2h");
        if (!h2h) continue;
        const homeOut = h2h.outcomes?.find((o: any) => o.name === e.home_team);
        const awayOut = h2h.outcomes?.find((o: any) => o.name === e.away_team);
        if (homeOut && awayOut) {
          bookmakerOdds.push({ bookmaker: bk.title, home: homeOut.price, away: awayOut.price });
          if (!bestHome || homeOut.price > bestHome) bestHome = homeOut.price;
          if (!bestAway || awayOut.price > bestAway) bestAway = awayOut.price;
        }
      }

      const firstBk = bookmakerOdds[0];

      return {
        id: e.id,
        date: e.commence_time,
        homeTeam: e.home_team,
        awayTeam: e.away_team,
        homeLogo: getTeamLogo(e.home_team),
        awayLogo: getTeamLogo(e.away_team),
        odds: firstBk ? { home: firstBk.home, away: firstBk.away } : null,
        bookmakerOdds,
        scores: {
          home: e.scores?.find((s: any) => s.name === e.home_team)?.score ? parseInt(e.scores.find((s: any) => s.name === e.home_team).score) : null,
          away: e.scores?.find((s: any) => s.name === e.away_team)?.score ? parseInt(e.scores.find((s: any) => s.name === e.away_team).score) : null,
        },
        status: e.completed ? "FT" : new Date(e.commence_time) <= new Date() ? "LIVE" : "NS",
      } satisfies NBAGame;
    });

    // Cache for 5 min
    try {
      await supabase.rpc("set_cache", {
        _cache_key: "nba:games",
        _data: JSON.parse(JSON.stringify(games)),
        _ttl_seconds: 300,
      });
    } catch { /* ok */ }

    return games;
  } catch {
    return [];
  }
}

export function analyzeNBAGames(games: NBAGame[]): NBAAnalysis[] {
  return games
    .filter((g) => g.odds && g.status === "NS")
    .map((game) => {
      const { home, away } = game.odds!;
      const homeProb = (1 / home) * 100;
      const awayProb = (1 / away) * 100;
      const totalProb = homeProb + awayProb;
      const trueHome = (homeProb / totalProb) * 100;
      const trueAway = (awayProb / totalProb) * 100;

      const pick = trueHome >= trueAway ? "home" as const : "away" as const;
      const selectedProb = pick === "home" ? trueHome : trueAway;
      const selectedOdd = pick === "home" ? home : away;
      const fairOdd = 100 / selectedProb;
      const edge = ((selectedOdd - fairOdd) / fairOdd) * 100;

      return {
        game,
        pick,
        confidence: Math.min(95, Math.round(selectedProb * 0.9)),
        reasoning: pick === "home"
          ? `${game.homeTeam} favorito em casa (${trueHome.toFixed(0)}% prob. real)`
          : `${game.awayTeam} favorito fora (${trueAway.toFixed(0)}% prob. real)`,
        edge: Math.round(edge * 100) / 100,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}

export function generateNBATickets(games: NBAGame[]): NBATicket[] {
  const analyses = analyzeNBAGames(games);
  if (analyses.length === 0) return [];

  const tickets: NBATicket[] = [];

  // Safe ticket - top 2-3 highest confidence
  const safePicks = analyses.filter((a) => a.confidence >= 60).slice(0, 3);
  if (safePicks.length >= 2) {
    const totalOdd = safePicks.reduce((acc, a) => acc * (a.pick === "home" ? a.game.odds!.home : a.game.odds!.away), 1);
    tickets.push({
      id: `NBA-S-${Date.now().toString(36)}`,
      name: "🏀 NBA Seguro",
      type: "safe",
      picks: safePicks.map((a) => ({
        game: a.game,
        pick: a.pick,
        label: a.pick === "home" ? `${a.game.homeTeam} vence` : `${a.game.awayTeam} vence`,
        odd: a.pick === "home" ? a.game.odds!.home : a.game.odds!.away,
        confidence: a.confidence,
        reasoning: a.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(safePicks.reduce((s, a) => s + a.confidence, 0) / safePicks.length),
      suggestedStake: "R$ 50,00",
      potentialReturn: `R$ ${(50 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  // Moderate
  const modPicks = analyses.filter((a) => a.confidence >= 45).slice(0, 4);
  if (modPicks.length >= 3) {
    const totalOdd = modPicks.reduce((acc, a) => acc * (a.pick === "home" ? a.game.odds!.home : a.game.odds!.away), 1);
    tickets.push({
      id: `NBA-M-${Date.now().toString(36)}`,
      name: "🏀 NBA Moderado",
      type: "moderate",
      picks: modPicks.map((a) => ({
        game: a.game,
        pick: a.pick,
        label: a.pick === "home" ? `${a.game.homeTeam} vence` : `${a.game.awayTeam} vence`,
        odd: a.pick === "home" ? a.game.odds!.home : a.game.odds!.away,
        confidence: a.confidence,
        reasoning: a.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(modPicks.reduce((s, a) => s + a.confidence, 0) / modPicks.length),
      suggestedStake: "R$ 25,00",
      potentialReturn: `R$ ${(25 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  // Aggressive
  const aggPicks = analyses.filter((a) => {
    const odd = a.pick === "home" ? a.game.odds!.home : a.game.odds!.away;
    return odd >= 1.8;
  }).slice(0, 5);
  if (aggPicks.length >= 3) {
    const totalOdd = aggPicks.reduce((acc, a) => acc * (a.pick === "home" ? a.game.odds!.home : a.game.odds!.away), 1);
    tickets.push({
      id: `NBA-A-${Date.now().toString(36)}`,
      name: "🏀 NBA Agressivo",
      type: "aggressive",
      picks: aggPicks.map((a) => ({
        game: a.game,
        pick: a.pick,
        label: a.pick === "home" ? `${a.game.homeTeam} vence` : `${a.game.awayTeam} vence`,
        odd: a.pick === "home" ? a.game.odds!.home : a.game.odds!.away,
        confidence: a.confidence,
        reasoning: a.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(aggPicks.reduce((s, a) => s + a.confidence, 0) / aggPicks.length),
      suggestedStake: "R$ 10,00",
      potentialReturn: `R$ ${(10 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  return tickets;
}

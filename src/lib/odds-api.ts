import { supabase } from "@/integrations/supabase/client";

const DEFAULT_ODDS_API_KEY = "aea68609eb6c802ff8fa4173bf489ba9";
const BASE_URL = "https://api.the-odds-api.com/v4";

export interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  scores?: { name: string; score: string }[] | null;
  completed?: boolean;
  bookmakers?: Bookmaker[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

interface Market {
  key: string;
  outcomes: { name: string; price: number }[];
}

export interface NormalizedFixture {
  id: string;
  date: string;
  status: { short: string; long: string; elapsed?: number };
  league: { name: string; country: string; logo: string };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  odds?: { home: string; draw: string; away: string } | null;
}

const SPORT_LOGOS: Record<string, string> = {
  soccer_epl: "https://media.api-sports.io/football/leagues/39.png",
  soccer_spain_la_liga: "https://media.api-sports.io/football/leagues/140.png",
  soccer_italy_serie_a: "https://media.api-sports.io/football/leagues/135.png",
  soccer_germany_bundesliga: "https://media.api-sports.io/football/leagues/78.png",
  soccer_france_ligue_one: "https://media.api-sports.io/football/leagues/61.png",
  soccer_brazil_campeonato: "https://media.api-sports.io/football/leagues/71.png",
  soccer_uefa_champs_league: "https://media.api-sports.io/football/leagues/2.png",
};

const SPORT_COUNTRIES: Record<string, string> = {
  soccer_epl: "England",
  soccer_spain_la_liga: "Spain",
  soccer_italy_serie_a: "Italy",
  soccer_germany_bundesliga: "Germany",
  soccer_france_ligue_one: "France",
  soccer_brazil_campeonato: "Brazil",
  soccer_uefa_champs_league: "World",
};

// API-Football league IDs for the leagues we support
const API_FOOTBALL_LEAGUES: Array<{ id: number; name: string; country: string; logo: string; season: number }> = [
  { id: 39,  name: "Premier League",    country: "England", logo: "https://media.api-sports.io/football/leagues/39.png",  season: 2024 },
  { id: 140, name: "La Liga",           country: "Spain",   logo: "https://media.api-sports.io/football/leagues/140.png", season: 2024 },
  { id: 135, name: "Serie A",           country: "Italy",   logo: "https://media.api-sports.io/football/leagues/135.png", season: 2024 },
  { id: 78,  name: "Bundesliga",        country: "Germany", logo: "https://media.api-sports.io/football/leagues/78.png",  season: 2024 },
  { id: 61,  name: "Ligue 1",           country: "France",  logo: "https://media.api-sports.io/football/leagues/61.png",  season: 2024 },
  { id: 71,  name: "Brasileirão",       country: "Brazil",  logo: "https://media.api-sports.io/football/leagues/71.png",  season: 2025 },
  { id: 2,   name: "Champions League",  country: "World",   logo: "https://media.api-sports.io/football/leagues/2.png",   season: 2024 },
];

export const LEAGUES = [
  { id: "soccer_epl", name: "Premier League", country: "England" },
  { id: "soccer_spain_la_liga", name: "La Liga", country: "Spain" },
  { id: "soccer_italy_serie_a", name: "Serie A", country: "Italy" },
  { id: "soccer_germany_bundesliga", name: "Bundesliga", country: "Germany" },
  { id: "soccer_france_ligue_one", name: "Ligue 1", country: "France" },
  { id: "soccer_brazil_campeonato", name: "Brasileirão", country: "Brazil" },
  { id: "soccer_uefa_champs_league", name: "Champions League", country: "World" },
];

// Map our sport key IDs to API-Football league IDs
const SPORT_KEY_TO_LEAGUE_ID: Record<string, number> = {
  soccer_epl: 39,
  soccer_spain_la_liga: 140,
  soccer_italy_serie_a: 135,
  soccer_germany_bundesliga: 78,
  soccer_france_ligue_one: 61,
  soccer_brazil_campeonato: 71,
  soccer_uefa_champs_league: 2,
};

let cachedOddsApiKey = DEFAULT_ODDS_API_KEY;
let lastKeyFetchAt = 0;
const KEY_CACHE_TTL_MS = 60 * 1000;

// Cache TTLs in seconds
const ODDS_CACHE_TTL = 300;   // 5 min for odds/fixtures
const LIVE_CACHE_TTL = 60;    // 1 min for live scores

async function getCache(key: string): Promise<NormalizedFixture[] | null> {
  try {
    const { data, error } = await supabase.rpc("get_cache", { _cache_key: key });
    if (error || !data) return null;
    return data as unknown as NormalizedFixture[];
  } catch {
    return null;
  }
}

async function setCache(key: string, fixtures: NormalizedFixture[], ttlSeconds: number): Promise<void> {
  try {
    await supabase.rpc("set_cache", {
      _cache_key: key,
      _data: JSON.parse(JSON.stringify(fixtures)),
      _ttl_seconds: ttlSeconds,
    });
  } catch (err) {
    console.warn("Failed to set cache:", err);
  }
}

async function resolveOddsApiKey(): Promise<string> {
  const now = Date.now();
  if (now - lastKeyFetchAt < KEY_CACHE_TTL_MS && cachedOddsApiKey) return cachedOddsApiKey;

  try {
    const { data, error } = await supabase.rpc("get_app_setting", { _key: "odds_api_key" });
    if (!error && typeof data === "string" && data.trim()) {
      cachedOddsApiKey = data.trim();
    }
  } catch {
    // keep fallback key
  }

  lastKeyFetchAt = now;
  return cachedOddsApiKey || DEFAULT_ODDS_API_KEY;
}

function extractOdds(bookmakers?: Bookmaker[]): { home: string; draw: string; away: string } | null {
  if (!bookmakers || bookmakers.length === 0) return null;
  const h2h = bookmakers[0]?.markets?.find((m) => m.key === "h2h");
  if (!h2h || h2h.outcomes.length < 3) return null;
  const home = h2h.outcomes.find((o) => o.name !== "Draw");
  const draw = h2h.outcomes.find((o) => o.name === "Draw");
  const away = h2h.outcomes.filter((o) => o.name !== "Draw")[1];
  return {
    home: home?.price?.toFixed(2) ?? "-",
    draw: draw?.price?.toFixed(2) ?? "-",
    away: away?.price?.toFixed(2) ?? "-",
  };
}

function normalizeOddsEvent(event: OddsEvent, sportKey: string): NormalizedFixture {
  const homeScore = event.scores?.find((s) => s.name === event.home_team);
  const awayScore = event.scores?.find((s) => s.name === event.away_team);
  const now = new Date();
  const commence = new Date(event.commence_time);
  const isLive = commence <= now && !event.completed;
  const isFinished = event.completed === true;

  return {
    id: event.id,
    date: event.commence_time,
    status: {
      short: isLive ? "LIVE" : isFinished ? "FT" : "NS",
      long: isLive ? "In Play" : isFinished ? "Match Finished" : "Not Started",
    },
    league: {
      name: SPORT_LOGOS[sportKey] ? sportKey.replace(/soccer_/g, "").replace(/_/g, " ") : sportKey,
      country: SPORT_COUNTRIES[sportKey] ?? "",
      logo: SPORT_LOGOS[sportKey] ?? "",
    },
    teams: {
      home: { name: event.home_team, logo: "" },
      away: { name: event.away_team, logo: "" },
    },
    goals: {
      home: homeScore ? parseInt(homeScore.score) : null,
      away: awayScore ? parseInt(awayScore.score) : null,
    },
    odds: extractOdds(event.bookmakers),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeApiFootballFixture(fixture: any, leagueInfo: typeof API_FOOTBALL_LEAGUES[0]): NormalizedFixture {
  const statusMap: Record<string, string> = {
    "1H": "LIVE", "HT": "LIVE", "2H": "LIVE", "ET": "LIVE", "BT": "LIVE", "P": "LIVE",
    "LIVE": "LIVE", "FT": "FT", "AET": "FT", "PEN": "FT", "NS": "NS",
  };

  const short = statusMap[fixture.fixture?.status?.short] ?? fixture.fixture?.status?.short ?? "NS";

  const homeGoals = fixture.goals?.home;
  const awayGoals = fixture.goals?.away;

  // Build odds from bookmakers if available
  let odds: NormalizedFixture["odds"] = null;
  const bk = fixture.odds?.bookmakers?.[0]?.bets?.find((b: { name: string }) => b.name === "Match Winner");
  if (bk) {
    const homeOdd = bk.values?.find((v: { value: string }) => v.value === "Home")?.odd;
    const drawOdd = bk.values?.find((v: { value: string }) => v.value === "Draw")?.odd;
    const awayOdd = bk.values?.find((v: { value: string }) => v.value === "Away")?.odd;
    if (homeOdd && drawOdd && awayOdd) {
      odds = { home: homeOdd, draw: drawOdd, away: awayOdd };
    }
  }

  return {
    id: String(fixture.fixture?.id),
    date: fixture.fixture?.date,
    status: {
      short,
      long: fixture.fixture?.status?.long ?? "",
      elapsed: fixture.fixture?.status?.elapsed ?? undefined,
    },
    league: {
      name: leagueInfo.name,
      country: leagueInfo.country,
      logo: leagueInfo.logo,
    },
    teams: {
      home: {
        name: fixture.teams?.home?.name ?? "",
        logo: fixture.teams?.home?.logo ?? "",
      },
      away: {
        name: fixture.teams?.away?.name ?? "",
        logo: fixture.teams?.away?.logo ?? "",
      },
    },
    goals: {
      home: homeGoals ?? null,
      away: awayGoals ?? null,
    },
    odds,
  };
}

async function fetchFromApiFootball(leagueId?: number): Promise<NormalizedFixture[]> {
  const leagues = leagueId
    ? API_FOOTBALL_LEAGUES.filter((l) => l.id === leagueId)
    : API_FOOTBALL_LEAGUES;

  const results: NormalizedFixture[] = [];

  for (const league of leagues) {
    try {
      const { data, error } = await supabase.functions.invoke("football-stats", {
        body: { action: "fixtures_by_date", leagueId: league.id, season: league.season },
      });
      if (error) {
        console.warn(`API-Football error for league ${league.id}:`, error);
        continue;
      }
      const fixtures = data?.data ?? [];
      const normalized = fixtures.map((f: unknown) => normalizeApiFootballFixture(f, league));
      results.push(...normalized);
    } catch (err) {
      console.warn(`Failed to fetch league ${league.id}:`, err);
    }
  }

  return results;
}

async function tryOddsApi(sportKey: string, apiKey: string): Promise<NormalizedFixture[]> {
  try {
    const url = `${BASE_URL}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const events: OddsEvent[] = await res.json();
    return events.map((e) => normalizeOddsEvent(e, sportKey));
  } catch {
    return [];
  }
}

export async function getSoccerOdds(sportKey?: string): Promise<NormalizedFixture[]> {
  const apiKey = await resolveOddsApiKey();

  // Try Odds API first for a single league
  if (sportKey) {
    const oddsResults = await tryOddsApi(sportKey, apiKey);
    if (oddsResults.length > 0) return oddsResults;
    // Fallback to API-Football for that specific league
    const leagueId = SPORT_KEY_TO_LEAGUE_ID[sportKey];
    return fetchFromApiFootball(leagueId);
  }

  // For all leagues: try Odds API for one sport key as a probe
  const probe = await tryOddsApi("soccer_epl", apiKey);
  if (probe.length > 0) {
    // Odds API is working — fetch all leagues
    const sports = LEAGUES.map((l) => l.id);
    const fetches = sports.map((sport) => tryOddsApi(sport, apiKey));
    const allResults = await Promise.all(fetches);
    const results: NormalizedFixture[] = [];
    allResults.forEach((r) => results.push(...r));
    results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return results;
  }

  // Odds API is out of credits — use API-Football
  const results = await fetchFromApiFootball();
  results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return results;
}

export async function getLiveScores(sportKey?: string): Promise<NormalizedFixture[]> {
  const apiKey = await resolveOddsApiKey();

  // Try Odds API first
  const sports = sportKey ? [sportKey] : LEAGUES.map((l) => l.id);
  const results: NormalizedFixture[] = [];

  let oddsWorking = false;
  const fetches = sports.map(async (sport) => {
    try {
      const url = `${BASE_URL}/sports/${sport}/scores/?apiKey=${apiKey}&daysFrom=1`;
      const res = await fetch(url);
      if (!res.ok) return [];
      oddsWorking = true;
      const events: OddsEvent[] = await res.json();
      return events.filter((e) => !e.completed).map((e) => normalizeOddsEvent(e, sport));
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(fetches);
  allResults.forEach((r) => results.push(...r));

  if (!oddsWorking || results.length === 0) {
    // Fallback to API-Football live fixtures
    const leagueId = sportKey ? SPORT_KEY_TO_LEAGUE_ID[sportKey] : undefined;
    const live = await fetchFromApiFootball(leagueId);
    const liveOnly = live.filter((f) => f.status.short === "LIVE");
    return liveOnly.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return results;
}


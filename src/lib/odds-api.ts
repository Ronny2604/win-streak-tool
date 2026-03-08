const API_KEY = "d28a1069bc56332e46147be343abb995";
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
  soccer_brazil_serie_a: "Brazil",
  soccer_uefa_champs_league: "World",
};

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

function normalizeEvent(event: OddsEvent, sportKey: string): NormalizedFixture {
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

export const LEAGUES = [
  { id: "soccer_epl", name: "Premier League", country: "England" },
  { id: "soccer_spain_la_liga", name: "La Liga", country: "Spain" },
  { id: "soccer_italy_serie_a", name: "Serie A", country: "Italy" },
  { id: "soccer_germany_bundesliga", name: "Bundesliga", country: "Germany" },
  { id: "soccer_france_ligue_one", name: "Ligue 1", country: "France" },
  { id: "soccer_brazil_campeonato", name: "Brasileirão", country: "Brazil" },
  { id: "soccer_uefa_champs_league", name: "Champions League", country: "World" },
];

export async function getSoccerOdds(sportKey?: string): Promise<NormalizedFixture[]> {
  const sports = sportKey ? [sportKey] : LEAGUES.map((l) => l.id);
  const results: NormalizedFixture[] = [];

  const fetches = sports.map(async (sport) => {
    try {
      const url = `${BASE_URL}/sports/${sport}/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Odds API error for ${sport}: ${res.status}`);
        return [];
      }
      const events: OddsEvent[] = await res.json();
      return events.map((e) => normalizeEvent(e, sport));
    } catch (err) {
      console.warn(`Failed to fetch ${sport}:`, err);
      return [];
    }
  });

  const allResults = await Promise.all(fetches);
  allResults.forEach((r) => results.push(...r));

  // Sort by commence time
  results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return results;
}

export async function getLiveScores(sportKey?: string): Promise<NormalizedFixture[]> {
  const sports = sportKey ? [sportKey] : LEAGUES.map((l) => l.id);
  const results: NormalizedFixture[] = [];

  const fetches = sports.map(async (sport) => {
    try {
      const url = `${BASE_URL}/sports/${sport}/scores/?apiKey=${API_KEY}&daysFrom=1`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const events: OddsEvent[] = await res.json();
      return events
        .filter((e) => !e.completed)
        .map((e) => normalizeEvent(e, sport));
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(fetches);
  allResults.forEach((r) => results.push(...r));
  results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return results;
}

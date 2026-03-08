const API_KEY = "d28a1069bc56332e46147be343abb995";
const BASE_URL = "https://v3.football.api-sports.io";

interface ApiOptions {
  endpoint: string;
  params?: Record<string, string>;
}

export async function fetchFootballApi<T>({ endpoint, params }: ApiOptions): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": API_KEY,
    },
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export interface Fixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
}

export interface OddValue {
  value: string;
  odd: string;
}

export interface OddBet {
  id: number;
  name: string;
  values: OddValue[];
}

export interface OddResponse {
  league: { id: number; name: string };
  fixture: { id: number };
  bookmakers: {
    id: number;
    name: string;
    bets: OddBet[];
  }[];
}

export async function getTodayFixtures(league?: string) {
  const today = new Date().toISOString().split("T")[0];
  const params: Record<string, string> = { date: today };
  if (league) params.league = league;
  params.season = "2024";

  return fetchFootballApi<{ response: Fixture[] }>({
    endpoint: "/fixtures",
    params,
  });
}

export async function getFixtureOdds(fixtureId: number) {
  return fetchFootballApi<{ response: OddResponse[] }>({
    endpoint: "/odds",
    params: { fixture: fixtureId.toString() },
  });
}

export async function getLiveFixtures() {
  return fetchFootballApi<{ response: Fixture[] }>({
    endpoint: "/fixtures",
    params: { live: "all" },
  });
}

// Popular leagues
export const LEAGUES = [
  { id: "39", name: "Premier League", country: "England" },
  { id: "140", name: "La Liga", country: "Spain" },
  { id: "135", name: "Serie A", country: "Italy" },
  { id: "78", name: "Bundesliga", country: "Germany" },
  { id: "61", name: "Ligue 1", country: "France" },
  { id: "71", name: "Serie A", country: "Brazil" },
  { id: "2", name: "Champions League", country: "World" },
];

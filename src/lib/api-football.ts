const API_KEY = "d28a1069bc56332e46147be343abb995";
const BASE_URL = "https://v3.football.api-sports.io";

async function fetchFootballApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY },
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export interface SofaFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed?: number };
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

export async function getTodayFixtures(league?: string) {
  const today = new Date().toISOString().split("T")[0];
  const params: Record<string, string> = { date: today };
  if (league) { params.league = league; params.season = "2024"; }

  return fetchFootballApi<{ response: SofaFixture[] }>("/fixtures", params);
}

export async function getLiveFixtures() {
  return fetchFootballApi<{ response: SofaFixture[] }>("/fixtures", { live: "all" });
}

export async function getFixtureOdds(fixtureId: number) {
  return fetchFootballApi<{ response: any[] }>("/odds", { fixture: fixtureId.toString() });
}

export async function getFixturePredictions(fixtureId: number) {
  return fetchFootballApi<{ response: any[] }>("/predictions", { fixture: fixtureId.toString() });
}

export const LEAGUES = [
  { id: "39", name: "Premier League", country: "England" },
  { id: "140", name: "La Liga", country: "Spain" },
  { id: "135", name: "Serie A", country: "Italy" },
  { id: "78", name: "Bundesliga", country: "Germany" },
  { id: "61", name: "Ligue 1", country: "France" },
  { id: "71", name: "Brasileirão", country: "Brazil" },
  { id: "2", name: "Champions League", country: "World" },
];

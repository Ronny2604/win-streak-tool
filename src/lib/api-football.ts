import { supabase } from "@/integrations/supabase/client";

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

export interface OddValue {
  value: string;
  odd: string;
}

export interface Prediction {
  predictions: {
    winner: { id: number; name: string; comment: string };
    advice: string;
    percent: { home: string; draw: string; away: string };
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
}

async function callProxy(params: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("sofascore-proxy", {
    method: "GET",
    body: null,
    headers: {},
  });

  // supabase.functions.invoke doesn't support query params well for GET,
  // so we'll use fetch directly
  const projectId = import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0];
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sofascore-proxy`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}

export async function getTodayFixtures(league?: string) {
  const params: Record<string, string> = { action: 'today' };
  if (league) params.league = league;
  return callProxy(params) as Promise<{ response: SofaFixture[] }>;
}

export async function getLiveFixtures() {
  return callProxy({ action: 'live' }) as Promise<{ response: SofaFixture[] }>;
}

export async function getFixtureOdds(fixtureId: number) {
  return callProxy({ action: 'odds', fixtureId: fixtureId.toString() });
}

export async function getFixturePredictions(fixtureId: number) {
  return callProxy({ action: 'predictions', fixtureId: fixtureId.toString() }) as Promise<{ response: Prediction[] }>;
}

export async function getH2H(team1Id: number, team2Id: number) {
  return callProxy({ action: 'h2h', h2h: `${team1Id}-${team2Id}` });
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

import { supabase } from "@/integrations/supabase/client";

export interface TeamStats {
  cards: {
    yellow: Record<string, { total: number | null; percentage: string | null }>;
    red: Record<string, { total: number | null; percentage: string | null }>;
  } | null;
  fixtures: {
    played: { home: number; away: number; total: number };
    wins: { home: number; away: number; total: number };
    draws: { home: number; away: number; total: number };
    loses: { home: number; away: number; total: number };
  } | null;
  goals: {
    for: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
    };
    against: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
    };
  } | null;
  form: string | null;
  clean_sheet: { home: number; away: number; total: number } | null;
}

export interface FixtureStats {
  team: { id: number; name: string; logo: string };
  statistics: Array<{ type: string; value: number | string | null }>;
}

const statsCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function callEdge(body: Record<string, unknown>): Promise<unknown> {
  const key = JSON.stringify(body);
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const { data, error } = await supabase.functions.invoke("football-stats", {
    body,
  });

  if (error) throw error;
  const result = data?.data;
  statsCache.set(key, { data: result, ts: Date.now() });
  return result;
}

export async function searchTeam(name: string): Promise<{ id: number; name: string; logo: string } | null> {
  try {
    const result = (await callEdge({ action: "search_team", teamId: name })) as Array<{
      team: { id: number; name: string; logo: string };
    }>;
    if (!result || result.length === 0) return null;
    // Find exact or closest match
    const exact = result.find((r) => r.team.name.toLowerCase() === name.toLowerCase());
    return exact?.team ?? result[0]?.team ?? null;
  } catch {
    return null;
  }
}

export async function getTeamStats(teamId: number, leagueId: number, season = 2024): Promise<TeamStats | null> {
  try {
    return (await callEdge({ action: "team_statistics", teamId, leagueId, season })) as TeamStats;
  } catch {
    return null;
  }
}

export async function getFixtureStatistics(fixtureId: number): Promise<FixtureStats[] | null> {
  try {
    return (await callEdge({ action: "fixture_statistics", fixtureId })) as FixtureStats[];
  } catch {
    return null;
  }
}

// Helper to count total yellow cards from the cards distribution
export function countYellowCards(cards: TeamStats["cards"]): number {
  if (!cards?.yellow) return 0;
  return Object.values(cards.yellow).reduce((sum, v) => sum + (v.total ?? 0), 0);
}

export function countRedCards(cards: TeamStats["cards"]): number {
  if (!cards?.red) return 0;
  return Object.values(cards.red).reduce((sum, v) => sum + (v.total ?? 0), 0);
}

export function getFormArray(form: string | null): string[] {
  if (!form) return [];
  return form.slice(-5).split("");
}

export function getCardAvgPerMatch(cards: TeamStats["cards"], played: number): number {
  if (!cards || played === 0) return 0;
  const total = countYellowCards(cards) + countRedCards(cards);
  return +(total / played).toFixed(1);
}

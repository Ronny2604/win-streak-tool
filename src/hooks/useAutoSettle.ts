import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedFixture } from "@/lib/odds-api";
import type { SavedTicket } from "@/hooks/useSavedTickets";

type BetType = "home" | "draw" | "away" | "double_home_draw" | "double_away_draw" | "double_home_away";

const BET_TYPE_MAP: Record<string, BetType> = {
  "home": "home",
  "draw": "draw",
  "away": "away",
  "double_home_draw": "double_home_draw",
  "double_away_draw": "double_away_draw",
  "double_home_away": "double_home_away",
  "vitória casa": "home",
  "vitoria casa": "home",
  "casa": "home",
  "empate": "draw",
  "vitória fora": "away",
  "vitoria fora": "away",
  "fora": "away",
  "casa ou empate": "double_home_draw",
  "fora ou empate": "double_away_draw",
  "casa ou fora": "double_home_away",
};

function resolveBetType(raw: string): BetType | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return BET_TYPE_MAP[key] ?? null;
}

function didBetWin(betType: BetType, homeGoals: number, awayGoals: number): boolean {
  const homeWin = homeGoals > awayGoals;
  const draw = homeGoals === awayGoals;
  const awayWin = awayGoals > homeGoals;

  switch (betType) {
    case "home": return homeWin;
    case "draw": return draw;
    case "away": return awayWin;
    case "double_home_draw": return homeWin || draw;
    case "double_away_draw": return awayWin || draw;
    case "double_home_away": return homeWin || awayWin;
    default: return false;
  }
}

function cleanName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|ac|rc|as|ss|us|afc|club|cd|ud|sporting|athletic|atletico)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const ca = cleanName(a);
  const cb = cleanName(b);
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  // Token-based: check if all tokens of shorter name exist in longer
  const tokensA = ca.split(" ").filter(t => t.length > 2);
  const tokensB = cb.split(" ").filter(t => t.length > 2);
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, cb] : [tokensB, ca];
  if (shorter.length > 0 && shorter.every(token => longer.includes(token))) return true;
  return false;
}

function extractTeamNames(sel: any): { home: string; away: string } | null {
  // Format 1: sel.fixture.teams.home.name (from ticket-generator)
  if (sel.fixture?.teams?.home?.name && sel.fixture?.teams?.away?.name) {
    return { home: sel.fixture.teams.home.name, away: sel.fixture.teams.away.name };
  }
  // Format 2: sel.fixture as string "TeamA vs TeamB" (from MultiBetBuilder)
  if (typeof sel.fixture === "string" && sel.fixture.includes(" vs ")) {
    const [home, away] = sel.fixture.split(" vs ");
    return { home: home.trim(), away: away.trim() };
  }
  // Format 3: sel.homeName / sel.awayName
  if (sel.homeName && sel.awayName) {
    return { home: sel.homeName, away: sel.awayName };
  }
  return null;
}

function extractBetType(sel: any): BetType | null {
  // Try betType field first
  if (sel.betType) {
    const resolved = resolveBetType(sel.betType);
    if (resolved) return resolved;
  }
  // Try label field
  if (sel.label) {
    const resolved = resolveBetType(sel.label);
    if (resolved) return resolved;
  }
  // Try bet field (MultiBetBuilder format)
  if (sel.bet) {
    const bet = sel.bet.toLowerCase();
    if (bet.includes("(casa)") || bet.includes("home")) return "home";
    if (bet.includes("empate") || bet.includes("draw")) return "draw";
    if (bet.includes("(fora)") || bet.includes("away")) return "away";
  }
  return null;
}

export function useAutoSettle(
  fixtures: NormalizedFixture[] | undefined,
  tickets: SavedTicket[]
) {
  const queryClient = useQueryClient();

  const settle = useCallback(async () => {
    if (!fixtures || fixtures.length === 0 || tickets.length === 0) return;

    const finished = fixtures.filter(f => f.status.short === "FT" && f.goals.home !== null && f.goals.away !== null);
    if (finished.length === 0) return;

    const pending = tickets.filter(t => t.result === "pending");
    if (pending.length === 0) return;

    let settledCount = 0;

    for (const ticket of pending) {
      const selections = Array.isArray(ticket.selections) ? ticket.selections : [];
      if (selections.length === 0) continue;

      let allSettled = true;
      let allWon = true;

      for (const sel of selections) {
        const teams = extractTeamNames(sel);
        if (!teams) { allSettled = false; continue; }

        const betType = extractBetType(sel);
        if (!betType) { allSettled = false; continue; }

        const match = finished.find(f =>
          teamsMatch(f.teams.home.name, teams.home) && teamsMatch(f.teams.away.name, teams.away)
        );

        if (!match) {
          allSettled = false;
          continue;
        }

        const won = didBetWin(betType, match.goals.home!, match.goals.away!);
        if (!won) allWon = false;
      }

      if (allSettled) {
        const result = allWon ? "green" : "red";
        try {
          await supabase
            .from("saved_tickets")
            .update({ result })
            .eq("id", ticket.id);
          settledCount++;
        } catch (err) {
          console.warn("Auto-settle error:", err);
        }
      }
    }

    if (settledCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["saved-tickets"] });
    }
  }, [fixtures, tickets, queryClient]);

  useEffect(() => {
    settle();
  }, [settle]);
}

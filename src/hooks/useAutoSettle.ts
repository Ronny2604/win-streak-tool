import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedFixture } from "@/lib/odds-api";
import type { SavedTicket } from "@/hooks/useSavedTickets";

type BetType = "home" | "draw" | "away" | "double_home_draw" | "double_away_draw" | "double_home_away";

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

function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/fc |cf |sc |ac |rc |as |ss |us |afc /gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function useAutoSettle(
  fixtures: NormalizedFixture[] | undefined,
  tickets: SavedTicket[]
) {
  const queryClient = useQueryClient();

  const settle = useCallback(async () => {
    if (!fixtures || fixtures.length === 0 || tickets.length === 0) return;

    // Only look at finished matches
    const finished = fixtures.filter(f => f.status.short === "FT" && f.goals.home !== null && f.goals.away !== null);
    if (finished.length === 0) return;

    // Only process pending tickets
    const pending = tickets.filter(t => t.result === "pending");
    if (pending.length === 0) return;

    for (const ticket of pending) {
      const selections = Array.isArray(ticket.selections) ? ticket.selections : [];
      if (selections.length === 0) continue;

      let allSettled = true;
      let allWon = true;

      for (const sel of selections) {
        const homeName = sel.fixture?.teams?.home?.name;
        const awayName = sel.fixture?.teams?.away?.name;
        if (!homeName || !awayName) { allSettled = false; continue; }

        // Find matching finished fixture
        const match = finished.find(f =>
          teamsMatch(f.teams.home.name, homeName) && teamsMatch(f.teams.away.name, awayName)
        );

        if (!match) {
          allSettled = false;
          continue;
        }

        const won = didBetWin(sel.betType as BetType, match.goals.home!, match.goals.away!);
        if (!won) allWon = false;
      }

      // Only auto-settle if ALL selections have finished matches
      if (allSettled) {
        const result = allWon ? "green" : "red";
        try {
          await supabase
            .from("saved_tickets")
            .update({ result })
            .eq("id", ticket.id);
        } catch (err) {
          console.warn("Auto-settle error:", err);
        }
      }
    }

    // Refresh tickets data
    queryClient.invalidateQueries({ queryKey: ["saved-tickets"] });
  }, [fixtures, tickets, queryClient]);

  useEffect(() => {
    settle();
  }, [settle]);
}

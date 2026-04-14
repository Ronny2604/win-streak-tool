import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getCompletedScores, type NormalizedFixture } from "@/lib/odds-api";
import type { SavedTicket } from "@/hooks/useSavedTickets";
import { toast } from "sonner";
import {
  type BetType,
  resolveBetType,
  didBetWin,
  teamsMatch,
  extractTeamNames,
  extractBetType,
} from "@/lib/bet-resolver";

// ─── Selection result type (for per-selection status) ───────

export interface SelectionResult {
  index: number;
  teams: string;
  betType: string;
  result: "green" | "red" | "pending";
  score?: string;
}

export function analyzeTicketSelections(
  ticket: SavedTicket,
  finished: NormalizedFixture[]
): SelectionResult[] {
  const selections = Array.isArray(ticket.selections) ? ticket.selections : [];
  return selections.map((sel: any, i: number) => {
    const teams = extractTeamNames(sel);
    const betType = extractBetType(sel);

    if (!teams || !betType) {
      return {
        index: i,
        teams: teams ? `${teams.home} vs ${teams.away}` : "Desconhecido",
        betType: betType ?? sel.label ?? sel.betType ?? "?",
        result: "pending" as const,
      };
    }

    const match = finished.find(
      (f) => teamsMatch(f.teams.home.name, teams.home) && teamsMatch(f.teams.away.name, teams.away)
    );

    if (!match) {
      return {
        index: i,
        teams: `${teams.home} vs ${teams.away}`,
        betType: betType,
        result: "pending" as const,
      };
    }

    const won = didBetWin(betType, match.goals.home!, match.goals.away!);
    return {
      index: i,
      teams: `${teams.home} vs ${teams.away}`,
      betType: betType,
      result: won ? ("green" as const) : ("red" as const),
      score: `${match.goals.home} x ${match.goals.away}`,
    };
  });
}

// ─── Main hook ──────────────────────────────────────────────

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAutoSettle(
  externalScores: NormalizedFixture[] | undefined,
  tickets: SavedTicket[]
) {
  const queryClient = useQueryClient();
  const lastSettleRef = useRef<string>("");

  const settle = useCallback(
    async (scores: NormalizedFixture[]) => {
      if (scores.length === 0 || tickets.length === 0) return 0;

      const finished = scores.filter(
        (f) => f.status.short === "FT" && f.goals.home !== null && f.goals.away !== null
      );
      if (finished.length === 0) return 0;

      const pending = tickets.filter((t) => t.result === "pending");
      if (pending.length === 0) return 0;

      let greenCount = 0;
      let redCount = 0;

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

          const match = finished.find(
            (f) => teamsMatch(f.teams.home.name, teams.home) && teamsMatch(f.teams.away.name, teams.away)
          );

          if (!match) { allSettled = false; continue; }
          if (!didBetWin(betType, match.goals.home!, match.goals.away!)) allWon = false;
        }

        if (allSettled) {
          const result = allWon ? "green" : "red";
          try {
            await supabase
              .from("saved_tickets")
              .update({ result })
              .eq("id", ticket.id);
            if (result === "green") greenCount++;
            else redCount++;
          } catch (err) {
            console.warn("Auto-settle error:", err);
          }
        }
      }

      const total = greenCount + redCount;
      if (total > 0) {
        queryClient.invalidateQueries({ queryKey: ["saved-tickets"] });
        const msg = `Auto-settle: ${greenCount} Green ✅ ${redCount} Red ❌`;
        toast.success(msg, { duration: 4000 });
        sendPushNotification(msg, greenCount, redCount);
      }
      return total;
    },
    [tickets, queryClient]
  );

  // Settle when external scores change
  useEffect(() => {
    if (externalScores && externalScores.length > 0) {
      const key = externalScores.map((s) => s.id).sort().join(",");
      if (key !== lastSettleRef.current) {
        lastSettleRef.current = key;
        settle(externalScores);
      }
    }
  }, [externalScores, settle]);

  // Periodic auto-fetch & settle
  useEffect(() => {
    const hasPending = tickets.some((t) => t.result === "pending");
    if (!hasPending) return;

    const poll = async () => {
      try {
        const scores = await getCompletedScores();
        if (scores.length > 0) {
          const key = scores.map((s) => s.id).sort().join(",");
          if (key !== lastSettleRef.current) {
            lastSettleRef.current = key;
            await settle(scores);
          }
        }
      } catch {
        // silent
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [tickets, settle]);
}

import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getCompletedScores, type NormalizedFixture } from "@/lib/odds-api";
import type { SavedTicket } from "@/hooks/useSavedTickets";
import { toast } from "sonner";

// ─── Bet type resolution ────────────────────────────────────

type BetType =
  | "home" | "draw" | "away"
  | "double_home_draw" | "double_away_draw" | "double_home_away"
  | "over_1_5" | "over_2_5" | "over_3_5"
  | "under_1_5" | "under_2_5" | "under_3_5"
  | "btts_yes" | "btts_no";

const BET_TYPE_MAP: Record<string, BetType> = {
  home: "home",
  draw: "draw",
  away: "away",
  double_home_draw: "double_home_draw",
  double_away_draw: "double_away_draw",
  double_home_away: "double_home_away",
  // Portuguese labels
  "vitória casa": "home",
  "vitoria casa": "home",
  casa: "home",
  "1": "home",
  empate: "draw",
  x: "draw",
  "vitória fora": "away",
  "vitoria fora": "away",
  fora: "away",
  "2": "away",
  "casa ou empate": "double_home_draw",
  "1x": "double_home_draw",
  "fora ou empate": "double_away_draw",
  x2: "double_away_draw",
  "casa ou fora": "double_home_away",
  "12": "double_home_away",
  // Over/Under
  "over 1.5": "over_1_5",
  "mais de 1.5": "over_1_5",
  "over 2.5": "over_2_5",
  "mais de 2.5": "over_2_5",
  "over 3.5": "over_3_5",
  "mais de 3.5": "over_3_5",
  "under 1.5": "under_1_5",
  "menos de 1.5": "under_1_5",
  "under 2.5": "under_2_5",
  "menos de 2.5": "under_2_5",
  "under 3.5": "under_3_5",
  "menos de 3.5": "under_3_5",
  // BTTS
  "ambas marcam": "btts_yes",
  "btts sim": "btts_yes",
  "btts yes": "btts_yes",
  "ambas não marcam": "btts_no",
  "btts não": "btts_no",
  "btts no": "btts_no",
};

function resolveBetType(raw: string): BetType | null {
  if (!raw) return null;
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return BET_TYPE_MAP[key] ?? null;
}

// ─── Outcome evaluation ────────────────────────────────────

function didBetWin(betType: BetType, h: number, a: number): boolean {
  const total = h + a;
  const homeWin = h > a;
  const draw = h === a;
  const awayWin = a > h;

  switch (betType) {
    case "home": return homeWin;
    case "draw": return draw;
    case "away": return awayWin;
    case "double_home_draw": return homeWin || draw;
    case "double_away_draw": return awayWin || draw;
    case "double_home_away": return homeWin || awayWin;
    case "over_1_5": return total > 1.5;
    case "over_2_5": return total > 2.5;
    case "over_3_5": return total > 3.5;
    case "under_1_5": return total < 1.5;
    case "under_2_5": return total < 2.5;
    case "under_3_5": return total < 3.5;
    case "btts_yes": return h > 0 && a > 0;
    case "btts_no": return h === 0 || a === 0;
    default: return false;
  }
}

// ─── Name matching ──────────────────────────────────────────

function cleanName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|ac|rc|as|ss|us|afc|club|cd|ud|sporting|athletic|atletico|city|united|real)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const ca = cleanName(a);
  const cb = cleanName(b);
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  const tokensA = ca.split(" ").filter((t) => t.length > 2);
  const tokensB = cb.split(" ").filter((t) => t.length > 2);
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, cb] : [tokensB, ca];
  if (shorter.length > 0 && shorter.every((token) => longer.includes(token))) return true;
  return false;
}

// ─── Selection data extraction ──────────────────────────────

function extractTeamNames(sel: any): { home: string; away: string } | null {
  if (sel.fixture?.teams?.home?.name && sel.fixture?.teams?.away?.name) {
    return { home: sel.fixture.teams.home.name, away: sel.fixture.teams.away.name };
  }
  if (typeof sel.fixture === "string" && sel.fixture.includes(" vs ")) {
    const [home, away] = sel.fixture.split(" vs ");
    return { home: home.trim(), away: away.trim() };
  }
  if (sel.homeName && sel.awayName) {
    return { home: sel.homeName, away: sel.awayName };
  }
  // Try match field (some ticket formats)
  if (sel.match && typeof sel.match === "string" && sel.match.includes(" vs ")) {
    const [home, away] = sel.match.split(" vs ");
    return { home: home.trim(), away: away.trim() };
  }
  return null;
}

function extractBetType(sel: any): BetType | null {
  for (const field of ["betType", "label", "bet", "market", "tip"]) {
    if (sel[field]) {
      const resolved = resolveBetType(String(sel[field]));
      if (resolved) return resolved;
    }
  }
  // Fallback: check bet field for keywords
  if (sel.bet) {
    const bet = sel.bet.toLowerCase();
    if (bet.includes("(casa)") || bet.includes("home")) return "home";
    if (bet.includes("empate") || bet.includes("draw")) return "draw";
    if (bet.includes("(fora)") || bet.includes("away")) return "away";
    if (bet.includes("over 2.5") || bet.includes("mais de 2.5")) return "over_2_5";
    if (bet.includes("under 2.5") || bet.includes("menos de 2.5")) return "under_2_5";
    if (bet.includes("ambas")) return "btts_yes";
  }
  return null;
}

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
        toast.success(
          `Auto-settle: ${greenCount} Green ✅ ${redCount} Red ❌`,
          { duration: 4000 }
        );
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

    // Initial fetch
    poll();

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [tickets, settle]);
}

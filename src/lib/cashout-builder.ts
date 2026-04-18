import { NormalizedFixture } from "./odds-api";
import type { BettingTicket, BetSelection, BetType } from "./ticket-generator";

interface Candidate {
  fixture: NormalizedFixture;
  betType: BetType;
  label: string;
  odd: number;
  fairProb: number; // 0-1
  ev: number;
  confidence: number;
  reasoning: string;
}

function parseOdd(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function buildCandidates(fixtures: NormalizedFixture[]): Candidate[] {
  const out: Candidate[] = [];
  for (const f of fixtures) {
    if (!f.odds) continue;
    const h = parseOdd(f.odds.home);
    const d = parseOdd(f.odds.draw);
    const a = parseOdd(f.odds.away);
    if (h <= 1 || d <= 1 || a <= 1) continue;

    const margin = 1 / h + 1 / d + 1 / a;
    const fairH = 1 / h / margin;
    const fairD = 1 / d / margin;
    const fairA = 1 / a / margin;

    const push = (betType: BetType, label: string, odd: number, fair: number) => {
      const ev = fair * odd - 1;
      out.push({
        fixture: f,
        betType,
        label,
        odd,
        fairProb: fair,
        ev,
        confidence: Math.round(fair * 100),
        reasoning: `Prob. justa ${(fair * 100).toFixed(0)}% • EV ${ev >= 0 ? "+" : ""}${(ev * 100).toFixed(1)}%`,
      });
    };

    push("home", `${f.teams.home.name} vence`, h, fairH);
    push("away", `${f.teams.away.name} vence`, a, fairA);

    // Double chances (combined prob, combined odd via parallel)
    const dcHDOdd = +(1 / (1 / h + 1 / d)).toFixed(2);
    push("double_home_draw", `${f.teams.home.name} ou Empate`, dcHDOdd, fairH + fairD);

    const dcADOdd = +(1 / (1 / a + 1 / d)).toFixed(2);
    push("double_away_draw", `${f.teams.away.name} ou Empate`, dcADOdd, fairA + fairD);
  }
  return out;
}

export interface CashoutOptions {
  targetOdd: number;
  /** Risco: quanto maior, aceita odds maiores por seleção */
  riskTolerance?: "balanced" | "aggressive";
}

/**
 * Greedy combinator that builds a ticket whose total odd is as close as possible to (and >=)
 * targetOdd, while maximizing the geometric average of fair probabilities (i.e. picking
 * highest-quality selections first), one selection per fixture.
 */
export function buildCashoutTicket(
  fixtures: NormalizedFixture[],
  options: CashoutOptions
): BettingTicket | null {
  const { targetOdd, riskTolerance = "balanced" } = options;
  if (targetOdd < 1.5) return null;

  const candidates = buildCandidates(fixtures);
  if (candidates.length === 0) return null;

  // Per-pick odd cap - allow bigger picks for higher targets
  const maxOddPerPick = riskTolerance === "aggressive"
    ? Math.max(6, targetOdd / 4)
    : Math.max(3.5, targetOdd / 6);

  // Score: prioritize +EV with healthy fair prob, penalize extreme odds
  const scored = candidates
    .filter((c) => c.odd <= maxOddPerPick && c.fairProb >= 0.25)
    .map((c) => ({
      ...c,
      score: c.ev * 100 + c.fairProb * 50 - Math.max(0, c.odd - 2.5) * 4,
    }))
    .sort((a, b) => b.score - a.score);

  // Group by fixture to enforce one pick per match
  const usedFixtures = new Set<string>();
  const picked: Candidate[] = [];
  let totalOdd = 1;

  for (const c of scored) {
    if (usedFixtures.has(c.fixture.id)) continue;
    if (totalOdd >= targetOdd) break;

    // Don't overshoot too much: if adding this would 3x past target, try smaller picks first
    const projected = totalOdd * c.odd;
    if (projected > targetOdd * 2.5 && picked.length > 0) continue;

    picked.push(c);
    totalOdd = projected;
    usedFixtures.add(c.fixture.id);

    if (picked.length >= 12) break;
  }

  // If we still didn't reach target, allow a final boost pick (any odd)
  if (totalOdd < targetOdd) {
    const remaining = scored
      .filter((c) => !usedFixtures.has(c.fixture.id))
      .sort((a, b) => b.odd - a.odd);
    for (const c of remaining) {
      picked.push(c);
      totalOdd *= c.odd;
      usedFixtures.add(c.fixture.id);
      if (totalOdd >= targetOdd) break;
      if (picked.length >= 14) break;
    }
  }

  if (picked.length < 2) return null;

  const selections: BetSelection[] = picked.map((c) => ({
    fixture: c.fixture,
    betType: c.betType,
    label: c.label,
    odd: c.odd,
    confidence: c.confidence,
    reasoning: c.reasoning,
  }));

  // Combined hit probability = product of fair probs
  const combinedProb = picked.reduce((acc, c) => acc * c.fairProb, 1);
  const confidencePct = Math.max(1, Math.round(combinedProb * 100));

  const stake = targetOdd >= 500 ? 5 : targetOdd >= 200 ? 10 : targetOdd >= 100 ? 20 : 50;

  return {
    id: `CSH-${Date.now().toString(36).toUpperCase()}`,
    name: `🎯 Cashout ${Math.round(targetOdd)}x`,
    type: "aggressive",
    selections,
    totalOdd: Math.round(totalOdd * 100) / 100,
    confidence: confidencePct,
    suggestedStake: `R$ ${stake.toFixed(2).replace(".", ",")}`,
    potentialReturn: `R$ ${(stake * totalOdd).toFixed(2).replace(".", ",")}`,
  };
}

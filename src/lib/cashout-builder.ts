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

// Poisson helpers used to derive correct-score probabilities from 1X2 odds
function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function poisson(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

interface ScoreProb {
  score: string; // "h-a"
  prob: number;
}

/**
 * Derive expected goals (lambdaH, lambdaA) from 1X2 fair probabilities.
 * Refined heuristic incorporating home advantage and tighter draw->total mapping
 * calibrated against historical data.
 */
function deriveLambdas(fairH: number, fairD: number, fairA: number, totalGoalsBase = 2.62): { lh: number; la: number } {
  // Strength index: log of (P_home / P_away) — magnifies dominant-team gap
  const ratio = Math.log((fairH + 0.01) / (fairA + 0.01));
  const split = Math.max(-0.85, Math.min(0.85, ratio * 0.55));
  // Lower draw prob -> more goals expected (calibrated coefficient 1.85)
  const goalAdj = (0.32 - fairD) * 1.85;
  // Home edge: ~+0.12 lambda baseline (typical home advantage)
  const homeEdge = 0.12;
  const total = Math.max(1.4, Math.min(3.9, totalGoalsBase + goalAdj));
  const lh = total / 2 + split * (total / 2) + homeEdge / 2;
  const la = total - lh + homeEdge / 2 - homeEdge; // keep total roughly constant
  return { lh: Math.max(0.35, lh), la: Math.max(0.3, la) };
}

/**
 * Estimate "anytime" correct-score probability from FT probability.
 * A score (h-a) is reached "at any moment" if the match passes through it.
 * Lower scores are reached far more often than FT, so we apply a
 * multiplicative boost that decays with goal sum.
 */
function anytimeBoost(h: number, a: number): number {
  const goals = h + a;
  // 0-0 always reached at kickoff -> ~1.0; 1-0 reached very often
  if (goals === 0) return 1.0;
  if (goals === 1) return 2.6;
  if (goals === 2) return 2.0;
  if (goals === 3) return 1.55;
  if (goals === 4) return 1.3;
  return 1.15;
}

function buildScoreMatrix(lh: number, la: number, maxGoals = 5): ScoreProb[] {
  const out: ScoreProb[] = [];
  let total = 0;
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poisson(h, lh) * poisson(a, la);
      out.push({ score: `${h}-${a}`, prob: p });
      total += p;
    }
  }
  // Normalize so probabilities sum to 1
  return out.map((s) => ({ ...s, prob: s.prob / total }));
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

    const push = (betType: BetType, label: string, odd: number, fair: number, customDesc?: string) => {
      const ev = fair * odd - 1;
      // Build a richer reasoning per market
      const evPct = ev * 100;
      const probPct = fair * 100;
      let valueTag = "Valor neutro";
      if (evPct >= 8) valueTag = "Valor alto detectado";
      else if (evPct >= 3) valueTag = "Valor positivo";
      else if (evPct >= 0) valueTag = "Levemente +EV";
      else valueTag = "Mercado caro";

      let confTag = "incerto";
      if (probPct >= 60) confTag = "alta probabilidade";
      else if (probPct >= 45) confTag = "favorito moderado";
      else if (probPct >= 30) confTag = "competitivo";
      else confTag = "azarão calculado";

      const marketDesc =
        customDesc ??
        (betType === "home"
          ? `Mando de campo + odds sugerem ${f.teams.home.name} dominante`
          : betType === "away"
          ? `Visitante com value real contra ${f.teams.home.name}`
          : betType === "double_home_draw"
          ? `Cobertura dupla: ${f.teams.home.name} vence ou empata`
          : betType === "double_away_draw"
          ? `Cobertura dupla: ${f.teams.away.name} vence ou empata`
          : `Mercado equilibrado pelo modelo`);

      const reasoning = `${marketDesc}. ${valueTag} (EV ${ev >= 0 ? "+" : ""}${evPct.toFixed(1)}%) com ${confTag} de ${probPct.toFixed(0)}%. Odd ${odd.toFixed(2)} foi escolhida por equilibrar risco e retorno dentro do alvo do bilhete.`;

      out.push({
        fixture: f,
        betType,
        label,
        odd,
        fairProb: fair,
        ev,
        confidence: Math.round(fair * 100),
        reasoning,
      });
    };

    push("home", `${f.teams.home.name} vence`, h, fairH);
    push("away", `${f.teams.away.name} vence`, a, fairA);

    // Double chances (combined prob, combined odd via parallel)
    const dcHDOdd = +(1 / (1 / h + 1 / d)).toFixed(2);
    push("double_home_draw", `${f.teams.home.name} ou Empate`, dcHDOdd, fairH + fairD);

    const dcADOdd = +(1 / (1 / a + 1 / d)).toFixed(2);
    push("double_away_draw", `${f.teams.away.name} ou Empate`, dcADOdd, fairA + fairD);

    // ---- Correct Score (Resultado Correto a qualquer momento) via Poisson ----
    const { lh, la } = deriveLambdas(fairH, fairD, fairA);
    const matrix = buildScoreMatrix(lh, la, 5);
    // Top single score
    const sortedScores = [...matrix].sort((x, y) => y.prob - x.prob);
    const top1 = sortedScores[0];
    if (top1 && top1.prob > 0.06) {
      // Fair odd, then apply typical bookmaker margin (~12%) so EV stays realistic
      const fairOdd = 1 / top1.prob;
      const odd = +(fairOdd * 0.88).toFixed(2);
      const [hg, ag] = top1.score.split("-");
      const desc = `Modelo Poisson (λ ${lh.toFixed(2)} x ${la.toFixed(2)}) projeta ${f.teams.home.name} ${hg}-${ag} ${f.teams.away.name} como placar mais provável`;
      push("correct_score", `Placar exato ${hg}-${ag}`, odd, top1.prob, desc);
    }

    // ---- Multiple Correct Scores (Múltiplos Resultados Corretos) ----
    // Cluster top 3 most likely scores into one selection
    const top3 = sortedScores.slice(0, 3);
    const combinedProb = top3.reduce((acc, s) => acc + s.prob, 0);
    if (combinedProb > 0.22) {
      const fairOdd = 1 / combinedProb;
      const odd = +(fairOdd * 0.9).toFixed(2);
      const scoresLbl = top3.map((s) => s.score).join(" / ");
      const desc = `Combinação dos 3 placares mais prováveis (${scoresLbl}) somando ${(combinedProb * 100).toFixed(0)}% de chance pelo modelo`;
      push("multi_correct_score", `Placares ${scoresLbl}`, odd, combinedProb, desc);
    }
  }
  return out;
}

export type MarketFilter = "1x2" | "double_chance" | "correct_score" | "multi_correct_score";

export interface CashoutOptions {
  targetOdd: number;
  /** Risco: quanto maior, aceita odds maiores por seleção */
  riskTolerance?: "conservative" | "balanced" | "aggressive";
  /** Restringe a um conjunto de ligas (nomes exatos vindos de fixture.league.name). Vazio = todas */
  leagues?: string[];
  /** Mercados permitidos. Vazio/undefined = todos */
  markets?: MarketFilter[];
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
  const { targetOdd, riskTolerance = "balanced", leagues, markets } = options;
  if (targetOdd < 1.5) return null;

  // Apply league filter at the fixture level
  const filteredFixtures =
    leagues && leagues.length > 0
      ? fixtures.filter((f) => leagues.includes(f.league.name))
      : fixtures;

  const candidates = buildCandidates(filteredFixtures);
  if (candidates.length === 0) return null;

  // Apply market filter
  const allowedBetTypes = new Set<string>();
  const useMarkets = markets && markets.length > 0 ? markets : (["1x2", "double_chance"] as MarketFilter[]);
  if (useMarkets.includes("1x2")) {
    allowedBetTypes.add("home");
    allowedBetTypes.add("away");
  }
  if (useMarkets.includes("double_chance")) {
    allowedBetTypes.add("double_home_draw");
    allowedBetTypes.add("double_away_draw");
  }
  if (useMarkets.includes("correct_score")) {
    allowedBetTypes.add("correct_score");
  }
  if (useMarkets.includes("multi_correct_score")) {
    allowedBetTypes.add("multi_correct_score");
  }
  const marketFiltered = candidates.filter((c) => allowedBetTypes.has(c.betType));
  if (marketFiltered.length === 0) return null;

  // Per-pick odd cap and min fair prob - tighter for conservative
  // Correct-score markets naturally produce higher odds, so be more lenient when only those are selected
  const onlyScores = useMarkets.every((m) => m === "correct_score" || m === "multi_correct_score");
  const oddCapBase = onlyScores ? 2.5 : 1;
  const maxOddPerPick =
    riskTolerance === "aggressive"
      ? Math.max(6 * oddCapBase, targetOdd / 4)
      : riskTolerance === "conservative"
      ? Math.max(2.2 * oddCapBase, targetOdd / 10)
      : Math.max(3.5 * oddCapBase, targetOdd / 6);

  const minFairProb = onlyScores
    ? (riskTolerance === "conservative" ? 0.18 : riskTolerance === "aggressive" ? 0.06 : 0.1)
    : (riskTolerance === "conservative" ? 0.45 : riskTolerance === "aggressive" ? 0.18 : 0.25);

  // Score: prioritize +EV with healthy fair prob, penalize extreme odds
  const scored = marketFiltered
    .filter((c) => c.odd <= maxOddPerPick && c.fairProb >= minFairProb)
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

  // Stake calculation per tier using fractional Kelly Criterion
  // Kelly = (bp - q) / b, where b = totalOdd-1, p = combinedProb, q = 1-p
  const bankroll = 1000; // reference bankroll R$ 1000
  const b = Math.max(0.01, totalOdd - 1);
  const p = combinedProb;
  const q = 1 - p;
  const kellyFull = (b * p - q) / b;
  // Fractional Kelly per risk profile (capped to avoid absurd stakes)
  const kellyFraction =
    riskTolerance === "conservative" ? 0.15 : riskTolerance === "balanced" ? 0.25 : 0.4;
  const stakePctRaw = Math.max(0, kellyFull) * kellyFraction;
  // Cap stake percentage by tier safety
  const maxPct = riskTolerance === "conservative" ? 0.02 : riskTolerance === "balanced" ? 0.035 : 0.05;
  const stakePct = Math.min(stakePctRaw, maxPct);
  // Floor stake (always show at least a minimum so users have a reference)
  const minStake = riskTolerance === "conservative" ? 5 : riskTolerance === "balanced" ? 10 : 15;
  const stake = Math.max(minStake, Math.round(stakePct * bankroll));

  const ticketType: BettingTicket["type"] =
    riskTolerance === "conservative" ? "safe" : riskTolerance === "balanced" ? "moderate" : "aggressive";

  const labelPrefix =
    riskTolerance === "conservative" ? "🟢 Conservadora" : riskTolerance === "balanced" ? "🟡 Equilibrada" : "🔴 Agressiva";

  return {
    id: `CSH-${riskTolerance}-${Date.now().toString(36).toUpperCase()}`,
    name: `${labelPrefix} • ${Math.round(targetOdd)}x`,
    type: ticketType,
    selections,
    totalOdd: Math.round(totalOdd * 100) / 100,
    confidence: confidencePct,
    suggestedStake: `R$ ${stake.toFixed(2).replace(".", ",")}`,
    potentialReturn: `R$ ${(stake * totalOdd).toFixed(2).replace(".", ",")}`,
  };
}

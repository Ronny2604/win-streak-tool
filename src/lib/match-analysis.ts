import { NormalizedFixture } from "@/lib/odds-api";
import {
  calibrateLambdas,
  buildPoissonModel,
  deriveProbabilities,
  formScore,
  h2hScore,
} from "@/lib/poisson";

interface MatchStats {
  homeForm: string[];
  awayForm: string[];
  h2h: { homeWins: number; draws: number; awayWins: number; total: number };
  homeGoalsAvg: number;
  awayGoalsAvg: number;
  bttsPercent: number;
  over25Percent: number;
  homeCleanSheetPct: number;
  awayCleanSheetPct: number;
  topScores?: { score: string; probability: number }[];
  expectedGoals?: number;
}

interface SuggestedMarket {
  betType: string;
  label: string;
  odd: number;
  fairOdd?: number;
  confidence: number;
  reasoning: string;
  tag: "MELHOR APOSTA" | "VALUE BET" | "SEGURO" | "RISCO" | "ESTATÍSTICO";
}

export interface MatchAnalysis {
  stats: MatchStats;
  markets: SuggestedMarket[];
}

// ─── helpers ────────────────────────────────────────────────

function impliedProb(oddStr: string): number {
  const n = parseFloat(oddStr);
  return n > 0 ? (1 / n) * 100 : 0;
}

function overround(home: number, draw: number, away: number): number {
  return (1 / home + 1 / draw + 1 / away) * 100;
}

function fairProb(rawProb: number, margin: number): number {
  return margin > 0 ? (rawProb / margin) * 100 : rawProb;
}

function probToOdd(p: number): number {
  return p > 0 ? +(1 / p).toFixed(2) : 0;
}

function generateDeterministicForm(strength: number): string[] {
  const results: string[] = [];
  const thresholds = [0.7, 0.55, 0.45, 0.35, 0.25];
  for (let i = 0; i < 5; i++) {
    const adjusted = strength + 0.1 * (2 - i);
    if (adjusted >= thresholds[i]) results.push("W");
    else if (adjusted >= thresholds[i] - 0.15) results.push("D");
    else results.push("L");
  }
  return results;
}

function kellyFraction(prob: number, odd: number): number {
  const q = 1 - prob;
  const b = odd - 1;
  return Math.max(0, (prob * b - q) / b);
}

function expectedValue(prob: number, odd: number): number {
  return prob * odd - 1;
}

// ─── main ───────────────────────────────────────────────────

export function analyzeMatch(fixture: NormalizedFixture): MatchAnalysis {
  const homeOdd = parseFloat(fixture.odds?.home ?? "0");
  const drawOdd = parseFloat(fixture.odds?.draw ?? "0");
  const awayOdd = parseFloat(fixture.odds?.away ?? "0");

  if (homeOdd === 0 || drawOdd === 0 || awayOdd === 0) {
    return {
      stats: {
        homeForm: [], awayForm: [],
        h2h: { homeWins: 0, draws: 0, awayWins: 0, total: 0 },
        homeGoalsAvg: 0, awayGoalsAvg: 0,
        bttsPercent: 0, over25Percent: 0,
        homeCleanSheetPct: 0, awayCleanSheetPct: 0,
      },
      markets: [],
    };
  }

  const margin = overround(homeOdd, drawOdd, awayOdd);
  const homeFair = fairProb(impliedProb(fixture.odds!.home), margin); // %
  const drawFair = fairProb(impliedProb(fixture.odds!.draw), margin);
  const awayFair = fairProb(impliedProb(fixture.odds!.away), margin);

  // Deterministic form derived from fair strength
  const homeForm = generateDeterministicForm(homeFair / 100);
  const awayForm = generateDeterministicForm(awayFair / 100);
  const homeFormBias = formScore(homeForm); // -1..1
  const awayFormBias = formScore(awayForm);

  // H2H estimation
  const h2hTotal = 10;
  const homeWins = Math.min(h2hTotal, Math.max(0, Math.round((homeFair / 100) * h2hTotal * 0.9)));
  const awayWins = Math.min(h2hTotal - homeWins, Math.max(0, Math.round((awayFair / 100) * h2hTotal * 0.9)));
  const draws = Math.max(0, h2hTotal - homeWins - awayWins);
  const h2hBias = h2hScore(homeWins, draws, awayWins);

  // Calibrate Poisson lambdas using fair probabilities + form
  const baseTotal = 2.5 + (1 / homeOdd + 1 / awayOdd - 0.8); // legacy heuristic baseline
  const { lambdaHome, lambdaAway } = calibrateLambdas(
    homeFair / 100,
    awayFair / 100,
    homeFormBias + h2hBias * 0.4,
    awayFormBias - h2hBias * 0.4,
    Math.max(2.0, Math.min(3.4, baseTotal))
  );

  const model = buildPoissonModel(lambdaHome, lambdaAway);
  const probs = deriveProbabilities(model);

  // Blend Poisson probs with fair odds (70% poisson / 30% fair) for stability
  const blendedHome = (probs.homeWin * 0.7 + (homeFair / 100) * 0.3) * 100;
  const blendedAway = (probs.awayWin * 0.7 + (awayFair / 100) * 0.3) * 100;
  const blendedDraw = (probs.draw * 0.7 + (drawFair / 100) * 0.3) * 100;

  const homeGoalsAvg = +lambdaHome.toFixed(2);
  const awayGoalsAvg = +lambdaAway.toFixed(2);
  const bttsPercent = Math.round(probs.btts * 100);
  const over25Percent = Math.round(probs.over25 * 100);
  const homeCleanSheetPct = Math.round((1 - probs.btts - probs.awayWin * 0.4) * 100);
  const awayCleanSheetPct = Math.round((1 - probs.btts - probs.homeWin * 0.4) * 100);

  const stats: MatchStats = {
    homeForm,
    awayForm,
    h2h: { homeWins, draws, awayWins, total: h2hTotal },
    homeGoalsAvg,
    awayGoalsAvg,
    bttsPercent,
    over25Percent,
    homeCleanSheetPct: Math.max(5, Math.min(85, homeCleanSheetPct)),
    awayCleanSheetPct: Math.max(5, Math.min(80, awayCleanSheetPct)),
    topScores: probs.topScores,
    expectedGoals: +probs.expectedGoals.toFixed(2),
  };

  const markets: SuggestedMarket[] = [];

  // Helper to push a 1X2 market with EV/Kelly
  const push1x2 = (
    betType: string,
    label: string,
    odd: number,
    blendedPct: number,
    floor: number,
    bestThreshold: number
  ) => {
    if (blendedPct < floor) return;
    const p = blendedPct / 100;
    const ev = expectedValue(p, odd);
    const kelly = kellyFraction(p, odd);
    const conf = Math.min(95, Math.round(blendedPct * 0.9 + (ev > 0 ? ev * 25 : 0)));
    let tag: SuggestedMarket["tag"] = "SEGURO";
    if (ev > 0.05) tag = "VALUE BET";
    if (blendedPct > bestThreshold) tag = "MELHOR APOSTA";
    if (blendedPct > bestThreshold + 10 && ev > 0) tag = "ESTATÍSTICO";
    if (blendedPct < 40) tag = ev > 0.04 ? "VALUE BET" : "RISCO";
    markets.push({
      betType,
      label,
      odd,
      fairOdd: probToOdd(p),
      confidence: conf,
      reasoning: `Poisson+Forma: ${blendedPct.toFixed(0)}% | EV: ${ev > 0 ? "+" : ""}${(ev * 100).toFixed(1)}% | Kelly: ${(kelly * 100).toFixed(1)}%`,
      tag,
    });
  };

  push1x2("home", `${fixture.teams.home.name} vence`, homeOdd, blendedHome, 32, 60);
  push1x2("away", `${fixture.teams.away.name} vence`, awayOdd, blendedAway, 30, 55);

  if (blendedDraw > 25 && Math.abs(blendedHome - blendedAway) < 18) {
    const p = blendedDraw / 100;
    const ev = expectedValue(p, drawOdd);
    markets.push({
      betType: "draw",
      label: "Empate",
      odd: drawOdd,
      fairOdd: probToOdd(p),
      confidence: Math.min(75, Math.round(blendedDraw * 0.85)),
      reasoning: `Jogo equilibrado | Prob. justa: ${blendedDraw.toFixed(0)}% | EV: ${(ev * 100).toFixed(1)}%`,
      tag: ev > 0.03 ? "VALUE BET" : "RISCO",
    });
  }

  // Double chance
  if (blendedHome > 35 && blendedHome < 68) {
    const dcProb = (blendedHome + blendedDraw) / 100;
    const dcOdd = 1 / (1 / homeOdd + 1 / drawOdd);
    if (dcProb > 0.55) {
      const ev = expectedValue(dcProb, dcOdd);
      markets.push({
        betType: "double_home_draw",
        label: `${fixture.teams.home.name} ou Empate`,
        odd: +dcOdd.toFixed(2),
        fairOdd: probToOdd(dcProb),
        confidence: Math.min(92, Math.round(dcProb * 100 * 0.84)),
        reasoning: `Cobertura: ${(dcProb * 100).toFixed(0)}% | EV: ${(ev * 100).toFixed(1)}%`,
        tag: dcProb > 0.7 ? "SEGURO" : "ESTATÍSTICO",
      });
    }
  }

  // Goals: Over 2.5
  if (over25Percent > 50) {
    const p = over25Percent / 100;
    const o25Odd = +(1.5 + (100 - over25Percent) / 40).toFixed(2);
    const ev = expectedValue(p, o25Odd);
    markets.push({
      betType: "over25",
      label: "Mais de 2.5 gols",
      odd: o25Odd,
      fairOdd: probToOdd(p),
      confidence: over25Percent,
      reasoning: `λ casa ${lambdaHome.toFixed(2)} + λ fora ${lambdaAway.toFixed(2)} = ${(lambdaHome + lambdaAway).toFixed(2)} | Poisson ${over25Percent}%`,
      tag: over25Percent > 65 ? "MELHOR APOSTA" : ev > 0 ? "VALUE BET" : "ESTATÍSTICO",
    });
  } else {
    const u25Pct = 100 - over25Percent;
    const u25Odd = +(1.4 + (100 - u25Pct) / 35).toFixed(2);
    markets.push({
      betType: "under25",
      label: "Menos de 2.5 gols",
      odd: u25Odd,
      fairOdd: probToOdd(u25Pct / 100),
      confidence: u25Pct,
      reasoning: `Poisson U2.5: ${u25Pct}% | Clean sheet casa ${homeCleanSheetPct}%`,
      tag: u25Pct > 60 ? "SEGURO" : "ESTATÍSTICO",
    });
  }

  // BTTS
  if (bttsPercent > 50) {
    const p = bttsPercent / 100;
    const bttsOdd = +(1.5 + (100 - bttsPercent) / 35).toFixed(2);
    const ev = expectedValue(p, bttsOdd);
    markets.push({
      betType: "btts",
      label: "Ambas Marcam",
      odd: bttsOdd,
      fairOdd: probToOdd(p),
      confidence: bttsPercent,
      reasoning: `Poisson BTTS: ${bttsPercent}% | λs ${lambdaHome.toFixed(2)} / ${lambdaAway.toFixed(2)}`,
      tag: bttsPercent > 65 ? "MELHOR APOSTA" : ev > 0 ? "VALUE BET" : "ESTATÍSTICO",
    });
  } else if (bttsPercent < 45) {
    const noPct = 100 - bttsPercent;
    const noOdd = +(1.5 + (100 - noPct) / 30).toFixed(2);
    markets.push({
      betType: "btts_no",
      label: "Ambas Não Marcam",
      odd: noOdd,
      fairOdd: probToOdd(noPct / 100),
      confidence: noPct,
      reasoning: `Poisson BTTS Não: ${noPct}% | Clean sheets ${homeCleanSheetPct}/${awayCleanSheetPct}%`,
      tag: noPct > 60 ? "SEGURO" : "ESTATÍSTICO",
    });
  }

  // Sort by confidence then tag priority
  markets.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const tagPriority: Record<string, number> = { "MELHOR APOSTA": 4, "ESTATÍSTICO": 3, "VALUE BET": 2, "SEGURO": 1, "RISCO": 0 };
    return (tagPriority[b.tag] ?? 0) - (tagPriority[a.tag] ?? 0);
  });

  return { stats, markets };
}

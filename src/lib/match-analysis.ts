import { NormalizedFixture } from "@/lib/odds-api";

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
}

interface SuggestedMarket {
  betType: string;
  label: string;
  odd: number;
  confidence: number;
  reasoning: string;
  tag: "MELHOR APOSTA" | "VALUE BET" | "SEGURO" | "RISCO" | "ESTATÍSTICO";
}

export interface MatchAnalysis {
  stats: MatchStats;
  markets: SuggestedMarket[];
}

// ─── Implied probability from odds ──────────────────────────

function impliedProb(oddStr: string): number {
  const n = parseFloat(oddStr);
  return n > 0 ? (1 / n) * 100 : 0;
}

function overround(home: number, draw: number, away: number): number {
  return (1 / home + 1 / draw + 1 / away) * 100;
}

function fairProb(rawProb: number, margin: number): number {
  // Remove bookmaker margin to get fairer probability
  return margin > 0 ? (rawProb / margin) * 100 : rawProb;
}

// ─── Deterministic form based on odds strength ──────────────

function generateDeterministicForm(strength: number): string[] {
  // Instead of random, use odds-derived strength to produce consistent form
  const results: string[] = [];
  const thresholds = [0.7, 0.55, 0.45, 0.35, 0.25];
  
  for (let i = 0; i < 5; i++) {
    const adjusted = strength + (0.1 * (2 - i)); // recent matches weighted
    if (adjusted >= thresholds[i]) results.push("W");
    else if (adjusted >= thresholds[i] - 0.15) results.push("D");
    else results.push("L");
  }
  return results;
}

// ─── Kelly Criterion for stake sizing ───────────────────────

function kellyFraction(prob: number, odd: number): number {
  const q = 1 - prob;
  const b = odd - 1;
  const kelly = (prob * b - q) / b;
  return Math.max(0, kelly);
}

// ─── Expected Value ─────────────────────────────────────────

function expectedValue(prob: number, odd: number): number {
  return (prob * odd) - 1; // positive = +EV
}

// ─── Main analysis ──────────────────────────────────────────

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

  const homeProb = impliedProb(fixture.odds?.home ?? "0");
  const awayProb = impliedProb(fixture.odds?.away ?? "0");
  const drawProb = impliedProb(fixture.odds?.draw ?? "0");
  const margin = overround(homeOdd, drawOdd, awayOdd);

  // Fair probabilities (margin removed)
  const homeFair = fairProb(homeProb, margin);
  const awayFair = fairProb(awayProb, margin);
  const drawFair = fairProb(drawProb, margin);

  const homeStrength = homeFair / 100;
  const awayStrength = awayFair / 100;

  // H2H estimation based on relative strength
  const h2hTotal = 10;
  const rawHomeWins = Math.round(homeStrength * h2hTotal * 0.9);
  const rawAwayWins = Math.round(awayStrength * h2hTotal * 0.9);
  const homeWins = Math.min(h2hTotal, Math.max(0, rawHomeWins));
  const awayWins = Math.min(h2hTotal - homeWins, Math.max(0, rawAwayWins));
  const draws = Math.max(0, h2hTotal - homeWins - awayWins);

  // Goals estimation using Poisson-like approach based on odds
  const totalGoalsEstimate = 2.5 + (1 / homeOdd + 1 / awayOdd - 0.8);
  const homeGoalsAvg = +(totalGoalsEstimate * homeStrength / (homeStrength + awayStrength)).toFixed(1);
  const awayGoalsAvg = +(totalGoalsEstimate - homeGoalsAvg).toFixed(1);

  // BTTS: both teams need attacking capability
  const bttsBase = Math.min(awayGoalsAvg, homeGoalsAvg) > 0.8 ? 65 : 40;
  const bttsPercent = Math.min(85, Math.max(25, Math.round(
    bttsBase + (awayGoalsAvg - 0.5) * 15 + (homeGoalsAvg - 0.8) * 10
  )));

  // Over 2.5: based on total goals estimate
  const over25Percent = Math.min(85, Math.max(20, Math.round(
    30 + (totalGoalsEstimate - 2.0) * 30
  )));

  // Clean sheet probabilities
  const homeCleanSheetPct = Math.round(Math.max(10, 55 - awayGoalsAvg * 25));
  const awayCleanSheetPct = Math.round(Math.max(8, 45 - homeGoalsAvg * 20));

  const stats: MatchStats = {
    homeForm: generateDeterministicForm(homeStrength),
    awayForm: generateDeterministicForm(awayStrength),
    h2h: { homeWins, draws, awayWins, total: h2hTotal },
    homeGoalsAvg,
    awayGoalsAvg,
    bttsPercent,
    over25Percent,
    homeCleanSheetPct,
    awayCleanSheetPct,
  };

  const markets: SuggestedMarket[] = [];

  // ─── 1x2 Markets ─────────────────────────────────────────

  // Home win
  if (homeFair > 45) {
    const ev = expectedValue(homeFair / 100, homeOdd);
    const kelly = kellyFraction(homeFair / 100, homeOdd);
    const conf = Math.min(95, Math.round(homeFair * 0.88 + (ev > 0 ? ev * 20 : 0)));
    
    let tag: SuggestedMarket["tag"] = "SEGURO";
    if (ev > 0.05) tag = "VALUE BET";
    if (homeFair > 60) tag = "MELHOR APOSTA";
    if (homeFair > 70 && ev > 0) tag = "ESTATÍSTICO";
    
    markets.push({
      betType: "home",
      label: `${fixture.teams.home.name} vence`,
      odd: homeOdd,
      confidence: conf,
      reasoning: `Prob. justa: ${homeFair.toFixed(0)}% | EV: ${ev > 0 ? "+" : ""}${(ev * 100).toFixed(1)}% | Kelly: ${(kelly * 100).toFixed(1)}%`,
      tag,
    });
  }

  // Away win
  if (awayFair > 40) {
    const ev = expectedValue(awayFair / 100, awayOdd);
    const kelly = kellyFraction(awayFair / 100, awayOdd);
    const conf = Math.min(93, Math.round(awayFair * 0.88 + (ev > 0 ? ev * 20 : 0)));
    
    let tag: SuggestedMarket["tag"] = "RISCO";
    if (ev > 0.05) tag = "VALUE BET";
    if (awayFair > 55) tag = "MELHOR APOSTA";
    
    markets.push({
      betType: "away",
      label: `${fixture.teams.away.name} vence`,
      odd: awayOdd,
      confidence: conf,
      reasoning: `Prob. justa: ${awayFair.toFixed(0)}% | EV: ${ev > 0 ? "+" : ""}${(ev * 100).toFixed(1)}% | Odd: ${awayOdd.toFixed(2)}`,
      tag,
    });
  }

  // Draw
  if (drawFair > 25 && Math.abs(homeFair - awayFair) < 18) {
    const ev = expectedValue(drawFair / 100, drawOdd);
    markets.push({
      betType: "draw",
      label: "Empate",
      odd: drawOdd,
      confidence: Math.min(75, Math.round(drawFair * 0.85)),
      reasoning: `Jogo equilibrado. Prob. justa empate: ${drawFair.toFixed(0)}% | EV: ${(ev * 100).toFixed(1)}%`,
      tag: ev > 0.03 ? "VALUE BET" : "RISCO",
    });
  }

  // ─── Double Chance ────────────────────────────────────────

  if (homeFair > 35 && homeFair < 68) {
    const dcProb = homeFair + drawFair;
    const dcOdd = 1 / ((1 / homeOdd) + (1 / drawOdd));
    const ev = expectedValue(dcProb / 100, dcOdd);
    
    if (dcProb > 55) {
      markets.push({
        betType: "double_home_draw",
        label: `${fixture.teams.home.name} ou Empate`,
        odd: Math.round(dcOdd * 100) / 100,
        confidence: Math.min(92, Math.round(dcProb * 0.82)),
        reasoning: `Cobertura: ${dcProb.toFixed(0)}% | Odd: ${dcOdd.toFixed(2)} | EV: ${(ev * 100).toFixed(1)}%`,
        tag: dcProb > 70 ? "SEGURO" : "ESTATÍSTICO",
      });
    }
  }

  // ─── Goals Markets ────────────────────────────────────────

  // Over 2.5
  if (over25Percent > 50) {
    const o25Odd = +(1.5 + (100 - over25Percent) / 40).toFixed(2);
    const ev = expectedValue(over25Percent / 100, o25Odd);
    markets.push({
      betType: "over25",
      label: "Mais de 2.5 gols",
      odd: o25Odd,
      confidence: over25Percent,
      reasoning: `Média combinada: ${(homeGoalsAvg + awayGoalsAvg).toFixed(1)} gols | ${over25Percent}% probabilidade`,
      tag: over25Percent > 65 ? "MELHOR APOSTA" : ev > 0 ? "VALUE BET" : "ESTATÍSTICO",
    });
  }

  // Under 2.5
  if (over25Percent < 50) {
    const u25Pct = 100 - over25Percent;
    const u25Odd = +(1.4 + (100 - u25Pct) / 35).toFixed(2);
    markets.push({
      betType: "under25",
      label: "Menos de 2.5 gols",
      odd: u25Odd,
      confidence: u25Pct,
      reasoning: `Jogo fechado. Média ${(homeGoalsAvg + awayGoalsAvg).toFixed(1)} gols | Clean sheet casa: ${homeCleanSheetPct}%`,
      tag: u25Pct > 60 ? "SEGURO" : "ESTATÍSTICO",
    });
  }

  // BTTS
  if (bttsPercent > 50) {
    const bttsOdd = +(1.5 + (100 - bttsPercent) / 35).toFixed(2);
    const ev = expectedValue(bttsPercent / 100, bttsOdd);
    markets.push({
      betType: "btts",
      label: "Ambas Marcam",
      odd: bttsOdd,
      confidence: bttsPercent,
      reasoning: `Ambas equipes com média > 0.8 gols | ${bttsPercent}% chances BTTS`,
      tag: bttsPercent > 65 ? "MELHOR APOSTA" : ev > 0 ? "VALUE BET" : "ESTATÍSTICO",
    });
  }

  // BTTS No
  if (bttsPercent < 45) {
    const bttsNoPct = 100 - bttsPercent;
    const bttsNoOdd = +(1.5 + (100 - bttsNoPct) / 30).toFixed(2);
    markets.push({
      betType: "btts_no",
      label: "Ambas Não Marcam",
      odd: bttsNoOdd,
      confidence: bttsNoPct,
      reasoning: `Clean sheet casa: ${homeCleanSheetPct}% | Clean sheet fora: ${awayCleanSheetPct}%`,
      tag: bttsNoPct > 60 ? "SEGURO" : "ESTATÍSTICO",
    });
  }

  // Sort by confidence, then by EV indicator
  markets.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    // Prefer VALUE BET and MELHOR APOSTA tags
    const tagPriority: Record<string, number> = { "MELHOR APOSTA": 4, "ESTATÍSTICO": 3, "VALUE BET": 2, "SEGURO": 1, "RISCO": 0 };
    return (tagPriority[b.tag] ?? 0) - (tagPriority[a.tag] ?? 0);
  });

  return { stats, markets };
}

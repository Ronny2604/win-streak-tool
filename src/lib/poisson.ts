// Poisson model for football match analysis.
// Used to estimate goal/corner totals, BTTS, 1X2 and correct-score probabilities
// in a way that's more principled than odds-derived heuristics.

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** P(X = k) for X ~ Poisson(lambda) */
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/** P(X >= k) approximated by summing up to maxK */
export function poissonTail(k: number, lambda: number, maxK = 10): number {
  let p = 0;
  for (let i = k; i <= maxK; i++) p += poissonPmf(i, lambda);
  return p;
}

export interface PoissonMatchModel {
  lambdaHome: number;
  lambdaAway: number;
  // Joint score grid up to 6-6
  scoreGrid: number[][];
}

/** Build a joint Poisson scoreline grid (independence assumption) */
export function buildPoissonModel(lambdaHome: number, lambdaAway: number, maxGoals = 6): PoissonMatchModel {
  const grid: number[][] = [];
  for (let h = 0; h <= maxGoals; h++) {
    grid[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      grid[h][a] = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
    }
  }
  return { lambdaHome, lambdaAway, scoreGrid: grid };
}

export interface PoissonProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  btts: number;
  over15: number;
  over25: number;
  over35: number;
  under25: number;
  expectedGoals: number;
  topScores: { score: string; probability: number }[];
}

/** Derive market probabilities from a Poisson model */
export function deriveProbabilities(model: PoissonMatchModel): PoissonProbabilities {
  const { scoreGrid, lambdaHome, lambdaAway } = model;
  let homeWin = 0, draw = 0, awayWin = 0, btts = 0;
  let over15 = 0, over25 = 0, over35 = 0;
  const allScores: { score: string; probability: number }[] = [];

  for (let h = 0; h < scoreGrid.length; h++) {
    for (let a = 0; a < scoreGrid[h].length; a++) {
      const p = scoreGrid[h][a];
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
      if (h > 0 && a > 0) btts += p;
      const total = h + a;
      if (total >= 2) over15 += p;
      if (total >= 3) over25 += p;
      if (total >= 4) over35 += p;
      allScores.push({ score: `${h}-${a}`, probability: p });
    }
  }

  const topScores = allScores
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  return {
    homeWin,
    draw,
    awayWin,
    btts,
    over15,
    over25,
    over35,
    under25: 1 - over25,
    expectedGoals: lambdaHome + lambdaAway,
    topScores,
  };
}

/**
 * Calibrate Poisson lambdas from market odds + form bias (last 5 games).
 * Lambdas are then blended with the implied attacking strength so the model
 * stays consistent with the bookmaker line while incorporating recent form.
 */
export function calibrateLambdas(
  homeFairProb: number, // 0..1
  awayFairProb: number, // 0..1
  homeFormScore: number, // -1..1 (negative = bad form)
  awayFormScore: number,
  baseTotal = 2.6
): { lambdaHome: number; lambdaAway: number } {
  const total = baseTotal * (1 + (homeFormScore + awayFormScore) * 0.08);
  const sum = homeFairProb + awayFairProb || 1;
  const homeShare = (homeFairProb / sum) * (1 + homeFormScore * 0.12);
  const awayShare = 1 - homeShare;
  return {
    lambdaHome: Math.max(0.2, total * homeShare),
    lambdaAway: Math.max(0.2, total * awayShare),
  };
}

/** Convert a "WWDLW" form string to a -1..1 momentum score (recent weighted higher). */
export function formScore(form: string[]): number {
  if (!form.length) return 0;
  const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // oldest -> newest
  let total = 0, denom = 0;
  for (let i = 0; i < form.length; i++) {
    const w = weights[Math.max(0, weights.length - form.length + i)] ?? 0.2;
    const v = form[i] === "W" ? 1 : form[i] === "L" ? -1 : 0;
    total += v * w;
    denom += w;
  }
  return denom > 0 ? total / denom : 0;
}

/** Convert H2H record into a -1..1 dominance score for the home side. */
export function h2hScore(homeWins: number, draws: number, awayWins: number): number {
  const total = homeWins + draws + awayWins;
  if (!total) return 0;
  return (homeWins - awayWins) / total;
}

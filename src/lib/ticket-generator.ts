import { NormalizedFixture, LEAGUES } from "./odds-api";
import { calibrateLambdas, buildPoissonModel, deriveProbabilities, formScore, h2hScore } from "./poisson";

export interface TicketOptions {
  /** Hide individual picks below this confidence (0-100) */
  minConfidence?: number;
  /** Hide picks with negative EV below this threshold (e.g. -0.05) */
  minEv?: number;
}

export type BetType = "home" | "draw" | "away" | "double_home_draw" | "double_away_draw" | "double_home_away" | "over_2_5" | "under_2_5" | "btts_yes" | "correct_score" | "multi_correct_score" | "anytime_correct_score";

export interface BetSelection {
  fixture: NormalizedFixture;
  betType: BetType;
  label: string;
  odd: number;
  confidence: number;
  reasoning: string;
}

export interface BettingTicket {
  id: string;
  name: string;
  type: "safe" | "moderate" | "aggressive";
  selections: BetSelection[];
  totalOdd: number;
  confidence: number;
  suggestedStake: string;
  potentialReturn: string;
}

function parseOdd(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function impliedProbability(odd: number): number {
  return odd > 0 ? (1 / odd) * 100 : 0;
}

function overround(h: number, d: number, a: number): number {
  return (1/h + 1/d + 1/a) * 100;
}

function fairProb(rawProb: number, margin: number): number {
  return margin > 0 ? (rawProb / margin) * 100 : rawProb;
}

function expectedValue(prob: number, odd: number): number {
  return (prob * odd) - 1;
}

interface AnalyzedBet {
  fixture: NormalizedFixture;
  betType: BetType;
  odd: number;
  confidence: number;
  reasoning: string;
  label: string;
  ev: number;
}

function analyzeFixture(fixture: NormalizedFixture): AnalyzedBet[] {
  if (!fixture.odds) return [];

  const homeOdd = parseOdd(fixture.odds.home);
  const drawOdd = parseOdd(fixture.odds.draw);
  const awayOdd = parseOdd(fixture.odds.away);
  if (homeOdd === 0 || drawOdd === 0 || awayOdd === 0) return [];

  const margin = overround(homeOdd, drawOdd, awayOdd);
  const homeFair = fairProb(impliedProbability(homeOdd), margin) / 100;
  const drawFair = fairProb(impliedProbability(drawOdd), margin) / 100;
  const awayFair = fairProb(impliedProbability(awayOdd), margin) / 100;

  // Synthetic form derived from strength
  const fakeForm = (s: number): string[] => {
    const arr: string[] = [];
    const t = [0.7, 0.55, 0.45, 0.35, 0.25];
    for (let i = 0; i < 5; i++) {
      const v = s + 0.1 * (2 - i);
      arr.push(v >= t[i] ? "W" : v >= t[i] - 0.15 ? "D" : "L");
    }
    return arr;
  };
  const homeBias = formScore(fakeForm(homeFair));
  const awayBias = formScore(fakeForm(awayFair));

  // H2H bias from relative strength
  const h2hHome = Math.round(homeFair * 9);
  const h2hAway = Math.round(awayFair * 9);
  const h2hDraw = Math.max(0, 10 - h2hHome - h2hAway);
  const h2hB = h2hScore(h2hHome, h2hDraw, h2hAway);

  const baseTotal = Math.max(2.0, Math.min(3.4, 2.5 + (1 / homeOdd + 1 / awayOdd - 0.8)));
  const { lambdaHome, lambdaAway } = calibrateLambdas(
    homeFair,
    awayFair,
    homeBias + h2hB * 0.4,
    awayBias - h2hB * 0.4,
    baseTotal,
  );
  const probs = deriveProbabilities(buildPoissonModel(lambdaHome, lambdaAway));

  // Blend Poisson + fair odds
  const homeP = probs.homeWin * 0.7 + homeFair * 0.3;
  const drawP = probs.draw * 0.7 + drawFair * 0.3;
  const awayP = probs.awayWin * 0.7 + awayFair * 0.3;

  const bets: AnalyzedBet[] = [];

  if (homeP > 0.5) {
    const ev = expectedValue(homeP, homeOdd);
    bets.push({
      fixture, betType: "home", odd: homeOdd,
      confidence: Math.min(95, Math.round(homeP * 100 * 0.92 + (ev > 0 ? ev * 18 : 0))),
      reasoning: `Poisson ${(homeP * 100).toFixed(0)}% | EV ${ev > 0 ? "+" : ""}${(ev * 100).toFixed(1)}%`,
      label: `${fixture.teams.home.name} vence`,
      ev,
    });
  }

  if (awayP > 0.5) {
    const ev = expectedValue(awayP, awayOdd);
    bets.push({
      fixture, betType: "away", odd: awayOdd,
      confidence: Math.min(95, Math.round(awayP * 100 * 0.92 + (ev > 0 ? ev * 18 : 0))),
      reasoning: `Poisson ${(awayP * 100).toFixed(0)}% | EV ${ev > 0 ? "+" : ""}${(ev * 100).toFixed(1)}%`,
      label: `${fixture.teams.away.name} vence`,
      ev,
    });
  }

  // Double chance home/draw
  if (homeP > 0.38 && homeP < 0.62) {
    const dcProb = homeP + drawP;
    const dcOdd = 1 / (1 / homeOdd + 1 / drawOdd);
    if (dcProb > 0.55) {
      const ev = expectedValue(dcProb, dcOdd);
      bets.push({
        fixture, betType: "double_home_draw",
        odd: Math.round(dcOdd * 100) / 100,
        confidence: Math.min(93, Math.round(dcProb * 100 * 0.85)),
        reasoning: `Cobertura ${(dcProb * 100).toFixed(0)}% | EV ${(ev * 100).toFixed(1)}%`,
        label: `${fixture.teams.home.name} ou Empate`,
        ev,
      });
    }
  }

  // Double chance away/draw
  if (awayP > 0.33 && awayP < 0.55) {
    const dcProb = awayP + drawP;
    const dcOdd = 1 / (1 / awayOdd + 1 / drawOdd);
    if (dcProb > 0.55) {
      const ev = expectedValue(dcProb, dcOdd);
      bets.push({
        fixture, betType: "double_away_draw",
        odd: Math.round(dcOdd * 100) / 100,
        confidence: Math.min(91, Math.round(dcProb * 100 * 0.83)),
        reasoning: `Cobertura ${(dcProb * 100).toFixed(0)}% | EV ${(ev * 100).toFixed(1)}%`,
        label: `${fixture.teams.away.name} ou Empate`,
        ev,
      });
    }
  }

  // Draw value
  if (drawP > 0.27 && drawP < 0.38 && drawOdd > 2.8) {
    const ev = expectedValue(drawP, drawOdd);
    if (ev > 0) {
      bets.push({
        fixture, betType: "draw", odd: drawOdd,
        confidence: Math.round(drawP * 100 * 0.85),
        reasoning: `Equilíbrio | Value EV +${(ev * 100).toFixed(1)}%`,
        label: "Empate",
        ev,
      });
    }
  }

  // Over 2.5
  const over25P = probs.over25;
  if (over25P > 0.55) {
    const o25Odd = +(1.5 + (1 - over25P) * 100 / 40).toFixed(2);
    const ev = expectedValue(over25P, o25Odd);
    bets.push({
      fixture, betType: "over_2_5", odd: o25Odd,
      confidence: Math.round(over25P * 100),
      reasoning: `λ ${(lambdaHome + lambdaAway).toFixed(2)} gols | Poisson ${Math.round(over25P * 100)}%`,
      label: "Mais de 2.5 gols",
      ev,
    });
  }

  // Under 2.5
  if (over25P < 0.45) {
    const u25P = 1 - over25P;
    const u25Odd = +(1.4 + (1 - u25P) * 100 / 35).toFixed(2);
    const ev = expectedValue(u25P, u25Odd);
    bets.push({
      fixture, betType: "under_2_5", odd: u25Odd,
      confidence: Math.round(u25P * 100),
      reasoning: `λ ${(lambdaHome + lambdaAway).toFixed(2)} | Poisson U2.5 ${Math.round(u25P * 100)}%`,
      label: "Menos de 2.5 gols",
      ev,
    });
  }

  // BTTS
  if (probs.btts > 0.55) {
    const bttsOdd = +(1.5 + (1 - probs.btts) * 100 / 35).toFixed(2);
    const ev = expectedValue(probs.btts, bttsOdd);
    bets.push({
      fixture, betType: "btts_yes", odd: bttsOdd,
      confidence: Math.round(probs.btts * 100),
      reasoning: `Poisson BTTS ${Math.round(probs.btts * 100)}%`,
      label: "Ambas Marcam",
      ev,
    });
  }

  return bets;
}

function generateTicketId(): string {
  return `BLT-${Date.now().toString(36).toUpperCase()}`;
}

export function generateTickets(fixtures: NormalizedFixture[], options: TicketOptions = {}): BettingTicket[] {
  const allBets: AnalyzedBet[] = [];
  for (const fixture of fixtures) {
    allBets.push(...analyzeFixture(fixture));
  }

  // Sort by EV first, then confidence
  allBets.sort((a, b) => {
    const evDiff = b.ev - a.ev;
    if (Math.abs(evDiff) > 0.01) return evDiff;
    return b.confidence - a.confidence;
  });

  const tickets: BettingTicket[] = [];

  // 🟢 SAFE - high confidence, positive EV, low odds
  const safeBets = allBets
    .filter((b) => b.confidence >= 65 && b.odd < 2.5 && b.ev > -0.05)
    .reduce((acc: AnalyzedBet[], bet) => {
      if (!acc.find((b) => b.fixture.id === bet.fixture.id)) acc.push(bet);
      return acc;
    }, [])
    .slice(0, 3);

  if (safeBets.length >= 2) {
    const totalOdd = safeBets.reduce((acc, b) => acc * b.odd, 1);
    const avgConf = safeBets.reduce((acc, b) => acc + b.confidence, 0) / safeBets.length;
    tickets.push({
      id: generateTicketId(),
      name: "🟢 Bilhete Seguro",
      type: "safe",
      selections: safeBets.map((b) => ({
        fixture: b.fixture, betType: b.betType, label: b.label,
        odd: b.odd, confidence: b.confidence, reasoning: b.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(avgConf),
      suggestedStake: "R$ 50,00",
      potentialReturn: `R$ ${(50 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  // 🟡 MODERATE - mix of value bets with +EV
  const moderateBets = allBets
    .filter((b) => b.confidence >= 48 && b.odd >= 1.3 && b.odd < 3.5 && b.ev > -0.03)
    .reduce((acc: AnalyzedBet[], bet) => {
      if (!acc.find((b) => b.fixture.id === bet.fixture.id)) acc.push(bet);
      return acc;
    }, [])
    .slice(0, 5);

  if (moderateBets.length >= 3) {
    const totalOdd = moderateBets.reduce((acc, b) => acc * b.odd, 1);
    const avgConf = moderateBets.reduce((acc, b) => acc + b.confidence, 0) / moderateBets.length;
    tickets.push({
      id: generateTicketId(),
      name: "🟡 Bilhete Moderado",
      type: "moderate",
      selections: moderateBets.map((b) => ({
        fixture: b.fixture, betType: b.betType, label: b.label,
        odd: b.odd, confidence: b.confidence, reasoning: b.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(avgConf),
      suggestedStake: "R$ 20,00",
      potentialReturn: `R$ ${(20 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  // 🔴 AGGRESSIVE - high odds, prioritize +EV bets
  const aggressiveBets = allBets
    .filter((b) => b.odd >= 1.5)
    .reduce((acc: AnalyzedBet[], bet) => {
      if (!acc.find((b) => b.fixture.id === bet.fixture.id)) acc.push(bet);
      return acc;
    }, [])
    .slice(0, 6);

  if (aggressiveBets.length >= 3) {
    const totalOdd = aggressiveBets.reduce((acc, b) => acc * b.odd, 1);
    const avgConf = aggressiveBets.reduce((acc, b) => acc + b.confidence, 0) / aggressiveBets.length;
    tickets.push({
      id: generateTicketId(),
      name: "🔴 Bilhete Agressivo",
      type: "aggressive",
      selections: aggressiveBets.map((b) => ({
        fixture: b.fixture, betType: b.betType, label: b.label,
        odd: b.odd, confidence: b.confidence, reasoning: b.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(avgConf),
      suggestedStake: "R$ 10,00",
      potentialReturn: `R$ ${(10 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  return tickets;
}

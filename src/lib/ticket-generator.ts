import { NormalizedFixture, LEAGUES } from "./odds-api";

export type BetType = "home" | "draw" | "away" | "double_home_draw" | "double_away_draw" | "double_home_away" | "over_2_5" | "under_2_5" | "btts_yes" | "correct_score" | "multi_correct_score";

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

  const homeProb = impliedProbability(homeOdd);
  const drawProb = impliedProbability(drawOdd);
  const awayProb = impliedProbability(awayOdd);
  const margin = overround(homeOdd, drawOdd, awayOdd);
  const homeFair = fairProb(homeProb, margin);
  const awayFair = fairProb(awayProb, margin);
  const drawFair = fairProb(drawProb, margin);

  const bets: AnalyzedBet[] = [];

  // Home win
  if (homeFair > 50) {
    const ev = expectedValue(homeFair / 100, homeOdd);
    bets.push({
      fixture, betType: "home", odd: homeOdd,
      confidence: Math.min(95, Math.round(homeFair * 0.90 + (ev > 0 ? ev * 15 : 0))),
      reasoning: `Prob. justa ${homeFair.toFixed(0)}% | EV: ${ev > 0 ? "+" : ""}${(ev*100).toFixed(1)}%`,
      label: `${fixture.teams.home.name} vence`,
      ev,
    });
  }

  // Away win
  if (awayFair > 50) {
    const ev = expectedValue(awayFair / 100, awayOdd);
    bets.push({
      fixture, betType: "away", odd: awayOdd,
      confidence: Math.min(95, Math.round(awayFair * 0.90 + (ev > 0 ? ev * 15 : 0))),
      reasoning: `Prob. justa ${awayFair.toFixed(0)}% | EV: ${ev > 0 ? "+" : ""}${(ev*100).toFixed(1)}%`,
      label: `${fixture.teams.away.name} vence`,
      ev,
    });
  }

  // Double chance home/draw
  if (homeFair > 38 && homeFair < 62) {
    const dcProb = homeFair + drawFair;
    const dcOdd = 1 / ((1/homeOdd) + (1/drawOdd));
    const ev = expectedValue(dcProb / 100, dcOdd);
    if (dcProb > 55) {
      bets.push({
        fixture, betType: "double_home_draw",
        odd: Math.round(dcOdd * 100) / 100,
        confidence: Math.min(93, Math.round(dcProb * 0.84)),
        reasoning: `Cobertura ${dcProb.toFixed(0)}% | EV: ${(ev*100).toFixed(1)}%`,
        label: `${fixture.teams.home.name} ou Empate`,
        ev,
      });
    }
  }

  // Double chance away/draw
  if (awayFair > 33 && awayFair < 55) {
    const dcProb = awayFair + drawFair;
    const dcOdd = 1 / ((1/awayOdd) + (1/drawOdd));
    const ev = expectedValue(dcProb / 100, dcOdd);
    if (dcProb > 55) {
      bets.push({
        fixture, betType: "double_away_draw",
        odd: Math.round(dcOdd * 100) / 100,
        confidence: Math.min(91, Math.round(dcProb * 0.82)),
        reasoning: `Cobertura ${dcProb.toFixed(0)}% | EV: ${(ev*100).toFixed(1)}%`,
        label: `${fixture.teams.away.name} ou Empate`,
        ev,
      });
    }
  }

  // Draw value
  if (drawFair > 27 && drawFair < 38 && drawOdd > 2.8) {
    const ev = expectedValue(drawFair / 100, drawOdd);
    if (ev > 0) {
      bets.push({
        fixture, betType: "draw", odd: drawOdd,
        confidence: Math.round(drawFair * 0.85),
        reasoning: `Jogo equilibrado | Value EV: +${(ev*100).toFixed(1)}%`,
        label: "Empate",
        ev,
      });
    }
  }

  // Over 2.5 goals
  const homeStr = homeFair / 100;
  const awayStr = awayFair / 100;
  const totalGoalsEst = 2.5 + (1/homeOdd + 1/awayOdd - 0.8);
  const over25Pct = Math.min(85, Math.max(20, Math.round(30 + (totalGoalsEst - 2.0) * 30)));
  
  if (over25Pct > 55) {
    const o25Odd = +(1.5 + (100 - over25Pct) / 40).toFixed(2);
    const ev = expectedValue(over25Pct / 100, o25Odd);
    bets.push({
      fixture, betType: "over_2_5", odd: o25Odd,
      confidence: over25Pct,
      reasoning: `Média est. ${totalGoalsEst.toFixed(1)} gols | ${over25Pct}% chance`,
      label: "Mais de 2.5 gols",
      ev,
    });
  }

  // Under 2.5
  if (over25Pct < 45) {
    const u25Pct = 100 - over25Pct;
    const u25Odd = +(1.4 + (100 - u25Pct) / 35).toFixed(2);
    const ev = expectedValue(u25Pct / 100, u25Odd);
    bets.push({
      fixture, betType: "under_2_5", odd: u25Odd,
      confidence: u25Pct,
      reasoning: `Jogo fechado, média ${totalGoalsEst.toFixed(1)} gols`,
      label: "Menos de 2.5 gols",
      ev,
    });
  }

  // BTTS
  const bttsBase = Math.min(awayStr, homeStr) > 0.3 ? 60 : 38;
  const bttsPct = Math.min(80, Math.max(25, bttsBase + (totalGoalsEst - 2.2) * 12));
  if (bttsPct > 55) {
    const bttsOdd = +(1.5 + (100 - bttsPct) / 35).toFixed(2);
    const ev = expectedValue(bttsPct / 100, bttsOdd);
    bets.push({
      fixture, betType: "btts_yes", odd: bttsOdd,
      confidence: Math.round(bttsPct),
      reasoning: `Ambas atacam bem | ${Math.round(bttsPct)}% BTTS`,
      label: "Ambas Marcam",
      ev,
    });
  }

  return bets;
}

function generateTicketId(): string {
  return `BLT-${Date.now().toString(36).toUpperCase()}`;
}

export function generateTickets(fixtures: NormalizedFixture[]): BettingTicket[] {
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

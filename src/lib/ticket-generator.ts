import { NormalizedFixture, LEAGUES } from "./odds-api";

export type BetType = "home" | "draw" | "away" | "double_home_draw" | "double_away_draw" | "double_home_away";

export interface BetSelection {
  fixture: NormalizedFixture;
  betType: BetType;
  label: string;
  odd: number;
  confidence: number; // 0-100
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

const BET_LABELS: Record<BetType, string> = {
  home: "Vitória Casa",
  draw: "Empate",
  away: "Vitória Fora",
  double_home_draw: "Casa ou Empate",
  double_away_draw: "Fora ou Empate",
  double_home_away: "Casa ou Fora",
};

function parseOdd(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function impliedProbability(odd: number): number {
  return odd > 0 ? (1 / odd) * 100 : 0;
}

function getLeagueName(sportKey: string): string {
  return LEAGUES.find((l) => l.id === sportKey)?.name ?? sportKey;
}

interface AnalyzedBet {
  fixture: NormalizedFixture;
  betType: BetType;
  odd: number;
  confidence: number;
  reasoning: string;
  label: string;
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

  const bets: AnalyzedBet[] = [];

  // Strong home favorite
  if (homeProb > 55) {
    bets.push({
      fixture,
      betType: "home",
      odd: homeOdd,
      confidence: Math.min(95, Math.round(homeProb * 0.92)),
      reasoning: `${fixture.teams.home.name} é grande favorito (${homeProb.toFixed(0)}% prob. implícita)`,
      label: `${fixture.teams.home.name} vence`,
    });
  }

  // Strong away favorite
  if (awayProb > 55) {
    bets.push({
      fixture,
      betType: "away",
      odd: awayOdd,
      confidence: Math.min(95, Math.round(awayProb * 0.92)),
      reasoning: `${fixture.teams.away.name} é grande favorito fora (${awayProb.toFixed(0)}% prob. implícita)`,
      label: `${fixture.teams.away.name} vence`,
    });
  }

  // Home or Draw (double chance) - when home is slight favorite
  if (homeProb > 40 && homeProb < 60) {
    const combinedProb = homeProb + drawProb;
    const combinedOdd = 1 / ((1 / homeOdd) + (1 / drawOdd));
    bets.push({
      fixture,
      betType: "double_home_draw",
      odd: Math.round(combinedOdd * 100) / 100,
      confidence: Math.min(92, Math.round(combinedProb * 0.85)),
      reasoning: `Chance dupla: ${fixture.teams.home.name} ou empate (${combinedProb.toFixed(0)}% prob. combinada)`,
      label: `${fixture.teams.home.name} ou Empate`,
    });
  }

  // Away or Draw - when away is slight favorite
  if (awayProb > 35 && awayProb < 55) {
    const combinedProb = awayProb + drawProb;
    const combinedOdd = 1 / ((1 / awayOdd) + (1 / drawOdd));
    bets.push({
      fixture,
      betType: "double_away_draw",
      odd: Math.round(combinedOdd * 100) / 100,
      confidence: Math.min(90, Math.round(combinedProb * 0.83)),
      reasoning: `Chance dupla: ${fixture.teams.away.name} ou empate (${combinedProb.toFixed(0)}% prob. combinada)`,
      label: `${fixture.teams.away.name} ou Empate`,
    });
  }

  // Draw value bet - when draw odds are high
  if (drawProb > 28 && drawProb < 35 && drawOdd > 3.0) {
    bets.push({
      fixture,
      betType: "draw",
      odd: drawOdd,
      confidence: Math.round(drawProb * 0.88),
      reasoning: `Jogo equilibrado com value no empate (odd ${drawOdd.toFixed(2)})`,
      label: "Empate",
    });
  }

  return bets;
}

function generateTicketId(): string {
  return `BLT-${Date.now().toString(36).toUpperCase()}`;
}

export function generateTickets(fixtures: NormalizedFixture[]): BettingTicket[] {
  // Analyze all fixtures
  const allBets: AnalyzedBet[] = [];
  for (const fixture of fixtures) {
    allBets.push(...analyzeFixture(fixture));
  }

  // Sort by confidence
  allBets.sort((a, b) => b.confidence - a.confidence);

  const tickets: BettingTicket[] = [];

  // 🟢 SAFE TICKET - Top 3 highest confidence, lower odds
  const safeBets = allBets
    .filter((b) => b.confidence >= 65 && b.odd < 2.5)
    .slice(0, 3);

  if (safeBets.length >= 2) {
    const totalOdd = safeBets.reduce((acc, b) => acc * b.odd, 1);
    const avgConf = safeBets.reduce((acc, b) => acc + b.confidence, 0) / safeBets.length;
    tickets.push({
      id: generateTicketId(),
      name: "Bilhete Seguro",
      type: "safe",
      selections: safeBets.map((b) => ({
        fixture: b.fixture,
        betType: b.betType,
        label: b.label,
        odd: b.odd,
        confidence: b.confidence,
        reasoning: b.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(avgConf),
      suggestedStake: "R$ 50,00",
      potentialReturn: `R$ ${(50 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  // 🟡 MODERATE TICKET - Mix of value bets, 4-5 selections
  const moderateBets = allBets
    .filter((b) => b.confidence >= 50 && b.odd >= 1.3 && b.odd < 3.5)
    .reduce((acc: AnalyzedBet[], bet) => {
      // Avoid duplicate fixtures
      if (!acc.find((b) => b.fixture.id === bet.fixture.id)) acc.push(bet);
      return acc;
    }, [])
    .slice(0, 5);

  if (moderateBets.length >= 3) {
    const totalOdd = moderateBets.reduce((acc, b) => acc * b.odd, 1);
    const avgConf = moderateBets.reduce((acc, b) => acc + b.confidence, 0) / moderateBets.length;
    tickets.push({
      id: generateTicketId(),
      name: "Bilhete Moderado",
      type: "moderate",
      selections: moderateBets.map((b) => ({
        fixture: b.fixture,
        betType: b.betType,
        label: b.label,
        odd: b.odd,
        confidence: b.confidence,
        reasoning: b.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(avgConf),
      suggestedStake: "R$ 20,00",
      potentialReturn: `R$ ${(20 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  // 🔴 AGGRESSIVE TICKET - High odds, higher risk, 5-6 selections
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
      name: "Bilhete Agressivo",
      type: "aggressive",
      selections: aggressiveBets.map((b) => ({
        fixture: b.fixture,
        betType: b.betType,
        label: b.label,
        odd: b.odd,
        confidence: b.confidence,
        reasoning: b.reasoning,
      })),
      totalOdd: Math.round(totalOdd * 100) / 100,
      confidence: Math.round(avgConf),
      suggestedStake: "R$ 10,00",
      potentialReturn: `R$ ${(10 * totalOdd).toFixed(2).replace(".", ",")}`,
    });
  }

  return tickets;
}

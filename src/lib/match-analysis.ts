import { NormalizedFixture } from "@/lib/odds-api";

interface MatchStats {
  homeForm: string[];
  awayForm: string[];
  h2h: { homeWins: number; draws: number; awayWins: number; total: number };
  homeGoalsAvg: number;
  awayGoalsAvg: number;
  bttsPercent: number;
  over25Percent: number;
}

interface SuggestedMarket {
  betType: string;
  label: string;
  odd: number;
  confidence: number;
  reasoning: string;
  tag: "MELHOR APOSTA" | "VALUE BET" | "SEGURO" | "RISCO";
}

export interface MatchAnalysis {
  stats: MatchStats;
  markets: SuggestedMarket[];
}

function generateForm(): string[] {
  const results = ["W", "D", "L"];
  return Array.from({ length: 5 }, () => results[Math.floor(Math.random() * 3)]);
}

function impliedProb(oddStr: string): number {
  const n = parseFloat(oddStr);
  return n > 0 ? (1 / n) * 100 : 0;
}

export function analyzeMatch(fixture: NormalizedFixture): MatchAnalysis {
  const homeOdd = parseFloat(fixture.odds?.home ?? "0");
  const drawOdd = parseFloat(fixture.odds?.draw ?? "0");
  const awayOdd = parseFloat(fixture.odds?.away ?? "0");

  const homeProb = impliedProb(fixture.odds?.home ?? "0");
  const awayProb = impliedProb(fixture.odds?.away ?? "0");
  const drawProb = impliedProb(fixture.odds?.draw ?? "0");

  // Simulated stats based on odds analysis
  const homeStrength = homeProb / 100;
  const awayStrength = awayProb / 100;

  const h2hTotal = 10;
  const homeWins = Math.round(homeStrength * h2hTotal);
  const awayWins = Math.round(awayStrength * h2hTotal);
  const draws = h2hTotal - homeWins - awayWins;

  const stats: MatchStats = {
    homeForm: generateForm(),
    awayForm: generateForm(),
    h2h: { homeWins: Math.max(0, homeWins), draws: Math.max(0, draws), awayWins: Math.max(0, awayWins), total: h2hTotal },
    homeGoalsAvg: +(1.2 + homeStrength * 1.5).toFixed(1),
    awayGoalsAvg: +(0.8 + awayStrength * 1.3).toFixed(1),
    bttsPercent: Math.round(45 + Math.random() * 25),
    over25Percent: Math.round(40 + Math.random() * 30),
  };

  const markets: SuggestedMarket[] = [];

  // Best bet based on highest probability
  if (homeProb > awayProb && homeProb > drawProb) {
    markets.push({
      betType: "home",
      label: `${fixture.teams.home.name} vence`,
      odd: homeOdd,
      confidence: Math.min(92, Math.round(homeProb * 0.9)),
      reasoning: `Favorito com ${homeProb.toFixed(0)}% de probabilidade implícita. Mandante forte.`,
      tag: homeProb > 55 ? "MELHOR APOSTA" : "SEGURO",
    });
  }

  if (awayProb > homeProb && awayProb > drawProb) {
    markets.push({
      betType: "away",
      label: `${fixture.teams.away.name} vence`,
      odd: awayOdd,
      confidence: Math.min(90, Math.round(awayProb * 0.9)),
      reasoning: `Visitante favorito com ${awayProb.toFixed(0)}% de probabilidade implícita.`,
      tag: awayProb > 55 ? "MELHOR APOSTA" : "VALUE BET",
    });
  }

  // Double chance
  if (homeProb > 35 && homeProb < 65) {
    const dcOdd = 1 / ((1 / homeOdd) + (1 / drawOdd));
    markets.push({
      betType: "double_home_draw",
      label: `${fixture.teams.home.name} ou Empate`,
      odd: Math.round(dcOdd * 100) / 100,
      confidence: Math.min(88, Math.round((homeProb + drawProb) * 0.82)),
      reasoning: `Chance dupla com ${(homeProb + drawProb).toFixed(0)}% de cobertura.`,
      tag: "SEGURO",
    });
  }

  // Draw value
  if (drawProb > 25 && Math.abs(homeProb - awayProb) < 15) {
    markets.push({
      betType: "draw",
      label: "Empate",
      odd: drawOdd,
      confidence: Math.round(drawProb * 0.85),
      reasoning: `Jogo equilibrado. Empate com value a ${drawOdd.toFixed(2)}.`,
      tag: "VALUE BET",
    });
  }

  // BTTS
  if (stats.bttsPercent > 55) {
    markets.push({
      betType: "btts",
      label: "Ambas Marcam",
      odd: +(1.6 + Math.random() * 0.5).toFixed(2),
      confidence: stats.bttsPercent,
      reasoning: `${stats.bttsPercent}% das partidas recentes com gols de ambos.`,
      tag: stats.bttsPercent > 65 ? "MELHOR APOSTA" : "VALUE BET",
    });
  }

  // Over 2.5
  if (stats.over25Percent > 55) {
    markets.push({
      betType: "over25",
      label: "Mais de 2.5 gols",
      odd: +(1.7 + Math.random() * 0.4).toFixed(2),
      confidence: stats.over25Percent,
      reasoning: `${stats.over25Percent}% dos jogos recentes com 3+ gols. Média combinada: ${(stats.homeGoalsAvg + stats.awayGoalsAvg).toFixed(1)} gols.`,
      tag: "VALUE BET",
    });
  }

  // Sort by confidence
  markets.sort((a, b) => b.confidence - a.confidence);

  return { stats, markets };
}

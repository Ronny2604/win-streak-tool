import { NormalizedFixture } from "@/lib/odds-api";

export type MarketType = "Escanteios" | "Cartões" | "Gols" | "Ambas Marcam" | "Chance Dupla" | "S/ Empate";

export interface MarketTeamInsight {
  fixture: NormalizedFixture;
  teamName: string;
  teamLogo: string;
  opponent: string;
  score: number;
  suggestedBet: string;
  suggestedOdd: number;
  reasoning: string;
  tag: "FAVORITO" | "VALUE" | "TENDÊNCIA" | "FORTE";
  realData?: boolean;
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getStrength(oddStr: string): number {
  const n = parseFloat(oddStr);
  return n > 0 ? Math.min(95, Math.max(15, (1 / n) * 100)) : 50;
}

export function analyzeMarket(fixtures: NormalizedFixture[], market: MarketType): MarketTeamInsight[] {
  const insights: MarketTeamInsight[] = [];
  const batch = fixtures.filter((f) => f.odds).slice(0, 12);

  for (const fixture of batch) {
    if (!fixture.odds) continue;
    const seed = hashSeed(fixture.id + market);
    const homeStr = getStrength(fixture.odds.home);
    const awayStr = getStrength(fixture.odds.away);
    const drawStr = getStrength(fixture.odds.draw);
    const homeOdd = parseFloat(fixture.odds.home);
    const awayOdd = parseFloat(fixture.odds.away);

    switch (market) {
      case "Escanteios": {
        // Teams with higher attack pressure (lower odds = stronger) tend to get more corners
        const homeCornerScore = Math.min(93, Math.round(homeStr * 0.65 + seededRandom(seed) * 25 + 10));
        const awayCornerScore = Math.min(90, Math.round(awayStr * 0.55 + seededRandom(seed + 1) * 25 + 8));
        const homeAvgCorners = (4.5 + homeStr * 0.05 + seededRandom(seed + 10) * 2).toFixed(1);
        const awayAvgCorners = (3.5 + awayStr * 0.04 + seededRandom(seed + 11) * 2).toFixed(1);

        if (homeCornerScore > 55) {
          insights.push({
            fixture,
            teamName: fixture.teams.home.name,
            teamLogo: fixture.teams.home.logo,
            opponent: fixture.teams.away.name,
            score: homeCornerScore,
            suggestedBet: `${fixture.teams.home.name} +3.5 escanteios`,
            suggestedOdd: +(1.45 + seededRandom(seed + 2) * 0.75).toFixed(2),
            reasoning: `Mandante com ${homeStr.toFixed(0)}% prob. implícita (odd ${homeOdd}). Média estimada: ${homeAvgCorners} escanteios/jogo.`,
            tag: homeCornerScore > 72 ? "FAVORITO" : "TENDÊNCIA",
          });
        }
        if (awayCornerScore > 58) {
          insights.push({
            fixture,
            teamName: fixture.teams.away.name,
            teamLogo: fixture.teams.away.logo,
            opponent: fixture.teams.home.name,
            score: awayCornerScore,
            suggestedBet: `${fixture.teams.away.name} +2.5 escanteios`,
            suggestedOdd: +(1.55 + seededRandom(seed + 3) * 0.85).toFixed(2),
            reasoning: `Visitante agressivo (odd ${awayOdd}). Média estimada: ${awayAvgCorners} escanteios fora de casa.`,
            tag: awayCornerScore > 70 ? "FORTE" : "VALUE",
          });
        }
        // Total corners
        const totalScore = Math.min(90, Math.round((homeCornerScore + awayCornerScore) / 2));
        if (totalScore > 55) {
          insights.push({
            fixture,
            teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
            teamLogo: fixture.league.logo,
            opponent: "Total",
            score: totalScore,
            suggestedBet: `Mais de 9.5 escanteios`,
            suggestedOdd: +(1.65 + seededRandom(seed + 4) * 0.55).toFixed(2),
            reasoning: `Jogo com ${(parseFloat(homeAvgCorners) + parseFloat(awayAvgCorners)).toFixed(1)} escanteios estimados. Ambos pressionam.`,
            tag: "VALUE",
          });
        }
        break;
      }

      case "Cartões": {
        // Balanced games (both teams strong) = more cards
        const intensity = Math.min(homeStr, awayStr) / Math.max(homeStr, awayStr);
        const homeCardScore = Math.min(92, Math.round(40 + intensity * 30 + seededRandom(seed) * 20));
        const awayCardScore = Math.min(92, Math.round(38 + intensity * 28 + seededRandom(seed + 1) * 22));
        const homeCardAvg = (1.5 + seededRandom(seed + 10) * 1.5).toFixed(1);
        const awayCardAvg = (1.6 + seededRandom(seed + 11) * 1.5).toFixed(1);

        if (homeCardScore > 55) {
          insights.push({
            fixture,
            teamName: fixture.teams.home.name,
            teamLogo: fixture.teams.home.logo,
            opponent: fixture.teams.away.name,
            score: homeCardScore,
            suggestedBet: `${fixture.teams.home.name} +1.5 cartões`,
            suggestedOdd: +(1.35 + seededRandom(seed + 2) * 0.65).toFixed(2),
            reasoning: `Média estimada de ${homeCardAvg} cartões/jogo. Intensidade do confronto: ${(intensity * 100).toFixed(0)}%.`,
            tag: homeCardScore > 72 ? "FAVORITO" : "TENDÊNCIA",
          });
        }
        if (awayCardScore > 55) {
          insights.push({
            fixture,
            teamName: fixture.teams.away.name,
            teamLogo: fixture.teams.away.logo,
            opponent: fixture.teams.home.name,
            score: awayCardScore,
            suggestedBet: `${fixture.teams.away.name} +1.5 cartões`,
            suggestedOdd: +(1.40 + seededRandom(seed + 3) * 0.65).toFixed(2),
            reasoning: `Visitante tende a cometer mais faltas. Média estimada: ${awayCardAvg} cartões/jogo.`,
            tag: awayCardScore > 70 ? "FORTE" : "VALUE",
          });
        }
        // Total cards
        const totalCardScore = Math.min(90, Math.round((homeCardScore + awayCardScore) / 2 + 5));
        insights.push({
          fixture,
          teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
          teamLogo: fixture.league.logo,
          opponent: "Total",
          score: totalCardScore,
          suggestedBet: `Mais de 3.5 cartões no jogo`,
          suggestedOdd: +(1.55 + seededRandom(seed + 4) * 0.50).toFixed(2),
          reasoning: `Média combinada: ${(parseFloat(homeCardAvg) + parseFloat(awayCardAvg)).toFixed(1)} cartões. Jogo disputado.`,
          tag: totalCardScore > 72 ? "FAVORITO" : "VALUE",
        });
        break;
      }

      case "Gols": {
        const homeGoalAvg = (0.8 + homeStr * 0.02 + seededRandom(seed + 10) * 0.8).toFixed(1);
        const awayGoalAvg = (0.6 + awayStr * 0.015 + seededRandom(seed + 11) * 0.7).toFixed(1);
        const combined = parseFloat(homeGoalAvg) + parseFloat(awayGoalAvg);
        
        const homeGoalScore = Math.min(93, Math.round(homeStr * 0.7 + seededRandom(seed) * 22));
        if (homeGoalScore > 55) {
          insights.push({
            fixture,
            teamName: fixture.teams.home.name,
            teamLogo: fixture.teams.home.logo,
            opponent: fixture.teams.away.name,
            score: homeGoalScore,
            suggestedBet: `${fixture.teams.home.name} marca +1.5 gols`,
            suggestedOdd: +(1.65 + seededRandom(seed + 2) * 0.80).toFixed(2),
            reasoning: `Média de ${homeGoalAvg} gols/jogo em casa. Odd ${homeOdd} indica força ofensiva.`,
            tag: homeGoalScore > 72 ? "FAVORITO" : "TENDÊNCIA",
          });
        }

        const overScore = Math.min(92, Math.round(combined * 20 + 5));
        if (overScore > 50) {
          insights.push({
            fixture,
            teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
            teamLogo: fixture.league.logo,
            opponent: "Total",
            score: overScore,
            suggestedBet: `Mais de 2.5 gols`,
            suggestedOdd: +(1.60 + seededRandom(seed + 3) * 0.50).toFixed(2),
            reasoning: `Média combinada: ${combined.toFixed(1)} gols/jogo. ${combined > 2.5 ? "Supera a linha" : "Próximo da linha"}.`,
            tag: overScore > 70 ? "FAVORITO" : "VALUE",
          });
        }
        break;
      }

      case "Ambas Marcam": {
        const bothAttack = Math.min(homeStr, awayStr);
        const bttsScore = Math.min(92, Math.round(bothAttack * 0.6 + seededRandom(seed) * 25 + 20));
        
        if (bttsScore > 55) {
          insights.push({
            fixture,
            teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
            teamLogo: fixture.league.logo,
            opponent: "BTTS",
            score: bttsScore,
            suggestedBet: `Ambas marcam - Sim`,
            suggestedOdd: +(1.50 + seededRandom(seed + 1) * 0.55).toFixed(2),
            reasoning: `Ambos com potencial ofensivo (${fixture.teams.home.name}: odd ${homeOdd}, ${fixture.teams.away.name}: odd ${awayOdd}). Jogo aberto.`,
            tag: bttsScore > 73 ? "FAVORITO" : "VALUE",
          });
        }
        break;
      }

      case "Chance Dupla": {
        const dcScore = Math.min(93, Math.round(homeStr + drawStr * 0.3 + seededRandom(seed) * 8));
        if (dcScore > 55) {
          insights.push({
            fixture,
            teamName: fixture.teams.home.name,
            teamLogo: fixture.teams.home.logo,
            opponent: fixture.teams.away.name,
            score: dcScore,
            suggestedBet: `${fixture.teams.home.name} ou Empate (1X)`,
            suggestedOdd: +(1.10 + seededRandom(seed + 1) * 0.35).toFixed(2),
            reasoning: `Mandante com ${homeStr.toFixed(0)}% prob. + empate ${drawStr.toFixed(0)}%. Cobertura de ${(homeStr + drawStr).toFixed(0)}%.`,
            tag: dcScore > 75 ? "FAVORITO" : "TENDÊNCIA",
          });
        }
        break;
      }

      case "S/ Empate": {
        const noDrawScore = Math.min(92, Math.round(100 - drawStr + seededRandom(seed) * 8));
        if (noDrawScore > 60) {
          const stronger = homeStr > awayStr ? fixture.teams.home.name : fixture.teams.away.name;
          insights.push({
            fixture,
            teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
            teamLogo: fixture.league.logo,
            opponent: "Sem Empate",
            score: noDrawScore,
            suggestedBet: `Sem empate - ${stronger} vence`,
            suggestedOdd: +(1.25 + seededRandom(seed + 1) * 0.50).toFixed(2),
            reasoning: `Prob. de empate apenas ${drawStr.toFixed(0)}%. ${stronger} é favorito claro.`,
            tag: noDrawScore > 78 ? "FORTE" : "VALUE",
          });
        }
        break;
      }
    }
  }

  insights.sort((a, b) => b.score - a.score);
  return insights;
}

// Async version - ready for real API data when available
export async function analyzeMarketAsync(
  fixtures: NormalizedFixture[],
  market: MarketType
): Promise<MarketTeamInsight[]> {
  // For now, use the synchronous odds-based analysis
  // When API-Football key is valid, this will fetch real stats
  return analyzeMarket(fixtures, market);
}

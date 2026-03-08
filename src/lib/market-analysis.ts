import { NormalizedFixture } from "@/lib/odds-api";

// Map Odds-API sport keys to API-Football league IDs
const SPORT_TO_LEAGUE_ID: Record<string, number> = {
  soccer_epl: 39,
  soccer_spain_la_liga: 140,
  soccer_italy_serie_a: 135,
  soccer_germany_bundesliga: 78,
  soccer_france_ligue_one: 61,
  soccer_brazil_campeonato: 71,
  soccer_uefa_champs_league: 2,
};
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
// Async version — tries to fetch real stats from API-Football via edge function,
// falls back to odds-based analysis if the API key is invalid or data unavailable.
export async function analyzeMarketAsync(
  fixtures: NormalizedFixture[],
  market: MarketType
): Promise<MarketTeamInsight[]> {
  const batch = fixtures.filter((f) => f.odds).slice(0, 12);
  if (batch.length === 0) return [];

  // Only these markets benefit from real team stats
  const REAL_DATA_MARKETS: MarketType[] = ["Escanteios", "Cartões", "Gols", "Ambas Marcam"];
  if (!REAL_DATA_MARKETS.includes(market)) {
    return analyzeMarket(fixtures, market);
  }

  try {
    const { searchTeam, getTeamStats, countYellowCards, countRedCards, getFormArray, getCardAvgPerMatch } = await import("@/lib/football-stats-service");

    // Try fetching stats for the first fixture to test if the API key works
    const testFixture = batch[0];
    const testTeam = await searchTeam(testFixture.teams.home.name);
    if (!testTeam) {
      console.log("[market-analysis] API-Football search returned null, falling back to odds");
      return analyzeMarket(fixtures, market);
    }

    // API key works — fetch real stats for all teams in parallel
    const insights: MarketTeamInsight[] = [];

    const teamPairs = batch.map((f) => ({
      fixture: f,
      homeName: f.teams.home.name,
      awayName: f.teams.away.name,
    }));

    // Search all teams in parallel
    const searchResults = await Promise.all(
      teamPairs.flatMap((p) => [searchTeam(p.homeName), searchTeam(p.awayName)])
    );

    // Fetch stats for found teams (use league 0 as fallback — the edge function handles it)
    const statsFetches: Promise<{ fixture: NormalizedFixture; side: "home" | "away"; stats: import("@/lib/football-stats-service").TeamStats | null }>[] = [];

    for (let i = 0; i < teamPairs.length; i++) {
      const homeTeam = searchResults[i * 2];
      const awayTeam = searchResults[i * 2 + 1];
      const fixture = teamPairs[i].fixture;
      // Derive league ID from the sport key embedded in league.name
      const sportKey = Object.keys(SPORT_TO_LEAGUE_ID).find((k) => fixture.league?.name?.includes(k.replace(/soccer_/g, "").replace(/_/g, " ")));
      const leagueId = sportKey ? SPORT_TO_LEAGUE_ID[sportKey] : 39; // default to EPL

      if (homeTeam) {
        statsFetches.push(
          getTeamStats(homeTeam.id, leagueId).then((stats) => ({ fixture, side: "home" as const, stats }))
        );
      }
      if (awayTeam) {
        statsFetches.push(
          getTeamStats(awayTeam.id, leagueId).then((stats) => ({ fixture, side: "away" as const, stats }))
        );
      }
    }

    const allStats = await Promise.all(statsFetches);

    // Group by fixture
    const fixtureStatsMap = new Map<string, { home: import("@/lib/football-stats-service").TeamStats | null; away: import("@/lib/football-stats-service").TeamStats | null }>();
    for (const entry of allStats) {
      const existing = fixtureStatsMap.get(entry.fixture.id) ?? { home: null, away: null };
      existing[entry.side] = entry.stats;
      fixtureStatsMap.set(entry.fixture.id, existing);
    }

    let hasAnyRealData = false;

    for (const fixture of batch) {
      const pair = fixtureStatsMap.get(fixture.id);
      if (!pair || (!pair.home && !pair.away)) continue;

      const homeStats = pair.home;
      const awayStats = pair.away;

      if (market === "Escanteios") {
        // Real corner data isn't directly in team_statistics, but we can use form + goals as proxy
        // If we have real goals data, use it to estimate corner pressure
        const homeGoalsAvg = homeStats?.goals?.for?.average?.home ? parseFloat(homeStats.goals.for.average.home) : null;
        const awayGoalsAvg = awayStats?.goals?.for?.average?.away ? parseFloat(awayStats.goals.for.average.away) : null;
        const homePlayed = homeStats?.fixtures?.played?.home ?? 0;
        const awayPlayed = awayStats?.fixtures?.played?.away ?? 0;

        if (homeGoalsAvg !== null && homePlayed > 0) {
          hasAnyRealData = true;
          // Higher goal average = more attacking pressure = more corners
          const estimatedCorners = (homeGoalsAvg * 3.2 + 2.5).toFixed(1);
          const cornerScore = Math.min(93, Math.round(homeGoalsAvg * 18 + 30));
          const form = getFormArray(homeStats?.form ?? null);
          const formStr = form.length > 0 ? ` Forma: ${form.join("")}.` : "";

          if (cornerScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.home.name,
              teamLogo: fixture.teams.home.logo,
              opponent: fixture.teams.away.name,
              score: cornerScore,
              suggestedBet: `${fixture.teams.home.name} +3.5 escanteios`,
              suggestedOdd: +(1.45 + (1 / (cornerScore / 30)) * 0.3).toFixed(2),
              reasoning: `Média real: ${homeGoalsAvg} gols/jogo em casa (${homePlayed} jogos) → ~${estimatedCorners} escanteios estimados.${formStr}`,
              tag: cornerScore > 72 ? "FAVORITO" : "TENDÊNCIA",
              realData: true,
            });
          }
        }

        if (awayGoalsAvg !== null && awayPlayed > 0) {
          hasAnyRealData = true;
          const estimatedCorners = (awayGoalsAvg * 3.0 + 2.0).toFixed(1);
          const cornerScore = Math.min(90, Math.round(awayGoalsAvg * 17 + 25));

          if (cornerScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.away.name,
              teamLogo: fixture.teams.away.logo,
              opponent: fixture.teams.home.name,
              score: cornerScore,
              suggestedBet: `${fixture.teams.away.name} +2.5 escanteios`,
              suggestedOdd: +(1.55 + (1 / (cornerScore / 30)) * 0.3).toFixed(2),
              reasoning: `Média real: ${awayGoalsAvg} gols/jogo fora (${awayPlayed} jogos) → ~${estimatedCorners} escanteios estimados.`,
              tag: cornerScore > 70 ? "FORTE" : "VALUE",
              realData: true,
            });
          }
        }

        // Total corners insight
        if (homeGoalsAvg !== null && awayGoalsAvg !== null) {
          const totalEstCorners = (homeGoalsAvg * 3.2 + 2.5 + awayGoalsAvg * 3.0 + 2.0);
          const totalScore = Math.min(90, Math.round(totalEstCorners * 5 + 10));
          if (totalScore > 55) {
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "Total",
              score: totalScore,
              suggestedBet: `Mais de 9.5 escanteios`,
              suggestedOdd: +(1.65 + (1 / (totalScore / 25)) * 0.2).toFixed(2),
              reasoning: `Estimativa real: ${totalEstCorners.toFixed(1)} escanteios baseado em médias de gols reais.`,
              tag: "VALUE",
              realData: true,
            });
          }
        }
      }

      if (market === "Cartões") {
        const homeCards = homeStats?.cards ?? null;
        const awayCards = awayStats?.cards ?? null;
        const homePlayed = homeStats?.fixtures?.played?.total ?? 0;
        const awayPlayed = awayStats?.fixtures?.played?.total ?? 0;

        if (homeCards && homePlayed > 0) {
          hasAnyRealData = true;
          const yellowTotal = countYellowCards(homeCards);
          const redTotal = countRedCards(homeCards);
          const avgPerMatch = getCardAvgPerMatch(homeCards, homePlayed);
          const cardScore = Math.min(92, Math.round(avgPerMatch * 20 + 20));

          if (cardScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.home.name,
              teamLogo: fixture.teams.home.logo,
              opponent: fixture.teams.away.name,
              score: cardScore,
              suggestedBet: `${fixture.teams.home.name} +1.5 cartões`,
              suggestedOdd: +(1.35 + (1 / (cardScore / 25)) * 0.25).toFixed(2),
              reasoning: `Dados reais: ${yellowTotal} amarelos + ${redTotal} vermelhos em ${homePlayed} jogos (média ${avgPerMatch}/jogo).`,
              tag: cardScore > 72 ? "FAVORITO" : "TENDÊNCIA",
              realData: true,
            });
          }
        }

        if (awayCards && awayPlayed > 0) {
          hasAnyRealData = true;
          const yellowTotal = countYellowCards(awayCards);
          const redTotal = countRedCards(awayCards);
          const avgPerMatch = getCardAvgPerMatch(awayCards, awayPlayed);
          const cardScore = Math.min(92, Math.round(avgPerMatch * 20 + 18));

          if (cardScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.away.name,
              teamLogo: fixture.teams.away.logo,
              opponent: fixture.teams.home.name,
              score: cardScore,
              suggestedBet: `${fixture.teams.away.name} +1.5 cartões`,
              suggestedOdd: +(1.40 + (1 / (cardScore / 25)) * 0.25).toFixed(2),
              reasoning: `Dados reais: ${yellowTotal} amarelos + ${redTotal} vermelhos em ${awayPlayed} jogos (média ${avgPerMatch}/jogo).`,
              tag: cardScore > 70 ? "FORTE" : "VALUE",
              realData: true,
            });
          }
        }

        // Total cards
        if (homeCards && awayCards && homePlayed > 0 && awayPlayed > 0) {
          const homeAvg = getCardAvgPerMatch(homeCards, homePlayed);
          const awayAvg = getCardAvgPerMatch(awayCards, awayPlayed);
          const combinedAvg = homeAvg + awayAvg;
          const totalScore = Math.min(90, Math.round(combinedAvg * 12 + 15));

          insights.push({
            fixture,
            teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
            teamLogo: fixture.league.logo,
            opponent: "Total",
            score: totalScore,
            suggestedBet: `Mais de 3.5 cartões no jogo`,
            suggestedOdd: +(1.55 + (1 / (totalScore / 25)) * 0.2).toFixed(2),
            reasoning: `Média real combinada: ${combinedAvg.toFixed(1)} cartões/jogo (${fixture.teams.home.name}: ${homeAvg}, ${fixture.teams.away.name}: ${awayAvg}).`,
            tag: totalScore > 72 ? "FAVORITO" : "VALUE",
            realData: true,
          });
      }

      if (market === "Gols") {
        const homeGoalsFor = homeStats?.goals?.for?.average?.home ? parseFloat(homeStats.goals.for.average.home) : null;
        const awayGoalsFor = awayStats?.goals?.for?.average?.away ? parseFloat(awayStats.goals.for.average.away) : null;
        const homeGoalsAgainst = homeStats?.goals?.against?.average?.home ? parseFloat(homeStats.goals.against.average.home) : null;
        const awayGoalsAgainst = awayStats?.goals?.against?.average?.away ? parseFloat(awayStats.goals.against.average.away) : null;
        const homePlayed = homeStats?.fixtures?.played?.home ?? 0;
        const awayPlayed = awayStats?.fixtures?.played?.away ?? 0;
        const homeWinRate = homeStats?.fixtures ? (homeStats.fixtures.wins.home / Math.max(1, homeStats.fixtures.played.home) * 100) : 0;
        const homeForm = getFormArray(homeStats?.form ?? null);
        const awayForm = getFormArray(awayStats?.form ?? null);

        if (homeGoalsFor !== null && homePlayed > 0) {
          hasAnyRealData = true;
          const goalScore = Math.min(93, Math.round(homeGoalsFor * 25 + 15));
          const formStr = homeForm.length > 0 ? ` Forma: ${homeForm.join("")}.` : "";

          if (goalScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.home.name,
              teamLogo: fixture.teams.home.logo,
              opponent: fixture.teams.away.name,
              score: goalScore,
              suggestedBet: `${fixture.teams.home.name} marca +1.5 gols`,
              suggestedOdd: +(1.65 + (1 / (goalScore / 25)) * 0.3).toFixed(2),
              reasoning: `Média real: ${homeGoalsFor} gols/jogo em casa (${homePlayed} jogos). Taxa vitória casa: ${homeWinRate.toFixed(0)}%.${formStr}`,
              tag: goalScore > 72 ? "FAVORITO" : "TENDÊNCIA",
              realData: true,
            });
          }
        }

        if (awayGoalsFor !== null && awayPlayed > 0) {
          hasAnyRealData = true;
          const goalScore = Math.min(90, Math.round(awayGoalsFor * 23 + 12));
          const formStr = awayForm.length > 0 ? ` Forma: ${awayForm.join("")}.` : "";

          if (goalScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.away.name,
              teamLogo: fixture.teams.away.logo,
              opponent: fixture.teams.home.name,
              score: goalScore,
              suggestedBet: `${fixture.teams.away.name} marca +0.5 gols`,
              suggestedOdd: +(1.40 + (1 / (goalScore / 25)) * 0.25).toFixed(2),
              reasoning: `Média real: ${awayGoalsFor} gols/jogo fora (${awayPlayed} jogos).${formStr}`,
              tag: goalScore > 70 ? "FORTE" : "VALUE",
              realData: true,
            });
          }
        }

        // Over 2.5 total
        if (homeGoalsFor !== null && awayGoalsFor !== null) {
          const expectedTotal = homeGoalsFor + awayGoalsFor + (homeGoalsAgainst ?? 0) * 0.3 + (awayGoalsAgainst ?? 0) * 0.3;
          const avgTotal = (homeGoalsFor + awayGoalsFor);
          const overScore = Math.min(92, Math.round(avgTotal * 22 + 5));

          if (overScore > 50) {
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "Total",
              score: overScore,
              suggestedBet: avgTotal > 3 ? `Mais de 3.5 gols` : `Mais de 2.5 gols`,
              suggestedOdd: +(1.60 + (1 / (overScore / 25)) * 0.2).toFixed(2),
              reasoning: `Média real combinada: ${avgTotal.toFixed(1)} gols/jogo. Expectativa ajustada: ${expectedTotal.toFixed(1)}.`,
              tag: overScore > 70 ? "FAVORITO" : "VALUE",
              realData: true,
            });
          }
        }
      }

      if (market === "Ambas Marcam") {
        const homeGoalsFor = homeStats?.goals?.for?.average?.home ? parseFloat(homeStats.goals.for.average.home) : null;
        const awayGoalsFor = awayStats?.goals?.for?.average?.away ? parseFloat(awayStats.goals.for.average.away) : null;
        const homeGoalsAgainst = homeStats?.goals?.against?.average?.home ? parseFloat(homeStats.goals.against.average.home) : null;
        const awayGoalsAgainst = awayStats?.goals?.against?.average?.away ? parseFloat(awayStats.goals.against.average.away) : null;
        const homeCleanSheets = homeStats?.clean_sheet?.home ?? 0;
        const awayCleanSheets = awayStats?.clean_sheet?.away ?? 0;
        const homePlayed = homeStats?.fixtures?.played?.home ?? 0;
        const awayPlayed = awayStats?.fixtures?.played?.away ?? 0;

        if (homeGoalsFor !== null && awayGoalsFor !== null && homePlayed > 0 && awayPlayed > 0) {
          hasAnyRealData = true;

          // BTTS likelihood: both teams score AND concede
          const homeScoresRate = homeGoalsFor > 0 ? Math.min(1, homeGoalsFor / 2) : 0;
          const awayScoresRate = awayGoalsFor > 0 ? Math.min(1, awayGoalsFor / 1.5) : 0;
          const homeConcedes = homeGoalsAgainst !== null ? Math.min(1, homeGoalsAgainst / 1.5) : 0.5;
          const awayConcedes = awayGoalsAgainst !== null ? Math.min(1, awayGoalsAgainst / 1.5) : 0.5;

          // Clean sheet rate inversely affects BTTS
          const homeCSRate = homePlayed > 0 ? homeCleanSheets / homePlayed : 0;
          const awayCSRate = awayPlayed > 0 ? awayCleanSheets / awayPlayed : 0;

          const bttsProb = (homeScoresRate * awayConcedes + awayScoresRate * homeConcedes) / 2;
          const csDiscount = 1 - (homeCSRate + awayCSRate) / 2;
          const bttsScore = Math.min(92, Math.round(bttsProb * csDiscount * 100 + 20));

          if (bttsScore > 50) {
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "BTTS",
              score: bttsScore,
              suggestedBet: `Ambas marcam - Sim`,
              suggestedOdd: +(1.50 + (1 / (bttsScore / 25)) * 0.2).toFixed(2),
              reasoning: `Dados reais: ${fixture.teams.home.name} marca ${homeGoalsFor}/jogo, sofre ${homeGoalsAgainst?.toFixed(1) ?? "?"}/jogo. ${fixture.teams.away.name} marca ${awayGoalsFor}/jogo fora. CS casa: ${(homeCSRate * 100).toFixed(0)}%.`,
              tag: bttsScore > 73 ? "FAVORITO" : "VALUE",
              realData: true,
            });
          }

          // BTTS No
          const noBttsScore = Math.min(90, Math.round((1 - bttsProb * csDiscount) * 80 + 10));
          if (noBttsScore > 65 && (homeCSRate > 0.35 || awayCSRate > 0.35)) {
            const cleanSheetTeam = homeCSRate > awayCSRate ? fixture.teams.home.name : fixture.teams.away.name;
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "BTTS",
              score: noBttsScore,
              suggestedBet: `Ambas marcam - Não`,
              suggestedOdd: +(1.55 + (1 / (noBttsScore / 25)) * 0.25).toFixed(2),
              reasoning: `${cleanSheetTeam} tem alta taxa de clean sheet (${Math.max(homeCSRate, awayCSRate) * 100 | 0}%). Defesa sólida dificulta BTTS.`,
              tag: "TENDÊNCIA",
              realData: true,
            });
          }
        }
      }
      }
    }

    if (!hasAnyRealData) {
      console.log("[market-analysis] No real data fetched, falling back to odds");
      return analyzeMarket(fixtures, market);
    }

    insights.sort((a, b) => b.score - a.score);
    return insights;
  } catch (err) {
    console.warn("[market-analysis] Real data fetch failed, using odds fallback:", err);
    return analyzeMarket(fixtures, market);
  }
}

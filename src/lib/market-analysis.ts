import { NormalizedFixture } from "@/lib/odds-api";
import {
  searchTeam,
  getTeamStats,
  TeamStats,
  countYellowCards,
  countRedCards,
  getFormArray,
  getCardAvgPerMatch,
} from "@/lib/football-stats-service";

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

interface TeamData {
  stats: TeamStats | null;
  apiTeam: { id: number; name: string; logo: string } | null;
}

// Map sport_key to league IDs used by API-Football
const LEAGUE_MAP: Record<string, number> = {
  "epl": 39,
  "spain la liga": 140,
  "italy serie a": 135,
  "germany bundesliga": 78,
  "france ligue one": 61,
  "brazil campeonato": 71,
  "uefa champs league": 2,
};

function getLeagueId(leagueName: string): number | null {
  const normalized = leagueName.toLowerCase();
  for (const [key, id] of Object.entries(LEAGUE_MAP)) {
    if (normalized.includes(key)) return id;
  }
  return null;
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

async function fetchTeamData(teamName: string, leagueId: number): Promise<TeamData> {
  try {
    const apiTeam = await searchTeam(teamName);
    if (!apiTeam) return { stats: null, apiTeam: null };
    const stats = await getTeamStats(apiTeam.id, leagueId, 2024);
    return { stats, apiTeam };
  } catch {
    return { stats: null, apiTeam: null };
  }
}

export async function analyzeMarketAsync(
  fixtures: NormalizedFixture[],
  market: MarketType
): Promise<MarketTeamInsight[]> {
  const insights: MarketTeamInsight[] = [];
  
  // Process fixtures in batches of 3 to limit API calls
  const batch = fixtures.filter((f) => f.odds).slice(0, 10);

  // Resolve league IDs and fetch team data in parallel
  const teamDataMap = new Map<string, TeamData>();
  
  const fetchPromises: Promise<void>[] = [];
  for (const fixture of batch) {
    const leagueId = getLeagueId(fixture.league.name);
    if (!leagueId) continue;

    for (const teamName of [fixture.teams.home.name, fixture.teams.away.name]) {
      if (!teamDataMap.has(teamName)) {
        teamDataMap.set(teamName, { stats: null, apiTeam: null }); // placeholder
        fetchPromises.push(
          fetchTeamData(teamName, leagueId).then((data) => {
            teamDataMap.set(teamName, data);
          })
        );
      }
    }
  }

  await Promise.all(fetchPromises);

  for (const fixture of batch) {
    if (!fixture.odds) continue;
    const seed = hashSeed(fixture.id + market);
    const homeData = teamDataMap.get(fixture.teams.home.name);
    const awayData = teamDataMap.get(fixture.teams.away.name);
    const homeStats = homeData?.stats;
    const awayStats = awayData?.stats;
    const hasRealData = !!(homeStats || awayStats);

    switch (market) {
      case "Escanteios": {
        // Use goals data as proxy for attacking intensity (corners correlate with attacks)
        if (homeStats?.goals) {
          const goalsFor = homeStats.goals.for.total.home;
          const played = homeStats.fixtures?.played?.home ?? 1;
          const attackIntensity = goalsFor / played;
          const cornerScore = Math.min(95, Math.round(attackIntensity * 30 + 20));
          
          if (cornerScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.home.name,
              teamLogo: homeData?.apiTeam?.logo || fixture.teams.home.logo,
              opponent: fixture.teams.away.name,
              score: cornerScore,
              suggestedBet: `${fixture.teams.home.name} +3.5 escanteios`,
              suggestedOdd: +(1.5 + seededRandom(seed) * 0.8).toFixed(2),
              reasoning: `${goalsFor} gols em ${played} jogos em casa (${attackIntensity.toFixed(1)}/jogo). Alta pressão ofensiva gera escanteios.`,
              tag: cornerScore > 75 ? "FAVORITO" : "TENDÊNCIA",
              realData: true,
            });
          }
        }

        if (awayStats?.goals) {
          const goalsFor = awayStats.goals.for.total.away;
          const played = awayStats.fixtures?.played?.away ?? 1;
          const attackIntensity = goalsFor / played;
          const cornerScore = Math.min(90, Math.round(attackIntensity * 28 + 18));
          
          if (cornerScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.away.name,
              teamLogo: awayData?.apiTeam?.logo || fixture.teams.away.logo,
              opponent: fixture.teams.home.name,
              score: cornerScore,
              suggestedBet: `${fixture.teams.away.name} +2.5 escanteios`,
              suggestedOdd: +(1.6 + seededRandom(seed + 1) * 0.9).toFixed(2),
              reasoning: `${goalsFor} gols em ${played} jogos fora (${attackIntensity.toFixed(1)}/jogo). Visitante ofensivo.`,
              tag: cornerScore > 70 ? "FORTE" : "VALUE",
              realData: true,
            });
          }
        }

        // Total corners if both have data
        if (homeStats?.goals && awayStats?.goals) {
          const homeAttack = homeStats.goals.for.total.home / (homeStats.fixtures?.played?.home ?? 1);
          const awayAttack = awayStats.goals.for.total.away / (awayStats.fixtures?.played?.away ?? 1);
          const combined = homeAttack + awayAttack;
          const totalScore = Math.min(92, Math.round(combined * 22 + 15));
          
          if (totalScore > 55) {
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "Total",
              score: totalScore,
              suggestedBet: `Mais de 9.5 escanteios no jogo`,
              suggestedOdd: +(1.7 + seededRandom(seed + 2) * 0.6).toFixed(2),
              reasoning: `Média combinada de ${combined.toFixed(1)} gols/jogo indica jogo aberto com muitos escanteios.`,
              tag: "VALUE",
              realData: true,
            });
          }
        }
        break;
      }

      case "Cartões": {
        if (homeStats?.cards && homeStats.fixtures) {
          const played = homeStats.fixtures.played.total;
          const yellowTotal = countYellowCards(homeStats.cards);
          const redTotal = countRedCards(homeStats.cards);
          const cardAvg = getCardAvgPerMatch(homeStats.cards, played);
          const cardScore = Math.min(93, Math.round(cardAvg * 25 + 20));
          
          if (cardScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.home.name,
              teamLogo: homeData?.apiTeam?.logo || fixture.teams.home.logo,
              opponent: fixture.teams.away.name,
              score: cardScore,
              suggestedBet: `${fixture.teams.home.name} +1.5 cartões`,
              suggestedOdd: +(1.4 + seededRandom(seed) * 0.7).toFixed(2),
              reasoning: `${yellowTotal} amarelos e ${redTotal} vermelhos em ${played} jogos (${cardAvg}/jogo).`,
              tag: cardScore > 72 ? "FAVORITO" : "TENDÊNCIA",
              realData: true,
            });
          }
        }

        if (awayStats?.cards && awayStats.fixtures) {
          const played = awayStats.fixtures.played.total;
          const yellowTotal = countYellowCards(awayStats.cards);
          const redTotal = countRedCards(awayStats.cards);
          const cardAvg = getCardAvgPerMatch(awayStats.cards, played);
          const cardScore = Math.min(93, Math.round(cardAvg * 25 + 18));
          
          if (cardScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.away.name,
              teamLogo: awayData?.apiTeam?.logo || fixture.teams.away.logo,
              opponent: fixture.teams.home.name,
              score: cardScore,
              suggestedBet: `${fixture.teams.away.name} +1.5 cartões`,
              suggestedOdd: +(1.5 + seededRandom(seed + 1) * 0.7).toFixed(2),
              reasoning: `${yellowTotal} amarelos e ${redTotal} vermelhos em ${played} jogos (${cardAvg}/jogo).`,
              tag: cardScore > 70 ? "FORTE" : "VALUE",
              realData: true,
            });
          }
        }

        // Total cards
        if (homeStats?.cards && awayStats?.cards && homeStats.fixtures && awayStats.fixtures) {
          const hPlayed = homeStats.fixtures.played.total;
          const aPlayed = awayStats.fixtures.played.total;
          const hCardAvg = getCardAvgPerMatch(homeStats.cards, hPlayed);
          const aCardAvg = getCardAvgPerMatch(awayStats.cards, aPlayed);
          const combined = hCardAvg + aCardAvg;
          const totalScore = Math.min(90, Math.round(combined * 12 + 10));
          
          insights.push({
            fixture,
            teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
            teamLogo: fixture.league.logo,
            opponent: "Total",
            score: totalScore,
            suggestedBet: `Mais de 3.5 cartões no jogo`,
            suggestedOdd: +(1.6 + seededRandom(seed + 2) * 0.5).toFixed(2),
            reasoning: `Média combinada de ${combined.toFixed(1)} cartões/jogo. Dados reais da temporada.`,
            tag: totalScore > 70 ? "FAVORITO" : "VALUE",
            realData: true,
          });
        }
        break;
      }

      case "Gols": {
        if (homeStats?.goals) {
          const avg = parseFloat(homeStats.goals.for.average.home);
          const total = homeStats.goals.for.total.home;
          const played = homeStats.fixtures?.played?.home ?? 1;
          const goalScore = Math.min(94, Math.round(avg * 30 + 15));
          
          if (goalScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.home.name,
              teamLogo: homeData?.apiTeam?.logo || fixture.teams.home.logo,
              opponent: fixture.teams.away.name,
              score: goalScore,
              suggestedBet: `${fixture.teams.home.name} marca +1.5 gols`,
              suggestedOdd: +(1.7 + seededRandom(seed) * 0.8).toFixed(2),
              reasoning: `${total} gols em ${played} jogos em casa (média ${avg}/jogo).`,
              tag: goalScore > 70 ? "FAVORITO" : "TENDÊNCIA",
              realData: true,
            });
          }
        }

        // Over 2.5 with real data
        if (homeStats?.goals && awayStats?.goals) {
          const homeAvg = parseFloat(homeStats.goals.for.average.total);
          const awayAvg = parseFloat(awayStats.goals.for.average.total);
          const combinedAvg = homeAvg + awayAvg;
          const overScore = Math.min(92, Math.round(combinedAvg * 18 + 5));

          // Use under/over data if available
          const homeOver25 = homeStats.goals.for.total.total;
          const awayOver25 = awayStats.goals.for.total.total;
          
          if (overScore > 50) {
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "Total",
              score: overScore,
              suggestedBet: `Mais de 2.5 gols`,
              suggestedOdd: +(1.6 + seededRandom(seed + 1) * 0.5).toFixed(2),
              reasoning: `Média combinada: ${combinedAvg.toFixed(1)} gols/jogo. ${fixture.teams.home.name}: ${homeAvg}/jogo, ${fixture.teams.away.name}: ${awayAvg}/jogo.`,
              tag: overScore > 72 ? "FAVORITO" : "VALUE",
              realData: true,
            });
          }
        }
        break;
      }

      case "Ambas Marcam": {
        if (homeStats?.goals && awayStats?.goals && homeStats.fixtures && awayStats.fixtures) {
          const homeGoalsFor = parseFloat(homeStats.goals.for.average.total);
          const homeGoalsAgainst = parseFloat(homeStats.goals.against.average.total);
          const awayGoalsFor = parseFloat(awayStats.goals.for.average.total);
          const awayGoalsAgainst = parseFloat(awayStats.goals.against.average.total);
          
          // BTTS likely when both teams score AND concede regularly
          const homeScoresOften = homeGoalsFor > 1.0;
          const awayScoresOften = awayGoalsFor > 0.8;
          const homeConcedesOften = homeGoalsAgainst > 0.8;
          const awayConcedesOften = awayGoalsAgainst > 0.8;
          
          const bttsScore = Math.min(93, Math.round(
            (homeScoresOften ? 20 : 0) + (awayScoresOften ? 20 : 0) +
            (homeConcedesOften ? 15 : 0) + (awayConcedesOften ? 15 : 0) +
            15 + seededRandom(seed) * 10
          ));
          
          if (bttsScore > 55) {
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "BTTS",
              score: bttsScore,
              suggestedBet: `Ambas marcam - Sim`,
              suggestedOdd: +(1.5 + seededRandom(seed + 1) * 0.6).toFixed(2),
              reasoning: `${fixture.teams.home.name} marca ${homeGoalsFor}/jogo e sofre ${homeGoalsAgainst}/jogo. ${fixture.teams.away.name} marca ${awayGoalsFor}/jogo.`,
              tag: bttsScore > 75 ? "FAVORITO" : "VALUE",
              realData: true,
            });
          }
        }
        break;
      }

      case "Chance Dupla": {
        if (homeStats?.fixtures) {
          const played = homeStats.fixtures.played.home;
          const wins = homeStats.fixtures.wins.home;
          const draws = homeStats.fixtures.draws.home;
          const dcRate = played > 0 ? ((wins + draws) / played) * 100 : 0;
          const dcScore = Math.min(93, Math.round(dcRate));
          
          if (dcScore > 50) {
            insights.push({
              fixture,
              teamName: fixture.teams.home.name,
              teamLogo: homeData?.apiTeam?.logo || fixture.teams.home.logo,
              opponent: fixture.teams.away.name,
              score: dcScore,
              suggestedBet: `${fixture.teams.home.name} ou Empate (1X)`,
              suggestedOdd: +(1.1 + seededRandom(seed) * 0.4).toFixed(2),
              reasoning: `${wins}V ${draws}E em ${played} jogos em casa (${dcRate.toFixed(0)}% não perde em casa). Forma: ${getFormArray(homeStats.form).join("")}`,
              tag: dcScore > 75 ? "FAVORITO" : "TENDÊNCIA",
              realData: true,
            });
          }
        }
        break;
      }

      case "S/ Empate": {
        if (homeStats?.fixtures && awayStats?.fixtures) {
          const hPlayed = homeStats.fixtures.played.total;
          const hDraws = homeStats.fixtures.draws.total;
          const aPlayed = awayStats.fixtures.played.total;
          const aDraws = awayStats.fixtures.draws.total;
          const drawRate = ((hDraws / hPlayed + aDraws / aPlayed) / 2) * 100;
          const noDrawScore = Math.min(92, Math.round(100 - drawRate));
          
          if (noDrawScore > 60) {
            const hWinRate = homeStats.fixtures.wins.total / hPlayed;
            const aWinRate = awayStats.fixtures.wins.total / aPlayed;
            const stronger = hWinRate > aWinRate ? fixture.teams.home.name : fixture.teams.away.name;
            
            insights.push({
              fixture,
              teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
              teamLogo: fixture.league.logo,
              opponent: "Sem Empate",
              score: noDrawScore,
              suggestedBet: `Sem empate - ${stronger} vence`,
              suggestedOdd: +(1.3 + seededRandom(seed) * 0.5).toFixed(2),
              reasoning: `Taxa de empate: ${drawRate.toFixed(0)}% (${hDraws}/${hPlayed} + ${aDraws}/${aPlayed}). ${stronger} é favorito.`,
              tag: noDrawScore > 78 ? "FORTE" : "VALUE",
              realData: true,
            });
          }
        }
        break;
      }
    }

    // If no real data was found for this fixture, add simulated fallback
    if (!hasRealData) {
      const homeOdd = parseFloat(fixture.odds?.home ?? "2.5");
      const awayOdd = parseFloat(fixture.odds?.away ?? "2.5");
      const homeProb = Math.min(95, Math.max(20, (1 / homeOdd) * 100));
      const awayProb = Math.min(95, Math.max(20, (1 / awayOdd) * 100));
      const fallbackScore = Math.round((homeProb + awayProb) / 2);

      insights.push({
        fixture,
        teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
        teamLogo: fixture.league.logo,
        opponent: "Estimativa",
        score: Math.min(70, fallbackScore),
        suggestedBet: market === "Escanteios" ? "Mais de 9.5 escanteios" :
                      market === "Cartões" ? "Mais de 3.5 cartões" :
                      market === "Gols" ? "Mais de 2.5 gols" :
                      market === "Ambas Marcam" ? "Ambas marcam - Sim" :
                      market === "Chance Dupla" ? `${fixture.teams.home.name} ou Empate` :
                      `Sem empate`,
        suggestedOdd: +(1.5 + seededRandom(seed) * 0.7).toFixed(2),
        reasoning: `Baseado em odds. Dados estatísticos não disponíveis.`,
        tag: "VALUE",
        realData: false,
      });
    }
  }

  insights.sort((a, b) => b.score - a.score);
  return insights;
}

// Keep synchronous version as fallback
export function analyzeMarket(fixtures: NormalizedFixture[], market: MarketType): MarketTeamInsight[] {
  // Quick fallback with odds-based analysis
  const insights: MarketTeamInsight[] = [];
  for (const fixture of fixtures.filter(f => f.odds).slice(0, 10)) {
    const seed = hashSeed(fixture.id + market);
    const homeOdd = parseFloat(fixture.odds?.home ?? "2.5");
    const homeProb = Math.min(95, Math.max(20, (1 / homeOdd) * 100));
    
    insights.push({
      fixture,
      teamName: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
      teamLogo: fixture.league.logo,
      opponent: "Estimativa",
      score: Math.min(75, Math.round(homeProb)),
      suggestedBet: market === "Escanteios" ? `${fixture.teams.home.name} +3.5 escanteios` :
                    market === "Cartões" ? `Mais de 3.5 cartões` :
                    market === "Gols" ? `Mais de 2.5 gols` :
                    market === "Ambas Marcam" ? `Ambas marcam - Sim` :
                    market === "Chance Dupla" ? `${fixture.teams.home.name} ou Empate` :
                    `Sem empate`,
      suggestedOdd: +(1.5 + seededRandom(seed) * 0.7).toFixed(2),
      reasoning: `Baseado em probabilidade implícita das odds.`,
      tag: "VALUE",
      realData: false,
    });
  }
  insights.sort((a, b) => b.score - a.score);
  return insights;
}

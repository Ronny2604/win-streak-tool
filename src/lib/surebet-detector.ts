import { NormalizedFixture, BookmakerOdds } from "./odds-api";

export interface BestOddInfo {
  odd: number;
  bookmaker: string;
}

export interface SurebetOpportunity {
  fixture: NormalizedFixture;
  margin: number;
  profitPercent: number;
  bestOdds: {
    home: BestOddInfo;
    draw: BestOddInfo;
    away: BestOddInfo;
  };
  stakes: {
    home: number;
    draw: number;
    away: number;
  };
  totalStake: number;
  guaranteedReturn: number;
  rating: "surebet" | "near-surebet" | "low-margin";
  bookmakerCount: number;
}

function calculateMargin(home: number, draw: number, away: number): number {
  if (home <= 1 || draw <= 1 || away <= 1) return Infinity;
  return (1 / home + 1 / draw + 1 / away - 1) * 100;
}

function calculateStakes(
  home: number,
  draw: number,
  away: number,
  totalStake: number
): { home: number; draw: number; away: number } {
  const invSum = 1 / home + 1 / draw + 1 / away;
  return {
    home: Math.round(((totalStake / home) / invSum) * 100) / 100,
    draw: Math.round(((totalStake / draw) / invSum) * 100) / 100,
    away: Math.round(((totalStake / away) / invSum) * 100) / 100,
  };
}

function findBestOdds(bookmakers: BookmakerOdds[]): {
  home: BestOddInfo;
  draw: BestOddInfo;
  away: BestOddInfo;
} {
  let bestHome: BestOddInfo = { odd: 0, bookmaker: "" };
  let bestDraw: BestOddInfo = { odd: 0, bookmaker: "" };
  let bestAway: BestOddInfo = { odd: 0, bookmaker: "" };

  for (const bk of bookmakers) {
    if (bk.home > bestHome.odd) bestHome = { odd: bk.home, bookmaker: bk.bookmaker };
    if (bk.draw > bestDraw.odd) bestDraw = { odd: bk.draw, bookmaker: bk.bookmaker };
    if (bk.away > bestAway.odd) bestAway = { odd: bk.away, bookmaker: bk.bookmaker };
  }

  return { home: bestHome, draw: bestDraw, away: bestAway };
}

export function detectSurebets(
  fixtures: NormalizedFixture[],
  bankroll: number = 100
): SurebetOpportunity[] {
  const opportunities: SurebetOpportunity[] = [];

  for (const fixture of fixtures) {
    const bookmakers = fixture.bookmakerOdds;

    // Use cross-bookmaker analysis if available (2+ bookmakers)
    if (bookmakers && bookmakers.length >= 2) {
      const best = findBestOdds(bookmakers);
      if (best.home.odd <= 1 || best.draw.odd <= 1 || best.away.odd <= 1) continue;

      const margin = calculateMargin(best.home.odd, best.draw.odd, best.away.odd);
      if (margin > 5) continue;

      const profitPercent = margin < 0 ? Math.abs(margin) : 0;
      const stakes = calculateStakes(best.home.odd, best.draw.odd, best.away.odd, bankroll);
      const guaranteedReturn = margin < 0
        ? Math.round((bankroll * (1 + profitPercent / 100)) * 100) / 100
        : Math.round((bankroll * (1 - margin / 100)) * 100) / 100;

      let rating: SurebetOpportunity["rating"];
      if (margin < 0) rating = "surebet";
      else if (margin < 2) rating = "near-surebet";
      else rating = "low-margin";

      opportunities.push({
        fixture,
        margin: Math.round(margin * 100) / 100,
        profitPercent: Math.round(profitPercent * 100) / 100,
        bestOdds: best,
        stakes,
        totalStake: bankroll,
        guaranteedReturn,
        rating,
        bookmakerCount: bookmakers.length,
      });
    } else if (fixture.odds) {
      // Fallback: single bookmaker odds
      const home = parseFloat(fixture.odds.home);
      const draw = parseFloat(fixture.odds.draw);
      const away = parseFloat(fixture.odds.away);

      if (isNaN(home) || isNaN(draw) || isNaN(away) || home <= 1 || draw <= 1 || away <= 1) continue;

      const margin = calculateMargin(home, draw, away);
      if (margin > 5) continue;

      const profitPercent = margin < 0 ? Math.abs(margin) : 0;
      const stakes = calculateStakes(home, draw, away, bankroll);
      const guaranteedReturn = margin < 0
        ? Math.round((bankroll * (1 + profitPercent / 100)) * 100) / 100
        : Math.round((bankroll * (1 - margin / 100)) * 100) / 100;

      let rating: SurebetOpportunity["rating"];
      if (margin < 0) rating = "surebet";
      else if (margin < 2) rating = "near-surebet";
      else rating = "low-margin";

      opportunities.push({
        fixture,
        margin: Math.round(margin * 100) / 100,
        profitPercent: Math.round(profitPercent * 100) / 100,
        bestOdds: {
          home: { odd: home, bookmaker: "—" },
          draw: { odd: draw, bookmaker: "—" },
          away: { odd: away, bookmaker: "—" },
        },
        stakes,
        totalStake: bankroll,
        guaranteedReturn,
        rating,
        bookmakerCount: 1,
      });
    }
  }

  opportunities.sort((a, b) => a.margin - b.margin);
  return opportunities;
}

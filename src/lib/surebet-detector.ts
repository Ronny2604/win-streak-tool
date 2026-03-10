import { NormalizedFixture } from "./odds-api";

export interface SurebetOpportunity {
  fixture: NormalizedFixture;
  margin: number; // negative margin = surebet (profit %)
  profitPercent: number;
  bestOdds: {
    home: number;
    draw: number;
    away: number;
  };
  stakes: {
    home: number;
    draw: number;
    away: number;
  };
  totalStake: number;
  guaranteedReturn: number;
  rating: "surebet" | "near-surebet" | "low-margin";
}

function parseOdd(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) || n <= 1 ? 0 : n;
}

/**
 * Calculates the margin for a 1X2 market.
 * margin < 0 means surebet (arbitrage opportunity)
 * margin = 0 means fair odds
 * margin > 0 means bookmaker edge
 */
function calculateMargin(home: number, draw: number, away: number): number {
  if (home <= 1 || draw <= 1 || away <= 1) return Infinity;
  return (1 / home + 1 / draw + 1 / away - 1) * 100;
}

/**
 * Calculates optimal stakes for a given bankroll to guarantee profit
 */
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

export function detectSurebets(
  fixtures: NormalizedFixture[],
  bankroll: number = 100
): SurebetOpportunity[] {
  const opportunities: SurebetOpportunity[] = [];

  for (const fixture of fixtures) {
    if (!fixture.odds) continue;

    const home = parseOdd(fixture.odds.home);
    const draw = parseOdd(fixture.odds.draw);
    const away = parseOdd(fixture.odds.away);

    if (home === 0 || draw === 0 || away === 0) continue;

    const margin = calculateMargin(home, draw, away);
    if (margin > 5) continue; // skip high-margin games

    const profitPercent = margin < 0 ? Math.abs(margin) : 0;
    const stakes = calculateStakes(home, draw, away, bankroll);
    const guaranteedReturn = margin < 0
      ? Math.round((bankroll * (1 + profitPercent / 100)) * 100) / 100
      : Math.round((bankroll * (1 - margin / 100)) * 100) / 100;

    let rating: SurebetOpportunity["rating"];
    if (margin < 0) {
      rating = "surebet";
    } else if (margin < 2) {
      rating = "near-surebet";
    } else {
      rating = "low-margin";
    }

    opportunities.push({
      fixture,
      margin: Math.round(margin * 100) / 100,
      profitPercent: Math.round(profitPercent * 100) / 100,
      bestOdds: { home, draw, away },
      stakes,
      totalStake: bankroll,
      guaranteedReturn,
      rating,
    });
  }

  // Sort: surebets first, then by margin ascending
  opportunities.sort((a, b) => a.margin - b.margin);

  return opportunities;
}

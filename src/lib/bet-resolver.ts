/**
 * Bet resolution utilities — extracted from useAutoSettle for reuse.
 * Handles bet type normalization, team name matching, and outcome evaluation.
 */

// ─── Bet type resolution ────────────────────────────────────

export type BetType =
  | "home" | "draw" | "away"
  | "double_home_draw" | "double_away_draw" | "double_home_away"
  | "over_0_5" | "over_1_5" | "over_2_5" | "over_3_5"
  | "under_0_5" | "under_1_5" | "under_2_5" | "under_3_5"
  | "btts_yes" | "btts_no"
  | "home_ht" | "draw_ht" | "away_ht"
  | "over_0_5_ht" | "over_1_5_ht" | "under_0_5_ht" | "under_1_5_ht";

const BET_TYPE_MAP: Record<string, BetType> = {
  // English keys
  home: "home", draw: "draw", away: "away",
  double_home_draw: "double_home_draw",
  double_away_draw: "double_away_draw",
  double_home_away: "double_home_away",
  // Portuguese labels
  "vitória casa": "home", "vitoria casa": "home", casa: "home", "1": "home",
  empate: "draw", x: "draw",
  "vitória fora": "away", "vitoria fora": "away", fora: "away", "2": "away",
  "casa ou empate": "double_home_draw", "1x": "double_home_draw",
  "fora ou empate": "double_away_draw", x2: "double_away_draw",
  "casa ou fora": "double_home_away", "12": "double_home_away",
  // Over/Under
  "over 0.5": "over_0_5", "mais de 0.5": "over_0_5",
  "over 1.5": "over_1_5", "mais de 1.5": "over_1_5",
  "over 2.5": "over_2_5", "mais de 2.5": "over_2_5",
  "over 3.5": "over_3_5", "mais de 3.5": "over_3_5",
  "under 0.5": "under_0_5", "menos de 0.5": "under_0_5",
  "under 1.5": "under_1_5", "menos de 1.5": "under_1_5",
  "under 2.5": "under_2_5", "menos de 2.5": "under_2_5",
  "under 3.5": "under_3_5", "menos de 3.5": "under_3_5",
  // BTTS
  "ambas marcam": "btts_yes", "btts sim": "btts_yes", "btts yes": "btts_yes",
  btts: "btts_yes", "ambos marcam": "btts_yes",
  "ambas não marcam": "btts_no", "btts não": "btts_no", "btts no": "btts_no",
  // Half-time
  "casa ht": "home_ht", "home ht": "home_ht", "1 ht": "home_ht",
  "empate ht": "draw_ht", "draw ht": "draw_ht", "x ht": "draw_ht",
  "fora ht": "away_ht", "away ht": "away_ht", "2 ht": "away_ht",
  "over 0.5 ht": "over_0_5_ht", "mais de 0.5 ht": "over_0_5_ht",
  "over 1.5 ht": "over_1_5_ht", "mais de 1.5 ht": "over_1_5_ht",
  "under 0.5 ht": "under_0_5_ht", "menos de 0.5 ht": "under_0_5_ht",
  "under 1.5 ht": "under_1_5_ht", "menos de 1.5 ht": "under_1_5_ht",
};

export function resolveBetType(raw: string): BetType | null {
  if (!raw) return null;
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  // Direct map
  if (BET_TYPE_MAP[key]) return BET_TYPE_MAP[key];

  // Fuzzy matching for compound labels like "Manchester City vence" → home
  if (key.includes("vence") || key.includes("win")) {
    if (key.includes("(casa)") || key.includes("home")) return "home";
    if (key.includes("(fora)") || key.includes("away")) return "away";
    // If contains "vence" but no qualifier, check position context later
    return "home"; // default for "<team> vence" which is typically the home label
  }
  if (key.includes("empate") || key.includes("draw")) return "draw";
  if (key.includes("over 2.5") || key.includes("mais de 2.5") || key.includes("+2.5")) return "over_2_5";
  if (key.includes("over 1.5") || key.includes("mais de 1.5") || key.includes("+1.5")) return "over_1_5";
  if (key.includes("over 3.5") || key.includes("mais de 3.5") || key.includes("+3.5")) return "over_3_5";
  if (key.includes("over 0.5") || key.includes("mais de 0.5") || key.includes("+0.5")) return "over_0_5";
  if (key.includes("under 2.5") || key.includes("menos de 2.5")) return "under_2_5";
  if (key.includes("under 1.5") || key.includes("menos de 1.5")) return "under_1_5";
  if (key.includes("under 3.5") || key.includes("menos de 3.5")) return "under_3_5";
  if (key.includes("under 0.5") || key.includes("menos de 0.5")) return "under_0_5";
  if (key.includes("ambas") || key.includes("btts")) return "btts_yes";
  if (key.includes("ou empate")) {
    if (key.includes("fora") || key.includes("away")) return "double_away_draw";
    return "double_home_draw";
  }
  if (key.includes("ou fora") || key.includes("ou casa")) return "double_home_away";

  return null;
}

// ─── Outcome evaluation ────────────────────────────────────

export function didBetWin(betType: BetType, h: number, a: number): boolean {
  const total = h + a;
  const homeWin = h > a;
  const draw = h === a;
  const awayWin = a > h;

  switch (betType) {
    case "home": return homeWin;
    case "draw": return draw;
    case "away": return awayWin;
    case "double_home_draw": return homeWin || draw;
    case "double_away_draw": return awayWin || draw;
    case "double_home_away": return homeWin || awayWin;
    case "over_0_5": return total > 0.5;
    case "over_1_5": return total > 1.5;
    case "over_2_5": return total > 2.5;
    case "over_3_5": return total > 3.5;
    case "under_0_5": return total < 0.5;
    case "under_1_5": return total < 1.5;
    case "under_2_5": return total < 2.5;
    case "under_3_5": return total < 3.5;
    case "btts_yes": return h > 0 && a > 0;
    case "btts_no": return h === 0 || a === 0;
    // HT markets would need HT score data; for now treat as pending
    case "home_ht": case "draw_ht": case "away_ht":
    case "over_0_5_ht": case "over_1_5_ht":
    case "under_0_5_ht": case "under_1_5_ht":
      return false; // cannot resolve without HT data
    default: return false;
  }
}

// ─── Name matching ──────────────────────────────────────────

const NOISE_WORDS = /\b(fc|cf|sc|ac|rc|as|ss|us|afc|club|cd|ud|sporting|athletic|atletico|city|united|real|de|do|da|dos|das|del|la|le|les|the|sport|esporte|clube|associacao|sociedade|esportiva|futebol)\b/gi;

export function cleanName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(NOISE_WORDS, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function teamsMatch(a: string, b: string): boolean {
  const ca = cleanName(a);
  const cb = cleanName(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;

  // Token-based matching
  const tokensA = ca.split(" ").filter((t) => t.length > 2);
  const tokensB = cb.split(" ").filter((t) => t.length > 2);
  const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, cb] : [tokensB, ca];
  if (shorter.length > 0 && shorter.every((token) => longer.includes(token))) return true;

  // Fuzzy: allow small edit distance for short names
  const maxLen = Math.max(ca.length, cb.length);
  const dist = levenshtein(ca, cb);
  if (maxLen <= 6 && dist <= 1) return true;
  if (maxLen > 6 && dist <= 2) return true;

  return false;
}

// ─── Selection data extraction ──────────────────────────────

export function extractTeamNames(sel: any): { home: string; away: string } | null {
  if (sel.fixture?.teams?.home?.name && sel.fixture?.teams?.away?.name) {
    return { home: sel.fixture.teams.home.name, away: sel.fixture.teams.away.name };
  }
  if (typeof sel.fixture === "string" && sel.fixture.includes(" vs ")) {
    const [home, away] = sel.fixture.split(" vs ");
    return { home: home.trim(), away: away.trim() };
  }
  if (sel.homeName && sel.awayName) {
    return { home: sel.homeName, away: sel.awayName };
  }
  if (sel.match && typeof sel.match === "string" && sel.match.includes(" vs ")) {
    const [home, away] = sel.match.split(" vs ");
    return { home: home.trim(), away: away.trim() };
  }
  // Try label that might contain "Team A x Team B" or "Team A vs Team B"
  const matchStr = sel.fixture_info || sel.fixtureInfo || sel.game;
  if (matchStr && typeof matchStr === "string") {
    const sep = matchStr.includes(" vs ") ? " vs " : matchStr.includes(" x ") ? " x " : null;
    if (sep) {
      const [home, away] = matchStr.split(sep);
      return { home: home.trim(), away: away.trim() };
    }
  }
  return null;
}

export function extractBetType(sel: any): BetType | null {
  // Check explicit fields first
  for (const field of ["betType", "bet_type", "label", "bet", "market", "tip"]) {
    if (sel[field]) {
      const resolved = resolveBetType(String(sel[field]));
      if (resolved) return resolved;
    }
  }
  // Fallback: deeper keyword extraction from bet field
  if (sel.bet) {
    const bet = String(sel.bet).toLowerCase();
    if (bet.includes("(casa)") || bet.includes("home")) return "home";
    if (bet.includes("empate") || bet.includes("draw")) return "draw";
    if (bet.includes("(fora)") || bet.includes("away")) return "away";
    if (bet.includes("over 2.5") || bet.includes("mais de 2.5")) return "over_2_5";
    if (bet.includes("under 2.5") || bet.includes("menos de 2.5")) return "under_2_5";
    if (bet.includes("ambas")) return "btts_yes";
  }
  // Check label for "<Team> vence" pattern with context
  if (sel.label && typeof sel.label === "string") {
    const label = sel.label.toLowerCase();
    const teams = extractTeamNames(sel);
    if (teams && label.includes("vence")) {
      if (teamsMatch(label.replace(/\s*vence.*/, ""), teams.away)) return "away";
      return "home";
    }
  }
  return null;
}

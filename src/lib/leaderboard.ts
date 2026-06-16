import { efgPct, tsPct, type ShootingStat } from "@/lib/shooting";

// Leaderboard qualification mirrors the NBA's own rules for season leaders.
//
// The league sets the bar against a full 82-game season: per-game and rate
// categories require playing 70% of a team's games (58 of 82), and each
// percentage title carries a minimum number of *makes* (300 FG, 82 3PT, 125 FT)
// so a tiny, hot sample can't top the board. We prorate those by how much of the
// season has actually been played, using the league's busiest player as the proxy
// for team games so the boards stay honest if the data is refreshed mid-season.
const FULL_SEASON_GAMES = 82;
const GAMES_PLAYED_FRACTION = 0.7;
const MIN_FIELD_GOALS_MADE = 300;
const MIN_THREES_MADE = 82;
const MIN_FREE_THROWS_MADE = 125;

export interface QualificationContext {
  // Games played by the league leader — our stand-in for a full team schedule.
  leagueGames: number;
  // leagueGames / 82, capped at 1; scales the season-long minimums to date.
  seasonFraction: number;
}

export function qualificationContext(players: ShootingStat[]): QualificationContext {
  const leagueGames = players.reduce((max, player) => Math.max(max, player.games), 0);
  const seasonFraction = Math.min(leagueGames / FULL_SEASON_GAMES, 1) || 0;
  return { leagueGames, seasonFraction };
}

// Played enough of the season to qualify for per-game and rate leaders.
function playedEnoughGames(player: ShootingStat, ctx: QualificationContext): boolean {
  return player.games >= GAMES_PLAYED_FRACTION * ctx.leagueGames;
}

export interface LeaderboardCategory {
  id: string;
  label: string;
  value: (player: ShootingStat) => number;
  format: (value: number) => string;
  // Per-category NBA qualification. Counting stats (everyone qualifies) omit it.
  qualifies?: (player: ShootingStat, ctx: QualificationContext) => boolean;
  // One-line note shown under the board explaining who's eligible.
  note: string;
}

const pct = (value: number) => `${value.toFixed(1)}%`;
const oneDecimal = (value: number) => value.toFixed(1);

const GAMES_NOTE = "Qualifiers played at least 70% of the season (NBA minimum).";

export const categories: LeaderboardCategory[] = [
  {
    id: "ppg",
    label: "Points / game",
    value: (p) => p.pointsPerGame,
    format: oneDecimal,
    qualifies: playedEnoughGames,
    note: GAMES_NOTE,
  },
  {
    id: "fg3m",
    label: "Threes made",
    value: (p) => p.fg3m,
    format: (v) => String(v),
    note: "Season total — every player qualifies.",
  },
  {
    id: "fgPct",
    label: "FG%",
    value: (p) => p.fgPct,
    format: pct,
    qualifies: (p, ctx) => p.fgm >= MIN_FIELD_GOALS_MADE * ctx.seasonFraction,
    note: "Qualifiers made 300+ field goals (NBA minimum).",
  },
  {
    id: "fg3Pct",
    label: "3P%",
    value: (p) => p.fg3Pct,
    format: pct,
    qualifies: (p, ctx) => p.fg3m >= MIN_THREES_MADE * ctx.seasonFraction,
    note: "Qualifiers made 82+ three-pointers (NBA minimum).",
  },
  {
    id: "ftPct",
    label: "FT%",
    value: (p) => p.ftPct,
    format: pct,
    qualifies: (p, ctx) => p.ftm >= MIN_FREE_THROWS_MADE * ctx.seasonFraction,
    note: "Qualifiers made 125+ free throws (NBA minimum).",
  },
  {
    id: "efg",
    label: "eFG%",
    value: efgPct,
    format: pct,
    // No official eFG% title, so we borrow the FG% makes floor for consistency.
    qualifies: (p, ctx) => p.fgm >= MIN_FIELD_GOALS_MADE * ctx.seasonFraction,
    note: "Qualifiers made 300+ field goals.",
  },
  {
    id: "ts",
    label: "TS%",
    value: tsPct,
    format: pct,
    qualifies: (p, ctx) => p.fgm >= MIN_FIELD_GOALS_MADE * ctx.seasonFraction,
    note: "Qualifiers made 300+ field goals.",
  },
  {
    id: "fga",
    label: "FGA / game",
    value: (p) => p.fgaPerGame,
    format: oneDecimal,
    qualifies: playedEnoughGames,
    note: GAMES_NOTE,
  },
  {
    id: "rpg",
    label: "Rebounds / game",
    value: (p) => p.reboundsPerGame,
    format: oneDecimal,
    qualifies: playedEnoughGames,
    note: GAMES_NOTE,
  },
  {
    id: "apg",
    label: "Assists / game",
    value: (p) => p.assistsPerGame,
    format: oneDecimal,
    qualifies: playedEnoughGames,
    note: GAMES_NOTE,
  },
  {
    id: "spg",
    label: "Steals / game",
    value: (p) => p.stealsPerGame,
    format: oneDecimal,
    qualifies: playedEnoughGames,
    note: GAMES_NOTE,
  },
  {
    id: "bpg",
    label: "Blocks / game",
    value: (p) => p.blocksPerGame,
    format: oneDecimal,
    qualifies: playedEnoughGames,
    note: GAMES_NOTE,
  },
];

export interface RankedLeader {
  player: ShootingStat;
  value: number;
}

// Top `limit` qualified players for a category, highest value first.
export function rankLeaders(
  players: ShootingStat[],
  category: LeaderboardCategory,
  ctx: QualificationContext,
  limit = 10,
): RankedLeader[] {
  const qualifies = category.qualifies ?? (() => true);
  return players
    .filter((player) => qualifies(player, ctx))
    .map((player) => ({ player, value: category.value(player) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

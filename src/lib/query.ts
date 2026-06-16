import { getLeaderboardStats } from "@/lib/leaderboardData";
import { efgPct, getShootingStats, tsPct, type ShootingStat } from "@/lib/shooting";
import {
  categories,
  qualificationContext,
  rankLeaders,
  type RankedLeader,
} from "@/lib/leaderboard";

// A composable query layer over the committed player datasets. The UI can use
// these, but the main consumer is the assistant's tool layer, which needs to turn
// loose natural-language references ("SGA", "the Celtics", "best from three") into
// concrete data. The match/rank cores are pure so they can be unit tested without
// depending on the live roster.

export interface PlayerRef {
  id: string;
  name: string;
  team: string;
}

type NamedPlayer = Pick<ShootingStat, "id" | "name" | "team">;

// Common nicknames the data doesn't carry. Values are matched after normalization.
const NICKNAMES: Record<string, string> = {
  "greek freak": "giannis antetokounmpo",
  sga: "shai gilgeous-alexander",
  joker: "nikola jokic",
  "the joker": "nikola jokic",
  luka: "luka doncic",
  steph: "stephen curry",
  "chef curry": "stephen curry",
  ad: "anthony davis",
  dame: "damian lillard",
  kd: "kevin durant",
  "the beard": "james harden",
  klay: "klay thompson",
  cp3: "chris paul",
};

// Lowercase, strip accents and punctuation, and collapse whitespace so "Dončić"
// and "Doncic" (and "D'Angelo") compare cleanly.
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pure ranking core: score each player against the query and return the best few.
export function rankPlayerMatches(
  players: NamedPlayer[],
  query: string,
  limit = 5,
): PlayerRef[] {
  const raw = normalizeName(query);
  if (!raw) return [];
  const q = NICKNAMES[raw] ? normalizeName(NICKNAMES[raw]) : raw;
  const qTokens = q.split(" ");
  const qLast = qTokens[qTokens.length - 1];

  return players
    .map((player) => {
      const name = normalizeName(player.name);
      const tokens = name.split(" ");
      let score = 0;
      if (name === q) score = 1000;
      else if (name.startsWith(q)) score = 500;
      else if (name.includes(q)) score = 300;

      if (tokens[tokens.length - 1] === qLast) score += 120;
      const overlap = qTokens.filter((token) => tokens.includes(token)).length;
      score += overlap * 60;
      // A single bare token ("giannis") that prefixes a name part.
      if (qTokens.length === 1 && tokens.some((token) => token.startsWith(q))) score += 40;

      return { player, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ player }) => ({ id: player.id, name: player.name, team: player.team }));
}

// Resolve a natural-language player reference against the full league (582).
export function resolvePlayer(query: string, limit = 5): PlayerRef[] {
  return rankPlayerMatches(getLeaderboardStats().players, query, limit);
}

// Pure team matcher: exact, then substring, against the distinct team names.
export function matchTeam(teamNames: string[], query: string): string | null {
  const q = normalizeName(query);
  if (!q) return null;
  const exact = teamNames.find((name) => normalizeName(name) === q);
  if (exact) return exact;
  // "celtics" -> "Boston Celtics"; prefer the shortest containing name.
  const contains = teamNames
    .filter((name) => normalizeName(name).includes(q))
    .sort((a, b) => a.length - b.length);
  return contains[0] ?? null;
}

// Resolve a team reference ("Celtics", "boston") to its full name.
export function resolveTeam(query: string): string | null {
  const teamNames = Array.from(new Set(getLeaderboardStats().players.map((p) => p.team)));
  return matchTeam(teamNames, query);
}

export interface TopOptions {
  team?: string;
  // Apply the category's NBA qualification floor (default true). Pass false for
  // team-relative questions where the league minimums would empty the list.
  qualifiedOnly?: boolean;
  limit?: number;
}

// Leaders for a stat (a leaderboard category id), optionally scoped to one team.
export function topPlayersBy(statId: string, opts: TopOptions = {}): RankedLeader[] {
  const category = categories.find((c) => c.id === statId);
  if (!category) {
    throw new Error(`Unknown stat "${statId}". Known: ${categories.map((c) => c.id).join(", ")}`);
  }
  const all = getLeaderboardStats().players;
  // Qualify against the whole league's schedule, even when scoped to a team.
  const ctx = qualificationContext(all);
  const pool = opts.team ? all.filter((player) => player.team === opts.team) : all;
  const effective = opts.qualifiedOnly === false ? { ...category, qualifies: undefined } : category;
  return rankLeaders(pool, effective, ctx, opts.limit ?? 10);
}

export interface PlayerProfile {
  player: ShootingStat;
  efg: number;
  ts: number;
}

function findPlayer(id: string): ShootingStat | null {
  return getLeaderboardStats().players.find((player) => player.id === id) ?? null;
}

// Full shooting profile for one player, with the derived efficiency metrics.
export function getPlayerProfile(id: string): PlayerProfile | null {
  const player = findPlayer(id);
  if (!player) return null;
  return { player, efg: efgPct(player), ts: tsPct(player) };
}

export interface HeadToHead {
  a: PlayerProfile;
  b: PlayerProfile;
  // a minus b for each metric; positive means a leads.
  deltas: { pointsPerGame: number; fg3Pct: number; efg: number; ts: number };
}

export function headToHead(idA: string, idB: string): HeadToHead | null {
  const a = getPlayerProfile(idA);
  const b = getPlayerProfile(idB);
  if (!a || !b) return null;
  return {
    a,
    b,
    deltas: {
      pointsPerGame: a.player.pointsPerGame - b.player.pointsPerGame,
      fg3Pct: a.player.fg3Pct - b.player.fg3Pct,
      efg: a.efg - b.efg,
      ts: a.ts - b.ts,
    },
  };
}

export interface TeamProfile {
  team: string;
  count: number;
  topScorer: ShootingStat | null;
  players: ShootingStat[];
}

// A team's players ordered by scoring, with the leading scorer surfaced.
export function teamProfile(team: string): TeamProfile {
  const players = getLeaderboardStats()
    .players.filter((player) => player.team === team)
    .sort((a, b) => b.pointsPerGame - a.pointsPerGame);
  return { team, count: players.length, topScorer: players[0] ?? null, players };
}

// Percentiles are computed against the qualified shooters in the table set (the
// 200+ FGA group), which is a meaningful population for rate stats rather than the
// full league's long tail of low-minute players.
const PERCENTILE_STATS = ["pointsPerGame", "fgPct", "fg3Pct", "ftPct", "efg", "ts"] as const;
export type PercentileStat = (typeof PERCENTILE_STATS)[number];

function metric(player: ShootingStat, key: PercentileStat): number {
  if (key === "efg") return efgPct(player);
  if (key === "ts") return tsPct(player);
  return player[key];
}

// Midrank percentile: share of the population below `value`, counting ties as
// half. Pure, so it's unit tested directly.
export function percentileRank(values: number[], value: number): number {
  if (values.length === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const v of values) {
    if (v < value) below += 1;
    else if (v === value) equal += 1;
  }
  return ((below + 0.5 * equal) / values.length) * 100;
}

// Where a player ranks among table shooters on each rate/scoring stat. Returns
// null for players outside that population (e.g. very low-volume).
export function playerPercentiles(id: string): Record<PercentileStat, number> | null {
  const population = getShootingStats().players;
  const player = population.find((p) => p.id === id);
  if (!player) return null;
  const result = {} as Record<PercentileStat, number>;
  for (const key of PERCENTILE_STATS) {
    const values = population.map((p) => metric(p, key));
    result[key] = percentileRank(values, metric(player, key));
  }
  return result;
}

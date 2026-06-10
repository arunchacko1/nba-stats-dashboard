import { z } from "zod";
import raw from "@/data/shooting-stats.json";

// Aggregated per-player shooting data produced by scripts/build-shot-data.mjs
// from ESPN season totals. pointsPerGame is true points per game (free throws
// included); fga/fgm and the three-point splits are field goals.
export const shootingStatSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.string(),
  games: z.number(),
  fga: z.number(),
  fgm: z.number(),
  fgPct: z.number(),
  fg3a: z.number(),
  fg3m: z.number(),
  fg3Pct: z.number(),
  fta: z.number(),
  ftm: z.number(),
  ftPct: z.number(),
  points: z.number(),
  pointsPerGame: z.number(),
  fgaPerGame: z.number(),
});
export type ShootingStat = z.infer<typeof shootingStatSchema>;

// Effective field-goal % credits the extra point a three is worth.
export function efgPct(player: ShootingStat): number {
  if (player.fga === 0) return 0;
  return ((player.fgm + 0.5 * player.fg3m) / player.fga) * 100;
}

// True-shooting % measures scoring efficiency across twos, threes, and free
// throws; the 0.44 weights the free-throw attempts that don't end a possession.
export function tsPct(player: ShootingStat): number {
  const shootingPossessions = player.fga + 0.44 * player.fta;
  if (shootingPossessions === 0) return 0;
  return (player.points / (2 * shootingPossessions)) * 100;
}

const datasetSchema = z.object({
  season: z.string(),
  players: z.array(shootingStatSchema),
});
export type ShootingDataset = z.infer<typeof datasetSchema>;

let cached: ShootingDataset | null = null;

export function getShootingStats(): ShootingDataset {
  if (!cached) cached = datasetSchema.parse(raw);
  return cached;
}

export function getPlayerById(id: string): ShootingStat | null {
  return getShootingStats().players.find((player) => player.id === id) ?? null;
}

// Distinct team names for the table's team dropdown, sorted alphabetically.
export function teamOptions(players: ShootingStat[]): string[] {
  return Array.from(new Set(players.map((player) => player.team))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export interface ShootingFilters {
  query?: string;
  team?: string;
}

// Single entry point for the table's filters. An empty or absent value means "no
// constraint", so filterPlayers(players, {}) returns the full default list. Filters
// combine with AND; shaped to take more dropdowns later without touching callers.
export function filterPlayers(players: ShootingStat[], filters: ShootingFilters): ShootingStat[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const team = filters.team ?? "";
  return players.filter((player) => {
    if (team && player.team !== team) return false;
    if (
      query &&
      !player.name.toLowerCase().includes(query) &&
      !player.team.toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });
}

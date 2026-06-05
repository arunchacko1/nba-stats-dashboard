import { z } from "zod";
import raw from "@/data/shooting-stats.json";

// Aggregated per-player field-goal data produced by scripts/build-shot-data.mjs.
// Points here are field-goal points only — the source shot log has no free
// throws — so the UI labels this as FG points rather than true PPG.
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
  pointsPerGame: z.number(),
  fgaPerGame: z.number(),
});
export type ShootingStat = z.infer<typeof shootingStatSchema>;

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

export function filterPlayers(players: ShootingStat[], query: string): ShootingStat[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return players;
  return players.filter(
    (player) =>
      player.name.toLowerCase().includes(normalized) ||
      player.team.toLowerCase().includes(normalized),
  );
}

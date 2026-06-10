import { z } from "zod";

// Per-player shot maps live as static files under public/shots and are loaded on
// demand by the chart, so only the selected player's shots cross the wire.
export const shotSchema = z.object({
  x: z.number(),
  y: z.number(),
  made: z.boolean(),
  value: z.union([z.literal(2), z.literal(3)]),
});
export type Shot = z.infer<typeof shotSchema>;

// League-average make rate by court cell, used to color a player's chart by how
// his hot/cold spots compare to the league. Cells are [gridX, gridY, fgPct]
// where the grid step is `cell` feet (see scripts/build-shot-data.mjs).
export const leagueBaselineSchema = z.object({
  cell: z.number(),
  zones: z.array(z.tuple([z.number(), z.number(), z.number()])),
});
export type LeagueBaseline = z.infer<typeof leagueBaselineSchema>;

export async function fetchLeagueBaseline(): Promise<LeagueBaseline> {
  const response = await fetch("/shots/league-baseline.json");
  if (!response.ok) throw new Error(`Failed to load league baseline: ${response.status}`);
  return leagueBaselineSchema.parse(await response.json());
}

export const shotPlayerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.string(),
  shotCount: z.number(),
});
export type ShotPlayerSummary = z.infer<typeof shotPlayerSummarySchema>;

const indexSchema = z.object({
  season: z.string(),
  players: z.array(shotPlayerSummarySchema),
});

export async function fetchShotPlayers(): Promise<ShotPlayerSummary[]> {
  const response = await fetch("/shots/index.json");
  if (!response.ok) throw new Error(`Failed to load shot index: ${response.status}`);
  return indexSchema.parse(await response.json()).players;
}

export async function fetchPlayerShots(playerId: string): Promise<Shot[]> {
  const response = await fetch(`/shots/${playerId}.json`);
  if (!response.ok) throw new Error(`Failed to load shots for ${playerId}: ${response.status}`);
  return z.array(shotSchema).parse(await response.json());
}

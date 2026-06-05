import { z } from "zod";

// Per-player shot maps live as static files under public/shots and are loaded on
// demand by the chart, so only the selected player's shots cross the wire.
export const shotSchema = z.object({
  x: z.number(),
  y: z.number(),
  made: z.boolean(),
});
export type Shot = z.infer<typeof shotSchema>;

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

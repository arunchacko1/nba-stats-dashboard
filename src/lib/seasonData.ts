import { z } from "zod";
import snapshot from "@/data/season-snapshot.json";
import { type Game, gameSchema, type Team, teamSchema } from "@/lib/api/schemas";

// A committed snapshot of the season's teams and games, produced by
// scripts/build-live-data.ts. The free-tier balldontlie API can't be reached
// from a datacenter IP, so the deployed app reads this instead of calling it —
// the same committed-data approach the shooting stats use. The 2024-25 season is
// finished, so the snapshot is final.
const snapshotSchema = z.object({
  season: z.number(),
  seasonLabel: z.string(),
  capturedAt: z.string(),
  teams: z.array(teamSchema),
  games: z.array(gameSchema),
});
export type SeasonSnapshot = z.infer<typeof snapshotSchema>;

let cached: SeasonSnapshot | null = null;

function load(): SeasonSnapshot {
  if (!cached) cached = snapshotSchema.parse(snapshot);
  return cached;
}

export function getSeasonGames(): Game[] {
  return load().games;
}

export function getSeasonTeams(): Team[] {
  return load().teams;
}

export function getTeamById(id: number): Team | undefined {
  return load().teams.find((team) => team.id === id);
}

export function getCapturedAt(): string {
  return load().capturedAt;
}

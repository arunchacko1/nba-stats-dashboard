import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { shotPlayerSummarySchema, type ShotPlayerSummary } from "@/lib/shots";

// Server-side reader for the per-player shot-map index. The same index.json is
// fetched in the browser by the shot chart, but server components (the player
// detail page) need to know at build time which players have a map so they can
// decide whether to render a chart. Reading the committed file keeps this in
// sync with the ETL output without a second source of truth.
const indexSchema = z.object({
  season: z.string(),
  players: z.array(shotPlayerSummarySchema),
});

let cached: ShotPlayerSummary[] | null = null;

function loadIndex(): ShotPlayerSummary[] {
  if (!cached) {
    const file = path.join(process.cwd(), "public", "shots", "index.json");
    cached = indexSchema.parse(JSON.parse(readFileSync(file, "utf8"))).players;
  }
  return cached;
}

export function getShotPlayerIds(): Set<string> {
  return new Set(loadIndex().map((player) => player.id));
}

export function hasShotMap(playerId: string): boolean {
  return getShotPlayerIds().has(playerId);
}

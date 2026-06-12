import { datasetSchema, type ShootingDataset } from "@/lib/shooting";
import raw from "@/data/leaderboard-stats.json";

// Full-league season aggregates produced by scripts/build-shot-data.mjs. Same
// shape as the (smaller) table dataset, but with every player who logged a game so
// the leaderboards can rank the whole NBA and apply qualification per category.
let cached: ShootingDataset | null = null;

export function getLeaderboardStats(): ShootingDataset {
  if (!cached) cached = datasetSchema.parse(raw);
  return cached;
}

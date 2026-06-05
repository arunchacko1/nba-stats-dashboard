// Build-time ETL for the live-data half of the dashboard.
//
// balldontlie's free tier refuses requests from datacenter IPs (the same way
// stats.nba.com does), so the deployed app can't reach it from Vercel. Rather
// than ship a half-working "live" page, we snapshot the season once from a
// normal network — reusing the resilient API client in src/lib/api — and commit
// the result. The app then reads only committed JSON, exactly like the shot data.
//
// The 2024-25 season is complete, so this snapshot is final; re-run it only if
// you want to rebuild against the source.
//
//   BALLDONTLIE_API_KEY=... npm run build:live
//
// Run off-platform (a normal IP); it cannot succeed from a datacenter host.

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllGames, getTeams } from "../src/lib/api/balldontlie";
import { SEASON, SEASON_LABEL } from "../src/lib/season";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  if (!process.env.BALLDONTLIE_API_KEY) {
    throw new Error("BALLDONTLIE_API_KEY is required to build the season snapshot");
  }

  console.log(`Fetching ${SEASON_LABEL} teams...`);
  const teams = await getTeams();
  console.log(`  ${teams.length} teams`);

  console.log("Fetching the full season game log (this waits out the rate limit)...");
  const games = await getAllGames(SEASON);
  console.log(`  ${games.length} games`);

  const snapshot = {
    season: SEASON,
    seasonLabel: SEASON_LABEL,
    capturedAt: new Date().toISOString(),
    teams,
    games,
  };

  const target = join(projectRoot, "src/data/season-snapshot.json");
  await writeFile(target, JSON.stringify(snapshot));
  console.log(`Wrote ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

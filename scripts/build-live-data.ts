// Builds the committed season snapshot that backs the live data in src/lib/seasonData.ts.
//
// The dashboard fetches standings and scores live from balldontlie, but the free
// tier is heavily rate limited and can be unreachable from a datacenter IP (the
// same way stats.nba.com is). So every live read falls back to this snapshot — a
// full capture of the season's teams and games — to guarantee the deployed app
// always renders current-season data. Re-run it to refresh the fallback.
//
//   BALLDONTLIE_API_KEY=... npm run build:live
//
// Run off-platform (a normal IP); the rate-limited season sweep is reliable there.

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

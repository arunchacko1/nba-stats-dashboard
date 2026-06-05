// Build-time ETL for the shooting dashboard.
//
// stats.nba.com silently drops requests from most networks, so instead of
// scraping it at deploy time we pull a published season shot log (every field
// goal attempt with court coordinates), aggregate it into the shooting table,
// and carve out per-player shot maps for the chart. Everything it writes is
// committed, so the deployed app never depends on an external data host.
//
// Source: https://github.com/DomSamangy/NBA_Shots_04_25
//
//   npm run build:data

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";
import { parse } from "csv-parse/sync";

const SEASON_LABEL = "2024-25";
const SOURCE_URL =
  "https://raw.githubusercontent.com/DomSamangy/NBA_Shots_04_25/main/NBA_2025_Shots.csv.zip";

// A player needs a real sample of attempts before per-game shooting splits mean
// anything; this drops deep bench players who took a handful of shots all year.
const MIN_ATTEMPTS = 200;

// Featured players for the shot chart. Matched accent- and case-insensitively
// so "Luka Doncic" lines up with the dataset's "Luka Dončić".
const FEATURED = [
  "LeBron James",
  "Stephen Curry",
  "Kevin Durant",
  "Nikola Jokic",
  "Giannis Antetokounmpo",
  "Luka Doncic",
  "Jayson Tatum",
  "Shai Gilgeous-Alexander",
  "Anthony Edwards",
  "Devin Booker",
  "Victor Wembanyama",
  "Jalen Brunson",
];

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function normalizeName(name) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

async function loadShots() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download shot data: HTTP ${response.status}`);
  }
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const csvName = Object.keys(archive).find((name) => name.endsWith(".csv"));
  if (!csvName) throw new Error("No CSV found inside the downloaded archive");
  return parse(strFromU8(archive[csvName]), { columns: true, skip_empty_lines: true });
}

function aggregatePlayers(rows) {
  const byPlayer = new Map();

  for (const row of rows) {
    const id = row.PLAYER_ID;
    let player = byPlayer.get(id);
    if (!player) {
      player = {
        id,
        name: row.PLAYER_NAME,
        teamShots: new Map(),
        games: new Set(),
        fga: 0,
        fgm: 0,
        fg3a: 0,
        fg3m: 0,
      };
      byPlayer.set(id, player);
    }

    const made = row.SHOT_MADE === "TRUE";
    const isThree = row.SHOT_TYPE === "3PT Field Goal";
    player.games.add(row.GAME_ID);
    player.fga += 1;
    if (made) player.fgm += 1;
    if (isThree) {
      player.fg3a += 1;
      if (made) player.fg3m += 1;
    }
    player.teamShots.set(row.TEAM_NAME, (player.teamShots.get(row.TEAM_NAME) ?? 0) + 1);
  }

  return [...byPlayer.values()]
    .filter((player) => player.fga >= MIN_ATTEMPTS)
    .map((player) => {
      const games = player.games.size;
      const points = (player.fgm - player.fg3m) * 2 + player.fg3m * 3;
      // Team a player shot most for, which handles mid-season trades sensibly.
      const team = [...player.teamShots.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return {
        id: player.id,
        name: player.name,
        team,
        games,
        fga: player.fga,
        fgm: player.fgm,
        fgPct: round((player.fgm / player.fga) * 100),
        fg3a: player.fg3a,
        fg3m: player.fg3m,
        fg3Pct: player.fg3a > 0 ? round((player.fg3m / player.fg3a) * 100) : 0,
        pointsPerGame: round(points / games),
        fgaPerGame: round(player.fga / games),
      };
    })
    .sort((a, b) => b.pointsPerGame - a.pointsPerGame);
}

function extractFeaturedShots(rows) {
  const wanted = new Map(FEATURED.map((name) => [normalizeName(name), name]));
  const found = new Map();

  for (const row of rows) {
    const key = normalizeName(row.PLAYER_NAME);
    if (!wanted.has(key)) continue;

    let entry = found.get(key);
    if (!entry) {
      entry = { id: row.PLAYER_ID, name: row.PLAYER_NAME, team: row.TEAM_NAME, shots: [] };
      found.set(key, entry);
    }
    entry.shots.push({
      x: round(Number(row.LOC_X)),
      y: round(Number(row.LOC_Y)),
      made: row.SHOT_MADE === "TRUE",
    });
  }

  const missing = [...wanted.keys()].filter((key) => !found.has(key));
  if (missing.length > 0) {
    console.warn(`Featured players not found: ${missing.map((k) => wanted.get(k)).join(", ")}`);
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function writeJson(relativePath, data) {
  const target = join(projectRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(data));
}

async function main() {
  console.log(`Downloading ${SEASON_LABEL} shot data...`);
  const rows = await loadShots();
  console.log(`Parsed ${rows.length.toLocaleString()} shots`);

  const players = aggregatePlayers(rows);
  await writeJson("src/data/shooting-stats.json", { season: SEASON_LABEL, players });
  console.log(`Wrote shooting stats for ${players.length} players`);

  const featured = extractFeaturedShots(rows);
  const index = featured.map(({ id, name, team, shots }) => ({
    id,
    name,
    team,
    shotCount: shots.length,
  }));
  await writeJson("public/shots/index.json", { season: SEASON_LABEL, players: index });
  for (const player of featured) {
    await writeJson(`public/shots/${player.id}.json`, player.shots);
  }
  console.log(`Wrote shot maps for ${featured.length} featured players`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

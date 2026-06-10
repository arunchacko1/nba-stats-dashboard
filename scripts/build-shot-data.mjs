// Build-time ETL for the shooting dashboard.
//
// stats.nba.com silently drops requests from most networks, so instead of
// scraping it at deploy time we pull the numbers from ESPN's web API at build
// time and commit the result. Everything this writes is committed, so the
// deployed app never depends on an external data host at request time.
//
// Two outputs:
//   - src/data/shooting-stats.json: per-player season aggregates for the table.
//   - public/shots/*.json:          per-shot coordinates for the featured charts.
//
// Players are keyed by their ESPN athlete id throughout, so the table, the shot
// index, and the shot files all line up.
//
//   npm run build:data

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SEASON = 2026; // ESPN's year for the 2025-26 season.
const SEASON_LABEL = "2025-26";
const SEASON_TYPE = 2; // Regular season.

const BYATHLETE_URL =
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete` +
  `?region=us&lang=en&contentorigin=espn&isqualified=false&page=1&limit=700` +
  `&season=${SEASON}&seasontype=${SEASON_TYPE}`;
const TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";
const gamelogUrl = (id) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/gamelog?season=${SEASON}`;
const summaryUrl = (id) =>
  `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`;

// A player needs a real sample of attempts before per-game shooting splits mean
// anything; this drops deep bench players who took a handful of shots all year.
const MIN_ATTEMPTS = 200;

// ESPN court coordinates are in feet with the rim at (25, 0) and both teams
// normalized onto one half; this shifts them into the convention court.ts uses
// (rim at (0, 5.25), x running -25..25). Missing coordinates come back as this
// int sentinel — drop those and anything off the court.
const COORD_SENTINEL = -2147483648;
const RIM_Y_OFFSET = 5.25;

// League-average baseline grid: court feet bucketed into square cells. A cell
// needs a minimum sample before its make rate is trustworthy.
const CELL_FT = 2;
const MIN_CELL_ATTEMPTS = 25;

// Featured players for the shot chart. Matched accent- and case-insensitively
// so "Luka Doncic" lines up with ESPN's "Luka Dončić".
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === attempts) throw error;
      await sleep(500 * attempt);
    }
  }
}

// Each athlete entry is { athlete: {bio}, categories: [stats] }. ESPN groups the
// stat values into named categories whose value arrays line up with the label
// arrays on the response's top-level `categories`. This builds a reader that
// resolves a stat by (category, label) so we never hard-code array offsets.
function makeStatReader(topCategories) {
  const labels = new Map(topCategories.map((category) => [category.name, category.names]));
  return (entry, categoryName, statName) => {
    const category = entry.categories.find((c) => c.name === categoryName);
    const index = labels.get(categoryName)?.indexOf(statName) ?? -1;
    if (!category || index < 0) return 0;
    return category.values[index] ?? 0;
  };
}

async function buildTeamNames() {
  const data = await fetchJson(TEAMS_URL);
  const teams = data.sports[0].leagues[0].teams;
  return new Map(teams.map(({ team }) => [String(team.id), team.displayName]));
}

function aggregatePlayers(byathlete, teamNames) {
  const stat = makeStatReader(byathlete.categories);

  return byathlete.athletes
    .filter((entry) => stat(entry, "offensive", "fieldGoalsAttempted") >= MIN_ATTEMPTS)
    .map((entry) => {
      const { athlete } = entry;
      return {
        id: String(athlete.id),
        name: athlete.displayName,
        team: teamNames.get(String(athlete.teamId)) ?? athlete.teamName ?? "—",
        games: stat(entry, "general", "gamesPlayed"),
        fga: stat(entry, "offensive", "fieldGoalsAttempted"),
        fgm: stat(entry, "offensive", "fieldGoalsMade"),
        fgPct: round(stat(entry, "offensive", "fieldGoalPct")),
        fg3a: stat(entry, "offensive", "threePointFieldGoalsAttempted"),
        fg3m: stat(entry, "offensive", "threePointFieldGoalsMade"),
        fg3Pct: round(stat(entry, "offensive", "threePointFieldGoalPct")),
        fta: stat(entry, "offensive", "freeThrowsAttempted"),
        ftm: stat(entry, "offensive", "freeThrowsMade"),
        ftPct: round(stat(entry, "offensive", "freeThrowPct")),
        // Total points feed true-shooting / effective-FG% calculations downstream.
        points: stat(entry, "offensive", "points"),
        // ESPN's avgPoints is true points per game (includes free throws), unlike
        // the old shot-log source that only knew about field goals.
        pointsPerGame: round(stat(entry, "offensive", "avgPoints")),
        fgaPerGame: round(stat(entry, "offensive", "avgFieldGoalsAttempted")),
      };
    })
    .sort((a, b) => b.pointsPerGame - a.pointsPerGame);
}

function resolveFeatured(byathlete, teamNames) {
  const wanted = new Map(FEATURED.map((name) => [normalizeName(name), name]));
  const found = new Map();
  for (const { athlete } of byathlete.athletes) {
    const key = normalizeName(athlete.displayName);
    if (!wanted.has(key) || found.has(key)) continue;
    found.set(key, {
      id: String(athlete.id),
      name: athlete.displayName,
      team: teamNames.get(String(athlete.teamId)) ?? athlete.teamName ?? "—",
    });
  }
  const missing = [...wanted.keys()].filter((key) => !found.has(key));
  if (missing.length > 0) {
    console.warn(`Featured players not found: ${missing.map((k) => wanted.get(k)).join(", ")}`);
  }
  return [...found.values()];
}

function toCourt(coordinate) {
  if (!coordinate) return null;
  const { x, y } = coordinate;
  if (x === COORD_SENTINEL || y === COORD_SENTINEL) return null;
  if (x < 0 || x > 50 || y < 0 || y > 60) return null;
  return { x: round(x - 25), y: round(y + RIM_Y_OFFSET) };
}

// Collect every regular-season game any featured player appeared in, so each
// game's play-by-play is fetched at most once.
async function collectGameIds(featured) {
  const ids = new Set();
  for (const player of featured) {
    const log = await fetchJson(gamelogUrl(player.id));
    for (const gameId of Object.keys(log.events ?? {})) ids.add(gameId);
  }
  return [...ids];
}

function cellKey(point) {
  return `${Math.round(point.x / CELL_FT)},${Math.round(point.y / CELL_FT)}`;
}

// Turn the accumulated league make/attempt tallies into a compact grid of make
// rates, one tuple [gx, gy, fgPct] per cell that cleared the sample floor.
function buildBaselineZones(league) {
  const zones = [];
  for (const [key, tally] of league) {
    if (tally.attempts < MIN_CELL_ATTEMPTS) continue;
    const [gx, gy] = key.split(",").map(Number);
    zones.push([gx, gy, round((tally.made / tally.attempts) * 100)]);
  }
  return zones;
}

async function buildShotMaps(featured) {
  const featuredIds = new Set(featured.map((player) => player.id));
  const shotsById = new Map(featured.map((player) => [player.id, []]));
  // Every field-goal attempt in these games (all players) feeds the league grid.
  const league = new Map();

  const gameIds = await collectGameIds(featured);
  console.log(`Scanning ${gameIds.length} games for shots...`);

  let scanned = 0;
  for (const gameId of gameIds) {
    let summary;
    try {
      summary = await fetchJson(summaryUrl(gameId));
    } catch (error) {
      console.warn(`  skipped game ${gameId}: ${error.message}`);
      continue;
    }
    // Keep the charts consistent with the regular-season-only table.
    if (summary.header?.season?.type && summary.header.season.type !== SEASON_TYPE) continue;

    for (const play of summary.plays ?? []) {
      if (!play.shootingPlay) continue;
      const point = toCourt(play.coordinate);
      if (!point) continue;
      const made = play.scoringPlay === true;

      const key = cellKey(point);
      const tally = league.get(key) ?? { attempts: 0, made: 0 };
      tally.attempts += 1;
      if (made) tally.made += 1;
      league.set(key, tally);

      const shooterId = play.participants?.[0]?.athlete?.id;
      if (shooterId && featuredIds.has(String(shooterId))) {
        const value = play.pointsAttempted === 3 ? 3 : 2;
        shotsById.get(String(shooterId)).push({ ...point, made, value });
      }
    }

    scanned += 1;
    if (scanned % 100 === 0) console.log(`  ...${scanned}/${gameIds.length}`);
  }

  const players = featured
    .map((player) => ({ ...player, shots: shotsById.get(player.id) }))
    .filter((player) => {
      if (player.shots.length === 0) {
        console.warn(`No shots found for featured player ${player.name}; skipping.`);
        return false;
      }
      return true;
    });

  return { players, baseline: { cell: CELL_FT, zones: buildBaselineZones(league) } };
}

// A density sanity check on the coordinate transform: the busiest cell should sit
// near the rim. If it doesn't, the ESPN→court mapping has drifted.
function checkCalibration(featured) {
  const cells = new Map();
  for (const player of featured) {
    for (const shot of player.shots) {
      const key = `${Math.round(shot.x / 2)},${Math.round(shot.y / 2)}`;
      cells.set(key, (cells.get(key) ?? 0) + 1);
    }
  }
  const [busiest] = [...cells.entries()].sort((a, b) => b[1] - a[1]);
  if (!busiest) return;
  const [cx, cy] = busiest[0].split(",").map(Number);
  const x = cx * 2;
  const y = cy * 2;
  const distFromRim = Math.hypot(x - 0, y - RIM_Y_OFFSET);
  console.log(`Calibration: busiest cell at (${x}, ${y}), ${round(distFromRim)} ft from rim`);
  if (distFromRim > 8) {
    console.warn("  Busiest cell is far from the rim — double-check the coordinate transform.");
  }
}

// ESPN reports made/attempted as a single "m-a" string (e.g. "3-10").
function splitPair(text) {
  const [made, attempted] = String(text ?? "0-0").split("-").map(Number);
  return [made || 0, attempted || 0];
}

// Per-player game logs for the trend chart and table on the player page. One
// gamelog call per player; regular-season games only (matches the table).
async function buildGameLogs(players) {
  // Regular-season window, so the log matches the (regular-season) table and
  // excludes preseason and playoff games.
  const regularSeasonStart = "2025-10-21";
  const regularSeasonEnd = "2026-04-14";
  let written = 0;

  for (const player of players) {
    let log;
    try {
      log = await fetchJson(gamelogUrl(player.id));
    } catch (error) {
      console.warn(`  no game log for ${player.name}: ${error.message}`);
      continue;
    }

    const names = log.names ?? [];
    const at = (statName) => names.indexOf(statName);
    const statsByEvent = new Map();
    for (const seasonType of log.seasonTypes ?? [])
      for (const category of seasonType.categories ?? [])
        for (const event of category.events ?? []) statsByEvent.set(event.eventId, event.stats);

    const games = [];
    for (const [eventId, meta] of Object.entries(log.events ?? {})) {
      const stats = statsByEvent.get(eventId);
      if (!stats) continue;
      const date = meta.gameDate?.slice(0, 10) ?? "";
      if (!date || date < regularSeasonStart || date >= regularSeasonEnd) continue;
      const [fgm, fga] = splitPair(stats[at("fieldGoalsMade-fieldGoalsAttempted")]);
      const [fg3m, fg3a] = splitPair(stats[at("threePointFieldGoalsMade-threePointFieldGoalsAttempted")]);
      games.push({
        date,
        opponent: meta.opponent?.abbreviation ?? "",
        home: meta.atVs === "vs",
        won: meta.gameResult === "W",
        points: Number(stats[at("points")]) || 0,
        fgm,
        fga,
        fg3m,
        fg3a,
      });
    }

    if (games.length === 0) continue;
    games.sort((a, b) => a.date.localeCompare(b.date));
    await writeJson(`public/gamelogs/${player.id}.json`, games);
    written += 1;
    if (written % 100 === 0) console.log(`  ...${written} game logs`);
  }

  return written;
}

async function writeJson(relativePath, data) {
  const target = join(projectRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(data));
}

async function main() {
  console.log(`Fetching ${SEASON_LABEL} player stats from ESPN...`);
  const [byathlete, teamNames] = await Promise.all([fetchJson(BYATHLETE_URL), buildTeamNames()]);

  const players = aggregatePlayers(byathlete, teamNames);
  await writeJson("src/data/shooting-stats.json", { season: SEASON_LABEL, players });
  console.log(`Wrote shooting stats for ${players.length} players`);

  const featured = resolveFeatured(byathlete, teamNames);
  const { players: withShots, baseline } = await buildShotMaps(featured);
  checkCalibration(withShots);

  const index = withShots.map(({ id, name, team, shots }) => ({
    id,
    name,
    team,
    shotCount: shots.length,
  }));
  await writeJson("public/shots/index.json", { season: SEASON_LABEL, players: index });
  for (const player of withShots) {
    await writeJson(`public/shots/${player.id}.json`, player.shots);
  }
  await writeJson("public/shots/league-baseline.json", baseline);
  console.log(
    `Wrote shot maps for ${withShots.length} featured players and ${baseline.zones.length} league baseline cells`,
  );

  console.log(`Fetching game logs for ${players.length} players...`);
  const logs = await buildGameLogs(players);
  console.log(`Wrote ${logs} game logs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

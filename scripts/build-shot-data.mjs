// Build-time ETL for the shooting dashboard.
//
// stats.nba.com silently drops requests from most networks, so instead of
// scraping it at deploy time we pull the numbers from ESPN's web API at build
// time and commit the result. Everything this writes is committed, so the
// deployed app never depends on an external data host at request time.
//
// Three data outputs:
//   - src/data/shooting-stats.json:    table aggregates, players with 200+ FGA.
//   - src/data/leaderboard-stats.json: same aggregates for the full league, so the
//                                      leaderboards can rank every NBA player and
//                                      apply NBA-style qualification at display time.
//   - public/shots/*.json:             per-shot coordinates for the featured charts.
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

// The table needs a real sample of attempts before per-game shooting splits mean
// anything, so it drops deep bench players who took a handful of shots all year.
// The leaderboard dataset keeps everyone (qualification is applied per category at
// display time), so this floor only gates the table, shot charts, and game logs.
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

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

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

// Aggregate every athlete ESPN returns. Callers decide which floor to apply: the
// table keeps 200+ FGA, the leaderboards keep the whole league.
function aggregatePlayers(byathlete, teamNames) {
  const stat = makeStatReader(byathlete.categories);

  return byathlete.athletes
    .filter((entry) => stat(entry, "general", "gamesPlayed") >= 1)
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
        // Box-score breadth so the data isn't shooting-only. ESPN files rebounds
        // and minutes under "general", assists/turnovers under "offensive", and
        // steals/blocks under "defensive".
        rebounds: stat(entry, "general", "rebounds"),
        reboundsPerGame: round(stat(entry, "general", "avgRebounds")),
        assists: stat(entry, "offensive", "assists"),
        assistsPerGame: round(stat(entry, "offensive", "avgAssists")),
        steals: stat(entry, "defensive", "steals"),
        stealsPerGame: round(stat(entry, "defensive", "avgSteals")),
        blocks: stat(entry, "defensive", "blocks"),
        blocksPerGame: round(stat(entry, "defensive", "avgBlocks")),
        turnovers: stat(entry, "offensive", "turnovers"),
        turnoversPerGame: round(stat(entry, "offensive", "avgTurnovers")),
        minutesPerGame: round(stat(entry, "general", "avgMinutes")),
      };
    })
    .sort((a, b) => b.pointsPerGame - a.pointsPerGame);
}

function toCourt(coordinate) {
  if (!coordinate) return null;
  const { x, y } = coordinate;
  if (x === COORD_SENTINEL || y === COORD_SENTINEL) return null;
  if (x < 0 || x > 50 || y < 0 || y > 60) return null;
  return { x: round(x - 25), y: round(y + RIM_Y_OFFSET) };
}

// Fetch every player's game log once, up front. The same logs drive two outputs
// — the union of game ids to scan for shots, and the per-player trend files — so
// fetching them here avoids hitting ESPN's gamelog endpoint twice per player.
async function fetchGamelogs(players) {
  const logs = new Map();
  let fetched = 0;
  for (const player of players) {
    try {
      logs.set(player.id, await fetchJson(gamelogUrl(player.id)));
    } catch (error) {
      console.warn(`  no game log for ${player.name}: ${error.message}`);
    }
    fetched += 1;
    if (fetched % 100 === 0) console.log(`  ...${fetched}/${players.length} game logs`);
  }
  return logs;
}

// Union of every game id appearing in the collected logs, so each game's
// play-by-play is fetched at most once regardless of how many players appeared.
function collectGameIds(gamelogs) {
  const ids = new Set();
  for (const log of gamelogs.values()) {
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

async function buildShotMaps(tablePlayers, gameIds) {
  const tableIds = new Set(tablePlayers.map((player) => player.id));
  const shotsById = new Map(tablePlayers.map((player) => [player.id, []]));
  // Every field-goal attempt in these games (all players) feeds the league grid.
  const league = new Map();

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
      if (shooterId && tableIds.has(String(shooterId))) {
        const value = play.pointsAttempted === 3 ? 3 : 2;
        shotsById.get(String(shooterId)).push({ ...point, made, value });
      }
    }

    scanned += 1;
    if (scanned % 100 === 0) console.log(`  ...${scanned}/${gameIds.length}`);
  }

  // Keep only players we actually charted a shot for, sorted by name so the
  // index reads cleanly in the player dropdown.
  const players = tablePlayers
    .map((player) => ({
      id: player.id,
      name: player.name,
      team: player.team,
      shots: shotsById.get(player.id),
    }))
    .filter((player) => player.shots.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

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

// Per-player game logs for the trend chart and table on the player page. Reuses
// the logs already fetched by fetchGamelogs; regular-season games only (matches
// the table).
async function buildGameLogs(players, gamelogs) {
  // Regular-season window, so the log matches the (regular-season) table and
  // excludes preseason and playoff games.
  const regularSeasonStart = "2025-10-21";
  const regularSeasonEnd = "2026-04-14";
  let written = 0;

  for (const player of players) {
    const log = gamelogs.get(player.id);
    if (!log) continue;

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
        rebounds: Number(stats[at("totalRebounds")]) || 0,
        assists: Number(stats[at("assists")]) || 0,
        steals: Number(stats[at("steals")]) || 0,
        blocks: Number(stats[at("blocks")]) || 0,
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

  const allPlayers = aggregatePlayers(byathlete, teamNames);
  await writeJson("src/data/leaderboard-stats.json", { season: SEASON_LABEL, players: allPlayers });
  console.log(`Wrote leaderboard stats for ${allPlayers.length} players`);

  // The table, shot charts, and game logs all key off this smaller, higher-volume
  // slice; the leaderboards rank the full league above.
  const players = allPlayers.filter((player) => player.fga >= MIN_ATTEMPTS);
  await writeJson("src/data/shooting-stats.json", { season: SEASON_LABEL, players });
  console.log(`Wrote shooting stats for ${players.length} players`);

  // Fetch every table player's game log once, then reuse it for both the shot
  // scan (which games to pull play-by-play for) and the per-player trend files.
  console.log(`Fetching game logs for ${players.length} players...`);
  const gamelogs = await fetchGamelogs(players);
  const gameIds = collectGameIds(gamelogs);

  const { players: withShots, baseline } = await buildShotMaps(players, gameIds);
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
    `Wrote shot maps for ${withShots.length} players and ${baseline.zones.length} league baseline cells`,
  );

  const logs = await buildGameLogs(players, gamelogs);
  console.log(`Wrote ${logs} game logs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

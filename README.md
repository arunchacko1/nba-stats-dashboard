# NBA Stats Dashboard

An interactive NBA dashboard for the 2025-26 season: live standings and scores, a
sortable shooting-stats table, D3 shot charts, league leaderboards, a two-player
comparison view, and per-player detail pages with game-log trends.

![Shot chart](docs/shot-chart.png)

## Features

- **Landing page** introducing each area, with a live recent-scores teaser.
- **Standings & scores** for the live 2025-26 season from the [balldontlie](https://www.balldontlie.io/) API, with a committed snapshot as a fallback.
- **Shooting stats table** — 350+ qualified players, sortable on any column and filterable
  by player or team (TanStack Table), including FT%, eFG%, and TS%. Each player links to a
  **detail page** with their shooting splits, headshot, an inline shot chart, and a
  season trend chart with a game-by-game log.
- **Shot charts** — every field-goal attempt for any qualified player, binned into a
  hexagonal density map on an SVG court (hexagon size = shot frequency, color = make rate),
  with filters for made/missed and 2PT/3PT and a "vs league average" coloring mode.
  Filter by team, then player; the chart fills in once a player is chosen.
- **Leaderboards** — the full league ranked by category (PPG, FG%, 3P%, FT%, eFG%, TS%,
  threes made), applying the NBA's official qualification minimums prorated by games played.
- **Compare** — two players side by side on their shooting splits and shot charts.
- **Team pages** — season record, recent games, and the team's shooting leaders.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · TanStack Table ·
D3 (d3-hexbin, d3-scale) · Zod · Vitest.

## Architecture & key decisions

**Two data sources, picked for reliability.** The interesting constraint here was
data. The obvious source, `stats.nba.com`, silently drops requests from this machine
and from datacenter IPs, so neither local builds nor a serverless host can reach it.
The dashboard avoids it entirely:

- **Team & game data (balldontlie, live with fallback):** the standings and team pages
  fetch the 2025-26 teams and full game log live and cache them with ISR (`getSeasonData`
  in `src/lib/seasonData.ts`). The free tier is heavily rate limited and can be
  unreachable from a datacenter IP, so every live read falls back to a committed
  snapshot of the same season — built off-platform with `npm run build:live` and stored
  at `src/data/season-snapshot.json`. The page renders current-season data either way.
  The free tier has no standings endpoint, so standings are **derived** from finished
  games (`src/lib/standings.ts`).
- **Shooting & shot data (committed, from ESPN):** the shooting table, leaderboards,
  shot charts, and game logs come from ESPN's public web API. A build step
  (`npm run build:data`) pulls per-player season aggregates plus play-by-play shot
  coordinates, aggregates per-player shooting splits, carves out per-player shot maps and
  a league-average baseline grid, and writes the per-player game logs — committing JSON
  that ships with the app. Players are keyed by their ESPN athlete id throughout. ESPN is
  only hit at build time; the deployed app serves the committed JSON.

**Resilience over a flaky free tier.** The API client (`src/lib/api/client.ts`)
injects auth, validates responses with Zod at the boundary, and waits out the free
tier's aggressive rate limiting — honoring `Retry-After` through repeated 429s so a
multi-page sweep completes. The same client powers both the request path (ISR-cached,
hourly) and the off-platform snapshot ETL, so a throttled or blocked live fetch
degrades to committed data instead of failing the render.

**D3 for math, React for the DOM.** The shot chart uses D3 only to compute the
hexbin layout and scales; the SVG itself is rendered as plain React elements. That
keeps the component declarative and testable without imperative DOM manipulation. The
"vs league average" mode colors each bin against a league baseline grid aggregated from
the same play-by-play scan, so the comparison needs no extra data source.

**Static at runtime.** Both ETLs run off-platform and commit their output, so the
deployed app has no runtime dependency on ESPN and only an optional, cached one on
balldontlie. Refresh the datasets anytime with `npm run build:data` /
`npm run build:live`, then commit and push.

## Getting started

```bash
npm install

# Regenerate the committed datasets (already in the repo). Both ETLs run
# off-platform; the season snapshot needs a free balldontlie key in .env.local
# as BALLDONTLIE_API_KEY (the ESPN build needs no key).
npm run build:data   # shooting table, leaderboards, shot charts, game logs (ESPN)
npm run build:live   # standings, scores, team pages (balldontlie)

npm run dev
```

Open http://localhost:3000. With a `BALLDONTLIE_API_KEY` set, standings and scores
are fetched live; without one (or if the API is unreachable) the app falls back to
the committed snapshot, so it always renders.

## Testing

```bash
npm test
```

Vitest covers the API client (retry, rate-limit, error paths), the Zod schemas, the
standings derivation, the shot coordinate transform, the shooting-data integrity, the
leaderboard qualification logic, and the chart's hexbin rendering.

## Project structure

```
src/
  app/                 routes: landing, /standings, /players, /players/[id],
                       /shot-chart, /leaderboards, /compare, /teams/[id]
  components/          ShootingTable, ShotChart, ShotExplorer, Leaderboards,
                       PlayerHeadshot, TrendChart, ScoreGrid, SiteHeader
  lib/
    api/               balldontlie client, typed functions, Zod schemas (used by the ETL)
    court.ts           half-court geometry + coordinate transform
    standings.ts       standings derived from games
    shooting.ts        loader for the aggregated shooting data
    leaderboard.ts     league leaderboard categories + qualification
    seasonData.ts      live season data (balldontlie) with snapshot fallback
    shots.ts           loaders for per-player shot maps
    gamelog.ts         loader for per-player game logs
    headshot.ts        ESPN headshot URL from an athlete id
  data/                generated shooting-stats.json, leaderboard-stats.json, season-snapshot.json
scripts/
  build-shot-data.mjs  ESPN ETL (stats, shot maps, league baseline, game logs)
  build-live-data.ts   season-snapshot ETL (teams, games)
public/shots/          generated per-player shot maps + league baseline
public/gamelogs/       generated per-player game logs
```

## Data credit

Shooting stats, shot locations, and game logs from [ESPN](https://www.espn.com/nba/).
Live game and team data from [balldontlie](https://www.balldontlie.io/).

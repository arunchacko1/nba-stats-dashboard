# NBA Shooting Dashboard

An interactive dashboard for the 2024-25 NBA season: live standings and scores, a
sortable shooting-stats table, and D3 hexbin shot charts built from a full season
of shot-location data.

![Shot chart](docs/shot-chart.png)

## Features

- **Standings & scores** reconstructed from the live [balldontlie](https://www.balldontlie.io/) API.
- **Shooting stats table** — 300+ players, sortable on any column and filterable by
  player or team (TanStack Table).
- **Shot charts** — every field-goal attempt for a featured player, binned into a
  hexagonal density map on an SVG court (hexagon size = shot frequency, color = make rate).
- **Team pages** — roster, season record, recent games, and the team's shooting leaders.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · TanStack Table ·
D3 (d3-hexbin, d3-scale) · Zod · Vitest.

## Architecture & key decisions

**Two data sources, picked for reliability.** The interesting constraint here was
data. The obvious source, `stats.nba.com`, silently drops requests from datacenter
IPs, so anything deployed to a serverless host can't reach it. The dashboard avoids
that entirely:

- **Live data (balldontlie):** teams, rosters, players, and games. The free tier
  doesn't expose a standings endpoint, so standings are **derived** from the season's
  finished games (`src/lib/standings.ts`). The home page pulls the full season once
  (~13 paginated calls) and caches it for six hours, computing both standings and
  recent scores from that single sweep.
- **Static data (committed):** the shooting table and shot charts come from a published
  season shot log. A build step (`npm run build:data`) downloads it, aggregates
  per-player shooting splits, and carves out per-player shot maps, writing JSON that
  ships with the app. The deployed site never depends on an external host for this.

**Resilience over a flaky free tier.** The API client (`src/lib/api/client.ts`)
injects auth, validates responses with Zod at the boundary, and honors `Retry-After`
on a 429 with one bounded retry. Pages that need live data degrade to a clear notice
when the key is missing instead of crashing, so the shooting features always work.

**D3 for math, React for the DOM.** The shot chart uses D3 only to compute the
hexbin layout and scales; the SVG itself is rendered as plain React elements. That
keeps the component declarative and testable without imperative DOM manipulation.

**One honest caveat:** the shot log has no free throws, so the table's points-per-game
is _field-goal points only_. It's labelled as such everywhere rather than passed off
as true PPG.

## Getting started

```bash
npm install

# Optional: a free balldontlie key enables live standings, scores, and team pages.
cp .env.example .env.local
# then set BALLDONTLIE_API_KEY=...

# Regenerate the committed shooting + shot-chart data (already in the repo):
npm run build:data

npm run dev
```

Open http://localhost:3000. The shooting table and shot charts work without a key;
the home standings/scores and team pages need `BALLDONTLIE_API_KEY`.

## Testing

```bash
npm test
```

Vitest covers the API client (retry, rate-limit, error paths), the Zod schemas, the
standings derivation, the shot coordinate transform, the shooting-data integrity, and
the chart's hexbin rendering.

## Project structure

```
src/
  app/                 routes: home, /players, /shot-chart, /teams/[id]
  components/          ShootingTable, ShotChart, CourtMarkings, ShotExplorer, SiteHeader
  lib/
    api/               balldontlie client, typed functions, Zod schemas
    court.ts           half-court geometry + coordinate transform
    standings.ts       standings derived from games
    shooting.ts        loader for the aggregated shooting data
    shots.ts           loaders for per-player shot maps
  data/                generated shooting-stats.json
scripts/
  build-shot-data.mjs  the data ETL
public/shots/          generated per-player shot maps
```

## Data credit

Shot-location data from the public
[NBA shots dataset](https://github.com/DomSamangy/NBA_Shots_04_25). Live game and
team data from [balldontlie](https://www.balldontlie.io/).

// The season the live half of the dashboard is built around. Standings, scores,
// and the balldontlie queries all key off this.
export const SEASON = 2025;
export const SEASON_LABEL = "2025-26";

// The shooting table and shot charts are built from ESPN at build time (see
// scripts/build-shot-data.mjs) and track the same season as the live feed. Kept
// as its own constant so the shooting copy reads from one place.
export const SHOOTING_SEASON_LABEL = SEASON_LABEL;

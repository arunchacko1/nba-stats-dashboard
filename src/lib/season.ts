// The season the live half of the dashboard is built around. Standings, scores,
// and the balldontlie queries all key off this.
export const SEASON = 2025;
export const SEASON_LABEL = "2025-26";

// The shot-location data comes from a published research dataset (see
// scripts/build-shot-data.mjs) that lags a season behind the live feed — the
// 2025-26 shot log isn't out yet — so the shooting table and charts are labeled
// with their own, older season rather than SEASON_LABEL.
export const SHOOTING_SEASON_LABEL = "2024-25";

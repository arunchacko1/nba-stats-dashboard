// Players are keyed by their ESPN athlete id (see scripts/build-shot-data.mjs),
// and ESPN serves a headshot at a URL derived from that id. So we never store
// photo URLs — they're computed from the id we already have.
export function headshotUrl(id: string): string {
  return `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
}

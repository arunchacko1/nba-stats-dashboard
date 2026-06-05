import { describe, expect, it } from "vitest";
import { getShootingStats } from "./shooting";

// These run against the committed ETL output, so they double as a guard that the
// generated dataset stays internally consistent if the build script changes.
describe("shooting dataset", () => {
  const { season, players } = getShootingStats();

  it("loads the 2024-25 season and validates against the schema", () => {
    expect(season).toBe("2024-25");
    expect(players.length).toBeGreaterThan(100);
  });

  it("keeps made attempts within total attempts for every player", () => {
    for (const player of players) {
      expect(player.fgm).toBeLessThanOrEqual(player.fga);
      expect(player.fg3m).toBeLessThanOrEqual(player.fg3a);
      expect(player.fg3a).toBeLessThanOrEqual(player.fga);
    }
  });

  it("keeps every percentage in a sane 0-100 range", () => {
    for (const player of players) {
      expect(player.fgPct).toBeGreaterThanOrEqual(0);
      expect(player.fgPct).toBeLessThanOrEqual(100);
      expect(player.fg3Pct).toBeGreaterThanOrEqual(0);
      expect(player.fg3Pct).toBeLessThanOrEqual(100);
    }
  });

  it("derives per-game field-goal points consistently with makes", () => {
    for (const player of players) {
      const points = (player.fgm - player.fg3m) * 2 + player.fg3m * 3;
      const expected = Math.round((points / player.games) * 10) / 10;
      expect(player.pointsPerGame).toBeCloseTo(expected, 5);
    }
  });
});

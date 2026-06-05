import { describe, expect, it } from "vitest";
import { filterPlayers, getPlayerById, getShootingStats, type ShootingStat } from "./shooting";

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

describe("getPlayerById", () => {
  const { players } = getShootingStats();

  it("returns the matching player for a real id", () => {
    const target = players[0];
    expect(getPlayerById(target.id)).toEqual(target);
  });

  it("returns null when no player has the id", () => {
    expect(getPlayerById("not-a-real-id")).toBeNull();
  });
});

describe("filterPlayers", () => {
  const sample: ShootingStat[] = [
    makeStat({ name: "Stephen Curry", team: "Golden State Warriors" }),
    makeStat({ name: "Klay Thompson", team: "Dallas Mavericks" }),
    makeStat({ name: "Luka Dončić", team: "Dallas Mavericks" }),
  ];

  it("returns everyone when the query is blank or whitespace", () => {
    expect(filterPlayers(sample, "")).toHaveLength(3);
    expect(filterPlayers(sample, "   ")).toHaveLength(3);
  });

  it("matches on player name, case-insensitively", () => {
    const result = filterPlayers(sample, "curry");
    expect(result.map((p) => p.name)).toEqual(["Stephen Curry"]);
  });

  it("matches on team name", () => {
    const result = filterPlayers(sample, "dallas");
    expect(result).toHaveLength(2);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterPlayers(sample, "celtics")).toHaveLength(0);
  });
});

function makeStat(overrides: Partial<ShootingStat>): ShootingStat {
  return {
    id: "1",
    name: "Player",
    team: "Team",
    games: 70,
    fga: 1000,
    fgm: 500,
    fgPct: 50,
    fg3a: 300,
    fg3m: 120,
    fg3Pct: 40,
    pointsPerGame: 12,
    fgaPerGame: 14,
    ...overrides,
  };
}

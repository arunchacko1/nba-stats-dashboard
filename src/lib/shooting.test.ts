import { describe, expect, it } from "vitest";
import {
  efgPct,
  filterPlayers,
  getPlayerById,
  getShootingStats,
  teamOptions,
  tsPct,
  type ShootingStat,
} from "./shooting";

// These run against the committed ETL output, so they double as a guard that the
// generated dataset stays internally consistent if the build script changes.
describe("shooting dataset", () => {
  const { season, players } = getShootingStats();

  it("loads the 2025-26 season and validates against the schema", () => {
    expect(season).toBe("2025-26");
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

  it("reports true points per game at or above field-goal-only scoring", () => {
    for (const player of players) {
      // pointsPerGame includes free throws, so it can only meet or exceed the
      // points implied by field goals alone — and should stay in a sane range.
      const fgPointsPerGame = ((player.fgm - player.fg3m) * 2 + player.fg3m * 3) / player.games;
      expect(player.pointsPerGame).toBeGreaterThanOrEqual(Math.floor(fgPointsPerGame * 10) / 10);
      expect(player.pointsPerGame).toBeLessThan(50);
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

const sample: ShootingStat[] = [
  makeStat({ id: "1", name: "Stephen Curry", team: "Golden State Warriors" }),
  makeStat({ id: "2", name: "Klay Thompson", team: "Dallas Mavericks" }),
  makeStat({ id: "3", name: "Luka Dončić", team: "Dallas Mavericks" }),
];

describe("teamOptions", () => {
  it("returns distinct team names sorted alphabetically", () => {
    expect(teamOptions(sample)).toEqual(["Dallas Mavericks", "Golden State Warriors"]);
  });
});

describe("filterPlayers", () => {
  it("returns everyone when no filters are set", () => {
    expect(filterPlayers(sample, {})).toHaveLength(3);
    expect(filterPlayers(sample, { query: "   " })).toHaveLength(3);
  });

  it("matches on player name, case-insensitively", () => {
    const result = filterPlayers(sample, { query: "curry" });
    expect(result.map((p) => p.name)).toEqual(["Stephen Curry"]);
  });

  it("matches on team name", () => {
    expect(filterPlayers(sample, { query: "dallas" })).toHaveLength(2);
  });

  it("filters by the team dropdown alone", () => {
    const result = filterPlayers(sample, { team: "Dallas Mavericks" });
    expect(result.map((p) => p.id)).toEqual(["2", "3"]);
  });

  it("applies team and query together with AND", () => {
    const result = filterPlayers(sample, { team: "Dallas Mavericks", query: "luka" });
    expect(result.map((p) => p.name)).toEqual(["Luka Dončić"]);
  });

  it("returns nothing when the combination matches nothing", () => {
    expect(filterPlayers(sample, { team: "Golden State Warriors", query: "luka" })).toHaveLength(0);
    expect(filterPlayers(sample, { query: "celtics" })).toHaveLength(0);
  });
});

describe("efgPct", () => {
  it("credits the extra point a three is worth", () => {
    // (400 makes + half of 100 threes) / 1000 attempts
    expect(efgPct(makeStat({ fgm: 400, fg3m: 100, fga: 1000 }))).toBeCloseTo(45, 5);
  });

  it("is zero with no field-goal attempts", () => {
    expect(efgPct(makeStat({ fga: 0 }))).toBe(0);
  });
});

describe("tsPct", () => {
  it("weights free-throw attempts by 0.44", () => {
    const player = makeStat({ points: 500, fga: 400, fta: 100 });
    expect(tsPct(player)).toBeCloseTo((500 / (2 * (400 + 44))) * 100, 5);
  });

  it("is zero with no shooting possessions", () => {
    expect(tsPct(makeStat({ fga: 0, fta: 0 }))).toBe(0);
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
    fta: 200,
    ftm: 160,
    ftPct: 80,
    points: 1280,
    pointsPerGame: 12,
    fgaPerGame: 14,
    ...overrides,
  };
}

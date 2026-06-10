import { describe, expect, it } from "vitest";
import { trendStats, type GameLogEntry } from "./gamelog";

function game(overrides: Partial<GameLogEntry>): GameLogEntry {
  return {
    date: "2026-01-01",
    opponent: "LAL",
    home: true,
    won: true,
    points: 0,
    fgm: 0,
    fga: 0,
    fg3m: 0,
    fg3a: 0,
    ...overrides,
  };
}

describe("trendStats", () => {
  it("derives FG% as makes over attempts", () => {
    expect(trendStats.fgPct.value(game({ fgm: 5, fga: 10 }))).toBe(50);
  });

  it("returns 0 FG% when there were no attempts", () => {
    expect(trendStats.fgPct.value(game({ fgm: 0, fga: 0 }))).toBe(0);
  });

  it("reads points directly", () => {
    expect(trendStats.points.value(game({ points: 30 }))).toBe(30);
  });
});

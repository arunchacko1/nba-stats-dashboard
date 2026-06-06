import { describe, expect, it } from "vitest";
import { getCapturedAt, getSnapshotGames, getSnapshotTeams, getTeamById } from "./seasonData";
import { deriveStandings } from "./standings";

// Runs against the committed snapshot, so it doubles as a guard that the ETL
// output stays internally consistent and complete.
describe("season snapshot", () => {
  const teams = getSnapshotTeams();
  const games = getSnapshotGames();

  it("captures all 30 teams, evenly split across conferences", () => {
    expect(teams).toHaveLength(30);
    expect(teams.filter((team) => team.conference === "East")).toHaveLength(15);
    expect(teams.filter((team) => team.conference === "West")).toHaveLength(15);
  });

  it("captures a full season of games", () => {
    expect(games.length).toBeGreaterThan(1000);
  });

  it("has a parseable capture timestamp", () => {
    expect(Number.isNaN(Date.parse(getCapturedAt()))).toBe(false);
  });

  it("derives standings where wins and losses balance out", () => {
    const standings = deriveStandings(games, teams);
    const rows = [...standings.east, ...standings.west];
    const totalWins = rows.reduce((sum, row) => sum + row.wins, 0);
    const totalLosses = rows.reduce((sum, row) => sum + row.losses, 0);
    // Every finished game contributes exactly one win and one loss.
    expect(totalWins).toBe(totalLosses);
    expect(totalWins).toBeGreaterThan(1000);
  });

  it("looks up a team by id and returns undefined for an unknown id", () => {
    expect(getTeamById(teams[0].id)?.id).toBe(teams[0].id);
    expect(getTeamById(-1)).toBeUndefined();
  });
});

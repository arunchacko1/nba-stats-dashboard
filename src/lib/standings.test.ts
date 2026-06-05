import { describe, expect, it } from "vitest";
import type { Game, Team } from "@/lib/api/schemas";
import { deriveStandings } from "./standings";

function team(id: number, conference: "East" | "West", abbreviation: string): Team {
  return {
    id,
    conference,
    division: "Division",
    city: "City",
    name: abbreviation,
    full_name: `Team ${abbreviation}`,
    abbreviation,
  };
}

const celtics = team(1, "East", "BOS");
const heat = team(2, "East", "MIA");
const nuggets = team(3, "West", "DEN");

function game(
  home: Team,
  away: Team,
  homeScore: number,
  awayScore: number,
  status = "Final",
): Game {
  return {
    id: Math.random(),
    date: "2025-01-01",
    season: 2024,
    status,
    home_team: home,
    visitor_team: away,
    home_team_score: homeScore,
    visitor_team_score: awayScore,
  };
}

describe("deriveStandings", () => {
  const teams = [celtics, heat, nuggets];

  it("credits a win to the higher score and a loss to the other", () => {
    const { east } = deriveStandings([game(celtics, heat, 110, 100)], teams);
    const bos = east.find((r) => r.team.id === celtics.id)!;
    const mia = east.find((r) => r.team.id === heat.id)!;
    expect(bos).toMatchObject({ wins: 1, losses: 0 });
    expect(mia).toMatchObject({ wins: 0, losses: 1 });
  });

  it("counts road wins, not just home wins", () => {
    const { east } = deriveStandings([game(heat, celtics, 90, 95)], teams);
    expect(east.find((r) => r.team.id === celtics.id)!.wins).toBe(1);
  });

  it("ignores games that are not final", () => {
    const { east } = deriveStandings([game(celtics, heat, 50, 40, "1st Qtr")], teams);
    expect(east.every((r) => r.wins === 0 && r.losses === 0)).toBe(true);
  });

  it("splits teams into their conferences and sorts by win percentage", () => {
    const games = [
      game(celtics, heat, 110, 100),
      game(celtics, heat, 112, 108),
      game(heat, celtics, 99, 90),
    ];
    const { east, west } = deriveStandings(games, teams);
    expect(east.map((r) => r.team.abbreviation)).toEqual(["BOS", "MIA"]);
    expect(east[0].winPct).toBeCloseTo(2 / 3, 5);
    expect(west.map((r) => r.team.abbreviation)).toEqual(["DEN"]);
  });

  it("reports a zero win percentage for teams that have not played", () => {
    const { west } = deriveStandings([], teams);
    expect(west[0]).toMatchObject({ wins: 0, losses: 0, winPct: 0 });
  });
});

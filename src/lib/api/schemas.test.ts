import { describe, expect, it } from "vitest";
import { gameSchema, listResponse, playerSchema, teamSchema } from "./schemas";

const lakers = {
  id: 14,
  conference: "West",
  division: "Pacific",
  city: "Los Angeles",
  name: "Lakers",
  full_name: "Los Angeles Lakers",
  abbreviation: "LAL",
};

describe("teamSchema", () => {
  it("parses a valid team", () => {
    expect(teamSchema.parse(lakers).abbreviation).toBe("LAL");
  });

  it("drops unknown fields it does not depend on", () => {
    const parsed = teamSchema.parse({ ...lakers, owner: "Buss Family" });
    expect(parsed).not.toHaveProperty("owner");
  });

  it("rejects a team missing a required field", () => {
    const { abbreviation, ...withoutAbbreviation } = lakers;
    void abbreviation;
    expect(() => teamSchema.parse(withoutAbbreviation)).toThrow();
  });
});

describe("playerSchema", () => {
  it("parses a player with a nested team", () => {
    const player = playerSchema.parse({
      id: 237,
      first_name: "LeBron",
      last_name: "James",
      position: "F",
      height: "6-9",
      weight: "250",
      jersey_number: "23",
      team: lakers,
    });
    expect(player.team.full_name).toBe("Los Angeles Lakers");
  });

  it("rejects when the nested team is malformed", () => {
    expect(() =>
      playerSchema.parse({
        id: 237,
        first_name: "LeBron",
        last_name: "James",
        position: "F",
        height: "6-9",
        weight: "250",
        jersey_number: "23",
        team: { id: 14 },
      }),
    ).toThrow();
  });
});

describe("gameSchema", () => {
  it("rejects non-numeric scores", () => {
    expect(() =>
      gameSchema.parse({
        id: 1,
        date: "2025-12-25",
        season: 2025,
        status: "Final",
        home_team: lakers,
        visitor_team: lakers,
        home_team_score: "115",
        visitor_team_score: 110,
      }),
    ).toThrow();
  });
});

describe("listResponse", () => {
  it("validates each item in the data array", () => {
    const schema = listResponse(teamSchema);
    expect(schema.parse({ data: [lakers] }).data).toHaveLength(1);
    expect(() => schema.parse({ data: [{ id: 1 }] })).toThrow();
  });
});

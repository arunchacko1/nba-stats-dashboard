import { describe, expect, it } from "vitest";
import {
  filterShotPlayersByTeam,
  shotTeamOptions,
  type ShotPlayerSummary,
} from "./shots";

const players: ShotPlayerSummary[] = [
  { id: "1", name: "Player One", team: "Phoenix Suns", shotCount: 100 },
  { id: "2", name: "Player Two", team: "Boston Celtics", shotCount: 200 },
  { id: "3", name: "Player Three", team: "Phoenix Suns", shotCount: 150 },
];

describe("shotTeamOptions", () => {
  it("returns distinct team names sorted alphabetically", () => {
    expect(shotTeamOptions(players)).toEqual(["Boston Celtics", "Phoenix Suns"]);
  });

  it("returns an empty list when there are no players", () => {
    expect(shotTeamOptions([])).toEqual([]);
  });
});

describe("filterShotPlayersByTeam", () => {
  it("keeps only players on the chosen team", () => {
    const result = filterShotPlayersByTeam(players, "Phoenix Suns");
    expect(result.map((player) => player.id)).toEqual(["1", "3"]);
  });

  it("returns every player when no team is given", () => {
    expect(filterShotPlayersByTeam(players, "")).toHaveLength(3);
  });
});

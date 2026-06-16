import { describe, expect, it } from "vitest";
import {
  matchTeam,
  normalizeName,
  percentileRank,
  rankPlayerMatches,
  topPlayersBy,
} from "./query";

const roster = [
  { id: "1", name: "Luka Dončić", team: "Dallas Mavericks" },
  { id: "2", name: "Shai Gilgeous-Alexander", team: "Oklahoma City Thunder" },
  { id: "3", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { id: "4", name: "Stephen Curry", team: "Golden State Warriors" },
  { id: "5", name: "Seth Curry", team: "Charlotte Hornets" },
];

describe("normalizeName", () => {
  it("strips accents, punctuation, and case", () => {
    expect(normalizeName("Luka Dončić")).toBe("luka doncic");
    expect(normalizeName("Gilgeous-Alexander")).toBe("gilgeous alexander");
  });
});

describe("rankPlayerMatches", () => {
  it("matches an accented full name typed without accents", () => {
    expect(rankPlayerMatches(roster, "luka doncic")[0].id).toBe("1");
  });

  it("resolves a nickname to the right player", () => {
    expect(rankPlayerMatches(roster, "SGA")[0].id).toBe("2");
    expect(rankPlayerMatches(roster, "greek freak")[0].id).toBe("3");
  });

  it("ranks an exact last-name hit above a partial one", () => {
    const results = rankPlayerMatches(roster, "stephen curry");
    expect(results[0].id).toBe("4");
  });

  it("returns several candidates for an ambiguous surname", () => {
    const ids = rankPlayerMatches(roster, "curry").map((r) => r.id);
    expect(ids).toContain("4");
    expect(ids).toContain("5");
  });

  it("returns nothing for an empty query or no match", () => {
    expect(rankPlayerMatches(roster, "")).toEqual([]);
    expect(rankPlayerMatches(roster, "zzzzz")).toEqual([]);
  });

  it("honors the limit", () => {
    expect(rankPlayerMatches(roster, "curry", 1)).toHaveLength(1);
  });
});

describe("matchTeam", () => {
  const teams = ["Boston Celtics", "Dallas Mavericks", "Golden State Warriors"];

  it("matches a bare nickname to the full name", () => {
    expect(matchTeam(teams, "celtics")).toBe("Boston Celtics");
    expect(matchTeam(teams, "warriors")).toBe("Golden State Warriors");
  });

  it("matches a city", () => {
    expect(matchTeam(teams, "boston")).toBe("Boston Celtics");
  });

  it("returns null when nothing matches", () => {
    expect(matchTeam(teams, "london")).toBeNull();
  });
});

describe("topPlayersBy (real data)", () => {
  it("returns leaders sorted high-to-low, within the limit", () => {
    const leaders = topPlayersBy("ppg", { limit: 5 });
    expect(leaders.length).toBeLessThanOrEqual(5);
    expect(leaders.length).toBeGreaterThan(0);
    for (let i = 1; i < leaders.length; i++) {
      expect(leaders[i - 1].value).toBeGreaterThanOrEqual(leaders[i].value);
    }
  });

  it("scopes leaders to a single team", () => {
    const leaders = topPlayersBy("ppg", { qualifiedOnly: false, limit: 3 });
    const team = leaders[0].player.team;
    const scoped = topPlayersBy("ppg", { team, qualifiedOnly: false, limit: 3 });
    expect(scoped.every((leader) => leader.player.team === team)).toBe(true);
  });

  it("throws on an unknown stat", () => {
    expect(() => topPlayersBy("bogus")).toThrow(/Unknown stat/);
  });
});

describe("percentileRank", () => {
  const values = [10, 20, 30, 40, 50];

  it("puts the maximum near the top and the minimum near the bottom", () => {
    expect(percentileRank(values, 50)).toBe(90); // 4 below + half of itself
    expect(percentileRank(values, 10)).toBe(10);
  });

  it("places the median in the middle", () => {
    expect(percentileRank(values, 30)).toBe(50);
  });

  it("returns 0 for an empty population", () => {
    expect(percentileRank([], 5)).toBe(0);
  });
});

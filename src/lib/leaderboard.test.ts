import { describe, expect, it } from "vitest";
import { categories, qualificationContext, rankLeaders } from "./leaderboard";
import { getLeaderboardStats } from "./leaderboardData";
import { getShootingStats, type ShootingStat } from "./shooting";

function makeStat(overrides: Partial<ShootingStat>): ShootingStat {
  return {
    id: "1",
    name: "Player",
    team: "Team",
    games: 82,
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
    rebounds: 400,
    reboundsPerGame: 5,
    assists: 300,
    assistsPerGame: 4,
    steals: 80,
    stealsPerGame: 1,
    blocks: 40,
    blocksPerGame: 0.5,
    turnovers: 200,
    turnoversPerGame: 2.5,
    minutesPerGame: 30,
    ...overrides,
  };
}

describe("qualificationContext", () => {
  it("uses the league leader's games as the season length", () => {
    const ctx = qualificationContext([
      makeStat({ games: 40 }),
      makeStat({ games: 82 }),
      makeStat({ games: 70 }),
    ]);
    expect(ctx.leagueGames).toBe(82);
    expect(ctx.seasonFraction).toBe(1);
  });

  it("prorates the season fraction before the schedule is complete", () => {
    const ctx = qualificationContext([makeStat({ games: 41 })]);
    expect(ctx.leagueGames).toBe(41);
    expect(ctx.seasonFraction).toBeCloseTo(0.5, 5);
  });

  it("never exceeds a full season and survives an empty league", () => {
    expect(qualificationContext([makeStat({ games: 100 })]).seasonFraction).toBe(1);
    expect(qualificationContext([]).seasonFraction).toBe(0);
  });
});

describe("rankLeaders qualification (full season)", () => {
  const ctx = { leagueGames: 82, seasonFraction: 1 };
  const cat = (id: string) => categories.find((c) => c.id === id)!;

  it("counting categories rank everyone, no minimum", () => {
    const players = [makeStat({ id: "a", fg3m: 5 }), makeStat({ id: "b", fg3m: 200 })];
    const ranked = rankLeaders(players, cat("fg3m"), ctx);
    expect(ranked.map((r) => r.player.id)).toEqual(["b", "a"]);
  });

  it("drops a hot but low-volume player from the FG% board", () => {
    const flukey = makeStat({ id: "flukey", fgm: 10, fga: 12, fgPct: 83.3 });
    const grinder = makeStat({ id: "grinder", fgm: 400, fga: 700, fgPct: 57.1 });
    const ranked = rankLeaders([flukey, grinder], cat("fgPct"), ctx);
    expect(ranked.map((r) => r.player.id)).toEqual(["grinder"]);
  });

  it("requires 82 made threes for the 3P% board", () => {
    const sniper = makeStat({ id: "lots", fg3m: 90, fg3Pct: 45 });
    const trickShot = makeStat({ id: "few", fg3m: 81, fg3Pct: 60 });
    expect(rankLeaders([sniper, trickShot], cat("fg3Pct"), ctx).map((r) => r.player.id)).toEqual([
      "lots",
    ]);
  });

  it("requires 58 games (70%) for per-game boards", () => {
    const reserve = makeStat({ id: "reserve", games: 57, pointsPerGame: 40 });
    const starter = makeStat({ id: "starter", games: 58, pointsPerGame: 25 });
    expect(rankLeaders([reserve, starter], cat("ppg"), ctx).map((r) => r.player.id)).toEqual([
      "starter",
    ]);
  });

  it("ranks the box-score per-game boards and applies the games minimum", () => {
    for (const [id, key] of [
      ["rpg", "reboundsPerGame"],
      ["apg", "assistsPerGame"],
      ["spg", "stealsPerGame"],
      ["bpg", "blocksPerGame"],
    ] as const) {
      const leader = makeStat({ id: "leader", games: 70, [key]: 12 });
      const benchHotStreak = makeStat({ id: "bench", games: 20, [key]: 20 });
      const ranked = rankLeaders([benchHotStreak, leader], cat(id), ctx);
      expect(ranked.map((r) => r.player.id)).toEqual(["leader"]);
    }
  });
});

describe("leaderboard dataset", () => {
  const { season, players } = getLeaderboardStats();

  it("covers the full league, well beyond the table's 200-FGA slice", () => {
    expect(season).toBe("2025-26");
    expect(players.length).toBeGreaterThan(getShootingStats().players.length);
  });

  // Leaderboard rows link to /players/[id], which is only statically generated for
  // the table dataset. Guard that every top-10 qualifier exists there so no row
  // links to a 404 — if a future rebuild breaks this, the test catches it.
  it("never ranks a player who is missing from the table set", () => {
    const tableIds = new Set(getShootingStats().players.map((p) => p.id));
    const ctx = qualificationContext(players);
    for (const category of categories) {
      for (const { player } of rankLeaders(players, category, ctx)) {
        expect(tableIds, `${category.id}: ${player.name} (${player.id})`).toContain(player.id);
      }
    }
  });
});

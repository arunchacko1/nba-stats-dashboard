import type { Game, Team } from "@/lib/api/schemas";

export interface TeamRecord {
  team: Team;
  wins: number;
  losses: number;
  winPct: number;
}

export interface Standings {
  east: TeamRecord[];
  west: TeamRecord[];
}

// balldontlie's free tier has no standings endpoint, so we reconstruct records
// from the season's finished games. Unplayed, in-progress, and postseason games
// are skipped — standings reflect the regular season only.
export function deriveStandings(games: Game[], teams: Team[]): Standings {
  const records = new Map<number, { wins: number; losses: number }>();
  for (const team of teams) records.set(team.id, { wins: 0, losses: 0 });

  for (const game of games) {
    if (game.status !== "Final" || game.postseason) continue;
    const homeWon = game.home_team_score > game.visitor_team_score;
    const winnerId = homeWon ? game.home_team.id : game.visitor_team.id;
    const loserId = homeWon ? game.visitor_team.id : game.home_team.id;
    const winner = records.get(winnerId);
    if (winner) winner.wins += 1;
    const loser = records.get(loserId);
    if (loser) loser.losses += 1;
  }

  const toRecord = (team: Team): TeamRecord => {
    const record = records.get(team.id) ?? { wins: 0, losses: 0 };
    const played = record.wins + record.losses;
    return {
      team,
      wins: record.wins,
      losses: record.losses,
      winPct: played === 0 ? 0 : record.wins / played,
    };
  };

  const forConference = (conference: string) =>
    teams
      .filter((team) => team.conference === conference)
      .map(toRecord)
      .sort((a, b) => b.winPct - a.winPct);

  return { east: forConference("East"), west: forConference("West") };
}

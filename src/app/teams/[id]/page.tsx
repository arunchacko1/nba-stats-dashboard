import { notFound } from "next/navigation";
import type { Game, Team } from "@/lib/api/schemas";
import { getSeasonData, getSnapshotTeams, getTeamById } from "@/lib/seasonData";
import { getShootingStats, type ShootingStat } from "@/lib/shooting";

// Refresh each team's live record/recent games hourly, matching the home page.
export const revalidate = 3600;

// The 30 teams are stable for the season, so prerender the routes from the
// snapshot rather than spending a live call just to enumerate ids.
export function generateStaticParams() {
  return getSnapshotTeams().map((team) => ({ id: String(team.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = getTeamById(Number(id));
  return {
    title: team ? `${team.full_name} — NBA Stats Dashboard` : "Team not found",
  };
}

interface TeamData {
  team: Team;
  wins: number;
  losses: number;
  recent: Game[];
}

function loadTeam(teamId: number, team: Team, allGames: Game[]): TeamData {
  const games = allGames.filter(
    (game) => game.home_team.id === teamId || game.visitor_team.id === teamId,
  );

  // Regular-season record only, matching the standings on the home page.
  let wins = 0;
  let losses = 0;
  for (const game of games) {
    if (game.status !== "Final" || game.postseason) continue;
    const isHome = game.home_team.id === teamId;
    const teamScore = isHome ? game.home_team_score : game.visitor_team_score;
    const opponentScore = isHome ? game.visitor_team_score : game.home_team_score;
    if (teamScore > opponentScore) wins += 1;
    else losses += 1;
  }

  const recent = games
    .filter((game) => game.status === "Final")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return { team, wins, losses, recent };
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();

  const { teams, games } = await getSeasonData();
  const team = teams.find((t) => t.id === teamId) ?? getTeamById(teamId);
  if (!team) notFound();

  const { wins, losses, recent } = loadTeam(teamId, team, games);
  const leaders = getShootingStats()
    .players.filter((player) => player.team === team.full_name)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{team.full_name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {team.conference}ern Conference · {team.division} · {wins}–{losses}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">Shooting Leaders</h2>
          {leaders.length === 0 ? (
            <p className="text-sm text-zinc-500">No qualifying shooters for this team.</p>
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 text-sm">
              {leaders.map((player) => (
                <LeaderRow key={player.id} player={player} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">Recent Games</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-500">No completed games yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 text-sm">
              {recent.map((game) => (
                <GameRow key={game.id} game={game} teamId={teamId} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function LeaderRow({ player }: { player: ShootingStat }) {
  return (
    <li className="flex items-center gap-4 px-4 py-2.5">
      <span className="flex-1 font-medium">{player.name}</span>
      <span className="w-20 text-right tabular-nums text-zinc-400">
        {player.pointsPerGame.toFixed(1)} pts
      </span>
      <span className="w-16 text-right tabular-nums text-zinc-400">
        {player.fg3Pct.toFixed(1)}% 3P
      </span>
    </li>
  );
}

function GameRow({ game, teamId }: { game: Game; teamId: number }) {
  const isHome = game.home_team.id === teamId;
  const opponent = isHome ? game.visitor_team : game.home_team;
  const teamScore = isHome ? game.home_team_score : game.visitor_team_score;
  const opponentScore = isHome ? game.visitor_team_score : game.home_team_score;
  const won = teamScore > opponentScore;

  return (
    <li className="flex items-center justify-between px-4 py-2.5">
      <span className="text-zinc-400">
        {isHome ? "vs" : "@"} {opponent.abbreviation}
      </span>
      <span className="flex items-center gap-2">
        <span className={won ? "font-semibold text-emerald-400" : "text-zinc-500"}>
          {won ? "W" : "L"}
        </span>
        <span className="tabular-nums">
          {teamScore}–{opponentScore}
        </span>
        <span className="ml-2 text-xs text-zinc-500">{game.date.slice(0, 10)}</span>
      </span>
    </li>
  );
}

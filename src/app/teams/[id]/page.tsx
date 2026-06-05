import { notFound } from "next/navigation";
import type { Game, Player, Team } from "@/lib/api/schemas";
import { getGames, getTeam, getTeamRoster } from "@/lib/api/balldontlie";
import { getShootingStats, type ShootingStat } from "@/lib/shooting";
import { SEASON } from "@/lib/season";

export const revalidate = 21600;

interface TeamData {
  team: Team;
  roster: Player[];
  wins: number;
  losses: number;
  recent: Game[];
}

async function loadTeam(teamId: number): Promise<TeamData | null> {
  try {
    const [team, roster, games] = await Promise.all([
      getTeam(teamId),
      getTeamRoster(teamId),
      getGames({ teamIds: [teamId], seasons: [SEASON], perPage: 100 }),
    ]);

    let wins = 0;
    let losses = 0;
    for (const game of games) {
      if (game.status !== "Final") continue;
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

    return { team, roster, wins, losses, recent };
  } catch {
    return null;
  }
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();

  const data = await loadTeam(teamId);
  if (!data) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        Couldn&apos;t load this team. Live team data needs{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">BALLDONTLIE_API_KEY</code>{" "}
        to be set.
      </div>
    );
  }

  const { team, roster, wins, losses, recent } = data;
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

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Roster</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm"
            >
              <span className="font-medium">
                {player.first_name} {player.last_name}
              </span>
              <span className="text-zinc-500">{player.position || "—"}</span>
            </div>
          ))}
        </div>
      </section>
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

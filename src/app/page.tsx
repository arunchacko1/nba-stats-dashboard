import Link from "next/link";
import type { Game } from "@/lib/api/schemas";
import { getAllGames, getTeams } from "@/lib/api/balldontlie";
import { getShootingStats } from "@/lib/shooting";
import { SEASON, SEASON_LABEL } from "@/lib/season";
import { deriveStandings, type Standings, type TeamRecord } from "@/lib/standings";

export const revalidate = 21600;

async function loadLiveData(): Promise<{ standings: Standings; recent: Game[] } | null> {
  try {
    const [games, teams] = await Promise.all([getAllGames(SEASON), getTeams()]);
    const recent = games
      .filter((game) => game.status === "Final")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
    return { standings: deriveStandings(games, teams), recent };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const live = await loadLiveData();
  const leaders = getShootingStats().players.slice(0, 8);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">{SEASON_LABEL} NBA Shooting Dashboard</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Standings and scores from the live balldontlie API, alongside shooting splits and D3 shot
          charts built from a full season of shot-location data.
        </p>
      </section>

      {live ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <StandingsCard title="Eastern Conference" rows={live.standings.east} />
            <StandingsCard title="Western Conference" rows={live.standings.west} />
          </section>
          <section>
            <SectionHeading>Recent Scores</SectionHeading>
            <ScoreGrid games={live.recent} />
          </section>
        </>
      ) : (
        <ApiKeyNotice />
      )}

      <section>
        <div className="flex items-baseline justify-between">
          <SectionHeading>Field-Goal Scoring Leaders</SectionHeading>
          <Link href="/players" className="text-sm text-zinc-400 hover:text-white">
            All shooting stats →
          </Link>
        </div>
        <ol className="mt-3 divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
          {leaders.map((player, index) => (
            <li key={player.id} className="flex items-center gap-4 px-4 py-2.5 text-sm">
              <span className="w-5 text-right tabular-nums text-zinc-500">{index + 1}</span>
              <span className="flex-1 font-medium">{player.name}</span>
              <span className="text-zinc-400">{player.team}</span>
              <span className="w-16 text-right tabular-nums font-semibold">
                {player.pointsPerGame.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-zinc-500">
          Field-goal points per game (excludes free throws).
        </p>
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold tracking-tight">{children}</h2>;
}

function StandingsCard({ title, rows }: { title: string; rows: TeamRecord[] }) {
  return (
    <div>
      <SectionHeading>{title}</SectionHeading>
      <table className="mt-3 w-full overflow-hidden rounded-lg border border-zinc-800 text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Team</th>
            <th className="px-3 py-2 text-right font-semibold">W</th>
            <th className="px-3 py-2 text-right font-semibold">L</th>
            <th className="px-3 py-2 text-right font-semibold">Pct</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record, index) => (
            <tr key={record.team.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
              <td className="px-3 py-2">
                <span className="mr-2 tabular-nums text-zinc-500">{index + 1}</span>
                <Link href={`/teams/${record.team.id}`} className="hover:text-white">
                  {record.team.full_name}
                </Link>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{record.wins}</td>
              <td className="px-3 py-2 text-right tabular-nums">{record.losses}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                {record.winPct.toFixed(3).replace(/^0/, "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreGrid({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return <p className="mt-3 text-sm text-zinc-500">No completed games yet.</p>;
  }
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => {
        const homeWon = game.home_team_score > game.visitor_team_score;
        return (
          <div
            key={game.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm"
          >
            <ScoreRow
              team={game.visitor_team.abbreviation}
              score={game.visitor_team_score}
              winner={!homeWon}
            />
            <ScoreRow
              team={game.home_team.abbreviation}
              score={game.home_team_score}
              winner={homeWon}
            />
            <p className="mt-1 text-xs text-zinc-500">{game.date.slice(0, 10)}</p>
          </div>
        );
      })}
    </div>
  );
}

function ScoreRow({ team, score, winner }: { team: string; score: number; winner: boolean }) {
  return (
    <div className={`flex justify-between ${winner ? "font-semibold" : "text-zinc-400"}`}>
      <span>{team}</span>
      <span className="tabular-nums">{score}</span>
    </div>
  );
}

function ApiKeyNotice() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
      <p className="font-medium text-zinc-200">Live standings and scores are unavailable.</p>
      <p className="mt-1">
        Set{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">BALLDONTLIE_API_KEY</code>{" "}
        (a free key from balldontlie.io) to enable them. The shooting stats and shot charts work
        without it.
      </p>
    </div>
  );
}

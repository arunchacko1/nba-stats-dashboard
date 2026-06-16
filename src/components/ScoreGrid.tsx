import type { Game } from "@/lib/api/schemas";

export function ScoreGrid({ games }: { games: Game[] }) {
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

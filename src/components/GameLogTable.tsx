import type { GameLogEntry } from "@/lib/gamelog";

// Most-recent-first game log. Plain table (not TanStack) — it's read-only and
// already sorted, so the extra machinery would be overkill.
export function GameLogTable({ games }: { games: GameLogEntry[] }) {
  const recent = [...games].reverse();

  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <Th>Date</Th>
            <Th>Opp</Th>
            <Th>Res</Th>
            <Th right>PTS</Th>
            <Th right>FG</Th>
            <Th right>3P</Th>
            <Th right>FG%</Th>
          </tr>
        </thead>
        <tbody>
          {recent.map((game, index) => (
            <tr key={`${game.date}-${index}`} className="border-t border-zinc-800">
              <Td>{game.date.slice(5)}</Td>
              <Td>
                {game.home ? "vs" : "@"} {game.opponent}
              </Td>
              <Td className={game.won ? "text-emerald-400" : "text-zinc-500"}>
                {game.won ? "W" : "L"}
              </Td>
              <Td right>{game.points}</Td>
              <Td right>
                {game.fgm}-{game.fga}
              </Td>
              <Td right>
                {game.fg3m}-{game.fg3a}
              </Td>
              <Td right>{game.fga > 0 ? ((game.fgm / game.fga) * 100).toFixed(1) : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({
  children,
  right,
  className = "",
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <td className={`px-3 py-1.5 ${right ? "text-right tabular-nums text-zinc-300" : "text-zinc-100"} ${className}`}>
      {children}
    </td>
  );
}

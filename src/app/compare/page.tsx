import { PlayerCompare } from "@/components/PlayerCompare";
import { getShootingStats } from "@/lib/shooting";
import { getShotPlayerIds } from "@/lib/shotIndex";

export const metadata = {
  title: "Compare Players — NBA Shooting Dashboard",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { players, season } = getShootingStats();
  const chartable = [...getShotPlayerIds()];
  const validId = new Set(players.map((player) => player.id));
  const { a, b } = await searchParams;

  // Default to two players who have shot maps so the charts show on first load.
  const pick = (value: string | undefined, fallback: string) =>
    value && validId.has(value) ? value : fallback;
  const initialA = pick(a, chartable[0] ?? players[0].id);
  const initialB = pick(b, chartable[1] ?? players[1].id);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Compare Players</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pick two players to compare their {season} shooting splits and shot charts side by side.
        </p>
      </header>
      <PlayerCompare
        players={players}
        chartableIds={chartable}
        initialA={initialA}
        initialB={initialB}
      />
    </div>
  );
}

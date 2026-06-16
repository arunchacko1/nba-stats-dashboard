import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerHeadshot } from "@/components/PlayerHeadshot";
import { PlayerShotChart } from "@/components/PlayerShotChart";
import { PlayerTrends } from "@/components/PlayerTrends";
import { getPlayerById, getShootingStats } from "@/lib/shooting";
import { playerPercentiles } from "@/lib/query";
import { hasShotMap } from "@/lib/shotIndex";

// 84 -> "84th", 1 -> "1st". Ranks are rounded for display.
function ordinal(value: number): string {
  const n = Math.round(value);
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

const PERCENTILE_LABELS: { key: "pointsPerGame" | "ts" | "efg" | "fg3Pct"; label: string }[] = [
  { key: "pointsPerGame", label: "PPG" },
  { key: "ts", label: "TS%" },
  { key: "efg", label: "eFG%" },
  { key: "fg3Pct", label: "3P%" },
];

export function generateStaticParams() {
  return getShootingStats().players.map((player) => ({ id: player.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = getPlayerById(id);
  return {
    title: player ? `${player.name} — NBA Stats Dashboard` : "Player not found",
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = getPlayerById(id);
  if (!player) notFound();

  const showChart = hasShotMap(id);
  const percentiles = playerPercentiles(id);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/players" className="text-sm text-zinc-400 transition-colors hover:text-white">
          ← Shooting Stats
        </Link>
        <div className="mt-2 flex items-center gap-4">
          <PlayerHeadshot id={id} name={player.name} size={96} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{player.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {player.team} · {player.games} games · {getShootingStats().season}
            </p>
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Shooting Splits</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Split label="PPG" value={player.pointsPerGame.toFixed(1)} />
          <Split label="FGA/G" value={player.fgaPerGame.toFixed(1)} />
          <Split label="FG%" value={`${player.fgPct.toFixed(1)}%`} />
          <Split label="3P%" value={`${player.fg3Pct.toFixed(1)}%`} />
          <Split label="FGM / FGA" value={`${player.fgm} / ${player.fga}`} />
          <Split label="3PM / 3PA" value={`${player.fg3m} / ${player.fg3a}`} />
        </dl>
        {percentiles && (
          <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>League rank among rotation shooters:</span>
            {PERCENTILE_LABELS.map(({ key, label }) => (
              <span key={key}>
                {label}{" "}
                <strong className="font-semibold text-zinc-300">
                  {ordinal(percentiles[key])}
                </strong>
              </span>
            ))}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Game Log</h2>
        <PlayerTrends playerId={id} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Shot Chart</h2>
        {showChart ? (
          <PlayerShotChart playerId={id} />
        ) : (
          <p className="text-sm text-zinc-500">
            No shot map for this player. Charts are available for a featured set of high-volume
            scorers on the{" "}
            <Link href="/shot-chart" className="text-zinc-300 underline hover:text-white">
              Shot Charts
            </Link>{" "}
            page.
          </p>
        )}
      </section>
    </div>
  );
}

function Split({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

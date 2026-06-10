"use client";

import { useState } from "react";
import { ShotChart } from "@/components/ShotChart";
import { ShotSummaryStats } from "@/components/shotChartUi";
import { efgPct, tsPct, type ShootingStat } from "@/lib/shooting";
import { usePlayerShots } from "@/lib/usePlayerShots";

// Two players chosen side by side. Splits work for any player; the shot chart
// only renders for the featured set that has a committed shot map (chartableIds
// is passed from the server, which reads the shot index).
export function PlayerCompare({
  players,
  chartableIds,
  initialA,
  initialB,
}: {
  players: ShootingStat[];
  chartableIds: string[];
  initialA: string;
  initialB: string;
}) {
  const chartable = new Set(chartableIds);
  const [aId, setAId] = useState(initialA);
  const [bId, setBId] = useState(initialB);

  function select(side: "a" | "b", id: string) {
    const nextA = side === "a" ? id : aId;
    const nextB = side === "b" ? id : bId;
    if (side === "a") setAId(id);
    else setBId(id);
    // Keep the URL shareable without triggering a navigation.
    window.history.replaceState(null, "", `${window.location.pathname}?a=${nextA}&b=${nextB}`);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <PlayerColumn
        players={players}
        selectedId={aId}
        canChart={chartable.has(aId)}
        onSelect={(id) => select("a", id)}
      />
      <PlayerColumn
        players={players}
        selectedId={bId}
        canChart={chartable.has(bId)}
        onSelect={(id) => select("b", id)}
      />
    </div>
  );
}

function PlayerColumn({
  players,
  selectedId,
  canChart,
  onSelect,
}: {
  players: ShootingStat[];
  selectedId: string;
  canChart: boolean;
  onSelect: (id: string) => void;
}) {
  const player = players.find((p) => p.id === selectedId);
  const { shots, summary, isLoading } = usePlayerShots(canChart ? selectedId : "");

  return (
    <div className="space-y-4">
      <select
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      >
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {player && <SplitsGrid player={player} />}

      {canChart ? (
        isLoading ? (
          <p className="text-sm text-zinc-400">Loading shots…</p>
        ) : (
          <div className="space-y-3">
            <ShotChart shots={shots} />
            {summary && <ShotSummaryStats summary={summary} />}
          </div>
        )
      ) : (
        <p className="text-sm text-zinc-500">
          No shot map for this player — charts cover a featured set of high-volume scorers.
        </p>
      )}
    </div>
  );
}

function SplitsGrid({ player }: { player: ShootingStat }) {
  const splits: Array<[string, string]> = [
    ["PPG", player.pointsPerGame.toFixed(1)],
    ["FG%", `${player.fgPct.toFixed(1)}%`],
    ["3P%", `${player.fg3Pct.toFixed(1)}%`],
    ["FT%", `${player.ftPct.toFixed(1)}%`],
    ["eFG%", `${efgPct(player).toFixed(1)}%`],
    ["TS%", `${tsPct(player).toFixed(1)}%`],
    ["FGM / FGA", `${player.fgm} / ${player.fga}`],
    ["3PM / 3PA", `${player.fg3m} / ${player.fg3a}`],
  ];

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {splits.map(([label, value]) => (
        <div key={label} className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
          <dt className="text-xs text-zinc-500">{label}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

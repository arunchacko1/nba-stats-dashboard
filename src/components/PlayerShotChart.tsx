"use client";

import { ShotChart } from "@/components/ShotChart";
import { ShotChartLegend, ShotSummaryStats } from "@/components/shotChartUi";
import { usePlayerShots } from "@/lib/usePlayerShots";

// Renders one player's shot map on the detail page. The list of which players
// have a map is decided on the server (see hasShotMap), so this only handles the
// load/loading/error states for a player that is expected to exist.
export function PlayerShotChart({ playerId }: { playerId: string }) {
  const { shots, summary, isLoading, failed } = usePlayerShots(playerId);

  if (failed) {
    return <p className="text-sm text-red-400">Couldn&apos;t load this shot chart. Try reloading.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-zinc-400">Loading shots…</p>;
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex-1">
        <ShotChart shots={shots} />
      </div>
      <div className="flex flex-col gap-4 sm:w-56">
        {summary && <ShotSummaryStats summary={summary} />}
        <ShotChartLegend />
      </div>
    </div>
  );
}

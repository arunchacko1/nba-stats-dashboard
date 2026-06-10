"use client";

import { useState } from "react";
import { GameLogTable } from "@/components/GameLogTable";
import { TrendChart } from "@/components/TrendChart";
import { trendStats, useGameLog, type TrendStatKey } from "@/lib/gamelog";

export function PlayerTrends({ playerId }: { playerId: string }) {
  const { games, isLoading, failed } = useGameLog(playerId);
  const [statKey, setStatKey] = useState<TrendStatKey>("points");

  if (failed) {
    return <p className="text-sm text-zinc-500">No game log available for this player.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-zinc-400">Loading game log…</p>;
  }
  if (games.length === 0) {
    return <p className="text-sm text-zinc-500">No games on record.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(Object.keys(trendStats) as TrendStatKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatKey(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              key === statKey
                ? "border-zinc-500 bg-zinc-800 text-white"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {trendStats[key].label}
          </button>
        ))}
      </div>
      <TrendChart games={games} statKey={statKey} />
      <GameLogTable games={games} />
    </div>
  );
}

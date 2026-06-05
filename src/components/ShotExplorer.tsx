"use client";

import { useEffect, useMemo, useState } from "react";
import { ShotChart } from "@/components/ShotChart";
import { fetchPlayerShots, fetchShotPlayers, type Shot, type ShotPlayerSummary } from "@/lib/shots";

export function ShotExplorer() {
  const [players, setPlayers] = useState<ShotPlayerSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loaded, setLoaded] = useState<{ id: string; shots: Shot[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchShotPlayers()
      .then((list) => {
        if (!active) return;
        setPlayers(list);
        setSelectedId(list[0]?.id ?? "");
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fetchPlayerShots(selectedId)
      .then((shots) => active && setLoaded({ id: selectedId, shots }))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Loading is derived: the loaded shots belong to the current player or they don't.
  const shots = useMemo(
    () => (loaded?.id === selectedId ? loaded.shots : []),
    [loaded, selectedId],
  );
  const isLoading = !failed && loaded?.id !== selectedId;

  const summary = useMemo(() => {
    if (shots.length === 0) return null;
    const made = shots.filter((shot) => shot.made).length;
    return { attempts: shots.length, made, pct: (made / shots.length) * 100 };
  }, [shots]);

  if (failed) {
    return <p className="text-sm text-red-400">Couldn&apos;t load shot data. Try reloading.</p>;
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-4 sm:w-56">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-400">Player</span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        {summary && (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="FGM" value={summary.made} />
            <Stat label="FGA" value={summary.attempts} />
            <Stat label="FG%" value={summary.pct.toFixed(1)} />
          </dl>
        )}

        <Legend />
      </div>

      <div className="flex-1">
        {isLoading ? (
          <p className="text-sm text-zinc-400">Loading shots…</p>
        ) : (
          <ShotChart shots={shots} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 py-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Legend() {
  return (
    <div className="space-y-2 text-xs text-zinc-400">
      <div>
        <span className="mb-1 block">Make rate</span>
        <div className="h-2 w-full rounded bg-gradient-to-r from-[#2166ac] via-[#f7f7f7] to-[#b2182b]" />
        <div className="mt-1 flex justify-between">
          <span>cold</span>
          <span>hot</span>
        </div>
      </div>
      <p>Hexagon size shows how often a spot is shot from.</p>
    </div>
  );
}

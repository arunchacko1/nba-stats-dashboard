"use client";

import { useEffect, useState } from "react";
import { ShotChart } from "@/components/ShotChart";
import { ShotControls, defaultShotOptions, type ShotChartOptions } from "@/components/ShotControls";
import { ShotChartLegend, ShotSummaryStats } from "@/components/shotChartUi";
import { fetchShotPlayers, type ShotPlayerSummary } from "@/lib/shots";
import { useLeagueBaseline } from "@/lib/useLeagueBaseline";
import { usePlayerShots } from "@/lib/usePlayerShots";

export function ShotExplorer() {
  const [players, setPlayers] = useState<ShotPlayerSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [listFailed, setListFailed] = useState(false);
  const [options, setOptions] = useState<ShotChartOptions>(defaultShotOptions);
  const baseline = useLeagueBaseline();

  useEffect(() => {
    let active = true;
    fetchShotPlayers()
      .then((list) => {
        if (!active) return;
        setPlayers(list);
        setSelectedId(list[0]?.id ?? "");
      })
      .catch(() => active && setListFailed(true));
    return () => {
      active = false;
    };
  }, []);

  const { shots, summary, isLoading, failed: shotsFailed } = usePlayerShots(selectedId);

  if (listFailed || shotsFailed) {
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

        {summary && <ShotSummaryStats summary={summary} />}

        <ShotControls
          options={options}
          onChange={setOptions}
          leagueAvailable={baseline !== null}
        />

        <ShotChartLegend colorMode={options.colorMode} />
      </div>

      <div className="flex-1">
        {isLoading ? (
          <p className="text-sm text-zinc-400">Loading shots…</p>
        ) : (
          <ShotChart
            shots={shots}
            result={options.result}
            shotType={options.shotType}
            colorMode={options.colorMode}
            baseline={baseline}
          />
        )}
      </div>
    </div>
  );
}

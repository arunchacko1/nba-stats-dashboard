"use client";

import { useEffect, useMemo, useState } from "react";
import { ShotChart } from "@/components/ShotChart";
import { ShotControls, defaultShotOptions, type ShotChartOptions } from "@/components/ShotControls";
import { ShotChartLegend, ShotSummaryStats } from "@/components/shotChartUi";
import {
  fetchShotPlayers,
  filterShotPlayersByTeam,
  shotTeamOptions,
  type ShotPlayerSummary,
} from "@/lib/shots";
import { useLeagueBaseline } from "@/lib/useLeagueBaseline";
import { usePlayerShots } from "@/lib/usePlayerShots";

export function ShotExplorer() {
  const [players, setPlayers] = useState<ShotPlayerSummary[]>([]);
  const [team, setTeam] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [listFailed, setListFailed] = useState(false);
  const [options, setOptions] = useState<ShotChartOptions>(defaultShotOptions);
  const baseline = useLeagueBaseline();

  useEffect(() => {
    let active = true;
    fetchShotPlayers()
      // Start blank: the chart only fills in once the user picks a player.
      .then((list) => active && setPlayers(list))
      .catch(() => active && setListFailed(true));
    return () => {
      active = false;
    };
  }, []);

  const teams = useMemo(() => shotTeamOptions(players), [players]);
  const teamPlayers = useMemo(
    () =>
      filterShotPlayersByTeam(players, team).sort((a, b) => a.name.localeCompare(b.name)),
    [players, team],
  );

  const { shots, summary, isLoading, failed: shotsFailed } = usePlayerShots(selectedId);

  function handleTeamChange(nextTeam: string) {
    setTeam(nextTeam);
    // Drop the selection if a specific team is chosen and the previously selected
    // player isn't on it. Switching back to "All teams" keeps the selection.
    if (nextTeam && selectedId && !players.some((p) => p.id === selectedId && p.team === nextTeam)) {
      setSelectedId("");
    }
  }

  if (listFailed || shotsFailed) {
    return <p className="text-sm text-red-400">Couldn&apos;t load shot data. Try reloading.</p>;
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-4 sm:w-56">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-400">Team</span>
          <select
            value={team}
            onChange={(event) => handleTeamChange(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="">All teams</option>
            {teams.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-400">Player</span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="">Select a player</option>
            {teamPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>

        {selectedId && (
          <>
            {summary && <ShotSummaryStats summary={summary} />}
            <ShotControls
              options={options}
              onChange={setOptions}
              leagueAvailable={baseline !== null}
            />
            <ShotChartLegend colorMode={options.colorMode} />
          </>
        )}
      </div>

      <div className="flex-1">
        {!selectedId ? (
          <p className="text-sm text-zinc-500">
            Select a player to view their shot chart.
          </p>
        ) : isLoading ? (
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

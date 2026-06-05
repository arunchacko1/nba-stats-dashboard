import type { ShotSummary } from "@/lib/usePlayerShots";

// Presentational pieces shared by the shot-chart explorer and the player detail
// page: the FGM/FGA/FG% stat trio and the size/colour legend.

export function ShotSummaryStats({ summary }: { summary: ShotSummary }) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      <Stat label="FGM" value={summary.made} />
      <Stat label="FGA" value={summary.attempts} />
      <Stat label="FG%" value={summary.pct.toFixed(1)} />
    </dl>
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

export function ShotChartLegend() {
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

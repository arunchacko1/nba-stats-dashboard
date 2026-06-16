import type { Shot } from "@/lib/shots";
import { zoneSplits } from "@/lib/zones";

// A compact by-zone breakdown (restricted, paint, mid-range, corner 3, above the
// break) for a player's shot map. Zones with no attempts are dropped here so the
// card stays tight.
export function ZoneSplits({ shots }: { shots: Shot[] }) {
  const splits = zoneSplits(shots).filter((split) => split.attempts > 0);
  if (splits.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">By zone</h3>
      <ul className="space-y-1.5">
        {splits.map((split) => (
          <li key={split.zone} className="flex items-baseline justify-between gap-3">
            <span className="text-zinc-300">{split.label}</span>
            <span className="tabular-nums text-zinc-500">
              {split.makes}/{split.attempts}
              <span className="ml-2 font-semibold text-zinc-100">{split.pct.toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

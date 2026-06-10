"use client";

import type { ColorMode, ShotResult, ShotType } from "@/components/ShotChart";

export interface ShotChartOptions {
  result: ShotResult;
  shotType: ShotType;
  colorMode: ColorMode;
}

export const defaultShotOptions: ShotChartOptions = {
  result: "all",
  shotType: "all",
  colorMode: "rate",
};

// Filter + coloring toggles for a shot chart. Kept presentational: the parent
// owns the option state and passes it down to ShotChart.
export function ShotControls({
  options,
  onChange,
  leagueAvailable,
}: {
  options: ShotChartOptions;
  onChange: (next: ShotChartOptions) => void;
  leagueAvailable: boolean;
}) {
  return (
    <div className="space-y-3">
      <Segmented
        label="Shots"
        value={options.result}
        options={[
          { value: "all", label: "All" },
          { value: "made", label: "Made" },
          { value: "missed", label: "Missed" },
        ]}
        onChange={(result) => onChange({ ...options, result })}
      />
      <Segmented
        label="Type"
        value={options.shotType}
        options={[
          { value: "all", label: "All" },
          { value: "2", label: "2PT" },
          { value: "3", label: "3PT" },
        ]}
        onChange={(shotType) => onChange({ ...options, shotType })}
      />
      <Segmented
        label="Color"
        value={options.colorMode}
        options={[
          { value: "rate", label: "Make rate" },
          { value: "league", label: "vs League", disabled: !leagueAvailable },
        ]}
        onChange={(colorMode) => onChange({ ...options, colorMode })}
      />
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="text-xs">
      <span className="mb-1 block text-zinc-500">{label}</span>
      <div className="inline-flex overflow-hidden rounded-md border border-zinc-700">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`px-2.5 py-1 font-medium transition-colors ${
              value === option.value
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:text-zinc-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { hexbin as createHexbin } from "d3-hexbin";
import { scaleSequential, scaleSqrt } from "d3-scale";
import { interpolateRdBu } from "d3-scale-chromatic";
import { CourtMarkings } from "@/components/CourtMarkings";
import { SVG_LENGTH, SVG_WIDTH, fromSvg, isWithinHalfCourt, toSvg } from "@/lib/court";
import type { LeagueBaseline, Shot } from "@/lib/shots";

const HEX_RADIUS = 14;
const MIN_HEX_RADIUS = HEX_RADIUS * 0.4;

export type ShotResult = "all" | "made" | "missed";
export type ShotType = "all" | "2" | "3";
export type ColorMode = "rate" | "league";

interface PlacedShot {
  x: number;
  y: number;
  made: boolean;
  value: 2 | 3;
}

interface HexBin {
  x: number;
  y: number;
  count: number;
  made: number;
  makeRate: number;
  fill: string;
}

// Numbers shown in the hover tooltip. Pulled out so the rounding is unit-tested
// without needing to drive DOM events.
export function describeHex(bin: Pick<HexBin, "made" | "count">) {
  return {
    pct: Math.round((bin.made / bin.count) * 100),
    made: bin.made,
    attempts: bin.count,
  };
}

interface HoverState {
  index: number;
  left: number;
  top: number;
}

export function ShotChart({
  shots,
  result = "all",
  shotType = "all",
  colorMode = "rate",
  baseline = null,
}: {
  shots: Shot[];
  result?: ShotResult;
  shotType?: ShotType;
  colorMode?: ColorMode;
  baseline?: LeagueBaseline | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const { bins, hexagon, sizeFor } = useMemo(() => {
    const placed: PlacedShot[] = shots
      .filter(isWithinHalfCourt)
      .map((shot) => ({ ...toSvg(shot), made: shot.made, value: shot.value }))
      .filter((shot) => result === "all" || (result === "made") === shot.made)
      .filter((shot) => shotType === "all" || Number(shotType) === shot.value);

    const hex = createHexbin<PlacedShot>()
      .x((d) => d.x)
      .y((d) => d.y)
      .radius(HEX_RADIUS)
      .extent([
        [0, 0],
        [SVG_WIDTH, SVG_LENGTH],
      ]);

    const grouped = hex(placed).map((group) => {
      const made = group.filter((shot) => shot.made).length;
      return { x: group.x, y: group.y, count: group.length, made, makeRate: made / group.length };
    });

    const maxCount = grouped.reduce((max, bin) => Math.max(max, bin.count), 1);

    // Size encodes how often a player shoots from a spot.
    const size = scaleSqrt().domain([1, maxCount]).range([MIN_HEX_RADIUS, HEX_RADIUS]).clamp(true);
    // "rate" colors by raw make rate (cool = cold, warm = hot); "league" colors
    // by how far the spot beats or trails the league average there.
    const rateColor = scaleSequential((t: number) => interpolateRdBu(1 - t)).domain([0.3, 0.6]);
    const deltaColor = scaleSequential((t: number) => interpolateRdBu(1 - t)).domain([-12, 12]);

    const leagueAt = baselineLookup(baseline);

    const bins: HexBin[] = grouped.map((bin) => {
      let fill: string;
      if (colorMode === "league" && leagueAt) {
        const league = leagueAt(bin.x, bin.y);
        fill = league === null ? "#3f3f46" : deltaColor(bin.makeRate * 100 - league);
      } else {
        fill = rateColor(bin.makeRate);
      }
      return { ...bin, fill };
    });

    return {
      bins,
      hexagon: (radius: number) => hex.hexagon(radius),
      sizeFor: (count: number) => size(count),
    };
  }, [shots, result, shotType, colorMode, baseline]);

  const hoveredBin = hover ? bins[hover.index] : null;
  const tooltip = hoveredBin ? describeHex(hoveredBin) : null;

  function trackPointer(index: number, event: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ index, left: event.clientX - rect.left, top: event.clientY - rect.top });
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_LENGTH}`}
        className="w-full rounded-lg bg-zinc-950"
        role="img"
        aria-label="Shot chart"
      >
        <CourtMarkings />
        <g>
          {bins.map((bin, index) => {
            const isHovered = hover?.index === index;
            return (
              <path
                key={index}
                d={hexagon(sizeFor(bin.count))}
                transform={`translate(${bin.x}, ${bin.y})`}
                fill={bin.fill}
                fillOpacity={isHovered ? 1 : 0.85}
                stroke={isHovered ? "#fafafa" : "#09090b"}
                strokeWidth={isHovered ? 1.5 : 0.5}
                className="cursor-pointer"
                onMouseEnter={(event) => trackPointer(index, event)}
                onMouseMove={(event) => trackPointer(index, event)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>

      {hover && tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-zinc-700 bg-zinc-900/95 px-2 py-1 text-center text-xs shadow-lg"
          style={{ left: hover.left, top: hover.top - 8 }}
        >
          <div className="font-semibold tabular-nums">{tooltip.pct}% FG</div>
          <div className="tabular-nums text-zinc-400">
            {tooltip.made}/{tooltip.attempts} FGA
          </div>
        </div>
      )}
    </div>
  );
}

// Builds a lookup from an SVG hexbin position to the league make rate (%) for
// that court cell, or null when the league has too few shots there.
function baselineLookup(baseline: LeagueBaseline | null) {
  if (!baseline) return null;
  const grid = new Map(baseline.zones.map(([gx, gy, pct]) => [`${gx},${gy}`, pct]));
  return (svgX: number, svgY: number): number | null => {
    const point = fromSvg({ x: svgX, y: svgY });
    const key = `${Math.round(point.x / baseline.cell)},${Math.round(point.y / baseline.cell)}`;
    return grid.get(key) ?? null;
  };
}

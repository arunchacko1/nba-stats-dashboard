"use client";

import { useMemo } from "react";
import { hexbin as createHexbin } from "d3-hexbin";
import { scaleSequential, scaleSqrt } from "d3-scale";
import { interpolateRdBu } from "d3-scale-chromatic";
import { CourtMarkings } from "@/components/CourtMarkings";
import { SVG_LENGTH, SVG_WIDTH, isWithinHalfCourt, toSvg } from "@/lib/court";
import type { Shot } from "@/lib/shots";

const HEX_RADIUS = 14;
const MIN_HEX_RADIUS = HEX_RADIUS * 0.4;

interface PlacedShot {
  x: number;
  y: number;
  made: boolean;
}

export function ShotChart({ shots }: { shots: Shot[] }) {
  const { bins, hexagon, sizeFor, colorFor } = useMemo(() => {
    const placed: PlacedShot[] = shots
      .filter(isWithinHalfCourt)
      .map((shot) => ({ ...toSvg(shot), made: shot.made }));

    const hex = createHexbin<PlacedShot>()
      .x((d) => d.x)
      .y((d) => d.y)
      .radius(HEX_RADIUS)
      .extent([
        [0, 0],
        [SVG_WIDTH, SVG_LENGTH],
      ]);

    const grouped = hex(placed).map((group) => ({
      x: group.x,
      y: group.y,
      count: group.length,
      makeRate: group.filter((shot) => shot.made).length / group.length,
    }));

    const maxCount = grouped.reduce((max, bin) => Math.max(max, bin.count), 1);

    // Size encodes how often a player shoots from a spot; color encodes how
    // often it goes in (cool = cold, warm = hot).
    const size = scaleSqrt().domain([1, maxCount]).range([MIN_HEX_RADIUS, HEX_RADIUS]).clamp(true);
    const color = scaleSequential((t: number) => interpolateRdBu(1 - t)).domain([0.3, 0.6]);

    return {
      bins: grouped,
      hexagon: (radius: number) => hex.hexagon(radius),
      sizeFor: (count: number) => size(count),
      colorFor: (rate: number) => color(rate),
    };
  }, [shots]);

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_LENGTH}`}
      className="w-full max-w-md rounded-lg bg-zinc-950"
      role="img"
      aria-label="Shot chart"
    >
      <CourtMarkings />
      <g>
        {bins.map((bin, index) => (
          <path
            key={index}
            d={hexagon(sizeFor(bin.count))}
            transform={`translate(${bin.x}, ${bin.y})`}
            fill={colorFor(bin.makeRate)}
            fillOpacity={0.85}
            stroke="#09090b"
            strokeWidth={0.5}
          />
        ))}
      </g>
    </svg>
  );
}

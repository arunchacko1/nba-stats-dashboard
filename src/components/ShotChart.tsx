"use client";

import { useMemo, useRef, useState } from "react";
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

interface HexBin {
  x: number;
  y: number;
  count: number;
  made: number;
  makeRate: number;
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

export function ShotChart({ shots }: { shots: Shot[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

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

    const grouped: HexBin[] = hex(placed).map((group) => {
      const made = group.filter((shot) => shot.made).length;
      return {
        x: group.x,
        y: group.y,
        count: group.length,
        made,
        makeRate: made / group.length,
      };
    });

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
                fill={colorFor(bin.makeRate)}
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

"use client";

import { useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { trendStats, type GameLogEntry, type TrendStatKey } from "@/lib/gamelog";

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

export function TrendChart({ games, statKey }: { games: GameLogEntry[]; statKey: TrendStatKey }) {
  const stat = trendStats[statKey];
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; left: number; top: number } | null>(null);

  const { points, linePath, areaPath, avgY, avg, yTicks } = useMemo(() => {
    const values = games.map(stat.value);
    const count = values.length;
    const maxValue = Math.max(...values, 1);

    const x = scaleLinear()
      .domain([0, Math.max(count - 1, 1)])
      .range([PAD.left, WIDTH - PAD.right]);
    const y = scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([HEIGHT - PAD.bottom, PAD.top]);

    const points = values.map((value, index) => ({ x: x(index), y: y(value), value, game: games[index] }));
    const draw = (command: "M" | "L", p: { x: number; y: number }) =>
      `${command}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const linePath = points.map((p, i) => draw(i === 0 ? "M" : "L", p)).join(" ");
    const baseY = y(0);
    const areaPath = points.length
      ? `M${points[0].x.toFixed(1)},${baseY.toFixed(1)} ${points
          .map((p) => draw("L", p))
          .join(" ")} L${points[count - 1].x.toFixed(1)},${baseY.toFixed(1)} Z`
      : "";

    const avg = values.reduce((sum, v) => sum + v, 0) / (count || 1);
    return {
      points,
      linePath,
      areaPath,
      avg,
      avgY: y(avg),
      yTicks: y.ticks(4).map((t) => ({ value: t, y: y(t) })),
    };
  }, [games, stat]);

  const hovered = hover ? points[hover.index] : null;

  function trackPointer(event: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;
    const relX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const distance = Math.abs(p.x - relX);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    const point = points[nearest];
    // Position the tooltip at the data point, in container pixels, captured here
    // so the ref isn't read during render.
    setHover({
      index: nearest,
      left: (point.x / WIDTH) * rect.width,
      top: (point.y / HEIGHT) * rect.height - 8,
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950"
        role="img"
        aria-label={`${stat.label} by game`}
        onMouseMove={trackPointer}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#27272a"
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={tick.y + 3} textAnchor="end" className="fill-zinc-600 text-[10px]">
              {stat.format(tick.value)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="#3b82f6" fillOpacity={0.12} />
        <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth={1.5} />
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={avgY}
          y2={avgY}
          stroke="#a1a1aa"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {hovered && (
          <circle cx={hovered.x} cy={hovered.y} r={3.5} fill="#fafafa" stroke="#1d4ed8" strokeWidth={1.5} />
        )}
      </svg>

      <p className="mt-1 text-xs text-zinc-500">
        Dashed line = season average ({stat.format(avg)}).
      </p>

      {hover && hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-zinc-700 bg-zinc-900/95 px-2 py-1 text-center text-xs shadow-lg"
          style={{ left: hover.left, top: hover.top }}
        >
          <div className="font-semibold tabular-nums">{stat.format(hovered.value)}</div>
          <div className="text-zinc-400">
            {hovered.game.home ? "vs" : "@"} {hovered.game.opponent} · {hovered.game.date.slice(5)}
          </div>
        </div>
      )}
    </div>
  );
}

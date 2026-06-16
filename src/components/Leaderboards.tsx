"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { categories, qualificationContext, rankLeaders } from "@/lib/leaderboard";
import type { ShootingStat } from "@/lib/shooting";
import { PlayerHeadshot } from "./PlayerHeadshot";

export function Leaderboards({ players }: { players: ShootingStat[] }) {
  const [activeId, setActiveId] = useState(categories[0].id);
  const category = categories.find((c) => c.id === activeId) ?? categories[0];

  const ctx = useMemo(() => qualificationContext(players), [players]);
  const ranked = useMemo(() => rankLeaders(players, category, ctx), [players, category, ctx]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveId(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              c.id === activeId
                ? "border-zinc-500 bg-zinc-800 text-white"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-500">{category.note}</p>

      <ol className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
        {ranked.map(({ player, value }, index) => (
          <li key={player.id} className="flex items-center gap-4 px-4 py-2.5 text-sm">
            <span className="w-5 text-right tabular-nums text-zinc-500">{index + 1}</span>
            <PlayerHeadshot id={player.id} name={player.name} size={28} />
            <Link
              href={`/players/${player.id}`}
              className="flex-1 font-medium text-zinc-100 underline-offset-2 hover:text-white hover:underline"
            >
              {player.name}
            </Link>
            <span className="text-zinc-400">{player.team}</span>
            <span className="w-16 text-right font-semibold tabular-nums">
              {category.format(value)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

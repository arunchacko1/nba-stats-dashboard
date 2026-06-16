"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

// Per-game regular-season line for a player, produced by scripts/build-shot-data.mjs
// and loaded on demand by the player page (only the viewed player's log crosses
// the wire).
export const gameLogEntrySchema = z.object({
  date: z.string(),
  opponent: z.string(),
  home: z.boolean(),
  won: z.boolean(),
  points: z.number(),
  fgm: z.number(),
  fga: z.number(),
  fg3m: z.number(),
  fg3a: z.number(),
  rebounds: z.number(),
  assists: z.number(),
  steals: z.number(),
  blocks: z.number(),
});
export type GameLogEntry = z.infer<typeof gameLogEntrySchema>;

const gameLogSchema = z.array(gameLogEntrySchema);

export async function fetchGameLog(playerId: string): Promise<GameLogEntry[]> {
  const response = await fetch(`/gamelogs/${playerId}.json`);
  if (!response.ok) throw new Error(`Failed to load game log for ${playerId}: ${response.status}`);
  return gameLogSchema.parse(await response.json());
}

export interface GameLogState {
  games: GameLogEntry[];
  isLoading: boolean;
  failed: boolean;
}

export function useGameLog(playerId: string): GameLogState {
  const [loaded, setLoaded] = useState<{ id: string; games: GameLogEntry[] } | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchGameLog(playerId)
      .then((data) => active && setLoaded({ id: playerId, games: data }))
      .catch(() => active && setFailedId(playerId));
    return () => {
      active = false;
    };
  }, [playerId]);

  // Loading/failed are derived against the current id, so a stale result from a
  // previous player never shows as this player's data.
  const games = loaded?.id === playerId ? loaded.games : [];
  const failed = failedId === playerId;
  const isLoading = !failed && loaded?.id !== playerId;

  return { games, isLoading, failed };
}

// The two stats the trend chart can plot, with how to derive each per game.
export const trendStats = {
  points: { label: "Points", value: (g: GameLogEntry) => g.points, format: (v: number) => v.toFixed(0) },
  fgPct: {
    label: "FG%",
    value: (g: GameLogEntry) => (g.fga > 0 ? (g.fgm / g.fga) * 100 : 0),
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  rebounds: { label: "Rebounds", value: (g: GameLogEntry) => g.rebounds, format: (v: number) => v.toFixed(0) },
  assists: { label: "Assists", value: (g: GameLogEntry) => g.assists, format: (v: number) => v.toFixed(0) },
} as const;

export type TrendStatKey = keyof typeof trendStats;
